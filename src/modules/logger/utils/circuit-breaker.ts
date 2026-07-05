import * as fs from 'fs';
import * as path from 'path';

export enum WriteState {
  DB = 'db',
  FILE = 'file',
  CONSOLE = 'console',
  DISABLED = 'disabled',
}

interface QueuedEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: string;
}

export class CircuitBreaker {
  private state: WriteState = WriteState.DB;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryInterval = 30000;
  private maxRetryInterval = 300000;
  private consecutiveFailures = 0;
  private maxConsecutiveFailures = 5;
  private queue: QueuedEntry[] = [];
  private maxQueueSize = 1000;
  private logsDir: string;
  private onStateChange?: (state: WriteState) => void;

  constructor(
    onStateChange?: (state: WriteState) => void,
  ) {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.onStateChange = onStateChange;
    this.ensureLogsDir();
  }

  private ensureLogsDir(): void {
    if (!fs.existsSync(this.logsDir)) {
      try {
        fs.mkdirSync(this.logsDir, { recursive: true });
      } catch {
        // cannot create logs directory, use console only
        this.transitionTo(WriteState.CONSOLE);
      }
    }
  }

  getState(): WriteState {
    return this.state;
  }

  canWrite(): boolean {
    return this.state !== WriteState.DISABLED;
  }

  enqueue(entry: QueuedEntry): void {
    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift();
    }
    this.queue.push(entry);
  }

  drainQueue(): QueuedEntry[] {
    const items = [...this.queue];
    this.queue = [];
    return items;
  }

  getQueuedCount(): number {
    return this.queue.length;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    if (this.state !== WriteState.DB) {
      this.transitionTo(WriteState.DB);
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  recordFailure(): void {
    this.consecutiveFailures++;
    if (
      this.state === WriteState.DB &&
      this.consecutiveFailures >= this.maxConsecutiveFailures
    ) {
      this.transitionTo(WriteState.FILE);
      this.scheduleRetry();
    } else if (
      this.state === WriteState.FILE &&
      this.consecutiveFailures >= this.maxConsecutiveFailures
    ) {
      this.transitionTo(WriteState.CONSOLE);
      this.scheduleRetry();
    } else if (
      this.state === WriteState.CONSOLE &&
      this.consecutiveFailures >= this.maxConsecutiveFailures * 2
    ) {
      this.transitionTo(WriteState.DISABLED);
    }
  }

  private transitionTo(newState: WriteState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.onStateChange?.(this.state);
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    const delay = Math.min(
      this.retryInterval * Math.pow(2, Math.floor(this.consecutiveFailures / this.maxConsecutiveFailures)),
      this.maxRetryInterval,
    );
    this.retryTimer = setTimeout(() => {
      this.transitionTo(WriteState.DB);
      this.consecutiveFailures = 0;
    }, delay);
  }

  writeToFile(level: string, message: string, data?: string): void {
    try {
      this.ensureLogsDir();
      const timestamp = new Date().toISOString();
      const logEntry = [
        `[${timestamp}] [${level.toUpperCase()}]`,
        message,
        data || '',
        '---',
      ].join('\n') + '\n';

      const logFile = path.join(
        this.logsDir,
        `error-${new Date().toISOString().split('T')[0]}.log`,
      );
      fs.appendFileSync(logFile, logEntry, 'utf-8');
      this.recordSuccess();
    } catch {
      this.recordFailure();
    }
  }

  writeToConsole(level: string, message: string, data?: string): void {
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
    if (level === 'error' || level === 'fatal') {
      console.error(prefix, message, data || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, data || '');
    } else {
      console.log(prefix, message, data || '');
    }
  }

  destroy(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
}
