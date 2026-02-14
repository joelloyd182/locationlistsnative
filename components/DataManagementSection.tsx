import { View, Text, TouchableOpacity, Alert, StyleSheet, Share } from 'react-native';
import { useStores } from '../context/StoresContext';
import { useMealPlan } from '../context/MealPlanContext';
import { useTemplates } from '../context/TemplatesContext';
import { useAuth } from '../context/AuthContext';
import { useTheme, elevation, spacing, radius, typography } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

export function DataManagementSection() {
  const { stores } = useStores();
  const { meals } = useMealPlan();
  const { templates } = useTemplates();
  const { user } = useAuth();
  const { colors } = useTheme();

  const exportData = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        stores: stores,
        meals: meals,
        templates: templates,
      };

      const jsonString = JSON.stringify(data, null, 2);
      const fileName = `location-lists-backup-${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      await Share.share({
        url: fileUri,
        title: 'Export Location Lists Data',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success!', 'Data exported! You can save this file and import it later.');
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Could not export data. Please try again.');
    }
  };

  const importData = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Import Data',
      'This will ADD the imported data to your existing data. To replace everything, delete all data first, then import.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
              });

              if (result.canceled) return;

              const fileUri = result.assets[0].uri;
              const fileContent = await FileSystem.readAsStringAsync(fileUri);
              const importedData = JSON.parse(fileContent);

              if (!user) {
                Alert.alert('Error', 'You must be logged in to import data');
                return;
              }

              if (importedData.stores) {
                for (const store of importedData.stores) {
                  const { id, ...storeData } = store;
                  const newId = `imported-${Date.now()}-${Math.random()}`;
                  await setDoc(doc(db, 'stores', newId), {
                    ...storeData,
                    userId: user.uid,
                    members: [user.uid],
                  });
                }
              }

              if (importedData.meals) {
                for (const meal of importedData.meals) {
                  const { id, ...mealData } = meal;
                  const newId = `imported-${Date.now()}-${Math.random()}`;
                  await setDoc(doc(db, 'users', user.uid, 'meals', newId), mealData);
                }
              }

              if (importedData.templates) {
                for (const template of importedData.templates) {
                  const { id, ...templateData } = template;
                  const newId = `imported-${Date.now()}-${Math.random()}`;
                  await setDoc(doc(db, 'users', user.uid, 'mealTemplates', newId), templateData);
                }
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success!', 'Data imported successfully!');
            } catch (error) {
              console.error('Import error:', error);
              Alert.alert('Import Failed', 'Could not import data. Make sure the file is valid.');
            }
          }
        }
      ]
    );
  };

  const deleteAllData = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    Alert.alert(
      'Delete ALL Data',
      'This will permanently delete ALL stores, meals, and templates. This cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I understand',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Type DELETE',
              'Type DELETE in all caps to confirm:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Everything',
                  style: 'destructive',
                  onPress: async (text) => {
                    if (text !== 'DELETE') {
                      Alert.alert('Cancelled', 'You must type DELETE to confirm');
                      return;
                    }

                    if (!user) return;

                    try {
                      for (const store of stores) {
                        await deleteDoc(doc(db, 'stores', store.id));
                      }

                      const mealsRef = collection(db, 'users', user.uid, 'meals');
                      const mealsSnapshot = await getDocs(mealsRef);
                      for (const mealDoc of mealsSnapshot.docs) {
                        await deleteDoc(mealDoc.ref);
                      }

                      const templatesRef = collection(db, 'users', user.uid, 'mealTemplates');
                      const templatesSnapshot = await getDocs(templatesRef);
                      for (const templateDoc of templatesSnapshot.docs) {
                        await deleteDoc(templateDoc.ref);
                      }

                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      Alert.alert('Deleted', 'All data has been deleted');
                    } catch (error) {
                      console.error('Delete error:', error);
                      Alert.alert('Error', 'Could not delete all data. Please try again.');
                    }
                  }
                }
              ],
              'plain-text'
            );
          }
        }
      ]
    );
  };

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconContainer, { backgroundColor: colors.primary + '12' }]}>
          <Ionicons name="server-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Management</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Backup, restore, or reset your data
          </Text>
        </View>
      </View>

      {/* Export */}
      <TouchableOpacity
        style={[styles.dataButton, elevation(2), { backgroundColor: colors.surface }]}
        onPress={exportData}
        activeOpacity={0.7}
      >
        <View style={[styles.dataButtonIcon, { backgroundColor: colors.primary + '12' }]}>
          <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.dataButtonContent}>
          <Text style={[styles.dataButtonTitle, { color: colors.text }]}>Export Data</Text>
          <Text style={[styles.dataButtonSubtitle, { color: colors.textSecondary }]}>
            Backup stores, meals & templates
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Import */}
      <TouchableOpacity
        style={[styles.dataButton, elevation(2), { backgroundColor: colors.surface }]}
        onPress={importData}
        activeOpacity={0.7}
      >
        <View style={[styles.dataButtonIcon, { backgroundColor: colors.success + '15' }]}>
          <Ionicons name="cloud-download-outline" size={20} color={colors.success} />
        </View>
        <View style={styles.dataButtonContent}>
          <Text style={[styles.dataButtonTitle, { color: colors.text }]}>Import Data</Text>
          <Text style={[styles.dataButtonSubtitle, { color: colors.textSecondary }]}>
            Restore from backup file
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Delete */}
      <TouchableOpacity
        style={[styles.dataButton, elevation(2), { backgroundColor: colors.surface }]}
        onPress={deleteAllData}
        activeOpacity={0.7}
      >
        <View style={[styles.dataButtonIcon, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </View>
        <View style={styles.dataButtonContent}>
          <Text style={[styles.dataButtonTitle, { color: colors.error }]}>Delete All Data</Text>
          <Text style={[styles.dataButtonSubtitle, { color: colors.textSecondary }]}>
            Remove everything permanently
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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

  // ── Data Buttons ───────────────────────────────
  dataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  dataButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataButtonContent: {
    flex: 1,
  },
  dataButtonTitle: {
    ...typography.bodyBold,
  },
  dataButtonSubtitle: {
    ...typography.small,
    marginTop: 2,
  },
});
