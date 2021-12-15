import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { onStoreAction } from './bridge';

const LINKING_ERROR =
  `The package 'react-native-sovran' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';

const Sovran = NativeModules.SovranInternal
  ? NativeModules.SovranInternal
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

const SovranBridge = new NativeEventEmitter(Sovran);
SovranBridge.addListener('onStoreAction', (event) => {
  console.log('onStoreAction', event);
  onStoreAction(event.event, event.payload);
});

export function multiply(a: number, b: number): Promise<number> {
  return Sovran.multiply(a, b);
}

export { createStore, Store } from './store';
export { registerStore, onStoreAction as onEvent } from './bridge';
