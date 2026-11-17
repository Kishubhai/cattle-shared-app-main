"""
Find the right KNOWN/UNKNOWN thresholds from YOUR real cattle photos.

Folder layout (at least ~20 cattle, 2+ photos each, different days/angles is best):
  calib/face/<cattle_id>/*.jpg
  calib/muzzle/<cattle_id>/*.jpg

Run (on your computer or the server, inside the venv):
  ML_MODEL_DIR=./models python calibrate.py calib
"""
import itertools
import os
import sys

import numpy as np

import models


def embeddings(folder, embed):
    ids, vecs = [], []
    for cid in sorted(os.listdir(folder)):
        d = os.path.join(folder, cid)
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                with open(os.path.join(d, f), "rb") as fh:
                    vecs.append(embed(models.load_image(fh.read())))
                ids.append(cid)
    return ids, np.stack(vecs)


def report(name, ids, E):
    S = E @ E.T
    same, diff = [], []
    for i, j in itertools.combinations(range(len(ids)), 2):
        (same if ids[i] == ids[j] else diff).append(S[i, j])
    same, diff = np.array(same), np.array(diff)
    print(f"\n=== {name}: {len(set(ids))} cattle, {len(ids)} photos")
    if len(same) == 0 or len(diff) == 0:
        print("Need several cattle with 2+ photos each.")
        return
    print(f"same cattle      : min {same.min():.3f}  median {np.median(same):.3f}")
    print(f"different cattle : median {np.median(diff):.3f}  max {diff.max():.3f}")
    print("threshold | wrong cattle accepted | same cattle recognised")
    for t in np.arange(0.40, 0.96, 0.05):
        print(f"   {t:.2f}   |        {np.mean(diff >= t) * 100:5.1f} %       |      {np.mean(same >= t) * 100:5.1f} %")
    t1 = float(np.quantile(diff, 0.99))
    print(f"Suggested threshold (<=1% wrong-cattle accepts): {t1:.2f}  "
          f"-> recognises {np.mean(same >= t1) * 100:.1f}% of same-cattle pairs")


if __name__ == "__main__":
    root = sys.argv[1] if len(sys.argv) > 1 else "calib"
    for name, loader, embed in [("FACE", models.load_face_model, models.embed_face),
                                ("MUZZLE", models.load_muzzle_model, models.embed_muzzle)]:
        folder = os.path.join(root, name.lower())
        if os.path.isdir(folder):
            loader()
            report(name, *embeddings(folder, embed))
        else:
            print(f"(skipping {name}: no folder {folder})")
