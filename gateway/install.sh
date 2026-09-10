# Deploy nginx configs from repo to /etc/nginx
# Usage:
#   ./install.sh bootstrap    # HTTP only, before certbot
#   ./install.sh production   # HTTPS, after certbot
set -euo pipefail

MODE="${1:-}"
ROOT="$(cd "$(dirname "$0")" && pwd)"

if [[ "$MODE" != "bootstrap" && "$MODE" != "production" ]]; then
    echo "Usage: $0 bootstrap|production"
    exit 1
fi

if [[ "$MODE" == "bootstrap" ]]; then
    SITES_SRC="$ROOT/sites-available.bootstrap"
else
    SITES_SRC="$ROOT/sites-available"
fi

echo "==> backup /etc/nginx/nginx.conf"
sudo cp /etc/nginx/nginx.conf "/etc/nginx/nginx.conf.bak.$(date +%Y%m%d%H%M%S)"

echo "==> install nginx.conf + snippets"
sudo cp "$ROOT/nginx.conf" /etc/nginx/nginx.conf
sudo cp "$ROOT/snippets/proxy_api.conf" /etc/nginx/snippets/proxy_api.conf
sudo cp "$ROOT/snippets/proxy_api_files.conf" /etc/nginx/snippets/proxy_api_files.conf

echo "==> install sites ($MODE)"
sudo cp "$SITES_SRC/mtgmods.com" /etc/nginx/sites-available/mtgmods.com
sudo cp "$SITES_SRC/api.mtgmods.com" /etc/nginx/sites-available/api.mtgmods.com

echo "==> enable sites"
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/mtgmods.com /etc/nginx/sites-enabled/mtgmods.com
sudo ln -sf /etc/nginx/sites-available/api.mtgmods.com /etc/nginx/sites-enabled/api.mtgmods.com

echo "==> test + reload"
sudo nginx -t
sudo systemctl reload nginx

echo "Done ($MODE)."
if [[ "$MODE" == "bootstrap" ]]; then
    cat <<'EOF'

Next:
  sudo apt install -y certbot python3-certbot-nginx
  sudo certbot certonly --nginx -d mtgmods.com -d www.mtgmods.com -d api.mtgmods.com
  ./install.sh production
EOF
fi
