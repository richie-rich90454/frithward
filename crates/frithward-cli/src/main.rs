use clap::{Parser, Subcommand};
use frithward_privacy::{
    check_text as check_text_local, has_location_metadata, hash_bytes, redact_terms,
};
use frithward_provenance::{describe_signature, parse_manifest_status};
use frithward_runtime::{ExecutionRouter, ExecutionTarget};

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
    /// Check a URL or text for local safety signals.
    Check {
        #[command(subcommand)]
        target: CheckTarget,
    },
    /// Protect voice or face media (experimental planning only).
    Protect {
        #[command(subcommand)]
        target: ProtectTarget,
    },
    /// Verify an asset's provenance manifest file.
    Verify {
        /// Path to a manifest file.
        asset: String,
    },
    /// Inspect metadata stored in a file.
    Inspect {
        #[command(subcommand)]
        target: InspectTarget,
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

#[derive(Subcommand)]
enum InspectTarget {
    /// Inspect metadata key=value lines in a file.
    Metadata {
        /// Path to the metadata file.
        file: String,
    },
}

fn parse_execution(value: &str) -> Result<ExecutionTarget, String> {
    match value {
        "browser" => Ok(ExecutionTarget::Browser),
        "node" => Ok(ExecutionTarget::Node),
        "native" => Ok(ExecutionTarget::Native),
        other => Err(format!("Unsupported execution target: {other}")),
    }
}

fn execution_str(target: ExecutionTarget) -> &'static str {
    match target {
        ExecutionTarget::Browser => "browser",
        ExecutionTarget::Node => "node",
        ExecutionTarget::Native => "native",
    }
}

#[derive(Debug, PartialEq, Eq)]
struct ProtectReport {
    kind: String,
    asset: String,
    target: ExecutionTarget,
}

fn protect_plan(
    kind: &str,
    asset: &str,
    router: &ExecutionRouter,
) -> Result<ProtectReport, String> {
    if asset.trim().is_empty() {
        return Err("Asset id required.".to_string());
    }
    let target = router.route(Some(router.default_target()));
    Ok(ProtectReport {
        kind: kind.to_string(),
        asset: asset.to_string(),
        target,
    })
}

/// Extracts a status string from plain text or a JSON manifest `"status"` field.
fn manifest_status_text(text: &str) -> &str {
    let trimmed = text.trim();
    if !trimmed.is_empty() && !trimmed.contains('{') {
        return trimmed;
    }
    const KEY: &str = "\"status\"";
    if let Some(pos) = trimmed.find(KEY) {
        let after = &trimmed[pos + KEY.len()..];
        if let Some(start) = after.find('"') {
            let after = &after[start + 1..];
            if let Some(end) = after.find('"') {
                return &after[..end];
            }
        }
    }
    trimmed
}

#[derive(Debug, PartialEq, Eq)]
struct VerifyReport {
    asset: String,
    status: frithward_provenance::ManifestStatus,
    detail: &'static str,
}

fn verify_asset_file(path: &str) -> Result<VerifyReport, String> {
    if path.trim().is_empty() {
        return Err("Manifest path required.".to_string());
    }
    let contents = std::fs::read_to_string(path)
        .map_err(|err| format!("cannot read manifest {path}: {err}"))?;
    let status_text = manifest_status_text(&contents);
    let status = parse_manifest_status(status_text);
    Ok(VerifyReport {
        asset: path.to_string(),
        status,
        detail: describe_signature(status_text),
    })
}

#[derive(Debug, PartialEq, Eq)]
struct MetadataReport {
    entries: usize,
    has_location: bool,
    redactions: usize,
    sha256: String,
}

fn inspect_metadata_file(path: &str) -> Result<MetadataReport, String> {
    if path.trim().is_empty() {
        return Err("Metadata file path required.".to_string());
    }
    let bytes = std::fs::read(path).map_err(|err| format!("cannot read {path}: {err}"))?;
    let text = String::from_utf8_lossy(&bytes);
    let entries: Vec<(&str, &str)> = text
        .lines()
        .filter(|line| !line.trim().is_empty())
        .map(|line| match line.split_once('=') {
            Some((key, value)) => (key.trim(), value.trim()),
            None => (line.trim(), ""),
        })
        .collect();
    let has_location = has_location_metadata(&entries);
    let (_redacted, redactions) = redact_terms(&text, &["password", "secret", "token"]);
    Ok(MetadataReport {
        entries: entries.len(),
        has_location,
        redactions,
        sha256: hash_bytes(&bytes),
    })
}

fn main() {
    let arguments = Arguments::parse();
    let requested = match parse_execution(&arguments.execution) {
        Ok(target) => target,
        Err(err) => {
            eprintln!("error: {err}");
            std::process::exit(1);
        }
    };
    let router = ExecutionRouter::new(requested);
    let routed = router.route(None);
    println!(
        "execution requested={} routed={}",
        execution_str(requested),
        execution_str(routed)
    );

    match arguments.command {
        Command::Check { target } => match target {
            CheckTarget::Url { url } => match frithward_privacy::check_url(&url) {
                Ok(result) => {
                    println!(
                        "check url scheme={} host={} findings={} note=local heuristics only; no network request",
                        result.scheme,
                        result.host,
                        result.findings.len()
                    );
                    for finding in &result.findings {
                        println!(
                            "  finding label={} severity={} detail={}",
                            finding.label,
                            finding.severity.as_str(),
                            finding.detail
                        );
                    }
                }
                Err(err) => {
                    eprintln!("error: {err}");
                    std::process::exit(1);
                }
            },
            CheckTarget::Text { text } => match check_text_local(&text) {
                Ok(result) => {
                    println!(
                        "check text characters={} words={} findings={} note=local rules only",
                        result.characters,
                        result.words,
                        result.findings.len()
                    );
                    for finding in &result.findings {
                        println!(
                            "  finding label={} severity={} detail={}",
                            finding.label,
                            finding.severity.as_str(),
                            finding.detail
                        );
                    }
                }
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
            match protect_plan(kind, &asset, &router) {
                Ok(report) => println!(
                    "protect kind={} asset={} experimental=true execution={} decision=routed note=planning only; no model executed",
                    report.kind,
                    report.asset,
                    execution_str(report.target)
                ),
                Err(err) => {
                    eprintln!("error: {err}");
                    std::process::exit(1);
                }
            }
        }
        Command::Verify { asset } => match verify_asset_file(&asset) {
            Ok(report) => println!(
                "verify asset={} status={:?} detail={}",
                report.asset, report.status, report.detail
            ),
            Err(err) => {
                eprintln!("error: {err}");
                std::process::exit(1);
            }
        },
        Command::Inspect { target } => match target {
            InspectTarget::Metadata { file } => match inspect_metadata_file(&file) {
                Ok(report) => println!(
                    "inspect file={} entries={} location_detected={} redactions={} sha256={} note=local file bytes; no metadata removed",
                    file, report.entries, report.has_location, report.redactions, report.sha256
                ),
                Err(err) => {
                    eprintln!("error: {err}");
                    std::process::exit(1);
                }
            },
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_path(name: &str) -> std::path::PathBuf {
        use std::time::{SystemTime, UNIX_EPOCH};
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::path::PathBuf::from(r"C:\Users\rjian\AppData\Local\Temp\opencode").join(format!(
            "frithward-cli-{name}-{}-{nanos}.txt",
            std::process::id()
        ))
    }

    #[test]
    fn execution_routes_through_router() {
        let target = parse_execution("native").unwrap();
        let router = ExecutionRouter::new(target);
        assert_eq!(router.route(None), ExecutionTarget::Native);
        assert!(parse_execution("bogus").is_err());
    }

    #[test]
    fn check_url_uses_privacy_heuristics() {
        let result = frithward_privacy::check_url("http://verify-login.example.com").unwrap();
        assert!(result
            .findings
            .iter()
            .any(|f| f.severity == frithward_privacy::Severity::Medium));
        assert!(frithward_privacy::check_url("example.com").is_err());
    }

    #[test]
    fn check_text_uses_privacy_rules() {
        let result = check_text_local("send your password").unwrap();
        assert!(result.findings.iter().any(|f| f.label == "password"));
        assert!(check_text_local("").is_err());
    }

    #[test]
    fn protect_uses_router_decision() {
        let router = ExecutionRouter::new(ExecutionTarget::Node);
        let report = protect_plan("voice", "asset-1", &router).unwrap();
        assert_eq!(report.target, ExecutionTarget::Node);
        assert!(protect_plan("face", " ", &router).is_err());
    }

    #[test]
    fn verify_reads_real_manifest_file() {
        let path = temp_path("manifest");
        std::fs::write(&path, "{\"status\":\"valid\"}").unwrap();
        let report = verify_asset_file(path.to_str().unwrap()).unwrap();
        assert_eq!(report.status, frithward_provenance::ManifestStatus::Valid);
        std::fs::remove_file(&path).unwrap();
        assert!(verify_asset_file(path.to_str().unwrap()).is_err());
    }

    #[test]
    fn inspect_reads_real_file_and_hashes() {
        let path = temp_path("metadata");
        std::fs::write(&path, "width=100\ngps_lat=1.0\npassword=hunter2").unwrap();
        let report = inspect_metadata_file(path.to_str().unwrap()).unwrap();
        assert_eq!(report.entries, 3);
        assert!(report.has_location);
        assert_eq!(report.redactions, 1);
        assert_eq!(report.sha256.len(), 64);
        assert_eq!(
            report.sha256,
            hash_bytes(std::fs::read(&path).unwrap().as_slice())
        );
        std::fs::remove_file(&path).unwrap();
    }
}
