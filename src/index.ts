import * as core from '@actions/core';
import * as github from '@actions/github';

type WorkflowRun = {
  id: number;
  created_at: string;
  workflow_id: number;
};

export async function getWorkflowRuns(token: string): Promise<WorkflowRun[]> {
  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;

  return await octokit.paginate(octokit.rest.actions.listWorkflowRunsForRepo, {
    owner,
    repo,
    per_page: 100,
  }) as WorkflowRun[];
}

export function groupRunsByWorkflow(runs: WorkflowRun[]): Record<string, WorkflowRun[]> {
  return runs.reduce((acc, run) => {
    acc[run.workflow_id] = acc[run.workflow_id] || [];
    acc[run.workflow_id].push(run);
    return acc;
  }, {} as Record<string, WorkflowRun[]>);
}

export function filterRuns(runs: WorkflowRun[], cutoffDate: Date, keepLatest: number): WorkflowRun[] {
  runs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return runs.slice(keepLatest).filter(run => new Date(run.created_at) < cutoffDate);
}

export async function deleteWorkflowRuns(
  token: string,
  runsToDelete: WorkflowRun[],
  dryRun: boolean
): Promise<number> {
  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  let deletions = 0;

  for (const run of runsToDelete) {
    if (dryRun) {
      core.info(`[Dry-Run] Would delete workflow run ID ${run.id} from ${run.created_at}`);
    } else {
      await octokit.rest.actions.deleteWorkflowRun({
        owner,
        repo,
        run_id: run.id,
      });
      core.info(`Deleted workflow run ID ${run.id} from ${run.created_at}`);
      deletions++;
    }
  }
  return deletions;
}

export async function run(): Promise<void> {
  core.warning(
    'yanovation/delete-old-actions is deprecated and no longer maintained. ' +
    'Switch to its successor, yanovian/delete-old-actions: replace ' +
    '`uses: yanovation/delete-old-actions@v1` with `uses: yanovian/delete-old-actions@v1` in your workflow. ' +
    'See https://github.com/yanovian/delete-old-actions for details.'
  );

  try {
    const token: string = core.getInput('token', { required: true });
    const daysAgo: number = parseInt(core.getInput('days-ago', { required: true }));
    const dryRun: boolean = core.getBooleanInput('dry-run') || false;
    const keepLatest: number = parseInt(core.getInput('keep-latest')) || 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    core.info(`Fetching workflow runs older than ${cutoffDate.toISOString()}...`);
    const runs = await getWorkflowRuns(token);
    if (runs.length === 0) {
      core.info('No workflow runs found.');
      return;
    }
    const runsByWorkflow = groupRunsByWorkflow(runs);

    let totalDeletions = 0;
    for (const [workflowId, workflowRuns] of Object.entries(runsByWorkflow)) {
      const runsToDelete = filterRuns(workflowRuns, cutoffDate, keepLatest);
      console.debug(`Checking jobs for workflow: ${workflowId}.`);
      const deletedCount = await deleteWorkflowRuns(token, runsToDelete, dryRun);
      totalDeletions += deletedCount;
    }

    core.info(`Total workflow runs deleted: ${totalDeletions}`);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : 'Unknown error');
  }
}

// Only run the main function when not in a test environment
if (process.env.NODE_ENV !== 'test') {
  run()
    .then(() => {})
    .catch(e => core.setFailed(e));
}
