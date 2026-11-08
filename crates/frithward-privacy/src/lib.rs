pub fn has_location_metadata(entries: &[(&str, &str)]) -> bool {
    entries.iter().any(|(key, _)| {
        let lowered = key.to_lowercase();
        lowered.contains("gps") || lowered.contains("location")
    })
}
