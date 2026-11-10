//! Privacy helpers for metadata inspection and text redaction.

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
}
