/**
 * stores list of callbacks in a weak way
 */
export default class SyncEventSource<T> {
  private callbackSym: Symbol = Symbol('Callback');
  private handlers: (WeakRef<any> | undefined)[] = [];
  private gaps: number = 0;

  // obj is only used to avoid circular references
  public add(obj: any, func: (val: T) => void) {
    // to avoid references, store func on a symbol
    // @ts-ignore
    obj[this.callbackSym] = func;
    if (this.gaps > 0) {
      let idx = this.handlers.findIndex(x => x === undefined);
      this.handlers[idx] = new WeakRef<any>(obj);
    } else {
      this.handlers.push(new WeakRef<any>(obj));
    }
  }

  private invokeWorker(...args: any[]) {
    for (let i = 0; i < this.handlers.length; i++) {
      let weakHandler = this.handlers[i] as WeakRef<any>;
      if (weakHandler !== undefined) {
        let obj = weakHandler.deref() as any;
        if (obj) {
          // @ts-ignore
          obj[this.callbackSym](...args);
        } else {
          // mark entry as empty
          this.gaps++;
          this.handlers[i] = undefined;
        }
      }
    }
  }

  public invoke(...args: any[]) {
    // run outside current callstack
    this.invokeWorker(...args);
  }
}

export class SimpleEventSource<T = void> {
  private handlers: { id: number, func: (arg: T) => void }[] = [];

  public add(func: (arg: T) => void) {
    let id = (this.handlers.length > 0) ? this.handlers[this.handlers.length - 1].id + 1 : 1;
    this.handlers.push({ id: id, func: func });
    return id;
  }

  public remove(id: number) {
    this.handlers = this.handlers.filter(x => x.id !== id);
  }

  public invoke(arg1: T) {
    for (let x of this.handlers) {
      x.func(arg1);
    }
  }
}

export interface IEventHandler<T1> {
  invoke(arg: T1): void;
}

/**
 * manages array of weak references
 */
export class WeakEventSource<T1> {
  private handlers: WeakRef<IEventHandler<T1>>[] = [];
  private gaps = 0;

  public add(handler: IEventHandler<T1>): void {
    if (this.gaps > 0) {
      for (let i = 0; i < this.handlers.length; i++) {
        if (!this.handlers[i].deref()) {
          this.handlers[i] = new WeakRef<IEventHandler<T1>>(handler);
          this.gaps--;
          return;
        }
      }
    } else {
      this.handlers.push(new WeakRef<IEventHandler<T1>>(handler));
    }
  }

  public invoke(arg: T1) {
    for (let x of this.handlers) {
      let handler = x.deref();
      if (handler) {
        handler.invoke(arg);
      } else {
        this.gaps++;
      }
    }
  }
}