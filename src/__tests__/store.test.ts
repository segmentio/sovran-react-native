import { createStore } from '../store';

interface Event {
  id: string;
  description: string;
}

describe('Sovran', () => {
  it('should work', async () => {
    // Create a new store
    const sovran = createStore<{ events: Event[] }>({ events: [] });

    // Setup a subscription callback
    const subscription = jest.fn();
    sovran.subscribe(subscription);

    const sampleEvent: Event = {
      id: '1',
      description: 'test',
    };

    const expectedState = {
      events: [sampleEvent],
    };

    // Dispatch an action to add a new event in our store
    await sovran.dispatch((state) => {
      return {
        events: [...state.events, sampleEvent],
      };
    });

    // Subscription gets called
    expect(subscription).toHaveBeenCalledWith(expectedState);

    // And we can also access state from here
    expect(sovran.getState()).toEqual(expectedState);
  });

  it('should work with multiple stores', async () => {
    const sovran = createStore<{ events: Event[] }>({ events: [] });
    const sovran2 = createStore<{ events: Event[] }>({ events: [] });
    const subscription = jest.fn();
    const subscription2 = jest.fn();
    sovran.subscribe(subscription);
    sovran2.subscribe(subscription2);

    const sampleEvent: Event = {
      id: '1',
      description: 'test',
    };

    const expectedState = {
      events: [sampleEvent],
    };

    await sovran.dispatch((state) => {
      return {
        events: [...state.events, sampleEvent],
      };
    });

    expect(subscription).toHaveBeenCalledWith(expectedState);
    expect(subscription2).not.toHaveBeenCalled();

    expect(sovran.getState()).toEqual(expectedState);
    expect(sovran2.getState()).toEqual({ events: [] });
  });

  it('should work with multiple subscribers', async () => {
    const sovran = createStore<{ events: Event[] }>({ events: [] });
    const subscription = jest.fn();
    const subscription2 = jest.fn();
    sovran.subscribe(subscription);
    sovran.subscribe(subscription2);

    const sampleEvent: Event = {
      id: '1',
      description: 'test',
    };

    const expectedState = {
      events: [sampleEvent],
    };

    await sovran.dispatch((state) => {
      return {
        events: [...state.events, sampleEvent],
      };
    });

    expect(subscription).toHaveBeenCalledWith(expectedState);
    expect(subscription2).toHaveBeenCalledWith(expectedState);

    expect(sovran.getState()).toEqual(expectedState);
  });

  it('should work with multiple events sent', async () => {
    const sovran = createStore<{ events: Event[] }>({ events: [] });
    const n = 100;

    for (let i = 0; i < n; i++) {
      const sampleEvent: Event = {
        id: i.toString(),
        description: `test ${i}`,
      };
      sovran.dispatch((state) => {
        return {
          events: [...state.events, sampleEvent],
        };
      });
    }

    // Wait for all promises to resolve
    await new Promise(process.nextTick);

    expect(sovran.getState().events.length).toEqual(n);
  });
});
