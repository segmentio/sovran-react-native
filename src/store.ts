type Notify<V> = (value: V) => void;
type Unsubscribe = () => void;

/**
 * Generic observable store
 */
interface Observable<V> {
  subscribe: (callback: Notify<V>) => Unsubscribe;
  unsubscribe: (callback: Notify<V>) => void;
  notify: (value: V) => void;
}

/**
 * Creates a new observable for a particular type that manages all its subscribers
 * @returns {Observable<V>} observable object
 */
const createObservable = <V>(): Observable<V> => {
  const callbacks: Notify<V>[] = [];

  const unsubscribe = (callback: Notify<V>) => {
    callbacks.splice(callbacks.indexOf(callback), 1);
  };

  const subscribe = (callback: Notify<V>) => {
    callbacks.push(callback);
    return () => {
      unsubscribe(callback);
    };
  };

  const notify = (value: V) => {
    callbacks.forEach((callback) => callback(value));
  };

  return { subscribe, unsubscribe, notify };
};

export type Action<T> = (state: T) => T | Promise<T>;

/**
 * Interface for store
 */
export interface Store<T> {
  /**
   * Register a callback for changes to the store
   * @param {Notify<T>} callback - callback to be called when the store changes
   * @returns {Unsubscribe} - function to unsubscribe from the store
   */
  subscribe: (callback: Notify<T>) => Unsubscribe;
  /**
   * Dispatch an action to update the store values
   * @param {T | Promise<T>} action - action to dispatch
   * @returns {T} new state
   */
  dispatch: (action: Action<T>) => Promise<T>;
  /**
   * Get the current state of the store
   * @returns {T} current state
   */
  getState: () => T;
}

/**
 * Creates a simple state store.
 * @param initialState initial store values
 * @returns {Store<T>} object
 */
export const createStore = <T>(initialState: T): Store<T> => {
  let state = initialState;
  const observable = createObservable<T>();

  const dispatch = async (action: Action<T>) => {
    const newState = await action(state);

    if (newState !== state) {
      state = newState;
      observable.notify(state);
    }
    return state;
  };

  const subscribe = (callback: Notify<T>) => {
    const unsubscribe = observable.subscribe(callback);
    return () => {
      unsubscribe();
    };
  };

  const getState = () => ({ ...state });

  return { subscribe, dispatch, getState };
};
