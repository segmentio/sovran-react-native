import * as React from 'react';

import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Button,
  SafeAreaView,
} from 'react-native';
import { createStore, registerBridgeStore } from 'sovran-react-native';

interface Message {
  origin: string;
  message: string;
}

// Create the sovran store with our type and initial state
const eventStore = createStore<Message[]>([]);

// Action to add new events
const addMessage = (message: Message) => (state: Message[]) =>
  [...state, message];

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
    const unsubscribe = eventStore.subscribe(setEvents);
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
