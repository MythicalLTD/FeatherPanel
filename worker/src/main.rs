mod config;
mod database;
mod mailer;
mod models;

use anyhow::Result;
use colored::Colorize;
use std::time::Duration;
use tokio::time::sleep;
use tracing::{error, info};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into()),
        )
        .init();

    info!("FeatherPanel Mail Worker starting...");

    // Load configuration
    dotenv::dotenv().ok();
    let config = config::Config::from_env()?;

    // Create database pool
    let pool = database::create_pool(&config).await?;
    info!("Database connection established");

    // Main worker loop
    loop {
        match process_mail_queue(&pool, &config).await {
            Ok(_) => {
                // Update timed task success
                if let Err(e) = database::mark_timed_task(
                    &pool,
                    "mail-sender",
                    true,
                    "Mail sender heartbeat",
                )
                .await
                {
                    error!("Failed to update timed task: {}", e);
                }
            }
            Err(e) => {
                error!("Failed to send mail: {}", e);
                // Update timed task failure
                if let Err(err) = database::mark_timed_task(
                    &pool,
                    "mail-sender",
                    false,
                    &e.to_string(),
                )
                .await
                {
                    error!("Failed to update timed task: {}", err);
                }
            }
        }

        // Sleep for configured interval
        sleep(Duration::from_secs(config.worker_interval)).await;
    }
}

async fn process_mail_queue(pool: &sqlx::MySqlPool, config: &config::Config) -> Result<()> {
    // Check if mail is enabled
    let mail_enabled = database::get_setting(pool, "smtp_enabled").await?;
    
    println!("{}", format!("Sending mails: {}", mail_enabled).green());
    
    if mail_enabled != "true" {
        println!("{}", format!("Mail is disabled, skipping mail sending: {}", mail_enabled).red());
        return Ok(());
    }

    println!("{}", "Processing mails".green());

    // Get all pending and unlocked mails from queue
    let mail_queue = database::get_pending_mails(pool).await?;
    
    println!(
        "{}",
        format!("Found {} mails to process", mail_queue.len()).green()
    );

    for mail in mail_queue {
        println!(
            "{}",
            format!("Processing mail: {}", mail.id).green()
        );

        // Lock the mail queue item
        database::update_mail_lock(pool, mail.id, true).await?;

        // Get mail info from mail_list
        let mail_info = match database::get_mail_info(pool, mail.id).await? {
            Some(info) => info,
            None => {
                println!(
                    "{}",
                    format!("MailList entry not found for queue id: {}", mail.id).red()
                );
                database::update_mail_status(pool, mail.id, "failed", false).await?;
                continue;
            }
        };

        println!(
            "{}",
            format!("Found mailInfo: {}", mail_info.id).green()
        );

        // Get user info
        let user_info = match database::get_user_by_uuid(pool, &mail_info.user_uuid).await? {
            Some(user) => user,
            None => {
                error!("Invalid or missing user for mail queue id: {}", mail.id);
                println!(
                    "{}",
                    format!("Invalid or missing user/email for mail queue id: {}", mail.id).red()
                );
                database::update_mail_status(pool, mail.id, "failed", false).await?;
                continue;
            }
        };

        // Validate email
        if user_info.email.is_empty() || !is_valid_email(&user_info.email) {
            error!("Invalid email for mail queue id: {}", mail.id);
            println!(
                "{}",
                format!("Invalid or missing user/email for mail queue id: {}", mail.id).red()
            );
            database::update_mail_status(pool, mail.id, "failed", false).await?;
            continue;
        }

        println!(
            "{}",
            format!("Found userInfo: {}", user_info.email).green()
        );

        // Send the mail
        match mailer::send_mail(pool, &mail, &user_info, config).await {
            Ok(_) => {
                database::update_mail_status(pool, mail.id, "sent", false).await?;
            }
            Err(e) => {
                error!("Failed to send mail {}: {}", mail.id, e);
                database::update_mail_status(pool, mail.id, "failed", false).await?;
            }
        }
    }

    Ok(())
}

fn is_valid_email(email: &str) -> bool {
    email.contains('@') && email.contains('.')
}

