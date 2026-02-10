import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, ScrollView, Button } from 'react-native';
import { useLocation } from '@/hooks/useLocation';
import { useStores } from '../../context/StoresContext';

export default function HomeScreen() {
  const { stores, addStore } = useStores();
  const { location, errorMsg } = useLocation();
  const router = useRouter();
  
return (
  <ScrollView style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.title}>📍 Location Lists</Text>
      <Text style={styles.subtitle}>{stores.length} stores</Text>
      
      {location && (
        <Text style={styles.coordinates}>
          📍 {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
        </Text>
      )}
      {errorMsg && (
        <Text style={styles.error}>{errorMsg}</Text>
      )}
    </View>
    
    {stores.map(store => (
  <TouchableOpacity
    key={store.id}
    style={styles.storeCard}
    onPress={() => router.push(`/store-detail?id=${store.id}`)}
  >
    <Text style={styles.storeName}>{store.name}</Text>
    <Text style={styles.itemCount}>{store.items.length} items</Text>
  </TouchableOpacity>
))}
    
    <View style={styles.buttonContainer}>
      <Button 
        title="+ Add Test Store" 
        onPress={() => {
          addStore({
            name: 'Test Store ' + (stores.length + 1),
            address: 'Motueka',
            location: { lat: -41.1206, lng: 172.9897 },
            triggerRadius: 150,
            items: []
          });
        }}
        color="#FF6B6B"
      />
    </View>
  </ScrollView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F3',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8B7371',
  },
  storeCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FFE1D6',
  },
  storeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D1B1B',
    marginBottom: 4,
  },
  itemCount: {
    fontSize: 14,
    color: '#8B7371',
  },
  coordinates: {
    fontSize: 12,
    color: '#4ECDC4',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  error: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 8,
  },
  buttonContainer: {
  marginVertical: 20,
  marginHorizontal: 20,
},
});