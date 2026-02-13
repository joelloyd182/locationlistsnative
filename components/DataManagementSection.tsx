import { View, Text, TouchableOpacity, Alert, StyleSheet, Share } from 'react-native';
import { useStores } from '../context/StoresContext';
import { useMealPlan } from '../context/MealPlanContext';
import { useTemplates } from '../context/TemplatesContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        stores: stores,
        meals: meals,
        templates: templates,
      };

      const jsonString = JSON.stringify(exportData, null, 2);
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

              // Import stores
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

              // Import meals
              if (importedData.meals) {
                for (const meal of importedData.meals) {
                  const { id, ...mealData } = meal;
                  const newId = `imported-${Date.now()}-${Math.random()}`;
                  await setDoc(doc(db, 'users', user.uid, 'meals', newId), mealData);
                }
              }

              // Import templates
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
      '⚠️ Delete ALL Data',
      'This will permanently delete ALL stores, meals, and templates. This cannot be undone!\n\nType DELETE to confirm:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I understand',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Type DELETE',
              'Type DELETE in all caps to confirm deletion:',
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
                      // Delete all stores
                      for (const store of stores) {
                        await deleteDoc(doc(db, 'stores', store.id));
                      }

                      // Delete all meals
                      const mealsRef = collection(db, 'users', user.uid, 'meals');
                      const mealsSnapshot = await getDocs(mealsRef);
                      for (const mealDoc of mealsSnapshot.docs) {
                        await deleteDoc(mealDoc.ref);
                      }

                      // Delete all templates
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
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Management</Text>
      
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={exportData}
      >
        <Text style={styles.buttonText}>📤 Export Data</Text>
        <Text style={[styles.buttonSubtext, { color: 'rgba(255,255,255,0.8)' }]}>
          Backup all stores, meals & templates
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.success }]}
        onPress={importData}
      >
        <Text style={styles.buttonText}>📥 Import Data</Text>
        <Text style={[styles.buttonSubtext, { color: 'rgba(255,255,255,0.8)' }]}>
          Restore from backup file
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.error }]}
        onPress={deleteAllData}
      >
        <Text style={styles.buttonText}>🗑️ Delete All Data</Text>
        <Text style={[styles.buttonSubtext, { color: 'rgba(255,255,255,0.8)' }]}>
          Remove all stores, meals & templates
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  button: {
    padding: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 13,
  },
});
