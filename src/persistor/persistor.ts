export interface PersistenceConfig {
  /**
   * Unique identifier for the store
   */
  storeId: string;
  /**
   * Delay in ms to wait before saving state
   */
  saveDelay?: number;
  /**
   * Persistor
   */
  persistor?: Persistor;
}

export interface Persistor {
  /**
   * Retrieves an item from Storage
   * @param key storeId
   * @returns State object or undefined if no state is in the storage
   */
  get: <T>(key: string) => Promise<T | undefined>;
  /**
   * Saves a state object to Storage
   */
  set: <T>(key: string, state: T) => Promise<void>;
}
