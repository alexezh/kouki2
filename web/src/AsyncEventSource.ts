
/**
 * stores list of callbacks in a weak way
 */
export default class AsyncEventSource<T> {
  private callbackSym: Symbol = Symbol('AsyncCallback');
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
    setTimeout(() => {
      this.invokeWorker(...args);
    }, 0);
  }

  public invokeWithCompletion(onInvoke: () => void, ...args: any[]) {
    // run outside current callstack
    setTimeout(() => {
      this.invokeWorker(...args);
      onInvoke();
    }, 0);
  }
}
