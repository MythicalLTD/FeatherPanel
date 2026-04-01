use anyhow::Result;
use futures_util::StreamExt;
use redis::aio::PubSub;
use sqlx::MySqlPool;
use std::time::Duration;
use tracing::{error, info, warn};

use crate::database;
use crate::processor;
use crate::types::{MailNotification, VmNotification};

pub async fn listen(redis_url: &str, pool: MySqlPool, encryption_key: String) -> Result<()> {
    let retry_delay = Duration::from_secs(5);

    loop {
        info!("📡 Connecting to Redis...");
        
        match connect_and_listen(redis_url, pool.clone(), encryption_key.clone()).await {
            Ok(_) => {
                warn!("⚠️  Redis connection closed unexpectedly, reconnecting in {:?}...", retry_delay);
            }
            Err(e) => {
                error!("❌ Redis connection failed: {}. Reconnecting in {:?}...", e, retry_delay);
            }
        }
        
        tokio::time::sleep(retry_delay).await;
    }
}

async fn connect_and_listen(redis_url: &str, pool: MySqlPool, encryption_key: String) -> Result<()> {
    let client = redis::Client::open(redis_url)?;
    let mut pubsub: PubSub = client.get_async_pubsub().await?;

    recover_pending_mail(&pool).await?;

    pubsub.subscribe("featherpanel:mail:pending").await?;
    pubsub.subscribe("featherpanel:vm:pending").await?;
    info!("✅ Redis connected");
    info!("👂 Listening on channels: featherpanel:mail:pending, featherpanel:vm:pending");

    let mut stream = pubsub.on_message();

    while let Some(msg) = stream.next().await {
        let channel = msg.get_channel_name();
        let payload: String = msg.get_payload()?;
        info!("📬 Received notification on {}: {}", channel, payload);

        if channel == "featherpanel:mail:pending" {
            match serde_json::from_str::<MailNotification>(&payload) {
                Ok(notification) => {
                    tokio::spawn({
                        let pool = pool.clone();
                        async move {
                            if let Err(e) = process_mail_with_timeout(&pool, &notification.queue_id).await {
                                error!(
                                    "❌ Failed to process mail {}: {}",
                                    notification.queue_id, e
                                );
                            }
                        }
                    });
                }
                Err(e) => {
                    warn!("⚠️  Invalid mail payload: {}", e);
                }
            }
        } else if channel == "featherpanel:vm:pending" {
            match serde_json::from_str::<VmNotification>(&payload) {
                Ok(notification) => {
                    let enc_key = encryption_key.clone();
                    tokio::spawn({
                        let pool = pool.clone();
                        async move {
                            if let Err(e) = processor::process_vm_task(&pool, &notification.task_id, &enc_key, false).await
                            {
                                error!(
                                    "❌ Failed to process VM task {}: {}",
                                    notification.task_id, e
                                );
                            }
                        }
                    });
                }
                Err(e) => {
                    warn!("⚠️  Invalid VM payload: {}", e);
                }
            }
        }
    }

    Ok(())
}

async fn recover_pending_mail(pool: &MySqlPool) -> Result<()> {
    let released = database::release_stale_mail_locks(pool).await?;
    if released > 0 {
        warn!(
            "🔓 Released {} stale pending mail lock(s) after runner reconnect",
            released
        );
    }

    let pending_queue_ids = database::get_pending_mail_queue_ids(pool, 500).await?;
    if pending_queue_ids.is_empty() {
        info!("📭 No pending mail to recover");
        return Ok(());
    }

    info!(
        "♻️ Recovering {} pending mail item(s) after runner reconnect",
        pending_queue_ids.len()
    );

    for queue_id in pending_queue_ids {
        let pool = pool.clone();
        tokio::spawn(async move {
            if let Err(e) = process_mail_with_timeout(&pool, &queue_id).await {
                error!("❌ Failed to recover pending mail {}: {}", queue_id, e);
            }
        });
    }

    Ok(())
}

async fn process_mail_with_timeout(pool: &MySqlPool, queue_id: &str) -> Result<()> {
    match tokio::time::timeout(Duration::from_secs(120), processor::process_mail(pool, queue_id)).await {
        Ok(result) => result,
        Err(_) => {
            error!("❌ Mail processing timed out for queue {}", queue_id);
            database::mark_failed(pool, queue_id).await?;
            Ok(())
        }
    }
}
