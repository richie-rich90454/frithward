//! Privacy helpers for metadata inspection, text redaction, local safety
//! heuristics, and SHA-256 based evidence hashing.

use sha2::{Digest, Sha256};
use std::io::Write;
use std::path::Path;

/// Severity of a local heuristic finding.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Severity {
    Low,
    Medium,
    High,
}

impl Severity {
    pub fn as_str(self) -> &'static str {
        match self {
            Severity::Low => "low",
            Severity::Medium => "medium",
            Severity::High => "high",
        }
    }
}

/// A single locally-derived finding. No network or ML model is involved.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Finding {
    pub label: String,
    pub severity: Severity,
    pub detail: String,
}

/// Structured result of local URL heuristics.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UrlFindings {
    pub scheme: String,
    pub host: String,
    pub findings: Vec<Finding>,
}

/// Local, deterministic URL heuristics. Parsing and risk signals are computed
/// entirely on the supplied string; no network request is made or implied.
pub fn check_url(url: &str) -> Result<UrlFindings, String> {
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
    let authority = rest.split(['/', '?', '#']).next().unwrap_or("");
    let host = authority
        .rsplit('@')
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    if host.is_empty() {
        return Err("URL must include a host.".to_string());
    }
    let mut findings = Vec::new();
    let mut push = |label: &str, severity: Severity, detail: &str| {
        findings.push(Finding {
            label: label.to_string(),
            severity,
            detail: detail.to_string(),
        });
    };
    if scheme == "http" {
        push(
            "insecure_scheme",
            Severity::Medium,
            "URL uses http, not https",
        );
    }
    if authority.contains('@') {
        push(
            "userinfo_obfuscation",
            Severity::High,
            "authority contains userinfo (@)",
        );
    }
    if host.contains("xn--") {
        push(
            "punycode_host",
            Severity::Medium,
            "host uses punycode/IDN encoding",
        );
    }
    if host.chars().all(|c| c.is_ascii_digit() || c == '.') && host.contains('.') {
        push("ip_literal_host", Severity::Medium, "host is an IP literal");
    }
    if [
        "login", "verify", "secure", "account", "update", "support", "urgent",
    ]
    .iter()
    .any(|word| host.contains(word))
    {
        push(
            "suspicious_host_keyword",
            Severity::Medium,
            "host contains a commonly abused keyword",
        );
    }
    if host.matches('.').count() > 3 {
        push(
            "many_subdomains",
            Severity::Low,
            "host has an unusually deep subdomain chain",
        );
    }
    Ok(UrlFindings {
        scheme,
        host,
        findings,
    })
}

/// Structured result of local text heuristics.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TextFindings {
    pub characters: usize,
    pub words: usize,
    pub findings: Vec<Finding>,
}

/// Local, deterministic text rules. Each matched rule becomes a labelled
/// finding with a severity; no classifier or model is invoked.
pub fn check_text(text: &str) -> Result<TextFindings, String> {
    if text.trim().is_empty() {
        return Err("Text required.".to_string());
    }
    let lowered = text.to_lowercase();
    let rules: [(&str, Severity, &str); 5] = [
        ("password", Severity::High, "requests a password"),
        (
            "verify your account",
            Severity::Medium,
            "asks to verify an account",
        ),
        ("urgent", Severity::Medium, "uses urgency pressure"),
        ("wire transfer", Severity::High, "requests a wire transfer"),
        ("gift card", Severity::High, "requests gift cards"),
    ];
    let findings = rules
        .iter()
        .filter(|(needle, _, _)| lowered.contains(needle))
        .map(|(needle, severity, detail)| Finding {
            label: (*needle).replace(' ', "_"),
            severity: *severity,
            detail: (*detail).to_string(),
        })
        .collect();
    Ok(TextFindings {
        characters: text.chars().count(),
        words: text.split_whitespace().count(),
        findings,
    })
}

/// SHA-256 of `data` as a lowercase hex string.
pub fn hash_bytes(data: &[u8]) -> String {
    format!("{:x}", Sha256::digest(data))
}

/// Writes a redaction manifest of `key -> SHA-256(value)` lines to `path`.
/// Returns the SHA-256 of the manifest body so callers can print a stable hash.
pub fn write_redaction_manifest(
    path: impl AsRef<Path>,
    entries: &[(&str, &str)],
) -> Result<String, std::io::Error> {
    let mut body = String::new();
    for (key, value) in entries {
        body.push_str(&format!("{key}={}\n", hash_bytes(value.as_bytes())));
    }
    let overall = hash_bytes(body.as_bytes());
    let mut file = std::fs::File::create(path)?;
    writeln!(file, "overall={overall}")?;
    file.write_all(body.as_bytes())?;
    Ok(overall)
}

/// Returns true when any metadata key looks like location data.
pub fn has_location_metadata(entries: &[(&str, &str)]) -> bool {
    entries.iter().any(|(key, _)| {
        let lowered = key.to_lowercase();
        lowered.contains("gps") || lowered.contains("location")
    })
}

/// Replaces ASCII case-insensitive occurrences of `terms` with `[REDACTED]`.
/// Terms are matched in the order given; overlapping terms are replaced
/// greedily. Returns the redacted text and the replacement count.
pub fn redact_terms(text: &str, terms: &[&str]) -> (String, usize) {
    let bytes = text.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut count = 0;
    let mut i = 0;
    while i < bytes.len() {
        let mut matched = 0;
        for term in terms {
            if term.is_empty() {
                continue;
            }
            let term_bytes = term.as_bytes();
            if i + term_bytes.len() <= bytes.len()
                && bytes[i..i + term_bytes.len()].eq_ignore_ascii_case(term_bytes)
            {
                matched = term_bytes.len();
                break;
            }
        }
        if matched > 0 {
            out.extend_from_slice(b"[REDACTED]");
            i += matched;
            count += 1;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    (String::from_utf8_lossy(&out).into_owned(), count)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn location_metadata_detection() {
        assert!(has_location_metadata(&[("GPSLatitude", "1")]));
        assert!(has_location_metadata(&[("location", "x")]));
        assert!(!has_location_metadata(&[("width", "1")]));
        assert!(!has_location_metadata(&[]));
    }

    #[test]
    fn redact_terms_is_case_insensitive() {
        let (text, count) = redact_terms("My PASSWORD is secret", &["password"]);
        assert_eq!(text, "My [REDACTED] is secret");
        assert_eq!(count, 1);
    }

    #[test]
    fn redact_terms_counts_multiple() {
        let (text, count) = redact_terms("secret SECRET secret", &["secret"]);
        assert_eq!(text, "[REDACTED] [REDACTED] [REDACTED]");
        assert_eq!(count, 3);
    }

    #[test]
    fn redact_terms_empty_terms() {
        let (text, count) = redact_terms("unchanged", &[]);
        assert_eq!(text, "unchanged");
        assert_eq!(count, 0);
    }

    #[test]
    fn redact_terms_handles_multibyte() {
        let (text, count) = redact_terms("café", &["café"]);
        assert_eq!(text, "[REDACTED]");
        assert_eq!(count, 1);
    }

    #[test]
    fn redact_terms_ignores_empty_term() {
        let (text, count) = redact_terms("keep", &[""]);
        assert_eq!(text, "keep");
        assert_eq!(count, 0);
    }

    #[test]
    fn hash_bytes_matches_known_vector() {
        assert_eq!(
            hash_bytes(b"abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
        assert_eq!(hash_bytes(b""), hash_bytes(b""));
    }

    #[test]
    fn write_redaction_manifest_round_trip() {
        use std::time::{SystemTime, UNIX_EPOCH};
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::path::PathBuf::from(r"C:\Users\rjian\AppData\Local\Temp\opencode").join(
            format!("frithward-manifest-{}-{nanos}.txt", std::process::id()),
        );

        let overall = write_redaction_manifest(&path, &[("gps_lat", "1.0")]).unwrap();
        let contents = std::fs::read_to_string(&path).unwrap();
        assert!(contents.starts_with("overall="));
        assert!(contents.contains(&format!("gps_lat={}", hash_bytes(b"1.0"))));
        assert!(overall.len() == 64);
        std::fs::remove_file(&path).unwrap();
    }

    #[test]
    fn check_url_reports_local_findings() {
        let findings = check_url("http://verify-login.example.com/p").unwrap();
        assert_eq!(findings.scheme, "http");
        assert_eq!(findings.host, "verify-login.example.com");
        let labels: Vec<_> = findings.findings.iter().map(|f| f.label.as_str()).collect();
        assert!(labels.contains(&"insecure_scheme"));
        assert!(labels.contains(&"suspicious_host_keyword"));
        assert!(check_url("ftp://example.com").is_err());
    }

    #[test]
    fn check_text_reports_severity_and_labels() {
        let findings = check_text("URGENT: send your password via wire transfer").unwrap();
        let high: Vec<_> = findings
            .findings
            .iter()
            .filter(|f| f.severity == Severity::High)
            .map(|f| f.label.as_str())
            .collect();
        assert!(high.contains(&"password"));
        assert!(high.contains(&"wire_transfer"));
        assert!(findings
            .findings
            .iter()
            .any(|f| f.label == "urgent" && f.severity == Severity::Medium));
        assert!(check_text(" ").is_err());
    }
}
