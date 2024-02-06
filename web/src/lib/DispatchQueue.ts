type QueueItem = () => Promise<void>;
export class DispatchQueue {
  private items: QueueItem[] = [];
  private processing: boolean = false;
  private readonly onEmpty: (() => void) | null = null;

  public constructor(onEmpty: (() => void) | null = null) {
    this.onEmpty = onEmpty;
  }

  public push(func: QueueItem) {
    this.items.push(func);
    this.tryRun();
  }

  private tryRun() {
    if (this.processing || this.items.length === 0) {
      if (this.onEmpty) {
        this.onEmpty();
      }
      return;
    }
    this.processing = true;
    setTimeout(async () => {
      let item = this.items.shift();
      await item!();

      this.processing = false;
      this.tryRun();
    });
  }
}

export class BatchDelayedQueue<T> {
  private batch: T[] = [];
  private timeoutMs: number;
  private func: (batch: T[]) => Promise<void>;
  private pending: boolean = false;

  public constructor(timeoutMs: number, func: (batch: T[]) => Promise<void>) {
    this.timeoutMs = timeoutMs;
    this.func = func;
  }

  public queue(items: T[] | T) {
    if (Array.isArray(items)) {
      this.batch.push(...items);
    } else {
      this.batch.push(items);
    }
    if (this.pending) {
      return;
    }
    this.pending = true;
    setTimeout(async () => {
      await this.func(this.batch);
      this.batch = [];
      this.pending = false;
    }, this.timeoutMs);
  }
}