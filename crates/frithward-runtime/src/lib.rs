//! Runtime primitives for job lifecycle, execution routing, and progress.

/// Job lifecycle states.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum JobState {
    Created,
    Validated,
    Initialized,
    Running,
    Cancelling,
    Completed,
    Cancelled,
    Failed,
}

/// Explicit job state machine. Illegal transitions panic.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct JobStateMachine {
    state: JobState,
}

impl Default for JobStateMachine {
    fn default() -> Self {
        Self::new()
    }
}

impl JobStateMachine {
    pub fn new() -> Self {
        Self {
            state: JobState::Created,
        }
    }

    pub fn state(&self) -> JobState {
        self.state
    }

    pub fn transition(&mut self, next: JobState) {
        let allowed = matches!(
            (self.state, next),
            (JobState::Created, JobState::Validated)
                | (JobState::Validated, JobState::Initialized)
                | (JobState::Initialized, JobState::Running)
                | (JobState::Running, JobState::Completed)
                | (JobState::Running, JobState::Cancelling)
                | (JobState::Running, JobState::Failed)
                | (JobState::Cancelling, JobState::Cancelled)
                | (JobState::Cancelling, JobState::Failed)
        );
        assert!(
            allowed,
            "illegal job transition from {:?} to {:?}",
            self.state, next
        );
        self.state = next;
    }
}

/// Execution target for a job.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExecutionTarget {
    Browser,
    Node,
    Native,
}

/// Routes jobs to an execution target, defaulting to the browser.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ExecutionRouter {
    default: ExecutionTarget,
}

impl Default for ExecutionRouter {
    fn default() -> Self {
        Self {
            default: ExecutionTarget::Browser,
        }
    }
}

impl ExecutionRouter {
    pub fn new(default: ExecutionTarget) -> Self {
        Self { default }
    }

    pub fn route(&self, requested: Option<ExecutionTarget>) -> ExecutionTarget {
        requested.unwrap_or(self.default)
    }

    pub fn default_target(&self) -> ExecutionTarget {
        self.default
    }
}

/// Bounded progress reporter. Fractions stay within [0.0, 1.0].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ProgressReporter {
    current: u64,
    total: u64,
}

impl ProgressReporter {
    pub fn new(total: u64) -> Self {
        Self { current: 0, total }
    }

    pub fn current(&self) -> u64 {
        self.current
    }

    pub fn total(&self) -> u64 {
        self.total
    }

    pub fn fraction(&self) -> f64 {
        if self.total == 0 {
            0.0
        } else {
            (self.current as f64 / self.total as f64).clamp(0.0, 1.0)
        }
    }

    pub fn advance(&mut self, amount: u64) {
        self.current = (self.current + amount).min(self.total);
    }

    pub fn set(&mut self, current: u64) {
        self.current = current.min(self.total);
    }

    pub fn complete(&mut self) {
        self.current = self.total;
    }

    pub fn is_complete(&self) -> bool {
        self.current >= self.total
    }
}

pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

/// Durable job store backed by redb. Each record maps a job id to its state
/// string and the wall-clock time (milliseconds since epoch) of the last update.
///
/// redb has no explicit `close` API; dropping the [`Database`] releases the file
/// lock, which [`RedbJobStore::close`] does explicitly by consuming the store.
pub struct RedbJobStore {
    db: redb::Database,
}

const JOBS: redb::TableDefinition<&str, (&str, u64)> = redb::TableDefinition::new("jobs");

// redb::Error is intentionally large and treated as an opaque error by callers.
#[allow(clippy::result_large_err)]
impl RedbJobStore {
    /// Creates a new store (or truncates an existing one) at `path`.
    pub fn create(path: impl AsRef<std::path::Path>) -> Result<Self, redb::Error> {
        Ok(Self {
            db: redb::Database::create(path)?,
        })
    }

    /// Opens an existing store at `path`.
    pub fn open(path: impl AsRef<std::path::Path>) -> Result<Self, redb::Error> {
        Ok(Self {
            db: redb::Database::open(path)?,
        })
    }

    /// Inserts or updates a job record.
    pub fn upsert(&self, job_id: &str, state: &str, updated_ms: u64) -> Result<(), redb::Error> {
        let write = self.db.begin_write()?;
        {
            let mut table = write.open_table(JOBS)?;
            table.insert(job_id, &(state, updated_ms))?;
        }
        write.commit()?;
        Ok(())
    }

    /// Reads a single job record.
    pub fn get(&self, job_id: &str) -> Result<Option<(String, u64)>, redb::Error> {
        let read = self.db.begin_read()?;
        let table = read.open_table(JOBS)?;
        Ok(table.get(job_id)?.map(|value| {
            let (state, updated_ms) = value.value();
            (state.to_string(), updated_ms)
        }))
    }

    /// Returns every record as `(job_id, state, updated_ms)`, ordered by job id.
    pub fn iterate(&self) -> Result<Vec<(String, String, u64)>, redb::Error> {
        use redb::ReadableTable;
        let read = self.db.begin_read()?;
        let table = read.open_table(JOBS)?;
        let mut rows = Vec::new();
        for entry in table.iter()? {
            let (key, value) = entry?;
            let (state, updated_ms) = value.value();
            rows.push((key.value().to_string(), state.to_string(), updated_ms));
        }
        Ok(rows)
    }

    /// Releases the underlying database file by consuming the store.
    pub fn close(self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn state_machine_happy_path() {
        let mut job = JobStateMachine::new();
        assert_eq!(job.state(), JobState::Created);
        job.transition(JobState::Validated);
        job.transition(JobState::Initialized);
        job.transition(JobState::Running);
        job.transition(JobState::Completed);
        assert_eq!(job.state(), JobState::Completed);
    }

    #[test]
    fn state_machine_cancel_path() {
        let mut job = JobStateMachine::new();
        job.transition(JobState::Validated);
        job.transition(JobState::Initialized);
        job.transition(JobState::Running);
        job.transition(JobState::Cancelling);
        job.transition(JobState::Cancelled);
        assert_eq!(job.state(), JobState::Cancelled);
    }

    #[test]
    fn state_machine_failure_path() {
        let mut job = JobStateMachine::new();
        job.transition(JobState::Validated);
        job.transition(JobState::Initialized);
        job.transition(JobState::Running);
        job.transition(JobState::Failed);
        assert_eq!(job.state(), JobState::Failed);
    }

    #[test]
    #[should_panic(expected = "illegal job transition")]
    fn state_machine_illegal_transition_panics() {
        let mut job = JobStateMachine::new();
        job.transition(JobState::Completed);
    }

    #[test]
    fn router_defaults_to_browser() {
        let router = ExecutionRouter::default();
        assert_eq!(router.default_target(), ExecutionTarget::Browser);
        assert_eq!(router.route(None), ExecutionTarget::Browser);
    }

    #[test]
    fn router_honors_request() {
        let router = ExecutionRouter::default();
        assert_eq!(
            router.route(Some(ExecutionTarget::Node)),
            ExecutionTarget::Node
        );
    }

    #[test]
    fn progress_fraction_is_bounded() {
        let mut reporter = ProgressReporter::new(10);
        assert_eq!(reporter.fraction(), 0.0);
        reporter.advance(4);
        assert_eq!(reporter.fraction(), 0.4);
        reporter.advance(100);
        assert_eq!(reporter.fraction(), 1.0);
        assert!(reporter.is_complete());
    }

    #[test]
    fn progress_set_is_clamped() {
        let mut reporter = ProgressReporter::new(10);
        reporter.set(25);
        assert_eq!(reporter.current(), 10);
        assert_eq!(reporter.fraction(), 1.0);
    }

    #[test]
    fn progress_zero_total_is_zero_fraction() {
        let reporter = ProgressReporter::new(0);
        assert_eq!(reporter.fraction(), 0.0);
        assert!(reporter.is_complete());
    }

    #[test]
    fn version_is_non_empty() {
        assert!(!version().is_empty());
    }

    #[test]
    fn redb_job_store_round_trip() {
        use std::time::{SystemTime, UNIX_EPOCH};

        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::path::PathBuf::from(r"C:\Users\rjian\AppData\Local\Temp\opencode").join(
            format!("frithward-redb-test-{}-{nanos}.db", std::process::id()),
        );

        let store = RedbJobStore::create(&path).unwrap();
        store.upsert("job-1", "running", 100).unwrap();
        store.upsert("job-2", "created", 200).unwrap();
        assert_eq!(store.get("job-1").unwrap(), Some(("running".into(), 100)));
        store.upsert("job-1", "completed", 300).unwrap();
        assert_eq!(store.get("job-1").unwrap(), Some(("completed".into(), 300)));
        assert_eq!(store.get("missing").unwrap(), None);
        assert_eq!(
            store.iterate().unwrap(),
            vec![
                ("job-1".into(), "completed".into(), 300),
                ("job-2".into(), "created".into(), 200),
            ]
        );
        store.close();

        let reopened = RedbJobStore::open(&path).unwrap();
        assert_eq!(
            reopened.get("job-1").unwrap(),
            Some(("completed".into(), 300))
        );
        reopened.close();
        std::fs::remove_file(&path).unwrap();
    }
}
