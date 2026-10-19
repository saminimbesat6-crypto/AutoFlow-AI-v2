import cron, { ScheduledTask } from 'node-cron';
import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../database/connection';
import { WorkflowRepository } from '../database/repositories/workflow-repository';
import { WorkflowExecutor } from '../engine/executor';
import { Workflow } from '../types/workflow';
import { ExecutionRetentionManager } from '../engine/retention-manager';

export class SchedulerManager {
  private db: DatabaseSync;
  private workflowRepo: WorkflowRepository;
  private executor: WorkflowExecutor;
  private retentionManager: ExecutionRetentionManager;
  private activeJobs: Map<string, ScheduledTask[]> = new Map(); // workflowId -> jobs
  private retentionTask: ScheduledTask | null = null;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
    this.workflowRepo = new WorkflowRepository(this.db);
    this.executor = new WorkflowExecutor(this.db);
    this.retentionManager = new ExecutionRetentionManager(this.db);
    this.initRetentionCron();
  }

  initRetentionCron(): void {
    if (process.env.NODE_ENV === 'test') return;

    if (this.retentionTask) {
      this.retentionTask.stop();
      this.retentionTask = null;
    }

    // Run execution pruning every night at 02:00 AM
    this.retentionTask = cron.schedule('0 2 * * *', () => {
      try {
        const settings = this.retentionManager.getSettings();
        if (settings.enabled) {
          const result = this.retentionManager.prune();
          console.log(`[Retention] Automated prune completed: removed ${result.deletedCount} executions older than ${result.cutoffDate}`);
        }
      } catch (err) {
        console.error('[Retention] Error during scheduled execution pruning:', err);
      }
    });
  }

  destroy(): void {
    if (this.retentionTask) {
      this.retentionTask.stop();
      this.retentionTask = null;
    }
    for (const [id, jobs] of this.activeJobs.entries()) {
      for (const job of jobs) job.stop();
    }
    this.activeJobs.clear();
  }

  registerWorkflowSchedules(workflow: Workflow): void {
    this.unregisterWorkflowSchedules(workflow.id);

    if (!workflow.active) return;

    const jobs: ScheduledTask[] = [];

    for (const node of workflow.nodes) {
      if (node.type === 'schedule-trigger' && !node.disabled) {
        let cronExpr = node.parameters?.rule || '0 * * * *';
        if (cronExpr === 'custom') {
          cronExpr = node.parameters?.customCron || '0 * * * *';
        }

        if (cron.validate(cronExpr)) {
          const task = cron.schedule(cronExpr, async () => {
            console.log(`[Scheduler] Triggering workflow "${workflow.name}" (${workflow.id}) via cron: ${cronExpr}`);
            try {
              await this.executor.execute(workflow, {
                mode: 'schedule',
                startNodeId: node.id
              });
            } catch (err) {
              console.error(`[Scheduler] Execution error in workflow ${workflow.id}:`, err);
            }
          });
          jobs.push(task);
        } else {
          console.warn(`[Scheduler] Invalid cron expression "${cronExpr}" for node ${node.id}`);
        }
      } else if (node.type === 'polling-trigger' && !node.disabled) {
        let cronExpr = '*/5 * * * *';
        const interval = node.parameters?.pollInterval || '5m';
        if (interval === '1m') cronExpr = '* * * * *';
        else if (interval === '5m') cronExpr = '*/5 * * * *';
        else if (interval === '15m') cronExpr = '*/15 * * * *';
        else if (interval === '30m') cronExpr = '*/30 * * * *';
        else if (interval === '1h') cronExpr = '0 * * * *';
        else if (interval === 'custom') cronExpr = node.parameters?.customCron || '*/5 * * * *';

        if (cron.validate(cronExpr)) {
          const task = cron.schedule(cronExpr, async () => {
            console.log(`[Scheduler] Polling trigger for workflow "${workflow.name}" (${workflow.id}) via interval ${interval} (${cronExpr})`);
            try {
              await this.executor.execute(workflow, {
                mode: 'poll',
                startNodeId: node.id
              });
            } catch (err) {
              console.error(`[Scheduler] Polling execution error in workflow ${workflow.id}:`, err);
            }
          });
          jobs.push(task);
        } else {
          console.warn(`[Scheduler] Invalid cron expression "${cronExpr}" for polling node ${node.id}`);
        }
      }
    }

    if (jobs.length > 0) {
      this.activeJobs.set(workflow.id, jobs);
    }
  }

  unregisterWorkflowSchedules(workflowId: string): void {
    const existing = this.activeJobs.get(workflowId);
    if (existing) {
      for (const job of existing) {
        job.stop();
      }
      this.activeJobs.delete(workflowId);
    }
  }

  syncAllActive(): void {
    // Clear all existing
    for (const [id, jobs] of this.activeJobs.entries()) {
      for (const job of jobs) job.stop();
    }
    this.activeJobs.clear();

    const active = this.workflowRepo.getActiveWorkflows();
    for (const wf of active) {
      this.registerWorkflowSchedules(wf);
    }

    this.initRetentionCron();
  }
}
