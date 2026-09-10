# Production: HTTPS — use after certbot.
# install.sh production

server {
    listen 80;
    listen [::]:80;
    server_name api.mtgmods.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name api.mtgmods.com;

    ssl_certificate     /etc/letsencrypt/live/mtgmods.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mtgmods.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    limit_req_status 429;
    error_page 429 = @ratelimit;

    location ~ /\.(git|env|ht|htpasswd) {
        deny all;
        access_log off;
        log_not_found off;
    }

    location = /v1/gemini_editor {
        limit_req zone=client_heavy burst=5 nodelay;
        proxy_pass http://127.0.0.1:5002/api/v1/gemini_editor;
        include /etc/nginx/snippets/proxy_api.conf;
    }

    location = /v1/license/check {
        limit_req zone=client_heavy burst=5 nodelay;
        proxy_pass http://127.0.0.1:8002/api/v1/license/check;
        include /etc/nginx/snippets/proxy_api.conf;
    }

    location = /v1/usage/launch {
        limit_req zone=client_heavy burst=5 nodelay;
        proxy_pass http://127.0.0.1:8003/api/v1/usage/launch;
        include /etc/nginx/snippets/proxy_api.conf;
    }

    location /v1/users/auth/ {
        limit_req zone=auth burst=20 nodelay;
        proxy_pass http://127.0.0.1:8001/api/v1/users/auth/;
        include /etc/nginx/snippets/proxy_api.conf;
    }

    location /v1/users/ {
        proxy_pass http://127.0.0.1:8001/api/v1/users/;
        include /etc/nginx/snippets/proxy_api.conf;
    }

    location /v1/license/ {
        proxy_pass http://127.0.0.1:8002/api/v1/license/;
        include /etc/nginx/snippets/proxy_api.conf;
    }

    location /v1/usage/ {
        proxy_pass http://127.0.0.1:8003/api/v1/usage/;
        include /etc/nginx/snippets/proxy_api.conf;
    }

    location /v1/files/ {
        proxy_pass http://127.0.0.1:8005/api/v1/files/;
        include /etc/nginx/snippets/proxy_api.conf;
    }

    location @ratelimit {
        default_type application/json;
        return 429 '{"valid":false,"error":"RATE_LIMIT","retry":60}';
    }

    location / {
        return 404;
    }
}
