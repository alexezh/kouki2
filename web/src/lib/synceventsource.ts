
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

export class SimpleEventSource {
  private handlers: { id: number, func: () => void }[] = [];

  public add(func: () => void) {
    let id = (this.handlers.length > 0) ? this.handlers[this.handlers.length - 1].id + 1 : 1;
    this.handlers.push({ id: id, func: func });
    return id;
  }

  public remove(id: number) {
    this.handlers = this.handlers.filter(x => x.id !== id);
  }

  public invoke() {
    for (let x of this.handlers) {
      x.func();
    }
  }
}