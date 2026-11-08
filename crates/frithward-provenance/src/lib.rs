pub fn describe_signature(status: &str) -> &'static str {
    match status {
        "valid" => "Signature valid.",
        "invalid" => "Signature invalid; evidence requires review.",
        _ => "No signature manifest found; provenance unavailable.",
    }
}
