//! Provenance signature status helpers.

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
}
