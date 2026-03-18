use anyhow::Result;
use sqlx::MySqlPool;
use tracing::{error, info, warn};

use crate::database;
use crate::mail;
pub mod vm;
pub mod create;

pub use vm::process_vm_task;

pub async fn process_mail(pool: &MySqlPool, queue_id: &str) -> Result<()> {
    info!("🔄 Processing mail queue_id: {}", queue_id);

    // Check MySQL connection health
    if let Err(e) = sqlx::query("SELECT 1").fetch_one(pool).await {
        error!("❌ MySQL connection lost: {}", e);
        anyhow::bail!("MySQL connection lost, will retry on reconnect");
    }

    // Lock the mail
    database::lock_mail(pool, queue_id).await?;

    // Get mail queue entry
    let mail_queue = match database::get_mail_queue(pool, queue_id).await? {
        Some(m) => m,
        None => {
            warn!("⚠️  Mail {} not found or not pending", queue_id);
            return Ok(());
        }
    };

    // Get mail list entry
    let mail_list = match database::get_mail_list(pool, queue_id).await? {
        Some(m) => m,
        None => {
            error!("❌ MailList entry not found for {}", queue_id);
            database::mark_failed(pool, queue_id).await?;
            return Ok(());
        }
    };

    // Get user email
    let user = match database::get_user(pool, &mail_list.user_uuid).await? {
        Some(u) => u,
        None => {
            error!("❌ User not found for uuid {}", mail_list.user_uuid);
            database::mark_failed(pool, queue_id).await?;
            return Ok(());
        }
    };

    // Get SMTP config
    let smtp_config = database::get_smtp_config(pool).await?;
    if !smtp_config.enabled {
        warn!("⚠️  Mail {} not sent because SMTP is disabled", queue_id);
        database::mark_failed(pool, queue_id).await?;
        return Ok(());
    }

    // Send mail with retries
    let max_retries = 3;
    let mut success = false;

    for attempt in 1..=max_retries {
        info!(
            "📧 Attempt {}/{} sending to {}",
            attempt, max_retries, user.email
        );

        match mail::send_email(
            &smtp_config,
            &user.email,
            &mail_queue.subject,
            &mail_queue.body,
        )
        .await
        {
            Ok(_) => {
                success = true;
                info!("✅ Mail sent to {}", user.email);
                break;
            }
            Err(e) => {
                let err_str = e.to_string();
                error!("❌ Attempt {} failed: {}", attempt, err_str);
                
                if err_str.contains("permanent error") || err_str.contains("550") {
                    warn!("⚠️ Fatal SMTP error encountered. Aborting retries for this mail.");
                    break;
                }

                if attempt < max_retries {
                    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                }
            }
        }
    }

    if success {
        database::mark_sent(pool, queue_id).await?;
    } else {
        database::mark_failed(pool, queue_id).await?;
    }

    Ok(())
}
