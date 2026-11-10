use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "frithward", version, about = "Frithward media safety CLI.")]
struct Arguments {
    #[arg(short, long, default_value = "browser")]
    execution: String,
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Check a URL or text for safety signals.
    Check {
        #[command(subcommand)]
        target: CheckTarget,
    },
    /// Protect voice or face media.
    Protect {
        #[command(subcommand)]
        target: ProtectTarget,
    },
    /// Verify an asset's provenance manifest.
    Verify {
        /// Asset identifier.
        asset: String,
    },
    /// Inspect comma-separated metadata key=value pairs.
    Inspect {
        /// Metadata pairs, for example "width=100,height=50,gps_lat=1.0".
        metadata: String,
    },
}

#[derive(Subcommand)]
enum CheckTarget {
    /// Check a URL.
    Url {
        /// URL to inspect.
        url: String,
    },
    /// Check text.
    Text {
        /// Text to inspect.
        text: String,
    },
}

#[derive(Subcommand)]
enum ProtectTarget {
    /// Protect voice audio.
    Voice {
        /// Audio asset identifier.
        asset: String,
    },
    /// Protect a face in an image.
    Face {
        /// Image asset identifier.
        asset: String,
    },
}

#[derive(Debug, PartialEq, Eq)]
struct UrlInfo {
    scheme: String,
    host: String,
}

fn parse_url(url: &str) -> Result<UrlInfo, String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("URL required.".to_string());
    }
    let (scheme, rest) = trimmed
        .split_once("://")
        .ok_or_else(|| "URL must include a scheme (http:// or https://).".to_string())?;
    let scheme = scheme.to_ascii_lowercase();
    if scheme != "http" && scheme != "https" {
        return Err(format!("Unsupported URL scheme: {scheme}"));
    }
    let host = rest.split('/').next().unwrap_or("").to_string();
    if host.is_empty() {
        return Err("URL must include a host.".to_string());
    }
    Ok(UrlInfo { scheme, host })
}

#[derive(Debug, PartialEq, Eq)]
struct TextCheck {
    characters: usize,
    words: usize,
    indicators: Vec<String>,
}

fn check_text(text: &str) -> Result<TextCheck, String> {
    if text.trim().is_empty() {
        return Err("Text required.".to_string());
    }
    let lowered = text.to_lowercase();
    let mut indicators = Vec::new();
    for term in [
        "password",
        "verify your account",
        "urgent",
        "wire transfer",
        "gift card",
    ] {
        if lowered.contains(term) {
            indicators.push(term.to_string());
        }
    }
    Ok(TextCheck {
        characters: text.chars().count(),
        words: text.split_whitespace().count(),
        indicators,
    })
}

#[derive(Debug, PartialEq, Eq)]
struct ProtectReport {
    kind: String,
    asset: String,
    performed: bool,
}

fn protect_plan(kind: &str, asset: &str) -> Result<ProtectReport, String> {
    if asset.trim().is_empty() {
        return Err("Asset id required.".to_string());
    }
    Ok(ProtectReport {
        kind: kind.to_string(),
        asset: asset.to_string(),
        performed: false,
    })
}

#[derive(Debug, PartialEq, Eq)]
struct VerifyReport {
    asset: String,
    status: &'static str,
    detail: &'static str,
}

fn verify_asset(asset: &str) -> Result<VerifyReport, String> {
    if asset.trim().is_empty() {
        return Err("Asset id required.".to_string());
    }
    Ok(VerifyReport {
        asset: asset.to_string(),
        status: "missing",
        detail: "No manifest was supplied; signature cannot be verified.",
    })
}

#[derive(Debug, PartialEq, Eq)]
struct MetadataReport {
    count: usize,
    location_keys: Vec<String>,
}

fn inspect_metadata(metadata: &str) -> Result<MetadataReport, String> {
    if metadata.trim().is_empty() {
        return Err("Metadata required.".to_string());
    }
    let mut location_keys = Vec::new();
    let mut count = 0;
    for pair in metadata.split(',') {
        let pair = pair.trim();
        if pair.is_empty() {
            continue;
        }
        let key = pair.split_once('=').map(|(k, _)| k).unwrap_or(pair);
        count += 1;
        let lowered = key.to_lowercase();
        if lowered.contains("gps") || lowered.contains("location") {
            location_keys.push(key.to_string());
        }
    }
    if count == 0 {
        return Err("Metadata must contain key=value pairs.".to_string());
    }
    Ok(MetadataReport { count, location_keys })
}

fn parse_execution(value: &str) -> Result<&'static str, String> {
    match value {
        "browser" => Ok("browser"),
        "node" => Ok("node"),
        "native" => Ok("native"),
        other => Err(format!("Unsupported execution target: {other}")),
    }
}

fn main() {
    let arguments = Arguments::parse();
    if let Err(err) = parse_execution(&arguments.execution) {
        eprintln!("error: {err}");
        std::process::exit(1);
    }
    println!("execution={}", arguments.execution);
    match arguments.command {
        Command::Check { target } => match target {
            CheckTarget::Url { url } => match parse_url(&url) {
                Ok(info) => println!(
                    "check url scheme={} host={} note=parsed only; no network request or classifier run",
                    info.scheme, info.host
                ),
                Err(err) => {
                    eprintln!("error: {err}");
                    std::process::exit(1);
                }
            },
            CheckTarget::Text { text } => match check_text(&text) {
                Ok(check) => println!(
                    "check text characters={} words={} indicators={:?} note=local heuristic only",
                    check.characters, check.words, check.indicators
                ),
                Err(err) => {
                    eprintln!("error: {err}");
                    std::process::exit(1);
                }
            },
        },
        Command::Protect { target } => {
            let (kind, asset) = match target {
                ProtectTarget::Voice { asset } => ("voice", asset),
                ProtectTarget::Face { asset } => ("face", asset),
            };
            match protect_plan(kind, &asset) {
                Ok(report) => println!(
                    "protect kind={} asset={} performed={} note=no protection model bundled",
                    report.kind, report.asset, report.performed
                ),
                Err(err) => {
                    eprintln!("error: {err}");
                    std::process::exit(1);
                }
            }
        }
        Command::Verify { asset } => match verify_asset(&asset) {
            Ok(report) => println!(
                "verify asset={} status={} detail={}",
                report.asset, report.status, report.detail
            ),
            Err(err) => {
                eprintln!("error: {err}");
                std::process::exit(1);
            }
        },
        Command::Inspect { metadata } => match inspect_metadata(&metadata) {
            Ok(report) => println!(
                "inspect count={} location_keys={:?} note=parsed locally; no metadata removed",
                report.count, report.location_keys
            ),
            Err(err) => {
                eprintln!("error: {err}");
                std::process::exit(1);
            }
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn url_parses_http() {
        let info = parse_url("http://example.com/path").unwrap();
        assert_eq!(info.scheme, "http");
        assert_eq!(info.host, "example.com");
    }

    #[test]
    fn url_rejects_missing_scheme() {
        assert!(parse_url("example.com").is_err());
    }

    #[test]
    fn url_rejects_unsupported_scheme() {
        assert!(parse_url("ftp://example.com").is_err());
    }

    #[test]
    fn text_check_flags_terms() {
        let check = check_text("please verify your account").unwrap();
        assert!(check
            .indicators
            .contains(&"verify your account".to_string()));
    }

    #[test]
    fn text_check_empty() {
        assert!(check_text("   ").is_err());
    }

    #[test]
    fn protect_reports_not_performed() {
        let report = protect_plan("voice", "a1").unwrap();
        assert!(!report.performed);
    }

    #[test]
    fn protect_rejects_empty_asset() {
        assert!(protect_plan("face", "  ").is_err());
    }

    #[test]
    fn verify_reports_missing() {
        let report = verify_asset("a1").unwrap();
        assert_eq!(report.status, "missing");
    }

    #[test]
    fn inspect_flags_location() {
        let report = inspect_metadata("width=100,gps_lat=1.0").unwrap();
        assert_eq!(report.count, 2);
        assert_eq!(report.location_keys, vec!["gps_lat".to_string()]);
    }

    #[test]
    fn inspect_rejects_empty() {
        assert!(inspect_metadata("").is_err());
    }

    #[test]
    fn execution_default_is_valid() {
        assert_eq!(parse_execution("browser").unwrap(), "browser");
        assert!(parse_execution("bogus").is_err());
    }
}
