use crate::config::Config;
use crate::database;
use crate::models::{MailQueue, User};
use anyhow::{anyhow, Result};
use colored::Colorize;
use lettre::message::header::ContentType;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use std::time::Duration;
use tokio::time::sleep;
use tracing::{error, info};

pub async fn send_mail(
    pool: &sqlx::MySqlPool,
    mail: &MailQueue,
    user: &User,
    config: &Config,
) -> Result<()> {
    // Get SMTP configuration from database
    let smtp_config = database::get_smtp_config(pool).await?;

    // Validate SMTP configuration
    if smtp_config.host.is_empty() {
        println!("{}", "SMTP host is not set, skipping mail sending".red());
        return Err(anyhow!("SMTP host is not set"));
    }

    if smtp_config.user.is_empty() {
        println!("{}", "SMTP user is not set, skipping mail sending".red());
        return Err(anyhow!("SMTP user is not set"));
    }

    if smtp_config.from.is_empty() {
        println!("{}", "SMTP from is not set, skipping mail sending".red());
        return Err(anyhow!("SMTP from is not set"));
    }

    if smtp_config.encryption.is_empty() {
        println!("{}", "SMTP encryption is not set, skipping mail sending".red());
        return Err(anyhow!("SMTP encryption is not set"));
    }

    println!(
        "{}",
        format!("Sending mail to {}", user.email).green()
    );

    let max_retries = config.max_retries;
    let mut attempt = 0;
    let mut last_error = String::new();

    while attempt < max_retries {
        println!(
            "{}",
            format!(
                "Attempting to send mail to {} (Attempt {}/{})",
                user.email,
                attempt + 1,
                max_retries
            )
            .green()
        );

        attempt += 1;

        match try_send_mail(&smtp_config, mail, user).await {
            Ok(_) => {
                info!("Successfully sent mail to {}", user.email);
                return Ok(());
            }
            Err(e) => {
                last_error = e.to_string();
                println!(
                    "{}",
                    format!("Failed to send mail (attempt {}): {}", attempt, last_error).red()
                );
                error!("Failed to send mail (attempt {}): {}", attempt, last_error);

                if attempt < max_retries {
                    sleep(Duration::from_secs(config.retry_delay)).await;
                }
            }
        }
    }

    Err(anyhow!("Failed to send mail after {} attempts: {}", max_retries, last_error))
}

async fn try_send_mail(
    smtp_config: &crate::models::SmtpConfig,
    mail: &MailQueue,
    user: &User,
) -> Result<()> {
    // Build email message
    let email = Message::builder()
        .from(
            format!("{} <{}>", smtp_config.app_name, smtp_config.from)
                .parse()
                .map_err(|e| anyhow!("Invalid from address: {}", e))?,
        )
        .reply_to(
            format!("{} <{}>", smtp_config.app_name, smtp_config.from)
                .parse()
                .map_err(|e| anyhow!("Invalid reply-to address: {}", e))?,
        )
        .to(user.email.parse().map_err(|e| anyhow!("Invalid to address: {}", e))?)
        .subject(&mail.subject)
        .header(ContentType::TEXT_HTML)
        .body(mail.body.clone())
        .map_err(|e| anyhow!("Failed to build email: {}", e))?;

    // Create SMTP credentials
    let creds = Credentials::new(smtp_config.user.clone(), smtp_config.password.clone());

    // Build SMTP transport based on encryption type
    let mailer = match smtp_config.encryption.to_lowercase().as_str() {
        "tls" | "starttls" => SmtpTransport::starttls_relay(&smtp_config.host)
            .map_err(|e| anyhow!("Failed to create SMTP transport: {}", e))?
            .credentials(creds)
            .port(smtp_config.port)
            .timeout(Some(Duration::from_secs(30)))
            .build(),
        "ssl" => SmtpTransport::relay(&smtp_config.host)
            .map_err(|e| anyhow!("Failed to create SMTP transport: {}", e))?
            .credentials(creds)
            .port(smtp_config.port)
            .timeout(Some(Duration::from_secs(30)))
            .build(),
        _ => {
            return Err(anyhow!(
                "Invalid SMTP encryption type: {}",
                smtp_config.encryption
            ));
        }
    };

    // Send the email
    mailer
        .send(&email)
        .map_err(|e| anyhow!("Failed to send email: {}", e))?;

    Ok(())
}

