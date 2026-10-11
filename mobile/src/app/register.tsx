import { useState } from 'react';
import { router } from 'expo-router';
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
import {
  registerAccount,
  resendRegistrationOtp,
  verifyRegistrationOtp,
} from '@/lib/auth';

const C = {
  bg: '#F8F9FD',
  card: '#FFFFFF',
  border: '#E4E8F2',
  white: '#101828',
  muted: '#667085',
  cyan: '#2438D5',
  blue: '#2438D5',
};

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  async function createAccount() {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Complete each field to create your account.');
      return;
    }
    setWorking(true);
    setError('');
    try {
      await registerAccount({ name, email, password, confirmPassword });
      setVerificationPending(true);
      Alert.alert('Check your email', 'We sent a 6-digit verification code.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not create your account.',
      );
    } finally {
      setWorking(false);
    }
  }

  async function verifyCode() {
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit verification code.');
      return;
    }
    setWorking(true);
    setError('');
    try {
      await verifyRegistrationOtp(email, otp);
      router.replace('/');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not verify your email.',
      );
    } finally {
      setWorking(false);
    }
  }

  async function resendCode() {
    setWorking(true);
    setError('');
    try {
      await resendRegistrationOtp(email);
      Alert.alert('Code sent', 'A new verification code has been sent to your email.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not resend the code.',
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹  Back</Text>
          </TouchableOpacity>

          <MobileBrand subtitle="CREATE YOUR ACCOUNT" centered />

          <View style={styles.form}>
            <Text style={styles.heading}>
              {verificationPending ? 'Verify your email' : 'Get started'}
            </Text>
            <Text style={styles.description}>
              {verificationPending
                ? `Enter the 6-digit code sent to ${email}.`
                : 'Create an account to save and review your interview sessions.'}
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {verificationPending ? (
              <>
                <Text style={styles.label}>VERIFICATION CODE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="6-digit code"
                  placeholderTextColor="#8190B2"
                  value={otp}
                  onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  editable={!working}
                  maxLength={6}
                  autoComplete="one-time-code"
                />
                <TouchableOpacity
                  style={[styles.primaryButton, working && styles.disabled]}
                  onPress={() => void verifyCode()}
                  disabled={working}
                >
                  {working ? <ActivityIndicator color={C.white} /> : <Text style={styles.primaryText}>Verify and continue</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void resendCode()} disabled={working} style={styles.resendButton}>
                  <Text style={styles.linkText}>Resend code</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>FULL NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor="#8190B2"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!working}
                  maxLength={120}
                />
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
                  editable={!working}
                />
                <Text style={styles.label}>PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  placeholder="At least 8 characters, with a letter and number"
                  placeholderTextColor="#8190B2"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!working}
                  textContentType="newPassword"
                />
                <Text style={styles.label}>CONFIRM PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password again"
                  placeholderTextColor="#8190B2"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!working}
                  textContentType="newPassword"
                />
                <TouchableOpacity
                  style={[styles.primaryButton, working && styles.disabled]}
                  onPress={() => void createAccount()}
                  disabled={working}
                >
                  {working ? <ActivityIndicator color={C.white} /> : <Text style={styles.primaryText}>Create account</Text>}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={() => router.replace('/login')} style={styles.loginLink}>
              <Text style={styles.linkText}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 30, justifyContent: 'center' },
  backButton: { alignSelf: 'flex-start', paddingVertical: 10, marginBottom: 15 },
  backText: { color: C.cyan, fontSize: 15, fontWeight: '700' },
  form: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 21, padding: 18 },
  heading: { color: C.white, fontSize: 22, fontWeight: '900' },
  description: { color: C.muted, fontSize: 12, lineHeight: 19, marginTop: 7, marginBottom: 17 },
  label: { color: C.cyan, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 7, marginTop: 7 },
  input: { minHeight: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border, borderRadius: 11, color: C.white, paddingHorizontal: 12, fontSize: 13, marginBottom: 9 },
  primaryButton: { minHeight: 49, borderRadius: 13, backgroundColor: C.blue, borderWidth: 1, borderColor: C.blue, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  errorBox: { backgroundColor: '#FFF1F2', borderRadius: 11, borderWidth: 1, borderColor: '#FECDD3', padding: 11, marginBottom: 10 },
  errorText: { color: '#BE123C', fontSize: 11, lineHeight: 17 },
  resendButton: { alignItems: 'center', paddingVertical: 13 },
  loginLink: { alignItems: 'center', paddingVertical: 15 },
  linkText: { color: C.cyan, fontSize: 11, fontWeight: '700' },
});
