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

    let redis_url = redis_url_from_env(|key| env::var(key).ok());

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

/// Same reading as the panel backend (`App::env`): surrounding spaces, tabs and quotes are
/// ignored and an empty value counts as unset.
fn clean_env_value(value: Option<String>) -> Option<String> {
    value
        .map(|v| v.trim_matches(|c| c == ' ' || c == '\t' || c == '"' || c == '\'').to_string())
        .filter(|v| !v.is_empty())
}

/// Redis connection URL. `REDIS_URL` wins when set; otherwise it is built from `REDIS_HOST`
/// (default 127.0.0.1), `REDIS_PORT` (default 6379) and `REDIS_PASSWORD`, like the backend does.
pub(crate) fn redis_url_from_env<F>(get: F) -> String
where
    F: Fn(&str) -> Option<String>,
{
    if let Some(url) = clean_env_value(get("REDIS_URL")) {
        return url;
    }

    let host = clean_env_value(get("REDIS_HOST")).unwrap_or_else(|| "127.0.0.1".to_string());
    let host = if host.contains(':') && !host.starts_with('[') {
        format!("[{}]", host) // IPv6 literal
    } else {
        host
    };

    let port = match clean_env_value(get("REDIS_PORT")) {
        Some(raw) => match raw.parse::<u16>() {
            Ok(port) if port > 0 => port,
            _ => {
                tracing::warn!("REDIS_PORT {:?} is not a valid port, using 6379", raw);
                6379
            }
        },
        None => 6379,
    };

    match clean_env_value(get("REDIS_PASSWORD")) {
        Some(pass) => format!("redis://:{}@{}:{}", urlencoding::encode(&pass), host, port),
        None => format!("redis://{}:{}", host, port),
    }
}

#[cfg(test)]
mod tests {
    use super::redis_url_from_env;
    use std::collections::HashMap;

    fn url(vars: &[(&str, &str)]) -> String {
        let map: HashMap<String, String> = vars.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect();
        redis_url_from_env(|key| map.get(key).cloned())
    }

    #[test]
    fn defaults_to_local_redis() {
        assert_eq!(url(&[]), "redis://127.0.0.1:6379");
    }

    #[test]
    fn honours_redis_port() {
        assert_eq!(url(&[("REDIS_HOST", "redis"), ("REDIS_PORT", "36461")]), "redis://redis:36461");
        assert_eq!(
            url(&[("REDIS_HOST", "10.0.0.5"), ("REDIS_PORT", "6380"), ("REDIS_PASSWORD", "secret")]),
            "redis://:secret@10.0.0.5:6380"
        );
    }

    #[test]
    fn invalid_port_falls_back_to_default() {
        assert_eq!(url(&[("REDIS_PORT", "not-a-port")]), "redis://127.0.0.1:6379");
        assert_eq!(url(&[("REDIS_PORT", "0")]), "redis://127.0.0.1:6379");
    }

    #[test]
    fn reads_values_like_the_backend() {
        assert_eq!(
            url(&[("REDIS_HOST", " \"cache\" "), ("REDIS_PORT", "'6390'"), ("REDIS_PASSWORD", "")]),
            "redis://cache:6390"
        );
    }

    #[test]
    fn encodes_the_password() {
        assert_eq!(url(&[("REDIS_PASSWORD", "p@ss:w/rd#1")]), "redis://:p%40ss%3Aw%2Frd%231@127.0.0.1:6379");
    }

    #[test]
    fn brackets_ipv6_hosts() {
        assert_eq!(url(&[("REDIS_HOST", "::1"), ("REDIS_PORT", "6390")]), "redis://[::1]:6390");
    }

    #[test]
    fn redis_url_takes_precedence() {
        assert_eq!(
            url(&[("REDIS_URL", "redis://:x@other:7000"), ("REDIS_HOST", "redis"), ("REDIS_PORT", "6380")]),
            "redis://:x@other:7000"
        );
    }
}
