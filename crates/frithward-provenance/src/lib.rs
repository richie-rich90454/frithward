//! Provenance signature status helpers and local manifest inspection.
//!
//! The native `c2pa` crate resolves to 0.92.x but its `openssl-sys` build
//! script does not complete on this toolchain/environment, so adding it would
//! leave a broken build. Cryptographic verification therefore requires the
//! native crate; [`ManifestVerifier`] only parses manifest JSON locally and
//! always reports `unverified`.

const UNVERIFIED_LIMITATION: &str =
    "Local JSON parse only; cryptographic C2PA verification requires the native c2pa crate.";

/// Report produced by local manifest inspection. Cryptographic validation is
/// deliberately not claimed.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VerificationReport {
    pub status: &'static str,
    pub signer: Option<String>,
    pub limitation: String,
}

/// Parses C2PA-style manifest JSON without performing cryptographic validation.
pub struct ManifestVerifier;

impl ManifestVerifier {
    /// Parses a manifest JSON string and reports the signer identity if present.
    /// The status is always `unverified`.
    pub fn verify_json(json: &str) -> Result<VerificationReport, String> {
        let value: serde_json::Value =
            serde_json::from_str(json).map_err(|err| format!("invalid manifest JSON: {err}"))?;
        let signer = value
            .pointer("/active_manifest/claim_generator")
            .or_else(|| value.pointer("/claim_generator"))
            .or_else(|| value.pointer("/claim_generator_info/0/name"))
            .and_then(|v| v.as_str())
            .map(str::to_string);
        Ok(VerificationReport {
            status: "unverified",
            signer,
            limitation: UNVERIFIED_LIMITATION.to_string(),
        })
    }

    /// Reads a manifest file from disk and inspects it locally.
    pub fn verify_asset(path: impl AsRef<std::path::Path>) -> Result<VerificationReport, String> {
        let path = path.as_ref();
        let bytes = std::fs::read(path)
            .map_err(|err| format!("cannot read manifest {}: {err}", path.display()))?;
        Self::verify_json(&String::from_utf8_lossy(&bytes))
    }
}

/// Manifest signature status.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ManifestStatus {
    Valid,
    Invalid,
    Missing,
}

/// Parses a manifest status string. Unknown or empty strings are Missing.
pub fn parse_manifest_status(status: &str) -> ManifestStatus {
    match status.trim().to_ascii_lowercase().as_str() {
        "valid" => ManifestStatus::Valid,
        "invalid" => ManifestStatus::Invalid,
        _ => ManifestStatus::Missing,
    }
}

/// Human-readable description of a manifest status string.
pub fn describe_signature(status: &str) -> &'static str {
    match parse_manifest_status(status) {
        ManifestStatus::Valid => "Signature valid.",
        ManifestStatus::Invalid => "Signature invalid; evidence requires review.",
        ManifestStatus::Missing => "No signature manifest found; provenance unavailable.",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_valid() {
        assert_eq!(parse_manifest_status("valid"), ManifestStatus::Valid);
        assert_eq!(parse_manifest_status(" VALID "), ManifestStatus::Valid);
    }

    #[test]
    fn parse_invalid() {
        assert_eq!(parse_manifest_status("invalid"), ManifestStatus::Invalid);
        assert_eq!(parse_manifest_status("Invalid"), ManifestStatus::Invalid);
    }

    #[test]
    fn parse_missing() {
        assert_eq!(parse_manifest_status(""), ManifestStatus::Missing);
        assert_eq!(parse_manifest_status("unknown"), ManifestStatus::Missing);
    }

    #[test]
    fn describe_matches_parse() {
        assert_eq!(describe_signature("valid"), "Signature valid.");
        assert_eq!(
            describe_signature("invalid"),
            "Signature invalid; evidence requires review."
        );
        assert_eq!(
            describe_signature("missing"),
            "No signature manifest found; provenance unavailable."
        );
    }

    #[test]
    fn manifest_verifier_reports_unverified_with_signer() {
        let report = ManifestVerifier::verify_json(
            r#"{"active_manifest":{"claim_generator":"ExampleSigner/1.0"}}"#,
        )
        .unwrap();
        assert_eq!(report.status, "unverified");
        assert_eq!(report.signer.as_deref(), Some("ExampleSigner/1.0"));
        assert!(report.limitation.contains("cryptographic"));
        assert!(ManifestVerifier::verify_json("not json").is_err());
    }

    #[test]
    fn manifest_verifier_reads_real_file() {
        use std::time::{SystemTime, UNIX_EPOCH};
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::path::PathBuf::from(r"C:\Users\rjian\AppData\Local\Temp\opencode").join(
            format!("frithward-c2pa-{}-{nanos}.json", std::process::id()),
        );
        std::fs::write(&path, r#"{"claim_generator":"FileSigner/2.0"}"#).unwrap();
        let report = ManifestVerifier::verify_asset(&path).unwrap();
        assert_eq!(report.status, "unverified");
        assert_eq!(report.signer.as_deref(), Some("FileSigner/2.0"));
        std::fs::remove_file(&path).unwrap();
    }
}
