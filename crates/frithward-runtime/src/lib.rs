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
        assert_eq!(router.route(Some(ExecutionTarget::Node)), ExecutionTarget::Node);
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
}
