// MoveMealModal.tsx - Create this new component

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

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
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Move "{mealName}"
          </Text>
          <Text style={[styles.subtitle, { color: colors.textLight }]}>
            Select which day to move this meal to:
          </Text>

          <View style={styles.daysList}>
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
                    styles.dayButton,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    isCurrentDay && { opacity: 0.5 },
                    isToday && { borderColor: colors.primary, borderWidth: 2 }
                  ]}
                  onPress={() => {
                    if (!isCurrentDay) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onSelectDay(dateString);
                    }
                  }}
                  disabled={isCurrentDay}
                >
                  <Text style={[styles.dayName, { color: colors.text }]}>
                    {dayName}
                  </Text>
                  <Text style={[styles.dayNumber, { color: colors.text }]}>
                    {dayNumber}
                  </Text>
                  {isCurrentDay && (
                    <Text style={[styles.currentLabel, { color: colors.textLight }]}>
                      (current)
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.textLight }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  daysList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  dayButton: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  currentLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  cancelButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
