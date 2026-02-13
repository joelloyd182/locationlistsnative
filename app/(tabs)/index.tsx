import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, ScrollView, Alert, RefreshControl } from 'react-native';
import { useLocation } from '@/hooks/useLocation';
import { useStores } from '../../context/StoresContext';
import { useMealPlan } from '../../context/MealPlanContext';
import { useState, useEffect } from 'react';
import { startGeofencing, stopGeofencing, isGeofencingActive } from '../../services/geofencing';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

// Debug function to manually trigger geofence notifications
async function debugTriggerGeofence(store) {
  try {
    const uncheckedItems = store.items.filter(i => !i.checked);
    
    if (uncheckedItems.length === 0) {
      return false;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🛒 [DEBUG] You're at ${store.name}!`,
        body: `You have ${uncheckedItems.length} items to get`,
        data: { storeId: store.id, debug: true },
      },
      trigger: null,
    });
    
    return true;
  } catch (error) {
    console.error('DEBUG: Failed to trigger notification:', error);
    return false;
  }
}

async function debugTestNotification() {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Test Notification',
        body: 'If you see this, notifications are working!',
        data: { test: true },
      },
      trigger: null,
    });
    return true;
  } catch (error) {
    console.error('Test notification failed:', error);
    return false;
  }
}

export default function HomeScreen() {
  const { stores, toggleItem } = useStores();
  const { meals } = useMealPlan();
  const router = useRouter();
  const [geofencingActive, setGeofencingActive] = useState(false);
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showDebugMode, setShowDebugMode] = useState(false);
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkGeofencingStatus();
  }, []);
  
  useEffect(() => {
  requestNotificationPermissions();
}, []);

const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    if (existingStatus !== 'granted') {
      console.log('Notification permissions not granted, requesting...');
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status === 'granted') {
        console.log('Notification permissions granted!');
      } else {
        console.log('Notification permissions denied');
      }
    } else {
      console.log('Notification permissions already granted');
    }
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
  }
};

  const checkGeofencingStatus = async () => {
    const active = await isGeofencingActive();
    setGeofencingActive(active);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkGeofencingStatus();
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  const toggleGeofencing = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (geofencingActive) {
      await stopGeofencing();
      setGeofencingActive(false);
    } else {
      const success = await startGeofencing();
      setGeofencingActive(success);
    }
  };

  const toggleStoreExpansion = (storeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newExpanded = new Set(expandedStores);
    if (newExpanded.has(storeId)) {
      newExpanded.delete(storeId);
    } else {
      newExpanded.add(storeId);
    }
    setExpandedStores(newExpanded);
  };

  const handleToggleItem = async (storeId: string, itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleItem(storeId, itemId);
  };

  // Calculate stats
  const pendingItems = stores.reduce((sum, store) => 
    sum + store.items.filter(item => !item.checked).length, 0
  );
  const completedThisWeek = stores.reduce((sum, store) => 
    sum + store.items.filter(item => item.checked).length, 0
  );
  
  // Get this week's meals
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    weekDates.push(date.toISOString().split('T')[0]);
  }
  const mealsThisWeek = meals.filter(meal => weekDates.includes(meal.date));

  // Get top 5 stores with pending items
  const storesWithPendingItems = stores
    .map(store => ({
      ...store,
      pendingCount: store.items.filter(i => !i.checked).length
    }))
    .filter(store => store.pendingCount > 0)
    .sort((a, b) => b.pendingCount - a.pendingCount)
    .slice(0, 5);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={{ paddingBottom: 100 }}
	  contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header with long-press debug toggle */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setShowDebugMode(!showDebugMode);
            Alert.alert(showDebugMode ? 'Debug Off' : 'Debug On', showDebugMode ? 'Debug mode disabled' : 'Long-press title again to hide');
          }}
        >
          <Text style={[styles.title, { color: colors.primary }]}>🛒 Location Lists</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.accountButton, { backgroundColor: colors.secondary }]}
          onPress={async () => {
            Alert.alert(
              'Account',
              `${user?.email}\n\nUser ID: ${user?.uid}`,
              [
                { 
                  text: 'Sign Out', 
                  style: 'destructive',
                  onPress: async () => await signOut()
                },
                { text: 'Close', style: 'cancel' }
              ]
            );
          }}
        >
          <Text style={[styles.accountText, { color: colors.text }]}>👤 {user?.email?.split('@')[0]}</Text>
        </TouchableOpacity>
      </View>

      {/* Debug Panel */}
      {showDebugMode && (
        <View style={[styles.debugPanel, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
          <View style={styles.debugHeader}>
            <Text style={[styles.debugTitle, { color: colors.error }]}>🧪 DEBUG MODE</Text>
            <TouchableOpacity onPress={() => setShowDebugMode(false)}>
              <Text style={[styles.debugClose, { color: colors.error }]}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.debugButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const success = await debugTestNotification();
              Alert.alert(
                success ? 'Test Sent!' : 'Failed',
                success ? 'Check your notifications!' : 'Could not send notification'
              );
            }}
          >
            <Text style={[styles.debugButtonText, { color: colors.text }]}>📱 Test Notification</Text>
          </TouchableOpacity>

          <Text style={[styles.debugSectionTitle, { color: colors.text }]}>Trigger Geofence:</Text>
          
          {stores.map(store => {
            const uncheckedCount = store.items.filter(i => !i.checked).length;
            return (
              <TouchableOpacity
                key={store.id}
                style={[
                  styles.debugStoreButton, 
                  { backgroundColor: colors.card, borderColor: colors.border },
                  uncheckedCount === 0 && { opacity: 0.5 }
                ]}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  const success = await debugTriggerGeofence(store);
                  if (success) {
                    Alert.alert('Notification Sent!', `Simulated entering ${store.name}`);
                  } else {
                    Alert.alert('No Items', `${store.name} has no unchecked items`);
                  }
                }}
                disabled={uncheckedCount === 0}
              >
                <Text style={[styles.debugStoreName, { color: colors.text }]}>{store.name}</Text>
                <Text style={[styles.debugStoreItems, { color: colors.textLight }]}>
                  {uncheckedCount > 0 ? `${uncheckedCount} items` : 'All done ✓'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{stores.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textLight }]}>Stores</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{pendingItems}</Text>
          <Text style={[styles.statLabel, { color: colors.textLight }]}>Items</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{completedThisWeek}</Text>
          <Text style={[styles.statLabel, { color: colors.textLight }]}>Done</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{mealsThisWeek.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textLight }]}>Meals</Text>
        </View>
      </View>

      {/* Tracking Toggle - Smaller, subtle */}
      <View style={styles.trackingContainer}>
        <TouchableOpacity 
          style={[
            styles.trackingButton, 
            { 
              backgroundColor: geofencingActive ? colors.success + '15' : colors.card,
              borderColor: geofencingActive ? colors.success : colors.border 
            }
          ]}
          onPress={toggleGeofencing}
        >
          <Text style={styles.trackingIcon}>{geofencingActive ? '🔔' : '🔕'}</Text>
          <Text style={[styles.trackingText, { color: colors.text }]}>
            {geofencingActive ? 'Tracking Active' : 'Start Tracking'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Lists Section */}
      <View style={styles.listsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Lists</Text>
        
        {storesWithPendingItems.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyStateText, { color: colors.textLight }]}>
              🎉 All done! No pending items.
            </Text>
          </View>
        ) : (
          storesWithPendingItems.map(store => {
            const isExpanded = expandedStores.has(store.id);
            const uncheckedItems = store.items.filter(i => !i.checked);
            
            return (
              <View 
                key={store.id} 
                style={[styles.quickListCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                {/* Store Header - Tappable to expand/collapse */}
                <TouchableOpacity
                  style={styles.quickListHeader}
                  onPress={() => toggleStoreExpansion(store.id)}
                >
                  <View style={styles.quickListTitleRow}>
                    <Text style={[styles.quickListStoreName, { color: colors.text }]}>
                      {store.name}
                    </Text>
                    <View style={styles.quickListBadgeRow}>
                      <View style={[styles.quickListBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.quickListBadgeText, { color: colors.primary }]}>
                          {store.pendingCount}
                        </Text>
                      </View>
                      <Text style={[styles.expandIcon, { color: colors.textLight }]}>
                        {isExpanded ? '▼' : '▶'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Expandable Item List */}
                {isExpanded && (
                  <View style={styles.quickListItems}>
                    {uncheckedItems.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.quickListItem, { borderTopColor: colors.border }]}
                        onPress={() => handleToggleItem(store.id, item.id)}
                      >
                        <View style={[styles.checkbox, { borderColor: colors.border }]}>
                          {item.checked && (
                            <Text style={[styles.checkmark, { color: colors.success }]}>✓</Text>
                          )}
                        </View>
                        <Text style={[styles.quickListItemText, { color: colors.text }]}>
                          {item.text}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    
                    {/* View Full List Button */}
                    <TouchableOpacity
                      style={[styles.viewFullButton, { borderTopColor: colors.border }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/store-detail?id=${store.id}`);
                      }}
                    >
                      <Text style={[styles.viewFullButtonText, { color: colors.primary }]}>
                        View Full List →
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    padding: 12,
    paddingTop: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  accountButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  accountText: {
    fontSize: 11,
  },
  debugPanel: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  debugClose: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  debugButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 12,
    alignItems: 'center',
  },
  debugButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  debugSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  debugStoreButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debugStoreName: {
    fontSize: 14,
    fontWeight: '600',
  },
  debugStoreItems: {
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  trackingContainer: {
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    gap: 8,
  },
  trackingIcon: {
    fontSize: 16,
  },
  trackingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listsSection: {
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  quickListCard: {
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 10,
    overflow: 'hidden',
  },
  quickListHeader: {
    padding: 14,
  },
  quickListTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickListStoreName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  quickListBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickListBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quickListBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  expandIcon: {
    fontSize: 12,
  },
  quickListItems: {
    borderTopWidth: 2,
  },
  quickListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 14,
    gap: 12,
    borderTopWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  quickListItemText: {
    fontSize: 15,
    flex: 1,
  },
  viewFullButton: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 2,
  },
  viewFullButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
