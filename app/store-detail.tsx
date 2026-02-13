import { StyleSheet, Text, View, TextInput, Button, FlatList, TouchableOpacity, Alert, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useStores } from '../context/StoresContext';
import { doc, updateDoc, arrayUnion, collection, query, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams();
  const { stores, addItem, toggleItem, deleteItem, deleteStore } = useStores();
  const [newItemText, setNewItemText] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const store = stores.find(s => s.id === id);
  const router = useRouter();
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<{uid: string, email: string, displayName: string}[]>([]);
  const { colors } = useTheme();

  useEffect(() => {
    if (showShareModal) {
      loadUsers();
    }
  }, [showShareModal]);

  const loadUsers = async () => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef);
    const snapshot = await getDocs(q);
    const users: any[] = [];
    snapshot.forEach((doc) => {
      if (doc.id !== user?.uid) {
        users.push({ uid: doc.id, ...doc.data() });
      }
    });
    setAllUsers(users);
  };

  if (!store) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Store not found</Text>
      </View>
    );
  }

 const handleAddItem = async () => {
  if (newItemText.trim()) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // ← MOVED HERE (fires instantly!)
    setLoading(true);
    try {
      await addItem(store.id, newItemText.trim());
      setNewItemText('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setLoading(false);
    }
  }
};

  const handleToggleItem = async (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      await toggleItem(store.id, itemId);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    try {
      await deleteItem(store.id, itemId);
    } finally {
      setLoading(false);
    }
  };
  
  const shareStoreWithUser = async (storeId: string, targetUserId: string) => {
    if (!user) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const storeRef = doc(db, 'stores', storeId);
      await updateDoc(storeRef, {
        members: arrayUnion(targetUserId)
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setLoading(false);
    }
  };

  // Check if store is open now
  const getOpenStatus = () => {
    if (!store.openingHours || store.openingHours.length === 0) return null;
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const todayHours = store.openingHours[todayIndex];
    
    if (!todayHours) return null;
    
    const match = todayHours.match(/(\d+):(\d+)\s*(AM|PM)\s*–\s*(\d+):(\d+)\s*(AM|PM)/);
    if (!match) return { text: todayHours, isOpen: null };
    
    const openHour = parseInt(match[1]) + (match[3] === 'PM' && match[1] !== '12' ? 12 : 0);
    const closeHour = parseInt(match[4]) + (match[6] === 'PM' && match[4] !== '12' ? 12 : 0);
    
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const openTimeInMinutes = openHour * 60 + parseInt(match[2]);
    const closeTimeInMinutes = closeHour * 60 + parseInt(match[5]);
    
    const isOpen = currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes;
    
    return {
      text: `${match[1]}:${match[2]} ${match[3]} – ${match[4]}:${match[5]} ${match[6]}`,
      isOpen
    };
  };

  const openStatus = getOpenStatus();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: store.name,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 10, marginRight: 8 }}>
              <TouchableOpacity 
                style={[styles.headerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/edit-store?id=${store.id}`);
                }}
                disabled={loading}
              >
                <Ionicons name="pencil" size={18} color={colors.primary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.headerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowShareModal(true);
                }}
                disabled={loading}
              >
                <Ionicons name="share-social" size={18} color={colors.success} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.headerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert(
                    'Delete Store',
                    `Delete ${store.name}? This will also delete all items.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Delete', 
                        style: 'destructive',
                        onPress: async () => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                          setLoading(true);
                          try {
                            await deleteStore(store.id);
                            router.back();
                          } finally {
                            setLoading(false);
                          }
                        }
                      }
                    ]
                  );
                }}
                disabled={loading}
              >
                <Ionicons name="trash" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          )
        }} 
      />

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {showShareModal && (
        <View style={styles.editModal}>
          <View style={[styles.editModalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.editModalTitle, { color: colors.text }]}>Share Store</Text>
            <Text style={[styles.shareInstructions, { color: colors.textLight }]}>
              Select who to share with:
            </Text>
            
            {allUsers.map(u => (
              <TouchableOpacity
                key={u.uid}
                style={[styles.userOption, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={async () => {
                  try {
                    await shareStoreWithUser(store.id, u.uid);
                    Alert.alert('Success', `Shared with ${u.displayName}!`);
                    setShowShareModal(false);
                  } catch (error: any) {
                    Alert.alert('Error', error.message);
                  }
                }}
                disabled={loading}
              >
                <Text style={[styles.userOptionText, { color: colors.text }]}>
                  {u.displayName} ({u.email})
                </Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={[styles.editModalButton, { backgroundColor: colors.textLight }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowShareModal(false);
              }}
              disabled={loading}
            >
              <Text style={styles.editModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Store Info Section */}
      {(store.rating || store.phone || openStatus) && (
        <View style={[styles.storeInfoContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {store.rating && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.text }]}>⭐ Rating:</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>{store.rating.toFixed(1)} / 5.0</Text>
            </View>
          )}
          
          {openStatus && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.text }]}>🕐 Today:</Text>
              <Text style={[
                styles.infoText, 
                { color: colors.text },
                openStatus.isOpen === true && { color: colors.success, fontWeight: '600' },
                openStatus.isOpen === false && { color: colors.error, fontWeight: '600' }
              ]}>
                {openStatus.isOpen === true ? '✓ Open' : openStatus.isOpen === false ? '✗ Closed' : openStatus.text}
                {openStatus.isOpen !== null && ` • ${openStatus.text}`}
              </Text>
            </View>
          )}
          
          {store.phone && (
            <TouchableOpacity 
              style={styles.infoRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL(`tel:${store.phone}`);
              }}
            >
              <Text style={[styles.infoLabel, { color: colors.text }]}>📞 Phone:</Text>
              <Text style={[styles.infoText, { color: colors.primary, textDecorationLine: 'underline' }]}>{store.phone}</Text>
            </TouchableOpacity>
          )}

          {store.website && (
            <TouchableOpacity 
              style={styles.infoRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const url = store.website?.startsWith('http') ? store.website : `https://${store.website}`;
                Linking.openURL(url);
              }}
            >
              <Text style={[styles.infoLabel, { color: colors.text }]}>🌐 Website:</Text>
              <Text style={[styles.infoText, { color: colors.primary, textDecorationLine: 'underline' }]} numberOfLines={1}>
                {store.website}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={[styles.addItemContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput 
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} 
          placeholderTextColor={colors.textLight}
          placeholder="Add item..."
          value={newItemText}
          onChangeText={setNewItemText}
          onSubmitEditing={handleAddItem}
          editable={!loading}
        />
        <Button 
          title={loading ? "..." : "Add"} 
          onPress={handleAddItem} 
          color={colors.primary}
          disabled={loading}
        />
      </View>

      <FlatList
        data={store.items}
        keyExtractor={item => item.id}
		contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.itemCard, 
              { backgroundColor: colors.card, borderColor: colors.border },
              item.checked && { backgroundColor: colors.success + '20', borderColor: colors.success }
            ]}
            onPress={() => handleToggleItem(item.id)}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert(
                'Delete Item',
                `Remove "${item.text}"?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => handleDeleteItem(item.id)
                  }
                ]
              );
            }}
            disabled={loading}
          >
            <Text style={[
              styles.itemText, 
              { color: colors.text },
              item.checked && { color: colors.textLight, textDecorationLine: 'line-through' }
            ]}>
              {item.checked ? '✓ ' : ''}{item.text}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textLight }]}>No items yet. Add some!</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  storeInfoContainer: {
    padding: 16,
    borderBottomWidth: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    width: 90,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
  },
  addItemContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderBottomWidth: 2,
  },
  input: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    fontSize: 16,
  },
  itemCard: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
  },
  itemText: {
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  editModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  editModalContent: {
    padding: 24,
    borderRadius: 12,
    width: '80%',
    maxHeight: '80%',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  shareInstructions: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  editModalButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  editModalButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  userOption: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
  },
  userOptionText: {
    fontSize: 16,
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
