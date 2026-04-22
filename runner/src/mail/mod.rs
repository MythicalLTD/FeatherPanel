use anyhow::{Context, Result};
use lettre::message::header::ContentType;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use std::collections::BTreeSet;
use std::net::{IpAddr, ToSocketAddrs};
use std::time::Duration;
use tracing::{debug, info, warn};

use crate::types::SmtpConfig;

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

    let mailer = if config.encryption == "ssl" {
        SmtpTransport::relay(&config.host)?
            .credentials(creds)
            .port(config.port)
            .timeout(Some(Duration::from_secs(30)))
            .build()
    } else {
        SmtpTransport::starttls_relay(&config.host)?
            .credentials(creds)
            .port(config.port)
            .timeout(Some(Duration::from_secs(30)))
            .build()
    };

    info!(
        "Sending SMTP mail to {} via {}:{} (encryption={})",
        to, config.host, config.port, config.encryption
    );

    mailer.send(&email).with_context(|| {
        format!(
            "SMTP send failed via {}:{} (encryption={}, ipv4={}, ipv6={})",
            config.host, config.port, config.encryption, ipv4_count, ipv6_count
        )
    })?;

    info!("SMTP delivery accepted for {}", to);

    Ok(())
}
