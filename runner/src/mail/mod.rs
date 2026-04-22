use anyhow::{Context, Result, anyhow};
use lettre::message::header::ContentType;
use lettre::transport::smtp::client::{Tls, TlsParameters};
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use once_cell::sync::Lazy;
use std::collections::BTreeSet;
use std::net::{IpAddr, ToSocketAddrs};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tracing::{debug, info, warn};

use crate::types::SmtpConfig;

static PREFER_IPV4_SMTP: Lazy<AtomicBool> = Lazy::new(|| AtomicBool::new(false));

pub async fn send_email(config: &SmtpConfig, to: &str, subject: &str, body: &str) -> Result<()> {
    let email = Message::builder()
        .from(format!("{} <{}>", config.from_name, config.from).parse()?)
        .to(to.parse()?)
        .subject(subject)
        .header(ContentType::TEXT_HTML)
        .body(body.to_string())?;

    let creds = Credentials::new(config.user.clone(), config.pass.clone());

    let lookup_target = format!("{}:{}", config.host, config.port);
    let resolved_addrs = lookup_target
        .to_socket_addrs()
        .with_context(|| format!("DNS resolution failed for SMTP host {}", config.host))?
        .map(|addr| addr.ip())
        .collect::<BTreeSet<IpAddr>>();
    let ipv4_addrs = resolved_addrs
        .iter()
        .filter_map(|ip| match ip {
            IpAddr::V4(v4) => Some(v4.to_string()),
            IpAddr::V6(_) => None,
        })
        .collect::<Vec<String>>();

    let ipv4_count = resolved_addrs
        .iter()
        .filter(|ip| matches!(ip, IpAddr::V4(_)))
        .count();
    let ipv6_count = resolved_addrs
        .iter()
        .filter(|ip| matches!(ip, IpAddr::V6(_)))
        .count();

    info!(
        "SMTP target {}:{} resolved (ipv4={}, ipv6={})",
        config.host, config.port, ipv4_count, ipv6_count
    );
    debug!("SMTP resolved addresses for {}: {:?}", config.host, resolved_addrs);

    if ipv4_count == 0 && ipv6_count > 0 {
        warn!(
            "SMTP host {} resolves to IPv6 only. If container IPv6 routing is disabled, sending will fail with ENETUNREACH.",
            config.host
        );
    }

    info!(
        "Sending SMTP mail to {} via {}:{} (encryption={})",
        to, config.host, config.port, config.encryption
    );

    let prefer_ipv4 = PREFER_IPV4_SMTP.load(Ordering::Relaxed);
    let primary_connect_host = if prefer_ipv4 && !ipv4_addrs.is_empty() {
        ipv4_addrs[0].as_str()
    } else {
        config.host.as_str()
    };

    if prefer_ipv4 && primary_connect_host != config.host {
        info!(
            "Using cached IPv4 preference for SMTP route: {} (TLS host {})",
            primary_connect_host, config.host
        );
    }

    let primary_send = send_via_host(config, &creds, &email, primary_connect_host, &config.host);
    if let Err(primary_error) = primary_send {
        let primary_error_str = primary_error.to_string();
        let should_try_ipv4_fallback =
            primary_connect_host == config.host
                && primary_error_str.contains("Network is unreachable")
                && ipv4_count > 0
                && ipv6_count > 0;

        if should_try_ipv4_fallback {
            PREFER_IPV4_SMTP.store(true, Ordering::Relaxed);
            let fallback_host = ipv4_addrs[0].clone();
            warn!(
                "Primary SMTP send failed with ENETUNREACH; retrying via IPv4 {} with TLS host {}",
                fallback_host, config.host
            );

            send_via_host(config, &creds, &email, &fallback_host, &config.host).map_err(|e| {
                anyhow!(
                    "SMTP send failed via {}:{} (encryption={}, ipv4={}, ipv6={}): {}",
                    config.host,
                    config.port,
                    config.encryption,
                    ipv4_count,
                    ipv6_count,
                    e
                )
            })?;
        } else {
            return Err(anyhow!(
                "SMTP send failed via {}:{} (encryption={}, ipv4={}, ipv6={}): {}",
                config.host,
                config.port,
                config.encryption,
                ipv4_count,
                ipv6_count,
                primary_error
            ));
        }
    }

    info!("SMTP delivery accepted for {}", to);

    Ok(())
}

fn send_via_host(
    config: &SmtpConfig,
    creds: &Credentials,
    email: &Message,
    connect_host: &str,
    tls_host: &str,
) -> Result<()> {
    let tls_params = TlsParameters::new(tls_host.to_string())?;
    let mut builder = SmtpTransport::builder_dangerous(connect_host)
        .credentials(creds.clone())
        .port(config.port)
        .timeout(Some(Duration::from_secs(30)));

    builder = match config.encryption.as_str() {
        "ssl" => builder.tls(Tls::Wrapper(tls_params)),
        "tls" => builder.tls(Tls::Required(tls_params)),
        _ => builder.tls(Tls::Required(tls_params)),
    };

    let mailer = builder.build();
    mailer.send(email)?;
    Ok(())
}
