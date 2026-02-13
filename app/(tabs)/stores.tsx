import { StyleSheet, Text, View, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useStores } from '../../context/StoresContext';
import { useTheme } from '../../context/ThemeContext';

export default function StoresScreen() {
  const router = useRouter();
  const { stores } = useStores();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Firestore already syncs automatically via onSnapshot
    // Just wait a bit to show the refresh animation
    await new Promise(resolve => setTimeout(resolve, 800));
    setRefreshing(false);
  };

    return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>All Stores</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/add-store')}
        >
          <Text style={styles.addButtonText}>+ Add Store</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={stores}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        keyExtractor={store => store.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item: store }) => {
          const totalItems = store.items.length;
          const uncheckedItems = store.items.filter(i => !i.checked).length;
          const allDone = totalItems > 0 && uncheckedItems === 0;

          return (
            <TouchableOpacity
              style={[
                styles.storeCard, 
                { backgroundColor: colors.card, borderColor: colors.border },
                allDone && { backgroundColor: colors.success + '20', borderColor: colors.success }
              ]}
              onPress={() => router.push(`/store-detail?id=${store.id}`)}
            >
              {/* Store Icon & Header */}
              <View style={styles.storeHeader}>
                <View style={styles.storeHeaderLeft}>
                  <Text style={styles.storeIcon}>
                    {store.isOnline ? '🌐' : '🏪'}
                  </Text>
                  <Text style={[styles.storeName, { color: colors.text }]}>{store.name}</Text>
                </View>
                {allDone && <Text style={[styles.donebadge, { backgroundColor: colors.success }]}>✓ Done</Text>}
              </View>
              
              {/* Address or Website */}
              <Text style={[styles.storeAddress, { color: colors.textLight }]}>
                {store.isOnline 
                  ? (store.website || 'Online Store')
                  : (store.address || 'No address')
                }
              </Text>
              
              {/* Stats */}
              <View style={styles.storeStats}>
                <Text style={[styles.statText, { color: colors.textLight }]}>
                  📦 {totalItems} items
                </Text>
                {uncheckedItems > 0 && (
                  <Text style={[styles.statTextPending, { color: colors.error }]}>
                    • {uncheckedItems} pending
                  </Text>
                )}
                {!store.isOnline && store.triggerRadius && (
                  <Text style={[styles.statText, { color: colors.textLight }]}>
                    • 📍 {store.triggerRadius}m radius
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textLight }]}>No stores yet!</Text>
            <Text style={[styles.emptySubtext, { color: colors.textLight }]}>Tap "Add Store" to get started</Text>
          </View>
        }
        contentContainerStyle={stores.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  storeCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeIcon: {
    fontSize: 28,
    marginRight: 10,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  donebadge: {
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  storeAddress: {
    fontSize: 14,
    marginBottom: 8,
  },
  storeStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statText: {
    fontSize: 12,
  },
  statTextPending: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
});
