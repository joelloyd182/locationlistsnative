import { StyleSheet, Text, View, TextInput, Button, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState } from 'react';
import { useStores } from '../context/StoresContext';

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams();
  const { stores, addItem, toggleItem, deleteItem } = useStores();
  const [newItemText, setNewItemText] = useState('');

  const store = stores.find(s => s.id === id);

  if (!store) {
    return (
      <View style={styles.container}>
        <Text>Store not found</Text>
      </View>
    );
  }

  const handleAddItem = () => {
    if (newItemText.trim()) {
      addItem(store.id, newItemText.trim());
      setNewItemText('');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: store.name }} />
      
      <View style={styles.addItemContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add item..."
          value={newItemText}
          onChangeText={setNewItemText}
          onSubmitEditing={handleAddItem}
        />
        <Button title="Add" onPress={handleAddItem} color="#FF6B6B" />
      </View>

      <FlatList
        data={store.items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.itemCard, item.checked && styles.itemChecked]}
            onPress={() => toggleItem(store.id, item.id)}
            onLongPress={() => deleteItem(store.id, item.id)}
          >
            <Text style={[styles.itemText, item.checked && styles.itemTextChecked]}>
              {item.checked ? '✓ ' : ''}{item.text}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No items yet. Add one above!</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F3',
  },
  addItemContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: 'white',
    borderBottomWidth: 2,
    borderBottomColor: '#FFE1D6',
  },
  input: {
    flex: 1,
    backgroundColor: '#FFF8F3',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFE1D6',
    fontSize: 16,
  },
  itemCard: {
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFE1D6',
  },
  itemChecked: {
    backgroundColor: '#F0FFF0',
    borderColor: '#51CF66',
  },
  itemText: {
    fontSize: 16,
    color: '#2D1B1B',
  },
  itemTextChecked: {
    textDecorationLine: 'line-through',
    color: '#8B7371',
  },
  emptyText: {
    textAlign: 'center',
    color: '#8B7371',
    marginTop: 40,
    fontSize: 16,
  },
});