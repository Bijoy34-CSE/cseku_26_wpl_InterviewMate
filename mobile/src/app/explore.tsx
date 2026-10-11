import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileHeader } from '@/components/mobile-header';
import {
  API_BASE_URL,
  createInterviewSession,
  DocumentUpload,
  InterviewSession,
  listInterviewSessions,
} from '@/lib/api';
import { getCurrentUser, getSavedToken } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

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

const purposes = [
  'Job Interview',
  'Academic Viva',
  'Internship Interview',
  'Thesis Defense',
];
const difficulties = ['Easy', 'Intermediate', 'Hard'];
const levels = ['Beginner', 'Entry-Level', 'Mid-Level', 'Advanced'];
const durations = ['5 Mins', '10 Mins', '15 Mins', '20 Mins', '30 Mins'];
const questionCounts = ['5 Questions', '10 Questions', '15 Questions', '20 Questions'];

export default function ExploreScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [purpose, setPurpose] = useState('Job Interview');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [level, setLevel] = useState('Mid-Level');
  const [duration, setDuration] = useState('15 Mins');
  const [questions, setQuestions] = useState('5 Questions');
  const [file, setFile] = useState<DocumentUpload | null>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const completedCount = useMemo(
    () => sessions.filter((session) => session.status === 'completed').length,
    [sessions],
  );
  const scoredSessions = useMemo(
    () => sessions.filter((session) => typeof session.overallScore === 'number'),
    [sessions],
  );
  const averageScore = scoredSessions.length
    ? Math.round(
        scoredSessions.reduce((total, session) => total + (session.overallScore || 0), 0) /
          scoredSessions.length,
      )
    : null;

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const savedToken = await getSavedToken();
      setToken(savedToken);
      if (!savedToken) {
        setUser(null);
        setSessions([]);
        return;
      }
      const [currentUser, result] = await Promise.all([
        getCurrentUser(),
        listInterviewSessions(savedToken),
      ]);
      setUser(currentUser);
      setSessions(result.sessions);
      setError('');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not load interview history.',
      );
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  async function chooseDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const selected = result.assets[0];
      if (selected.size && selected.size > 10 * 1024 * 1024) {
        setError('The document must be 10MB or smaller.');
        return;
      }
      setFile({
        uri: selected.uri,
        name: selected.name,
        mimeType: selected.mimeType || 'application/octet-stream',
      });
      setError('');
    } catch (pickerError) {
      setError(
        pickerError instanceof Error
          ? pickerError.message
          : 'Could not open the document picker.',
      );
    }
  }

  async function startInterview() {
    if (!token) {
      Alert.alert('Sign in required', 'Sign in to start and save interviews.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/login') },
      ]);
      return;
    }
    if (!file) {
      setError('Choose a PDF, DOCX, or PPTX document to ground your interview questions.');
      return;
    }
    setWorking(true);
    setError('');
    try {
      const result = await createInterviewSession(
        token,
        {
          purpose,
          difficulty,
          level,
          duration,
          questions,
          mode: 'Text Response',
          adaptiveDifficulty: true,
        },
        file,
      );
      router.push({
        pathname: '/session/[id]',
        params: { id: result.session.id },
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not start the interview.',
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <MobileHeader
        title="Start interview"
        userName={user?.name}
        userEmail={user?.email}
        isAdmin={user?.role === 'admin'}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹  Home</Text>
          </TouchableOpacity>
          <Text style={styles.eyebrow}>INTERVIEWMATE</Text>
        </View>

        <Text style={styles.title}>Interview practice</Text>
        <Text style={styles.subtitle}>
          Build a document-grounded mock interview, then review your saved sessions.
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            {!token && (
              <Text style={styles.serverHint}>
                API: {API_BASE_URL}
              </Text>
            )}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Set up an interview</Text>
          <Text style={styles.label}>PURPOSE</Text>
          <ChoiceRow values={purposes} value={purpose} onChange={setPurpose} />

          <Text style={styles.label}>DIFFICULTY</Text>
          <ChoiceRow values={difficulties} value={difficulty} onChange={setDifficulty} />

          <Text style={styles.label}>CANDIDATE LEVEL</Text>
          <ChoiceRow values={levels} value={level} onChange={setLevel} />

          <Text style={styles.label}>DURATION</Text>
          <ChoiceRow values={durations} value={duration} onChange={setDuration} />

          <Text style={styles.label}>QUESTIONS</Text>
          <ChoiceRow
            values={questionCounts}
            value={questions}
            onChange={setQuestions}
          />

          <TouchableOpacity
            style={styles.documentButton}
            onPress={() => void chooseDocument()}
            disabled={working}
          >
            <Text style={styles.documentSymbol}>＋</Text>
            <View style={styles.documentCopy}>
              <Text style={styles.documentTitle}>
                {file ? file.name : 'Choose interview material'}
              </Text>
              <Text style={styles.documentHint}>PDF, DOCX, or PPTX · up to 10MB</Text>
            </View>
            <Text style={styles.documentArrow}>›</Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            Questions are generated from your uploaded document. Mobile interviews use text responses.
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, working && styles.disabled]}
            onPress={() => void startInterview()}
            disabled={working}
          >
            {working ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Start interview  →</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.historyHeader}>
          <View>
            <Text style={styles.cardTitle}>Your interview history</Text>
            <Text style={styles.muted}>Recent sessions from your account</Text>
          </View>
          <TouchableOpacity onPress={() => void loadHistory()} disabled={loadingHistory}>
            <Text style={styles.refresh}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {token && sessions.length > 0 && (
          <View style={styles.metricsRow}>
            <Metric label="TOTAL INTERVIEWS" value={String(sessions.length)} />
            <Metric label="COMPLETED" value={String(completedCount)} />
            <Metric label="AVERAGE SCORE" value={averageScore === null ? '—' : `${averageScore}%`} />
          </View>
        )}

        {loadingHistory ? (
          <ActivityIndicator color={C.cyan} style={styles.loader} />
        ) : !token ? (
          <TouchableOpacity style={styles.emptyCard} onPress={() => router.push('/login')}>
            <Text style={styles.emptyTitle}>Sign in to view your history</Text>
            <Text style={styles.muted}>Your completed and in-progress interviews will appear here.</Text>
          </TouchableOpacity>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No interviews yet</Text>
            <Text style={styles.muted}>Start an interview above to see it here.</Text>
          </View>
        ) : (
          sessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              style={styles.sessionCard}
              onPress={() =>
                router.push({
                  pathname: '/session/[id]',
                  params: { id: session.id },
                })
              }
            >
              <View style={styles.sessionTop}>
                <Text style={styles.sessionPurpose} numberOfLines={1}>
                  {session.purpose}
                </Text>
                <Text
                  style={[
                    styles.status,
                    session.status === 'completed' ? styles.complete : styles.active,
                  ]}
                >
                  {session.status === 'completed' ? 'COMPLETED' : 'IN PROGRESS'}
                </Text>
              </View>
              <Text style={styles.sessionMeta}>
                {session.difficulty} · {session.totalQuestions} questions · {session.durationLabel}
              </Text>
              {typeof session.overallScore === 'number' && (
                <Text style={styles.score}>Score: {session.overallScore}%</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ChoiceRow({
  values,
  value,
  onChange,
}: {
  values: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.choiceScroller}>
      {values.map((option) => (
        <TouchableOpacity
          key={option}
          onPress={() => onChange(option)}
          style={[styles.choice, value === option && styles.choiceSelected]}
        >
          <Text style={[styles.choiceText, value === option && styles.choiceTextSelected]}>
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { paddingVertical: 10, paddingRight: 10 },
  backText: { color: C.cyan, fontSize: 14, fontWeight: '700' },
  eyebrow: { color: C.cyan, fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: C.white, fontSize: 28, fontWeight: '900', marginTop: 16 },
  subtitle: { color: C.muted, fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 19 },
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 20, padding: 16 },
  cardTitle: { color: C.white, fontSize: 17, fontWeight: '800' },
  label: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginTop: 17, marginBottom: 9 },
  choiceScroller: { flexGrow: 0 },
  choice: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderColor: C.border, borderWidth: 1, marginRight: 7 },
  choiceSelected: { backgroundColor: C.blue, borderColor: C.blue },
  choiceText: { color: C.muted, fontSize: 11, fontWeight: '700' },
  choiceTextSelected: { color: C.white },
  documentButton: { flexDirection: 'row', alignItems: 'center', marginTop: 22, padding: 13, borderWidth: 1, borderStyle: 'dashed', borderColor: C.cyan, borderRadius: 14, backgroundColor: '#FFFFFF' },
  documentSymbol: { color: C.cyan, fontSize: 24, marginRight: 11 },
  documentCopy: { flex: 1 },
  documentTitle: { color: C.white, fontSize: 12, fontWeight: '800' },
  documentHint: { color: C.muted, fontSize: 10, marginTop: 5 },
  documentArrow: { color: C.cyan, fontSize: 23 },
  note: { color: C.muted, fontSize: 10, lineHeight: 16, marginTop: 12 },
  primaryButton: { minHeight: 48, borderRadius: 13, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', marginTop: 17 },
  primaryButtonText: { color: C.white, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  errorBox: { backgroundColor: '#FFF1F2', borderRadius: 13, borderWidth: 1, borderColor: '#FECDD3', padding: 12, marginBottom: 15 },
  errorText: { color: '#BE123C', fontSize: 12, lineHeight: 18 },
  serverHint: { color: C.muted, fontSize: 9, marginTop: 7 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 27, marginBottom: 13 },
  muted: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  refresh: { color: C.cyan, fontSize: 11, fontWeight: '700' },
  loader: { marginTop: 20 },
  metricsRow: { flexDirection: 'row', gap: 7, marginBottom: 12 },
  metric: { flex: 1, minHeight: 68, justifyContent: 'center', paddingHorizontal: 10, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 13 },
  metricLabel: { color: C.muted, fontSize: 7, fontWeight: '800', letterSpacing: 0.5 },
  metricValue: { color: C.white, fontSize: 16, fontWeight: '900', marginTop: 7 },
  emptyCard: { padding: 16, backgroundColor: C.card, borderRadius: 16, borderColor: C.border, borderWidth: 1 },
  emptyTitle: { color: C.white, fontSize: 13, fontWeight: '800' },
  sessionCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
  sessionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sessionPurpose: { color: C.white, fontSize: 13, fontWeight: '800', flex: 1 },
  status: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  complete: { color: C.cyan },
  active: { color: C.purple },
  sessionMeta: { color: C.muted, fontSize: 10, marginTop: 8 },
  score: { color: C.cyan, fontSize: 11, fontWeight: '800', marginTop: 8 },
});
