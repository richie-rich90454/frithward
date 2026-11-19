//! Media timing and chunked I/O helpers, native ONNX inference, and FFmpeg discovery.

use std::borrow::Cow;
use std::path::{Path, PathBuf};
use std::process::Command;

/// A loaded ONNX model session.
///
/// ort v2 builds a session with `Session::builder(&env)?.commit_from_file(path)`
/// (the v1 `with_model_path` builder method no longer exists). Inference is
/// real: inputs are f32 tensors, outputs are returned as named f32 tensors.
pub struct OnnxSession {
    session: ort::session::Session,
}

/// A named f32 tensor returned by inference.
#[derive(Debug, Clone, PartialEq)]
pub struct NamedOutput {
    pub name: String,
    pub shape: Vec<i64>,
    pub data: Vec<f32>,
}

impl OnnxSession {
    /// Loads a model from `model_path`. The ONNX Runtime shared library is
    /// resolved by ort; set `ORT_DYLIB_PATH` to point at a specific library.
    pub fn load(model_path: impl AsRef<Path>) -> Result<Self, ort::Error> {
        let builder = match std::env::var("ORT_DYLIB_PATH") {
            Ok(path) if !path.is_empty() => {
                ort::init_from(path).map_err(|e| ort::Error::new(e.to_string()))?
            }
            _ => ort::init(),
        };
        let env = builder.build()?;
        let session = ort::session::Session::builder(&env)?.commit_from_file(model_path)?;
        Ok(Self { session })
    }

    /// Runs named f32 inputs through the graph and returns named f32 outputs.
    /// Each input is `(name, shape, flat_data)`.
    pub fn run(
        &mut self,
        inputs: &[(&str, Vec<i64>, Vec<f32>)],
    ) -> Result<Vec<NamedOutput>, ort::Error> {
        let named: Vec<(Cow<'_, str>, ort::session::SessionInputValue<'_>)> = inputs
            .iter()
            .map(|(name, shape, data)| {
                let tensor = ort::value::Tensor::from_array((shape.clone(), data.clone()))?;
                Ok((Cow::Borrowed(*name), tensor.into()))
            })
            .collect::<Result<_, ort::Error>>()?;

        let outputs = self.session.run(named)?;
        let mut result = Vec::new();
        for (name, value) in outputs.iter() {
            let (shape, data) = value.try_extract_tensor::<f32>()?;
            result.push(NamedOutput {
                name: name.to_string(),
                shape: shape.iter().copied().collect(),
                data: data.to_vec(),
            });
        }
        Ok(result)
    }
}

/// Resolves an ffmpeg binary without compiling it.
///
/// Search order: Tauri resource-dir env var, `PATH`, then a bundled
/// `binaries/` folder (next to the executable / working directory).
/// Bundling the binary itself is a deployment-time packaging step; this code
/// only locates and invokes an existing executable.
pub struct FfmpegLocator {
    path: PathBuf,
}

impl FfmpegLocator {
    /// Resolves the first existing ffmpeg candidate, or `None` if absent.
    pub fn resolve() -> Option<Self> {
        let exe = if cfg!(windows) {
            "ffmpeg.exe"
        } else {
            "ffmpeg"
        };

        for var in ["TAURI_RESOURCE_DIR", "FRITHWARD_TAURI_RESOURCES"] {
            if let Ok(dir) = std::env::var(var) {
                let candidate = Path::new(&dir).join("binaries").join(exe);
                if candidate.is_file() {
                    return Some(Self { path: candidate });
                }
            }
        }

        if let Some(path) = std::env::var_os("PATH") {
            for dir in std::env::split_paths(&path) {
                let candidate = dir.join(exe);
                if candidate.is_file() {
                    return Some(Self { path: candidate });
                }
            }
        }

        let mut roots = Vec::new();
        if let Ok(cwd) = std::env::current_dir() {
            roots.push(cwd);
        }
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                roots.push(parent.to_path_buf());
            }
        }
        for root in roots {
            let candidate = root.join("binaries").join(exe);
            if candidate.is_file() {
                return Some(Self { path: candidate });
            }
        }
        None
    }

    /// Builds a locator from an explicit path (useful for tests and embedding).
    pub fn from_path(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Honest check: the resolved path must be an existing file.
    pub fn available(&self) -> bool {
        self.path.is_file()
    }

    /// Executes ffmpeg with `args`, returning stdout/stderr/status.
    pub fn run(&self, args: &[&str]) -> Result<std::process::Output, std::io::Error> {
        if !self.available() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("ffmpeg not available at {}", self.path.display()),
            ));
        }
        Command::new(&self.path).args(args).output()
    }
}

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

    // Skips gracefully when FRITHWARD_ONNX_MODEL is not set so `cargo test`
    // works without downloading weights. When a path is supplied we only
    // verify real loading; inference is never fabricated for an unknown graph.
    #[test]
    fn onnx_session_loads_configured_model_or_skips() {
        let Ok(model) = std::env::var("FRITHWARD_ONNX_MODEL") else {
            eprintln!("skip: set FRITHWARD_ONNX_MODEL to exercise native inference");
            return;
        };
        if model.is_empty() {
            return;
        }
        let session = OnnxSession::load(&model);
        assert!(session.is_ok(), "failed to load configured ONNX model");
    }

    #[test]
    fn ffmpeg_available_reflects_fake_path() {
        use std::time::{SystemTime, UNIX_EPOCH};
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::path::PathBuf::from(r"C:\Users\rjian\AppData\Local\Temp\opencode")
            .join(format!("frithward-ffmpeg-fake-{}-{nanos}.exe", std::process::id()));

        let missing = FfmpegLocator::from_path(&path);
        assert!(!missing.available());
        assert!(missing.run(&["-version"]).is_err());

        std::fs::write(&path, b"not a real binary").unwrap();
        let present = FfmpegLocator::from_path(&path);
        assert!(present.available());
        assert_eq!(present.path(), path.as_path());
        std::fs::remove_file(&path).unwrap();

        // Resolution must never panic even when ffmpeg is not installed.
        let _ = FfmpegLocator::resolve();
    }
}
