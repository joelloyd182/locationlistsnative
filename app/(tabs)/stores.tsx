import { StyleSheet, Text, View, FlatList, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useStores } from '../../context/StoresContext';
import { useTheme, elevation, spacing, radius, typography } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import StoreLogo from '../../components/StoreLogo';
import PageHeader from '../../components/PageHeader';

export default function StoresScreen() {
  const router = useRouter();
  const { stores } = useStores();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'physical' | 'online'>('all');

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setRefreshing(false);
  };

  const filteredStores = stores.filter(s => {
    if (filter === 'physical') return !s.isOnline;
    if (filter === 'online') return s.isOnline;
    return true;
  });

  const sortedStores = [...filteredStores].sort((a, b) => {
    const aPending = a.items.filter(i => !i.checked).length;
    const bPending = b.items.filter(i => !i.checked).length;
    // Stores with pending items first, then alphabetical
    if (aPending > 0 && bPending === 0) return -1;
    if (aPending === 0 && bPending > 0) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={sortedStores}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        keyExtractor={store => store.id}
        contentContainerStyle={[
          styles.listContent,
          stores.length === 0 && styles.emptyListContent,
        ]}
        ListHeaderComponent={
          <View>
            <PageHeader
              title="Stores"
              subtitle={`${filteredStores.length} store${filteredStores.length !== 1 ? 's' : ''}${filter !== 'all' ? ` · ${filter}` : ''}`}
              rightAction={{
                icon: 'add',
                label: 'Add Store',
                onPress: () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/add-store');
                },
              }}
            />

            {/* Filter chips */}
            <View style={styles.filterRow}>
              {([
                { key: 'all', label: 'All', icon: 'grid-outline' },
                { key: 'physical', label: 'Physical', icon: 'storefront-outline' },
                { key: 'online', label: 'Online', icon: 'globe-outline' },
              ] as const).map(f => {
                const isActive = filter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.filterChip,
                      { borderColor: colors.border },
                      isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFilter(f.key);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={f.icon as any} 
                      size={14} 
                      color={isActive ? colors.textInverse : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.filterChipText,
                      { color: isActive ? colors.textInverse : colors.textSecondary },
                    ]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        renderItem={({ item: store, index }) => {
          const totalItems = store.items.length;
          const uncheckedItems = store.items.filter(i => !i.checked).length;
          const checkedItems = totalItems - uncheckedItems;
          const allDone = totalItems > 0 && uncheckedItems === 0;
          const progress = totalItems > 0 ? checkedItems / totalItems : 0;

          return (
            <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
              <TouchableOpacity
                style={[styles.storeCard, elevation(2), { backgroundColor: colors.surface }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/store-detail?id=${store.id}`);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.storeCardBody}>
                  {/* Logo / Icon */}
                  {allDone ? (
                    <View style={[
                      styles.storeIconContainer, 
                      { backgroundColor: colors.successLight }
                    ]}>
                      <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                    </View>
                  ) : (
                    <StoreLogo
                      website={store.website}
                      storeName={store.name}
                      isOnline={store.isOnline}
                      size={44}
                      backgroundColor={colors.primary + '12'}
                      iconColor={colors.primary}
                    />
                  )}

                  {/* Info */}
                  <View style={styles.storeInfo}>
                    <View style={styles.storeNameRow}>
                      <Text style={[styles.storeName, { color: colors.text }]} numberOfLines={1}>
                        {store.name}
                      </Text>
                      {(store.members?.length || 0) > 1 && (
                        <View style={[styles.sharedBadge, { backgroundColor: colors.primary + '15' }]}>
                          <Ionicons name="people" size={11} color={colors.primary} />
                          <Text style={[styles.sharedBadgeText, { color: colors.primary }]}>Shared</Text>
                        </View>
                      )}
                      {allDone && (
                        <View style={[styles.doneBadge, { backgroundColor: colors.success }]}>
                          <Text style={[styles.doneBadgeText, { color: colors.textInverse }]}>Done</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.storeAddress, { color: colors.textMuted }]} numberOfLines={1}>
                      {store.isOnline 
                        ? (store.website || 'Online Store')
                        : (store.address || 'No address set')
                      }
                    </Text>

                    {/* Stats row */}
                    <View style={styles.statsRow}>
                      <View style={styles.stat}>
                        <Ionicons name="cube-outline" size={13} color={colors.textMuted} />
                        <Text style={[styles.statText, { color: colors.textSecondary }]}>
                          {totalItems} item{totalItems !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      {uncheckedItems > 0 && (
                        <View style={styles.stat}>
                          <Ionicons name="ellipse" size={6} color={colors.error} />
                          <Text style={[styles.statTextPending, { color: colors.error }]}>
                            {uncheckedItems} pending
                          </Text>
                        </View>
                      )}
                      {(() => {
                        const priceTotal = store.items
                          .filter(i => i.price != null && i.price > 0)
                          .reduce((sum, i) => sum + (i.price || 0), 0);
                        if (priceTotal <= 0) return null;
                        return (
                          <View style={styles.stat}>
                            <Ionicons name="cash-outline" size={13} color={colors.success} />
                            <Text style={[styles.statText, { color: colors.success, fontWeight: '600' }]}>
                              ${priceTotal.toFixed(2)}
                            </Text>
                          </View>
                        );
                      })()}
                      {!store.isOnline && store.triggerRadius && (
                        <View style={styles.stat}>
                          <Ionicons name="locate-outline" size={13} color={colors.textMuted} />
                          <Text style={[styles.statText, { color: colors.textSecondary }]}>
                            {store.triggerRadius}m
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Progress bar */}
                    {totalItems > 0 && (
                      <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { 
                              backgroundColor: allDone ? colors.success : colors.primary,
                              width: `${progress * 100}%`,
                            }
                          ]} 
                        />
                      </View>
                    )}
                  </View>

                  {/* Chevron */}
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <View style={[styles.emptyState, elevation(1), { backgroundColor: colors.surface }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '12' }]}>
              <Ionicons name="storefront-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No stores yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Add a store to start building your shopping lists
            </Text>
            <TouchableOpacity
              style={[styles.emptyAddButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/add-store')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color={colors.textInverse} />
              <Text style={[styles.emptyAddButtonText, { color: colors.textInverse }]}>Add Your First Store</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },

  // ── List Header ────────────────────────────────
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    ...typography.title,
  },
  headerSubtitle: {
    ...typography.small,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
  },
  addButtonText: {
    ...typography.button,
    fontSize: 14,
  },

  // ── Filter Chips ──────────────────────────────
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  filterChipText: {
    ...typography.small,
    fontWeight: '600',
  },

  // ── Store Card ─────────────────────────────────
  storeCard: {
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
  },
  storeCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  storeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInfo: {
    flex: 1,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  storeName: {
    ...typography.bodyBold,
    flex: 1,
  },
  doneBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  doneBadgeText: {
    ...typography.small,
    fontSize: 10,
    fontWeight: '700',
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  sharedBadgeText: {
    ...typography.small,
    fontSize: 10,
    fontWeight: '700',
  },
  storeAddress: {
    ...typography.small,
    marginTop: 2,
  },

  // ── Stats ──────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...typography.small,
  },
  statTextPending: {
    ...typography.small,
    fontWeight: '600',
  },

  // ── Progress Bar ───────────────────────────────
  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    marginTop: spacing.sm + 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },

  // ── Empty State ────────────────────────────────
  emptyState: {
    borderRadius: radius.xl,
    padding: spacing.xxxl,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
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
    marginBottom: spacing.xl,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
  },
  emptyAddButtonText: {
    ...typography.button,
  },
});
