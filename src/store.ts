import { MMKV } from 'react-native-mmkv';
const DEFAULT_SAVE_STATE_DELAY_IN_MS = 1000;

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
 * Sovran State Store
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
 * @param storeId store instance id
 * @returns {Store<T>} object
 */

interface PersistenceConfig {
  /**
   * Unique identifier for the store
   */
  storeId: string;
  /**
   * Delay in ms to wait before saving state
   */
  saveDelay?: number;
}

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
  let isPersisted = config?.persist !== undefined;
  let saveTimeout: ReturnType<typeof setTimeout> | undefined;
  let persistedStorage: MMKV | undefined;

  if (isPersisted) {
    persistedStorage = createPersistedStorage(config.persist!);
    const persistedStateJSON = persistedStorage.getString('state');
    if (persistedStateJSON?.length) {
      state = restoreState(persistedStorage) ?? initialState;
    }
  }

  const updatePersistor = (state: T) => {
    if (saveTimeout !== undefined) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
      persistedStorage.set('state', JSON.stringify(state));
      saveTimeout = undefined;
    }, config.persist?.saveDelay ?? DEFAULT_SAVE_STATE_DELAY_IN_MS);
  };

  const observable = createObservable<T>();

  const dispatch = async (action: Action<T>) => {
    const newState = await action(state);

    if (newState !== state) {
      state = newState;
      observable.notify(state);
      if (isPersisted) {
        updatePersistor(state);
      }
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

/**
 * Creates a persisted storage object for MMKV
 * @param config configuration
 * @returns MMKV object
 */
const createPersistedStorage = (config: PersistenceConfig): MMKV =>
  new MMKV({
    id: config.storeId,
  });

/**
 * Restores state from the persisted storage
 * @param persistedStorage MMKV object
 * @returns State object or undefined if no state is in the storage
 */
const restoreState = <T>(persistedStorage: MMKV): T | undefined => {
  const persistedStateJSON = persistedStorage.getString('state');

  if (persistedStateJSON !== null && persistedStateJSON !== undefined) {
    return JSON.parse(persistedStateJSON);
  }
  return undefined;
};
