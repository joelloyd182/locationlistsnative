import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTemplates } from '../context/TemplatesContext';
import { useMealPlan } from '../context/MealPlanContext';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { detectIngredientEmoji } from '../utils/emoji-detector';

// Meal type config
const MEAL_TYPE_CONFIG = {
  breakfast: { color: '#FFA726', emoji: '🌅' },
  lunch: { color: '#66BB6A', emoji: '☀️' },
  dinner: { color: '#5C6BC0', emoji: '🌙' },
  snack: { color: '#EC407A', emoji: '🍿' },
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

  if (!visible) return null;

  const handleUseTemplate = async (template: any) => {
  if (!selectedDate) {
    Alert.alert('Error', 'Please select a date first');
    return;
  }

  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  
  // Add meal and get the ID back
  const mealId = await addMeal(selectedDate, template.name, template.mealType);
  
  if (!mealId) {
    Alert.alert('Error', 'Failed to create meal');
    return;
  }
  
  // Add all ingredients with the correct meal ID
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
    <View style={styles.modal}>
      <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Meal Templates</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeButton, { color: colors.primary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {templates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              No templates yet! 📋
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
              Save your favorite meals as templates to quickly add them to any day.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.templatesList}>
            {templates.map(template => {
              const mealConfig = MEAL_TYPE_CONFIG[template.mealType];
              return (
                <View 
                  key={template.id}
                  style={[styles.templateCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                >
                  <View style={styles.templateHeader}>
                    <View style={styles.templateTitleRow}>
                      <Text style={styles.templateEmoji}>{mealConfig.emoji}</Text>
                      <View style={styles.templateInfo}>
                        <Text style={[styles.templateName, { color: colors.text }]}>
                          {template.name}
                        </Text>
                        <Text style={[styles.templateIngredients, { color: colors.textLight }]}>
                          {template.ingredients.slice(0, 3).map(detectIngredientEmoji).join(' • ')}
                          {template.ingredients.length > 3 && ` +${template.ingredients.length - 3}`}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.templateActions}>
                    {selectedDate && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.useButton, { backgroundColor: colors.success }]}
                        onPress={() => handleUseTemplate(template)}
                      >
                        <Text style={styles.actionButtonText}>Use Template</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton, { backgroundColor: colors.error }]}
                      onPress={() => handleDeleteTemplate(template)}
                    >
                      <Text style={styles.actionButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  templatesList: {
    maxHeight: 500,
  },
  templateCard: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
    marginBottom: 12,
  },
  templateHeader: {
    marginBottom: 10,
  },
  templateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  templateEmoji: {
    fontSize: 32,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  templateIngredients: {
    fontSize: 13,
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  useButton: {
    flex: 2,
  },
  deleteButton: {
    flex: 1,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
});
