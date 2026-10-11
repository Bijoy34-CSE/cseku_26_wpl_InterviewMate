import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileHeader } from '@/components/mobile-header';
import {
  completeInterviewSession,
  getInterviewSession,
  InterviewFeedback,
  InterviewQuestion,
  InterviewSession,
  skipInterviewQuestion,
  submitInterviewAnswer,
  timeoutInterviewSession,
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

export default function InterviewSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [question, setQuestion] = useState<InterviewQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [now, setNow] = useState(Date.now);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const timeoutInFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const savedToken = await getSavedToken();
      if (!savedToken) {
        router.replace('/login');
        return;
      }
      setToken(savedToken);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      const result = await getInterviewSession(savedToken, id);
      setSession(result.session);
      setQuestion(result.currentQuestion);
      setAnswer(result.pendingAnswer || '');
      if (result.session.status === 'completed') {
        const final = await completeInterviewSession(savedToken, id);
        setFeedback(final.feedback);
        setSession(final.session);
      }
      setError('');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not load this interview.',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const remaining =
    session?.deadlineAt && session.status === 'in_progress'
      ? Math.max(0, Math.ceil((new Date(session.deadlineAt).getTime() - now) / 1000))
      : null;
  const formattedTime =
    remaining === null
      ? null
      : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;

  const finishForTimeout = useCallback(async () => {
    if (!token || !id || timeoutInFlight.current) return;
    timeoutInFlight.current = true;
    setWorking(true);
    try {
      const result = await timeoutInterviewSession(token, id);
      setSession(result.session);
      setFeedback(result.feedback);
      setQuestion(null);
      setAnswer('');
      setError('');
    } catch (requestError) {
      timeoutInFlight.current = false;
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not finish the timed interview.',
      );
    } finally {
      setWorking(false);
    }
  }, [id, token]);

  useEffect(() => {
    if (!session?.deadlineAt || session.status !== 'in_progress') return;
    const deadline = new Date(session.deadlineAt).getTime();
    const timer = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= deadline) void finishForTimeout();
    }, 1000);
    return () => clearInterval(timer);
  }, [finishForTimeout, session?.deadlineAt, session?.status]);

  async function submit() {
    if (!token || !id || !question || !answer.trim()) {
      setError('Write an answer before submitting.');
      return;
    }
    setWorking(true);
    setError('');
    try {
      const result = await submitInterviewAnswer(token, id, question.id, answer);
      setSession(result.session);
      if (result.completed) {
        setFeedback(result.feedback || null);
        setQuestion(null);
        setAnswer('');
      } else if (result.nextQuestion) {
        setQuestion(result.nextQuestion);
        setAnswer('');
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not submit your answer. Your answer is still available to retry.',
      );
    } finally {
      setWorking(false);
    }
  }

  async function skip() {
    if (!token || !id) return;
    setWorking(true);
    setError('');
    try {
      const result = await skipInterviewQuestion(token, id);
      setSession(result.session);
      if (result.completed) {
        setFeedback(result.feedback || null);
        setQuestion(null);
        setAnswer('');
      } else if (result.nextQuestion) {
        setQuestion(result.nextQuestion);
        setAnswer('');
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not skip this question.',
      );
    } finally {
      setWorking(false);
    }
  }

  function endInterview() {
    Alert.alert(
      'End this interview?',
      'Any unanswered questions will count as missed.',
      [
        { text: 'Continue interview', style: 'cancel' },
        {
          text: 'End interview',
          style: 'destructive',
          onPress: () => {
            if (!token || !id) return;
            setWorking(true);
            void completeInterviewSession(token, id)
              .then((result) => {
                setSession(result.session);
                setFeedback(result.feedback);
                setQuestion(null);
                setAnswer('');
                setError('');
              })
              .catch((requestError: unknown) => {
                setError(
                  requestError instanceof Error
                    ? requestError.message
                    : 'Could not end the interview.',
                );
              })
              .finally(() => setWorking(false));
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={C.cyan} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <MobileHeader
        title="Mock interview"
        userName={user?.name}
        userEmail={user?.email}
        isAdmin={user?.role === 'admin'}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.replace('/explore')} style={styles.back}>
            <Text style={styles.backText}>‹  History</Text>
          </TouchableOpacity>
          {formattedTime !== null && session?.status === 'in_progress' && (
            <Text style={[styles.timer, remaining !== null && remaining < 60 && styles.timerLow]}>
              {formattedTime}
            </Text>
          )}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void refresh()}>
              <Text style={styles.retry}>Retry loading</Text>
            </TouchableOpacity>
            {remaining === 0 && session?.status === 'in_progress' && (
              <TouchableOpacity onPress={() => void finishForTimeout()} disabled={working}>
                <Text style={styles.retry}>Retry finishing this timed interview</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {!session ? (
          <View style={styles.card}>
            <Text style={styles.title}>Interview unavailable</Text>
            <Text style={styles.muted}>The session could not be loaded.</Text>
          </View>
        ) : session.status === 'completed' ? (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>INTERVIEW COMPLETE</Text>
            <Text style={styles.title}>Your results</Text>
            {typeof feedback?.overallScore === 'number' && (
              <Text style={styles.score}>{feedback.overallScore}%</Text>
            )}
            {feedback?.assessment ? (
              <Text style={styles.assessment}>{feedback.assessment}</Text>
            ) : (
              <Text style={styles.muted}>Your interview has been saved.</Text>
            )}
            {!!feedback?.strengths?.length && (
              <FeedbackList title="Strengths" items={feedback.strengths} />
            )}
            {!!feedback?.improvements?.length && (
              <FeedbackList title="Areas to improve" items={feedback.improvements} />
            )}
            <Text style={styles.resultMeta}>
              {feedback?.answeredQuestions ?? '—'} answered · {feedback?.missedQuestions ?? 0} missed
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/explore')}
            >
              <Text style={styles.primaryText}>Back to interview history</Text>
            </TouchableOpacity>
          </View>
        ) : question ? (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>{session.purpose.toUpperCase()}</Text>
            <Text style={styles.questionCount}>
              QUESTION {question.index + 1} OF {session.totalQuestions}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progress,
                  { width: `${Math.min(100, ((question.index + 1) / session.totalQuestions) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.question}>{question.text}</Text>
            <Text style={styles.difficulty}>{question.difficulty} · Text response</Text>
            <TextInput
              style={styles.answerInput}
              placeholder="Type your answer here..."
              placeholderTextColor="#8190B2"
              multiline
              textAlignVertical="top"
              value={answer}
              onChangeText={setAnswer}
              editable={!working && remaining !== 0}
            />
            <TouchableOpacity
              style={[styles.primaryButton, (working || !answer.trim()) && styles.disabled]}
              onPress={() => void submit()}
              disabled={working || !answer.trim()}
            >
              {working ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={styles.primaryText}>Submit answer  →</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => void skip()}
              disabled={working}
            >
              <Text style={styles.secondaryText}>Skip this question</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={endInterview} disabled={working} style={styles.endButton}>
              <Text style={styles.endText}>End interview</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>Question unavailable</Text>
            <TouchableOpacity onPress={() => void refresh()}>
              <Text style={styles.retry}>Reload session</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FeedbackList({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={styles.feedbackGroup}>
      <Text style={styles.feedbackTitle}>{title}</Text>
      {items.map((item, index) => (
        <Text key={`${title}-${index}`} style={styles.feedbackItem}>• {item}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, flexGrow: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  back: { paddingVertical: 10, paddingRight: 10 },
  backText: { color: C.cyan, fontSize: 14, fontWeight: '700' },
  timer: { color: C.white, fontSize: 15, fontWeight: '900', backgroundColor: C.card, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  timerLow: { color: '#BE123C' },
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 20, padding: 18, flexGrow: 1 },
  eyebrow: { color: C.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: C.white, fontSize: 25, fontWeight: '900', marginTop: 10 },
  questionCount: { color: C.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 22 },
  progressTrack: { height: 5, backgroundColor: '#0F1830', borderRadius: 5, marginTop: 10 },
  progress: { height: 5, backgroundColor: C.cyan, borderRadius: 5 },
  question: { color: C.white, fontSize: 20, lineHeight: 29, fontWeight: '800', marginTop: 24 },
  difficulty: { color: C.purple, fontSize: 11, fontWeight: '700', marginTop: 10 },
  answerInput: { minHeight: 190, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, color: C.white, fontSize: 14, lineHeight: 21, marginTop: 23 },
  primaryButton: { minHeight: 48, borderRadius: 13, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  secondaryButton: { minHeight: 44, borderRadius: 13, backgroundColor: '#FFFFFF', borderColor: C.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { color: C.cyan, fontSize: 12, fontWeight: '800' },
  endButton: { alignSelf: 'center', padding: 12, marginTop: 4 },
  endText: { color: '#F39AAE', fontSize: 11, fontWeight: '700' },
  score: { color: C.cyan, fontSize: 46, fontWeight: '900', marginTop: 18 },
  assessment: { color: C.white, fontSize: 13, lineHeight: 21, marginTop: 13 },
  muted: { color: C.muted, fontSize: 12, lineHeight: 19, marginTop: 8 },
  resultMeta: { color: C.muted, fontSize: 11, marginTop: 18 },
  feedbackGroup: { marginTop: 20 },
  feedbackTitle: { color: C.white, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  feedbackItem: { color: C.muted, fontSize: 12, lineHeight: 19, marginTop: 4 },
  errorBox: { backgroundColor: '#FFF1F2', borderRadius: 13, borderWidth: 1, borderColor: '#FECDD3', padding: 12, marginBottom: 15 },
  errorText: { color: '#BE123C', fontSize: 12, lineHeight: 18 },
  retry: { color: C.cyan, fontSize: 12, fontWeight: '800', marginTop: 8 },
});
