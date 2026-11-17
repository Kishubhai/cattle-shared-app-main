"""
Model code for the Cattle ID service. Filled in for your two models:

  FACE   : cow_L4_saved_model                  (EfficientNetB0 -> 512-d embedding)
  MUZZLE : cfid_658_closedset_L4_saved_model   (EfficientNetB0 -> 512-d embedding)

Both are TensorFlow SavedModels with the same interface:
  input  'face_input'   float32 [N, 224, 224, 3]   RGB, RAW pixel values 0-255
  output 'l2_normalize' float32 [N, 512]           already L2-normalized

IMPORTANT: the models divide by 255 and normalize INTERNALLY (Keras
EfficientNet Rescaling + Normalization layers are inside the graph).
So we must feed raw 0-255 pixels. Do NOT add /255.0 here. Feeding 0-1 values
gives completely different embeddings.
"""
import io
import os

import numpy as np
from PIL import Image, ImageOps

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
import tensorflow as tf  # noqa: E402

MODEL_DIR = os.environ.get("ML_MODEL_DIR", "/opt/mlapp/models")
FACE_MODEL_PATH = os.path.join(MODEL_DIR, "cow_L4_saved_model")
MUZZLE_MODEL_PATH = os.path.join(MODEL_DIR, "cfid_658_closedset_L4_saved_model")
IMG_SIZE = 224

# Phone cameras store rotation in EXIF instead of rotating the pixels.
# 1 = rotate upright first (recommended for photos from the app).
# Set EXIF_TRANSPOSE=0 only if your HF Space / training code did NOT do this.
EXIF_TRANSPOSE = os.environ.get("EXIF_TRANSPOSE", "1") == "1"

# Keep TensorFlow from grabbing every CPU core on the VPS.
_threads = int(os.environ.get("TF_THREADS", "2"))
tf.config.threading.set_intra_op_parallelism_threads(_threads)
tf.config.threading.set_inter_op_parallelism_threads(1)


def load_image(raw: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(raw))
    if EXIF_TRANSPOSE:
        img = ImageOps.exif_transpose(img)
    return img.convert("RGB")


def _preprocess(img: Image.Image) -> tf.Tensor:
    x = np.asarray(img, dtype=np.float32)              # H x W x 3, values 0-255
    x = tf.image.resize(x, (IMG_SIZE, IMG_SIZE))       # bilinear, same as Keras data pipelines
    return tf.expand_dims(x, 0)                        # 1 x 224 x 224 x 3


def _load(path):
    if not os.path.isdir(path):
        raise FileNotFoundError(f"Model folder not found: {path}")
    model = tf.saved_model.load(path)
    fn = model.signatures["serving_default"]           # runs in inference mode
    # Warm-up so the first real request isn't slow.
    fn(face_input=tf.zeros((1, IMG_SIZE, IMG_SIZE, 3), tf.float32))
    return model, fn


_face = None      # (model, fn); model kept referenced so variables stay alive
_muzzle = None


def load_face_model():
    global _face
    _face = _load(FACE_MODEL_PATH)


def load_muzzle_model():
    global _muzzle
    _muzzle = _load(MUZZLE_MODEL_PATH)


def _embed(fn, img):
    out = fn(face_input=_preprocess(img))["l2_normalize"]
    return out.numpy()[0].astype(np.float32)


def embed_face(img: Image.Image) -> np.ndarray:
    return _embed(_face[1], img)


def embed_muzzle(img: Image.Image) -> np.ndarray:
    return _embed(_muzzle[1], img)
