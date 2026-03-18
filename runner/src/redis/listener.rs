use anyhow::Result;
use futures_util::StreamExt;
use redis::aio::PubSub;
use sqlx::MySqlPool;
use std::time::Duration;
use tracing::{error, info, warn};

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
                            if let Err(e) = processor::process_mail(&pool, &notification.queue_id).await
                            {
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
