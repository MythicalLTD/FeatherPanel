use anyhow::Result;
use sqlx::{MySqlPool, Row};
use std::time::Duration;
use tracing::{info, warn};

use crate::types::{MailListEntry, MailQueueEntry, SmtpConfig, UserEntry};

pub async fn connect(database_url: &str) -> Result<MySqlPool> {
    let max_retries = 10;
    let retry_delay = Duration::from_secs(2);

    for attempt in 1..=max_retries {
        info!("📦 Connecting to MySQL (attempt {}/{})", attempt, max_retries);
        
        match MySqlPool::connect(database_url).await {
            Ok(pool) => {
                info!("✅ MySQL connected successfully");
                return Ok(pool);
            }
            Err(e) => {
                if attempt < max_retries {
                    warn!("⚠️  MySQL connection failed: {}. Retrying in {:?}...", e, retry_delay);
                    tokio::time::sleep(retry_delay).await;
                } else {
                    anyhow::bail!("Failed to connect to MySQL after {} attempts: {}", max_retries, e);
                }
            }
        }
    }

    unreachable!()
}

pub async fn get_mail_queue(pool: &MySqlPool, queue_id: &str) -> Result<Option<MailQueueEntry>> {
    let row = sqlx::query("SELECT subject, body FROM featherpanel_mail_queue WHERE id = ? AND status = 'pending'")
        .bind(queue_id)
        .fetch_optional(pool)
        .await?;

    match row {
        Some(r) => Ok(Some(MailQueueEntry {
            subject: r.try_get("subject")?,
            body: r.try_get("body")?,
        })),
        None => Ok(None),
    }
}

pub async fn get_mail_list(pool: &MySqlPool, queue_id: &str) -> Result<Option<MailListEntry>> {
    let row = sqlx::query("SELECT user_uuid FROM featherpanel_mail_list WHERE queue_id = ? AND deleted = 'false'")
        .bind(queue_id)
        .fetch_optional(pool)
        .await?;

    match row {
        Some(r) => Ok(Some(MailListEntry {
            user_uuid: r.try_get("user_uuid")?,
        })),
        None => Ok(None),
    }
}

pub async fn get_user(pool: &MySqlPool, user_uuid: &str) -> Result<Option<UserEntry>> {
    let row = sqlx::query("SELECT email FROM featherpanel_users WHERE uuid = ?")
        .bind(user_uuid)
        .fetch_optional(pool)
        .await?;

    match row {
        Some(r) => Ok(Some(UserEntry {
            email: r.try_get("email")?,
        })),
        None => Ok(None),
    }
}

pub async fn get_smtp_config(_pool: &MySqlPool) -> Result<SmtpConfig> {
    Ok(SmtpConfig {
        host: crate::settings::get_setting("smtp_host").await.unwrap_or_default(),
        port: crate::settings::get_setting("smtp_port")
            .await
            .and_then(|p| p.parse().ok())
            .unwrap_or(587),
        user: crate::settings::get_setting("smtp_user").await.unwrap_or_default(),
        pass: crate::settings::get_setting("smtp_pass").await.unwrap_or_default(),
        from: crate::settings::get_setting("smtp_from").await.unwrap_or_default(),
        from_name: crate::settings::get_setting("app_name")
            .await
            .unwrap_or_else(|| "FeatherPanel".to_string()),
        encryption: crate::settings::get_setting("smtp_encryption")
            .await
            .unwrap_or_else(|| "tls".to_string()),
        enabled: crate::settings::get_setting("smtp_enabled")
            .await
            .map(|s| s == "true")
            .unwrap_or(false),
    })
}

pub async fn lock_mail(pool: &MySqlPool, queue_id: &str) -> Result<()> {
    sqlx::query("UPDATE featherpanel_mail_queue SET locked = 'true' WHERE id = ?")
        .bind(queue_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn mark_sent(pool: &MySqlPool, queue_id: &str) -> Result<()> {
    sqlx::query("UPDATE featherpanel_mail_queue SET status = 'sent', locked = 'false' WHERE id = ?")
        .bind(queue_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn mark_failed(pool: &MySqlPool, queue_id: &str) -> Result<()> {
    sqlx::query("UPDATE featherpanel_mail_queue SET status = 'failed', locked = 'false' WHERE id = ?")
        .bind(queue_id)
        .execute(pool)
        .await?;
    Ok(())
}
