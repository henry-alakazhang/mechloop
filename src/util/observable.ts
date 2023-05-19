export interface Subscription {
  unsubscribe(): void;
}

/**
 * An observable data stream which can be subscribed to and will notify subscribers when its value changes.
 *
 * Use these to listen to changes in data to know when to update the UI or other things.
 *
 * Updates within an Object should just be handled by an `update()` loop function,
 * but this can help trigger updates efficiently across multiple Objects, especially:
 *  * For more components that don't have an update loop
 *  * To maintain proper propagation even when an Object's main loop is stopped
 */
export class Observable<T> {
  /**
   * The current value of the Observable.
   *
   * Should only be used for one-off logic like click handlers,
   * as otherwise the value won't automatically update.
   */
  public currentValue: T;

  private subscribers: ((newValue: T) => void)[] = [];

  constructor(initialValue: T) {
    this.currentValue = initialValue;
  }

  /**
   * Update the current value by replacing it with a new value.
   */
  next(newValue: T): void {
    this.currentValue = newValue;
    this.subscribers.forEach((callback) => callback(newValue));
  }

  /**
   * Update the current value using a transformer and emit the new value.
   */
  update(transformer: (value: T) => T): void {
    this.next(transformer(this.currentValue));
  }

  /**
   * Add a listener to this observable.
   *
   * If you stop needing the observable, make sure to unsubscribe from it.
   */
  subscribe(
    callback: (newValue: T) => void,
    { emitImmediately } = { emitImmediately: false }
  ): Subscription {
    this.subscribers.push(callback);
    if (emitImmediately) {
      callback(this.currentValue);
    }

    return {
      unsubscribe: () => {
        this.subscribers = this.subscribers.filter((cb) => cb !== callback);
      },
    };
  }
}
