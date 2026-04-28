use anyhow::{Context, Result};
use std::env;
use std::path::Path;

#[derive(Clone, Debug)]
pub struct Config {
    pub redis_url: String,
    pub database_url: String,
    pub encryption_key: String,
}

pub fn load_config() -> Result<Config> {
    // Try multiple .env locations in order of preference
    let env_paths = [
        "/app/config/.env",                 // Docker volume mount
        "../backend/storage/config/.env",   // Development (bare metal)
        "../backend/.env",                  // Alternative location
        ".env",                             // Local fallback
    ];

    let mut loaded = false;
    for path in &env_paths {
        let env_path = Path::new(path);
        if env_path.exists() {
            dotenv::from_path(env_path).ok();
            loaded = true;
            break;
        }
    }

    if !loaded {
        dotenv::dotenv().ok();
    }

    let redis_url = env::var("REDIS_URL")
        .or_else(|_| -> Result<String, env::VarError> {
            // Try building from REDIS_HOST/REDIS_PORT and REDIS_PASSWORD
            let host = env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
            let port = env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
            let password = env::var("REDIS_PASSWORD").ok();
            
            if let Some(pass) = password {
                Ok(format!("redis://:{}@{}:{}", pass, host, port))
            } else {
                Ok(format!("redis://{}:{}", host, port))
            }
        })
        .unwrap_or_else(|_| {
            let port = env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
            format!("redis://127.0.0.1:{}", port)
        });

    let database_url = env::var("DATABASE_URL")
        .or_else(|_| build_database_url_from_env())
        .context("DATABASE_URL must be set or DB_* / DATABASE_* variables must be provided")?;

    let encryption_key = env::var("DATABASE_ENCRYPTION_KEY")
        .or_else(|_| env::var("DATABASE_ENCRYPTION"))
        .context("DATABASE_ENCRYPTION_KEY must be set (XChaCha20 key in base64)")?;

    Ok(Config {
        redis_url,
        database_url,
        encryption_key,
    })
}

fn build_database_url_from_env() -> Result<String> {
    // Try DB_* variables first (Docker style)
    let host = env::var("DB_HOST")
        .or_else(|_| env::var("DATABASE_HOST"))
        .context("DB_HOST or DATABASE_HOST not set")?;
    
    let port = env::var("DB_PORT")
        .or_else(|_| env::var("DATABASE_PORT"))
        .unwrap_or_else(|_| "3306".to_string());
    
    let user = env::var("DB_USER")
        .or_else(|_| env::var("DATABASE_USER"))
        .context("DB_USER or DATABASE_USER not set")?;
    
    let pass = env::var("DB_PASS")
        .or_else(|_| env::var("DATABASE_PASSWORD"))
        .context("DB_PASS or DATABASE_PASSWORD not set")?;
    
    let name = env::var("DB_NAME")
        .or_else(|_| env::var("DATABASE_DATABASE"))
        .context("DB_NAME or DATABASE_DATABASE not set")?;

    Ok(format!(
        "mysql://{}:{}@{}:{}/{}",
        user, pass, host, port, name
    ))
}
