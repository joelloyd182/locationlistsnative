import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { useTheme, elevation, spacing, radius, typography } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function LoginScreen() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        Alert.alert('Success', 'Account created!');
      } else {
        await signIn(email, password);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={colors.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Logo / Title area */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.titleSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="location" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>Location Lists</Text>
            <Text style={styles.tagline}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </Text>
          </Animated.View>

          {/* Form card */}
          <Animated.View 
            entering={FadeInDown.delay(200).duration(500)} 
            style={[styles.formCard, elevation(4), { backgroundColor: colors.surface }]}
          >
            {/* Email */}
            <View style={[styles.inputContainer, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            {/* Password */}
            <View style={[styles.inputContainer, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={18} 
                  color={colors.textMuted} 
                />
              </TouchableOpacity>
            </View>

            {/* Primary action */}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={[styles.primaryButtonText, { color: colors.textInverse }]}>
                {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* Switch mode */}
            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Google sign in */}
            <TouchableOpacity
              style={[styles.googleButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              onPress={async () => {
                setLoading(true);
                try {
                  await signInWithGoogle();
                } catch (error: any) {
                  Alert.alert('Error', error.message);
                } finally {
                  setLoading(false);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-google" size={18} color={colors.text} />
              <Text style={[styles.googleButtonText, { color: colors.text }]}>
                Continue with Google
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <Text style={styles.footer}>Kooky Rooster Media</Text>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },

  // ── Title ──────────────────────────────────────
  titleSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },

  // ── Form Card ──────────────────────────────────
  formCard: {
    borderRadius: radius.xxl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },

  // ── Inputs ─────────────────────────────────────
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? spacing.md + 2 : spacing.md,
    ...typography.body,
  },

  // ── Buttons ────────────────────────────────────
  primaryButton: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    ...typography.button,
    fontSize: 16,
  },
  switchButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  switchText: {
    ...typography.body,
  },

  // ── Divider ────────────────────────────────────
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: spacing.lg,
    ...typography.caption,
  },

  // ── Google ─────────────────────────────────────
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    borderWidth: 1,
  },
  googleButtonText: {
    ...typography.button,
  },

  // ── Footer ─────────────────────────────────────
  footer: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    ...typography.small,
  },
});
