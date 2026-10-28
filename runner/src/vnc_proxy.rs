/*
 * Panel-proxied Proxmox VNC websocket relay (GitHub issue #168).
 *
 * Exposes a WebSocket endpoint on VNC_PROXY_LISTEN (default 0.0.0.0:9100):
 *
 *   GET /vnc-proxy/{token}   (Upgrade: websocket, subprotocol: binary)
 *
 * `token` is a short-lived, single-use ticket stored in
 * `featherpanel_vnc_tickets` by the backend's vnc-ticket endpoint. On connect
 * we look the ticket up, delete it (single-use) and bridge the client socket
 * to the Proxmox `vncwebsocket` endpoint on the VM's node. Proxmox itself is
 * never exposed to the client.
 */

use anyhow::{Context, Result};
use axum::{
    extract::{ws::Message as AxumMessage, ws::WebSocket, Path, WebSocketUpgrade},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};
use sqlx::mysql::MySqlPool;
use sqlx::Row;
use std::collections::HashMap;
use std::time::Duration;
use tokio_tungstenite::{
    connect_async_tls_with_config,
    tungstenite::{
        self,
        client::IntoClientRequest,
        http::{HeaderName, HeaderValue},
    },
    Connector,
};
use tracing::{debug, error, info, warn};

struct VncTicket {
    pve_node: String,
    vm_type: String,
    vmid: i64,
    port: i64,
    vncticket: String,
    fqdn: String,
    node_port: i64,
    scheme: String,
    tls_no_verify: String,
    /// Extra HTTP headers for the upstream Proxmox request (e.g. Cloudflare Access).
    extra_headers: HashMap<String, String>,
    /// Optional WS upstream overrides from `additional_params`
    /// (`vnc_upstream_host` / `vnc_upstream_port` / `vnc_upstream_scheme`).
    upstream_host: Option<String>,
    upstream_port: Option<i64>,
    upstream_scheme: Option<String>,
    /// `Authorization: PVEAPIToken=user!tokenid=secret` for pveproxy.
    pve_api_token: Option<String>,
}

/// Starts the VNC console WebSocket proxy HTTP listener.
///
/// Serves `GET /vnc-proxy/:token` and bridges authenticated clients to the
/// Proxmox `vncwebsocket` endpoint of the VM's node.
pub async fn serve(pool: MySqlPool, encryption_key: String) {
    let listen = std::env::var("VNC_PROXY_LISTEN").unwrap_or_else(|_| "0.0.0.0:9100".to_string());

    let app = Router::new().route(
        "/vnc-proxy/:token",
        get(move |Path(token): Path<String>, ws: WebSocketUpgrade| {
            let pool = pool.clone();
            let encryption_key = encryption_key.clone();
            async move { ws_handler(pool, encryption_key, token, ws).await }
        }),
    );

    let listener = match tokio::net::TcpListener::bind(&listen).await {
        Ok(l) => l,
        Err(e) => {
            error!("VNC proxy: failed to bind {}: {}", listen, e);
            return;
        }
    };
    info!("🖥️  VNC console proxy listening on {}", listen);
    if let Err(e) = axum::serve(listener, app).await {
        error!("VNC proxy server terminated: {}", e);
    }
}

/// Validates the one-time panel ticket, consumes it, then upgrades to WS.
///
/// Returns 403 for unknown, expired, or already-used tokens before any
/// upstream connection is attempted.
async fn ws_handler(
    pool: MySqlPool,
    encryption_key: String,
    token: String,
    ws: WebSocketUpgrade,
) -> Response {
    match load_ticket(&pool, &encryption_key, &token).await {
        Ok(Some(ticket)) => ws
            .protocols(["binary"])
            .on_upgrade(move |socket| bridge(socket, ticket)),
        Ok(None) => (
            StatusCode::FORBIDDEN,
            "Invalid or expired VNC console ticket",
        )
            .into_response(),
        Err(e) => {
            error!("VNC proxy: ticket lookup failed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "internal error").into_response()
        }
    }
}

/// Fetch + immediately delete the ticket so it cannot be replayed.
async fn load_ticket(pool: &MySqlPool, encryption_key: &str, token: &str) -> Result<Option<VncTicket>> {
    let mut tx = pool.begin().await?;

    let row = sqlx::query(
        "SELECT t.pve_node, t.vm_type, t.vmid, t.port, t.vncticket,
                n.fqdn, n.port AS node_port, n.scheme, n.tls_no_verify,
                n.addional_headers, n.additional_params,
                n.user AS pve_user, n.token_id, n.secret
         FROM featherpanel_vnc_tickets t
         JOIN featherpanel_vm_instances i ON i.id = t.vm_instance_id
         JOIN featherpanel_vm_nodes n ON n.id = i.vm_node_id
         WHERE t.token = ? AND t.expires_at > UNIX_TIMESTAMP()
         FOR UPDATE",
    )
    .bind(token)
    .fetch_optional(&mut *tx)
    .await?;

    let Some(row) = row else {
        tx.rollback().await.ok();
        return Ok(None);
    };

    sqlx::query("DELETE FROM featherpanel_vnc_tickets WHERE token = ?")
        .bind(token)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;

    let headers_json: String = row
        .try_get::<Option<String>, _>("addional_headers")
        .ok()
        .flatten()
        .unwrap_or_default();
    let extra_headers: HashMap<String, String> =
        serde_json::from_str(&headers_json).unwrap_or_default();

    let params_json: String = row
        .try_get::<Option<String>, _>("additional_params")
        .ok()
        .flatten()
        .unwrap_or_default();
    let params: HashMap<String, serde_json::Value> =
        serde_json::from_str(&params_json).unwrap_or_default();

    let upstream_host = params
        .get("vnc_upstream_host")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let upstream_port = params
        .get("vnc_upstream_port")
        .and_then(|v| v.as_i64().or_else(|| v.as_str().and_then(|s| s.parse().ok())));
    let upstream_scheme = params
        .get("vnc_upstream_scheme")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let pve_user: String = row.try_get("pve_user").unwrap_or_default();
    let enc_token_id: String = row.try_get("token_id").unwrap_or_default();
    let enc_secret: String = row.try_get("secret").unwrap_or_default();
    let pve_api_token = match crate::encryption::Encryptor::new(encryption_key) {
        Ok(encryptor) => match (encryptor.decrypt(&enc_token_id), encryptor.decrypt(&enc_secret)) {
            (Ok(token_id), Ok(secret))
                if !pve_user.is_empty() && !token_id.is_empty() && !secret.is_empty() =>
            {
                Some(format!(
                    "PVEAPIToken={}!{}={}",
                    pve_user, token_id, secret
                ))
            }
            (Err(e), _) | (_, Err(e)) => {
                warn!("VNC proxy: failed to decrypt node API token: {}", e);
                None
            }
            _ => None,
        },
        Err(e) => {
            warn!("VNC proxy: encryption init failed: {}", e);
            None
        }
    };

    Ok(Some(VncTicket {
        pve_node: row.try_get("pve_node")?,
        vm_type: row.try_get::<String, _>("vm_type")?,
        vmid: row.try_get("vmid")?,
        port: row.try_get("port")?,
        vncticket: row.try_get("vncticket")?,
        fqdn: row.try_get("fqdn")?,
        node_port: row.try_get("node_port")?,
        scheme: row.try_get::<String, _>("scheme")?,
        tls_no_verify: row.try_get::<String, _>("tls_no_verify")?,
        extra_headers,
        upstream_host,
        upstream_port,
        upstream_scheme,
        pve_api_token,
    }))
}

/// Connects to the node's vncwebsocket endpoint and relays frames both ways.
///
/// Ends when either side closes; Proxmox close frames are propagated to the
/// client.
async fn bridge(client: WebSocket, ticket: VncTicket) {
    let host = ticket
        .upstream_host
        .as_deref()
        .unwrap_or(ticket.fqdn.as_str());
    let scheme_http = ticket
        .upstream_scheme
        .as_deref()
        .unwrap_or(ticket.scheme.as_str());
    let scheme = if scheme_http == "http" { "ws" } else { "wss" };
    let port = ticket
        .upstream_port
        .filter(|p| *p > 0)
        .unwrap_or_else(|| if ticket.node_port > 0 { ticket.node_port } else { 8006 });
    let url = format!(
        "{}://{}:{}/api2/json/nodes/{}/{}/{}/vncwebsocket?port={}&vncticket={}",
        scheme,
        host,
        port,
        ticket.pve_node,
        ticket.vm_type,
        ticket.vmid,
        ticket.port,
        urlencoding::encode(&ticket.vncticket)
    );

    let mut request = match url.clone().into_client_request() {
        Ok(r) => r,
        Err(e) => {
            warn!("VNC proxy: invalid upstream url: {}", e);
            return;
        }
    };
    // Proxmox vncwebsocket negotiates the `binary` subprotocol.
    request
        .headers_mut()
        .insert("Sec-WebSocket-Protocol", HeaderValue::from_static("binary"));
    request.headers_mut().insert(
        HeaderName::from_static("user-agent"),
        HeaderValue::from_static("FeatherPanel-AsyncRunner/1.5"),
    );

    // pveproxy authenticates the websocket with the node API token. The vncticket
    // query param alone is not enough (returns 401). PVEVNC tickets are not valid
    // PVEAuthCookies - those come from /access/ticket.
    if let Some(ref auth) = ticket.pve_api_token {
        match HeaderValue::from_str(auth) {
            Ok(value) => {
                request
                    .headers_mut()
                    .insert(HeaderName::from_static("authorization"), value);
            }
            Err(e) => {
                warn!("VNC proxy: could not set Authorization header: {}", e);
            }
        }
    } else {
        warn!("VNC proxy: missing decrypted PVE API token; upstream will likely 401");
    }

    // Same extra headers the PHP Proxmox client uses (Cloudflare Access service tokens, etc.).
    // Skip them when using a direct/non-CF upstream override - Access tokens confuse raw pveproxy.
    let use_extra_headers = ticket.upstream_host.is_none();
    if use_extra_headers {
        for (k, v) in &ticket.extra_headers {
            match (HeaderName::from_bytes(k.as_bytes()), HeaderValue::from_str(v)) {
                (Ok(name), Ok(value)) => {
                    request.headers_mut().insert(name, value);
                }
                _ => {
                    warn!("VNC proxy: skipping invalid extra header {:?}", k);
                }
            }
        }
    }

    let connector = match build_connector(ticket.tls_no_verify == "true") {
        Ok(c) => Some(c),
        Err(e) => {
            error!("VNC proxy: TLS connector build failed: {}", e);
            return;
        }
    };

    let upstream = match connect_async_tls_with_config(request, None, false, connector).await {
        Ok((stream, _)) => stream,
        Err(e) => {
            warn!(
                "VNC proxy: upstream connect to {}:{} failed: {}",
                host, port, e
            );
            return;
        }
    };

    info!(
        "VNC proxy: bridging console for VMID {} on node {}",
        ticket.vmid, ticket.pve_node
    );

    let (mut client_sink, mut client_stream) = client.split();
    let (mut up_sink, mut up_stream) = upstream.split();

    let client_to_up = async {
        while let Some(msg) = client_stream.next().await {
            match msg {
                Ok(m) => {
                    if let Some(u) = to_tungstenite(m) {
                        if up_sink.send(u).await.is_err() {
                            break;
                        }
                    }
                }
                Err(_) => break,
            }
        }
        let _ = up_sink.send(tungstenite::Message::Close(None)).await;
    };

    let up_to_client = async {
        while let Some(msg) = up_stream.next().await {
            match msg {
                Ok(m) => {
                    if let Some(a) = to_axum(m) {
                        if client_sink.send(a).await.is_err() {
                            break;
                        }
                    }
                }
                Err(_) => break,
            }
        }
        let _ = client_sink
            .send(AxumMessage::Close(None))
            .await;
    };

    // Whichever direction ends first tears the whole bridge down.
    tokio::select! {
        _ = client_to_up => {},
        _ = up_to_client => {},
    }

    debug!("VNC proxy: bridge closed for VMID {}", ticket.vmid);
}

/// Builds the TLS connector for the upstream Proxmox socket.
///
/// `tls_no_verify` maps to `danger_accept_invalid_certs` - needed for the
/// self-signed certs Proxmox ships by default.
fn build_connector(tls_no_verify: bool) -> Result<Connector> {
    let mut builder = native_tls::TlsConnector::builder();
    if tls_no_verify {
        builder.danger_accept_invalid_certs(true);
        builder.danger_accept_invalid_hostnames(true);
    }
    let tls = builder.build().context("native-tls build")?;
    Ok(Connector::NativeTls(tls.into()))
}

/// Converts an axum WebSocket message to its tungstenite equivalent.
///
/// Ping/Pong return `None` - axum handles liveness on the client side;
/// upstream we forward data frames only.
fn to_tungstenite(m: AxumMessage) -> Option<tungstenite::Message> {
    match m {
        AxumMessage::Text(t) => Some(tungstenite::Message::Text(t.to_string())),
        AxumMessage::Binary(b) => Some(tungstenite::Message::Binary(b.to_vec())),
        AxumMessage::Ping(p) => Some(tungstenite::Message::Ping(p.to_vec())),
        AxumMessage::Pong(p) => Some(tungstenite::Message::Pong(p.to_vec())),
        AxumMessage::Close(_) => Some(tungstenite::Message::Close(None)),
    }
}

/// Converts a tungstenite message (from Proxmox) to an axum message for the browser.
fn to_axum(m: tungstenite::Message) -> Option<AxumMessage> {
    match m {
        tungstenite::Message::Text(t) => Some(AxumMessage::Text(t.into())),
        tungstenite::Message::Binary(b) => Some(AxumMessage::Binary(b.into())),
        tungstenite::Message::Ping(p) => Some(AxumMessage::Ping(p.into())),
        tungstenite::Message::Pong(p) => Some(AxumMessage::Pong(p.into())),
        tungstenite::Message::Close(_) => Some(AxumMessage::Close(None)),
        tungstenite::Message::Frame(_) => None,
    }
}

/// Periodic sweep for tickets that were never consumed.
pub async fn cleanup_loop(pool: MySqlPool) {
    loop {
        tokio::time::sleep(Duration::from_secs(300)).await;
        match sqlx::query("DELETE FROM featherpanel_vnc_tickets WHERE expires_at <= UNIX_TIMESTAMP()")
            .execute(&pool)
            .await
        {
            Ok(r) => {
                if r.rows_affected() > 0 {
                    debug!("VNC proxy: swept {} expired tickets", r.rows_affected());
                }
            }
            Err(e) => warn!("VNC proxy: ticket sweep failed: {}", e),
        }
    }
}
