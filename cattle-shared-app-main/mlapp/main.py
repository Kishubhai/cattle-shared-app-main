"""
Cattle ID ML service: face + muzzle models with persistent galleries.

Endpoints (all except /health need the X-API-Key header):
  GET    /health
  POST   /register          cattle_id, face_image, muzzle_image
  POST   /identify          face_image, muzzle_image (optional)
  POST   /add_images        cattle_id, face_image?, muzzle_image?
  POST   /face/predict      image
  POST   /muzzle/predict    image
  DELETE /cattle/{cattle_id}

You should NOT need to edit this file. Put your model code in models.py.
"""
import json
import os
import secrets
import threading
from contextlib import asynccontextmanager
from typing import Optional

import numpy as np
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile

import detect
import models

API_KEY = os.environ.get("ML_API_KEY", "")
DATA_DIR = os.environ.get("ML_DATA_DIR", "/opt/mlapp/data")

# Per-model KNOWN/UNKNOWN thresholds: use the values you tuned during training.
FACE_THRESHOLD = float(os.environ.get("FACE_THRESHOLD", "0.75"))
MUZZLE_THRESHOLD = float(os.environ.get("MUZZLE_THRESHOLD", "0.75"))
# "Strong" thresholds used when combining both models (see fuse()).
FACE_STRONG = float(os.environ.get("FACE_STRONG", "0.85"))
MUZZLE_STRONG = float(os.environ.get("MUZZLE_STRONG", "0.85"))


# ----------------------------------------------------------------------------
# Gallery: embeddings + cattle ids, saved to disk after every change
# ----------------------------------------------------------------------------
def normalize(v):
    v = np.asarray(v, dtype=np.float32).reshape(-1)
    n = np.linalg.norm(v)
    return v / n if n > 0 else v


class Gallery:
    def __init__(self, name):
        self.dir = os.path.join(DATA_DIR, name)
        os.makedirs(self.dir, exist_ok=True)
        self.lock = threading.Lock()
        self.emb_path = os.path.join(self.dir, "embeddings.npy")
        self.ids_path = os.path.join(self.dir, "ids.json")
        self.emb = None
        self.ids = []
        if os.path.exists(self.emb_path) and os.path.exists(self.ids_path):
            self.emb = np.load(self.emb_path)
            with open(self.ids_path) as f:
                self.ids = json.load(f)

    def _save(self):
        # Write to temp files, then swap atomically so a crash never corrupts the gallery.
        np.save(self.emb_path + ".tmp.npy", self.emb)
        with open(self.ids_path + ".tmp", "w") as f:
            json.dump(self.ids, f)
        os.replace(self.emb_path + ".tmp.npy", self.emb_path)
        os.replace(self.ids_path + ".tmp", self.ids_path)

    def add(self, cattle_id, vec, replace=False):
        vec = normalize(vec)[None, :]
        with self.lock:
            if self.emb is None:
                self.emb = np.zeros((0, vec.shape[1]), dtype=np.float32)
            if self.emb.shape[1] != vec.shape[1]:
                raise ValueError(
                    f"Embedding size {vec.shape[1]} does not match gallery size {self.emb.shape[1]}"
                )
            if replace and cattle_id in self.ids:
                keep = [k for k, c in enumerate(self.ids) if c != cattle_id]
                self.emb = self.emb[keep]
                self.ids = [self.ids[k] for k in keep]
            self.emb = np.vstack([self.emb, vec])
            self.ids = self.ids + [cattle_id]
            self._save()
            return self.ids.count(cattle_id)

    def remove(self, cattle_id):
        with self.lock:
            if cattle_id not in self.ids:
                return 0
            keep = [k for k, c in enumerate(self.ids) if c != cattle_id]
            removed = len(self.ids) - len(keep)
            self.emb = self.emb[keep]
            self.ids = [self.ids[k] for k in keep]
            self._save()
            return removed

    def search(self, vec):
        vec = normalize(vec)
        with self.lock:
            emb, ids = self.emb, list(self.ids)
        if emb is None or len(ids) == 0:
            return None, 0.0
        sims = emb @ vec  # cosine similarity (all vectors are normalized)
        k = int(np.argmax(sims))
        return ids[k], float(sims[k])

    def has(self, cattle_id):
        with self.lock:
            return cattle_id in self.ids

    def count(self):
        with self.lock:
            return len(set(self.ids))


face_gallery = Gallery("face")
muzzle_gallery = Gallery("muzzle")

# One lock per model: inference runs one image at a time per model (safe + predictable).
face_lock = threading.Lock()
muzzle_lock = threading.Lock()


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def require_key(x_api_key: str = Header(default="")):
    if API_KEY and not secrets.compare_digest(x_api_key, API_KEY):
        raise HTTPException(status_code=401, detail="Invalid API key")


def read_image(upload: UploadFile):
    try:
        return models.load_image(upload.file.read())
    except Exception:
        raise HTTPException(status_code=400, detail=f"Could not read image '{upload.filename}'")


def face_vec_img(img):
    with face_lock:
        return models.embed_face(img)


def muzzle_vec_img(img):
    with muzzle_lock:
        return models.embed_muzzle(img)


def face_vec(upload):
    return face_vec_img(read_image(upload))


def muzzle_vec(upload):
    return muzzle_vec_img(read_image(upload))


def predict(gallery, vec, threshold):
    best, score = gallery.search(vec)
    known = best is not None and score >= threshold
    return {
        "decision": "KNOWN" if known else "UNKNOWN",
        "is_known": known,
        "max_similarity": round(score, 4),
        "best_match": best if known else None,
        "candidate": best,  # closest cattle even if below threshold (for debugging)
    }


def fuse(face, muzzle):
    """Combine both models. Muzzle is the primary biometric, face is supporting."""

    def result(known, cattle_id, score, rule):
        return {
            "decision": "KNOWN" if known else "UNKNOWN",
            "is_known": known,
            "max_similarity": round(score, 4),
            "best_match": cattle_id if known else None,
            "rule": rule,
        }

    if muzzle is None:  # no muzzle photo sent: face model decides alone
        if face["is_known"]:
            return result(True, face["best_match"], face["max_similarity"], "face_only")
        return result(False, None, face["max_similarity"], "face_only")

    f_s, m_s = face["max_similarity"], muzzle["max_similarity"]
    if face["is_known"] and muzzle["is_known"] and face["best_match"] == muzzle["best_match"]:
        return result(True, muzzle["best_match"], max(f_s, m_s), "both_agree")
    if muzzle["is_known"] and m_s >= MUZZLE_STRONG:
        return result(True, muzzle["best_match"], m_s, "muzzle_strong")
    if face["is_known"] and f_s >= FACE_STRONG and muzzle["candidate"] == face["best_match"]:
        return result(True, face["best_match"], f_s, "face_strong_muzzle_supports")
    return result(False, None, max(f_s, m_s), "no_confident_match")


# ----------------------------------------------------------------------------
# App
# ----------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app):
    models.load_face_model()
    models.load_muzzle_model()
    detect.load()
    yield


app = FastAPI(title="Cattle ID ML service", lifespan=lifespan)
auth = [Depends(require_key)]


@app.get("/health")
def health():
    return {
        "status": "ok",
        "face_gallery_size": face_gallery.count(),
        "muzzle_gallery_size": muzzle_gallery.count(),
        "detector_ready": detect.ready(),
    }


@app.post("/face/predict", dependencies=auth)
def face_predict(image: UploadFile = File(...)):
    return predict(face_gallery, face_vec(image), FACE_THRESHOLD)


@app.post("/muzzle/predict", dependencies=auth)
def muzzle_predict(image: UploadFile = File(...)):
    return predict(muzzle_gallery, muzzle_vec(image), MUZZLE_THRESHOLD)


@app.post("/identify", dependencies=auth)
def identify(
    face_image: UploadFile = File(...),
    muzzle_image: Optional[UploadFile] = File(None),
):
    face = predict(face_gallery, face_vec(face_image), FACE_THRESHOLD)
    muzzle = (
        predict(muzzle_gallery, muzzle_vec(muzzle_image), MUZZLE_THRESHOLD)
        if muzzle_image is not None
        else None
    )
    out = fuse(face, muzzle)
    out["details"] = {"face": face, "muzzle": muzzle}
    return out


@app.post("/register", dependencies=auth)
def register(
    cattle_id: str = Form(...),
    face_image: UploadFile = File(...),
    muzzle_image: UploadFile = File(...),
):
    face_img = read_image(face_image)
    muzzle_img = read_image(muzzle_image)
    blocked = detect.screen(face_img, muzzle_img)
    if blocked is not None:
        blocked["cattle_id"] = cattle_id
        return blocked

    # Detector gate passed or skipped. Embed both before writing either gallery.
    fv = face_vec_img(face_img)
    mv = muzzle_vec_img(muzzle_img)
    face_gallery.add(cattle_id, fv, replace=True)
    muzzle_gallery.add(cattle_id, mv, replace=True)
    return {
        "status": "added",
        "cattle_id": cattle_id,
        "face_gallery_size": face_gallery.count(),
        "muzzle_gallery_size": muzzle_gallery.count(),
        "message": f"Cattle {cattle_id} registered in face and muzzle galleries",
    }


@app.post("/add_images", dependencies=auth)
def add_images(
    cattle_id: str = Form(...),
    face_image: Optional[UploadFile] = File(None),
    muzzle_image: Optional[UploadFile] = File(None),
):
    if face_image is None and muzzle_image is None:
        raise HTTPException(status_code=400, detail="Send face_image and/or muzzle_image")
    if not (face_gallery.has(cattle_id) or muzzle_gallery.has(cattle_id)):
        raise HTTPException(status_code=404, detail=f"Cattle {cattle_id} is not registered")
    face_img = read_image(face_image) if face_image is not None else None
    muzzle_img = read_image(muzzle_image) if muzzle_image is not None else None
    blocked = None
    if detect.ready():
        if face_img is not None and not detect.check(face_img, "face")["ok"]:
            blocked = {"status": "rejected", "reason": "not_cattle_photo", "message": "Face photo must show a cow face."}
        elif muzzle_img is not None and not detect.check(muzzle_img, "muzzle")["ok"]:
            blocked = {"status": "rejected", "reason": "not_cattle_photo", "message": "Muzzle photo must show a muzzle."}
    if blocked is not None:
        blocked["cattle_id"] = cattle_id
        return blocked
    fv = face_vec_img(face_img) if face_img is not None else None
    mv = muzzle_vec_img(muzzle_img) if muzzle_img is not None else None
    counts = {}
    if fv is not None:
        counts["face_images"] = face_gallery.add(cattle_id, fv)
    if mv is not None:
        counts["muzzle_images"] = muzzle_gallery.add(cattle_id, mv)
    return {"status": "updated", "cattle_id": cattle_id, **counts,
            "message": f"Images added for cattle {cattle_id}"}


@app.delete("/cattle/{cattle_id}", dependencies=auth)
def delete_cattle(cattle_id: str):
    removed = {"face": face_gallery.remove(cattle_id), "muzzle": muzzle_gallery.remove(cattle_id)}
    if not any(removed.values()):
        raise HTTPException(status_code=404, detail=f"Cattle {cattle_id} is not registered")
    return {"status": "deleted", "cattle_id": cattle_id, "removed": removed}
