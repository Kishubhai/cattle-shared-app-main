"""Optional cow-face and muzzle presence check before gallery writes.

Each detector is a TensorFlow SavedModel. Expected serving_default outputs:

  detection_boxes   float [1, N, 4]  normalized ymin, xmin, ymax, xmax
  detection_scores  float [1, N]
  detection_classes float [1, N]     optional; class 1 is the target

When both detectors are installed, a photo passes only when one box is at
least DETECT_MIN_CONF confident and covers at least DETECT_MIN_AREA of the
frame. When detectors are missing, screen() allows enrollment so the face
and muzzle embedding models can still run (Option A).
"""
import os

import numpy as np
from PIL import Image

MODEL_DIR = os.environ.get("ML_MODEL_DIR", "/opt/mlapp/models")
FACE_DETECTOR_PATH = os.environ.get(
    "ML_FACE_DETECTOR", os.path.join(MODEL_DIR, "cow_face_detector")
)
MUZZLE_DETECTOR_PATH = os.environ.get(
    "ML_MUZZLE_DETECTOR", os.path.join(MODEL_DIR, "muzzle_detector")
)
MIN_CONF = float(os.environ.get("DETECT_MIN_CONF", "0.50"))
MIN_AREA = float(os.environ.get("DETECT_MIN_AREA", "0.12"))

_face = None
_muzzle = None


def box_passes(box, score, min_conf=MIN_CONF, min_area=MIN_AREA):
    """True when this detection is confident and large enough in the frame."""
    score = float(score)
    if score < min_conf:
        return False
    ymin, xmin, ymax, xmax = [float(v) for v in box]
    width = max(0.0, xmax - xmin)
    height = max(0.0, ymax - ymin)
    return width * height >= min_area


def _best(boxes, scores):
    if boxes is None or scores is None or len(scores) == 0:
        return {"ok": False, "score": 0.0, "area": 0.0, "reason": "no_detection"}

    found = []
    for i, score in enumerate(np.reshape(scores, (-1,))):
        box = boxes[i]
        ymin, xmin, ymax, xmax = [float(v) for v in box]
        area = max(0.0, xmax - xmin) * max(0.0, ymax - ymin)
        found.append({
            "ok": box_passes(box, score),
            "score": round(float(score), 4),
            "area": round(float(area), 4),
        })

    passed = [item for item in found if item["ok"]]
    if passed:
        return max(passed, key=lambda item: item["score"])

    best = max(found, key=lambda item: item["score"])
    best["reason"] = "too_small" if best["score"] >= MIN_CONF else "low_confidence"
    return best


def _outputs(fn, img: Image.Image):
    import tensorflow as tf

    arr = np.asarray(img.convert("RGB"), dtype=np.uint8)
    tensor = tf.constant(arr[None, ...])
    try:
        out = fn(input_tensor=tensor)
    except TypeError:
        out = fn(image=tf.cast(tensor, tf.float32))
    arrays = {key: value.numpy() for key, value in out.items()}

    def pick(*names):
        for name in names:
            if name in arrays:
                return arrays[name]
        return None

    boxes = pick("detection_boxes", "boxes")
    scores = pick("detection_scores", "scores")
    classes = pick("detection_classes", "classes")
    if boxes is not None:
        boxes = np.reshape(boxes, (-1, 4))
    if scores is not None:
        scores = np.reshape(scores, (-1,))
    if classes is not None:
        classes = np.reshape(classes, (-1,))
    return boxes, scores, classes


def _load_one(path):
    if not os.path.isdir(path):
        return None
    import tensorflow as tf

    model = tf.saved_model.load(path)
    return model.signatures["serving_default"]


def load():
    """Load detectors when the folders exist. Missing folders are not an error."""
    global _face, _muzzle
    _face = _load_one(FACE_DETECTOR_PATH)
    _muzzle = _load_one(MUZZLE_DETECTOR_PATH)
    if ready():
        print(f"[detect] cattle detectors loaded (min_conf={MIN_CONF}, min_area={MIN_AREA})")
    else:
        missing = []
        if _face is None:
            missing.append(FACE_DETECTOR_PATH)
        if _muzzle is None:
            missing.append(MUZZLE_DETECTOR_PATH)
        print("[detect] detector not installed:", ", ".join(missing))
        print("[detect] enrollment will use face/muzzle embeddings without a cow-photo gate")


def ready():
    return _face is not None and _muzzle is not None


def check(img: Image.Image, kind):
    fn = _face if kind == "face" else _muzzle
    if fn is None:
        return {"ok": True, "reason": "detector_skipped", "score": 0.0, "area": 0.0}
    boxes, scores, _classes = _outputs(fn, img)
    result = _best(boxes, scores)
    result["kind"] = kind
    return result


def screen(face_img, muzzle_img):
    """Return a rejection payload, or None when both photos may be enrolled.

    If detectors are not installed, allow enrollment (embedding models only).
    If detectors are installed, both photos must pass the cow-face / muzzle check.
    """
    if not ready():
        return None
    face = check(face_img, "face")
    muzzle = check(muzzle_img, "muzzle")
    if face["ok"] and muzzle["ok"]:
        return None
    return {
        "status": "rejected",
        "reason": "not_cattle_photo",
        "face": face,
        "muzzle": muzzle,
        "message": "Face photo must show a cow face and muzzle photo must show a muzzle.",
    }
