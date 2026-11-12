use sqlx::Row;

/// Normalize a CIDR prefix length from the IP pool.
///
/// `0` or out-of-range values fall back to `/24`. A real pool prefix such as
/// `/27` must be preserved — this is what cloud-init `ipconfig0` should get.
pub fn normalize_cidr(raw: Option<i32>) -> i32 {
    match raw {
        Some(v) if (1..=128).contains(&v) => v,
        _ => 24,
    }
}

/// Read `featherpanel_vm_ips.cidr` off a MySQL row.
///
/// The column is `tinyint UNSIGNED`. sqlx will not decode that as `i32`, so
/// `try_get::<i32>("cidr").unwrap_or(24)` always fell back to `/24` even when
/// the pool row stored `27`. Try the types sqlx actually produces, and treat
/// NULL as "use the /24 default".
pub fn cidr_from_mysql_row(row: &sqlx::mysql::MySqlRow) -> i32 {
    normalize_cidr(decode_optional_int(row, "cidr"))
}

/// Prefer a JSON number, but also accept a numeric string from older task meta.
pub fn cidr_from_json(value: &serde_json::Value) -> i32 {
    let raw = value
        .as_i64()
        .map(|v| v as i32)
        .or_else(|| value.as_u64().map(|v| v as i32))
        .or_else(|| value.as_str().and_then(|s| s.parse::<i32>().ok()));
    normalize_cidr(raw)
}

pub fn format_qemu_ipconfig(ip: &str, cidr: i32, gateway: &str) -> String {
    let cidr = normalize_cidr(Some(cidr));
    if gateway.is_empty() {
        format!("ip={}/{}", ip, cidr)
    } else {
        format!("ip={}/{},gw={}", ip, cidr, gateway)
    }
}

pub fn format_lxc_net(bridge: &str, ip: &str, cidr: i32, gateway: &str) -> String {
    let cidr = normalize_cidr(Some(cidr));
    if gateway.is_empty() {
        format!("name=eth0,bridge={},ip={}/{}", bridge, ip, cidr)
    } else {
        format!(
            "name=eth0,bridge={},ip={}/{},gw={}",
            bridge, ip, cidr, gateway
        )
    }
}

fn decode_optional_int(row: &sqlx::mysql::MySqlRow, col: &str) -> Option<i32> {
    // tinyint UNSIGNED (the real column type)
    if let Ok(v) = row.try_get::<Option<u8>, _>(col) {
        return v.map(|x| x as i32);
    }
    if let Ok(v) = row.try_get::<u8, _>(col) {
        return Some(v as i32);
    }
    // After CAST(cidr AS SIGNED), or a wider integer column
    if let Ok(v) = row.try_get::<Option<i64>, _>(col) {
        return v.map(|x| x as i32);
    }
    if let Ok(v) = row.try_get::<i64, _>(col) {
        return Some(v as i32);
    }
    if let Ok(v) = row.try_get::<Option<i32>, _>(col) {
        return v;
    }
    if let Ok(v) = row.try_get::<i32, _>(col) {
        return Some(v);
    }
    if let Ok(v) = row.try_get::<Option<i8>, _>(col) {
        return v.map(|x| x as i32);
    }
    if let Ok(v) = row.try_get::<i8, _>(col) {
        return Some(v as i32);
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn pool_prefix_27_is_kept() {
        assert_eq!(normalize_cidr(Some(27)), 27);
        assert_eq!(
            format_qemu_ipconfig("203.0.113.2", 27, "203.0.113.1"),
            "ip=203.0.113.2/27,gw=203.0.113.1"
        );
        assert_eq!(
            format_lxc_net("vmbr0", "203.0.113.2", 27, "203.0.113.1"),
            "name=eth0,bridge=vmbr0,ip=203.0.113.2/27,gw=203.0.113.1"
        );
    }

    #[test]
    fn missing_or_invalid_cidr_defaults_to_24() {
        assert_eq!(normalize_cidr(None), 24);
        assert_eq!(normalize_cidr(Some(0)), 24);
        assert_eq!(normalize_cidr(Some(-1)), 24);
        assert_eq!(normalize_cidr(Some(129)), 24);
        assert_eq!(
            format_qemu_ipconfig("203.0.113.2", 0, ""),
            "ip=203.0.113.2/24"
        );
    }

    #[test]
    fn json_meta_accepts_number_or_string() {
        assert_eq!(cidr_from_json(&json!(27)), 27);
        assert_eq!(cidr_from_json(&json!("27")), 27);
        assert_eq!(cidr_from_json(&json!(null)), 24);
        assert_eq!(cidr_from_json(&json!({})), 24);
    }
}
