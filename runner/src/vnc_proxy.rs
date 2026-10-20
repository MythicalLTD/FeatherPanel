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
use std::time::Duration;
use tokio_tungstenite::{
    connect_async_tls_with_config,
    tungstenite::{self, client::IntoClientRequest},
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
}

/// Starts the VNC console WebSocket proxy HTTP listener.
///
/// Serves `GET /vnc-proxy/:token` and bridges authenticated clients to the
/// Proxmox `vncwebsocket` endpoint of the VM's node.
pub async fn serve(pool: MySqlPool) {
    let listen = std::env::var("VNC_PROXY_LISTEN").unwrap_or_else(|_| "0.0.0.0:9100".to_string());

    let app = Router::new().route(
        "/vnc-proxy/:token",
        get(move |Path(token): Path<String>, ws: WebSocketUpgrade| {
            let pool = pool.clone();
            async move { ws_handler(pool, token, ws).await }
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
async fn ws_handler(pool: MySqlPool, token: String, ws: WebSocketUpgrade) -> Response {
    match load_ticket(&pool, &token).await {
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
async fn load_ticket(pool: &MySqlPool, token: &str) -> Result<Option<VncTicket>> {
    let mut tx = pool.begin().await?;

    let row = sqlx::query(
        "SELECT t.pve_node, t.vm_type, t.vmid, t.port, t.vncticket,
                n.fqdn, n.port AS node_port, n.scheme, n.tls_no_verify
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
    }))
}

/// Connects to the node's vncwebsocket endpoint and relays frames both ways.
///
/// Ends when either side closes; Proxmox close frames are propagated to the
/// client.
async fn bridge(client: WebSocket, ticket: VncTicket) {
    let scheme = if ticket.scheme == "http" { "ws" } else { "wss" };
    let port = if ticket.node_port > 0 { ticket.node_port } else { 8006 };
    let url = format!(
        "{}://{}:{}/api2/json/nodes/{}/{}/{}/vncwebsocket?port={}&vncticket={}",
        scheme,
        ticket.fqdn,
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
        .insert("Sec-WebSocket-Protocol", tungstenite::http::HeaderValue::from_static("binary"));

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
                ticket.fqdn, port, e
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
