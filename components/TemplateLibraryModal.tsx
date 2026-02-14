import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Modal, Platform } from 'react-native';
import { useTemplates } from '../context/TemplatesContext';
import { useMealPlan } from '../context/MealPlanContext';
import { useTheme, elevation, spacing, radius, typography } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { detectIngredientEmoji } from '../utils/emoji-detector';
import Animated, { FadeIn } from 'react-native-reanimated';

const MEAL_TYPE_CONFIG = {
  breakfast: { color: '#F59E0B', icon: 'sunny-outline' as const, label: 'Breakfast' },
  lunch: { color: '#10B981', icon: 'partly-sunny-outline' as const, label: 'Lunch' },
  dinner: { color: '#6366F1', icon: 'moon-outline' as const, label: 'Dinner' },
  snack: { color: '#EC4899', icon: 'cafe-outline' as const, label: 'Snack' },
};

type TemplateLibraryModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectDate?: (templateId: string) => void;
  selectedDate?: string;
};

export function TemplateLibraryModal({ visible, onClose, onSelectDate, selectedDate }: TemplateLibraryModalProps) {
  const { templates, deleteTemplate } = useTemplates();
  const { addMeal, addIngredient } = useMealPlan();
  const { colors } = useTheme();

  const handleUseTemplate = async (template: any) => {
    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date first');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const mealId = await addMeal(selectedDate, template.name, template.mealType);
    
    if (!mealId) {
      Alert.alert('Error', 'Failed to create meal');
      return;
    }
    
    for (const ingredient of template.ingredients) {
      await addIngredient(mealId, ingredient);
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success!', `Added "${template.name}" to your meal plan`);
    onClose();
  };

  const handleDeleteTemplate = (template: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Template',
      `Delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await deleteTemplate(template.id);
          }
        }
      ]
    );
  };

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

            <View style={styles.header}>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Meal Templates</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  {templates.length} template{templates.length !== 1 ? 's' : ''} saved
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.closeIcon, { backgroundColor: colors.surfaceAlt }]}
                onPress={onClose}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {templates.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '12' }]}>
                  <Ionicons name="bookmark-outline" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No templates yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Save your favorite meals as templates from the meal detail screen
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {templates.map(template => {
                  const mealConfig = MEAL_TYPE_CONFIG[template.mealType] || MEAL_TYPE_CONFIG.dinner;
                  return (
                    <View 
                      key={template.id}
                      style={[styles.templateCard, elevation(1), { backgroundColor: colors.surface }]}
                    >
                      <View style={styles.templateBody}>
                        <View style={[styles.templateIcon, { backgroundColor: mealConfig.color + '15' }]}>
                          <Ionicons name={mealConfig.icon} size={20} color={mealConfig.color} />
                        </View>
                        <View style={styles.templateInfo}>
                          <Text style={[styles.templateName, { color: colors.text }]} numberOfLines={1}>
                            {template.name}
                          </Text>
                          <Text style={[styles.templateIngredients, { color: colors.textMuted }]} numberOfLines={1}>
                            {template.ingredients.slice(0, 3).map(detectIngredientEmoji).join(' · ')}
                            {template.ingredients.length > 3 ? ` +${template.ingredients.length - 3}` : ''}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.templateActions}>
                        {selectedDate && (
                          <TouchableOpacity
                            style={[styles.useButton, { backgroundColor: colors.primary }]}
                            onPress={() => handleUseTemplate(template)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="add-circle-outline" size={16} color={colors.textInverse} />
                            <Text style={[styles.useButtonText, { color: colors.textInverse }]}>Use</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.deleteButton, { backgroundColor: colors.errorLight }]}
                          onPress={() => handleDeleteTemplate(template)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
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
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.small,
    marginTop: 2,
  },
  closeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Empty State ────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
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

  // ── Template Cards ─────────────────────────────
  list: {
    maxHeight: 400,
  },
  templateCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  templateBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    ...typography.bodyBold,
  },
  templateIngredients: {
    ...typography.small,
    marginTop: 2,
  },
  templateActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  useButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  useButtonText: {
    ...typography.button,
    fontSize: 14,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
