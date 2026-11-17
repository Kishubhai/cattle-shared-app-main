# Cattle ID ML service: Hostinger setup

```
mlapp/
├── main.py            server
├── models.py          loads your two TensorFlow models (already filled in)
├── calibrate.py       finds the right thresholds from real photos
├── requirements.txt   tested, pinned versions
├── models/
│   ├── cow_L4_saved_model/                  FACE model
│   └── cfid_658_closedset_L4_saved_model/   MUZZLE model
├── data/              galleries are saved here automatically
└── deploy/
    ├── setup.sh       one-command server setup
    └── mlapp.service  keeps the API running 24/7
```

## About your models

Both are EfficientNetB0 TensorFlow SavedModels (saved with TF 2.10) that take a
224x224 RGB image and return a 512-number embedding that is already L2-normalized.

**Preprocessing:** the models divide by 255 and normalize *inside* the graph, so
`models.py` feeds raw 0-255 pixels, resized to 224x224 (bilinear). Never add
`/255.0`: tested, it changes the embeddings completely. If your training code
or HF Space center-cropped images instead of resizing the whole photo, tell me
and change `_preprocess` in `models.py` accordingly.

**Resources:** about 1.3 GB RAM for both models; ~140 ms per `/identify` call
(both models) on CPU. Hostinger KVM 1 (4 GB) works; KVM 2 gives headroom.

## Step 1: Test on your own computer (optional but recommended)

Needs Python 3.9-3.12.
```bash
python -m venv venv && source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
ML_DATA_DIR=./data ML_MODEL_DIR=./models uvicorn main:app --port 8000
```
Open http://127.0.0.1:8000/docs and try `/register` and `/identify` with real photos.
No API key is required while `ML_API_KEY` is unset.

## Step 2: Upload to the VPS

Hostinger hPanel → VPS → copy the IP and root password. Then from your computer:

```bash
ssh root@YOUR_SERVER_IP "mkdir -p /opt/mlapp"
scp -r ./mlapp/* root@YOUR_SERVER_IP:/opt/mlapp/
```

## Step 3: Run the setup script

```bash
ssh root@YOUR_SERVER_IP
bash /opt/mlapp/deploy/setup.sh
```

It installs Python, creates the environment, generates an API key, starts the
service and turns on the firewall. It prints the API key at the end; copy it.

## Step 4: Test on the server

```bash
curl http://127.0.0.1:8000/health
KEY=$(grep ML_API_KEY /etc/mlapp.env | cut -d= -f2)

curl -X POST http://127.0.0.1:8000/register -H "X-API-Key: $KEY" \
  -F cattle_id=TEST1 -F face_image=@face.jpg -F muzzle_image=@muzzle.jpg

curl -X POST http://127.0.0.1:8000/identify -H "X-API-Key: $KEY" \
  -F face_image=@face.jpg -F muzzle_image=@muzzle.jpg

curl -X DELETE http://127.0.0.1:8000/cattle/TEST1 -H "X-API-Key: $KEY"
```

## Step 5: Set the thresholds (do not skip)

`0.75` in `/etc/mlapp.env` is a placeholder. A threshold that's too low makes
different cattle match (false "duplicate" at registration); too high makes
registered cattle come back UNKNOWN.

* **Face:** use the same threshold your HF Space uses today.
* **Muzzle:** calibrate. Put real photos in `calib/muzzle/<cattle_id>/*.jpg`
  (20+ cattle, 2+ photos each, ideally taken on different days), same for
  `calib/face/`, then run:
  ```bash
  cd /opt/mlapp && sudo -u mlapp ML_MODEL_DIR=./models venv/bin/python calibrate.py calib
  ```
  It prints how many wrong/right matches each threshold gives and suggests one.
  Put the values in `/etc/mlapp.env` (`FACE_THRESHOLD`, `MUZZLE_THRESHOLD`; set
  the `*_STRONG` values ~0.05-0.10 higher) and `systemctl restart mlapp`.

The muzzle model is a closed-set model trained on 658 cattle; it will now see
new cattle it never trained on, which is exactly why calibrating on your own
cattle photos matters.

## Step 6: Connect the Node backend

**Backend on the same VPS** (recommended): in the backend's `.env`
```
ML_BASE_URL=http://127.0.0.1:8000
ML_API_KEY=<key from step 3>
```

**Backend on another server:** keep `ML_HOST=127.0.0.1` and put Nginx + HTTPS in
front (point a subdomain like `ml.yourdomain.com` at the VPS, proxy to
`127.0.0.1:8000`, then `certbot --nginx`). Never expose port 8000 directly.

Which call goes where in `mlService.js`:

| Backend flow | Endpoint | Images |
|---|---|---|
| Registration duplicate check | `POST /identify` | `face[0]`, `muzzle[0]` |
| Gallery enrollment, retry job, M-Admin register-ml | `POST /register` | `face[0]`, `muzzle[0]` |
| Add more images to a cattle | `POST /add_images` | any of face / muzzle |
| Identification request | `POST /identify` | `front` (+ muzzle photo once added to the form) |

`/identify` returns the same fields as the HF Space (`decision`, `is_known`,
`max_similarity`, `best_match`), so `callMLModel()` keeps working.

## Step 7: Rebuild the galleries

The new galleries start empty. Loop over every cattle in MongoDB with
`mlRegistration.status: 'registered'` and call `/register` with its stored
`face[0]` and `muzzle[0]` images. Check `/health` afterwards: both gallery sizes
should equal the number of registered cattle. Then switch `ML_BASE_URL`.

## Everyday commands

| Task | Command |
|---|---|
| Live logs | `journalctl -u mlapp -f` |
| Restart after changing code / models | `systemctl restart mlapp` |
| Change thresholds or key | `nano /etc/mlapp.env` then restart |
| Memory usage | `free -h` |
| Back up galleries | `tar czf ~/gallery-$(date +%F).tgz -C /opt/mlapp data` |

## Important

* Keep `--workers 1` in `mlapp.service`. More workers = each has its own gallery copy = wrong results.
* Matching uses cosine similarity, which is what an `l2_normalize` output is designed for.
  If your HF Space used Euclidean distance, convert: `cosine = 1 - distance² / 2`.
* `EXIF_TRANSPOSE=1` rotates phone photos upright before the model sees them.
