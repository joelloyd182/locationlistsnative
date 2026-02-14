import { TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, ScrollView, Alert, RefreshControl, TextInput, Keyboard } from 'react-native';
import { useLocation } from '@/hooks/useLocation';
import { useStores } from '../../context/StoresContext';
import { useMealPlan } from '../../context/MealPlanContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { startGeofencing, stopGeofencing, isGeofencingActive } from '../../services/geofencing';
import { useAuth } from '../../context/AuthContext';
import { useTheme, elevation, spacing, radius, typography } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import StoreLogo from '../../components/StoreLogo';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  withDelay,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  Layout,
  SlideInRight,
} from 'react-native-reanimated';

// Debug function to manually trigger geofence notifications
async function debugTriggerGeofence(store: any) {
  try {
    const uncheckedItems = store.items.filter((i: any) => !i.checked);
    if (uncheckedItems.length === 0) return false;

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

// Animated list item component with strikethrough
function AnimatedListItem({ 
  item, 
  storeId, 
  onToggle, 
  colors 
}: { 
  item: any; 
  storeId: string; 
  onToggle: (storeId: string, itemId: string) => void;
  colors: any;
}) {
  const strikeWidth = useSharedValue(item.checked ? 1 : 0);
  const itemOpacity = useSharedValue(item.checked ? 0.5 : 1);

  useEffect(() => {
    strikeWidth.value = withTiming(item.checked ? 1 : 0, { duration: 300 });
    itemOpacity.value = withTiming(item.checked ? 0.5 : 1, { duration: 300 });
  }, [item.checked]);

  const strikeStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: 0,
    top: '50%' as any,
    height: 2,
    width: `${strikeWidth.value * 100}%`,
    backgroundColor: colors.error,
    borderRadius: 1,
    transform: [{ translateY: -1 }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: itemOpacity.value,
  }));

  return (
    <Animated.View layout={Layout.springify()}>
      <TouchableOpacity
        style={[styles.listItem, { backgroundColor: colors.surface }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle(storeId, item.id);
        }}
        activeOpacity={0.7}
      >
        {/* Checkbox */}
        <View style={[
          styles.checkbox,
          { borderColor: item.checked ? colors.success : colors.border },
          item.checked && { backgroundColor: colors.success, borderColor: colors.success }
        ]}>
          {item.checked && (
            <Ionicons name="checkmark" size={14} color={colors.textInverse} />
          )}
        </View>
        
        {/* Item text with animated strikethrough */}
        <View style={styles.listItemTextContainer}>
          <Animated.Text 
            style={[
              styles.listItemText, 
              { color: item.checked ? colors.textMuted : colors.text },
              textStyle,
            ]}
          >
            {item.text}
          </Animated.Text>
          <Animated.View style={strikeStyle} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { stores, toggleItem, addItem } = useStores();
  const { meals } = useMealPlan();
  const router = useRouter();
  const [geofencingActive, setGeofencingActive] = useState(false);
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showDebugMode, setShowDebugMode] = useState(false);
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());
  
  // Quick add state
  const [quickAddText, setQuickAddText] = useState('');
  const [quickAddStore, setQuickAddStore] = useState<string | null>(null);
  const [showStorePicker, setShowStorePicker] = useState(false);
  const quickAddRef = useRef<TextInput>(null);

  useEffect(() => {
    checkGeofencingStatus();
  }, []);
  
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  // Auto-select first store for quick add
  useEffect(() => {
    if (stores.length > 0 && !quickAddStore) {
      setQuickAddStore(stores[0].id);
    }
  }, [stores]);

  const requestNotificationPermissions = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus !== 'granted') {
        await Notifications.requestPermissionsAsync();
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
    await toggleItem(storeId, itemId);
  };

  const handleQuickAdd = async () => {
    if (!quickAddText.trim() || !quickAddStore) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addItem(quickAddStore, quickAddText.trim());
    setQuickAddText('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.email?.split('@')[0] || 'there';

  // Get stores with pending items
  const storesWithPendingItems = stores
    .map(store => ({
      ...store,
      pendingCount: store.items.filter(i => !i.checked).length
    }))
    .filter(store => store.pendingCount > 0)
    .sort((a, b) => b.pendingCount - a.pendingCount);

  const totalPending = storesWithPendingItems.reduce((sum, s) => sum + s.pendingCount, 0);
  
  const selectedStoreName = stores.find(s => s.id === quickAddStore)?.name || 'Select store';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              setShowDebugMode(!showDebugMode);
              Alert.alert(showDebugMode ? 'Debug Off' : 'Debug On');
            }}
            style={styles.headerContent}
          >
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => {
                Alert.alert(
                  'Account',
                  `${user?.email}`,
                  [
                    { text: 'Sign Out', style: 'destructive', onPress: async () => await signOut() },
                    { text: 'Close', style: 'cancel' }
                  ]
                );
              }}
            >
              <Ionicons name="person-circle-outline" size={32} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Summary pill */}
          {totalPending > 0 && (
            <View style={styles.summaryPill}>
              <Ionicons name="cart-outline" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.summaryText}>
                {totalPending} item{totalPending !== 1 ? 's' : ''} across {storesWithPendingItems.length} store{storesWithPendingItems.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Quick Add Section */}
        <Animated.View 
          entering={FadeInDown.delay(100).duration(400)}
          style={[styles.quickAddSection, elevation(2)]}
        >
          <View style={[styles.quickAddCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.quickAddTitle, { color: colors.text }]}>Quick Add</Text>
            
            {/* Store selector */}
            <TouchableOpacity
              style={[styles.storeSelector, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}
              onPress={() => setShowStorePicker(!showStorePicker)}
            >
              <Ionicons name="storefront-outline" size={16} color={colors.primary} />
              <Text style={[styles.storeSelectorText, { color: colors.text }]} numberOfLines={1}>
                {selectedStoreName}
              </Text>
              <Ionicons 
                name={showStorePicker ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={colors.textMuted} 
              />
            </TouchableOpacity>

            {/* Store picker dropdown */}
            {showStorePicker && (
              <Animated.View 
                entering={FadeIn.duration(200)}
                style={[styles.storePickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                {stores.map(store => (
                  <TouchableOpacity
                    key={store.id}
                    style={[
                      styles.storePickerItem,
                      quickAddStore === store.id && { backgroundColor: colors.primaryLight + '15' }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setQuickAddStore(store.id);
                      setShowStorePicker(false);
                    }}
                  >
                    <Text style={[
                      styles.storePickerText,
                      { color: quickAddStore === store.id ? colors.primary : colors.text }
                    ]}>
                      {store.name}
                    </Text>
                    {quickAddStore === store.id && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </Animated.View>
            )}

            {/* Input row */}
            <View style={styles.quickAddInputRow}>
              <TextInput
                ref={quickAddRef}
                style={[styles.quickAddInput, { 
                  backgroundColor: colors.surfaceAlt, 
                  borderColor: colors.borderLight,
                  color: colors.text,
                }]}
                placeholder="Add an item..."
                placeholderTextColor={colors.textMuted}
                value={quickAddText}
                onChangeText={setQuickAddText}
                onSubmitEditing={handleQuickAdd}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[
                  styles.quickAddButton, 
                  { backgroundColor: quickAddText.trim() ? colors.primary : colors.border }
                ]}
                onPress={handleQuickAdd}
                disabled={!quickAddText.trim()}
              >
                <Ionicons name="add" size={22} color={colors.textInverse} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Geofencing Toggle */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <TouchableOpacity 
            style={[
              styles.trackingToggle, 
              elevation(1),
              { 
                backgroundColor: colors.surface,
                borderLeftColor: geofencingActive ? colors.success : colors.border,
                borderLeftWidth: 4,
              }
            ]}
            onPress={toggleGeofencing}
            activeOpacity={0.7}
          >
            <View style={[
              styles.trackingDot,
              { backgroundColor: geofencingActive ? colors.success : colors.textMuted }
            ]} />
            <View style={styles.trackingInfo}>
              <Text style={[styles.trackingTitle, { color: colors.text }]}>
                Location Tracking
              </Text>
              <Text style={[styles.trackingSubtitle, { color: colors.textSecondary }]}>
                {geofencingActive ? 'Active — notifications on arrival' : 'Tap to enable store alerts'}
              </Text>
            </View>
            <Ionicons 
              name={geofencingActive ? "notifications" : "notifications-off-outline"} 
              size={20} 
              color={geofencingActive ? colors.success : colors.textMuted} 
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Debug Panel */}
        {showDebugMode && (
          <Animated.View entering={FadeIn.duration(300)} style={[styles.debugPanel, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
            <View style={styles.debugHeader}>
              <Text style={[styles.debugTitle, { color: colors.error }]}>🧪 DEBUG MODE</Text>
              <TouchableOpacity onPress={() => setShowDebugMode(false)}>
                <Ionicons name="close" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[styles.debugButton, { backgroundColor: colors.surface }]}
              onPress={async () => {
                const success = await debugTestNotification();
                Alert.alert(success ? 'Test Sent!' : 'Failed');
              }}
            >
              <Text style={[styles.debugButtonText, { color: colors.text }]}>📱 Test Notification</Text>
            </TouchableOpacity>

            <Text style={[styles.debugSectionLabel, { color: colors.textSecondary }]}>Trigger Geofence:</Text>
            {stores.map(store => {
              const uncheckedCount = store.items.filter((i: any) => !i.checked).length;
              return (
                <TouchableOpacity
                  key={store.id}
                  style={[styles.debugStoreButton, { backgroundColor: colors.surface }, uncheckedCount === 0 && { opacity: 0.4 }]}
                  onPress={async () => {
                    const success = await debugTriggerGeofence(store);
                    Alert.alert(success ? 'Sent!' : 'No items', success ? `Simulated ${store.name}` : 'No unchecked items');
                  }}
                  disabled={uncheckedCount === 0}
                >
                  <Text style={[styles.debugStoreName, { color: colors.text }]}>{store.name}</Text>
                  <Text style={[styles.debugStoreCount, { color: colors.textMuted }]}>
                    {uncheckedCount > 0 ? `${uncheckedCount} items` : '✓'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        {/* Shopping Lists */}
        <View style={styles.listsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Shopping Lists
          </Text>

          {storesWithPendingItems.length === 0 ? (
            <Animated.View 
              entering={FadeIn.duration(400)}
              style={[styles.emptyState, elevation(1), { backgroundColor: colors.surface }]}
            >
              <View style={[styles.emptyIcon, { backgroundColor: colors.successLight }]}>
                <Ionicons name="checkmark-circle" size={32} color={colors.success} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>All caught up!</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                No pending items. Use quick add above to start a list.
              </Text>
            </Animated.View>
          ) : (
            storesWithPendingItems.map((store, index) => {
              const isExpanded = expandedStores.has(store.id);
              const uncheckedItems = store.items.filter((i: any) => !i.checked);
              const checkedItems = store.items.filter((i: any) => i.checked);

              return (
                <Animated.View
                  key={store.id}
                  entering={FadeInDown.delay(index * 80).duration(400)}
                  style={[styles.storeCard, elevation(2), { backgroundColor: colors.surface }]}
                >
                  {/* Store Header */}
                  <TouchableOpacity
                    style={styles.storeCardHeader}
                    onPress={() => toggleStoreExpansion(store.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.storeCardLeft}>
                      <StoreLogo
                        website={store.website}
                        storeName={store.name}
                        isOnline={store.isOnline}
                        size={40}
                        backgroundColor={colors.primary + '12'}
                        iconColor={colors.primary}
                      />
                      <View style={styles.storeCardInfo}>
                        <Text style={[styles.storeCardName, { color: colors.text }]} numberOfLines={1}>
                          {store.name}
                        </Text>
                        <Text style={[styles.storeCardMeta, { color: colors.textMuted }]}>
                          {store.pendingCount} item{store.pendingCount !== 1 ? 's' : ''} remaining
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.storeCardRight}>
                      <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.countBadgeText, { color: colors.textInverse }]}>
                          {store.pendingCount}
                        </Text>
                      </View>
                      <Ionicons 
                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                        size={18} 
                        color={colors.textMuted} 
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Expandable Item List */}
                  {isExpanded && (
                    <Animated.View 
                      entering={FadeIn.duration(200)}
                      style={[styles.storeCardItems, { borderTopColor: colors.borderLight }]}
                    >
                      {/* Unchecked items */}
                      {uncheckedItems.map((item: any) => (
                        <AnimatedListItem
                          key={item.id}
                          item={item}
                          storeId={store.id}
                          onToggle={handleToggleItem}
                          colors={colors}
                        />
                      ))}

                      {/* Checked items (collapsed) */}
                      {checkedItems.length > 0 && (
                        <View style={[styles.checkedDivider, { borderTopColor: colors.borderLight }]}>
                          <Text style={[styles.checkedLabel, { color: colors.textMuted }]}>
                            {checkedItems.length} completed
                          </Text>
                        </View>
                      )}
                      {checkedItems.map((item: any) => (
                        <AnimatedListItem
                          key={item.id}
                          item={item}
                          storeId={store.id}
                          onToggle={handleToggleItem}
                          colors={colors}
                        />
                      ))}

                      {/* View full list */}
                      <TouchableOpacity
                        style={[styles.viewFullButton, { borderTopColor: colors.borderLight }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push(`/store-detail?id=${store.id}`);
                        }}
                      >
                        <Text style={[styles.viewFullText, { color: colors.primary }]}>
                          View full list
                        </Text>
                        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    </Animated.View>
                  )}
                </Animated.View>
              );
            })
          )}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },

  // ── Header ──────────────────────────────────────
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    ...typography.body,
    color: 'rgba(255,255,255,0.75)',
  },
  userName: {
    ...typography.hero,
    color: '#FFFFFF',
    marginTop: 2,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  summaryText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.9)',
  },

  // ── Quick Add ──────────────────────────────────
  quickAddSection: {
    marginHorizontal: spacing.lg,
    marginTop: -spacing.lg,
  },
  quickAddCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  quickAddTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.md,
  },
  storeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  storeSelectorText: {
    ...typography.caption,
    flex: 1,
  },
  storePickerDropdown: {
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  storePickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  storePickerText: {
    ...typography.body,
  },
  quickAddInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAddInput: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    ...typography.body,
  },
  quickAddButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Tracking Toggle ────────────────────────────
  trackingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trackingInfo: {
    flex: 1,
  },
  trackingTitle: {
    ...typography.bodyBold,
  },
  trackingSubtitle: {
    ...typography.small,
    marginTop: 1,
  },

  // ── Debug Panel ────────────────────────────────
  debugPanel: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  debugTitle: {
    ...typography.bodyBold,
  },
  debugButton: {
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  debugButtonText: {
    ...typography.bodyBold,
  },
  debugSectionLabel: {
    ...typography.small,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  debugStoreButton: {
    padding: spacing.sm + 2,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debugStoreName: {
    ...typography.caption,
  },
  debugStoreCount: {
    ...typography.small,
  },

  // ── Shopping Lists ─────────────────────────────
  listsSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.title,
    marginBottom: spacing.lg,
  },

  // ── Empty State ────────────────────────────────
  emptyState: {
    borderRadius: radius.xl,
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.subtitle,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Store Card ─────────────────────────────────
  storeCard: {
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  storeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  storeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  storeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeCardInfo: {
    flex: 1,
  },
  storeCardName: {
    ...typography.bodyBold,
  },
  storeCardMeta: {
    ...typography.small,
    marginTop: 2,
  },
  storeCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  countBadgeText: {
    ...typography.small,
    fontWeight: '700',
  },

  // ── List Items ─────────────────────────────────
  storeCardItems: {
    borderTopWidth: 1,
    paddingVertical: spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemTextContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  listItemText: {
    ...typography.body,
  },

  // ── Checked Divider ────────────────────────────
  checkedDivider: {
    borderTopWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  checkedLabel: {
    ...typography.small,
  },

  // ── View Full Button ───────────────────────────
  viewFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.xs,
  },
  viewFullText: {
    ...typography.button,
  },
});
