#!/bin/sh
set -eu

PORT=${PORT:-8080}
case "$PORT" in ''|*[!0-9]*) echo 'PORT must be an integer from 1024 to 65535' >&2; exit 1;; esac
if [ "$PORT" -lt 1024 ] || [ "$PORT" -gt 65535 ]; then
    echo 'PORT must be an integer from 1024 to 65535' >&2
    exit 1
fi
if ! printf '%s\n' "${BACKEND_UPSTREAM:-}" | grep -Eq '^http://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?:[0-9]{1,5}$'; then
    echo 'BACKEND_UPSTREAM must be http://hostname:port without path, credentials or trailing slash' >&2
    exit 1
fi
backend_port=${BACKEND_UPSTREAM##*:}
if [ "$backend_port" -lt 1 ] || [ "$backend_port" -gt 65535 ]; then
    echo 'BACKEND_UPSTREAM port must be from 1 to 65535' >&2
    exit 1
fi

# Use the runtime network resolver, including IPv6-only private environments.
DNS_RESOLVERS=$(awk '$1 == "nameserver" { if ($2 ~ /:/) printf "[%s] ", $2; else printf "%s ", $2 }' /etc/resolv.conf)
test -n "$DNS_RESOLVERS"
test -s /usr/share/nginx/html/index.html
export PORT BACKEND_UPSTREAM DNS_RESOLVERS
envsubst '${PORT} ${BACKEND_UPSTREAM} ${DNS_RESOLVERS}' < /etc/nginx/servibox.conf.template > /tmp/servibox-nginx.conf
nginx -t -c /tmp/servibox-nginx.conf
exec nginx -c /tmp/servibox-nginx.conf -g 'daemon off;'
