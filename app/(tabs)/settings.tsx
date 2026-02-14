import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform, TextInput } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, THEMES, THEME_NAMES, ThemeId, elevation, spacing, radius, typography } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useState, useEffect } from 'react';
import { DataManagementSection } from '../../components/DataManagementSection';
import { useWeekStart, WEEK_START_OPTIONS, WeekStartDay } from '../../context/WeekStartContext';
import { useBudget, BudgetPeriod } from '../../context/BudgetContext';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

// ── Section Header Component ─────────────────────
function SectionHeader({ icon, title, subtitle, colors }: { 
  icon: string; title: string; subtitle?: string; colors: any 
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconContainer, { backgroundColor: colors.primary + '12' }]}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
      </View>
      <View style={styles.sectionHeaderText}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
}

// ── Info Row Component ───────────────────────────
function InfoRow({ label, value, valueColor, icon, onPress, colors, isLast = false }: {
  label: string; value: string; valueColor?: string; icon?: string;
  onPress?: () => void; colors: any; isLast?: boolean;
}) {
  const content = (
    <View style={[
      styles.infoRow,
      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }
    ]}>
      <Text style={[styles.infoLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.infoValueRow}>
        <Text style={[
          styles.infoValue, 
          { color: valueColor || colors.textSecondary }
        ]} numberOfLines={1}>
          {value}
        </Text>
        {icon && <Ionicons name={icon as any} size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />}
      </View>
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }
  return content;
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { themeId, colors, setTheme } = useTheme();
  const { weekStartDay, setWeekStartDay } = useWeekStart();
  const { budgetTarget, budgetPeriod, setBudgetTarget, setBudgetPeriod } = useBudget();
  const router = useRouter();
  const [notificationStatus, setNotificationStatus] = useState<string>('checking...');

  useEffect(() => {
    checkNotificationPermissions();
  }, []);

  const checkNotificationPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationStatus(status);
  };

  const selectTheme = async (newThemeId: ThemeId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setTheme(newThemeId);
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: async () => await signOut() }
      ]
    );
  };

  const handleNotificationPermissions = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const { status: currentStatus } = await Notifications.getPermissionsAsync();
    
    if (currentStatus === 'granted') {
      Alert.alert('Notifications Enabled', 'Notifications are already enabled for this app.');
      return;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    
    if (status === 'granted') {
      setNotificationStatus(status);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success!', "You'll now receive alerts when you arrive at stores.");
    } else {
      Alert.alert(
        'Notifications Disabled',
        'To enable notifications, go to your phone Settings → Apps → Location Lists → Notifications'
      );
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Account Section ──────────────────── */}
      <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.section}>
        <SectionHeader icon="person-outline" title="Account" colors={colors} />
        <View style={[styles.card, elevation(2), { backgroundColor: colors.surface }]}>
          <InfoRow 
            label="Email" 
            value={user?.email || 'Not signed in'} 
            colors={colors}
          />
          <InfoRow 
            label="User ID" 
            value={user?.uid || '—'} 
            colors={colors}
            isLast
          />
        </View>
      </Animated.View>

      {/* ── Notifications Section ────────────── */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
        <SectionHeader 
          icon="notifications-outline" 
          title="Notifications" 
          subtitle="Get alerts when you arrive at stores"
          colors={colors} 
        />
        <View style={[styles.card, elevation(2), { backgroundColor: colors.surface }]}>
          <InfoRow 
            label="Status" 
            value={notificationStatus === 'granted' ? 'Enabled' : 'Disabled'}
            valueColor={notificationStatus === 'granted' ? colors.success : colors.error}
            colors={colors}
            isLast
          />
        </View>
        
        {notificationStatus !== 'granted' && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.primary }]} 
            onPress={handleNotificationPermissions}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications" size={18} color={colors.textInverse} />
            <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>Enable Notifications</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Location tracking is controlled from the Home screen
        </Text>
      </Animated.View>

      {/* ── Week Settings Section ────────────── */}
      <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.section}>
        <SectionHeader 
          icon="calendar-outline" 
          title="Week Start" 
          subtitle="Choose which day your shopping week begins"
          colors={colors} 
        />
        <View style={[styles.card, elevation(2), { backgroundColor: colors.surface }]}>
          {WEEK_START_OPTIONS.map((option, index) => {
            const isSelected = weekStartDay === option.value;
            const isLast = index === WEEK_START_OPTIONS.length - 1;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.weekDayRow,
                  !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                ]}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  await setWeekStartDay(option.value as WeekStartDay);
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.weekDayLabel,
                  { color: isSelected ? colors.primary : colors.text }
                ]}>
                  {option.label}
                </Text>
                {isSelected && (
                  <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={14} color={colors.textInverse} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {/* ── Budget Section ─────────────────────── */}
      <Animated.View entering={FadeInDown.delay(175).duration(400)} style={styles.section}>
        <SectionHeader 
          icon="wallet-outline" 
          title="Budget" 
          subtitle="Set a spending target to track your grocery costs"
          colors={colors} 
        />
        <View style={[styles.card, elevation(2), { backgroundColor: colors.surface }]}>
          <View style={[styles.budgetRow, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.budgetRowLabel, { color: colors.text }]}>Target Amount</Text>
            <View style={styles.budgetInputRow}>
              <Text style={[styles.budgetCurrency, { color: colors.textMuted }]}>$</Text>
              <TextInput
                style={[styles.budgetInput, { color: colors.text }]}
                value={budgetTarget !== null ? budgetTarget.toString() : ''}
                onChangeText={(text) => {
                  const num = parseFloat(text);
                  if (text === '') {
                    setBudgetTarget(null);
                  } else if (!isNaN(num) && num >= 0) {
                    setBudgetTarget(num);
                  }
                }}
                keyboardType="decimal-pad"
                placeholder="No limit"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
          <View style={styles.budgetRow}>
            <Text style={[styles.budgetRowLabel, { color: colors.text }]}>Period</Text>
            <View style={styles.budgetPeriodButtons}>
              {(['weekly', 'monthly'] as const).map((period) => {
                const isActive = budgetPeriod === period;
                return (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.budgetPeriodButton,
                      { backgroundColor: isActive ? colors.primary : colors.surfaceAlt }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setBudgetPeriod(period);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.budgetPeriodText,
                      { color: isActive ? colors.textInverse : colors.textSecondary }
                    ]}>
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.viewSpendingRow, { borderTopWidth: 1, borderTopColor: colors.borderLight }]}
            onPress={() => router.push('/spending')}
            activeOpacity={0.7}
          >
            <Ionicons name="analytics-outline" size={18} color={colors.primary} />
            <Text style={[styles.viewSpendingLabel, { color: colors.primary }]}>View Spending Details</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Theme Section ────────────────────── */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
        <SectionHeader 
          icon="color-palette-outline" 
          title="Theme" 
          subtitle="Changes apply instantly"
          colors={colors} 
        />
        <View style={styles.themesGrid}>
          {(Object.keys(THEMES) as ThemeId[]).map((id, index) => {
            const theme = THEMES[id];
            const isSelected = themeId === id;
            const isDark = id === 'midnight';
            
            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.themeCard,
                  elevation(isSelected ? 3 : 1),
                  { backgroundColor: colors.surface },
                  isSelected && { borderWidth: 2, borderColor: theme.primary }
                ]}
                onPress={() => selectTheme(id)}
                activeOpacity={0.7}
              >
                {/* Mini preview */}
                <View style={[styles.themePreview, { backgroundColor: theme.background }]}>
                  {/* Fake mini header gradient */}
                  <LinearGradient
                    colors={theme.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.themePreviewHeader}
                  />
                  {/* Fake content lines */}
                  <View style={styles.themePreviewContent}>
                    <View style={[styles.themePreviewLine, { backgroundColor: theme.surface, width: '80%' }]} />
                    <View style={[styles.themePreviewLine, { backgroundColor: theme.surface, width: '60%' }]} />
                  </View>
                </View>
                
                {/* Color dots */}
                <View style={styles.themeColorDots}>
                  <View style={[styles.colorDot, { backgroundColor: theme.primary }]} />
                  <View style={[styles.colorDot, { backgroundColor: theme.secondary }]} />
                  <View style={[styles.colorDot, { backgroundColor: theme.accent }]} />
                </View>
                
                {/* Name + check */}
                <View style={styles.themeNameRow}>
                  <Text style={[styles.themeName, { color: colors.text }]}>
                    {THEME_NAMES[id]}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {/* ── Data Management Section ──────────── */}
      <Animated.View entering={FadeInDown.delay(250).duration(400)}>
        <DataManagementSection />
      </Animated.View>

      {/* ── About Section ────────────────────── */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
        <SectionHeader icon="information-circle-outline" title="About" colors={colors} />
        <View style={[styles.card, elevation(2), { backgroundColor: colors.surface }]}>
          <InfoRow label="Version" value="1.0.0" colors={colors} />
          <InfoRow label="Build" value="Development" colors={colors} isLast />
        </View>
      </Animated.View>

      {/* ── Sign Out ─────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.section}>
        <TouchableOpacity 
          style={[styles.signOutButton, { backgroundColor: colors.errorLight, borderColor: colors.error }]} 
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>Made by Kooky Rooster Media 🐓</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },

  // ── Sections ───────────────────────────────────
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.subtitle,
  },
  sectionSubtitle: {
    ...typography.small,
    marginTop: 1,
  },

  // ── Cards ──────────────────────────────────────
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },

  // ── Info Rows ──────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  infoLabel: {
    ...typography.bodyBold,
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    marginLeft: spacing.lg,
  },
  infoValue: {
    ...typography.body,
    textAlign: 'right',
    flexShrink: 1,
  },

  // ── Action Buttons ─────────────────────────────
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  actionButtonText: {
    ...typography.button,
  },
  hint: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },

  // ── Week Day Rows ──────────────────────────────
  weekDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  weekDayLabel: {
    ...typography.body,
    fontWeight: '500',
  },
  selectedIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Budget Settings ─────────────────────────────
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
  },
  budgetRowLabel: {
    ...typography.body,
  },
  budgetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetCurrency: {
    ...typography.body,
    fontWeight: '600',
    marginRight: 2,
  },
  budgetInput: {
    ...typography.body,
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 80,
    paddingVertical: spacing.sm,
  },
  budgetPeriodButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  budgetPeriodButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
  },
  budgetPeriodText: {
    ...typography.caption,
    fontWeight: '600',
  },
  viewSpendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
  },
  viewSpendingLabel: {
    ...typography.bodyBold,
    flex: 1,
  },

  // ── Theme Picker ───────────────────────────────
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  themeCard: {
    width: '47%',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  themePreview: {
    height: 56,
    overflow: 'hidden',
  },
  themePreviewHeader: {
    height: 20,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
  },
  themePreviewContent: {
    padding: spacing.sm,
    gap: 4,
  },
  themePreviewLine: {
    height: 6,
    borderRadius: 3,
  },
  themeColorDots: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  themeNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  themeName: {
    ...typography.caption,
    fontWeight: '600',
  },

  // ── Sign Out ───────────────────────────────────
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  signOutText: {
    ...typography.button,
  },

  // ── Footer ─────────────────────────────────────
  footer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  footerText: {
    ...typography.small,
  },
});
