import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, THEMES, ThemeId } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useState, useEffect } from 'react';
import { DataManagementSection } from '../../components/DataManagementSection';
import { useWeekStart, WEEK_START_OPTIONS, WeekStartDay } from '../../context/WeekStartContext';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { themeId, colors, setTheme } = useTheme();
  const { weekStartDay, setWeekStartDay } = useWeekStart();
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
    Alert.alert('Theme Changed', 'Your new theme is active!');
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => await signOut()
        }
      ]
    );
  };

  const handleNotificationPermissions = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const { status: currentStatus } = await Notifications.getPermissionsAsync();
    
    if (currentStatus === 'granted') {
      Alert.alert(
        'Notifications Enabled',
        'Notifications are already enabled for this app.',
        [{ text: 'OK' }]
      );
      return;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    
    if (status === 'granted') {
      setNotificationStatus(status);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success!', 'Notification permissions granted! You\'ll now receive alerts when you arrive at stores.');
    } else {
      Alert.alert(
        'Notifications Disabled',
        'To enable notifications, go to your phone Settings → Apps → Location Lists → Notifications',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <Text style={[styles.value, { color: colors.textLight }]}>{user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.text }]}>User ID</Text>
            <Text style={[styles.value, styles.smallText, { color: colors.textLight }]} numberOfLines={1}>
              {user?.uid}
            </Text>
          </View>
        </View>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
        <Text style={[styles.sectionDescription, { color: colors.textLight }]}>
          Enable notifications to get alerts when you arrive at stores
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.text }]}>Status</Text>
            <Text style={[
              styles.value, 
              { 
                color: notificationStatus === 'granted' ? colors.success : colors.error,
                fontWeight: '600'
              }
            ]}>
              {notificationStatus === 'granted' ? '✓ Enabled' : '✗ Disabled'}
            </Text>
          </View>
        </View>
        
        {notificationStatus !== 'granted' && (
          <TouchableOpacity 
            style={[styles.enableButton, { backgroundColor: colors.success }]} 
            onPress={handleNotificationPermissions}
          >
            <Text style={styles.enableButtonText}>🔔 Enable Notifications</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.helpText, { color: colors.textLight }]}>
          Geofencing notifications are controlled from the Home screen
        </Text>
      </View>

      {/* Week Start Day Section - NEW! */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Week Settings</Text>
        <Text style={[styles.sectionDescription, { color: colors.textLight }]}>
          Choose which day your week starts
        </Text>
        
        <View style={styles.weekStartGrid}>
          {WEEK_START_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.weekStartButton,
                { backgroundColor: colors.card, borderColor: colors.border },
                weekStartDay === option.value && { 
                  borderColor: colors.primary, 
                  borderWidth: 3,
                  backgroundColor: colors.tertiary 
                }
              ]}
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                await setWeekStartDay(option.value as WeekStartDay);
                Alert.alert('Week Start Updated', `Your week now starts on ${option.label}`);
              }}
            >
              <Text style={[
                styles.weekStartLabel,
                { color: weekStartDay === option.value ? colors.primary : colors.text }
              ]}>
                {option.label}
              </Text>
              {weekStartDay === option.value && (
                <Text style={[styles.activeIndicator, { color: colors.primary }]}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Theme Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme</Text>
        <Text style={[styles.sectionDescription, { color: colors.textLight }]}>
          Choose your color scheme (applies instantly!)
        </Text>
        <View style={styles.themesGrid}>
          {Object.entries(THEMES).map(([id, theme]) => (
            <TouchableOpacity
              key={id}
              style={[
                styles.themeCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                themeId === id && { borderColor: theme.primary, borderWidth: 3 }
              ]}
              onPress={() => selectTheme(id as ThemeId)}
            >
              <View style={styles.themeColors}>
                <View style={[styles.colorSwatch, { backgroundColor: theme.primary }]} />
                <View style={[styles.colorSwatch, { backgroundColor: theme.secondary }]} />
                <View style={[styles.colorSwatch, { backgroundColor: theme.tertiary }]} />
                <View style={[styles.colorSwatch, { backgroundColor: theme.accent }]} />
              </View>
              <Text style={[styles.themeName, { color: colors.text }]}>
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </Text>
              {themeId === id && (
                <Text style={[styles.activeIndicator, { color: theme.primary }]}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Data Management Section */}
      <DataManagementSection />

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.text }]}>Version</Text>
            <Text style={[styles.value, { color: colors.textLight }]}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.text }]}>Build</Text>
            <Text style={[styles.value, { color: colors.textLight }]}>Development</Text>
          </View>
        </View>
      </View>

      {/* Sign Out Button */}
      <View style={styles.section}>
        <TouchableOpacity style={[styles.signOutButton, { backgroundColor: colors.error }]} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textLight }]}>Made by Kooky Rooster Media 🐓</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  smallText: {
    fontSize: 10,
  },
  signOutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  enableButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  enableButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  weekStartGrid: {
    gap: 10,
  },
  weekStartButton: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekStartLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeCard: {
    width: '47%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  themeColors: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeIndicator: {
    fontSize: 18,
    marginTop: 4,
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});
