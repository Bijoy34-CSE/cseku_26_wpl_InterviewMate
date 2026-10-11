import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
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
};

const categories = [
  ['Communication', 'communication'],
  ['Technical knowledge', 'technicalKnowledge'],
  ['Confidence', 'confidence'],
  ['Answer relevance', 'answerRelevance'],
  ['Structured answers', 'structuralFlow'],
];

export default function PerformanceScreen() {
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
      setSessions(
        result.sessions.filter(
          (session) => session.status === 'completed' && typeof session.overallScore === 'number',
        ),
      );
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load performance data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const scores = sessions.map((session) => session.overallScore || 0);
  const average = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : null;
  const highest = scores.length ? Math.max(...scores) : null;
  const skillAverages = categories
    .map(([label, key]) => {
      const values = sessions
        .map((session) => session.categoryScores?.[key])
        .filter((value): value is number => typeof value === 'number');
      return {
        label,
        score: values.length
          ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
          : null,
      };
    })
    .filter((item): item is { label: string; score: number } => item.score !== null);

  return (
    <SafeAreaView style={styles.safe}>
      <MobileHeader
        title="Performance"
        userName={user?.name}
        userEmail={user?.email}
        isAdmin={user?.role === 'admin'}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>YOUR PROGRESS</Text>
        <Text style={styles.title}>Performance analytics</Text>
        <Text style={styles.subtitle}>Track your real interview scores and skill trends.</Text>

        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void load()}><Text style={styles.retry}>Retry</Text></TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={C.blue} style={styles.loader} />
        ) : !user ? (
          <TouchableOpacity style={styles.empty} onPress={() => router.push('/login')}>
            <Text style={styles.emptyTitle}>Sign in to view your performance</Text>
          </TouchableOpacity>
        ) : sessions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Complete an interview to see analytics</Text>
            <Text style={styles.subtitle}>Scores and skill insights will be based on your completed sessions.</Text>
            <TouchableOpacity style={styles.primary} onPress={() => router.push('/explore')}>
              <Text style={styles.primaryText}>Start an interview</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.metrics}>
              <Metric label="COMPLETED INTERVIEWS" value={String(sessions.length)} />
              <Metric label="AVERAGE SCORE" value={`${average}%`} />
              <Metric label="HIGHEST SCORE" value={`${highest}%`} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Score trend</Text>
              <Text style={styles.cardSubtitle}>Completed interviews, oldest to newest</Text>
              <View style={styles.chart}>
                {sessions.slice().reverse().map((session, index) => {
                  const score = session.overallScore || 0;
                  return (
                    <View key={session.id} style={styles.barColumn}>
                      <Text style={styles.barScore}>{score}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.bar, { height: `${Math.max(score, 4)}%` }]} />
                      </View>
                      <Text style={styles.barLabel}>S{index + 1}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Skill breakdown</Text>
              <Text style={styles.cardSubtitle}>Averages from available AI scorecards</Text>
              {skillAverages.length ? (
                skillAverages.map((item) => (
                  <View key={item.label} style={styles.skillRow}>
                    <View style={styles.skillHeading}>
                      <Text style={styles.skillLabel}>{item.label}</Text>
                      <Text style={styles.skillScore}>{item.score}%</Text>
                    </View>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${item.score}%` }]} />
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.cardSubtitle}>No category scores are available yet.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  safe: { flex: 1, backgroundColor: C.canvas },
  content: { padding: 18, paddingBottom: 38 },
  kicker: { color: C.blue, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: C.ink, fontSize: 23, fontWeight: '900', marginTop: 4 },
  subtitle: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 6 },
  error: { padding: 13, borderRadius: 13, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3', marginTop: 13 },
  errorText: { color: '#BE123C', fontSize: 11 },
  retry: { color: C.blue, fontSize: 11, fontWeight: '800', marginTop: 7 },
  loader: { marginTop: 25 },
  empty: { alignItems: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 20, marginTop: 18 },
  emptyTitle: { color: C.ink, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  primary: { marginTop: 13, borderRadius: 11, backgroundColor: C.blue, paddingHorizontal: 14, paddingVertical: 10 },
  primaryText: { color: C.white, fontSize: 11, fontWeight: '800' },
  metrics: { flexDirection: 'row', gap: 7, marginTop: 17, marginBottom: 12 },
  metric: { flex: 1, minHeight: 75, justifyContent: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 13, paddingHorizontal: 9 },
  metricLabel: { color: C.muted, fontSize: 7, lineHeight: 10, fontWeight: '800' },
  metricValue: { color: C.ink, fontSize: 18, fontWeight: '900', marginTop: 7 },
  card: { padding: 15, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 16, marginTop: 10 },
  cardTitle: { color: C.ink, fontSize: 14, fontWeight: '900' },
  cardSubtitle: { color: C.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  chart: { height: 170, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', marginTop: 17, borderBottomWidth: 1, borderBottomColor: C.border },
  barColumn: { height: '100%', flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barScore: { color: C.muted, fontSize: 8, marginBottom: 5 },
  barTrack: { width: 20, height: '72%', justifyContent: 'flex-end', backgroundColor: C.pale, borderRadius: 7, overflow: 'hidden' },
  bar: { width: '100%', backgroundColor: C.blue, borderRadius: 7 },
  barLabel: { color: C.muted, fontSize: 8, marginTop: 6, marginBottom: 5 },
  skillRow: { marginTop: 15 },
  skillHeading: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  skillLabel: { color: '#344054', fontSize: 10, fontWeight: '700' },
  skillScore: { color: C.blue, fontSize: 10, fontWeight: '900' },
  track: { height: 7, backgroundColor: C.pale, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.blue, borderRadius: 5 },
});
