import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileBrand } from '@/components/mobile-brand';
import { router } from 'expo-router';
import { login } from '@/lib/auth';

const C = {
  bg: '#F8F9FD',
  card: '#FFFFFF',
  border: '#E4E8F2',
  white: '#101828',
  muted: '#667085',
  cyan: '#2438D5',
  blue: '#2438D5',
  purple: '#6941C6',
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing information', 'Enter your email and password.');
      return;
    }

    try {
      setLoading(true);

      await login(email, password, rememberMe);

      Alert.alert('Welcome back!', 'You have signed in successfully.', [
        {
          text: 'Continue',
          onPress: () => router.replace('/'),
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to sign in.';

      Alert.alert('Sign in failed', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹  Back</Text>
          </TouchableOpacity>

          <MobileBrand subtitle="AI INTERVIEW COACH" centered />

          <View style={styles.headingBlock}>
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.description}>
              Sign in to continue your interview preparation.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#8190B2"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="next"
            />

            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.passwordBox}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#8190B2"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Text style={styles.showText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe(!rememberMe)}
              disabled={loading}
            >
              <View style={[styles.checkbox, rememberMe && styles.checked]}>
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.disabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={styles.loginButtonText}>Sign In  →</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.note}>
              Use the email and password of your existing InterviewMate
              account.
            </Text>
            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => router.push('/register')}
              disabled={loading}
            >
              <Text style={styles.registerLinkText}>
                New to InterviewMate? Create an account
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            INTERVIEWMATE · PREPARE WITH PURPOSE
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 12,
    paddingBottom: 28,
    justifyContent: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    marginBottom: 24,
  },
  backText: {
    color: C.cyan,
    fontSize: 15,
    fontWeight: '700',
  },
  headingBlock: {
    marginTop: 36,
    marginBottom: 25,
  },
  heading: {
    color: C.white,
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  description: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 9,
  },
  form: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  label: {
    color: C.cyan,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 9,
    marginTop: 7,
  },
  input: {
    height: 51,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    color: C.white,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 18,
  },
  passwordBox: {
    minHeight: 51,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    minHeight: 49,
    color: C.white,
    fontSize: 14,
  },
  showText: {
    color: C.cyan,
    fontSize: 12,
    fontWeight: '800',
    padding: 5,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    marginBottom: 17,
  },
  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: C.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  checked: {
    backgroundColor: C.blue,
    borderColor: C.blue,
  },
  checkmark: {
    color: C.white,
    fontSize: 13,
    fontWeight: '900',
  },
  rememberText: {
    color: C.muted,
    fontSize: 12,
  },
  loginButton: {
    minHeight: 52,
    borderRadius: 13,
    backgroundColor: '#2438D5',
    borderWidth: 1,
    borderColor: '#2438D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.65,
  },
  loginButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '900',
  },
  note: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 15,
  },
  registerLink: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  registerLinkText: {
    color: C.cyan,
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    color: '#7180A6',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 27,
  },
});
