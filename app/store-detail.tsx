import { StyleSheet, Text, View, TextInput, FlatList, TouchableOpacity, Alert, Linking, ActivityIndicator, Platform, Modal } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useStores } from '../context/StoresContext';
import { doc, updateDoc, arrayUnion, collection, query, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, elevation, spacing, radius, typography } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeIn,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import SwipeableItemRow from '../components/SwipeableItemRow';
import { useBudget } from '../context/BudgetContext';


export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams();
  const { stores, addItem, toggleItem, deleteItem, deleteStore, updateItem, clearCheckedItems } = useStores();
  const [newItemText, setNewItemText] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const store = stores.find(s => s.id === id);
  const router = useRouter();
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<{uid: string, email: string, displayName: string}[]>([]);
  const { colors } = useTheme();
  const { logPrice } = useBudget();
  
  // Info/edit panel state
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editNote, setEditNote] = useState('');
  const [showStoreInfo, setShowStoreInfo] = useState(false);

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
        <Stack.Screen options={{ title: 'Not Found' }} />
        <View style={styles.notFoundState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>Store not found</Text>
        </View>
      </View>
    );
  }

  const handleAddItem = async () => {
    if (newItemText.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    if (!store) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Log price to history when checking OFF an item (marking as done)
    const item = store.items.find(i => i.id === itemId);
    if (item && !item.checked && item.price != null && item.price > 0) {
      logPrice({
        itemText: item.text,
        storeName: store.name,
        storeId: store.id,
        price: item.price,
      });
    }

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

  const handleInfoPress = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItem(item);
    setEditName(item.text || '');
    setEditPrice(item.price !== undefined && item.price !== null ? item.price.toString() : '');
    setEditNote(item.note || '');
  };

  const handleSaveItemDetails = async () => {
    if (!selectedItem) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const updates: any = {};
    
    // Rename
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== selectedItem.text) {
      updates.text = trimmedName;
    }
    
    // Price
    const priceValue = parseFloat(editPrice);
    if (!isNaN(priceValue) && priceValue >= 0) {
      updates.price = priceValue;
    } else if (editPrice === '') {
      updates.price = null;
    }
    updates.note = editNote.trim() || null;

    setLoading(true);
    try {
      await updateItem(store.id, selectedItem.id, updates);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setLoading(false);
      setSelectedItem(null);
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
  const uncheckedItems = store.items.filter(i => !i.checked);
  const checkedItems = store.items.filter(i => i.checked);
  const totalItems = store.items.length;
  const progress = totalItems > 0 ? checkedItems.length / totalItems : 0;

  // Sort: unchecked first, then checked
  const sortedItems = [...uncheckedItems, ...checkedItems];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: store.name,
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={[styles.headerButton, { backgroundColor: colors.primary + '12' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/edit-store?id=${store.id}`);
                }}
                disabled={loading}
              >
                <Ionicons name="pencil" size={17} color={colors.primary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.headerButton, { backgroundColor: colors.success + '15' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowShareModal(true);
                }}
                disabled={loading}
              >
                <Ionicons name="share-social" size={17} color={colors.success} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.headerButton, { backgroundColor: colors.errorLight }]}
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
                <Ionicons name="trash" size={17} color={colors.error} />
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

      <FlatList
        data={sortedItems}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Store Info Card — Collapsible */}
            {(store.rating || store.phone || openStatus || store.website) && (
              <View style={[styles.infoCard, elevation(1), { backgroundColor: colors.surface }]}>
                {/* Always-visible header row: open/closed status + toggle */}
                <TouchableOpacity 
                  style={styles.infoToggleRow}
                  onPress={() => setShowStoreInfo(!showStoreInfo)}
                  activeOpacity={0.7}
                >
                  <View style={styles.infoToggleLeft}>
                    {openStatus && (
                      <>
                        <View style={[
                          styles.openDot,
                          { backgroundColor: openStatus.isOpen === true ? colors.success : openStatus.isOpen === false ? colors.error : colors.textMuted }
                        ]} />
                        <Text style={[
                          styles.infoItemText,
                          { color: colors.text },
                          openStatus.isOpen === true && { color: colors.success, fontWeight: '600' },
                          openStatus.isOpen === false && { color: colors.error, fontWeight: '600' },
                        ]}>
                          {openStatus.isOpen === true ? 'Open' : openStatus.isOpen === false ? 'Closed' : ''}
                          {openStatus.isOpen !== null ? ` · ${openStatus.text}` : openStatus.text}
                        </Text>
                      </>
                    )}
                    {!openStatus && store.rating && (
                      <>
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text style={[styles.infoItemText, { color: colors.text }]}>
                          {store.rating.toFixed(1)}
                        </Text>
                      </>
                    )}
                  </View>
                  <Ionicons 
                    name={showStoreInfo ? 'chevron-up' : 'chevron-down'} 
                    size={18} 
                    color={colors.textMuted} 
                  />
                </TouchableOpacity>

                {/* Expandable details */}
                {showStoreInfo && (
                  <View style={styles.infoExpandedContent}>
                    {store.rating && openStatus && (
                      <View style={styles.infoItem}>
                        <Ionicons name="star" size={16} color="#F59E0B" />
                        <Text style={[styles.infoItemText, { color: colors.text }]}>
                          {store.rating.toFixed(1)} / 5.0
                        </Text>
                      </View>
                    )}
                    
                    {store.phone && (
                      <TouchableOpacity 
                        style={styles.infoItem}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          Linking.openURL(`tel:${store.phone}`);
                        }}
                      >
                        <Ionicons name="call-outline" size={16} color={colors.primary} />
                        <Text style={[styles.infoItemText, { color: colors.primary }]}>{store.phone}</Text>
                      </TouchableOpacity>
                    )}

                    {store.website && (
                      <TouchableOpacity 
                        style={styles.infoItem}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          const url = store.website?.startsWith('http') ? store.website : `https://${store.website}`;
                          Linking.openURL(url);
                        }}
                      >
                        <Ionicons name="globe-outline" size={16} color={colors.primary} />
                        <Text style={[styles.infoItemText, { color: colors.primary }]} numberOfLines={1}>
                          {store.website}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Progress bar */}
            {totalItems > 0 && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                    {checkedItems.length} of {totalItems} completed
                  </Text>
                  <Text style={[styles.progressPercent, { color: colors.primary }]}>
                    {Math.round(progress * 100)}%
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
                  <Animated.View 
                    style={[
                      styles.progressFill, 
                      { 
                        backgroundColor: progress === 1 ? colors.success : colors.primary,
                        width: `${progress * 100}%`,
                      }
                    ]} 
                  />
                </View>
              </View>
            )}

            {/* Spending Summary */}
            {(() => {
              const pricedItems = store.items.filter(i => i.price != null && i.price > 0);
              const storeTotal = pricedItems.reduce((sum, i) => sum + (i.price || 0), 0);
              const remainingTotal = pricedItems.filter(i => !i.checked).reduce((sum, i) => sum + (i.price || 0), 0);
              
              if (pricedItems.length === 0) return null;
              
              return (
                <View style={[styles.spendingCard, { backgroundColor: colors.primary + '08' }]}>
                  <View style={styles.spendingRow}>
                    <View style={styles.spendingStat}>
                      <Text style={[styles.spendingAmount, { color: colors.text }]}>
                        ${storeTotal.toFixed(2)}
                      </Text>
                      <Text style={[styles.spendingLabel, { color: colors.textMuted }]}>Total</Text>
                    </View>
                    <View style={[styles.spendingDivider, { backgroundColor: colors.borderLight }]} />
                    <View style={styles.spendingStat}>
                      <Text style={[styles.spendingAmount, { color: remainingTotal > 0 ? colors.primary : colors.success }]}>
                        ${remainingTotal.toFixed(2)}
                      </Text>
                      <Text style={[styles.spendingLabel, { color: colors.textMuted }]}>Remaining</Text>
                    </View>
                    <View style={[styles.spendingDivider, { backgroundColor: colors.borderLight }]} />
                    <View style={styles.spendingStat}>
                      <Text style={[styles.spendingAmount, { color: colors.textSecondary }]}>
                        ${pricedItems.length > 0 ? (storeTotal / pricedItems.length).toFixed(2) : '0.00'}
                      </Text>
                      <Text style={[styles.spendingLabel, { color: colors.textMuted }]}>Avg/item</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.viewSpendingLink}
                    onPress={() => router.push('/spending')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="analytics-outline" size={14} color={colors.primary} />
                    <Text style={[styles.viewSpendingText, { color: colors.primary }]}>View all spending</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}

            {/* Add Item Input */}
            <View style={[styles.addItemSection, elevation(1), { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.addInput, { 
                  backgroundColor: colors.surfaceAlt, 
                  borderColor: colors.borderLight,
                  color: colors.text,
                }]}
                placeholderTextColor={colors.textMuted}
                placeholder="Add an item..."
                value={newItemText}
                onChangeText={setNewItemText}
                onSubmitEditing={handleAddItem}
                returnKeyType="done"
                editable={!loading}
              />
              <TouchableOpacity
                style={[
                  styles.addButton, 
                  { backgroundColor: newItemText.trim() ? colors.primary : colors.border }
                ]}
                onPress={handleAddItem}
                disabled={!newItemText.trim() || loading}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={22} color={colors.textInverse} />
              </TouchableOpacity>
            </View>

            {/* Divider label for unchecked */}
            {uncheckedItems.length > 0 && (
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                To get ({uncheckedItems.length})
              </Text>
            )}
          </View>
        }
        renderItem={({ item, index }) => {
          // Insert divider between unchecked and checked sections
          const isFirstChecked = item.checked && index === uncheckedItems.length;
          
          return (
            <>
              {isFirstChecked && checkedItems.length > 0 && (
                <View style={styles.checkedSectionHeader}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted, marginHorizontal: 0, marginTop: 0, marginBottom: 0 }]}>
                    Completed ({checkedItems.length})
                  </Text>
                  <TouchableOpacity
                    style={[styles.clearButton, { backgroundColor: colors.error + '10' }]}
                    onPress={() => {
                      Alert.alert(
                        'Clear Completed',
                        `Remove ${checkedItems.length} completed item${checkedItems.length !== 1 ? 's' : ''}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Clear', 
                            style: 'destructive',
                            onPress: async () => {
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                              setLoading(true);
                              try {
                                await clearCheckedItems(store.id);
                              } finally {
                                setLoading(false);
                              }
                            }
                          }
                        ]
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.error} />
                    <Text style={[styles.clearButtonText, { color: colors.error }]}>Clear</Text>
                  </TouchableOpacity>
                </View>
              )}
              <SwipeableItemRow
                item={item}
                onToggle={handleToggleItem}
                onDelete={handleDeleteItem}
                onInfoPress={handleInfoPress}
                colors={colors}
                disabled={loading}
              />
            </>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyItems}>
            <Ionicons name="basket-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyItemsText, { color: colors.textSecondary }]}>
              No items yet — add some above
            </Text>
          </View>
        }
      />

      {/* ── Item Info/Edit Modal ─────────────── */}
      <Modal
        visible={selectedItem !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <TouchableOpacity 
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setSelectedItem(null)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <Animated.View 
              entering={FadeIn.duration(200)}
              style={[styles.modalContent, elevation(4), { backgroundColor: colors.surface }]}
            >
              <View style={styles.modalHandle} />
              
              {/* Editable item name */}
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Item Name</Text>
                <TextInput
                  style={[styles.modalNameInput, { 
                    backgroundColor: colors.surfaceAlt, 
                    borderColor: colors.borderLight,
                    color: colors.text,
                  }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Item name"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="sentences"
                  returnKeyType="next"
                />
              </View>

              {/* Price input */}
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Price</Text>
                <View style={[styles.modalInputRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
                  <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>$</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    value={editPrice}
                    onChangeText={setEditPrice}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Note input */}
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Note</Text>
                <TextInput
                  style={[styles.modalNoteInput, { 
                    backgroundColor: colors.surfaceAlt, 
                    borderColor: colors.borderLight,
                    color: colors.text,
                  }]}
                  placeholder="Add a note..."
                  placeholderTextColor={colors.textMuted}
                  value={editNote}
                  onChangeText={setEditNote}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { borderColor: colors.border }]}
                  onPress={() => setSelectedItem(null)}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSaveButton, { backgroundColor: colors.primary }]}
                  onPress={handleSaveItemDetails}
                >
                  <Text style={[styles.modalSaveText, { color: colors.textInverse }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Share Modal ──────────────────────── */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <TouchableOpacity 
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowShareModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <Animated.View 
              entering={FadeIn.duration(200)}
              style={[styles.modalContent, elevation(4), { backgroundColor: colors.surface }]}
            >
              <View style={styles.modalHandle} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Share Store</Text>

              {/* Current members */}
              {(store.members?.length || 0) > 1 && (
                <View style={styles.shareSection}>
                  <Text style={[styles.shareSectionTitle, { color: colors.textSecondary }]}>
                    Shared with
                  </Text>
                  {allUsers
                    .filter(u => store.members?.includes(u.uid))
                    .map(u => (
                      <View
                        key={u.uid}
                        style={[styles.userRow, { borderBottomColor: colors.borderLight }]}
                      >
                        <View style={[styles.userAvatar, { backgroundColor: colors.success + '15' }]}>
                          <Ionicons name="person" size={18} color={colors.success} />
                        </View>
                        <View style={styles.userInfo}>
                          <Text style={[styles.userName, { color: colors.text }]}>{u.displayName}</Text>
                          <Text style={[styles.userEmail, { color: colors.textMuted }]}>{u.email}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(
                              'Remove Access',
                              `Stop sharing with ${u.displayName}?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Remove',
                                  style: 'destructive',
                                  onPress: async () => {
                                    try {
                                      const storeRef = doc(db, 'stores', store.id);
                                      await updateDoc(storeRef, {
                                        members: arrayRemove(u.uid)
                                      });
                                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    } catch (error: any) {
                                      Alert.alert('Error', error.message);
                                    }
                                  }
                                }
                              ]
                            );
                          }}
                        >
                          <Ionicons name="close-circle" size={22} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))
                  }
                </View>
              )}

              {/* Add new members */}
              <View style={styles.shareSection}>
                <Text style={[styles.shareSectionTitle, { color: colors.textSecondary }]}>
                  {(store.members?.length || 0) > 1 ? 'Add more people' : 'Select who to share with'}
                </Text>
                {allUsers.filter(u => !store.members?.includes(u.uid)).length === 0 ? (
                  <Text style={[styles.noUsersText, { color: colors.textMuted }]}>
                    {allUsers.length === 0 ? 'No other users found' : 'Already shared with everyone'}
                  </Text>
                ) : (
                  allUsers
                    .filter(u => !store.members?.includes(u.uid))
                    .map(u => (
                      <TouchableOpacity
                        key={u.uid}
                        style={[styles.userRow, { borderBottomColor: colors.borderLight }]}
                        onPress={async () => {
                          try {
                            await shareStoreWithUser(store.id, u.uid);
                            Alert.alert('Shared!', `${u.displayName} can now see this list`);
                          } catch (error: any) {
                            Alert.alert('Error', error.message);
                          }
                        }}
                        disabled={loading}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.userAvatar, { backgroundColor: colors.primary + '15' }]}>
                          <Ionicons name="person-outline" size={18} color={colors.primary} />
                        </View>
                        <View style={styles.userInfo}>
                          <Text style={[styles.userName, { color: colors.text }]}>{u.displayName}</Text>
                          <Text style={[styles.userEmail, { color: colors.textMuted }]}>{u.email}</Text>
                        </View>
                        <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                      </TouchableOpacity>
                    ))
                )}
              </View>

              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: colors.border, marginTop: spacing.lg }]}
                onPress={() => setShowShareModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },

  // ── Header Buttons ─────────────────────────────
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
    marginRight: 4,
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Loading ────────────────────────────────────
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  // ── Not Found ──────────────────────────────────
  notFoundState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  notFoundText: {
    ...typography.body,
  },

  // ── Store Info Card ────────────────────────────
  infoCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 0,
  },
  infoToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  openDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  infoExpandedContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
    gap: spacing.sm + 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoItemText: {
    ...typography.body,
    flex: 1,
  },

  // ── Progress ───────────────────────────────────
  progressSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    ...typography.small,
  },
  progressPercent: {
    ...typography.caption,
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // ── Spending Summary ───────────────────────────
  spendingCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  spendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spendingStat: {
    flex: 1,
    alignItems: 'center',
  },
  spendingAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  spendingLabel: {
    ...typography.small,
    marginTop: 2,
  },
  spendingDivider: {
    width: 1,
    height: 28,
  },
  viewSpendingLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  viewSpendingText: {
    ...typography.small,
    fontWeight: '600',
  },

  // ── Add Item ───────────────────────────────────
  addItemSection: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  addInput: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    ...typography.body,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Section Labels ─────────────────────────────
  sectionLabel: {
    ...typography.small,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  checkedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Empty Items ────────────────────────────────
  emptyItems: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl * 2,
    gap: spacing.md,
  },
  emptyItemsText: {
    ...typography.body,
  },

  // ── Modals ─────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },

  // ── Info Modal Fields ──────────────────────────
  modalField: {
    marginBottom: spacing.lg,
  },
  modalLabel: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  modalNameInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    ...typography.subtitle,
    fontWeight: '600',
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  currencySymbol: {
    ...typography.body,
    marginRight: spacing.xs,
  },
  modalInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    ...typography.body,
  },
  modalNoteInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  modalCancelText: {
    ...typography.button,
  },
  modalSaveButton: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  modalSaveText: {
    ...typography.button,
  },

  // ── Share Modal ────────────────────────────────
  shareSection: {
    marginTop: spacing.md,
  },
  shareSectionTitle: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  noUsersText: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...typography.bodyBold,
  },
  userEmail: {
    ...typography.small,
    marginTop: 1,
  },
});
