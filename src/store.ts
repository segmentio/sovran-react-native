import {
  AsyncStoragePersistor,
  PersistenceConfig,
  Persistor,
} from './persistor';
import merge from 'deepmerge';
const DEFAULT_SAVE_STATE_DELAY_IN_MS = 1000;
const DEFAULT_STORE_NAME = 'default';

export type Notify<V> = (value: V) => void;
export type Unsubscribe = () => void;

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
 * Sovran State Store
 */
export interface Store<T extends {}> {
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
  dispatch: (action: Action<T>) => void;
  /**
   * Get the current state of the store
   * @returns {T} current state
   */
  getState: () => T;
}

/**
 * Creates a simple state store.
 * @param initialState initial store values
 * @param storeId store instance id
 * @returns {Store<T>} object
 */

export interface StoreConfig {
  /**
   * Persistence configuration
   */
  persist?: PersistenceConfig;
}

/**
 * Creates a sovran state management store
 * @param initialState initial state of the store
 * @param config configuration options
 * @returns Sovran Store object
 */
export const createStore = <T extends {}>(
  initialState: T,
  config?: StoreConfig
): Store<T> => {
  let state = initialState;
  let queue: Action<T>[] = [];
  let isPersisted = config?.persist !== undefined;
  let saveTimeout: ReturnType<typeof setTimeout> | undefined;
  let persistor: Persistor =
    config?.persist?.persistor ?? AsyncStoragePersistor;
  let storeId: string = isPersisted
    ? config!.persist!.storeId
    : DEFAULT_STORE_NAME;

  if (isPersisted) {
    persistor.get<T>(storeId).then((persistedState) => {
      if (
        persistedState !== undefined &&
        persistedState !== null &&
        typeof persistedState === 'object'
      ) {
        dispatch((oldState) => {
          return merge(oldState, persistedState);
        });
      } else {
        persistor.set(storeId, getState());
      }
    });
  }

  const updatePersistor = (state: T) => {
    if (config === undefined) {
      return;
    }

    if (saveTimeout !== undefined) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
      persistor.set(storeId, state);
      saveTimeout = undefined;
    }, config.persist?.saveDelay ?? DEFAULT_SAVE_STATE_DELAY_IN_MS);
  };

  const observable = createObservable<T>();
  const queueObserve = createObservable<typeof queue>();

  const getState = () => ({ ...state });

  const dispatch = async (action: Action<T>) => {
    queue.push(action);
    queueObserve.notify(queue);
  };

  const processQueue = async () => {
    queueObserve.unsubscribe(processQueue);
    while (queue.length > 0) {
      const action = queue.shift();
      try {
        if (action !== undefined) {
          const newState = await action(state);
          if (newState !== state) {
            state = newState;
            // TODO: Debounce notifications
            observable.notify(state);
            if (isPersisted) {
              updatePersistor(state);
            }
          }
        }
      } catch {
        console.warn('Promise not handled correctly');
      }
    }
    queueObserve.subscribe(processQueue);
    return state;
  };

  queueObserve.subscribe(processQueue);

  const subscribe = (callback: Notify<T>) => {
    const unsubscribe = observable.subscribe(callback);
    return () => {
      unsubscribe();
    };
  };

  return { subscribe, dispatch, getState };
};
