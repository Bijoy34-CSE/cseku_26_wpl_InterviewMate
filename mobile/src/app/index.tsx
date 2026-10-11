
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileBrand } from '@/components/mobile-brand';
import { MobileHeader } from '@/components/mobile-header';
import { apiRequest, listInterviewSessions } from '@/lib/api';
import type { InterviewSession } from '@/lib/api';
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

function Feature({
  symbol,
  title,
  subtitle,
  onPress,
}: {
  symbol: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.feature}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.featureIcon}>
        <Text style={styles.symbol}>{symbol}</Text>
      </View>
      <View style={styles.featureCopy}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);
  const [dashboardError, setDashboardError] = useState('');
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const token = await getSavedToken();
      if (!token) {
        setUser(null);
        setSessions([]);
        setPlan(null);
        setDashboardError('');
        return;
      }
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      const [sessionResult, planResult] = await Promise.all([
        listInterviewSessions(token),
        apiRequest<{ plan: Record<string, unknown> }>('/auth/plan', { token }),
      ]);
      setSessions(sessionResult.sessions);
      setPlan(planResult.plan);
      setDashboardError('');
    } catch (error) {
      setDashboardError(
        error instanceof Error ? error.message : 'Could not load your dashboard.',
      );
    } finally {
      setLoadingDashboard(false);
      setCheckedAuth(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => void loadDashboard(), 0);
      return () => clearTimeout(timer);
    }, [loadDashboard]),
  );

  if (!checkedAuth || loadingDashboard) {
    return (
      <SafeAreaView style={dashboardStyles.loading}>
        <ActivityIndicator color="#2438D5" />
        <Text style={dashboardStyles.loadingText}>Loading InterviewMate...</Text>
      </SafeAreaView>
    );
  }

  if (user) {
    return (
      <DashboardHome
        user={user}
        sessions={sessions}
        plan={plan}
        error={dashboardError}
        onRetry={() => void loadDashboard()}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <MobileBrand subtitle="AI INTERVIEW COACH" />
        </View>
        <View style={styles.authActions}>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.authButtonText}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.authButton, styles.authButtonPrimary]}
            onPress={() => router.push('/register')}
          >
            <Text style={styles.authButtonPrimaryText}>Create account</Text>
          </TouchableOpacity>
        </View>

        {dashboardError ? (
          <View style={dashboardStyles.errorBox}>
            <Text style={dashboardStyles.errorText}>{dashboardError}</Text>
            <TouchableOpacity onPress={() => void loadDashboard()}>
              <Text style={dashboardStyles.retry}>Retry account connection</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>YOUR NEXT OPPORTUNITY STARTS HERE</Text>

          <Text style={styles.heading}>
            Prepare with purpose.{' \n'}
            <Text style={styles.highlight}>Perform with confidence.</Text>
          </Text>

          <Text style={styles.description}>
            Practice, refine your answers, and build the confidence to make
            your next interview count.
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.primaryButton}
          onPress={() => router.push('/explore')}
        >
          <View style={styles.playCircle}>
            <Text style={styles.play}>▶</Text>
          </View>
          <View style={styles.primaryCopy}>
            <Text style={styles.primaryTitle}>Start Interview</Text>
            <Text style={styles.primarySubtitle}>
              Get ready for your next opportunity
            </Text>
          </View>
          <Text style={styles.primaryArrow}>→</Text>
        </TouchableOpacity>
<View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Preparation Hub</Text>
          <Text style={styles.sectionNote}>KEEP IMPROVING</Text>
        </View>

        <Feature
          symbol="✦"
          title="Mock Interviews"
          subtitle="Practice and prepare with AI"
          onPress={() => router.push('/explore')}
        />

        <Feature
          symbol="✎"
          title="Practice Questions"
          subtitle="Answer curated questions and get AI feedback"
          onPress={() => router.push('/practice')}
        />

        <Feature
          symbol="↗"
          title="Performance"
          subtitle="Review your progress and insights"
          onPress={() => router.push('/performance')}
        />

        <Feature
          symbol="◷"
          title="Interview History"
          subtitle="Return to previous sessions"
          onPress={() => router.push('/history')}
        />

        <View style={styles.tip}>
          <Text style={styles.tipSymbol}>✧</Text>
          <View style={styles.tipCopy}>
            <Text style={styles.tipTitle}>Every answer is progress.</Text>
            <Text style={styles.tipText}>
              Practice consistently and turn preparation into confidence.
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          INTERVIEWMATE · PREPARE WITH PURPOSE
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function DashboardHome({
  user,
  sessions,
  plan,
  error,
  onRetry,
}: {
  user: AuthUser;
  sessions: InterviewSession[];
  plan: Record<string, unknown> | null;
  error: string;
  onRetry: () => void;
}) {
  const completed = sessions.filter(
    (session) =>
      session.status === 'completed' &&
      typeof session.overallScore === 'number',
  );
  const average = completed.length
    ? Math.round(
        completed.reduce((sum, session) => sum + (session.overallScore || 0), 0) /
          completed.length,
      )
    : null;
  const planName = String(plan?.plan || 'free');

  return (
    <SafeAreaView style={dashboardStyles.safe}>
      <MobileHeader
        title="Dashboard"
        userName={user.name}
        userEmail={user.email}
        isAdmin={user.role === 'admin'}
      />
      <ScrollView contentContainerStyle={dashboardStyles.content}>
        <View style={dashboardStyles.welcome}>
          <View style={dashboardStyles.welcomeCopy}>
            <Text style={dashboardStyles.kicker}>YOUR WORKSPACE</Text>
            <Text style={dashboardStyles.title}>
              Welcome, {user.name?.split(/\s+/)[0] || 'there'}
            </Text>
            <Text style={dashboardStyles.subtitle}>
              Ready to improve your interview performance today?
            </Text>
          </View>
          <TouchableOpacity
            style={dashboardStyles.primary}
            onPress={() => router.push('/explore')}
          >
            <Text style={dashboardStyles.primaryText}>＋  Start new interview</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={dashboardStyles.errorBox}>
            <Text style={dashboardStyles.errorText}>{error}</Text>
            <TouchableOpacity onPress={onRetry}>
              <Text style={dashboardStyles.retry}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={dashboardStyles.planCard}>
          <View style={dashboardStyles.planCopy}>
            <Text style={dashboardStyles.planLabel}>{planName.toUpperCase()} PLAN</Text>
            <Text style={dashboardStyles.planDescription}>
              {plan?.isUnlimited
                ? 'Unlimited Premium access for administrators.'
                : planName === 'premium'
                  ? 'Your Premium interview preparation is active.'
                  : `${String(plan?.freeSessionsRemaining ?? '—')} free interviews remaining this month.`}
            </Text>
          </View>
          {planName !== 'premium' && (
            <TouchableOpacity
              style={dashboardStyles.planButton}
              onPress={() => router.push('/upgrade')}
            >
              <Text style={dashboardStyles.planButtonText}>View plan</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={dashboardStyles.metrics}>
          <MetricCard label="TOTAL INTERVIEWS" value={String(sessions.length)} />
          <MetricCard label="COMPLETED" value={String(completed.length)} />
          <MetricCard label="AVERAGE SCORE" value={average === null ? '—' : `${average}%`} />
        </View>

        <View style={dashboardStyles.sectionHead}>
          <View>
            <Text style={dashboardStyles.sectionTitle}>Recent interviews</Text>
            <Text style={dashboardStyles.sectionSubtitle}>Your latest saved sessions</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/history')}>
            <Text style={dashboardStyles.link}>View all</Text>
          </TouchableOpacity>
        </View>

        {sessions.length ? (
          sessions.slice(0, 5).map((session) => (
            <TouchableOpacity
              key={session.id}
              style={dashboardStyles.sessionCard}
              onPress={() =>
                router.push({
                  pathname: '/session/[id]',
                  params: { id: session.id },
                })
              }
            >
              <View style={dashboardStyles.sessionIcon}>
                <Text style={dashboardStyles.sessionIconText}>IM</Text>
              </View>
              <View style={dashboardStyles.sessionCopy}>
                <Text style={dashboardStyles.sessionTitle} numberOfLines={1}>
                  {session.purpose}
                </Text>
                <Text style={dashboardStyles.sessionMeta}>
                  {session.difficulty} · {session.totalQuestions} questions · {session.durationLabel}
                </Text>
              </View>
              <View style={dashboardStyles.sessionScore}>
                <Text style={dashboardStyles.scoreValue}>
                  {typeof session.overallScore === 'number'
                    ? `${session.overallScore}%`
                    : session.status === 'in_progress'
                      ? 'Continue'
                      : '—'}
                </Text>
                <Text style={dashboardStyles.scoreCaption}>
                  {session.status === 'completed' ? 'SCORE' : 'STATUS'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={dashboardStyles.empty}>
            <Text style={dashboardStyles.emptyTitle}>No interviews yet</Text>
            <Text style={dashboardStyles.sectionSubtitle}>
              Start your first interview to see your progress here.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={dashboardStyles.metricCard}>
      <Text style={dashboardStyles.metricLabel}>{label}</Text>
      <Text style={dashboardStyles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 35,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  authActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 0,
    marginBottom: 25,
  },
  authButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  authButtonText: { color: C.blue, fontSize: 10, fontWeight: '800' },
  authButtonPrimary: { backgroundColor: C.blue, borderColor: C.blue },
  authButtonPrimaryText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  hero: {
    marginBottom: 25,
  },
  eyebrow: {
    color: C.cyan,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 16,
  },
  heading: {
    color: C.white,
    fontSize: 33,
    lineHeight: 41,
    fontWeight: '900',
    letterSpacing: -1.1,
  },
  highlight: {
    color: C.blue,
  },
  description: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 14,
  },
  primaryButton: {
    minHeight: 86,
    borderRadius: 19,
    backgroundColor: C.blue,
    borderWidth: 1,
    borderColor: C.blue,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 34,
  },
  playCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    color: C.white,
    fontSize: 14,
  },
  primaryCopy: {
    flex: 1,
    marginLeft: 12,
  },
  primaryTitle: {
    color: C.white,
    fontSize: 16,
    fontWeight: '800',
  },
  primarySubtitle: {
    color: '#E5EAFF',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 5,
  },
  primaryArrow: {
    color: C.white,
    fontSize: 23,
    marginLeft: 5,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    color: C.white,
    fontSize: 19,
    fontWeight: '800',
  },
  sectionNote: {
    color: C.cyan,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginTop: 6,
  },
  feature: {
    minHeight: 77,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 13,
    marginBottom: 11,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#D0D5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: {
    color: C.cyan,
    fontSize: 23,
    fontWeight: '700',
  },
  featureCopy: {
    flex: 1,
    marginLeft: 12,
  },
  featureTitle: {
    color: C.white,
    fontSize: 13,
    fontWeight: '800',
  },
  featureSubtitle: {
    color: C.muted,
    fontSize: 10,
    marginTop: 5,
  },
  arrow: {
    color: C.purple,
    fontSize: 27,
    marginLeft: 8,
  },
  tip: {
    flexDirection: 'row',
    padding: 16,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
  },
  tipSymbol: {
    color: C.purple,
    fontSize: 24,
    marginRight: 12,
  },
  tipCopy: {
    flex: 1,
  },
  tipTitle: {
    color: C.white,
    fontSize: 13,
    fontWeight: '800',
  },
  tipText: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 18,
    marginTop: 6,
  },
  footer: {
    color: '#7180A6',
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 25,
  },
});

const dashboardStyles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#F8F9FD', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#667085', fontSize: 12, fontWeight: '600', marginTop: 12 },
  safe: { flex: 1, backgroundColor: '#F8F9FD' },
  content: { padding: 18, paddingBottom: 36 },
  welcome: { gap: 16, marginBottom: 18 },
  welcomeCopy: { gap: 5 },
  kicker: { color: '#2438D5', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#101828', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: '#667085', fontSize: 12, lineHeight: 18 },
  primary: { alignSelf: 'flex-start', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#2438D5' },
  primaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  errorBox: { padding: 13, marginBottom: 14, borderRadius: 13, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3' },
  errorText: { color: '#BE123C', fontSize: 11, lineHeight: 16 },
  retry: { color: '#2438D5', fontSize: 11, fontWeight: '800', marginTop: 7 },
  planCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, borderRadius: 17, borderWidth: 1, borderColor: '#DEE5FF', backgroundColor: '#EEF2FF', marginBottom: 14 },
  planCopy: { flex: 1 },
  planLabel: { color: '#4338CA', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  planDescription: { color: '#475467', fontSize: 11, lineHeight: 16, marginTop: 5 },
  planButton: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#D0D5DD' },
  planButtonText: { color: '#2438D5', fontSize: 10, fontWeight: '800' },
  metrics: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  metricCard: { flex: 1, minHeight: 79, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: '#E4E8F2', backgroundColor: '#FFFFFF' },
  metricLabel: { color: '#667085', fontSize: 7, lineHeight: 10, fontWeight: '800', letterSpacing: 0.4 },
  metricValue: { color: '#101828', fontSize: 20, fontWeight: '900', marginTop: 7 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 },
  sectionTitle: { color: '#101828', fontSize: 16, fontWeight: '900' },
  sectionSubtitle: { color: '#667085', fontSize: 10, lineHeight: 15, marginTop: 4 },
  link: { color: '#2438D5', fontSize: 11, fontWeight: '800' },
  sessionCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 9, borderRadius: 15, borderWidth: 1, borderColor: '#E4E8F2', backgroundColor: '#FFFFFF' },
  sessionIcon: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#EEF2FF' },
  sessionIconText: { color: '#2438D5', fontSize: 10, fontWeight: '900' },
  sessionCopy: { flex: 1 },
  sessionTitle: { color: '#101828', fontSize: 12, fontWeight: '800' },
  sessionMeta: { color: '#667085', fontSize: 9, marginTop: 5 },
  sessionScore: { alignItems: 'flex-end' },
  scoreValue: { color: '#2438D5', fontSize: 12, fontWeight: '900' },
  scoreCaption: { color: '#98A2B3', fontSize: 7, fontWeight: '800', marginTop: 4 },
  empty: { alignItems: 'center', padding: 22, borderRadius: 15, borderWidth: 1, borderColor: '#E4E8F2', backgroundColor: '#FFFFFF' },
  emptyTitle: { color: '#101828', fontSize: 13, fontWeight: '800' },
});