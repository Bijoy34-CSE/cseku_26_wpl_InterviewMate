import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileHeader } from '@/components/mobile-header';
import { InterviewSession, listInterviewSessions } from '@/lib/api';
import { getCurrentUser, getSavedToken } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

const C = {
  canvas: '#F8F9FD',
  white: '#FFFFFF',
  border: '#E4E8F2',
  ink: '#101828',
  muted: '#667085',
  blue: '#2438D5',
  pale: '#EEF2FF',
  red: '#BE123C',
};

export default function HistoryScreen() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getSavedToken();
      if (!token) {
        setUser(null);
        setSessions([]);
        return;
      }
      const [currentUser, result] = await Promise.all([
        getCurrentUser(),
        listInterviewSessions(token),
      ]);
      setUser(currentUser);
      setSessions(result.sessions);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load interview history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const scored = sessions.filter(
    (session) => session.status === 'completed' && typeof session.overallScore === 'number',
  );
  const average = scored.length
    ? Math.round(scored.reduce((sum, session) => sum + (session.overallScore || 0), 0) / scored.length)
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <MobileHeader
        title="Interview history"
        userName={user?.name}
        userEmail={user?.email}
        isAdmin={user?.role === 'admin'}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>YOUR SESSIONS</Text>
        <Text style={styles.title}>Interview history</Text>
        <Text style={styles.subtitle}>
          Reopen an active session or review your completed interview results.
        </Text>

        {scored.length > 0 && (
          <View style={styles.summary}>
            <Summary value={String(sessions.length)} label="Interviews" />
            <Summary value={String(scored.length)} label="Completed" />
            <Summary value={`${average}%`} label="Average" />
          </View>
        )}

        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void load()}>
              <Text style={styles.retry}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={C.blue} style={styles.loader} />
        ) : !user ? (
          <TouchableOpacity style={styles.empty} onPress={() => router.push('/login')}>
            <Text style={styles.emptyTitle}>Sign in to view your interview history</Text>
            <Text style={styles.subtitle}>Your sessions will appear here after you sign in.</Text>
          </TouchableOpacity>
        ) : sessions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No interviews yet</Text>
            <Text style={styles.subtitle}>Upload a document and take your first mock interview.</Text>
            <TouchableOpacity style={styles.primary} onPress={() => router.push('/explore')}>
              <Text style={styles.primaryText}>Start your first interview</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              style={styles.session}
              onPress={() =>
                router.push({ pathname: '/session/[id]', params: { id: session.id } })
              }
            >
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>
                  {typeof session.overallScore === 'number' ? session.overallScore : '—'}
                </Text>
              </View>
              <View style={styles.sessionInfo}>
                <View style={styles.sessionTitleLine}>
                  <Text style={styles.sessionTitle} numberOfLines={1}>{session.purpose}</Text>
                  <Text style={[styles.status, session.status === 'completed' ? styles.completed : styles.inProgress]}>
                    {session.status === 'completed'
                      ? session.timedOut ? 'TIMED OUT' : 'COMPLETED'
                      : 'IN PROGRESS'}
                  </Text>
                </View>
                <Text style={styles.meta}>
                  {session.difficulty} · {session.totalQuestions} questions · {session.durationLabel}
                </Text>
                <Text style={styles.open}>
                  {session.status === 'completed' ? 'View interview review  ›' : 'Resume interview  ›'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Summary({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  content: { padding: 18, paddingBottom: 36 },
  kicker: { color: C.blue, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: C.ink, fontSize: 24, fontWeight: '900', marginTop: 4 },
  subtitle: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 6 },
  summary: { flexDirection: 'row', backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 15, marginTop: 17, marginBottom: 13 },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: 13 },
  summaryValue: { color: C.ink, fontSize: 16, fontWeight: '900' },
  summaryLabel: { color: C.muted, fontSize: 9, marginTop: 4 },
  error: { padding: 13, borderRadius: 13, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3', marginTop: 12 },
  errorText: { color: C.red, fontSize: 11, lineHeight: 16 },
  retry: { color: C.blue, fontSize: 11, fontWeight: '800', marginTop: 7 },
  loader: { marginTop: 25 },
  empty: { alignItems: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 17, padding: 22, marginTop: 18 },
  emptyTitle: { color: C.ink, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  primary: { marginTop: 15, borderRadius: 11, backgroundColor: C.blue, paddingHorizontal: 14, paddingVertical: 11 },
  primaryText: { color: C.white, fontSize: 11, fontWeight: '800' },
  session: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 15, padding: 13, marginTop: 10 },
  scoreCircle: { width: 45, height: 45, borderRadius: 23, borderWidth: 3, borderColor: '#C7D2FE', alignItems: 'center', justifyContent: 'center' },
  scoreValue: { color: C.ink, fontSize: 11, fontWeight: '900' },
  sessionInfo: { flex: 1 },
  sessionTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sessionTitle: { flex: 1, color: C.ink, fontSize: 12, fontWeight: '800' },
  status: { fontSize: 7, fontWeight: '900', letterSpacing: 0.3 },
  completed: { color: '#059669' },
  inProgress: { color: '#0284C7' },
  meta: { color: C.muted, fontSize: 9, marginTop: 6 },
  open: { color: C.blue, fontSize: 9, fontWeight: '800', marginTop: 8 },
});
