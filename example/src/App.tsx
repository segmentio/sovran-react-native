import * as React from 'react';

import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Button,
  SafeAreaView,
} from 'react-native';
import { createStore, registerBridgeStore } from '@segment/sovran-react-native';

interface Message {
  origin: string;
  message: string;
}

interface MessageQueue {
  messages: Message[];
}

// Create the sovran store with our type and initial state
const eventStore = createStore<MessageQueue>(
  {
    messages: [],
  },
  {
    persist: {
      storeId: 'events',
      saveDelay: 500,
    },
  }
);

// Action to add new events
const addMessage = (message: Message) => (state: MessageQueue) => ({
  messages: [...state.messages, message],
});

// Register the store to listen to native events
registerBridgeStore({
  store: eventStore,
  actions: {
    'add-message': addMessage,
  },
});

export default function App() {
  const [events, setEvents] = React.useState<Message[]>([]);

  React.useEffect(() => {
    // Subscribe to new events coming in
    const unsubscribe = eventStore.subscribe((queue) => {
      setEvents(queue.messages);
    });
    return () => {
      // Clean up the subscription when the event is removed
      unsubscribe();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <FlatList
          data={events}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <Text style={styles.item}>
              {item.origin}:{item.message}
            </Text>
          )}
        />
        <Button
          title="Add message"
          onPress={() =>
            eventStore.dispatch(
              addMessage({
                origin: 'React Native',
                message: 'Hello from React',
              })
            )
          }
        />
        <Button
          title="Clear"
          onPress={() =>
            eventStore.dispatch((_: MessageQueue) => ({
              messages: [],
            }))
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
  item: {
    padding: 10,
    fontSize: 18,
    height: 44,
    borderTopColor: 'black',
    borderBottomColor: 'black',
    borderBottomWidth: 1,
    borderTopWidth: 1,
  },
});
