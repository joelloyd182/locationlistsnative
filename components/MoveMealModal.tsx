import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme, elevation, spacing, radius, typography } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';

type MoveMealModalProps = {
  visible: boolean;
  mealName: string;
  currentDate: string;
  weekDates: Date[];
  onClose: () => void;
  onSelectDay: (dateString: string) => void;
};

export function MoveMealModal({ 
  visible, 
  mealName, 
  currentDate, 
  weekDates, 
  onClose, 
  onSelectDay 
}: MoveMealModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity 
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <Animated.View 
            entering={FadeIn.duration(200)}
            style={[styles.content, elevation(4), { backgroundColor: colors.surface }]}
          >
            <View style={styles.handle} />

            <Text style={[styles.title, { color: colors.text }]}>Move Meal</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Move "{mealName}" to another day
            </Text>

            <View style={styles.daysGrid}>
              {weekDates.map((date, index) => {
                const dateString = date.toISOString().split('T')[0];
                const isCurrentDay = dateString === currentDate;
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNumber = date.getDate();
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCell,
                      { backgroundColor: colors.surfaceAlt, borderColor: 'transparent' },
                      isToday && { borderColor: colors.primary, borderWidth: 2 },
                      isCurrentDay && { backgroundColor: colors.primary + '10' },
                    ]}
                    onPress={() => {
                      if (!isCurrentDay) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onSelectDay(dateString);
                      }
                    }}
                    disabled={isCurrentDay}
                    activeOpacity={isCurrentDay ? 1 : 0.7}
                  >
                    <Text style={[
                      styles.dayName, 
                      { color: isCurrentDay ? colors.textMuted : isToday ? colors.primary : colors.textSecondary }
                    ]}>
                      {dayName}
                    </Text>
                    <Text style={[
                      styles.dayNumber, 
                      { color: isCurrentDay ? colors.textMuted : isToday ? colors.primary : colors.text }
                    ]}>
                      {dayNumber}
                    </Text>
                    {isCurrentDay && (
                      <View style={[styles.currentBadge, { backgroundColor: colors.textMuted + '20' }]}>
                        <Text style={[styles.currentBadgeText, { color: colors.textMuted }]}>Current</Text>
                      </View>
                    )}
                    {isToday && !isCurrentDay && (
                      <View style={[styles.currentBadge, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.currentBadgeText, { color: colors.primary }]}>Today</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.xl,
  },

  // ── Days Grid ──────────────────────────────────
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    justifyContent: 'center',
  },
  dayCell: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: 1,
  },
  dayName: {
    ...typography.small,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayNumber: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  currentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // ── Cancel ─────────────────────────────────────
  cancelButton: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.button,
  },
});
