use anyhow::Result;
use lettre::message::header::ContentType;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use std::time::Duration;

use crate::types::SmtpConfig;

pub async fn send_email(config: &SmtpConfig, to: &str, subject: &str, body: &str) -> Result<()> {
    let email = Message::builder()
        .from(format!("{} <{}>", config.from_name, config.from).parse()?)
        .to(to.parse()?)
        .subject(subject)
        .header(ContentType::TEXT_HTML)
        .body(body.to_string())?;

    let creds = Credentials::new(config.user.clone(), config.pass.clone());

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

    mailer.send(&email)?;

    Ok(())
}
