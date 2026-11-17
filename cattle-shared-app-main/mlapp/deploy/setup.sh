#!/usr/bin/env bash
# Run on the Hostinger VPS as root, AFTER uploading the project to /opt/mlapp:
#   bash /opt/mlapp/deploy/setup.sh
set -euo pipefail
APP_DIR=/opt/mlapp

if [ ! -d "$APP_DIR/models/cow_L4_saved_model" ] || [ ! -d "$APP_DIR/models/cfid_658_closedset_L4_saved_model" ]; then
  echo "ERROR: model folders missing in $APP_DIR/models"; exit 1
fi

echo "==> Installing system packages"
apt-get update -y
apt-get install -y python3 python3-venv python3-pip ufw openssl

echo "==> Creating service user 'mlapp'"
id mlapp &>/dev/null || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin mlapp
mkdir -p "$APP_DIR/data" "$APP_DIR/models"

echo "==> Creating Python environment and installing requirements"
python3 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install --upgrade pip
"$APP_DIR/venv/bin/pip" install -r "$APP_DIR/requirements.txt"

if [ ! -f /etc/mlapp.env ]; then
  echo "==> Creating /etc/mlapp.env with a new API key"
  cat > /etc/mlapp.env <<ENV
ML_API_KEY=$(openssl rand -hex 32)
ML_DATA_DIR=$APP_DIR/data
ML_MODEL_DIR=$APP_DIR/models
# 127.0.0.1 = only this server can reach it (Node backend on the same VPS).
# Use 127.0.0.1 also when you put Nginx in front for a backend on another server.
ML_HOST=127.0.0.1
FACE_THRESHOLD=0.75
MUZZLE_THRESHOLD=0.75
FACE_STRONG=0.85
MUZZLE_STRONG=0.85
# CPU threads TensorFlow may use, and phone-photo rotation fix
TF_THREADS=2
EXIF_TRANSPOSE=1
ENV
  chmod 600 /etc/mlapp.env
fi

chown -R mlapp:mlapp "$APP_DIR"

echo "==> Installing and starting the service"
cp "$APP_DIR/deploy/mlapp.service" /etc/systemd/system/mlapp.service
systemctl daemon-reload
systemctl enable mlapp
systemctl restart mlapp

echo "==> Firewall"
ufw allow OpenSSH
ufw --force enable

sleep 5
systemctl --no-pager status mlapp | head -n 12 || true
echo
echo "Done. Your API key (put it in the Node backend's ML_API_KEY):"
grep ML_API_KEY /etc/mlapp.env
echo "Check:  curl http://127.0.0.1:8000/health"
echo "Logs:   journalctl -u mlapp -f"
