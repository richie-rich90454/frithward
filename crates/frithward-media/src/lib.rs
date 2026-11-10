//! Media timing and chunked I/O helpers.

/// Returns the frame interval in milliseconds for a frame rate.
/// Returns None for non-positive or non-finite frame rates.
pub fn frame_interval_ms(fps: f64) -> Option<u64> {
    if fps.is_finite() && fps > 0.0 {
        Some((1000.0 / fps).round() as u64)
    } else {
        None
    }
}

/// Validates a duration range and returns its length in milliseconds.
pub fn duration_bounds(start_ms: u64, end_ms: u64) -> Result<u64, &'static str> {
    if end_ms <= start_ms {
        return Err("end_ms must exceed start_ms");
    }
    Ok(end_ms - start_ms)
}

/// Reads `data` in chunks of `chunk_size` bytes, calling `on_chunk` for each.
/// Returns the number of chunks yielded. Panics when `chunk_size` is zero.
pub fn chunked_read<F: FnMut(&[u8])>(data: &[u8], chunk_size: usize, mut on_chunk: F) -> usize {
    assert!(chunk_size > 0, "chunk_size must be positive");
    let mut count = 0;
    for chunk in data.chunks(chunk_size) {
        on_chunk(chunk);
        count += 1;
    }
    count
}

pub fn duration_ms(start_ms: u64, end_ms: u64) -> u64 {
    end_ms.saturating_sub(start_ms)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frame_interval_common_rates() {
        assert_eq!(frame_interval_ms(25.0), Some(40));
        assert_eq!(frame_interval_ms(30.0), Some(33));
        assert_eq!(frame_interval_ms(60.0), Some(17));
    }

    #[test]
    fn frame_interval_rejects_bad_rates() {
        assert_eq!(frame_interval_ms(0.0), None);
        assert_eq!(frame_interval_ms(-1.0), None);
        assert!(frame_interval_ms(f64::NAN).is_none());
        assert!(frame_interval_ms(f64::INFINITY).is_none());
    }

    #[test]
    fn duration_bounds_ok() {
        assert_eq!(duration_bounds(0, 1000), Ok(1000));
    }

    #[test]
    fn duration_bounds_rejects_reversed_or_equal() {
        assert!(duration_bounds(1000, 0).is_err());
        assert!(duration_bounds(500, 500).is_err());
    }

    #[test]
    fn duration_ms_saturates() {
        assert_eq!(duration_ms(1000, 0), 0);
    }

    #[test]
    fn chunked_read_yields_all_bytes() {
        let data = b"abcdef";
        let mut collected = Vec::new();
        let count = chunked_read(data, 2, |chunk| collected.extend_from_slice(chunk));
        assert_eq!(count, 3);
        assert_eq!(collected, data);
    }

    #[test]
    fn chunked_read_empty() {
        let count = chunked_read(b"", 4, |_| {});
        assert_eq!(count, 0);
    }

    #[test]
    #[should_panic(expected = "chunk_size must be positive")]
    fn chunked_read_rejects_zero() {
        chunked_read(b"x", 0, |_| {});
    }
}
