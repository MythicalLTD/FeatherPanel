#!/bin/bash
# Interactive login shell for OCI / Proxmox CT: FeatherPanel CLI by default; type bash for full root shell.

if [ ! -t 0 ]; then
    exec /bin/bash "$@"
fi

featherpanel_oci_resolve_app_url() {
    local url="${FEATHERPANEL_APP_URL:-}"
    if [ -n "$url" ]; then
        echo "$url"
        return
    fi
    if [ -f /data/config/.env ]; then
        url=$(grep -iE '^[[:space:]]*app_url[[:space:]]*=' /data/config/.env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/^"//;s/"$//' || true)
        if [ -n "$url" ]; then
            echo "$url"
            return
        fi
    fi
    echo ""
}

featherpanel_oci_print_banner() {
    local app_url
    app_url=$(featherpanel_oci_resolve_app_url)
    echo "============================================================"
    echo "  FeatherPanel OCI"
    echo "============================================================"
    if [ -n "$app_url" ]; then
        echo "  Panel URL (app_url): $app_url"
    else
        echo "  Panel URL: not in .env yet — open http://<this-host>/ or set FEATHERPANEL_APP_URL"
    fi
    echo "  HTTP (in container):  http://127.0.0.1/"
    echo "------------------------------------------------------------"
    echo "  You are in the FeatherPanel CLI prompt (same as: php cli ... from /var/www/html)."
    echo "  Examples:  help | saas listusers | saas createuser ..."
    echo "  Full root shell:  bash   or   /bin/bash"
    echo "  Non-interactive:  docker exec <ct> featherpanel help"
    echo "============================================================"
    echo ""
}

featherpanel_oci_print_banner

while true; do
    if ! read -r -e -p "featherpanel> " line; then
        echo ""
        exit 0
    fi
    read -r -a words <<<"$line"
    [ ${#words[@]} -eq 0 ] && continue
    if [[ "${words[0]}" == "bash" || "${words[0]}" == "/bin/bash" ]]; then
        exec /bin/bash -l "${words[@]:1}"
    fi
    if [[ "${words[0]}" == "exit" || "${words[0]}" == "logout" ]]; then
        exit 0
    fi
    (cd /var/www/html && php cli "${words[@]}")
done
