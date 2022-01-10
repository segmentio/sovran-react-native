import { MMKV } from 'react-native-mmkv'

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
 * @param storeId store instance id 
 * @returns {Store<T>} object
 */

export const createStore =  <T extends {}>(initialState: T, storeId: string): Store<T> => {
  let state = initialState;

  //creates new storage instance 
  const persistedStorage = new MMKV({
    id: storeId
  }); 

  //deserailize the JSON string from MMKV 
  const persistedStateJSON = persistedStorage.getString('state');

  // check to see if anything is there, if so update initialState 
  if (persistedStateJSON != null) {
    let persistedState = JSON.parse(persistedStateJSON);
    state  = {...persistedState}
  }

  const observable = createObservable<T>();

  const dispatch = async (action: Action<T>) => {
    const newState = await action(state);

    if (newState !== state) {
      state = newState;
      observable.notify(state);
      //if there is a new state, update storage 
      updatePersistor(state, persistedStorage)
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

//since it's serialized, I'm not sure of a better way to check 
//and replace state in storage other than comparing them, completely 
//deleting the storage obj and rpelacing it with a new state. 
const updatePersistor = (state: {}, store: MMKV) => {
  const jsonState = store.getString('state');
  let persistedState;

  if( jsonState != null) {
    persistedState = JSON.parse(jsonState)
  }

  if (persistedState && persistedState != state) {
    let newState = {...persistedState, ...state};
     store.clearAll();
     store.set('state',  JSON.stringify(newState));
  }
  
}