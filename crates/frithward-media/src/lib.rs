pub fn duration_ms(start_ms: u64, end_ms: u64) -> u64 {
    end_ms.saturating_sub(start_ms)
}
