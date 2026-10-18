import { v4 as uuidv4 } from 'uuid';
import { DataItem, ExecutionMode, ExecutionRecord, Workflow } from '../types/workflow';
import { WorkflowExecutor } from '../engine/executor';
import { WorkflowRepository } from '../database/repositories/workflow-repository';

export interface ExecutionJob {
  id: string;
  workflowId: string;
  executionId: string;
  mode: ExecutionMode;
  initialData?: DataItem[];
  priority?: number; // 0 = normal, 1 = high, 2 = urgent
  enqueuedAt: string;
  startedAt?: string;
  finishedAt?: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

export interface QueueStats {
  mode: 'embedded' | 'redis';
  concurrency: number;
  activeCount: number;
  waitingCount: number;
  completedCount: number;
  failedCount: number;
  isPaused: boolean;
}

export class ExecutionQueueManager {
  private static instance: ExecutionQueueManager;
  private mode: 'embedded' | 'redis' = 'embedded';
  private maxConcurrency: number;
  private waitingQueue: ExecutionJob[] = [];
  private activeJobs: Map<string, ExecutionJob> = new Map();
  private completedCount = 0;
  private failedCount = 0;
  private isPaused = false;
  private executor?: WorkflowExecutor;
  private workflowRepo?: WorkflowRepository;
  private completionListeners: Map<string, Array<(result: ExecutionRecord) => void>> = new Map();

  private constructor() {
    this.maxConcurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
    if (process.env.QUEUE_MODE === 'redis') {
      this.mode = 'redis';
    }
  }

  static getInstance(): ExecutionQueueManager {
    if (!ExecutionQueueManager.instance) {
      ExecutionQueueManager.instance = new ExecutionQueueManager();
    }
    return ExecutionQueueManager.instance;
  }

  init(executor: WorkflowExecutor, workflowRepo: WorkflowRepository): void {
    this.executor = executor;
    this.workflowRepo = workflowRepo;
  }

  setConcurrency(limit: number): void {
    if (limit > 0) {
      this.maxConcurrency = limit;
      this.drain();
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
    this.drain();
  }

  clearWaitingQueue(): number {
    const cleared = this.waitingQueue.length;
    this.waitingQueue = [];
    return cleared;
  }

  getStats(): QueueStats {
    return {
      mode: this.mode,
      concurrency: this.maxConcurrency,
      activeCount: this.activeJobs.size,
      waitingCount: this.waitingQueue.length,
      completedCount: this.completedCount,
      failedCount: this.failedCount,
      isPaused: this.isPaused
    };
  }

  /**
   * Enqueues a workflow for asynchronous worker execution
   */
  async enqueue(
    workflowId: string,
    options: {
      mode?: ExecutionMode;
      initialData?: DataItem[];
      priority?: number;
    } = {}
  ): Promise<ExecutionJob> {
    const job: ExecutionJob = {
      id: uuidv4(),
      workflowId,
      executionId: uuidv4(),
      mode: options.mode || 'manual',
      initialData: options.initialData,
      priority: options.priority || 0,
      enqueuedAt: new Date().toISOString(),
      status: 'waiting'
    };

    // Priority sorting: higher priority jobs come first
    if (job.priority && job.priority > 0) {
      const insertIdx = this.waitingQueue.findIndex((j) => (j.priority || 0) < job.priority!);
      if (insertIdx !== -1) {
        this.waitingQueue.splice(insertIdx, 0, job);
      } else {
        this.waitingQueue.push(job);
      }
    } else {
      this.waitingQueue.push(job);
    }

    // Trigger queue drain in background
    setImmediate(() => this.drain());
    return job;
  }

  /**
   * Waits for a specific queued job to finish execution
   */
  waitForCompletion(jobId: string, timeoutMs = 60000): Promise<ExecutionRecord> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for queued execution job ${jobId} after ${timeoutMs}ms`));
      }, timeoutMs);

      const listeners = this.completionListeners.get(jobId) || [];
      listeners.push((record: ExecutionRecord) => {
        clearTimeout(timer);
        resolve(record);
      });
      this.completionListeners.set(jobId, listeners);
    });
  }

  /**
   * Worker drain loop: dispatches waiting jobs up to maxConcurrency
   */
  private async drain(): Promise<void> {
    if (this.isPaused || !this.executor || !this.workflowRepo) return;

    while (this.activeJobs.size < this.maxConcurrency && this.waitingQueue.length > 0) {
      const job = this.waitingQueue.shift()!;
      job.status = 'active';
      job.startedAt = new Date().toISOString();
      this.activeJobs.set(job.id, job);

      this.executeJob(job).catch((err) => {
        console.error(`[QueueManager] Worker job ${job.id} uncaught error:`, err);
      });
    }
  }

  private async executeJob(job: ExecutionJob): Promise<void> {
    try {
      const workflow = this.workflowRepo!.getById(job.workflowId);
      if (!workflow) {
        throw new Error(`Workflow with ID "${job.workflowId}" not found for queued job.`);
      }

      const executionRecord = await this.executor!.execute(workflow, {
        mode: job.mode,
        initialData: job.initialData,
        saveExecution: true
      });

      job.status = executionRecord.status === 'error' ? 'failed' : 'completed';
      job.finishedAt = new Date().toISOString();

      if (executionRecord.status === 'error') {
        this.failedCount++;
        job.error = executionRecord.errorMessage;
      } else {
        this.completedCount++;
      }

      // Notify any listeners waiting for this job
      const listeners = this.completionListeners.get(job.id);
      if (listeners) {
        for (const cb of listeners) {
          try { cb(executionRecord); } catch {}
        }
        this.completionListeners.delete(job.id);
      }
    } catch (err: any) {
      job.status = 'failed';
      job.error = err.message || String(err);
      job.finishedAt = new Date().toISOString();
      this.failedCount++;
    } finally {
      this.activeJobs.delete(job.id);
      // Trigger drain to pull next job from queue
      setImmediate(() => this.drain());
    }
  }
}
