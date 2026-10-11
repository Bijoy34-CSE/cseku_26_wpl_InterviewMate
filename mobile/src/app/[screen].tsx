import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { MobileHeader } from '@/components/mobile-header';
import { apiRequest, InterviewSession, uploadProfileAvatar } from '@/lib/api';
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
  green: '#047857',
};

type PlanStatus = {
  plan: string;
  isUnlimited?: boolean;
  subscriptionExpiresAt?: string;
  freeSessionsUsed?: number;
  freeSessionsRemaining?: number;
  month?: string;
  monthlyPriceBdt?: number;
  yearlyPriceBdt?: number;
};

type Payment = {
  _id?: string;
  id?: string;
  provider: string;
  payerNumber?: string;
  providerReference?: string;
  amount?: number;
  plan?: string;
  status?: string;
  adminNote?: string;
  user?: { name?: string; email?: string };
};

type WorkspaceData = {
  user?: AuthUser & {
    preferences?: Record<string, unknown>;
    profile?: Record<string, unknown>;
  };
  plan?: PlanStatus;
  paymentInstructions?: { merchantAccounts?: Record<string, string> };
  pendingPayment?: Payment | null;
  latestPayment?: Payment | null;
  stats?: Record<string, number>;
  latestPayments?: Payment[];
  latestUsers?: { _id?: string; name?: string; email?: string; role?: string }[];
  sessions?: (InterviewSession & { user?: { name?: string; email?: string } })[];
  feedback?: { id: string; category: string; message: string; rating?: number }[];
};

const TITLES: Record<string, string> = {
  profile: 'Profile',
  settings: 'Settings',
  upgrade: 'Upgrade plan',
  career: 'Career & Academic',
  community: 'Community',
  feedback: 'Feedback',
  help: 'Help',
  admin: 'Admin panel',
};

const preferenceDefaults: Record<string, unknown> = {
  emailNotif: true,
  interviewReminders: true,
  performanceReports: true,
  practiceSuggestions: false,
  adaptiveDifficulty: true,
  autoPlay: false,
};

export default function WorkspaceScreen() {
  const params = useLocalSearchParams<{ screen: string | string[] }>();
  const screen = Array.isArray(params.screen) ? params.screen[0] : params.screen;
  const title = TITLES[screen || ''] || 'InterviewMate';
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<WorkspaceData>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [university, setUniversity] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [preferences, setPreferences] = useState<Record<string, unknown>>(preferenceDefaults);
  const [category, setCategory] = useState('General Feedback');
  const [message, setMessage] = useState('');
  const [provider, setProvider] = useState('bkash');
  const [planChoice, setPlanChoice] = useState('monthly');
  const [payerNumber, setPayerNumber] = useState('');
  const [providerReference, setProviderReference] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const savedToken = await getSavedToken();
      if (!savedToken) {
        router.replace('/login');
        return;
      }
      setToken(savedToken);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      const profileData =
        currentUser.profile && typeof currentUser.profile === 'object'
          ? currentUser.profile as Record<string, unknown>
          : {};
      setName(currentUser.name || '');
      setUniversity(currentUser.university || '');
      setAvatarUrl(typeof currentUser.avatarUrl === 'string' ? currentUser.avatarUrl : '');
      setProfile({
        degree: String(profileData.degree || ''),
        department: String(profileData.department || ''),
        degreeAndYear: String(profileData.degreeAndYear || ''),
        location: String(profileData.location || ''),
        target: String(profileData.target || ''),
      });

      let result: WorkspaceData = {};
      if (screen === 'profile' || screen === 'settings') {
        result = await apiRequest<WorkspaceData>('/auth/account', { token: savedToken });
        const savedPreferences = result.user?.preferences || {};
        setPreferences({ ...preferenceDefaults, ...savedPreferences });
      } else if (screen === 'upgrade') {
        result = await apiRequest<WorkspaceData>('/auth/plan', { token: savedToken });
      } else if (screen === 'admin' && currentUser.role === 'admin') {
        const [overview, adminSessions] = await Promise.all([
          apiRequest<WorkspaceData>('/admin/overview', { token: savedToken }),
          apiRequest<{ sessions: WorkspaceData['sessions'] }>('/admin/sessions', { token: savedToken }),
        ]);
        result = { ...overview, sessions: adminSessions.sessions };
      } else if (screen === 'career') {
        const sessions = await apiRequest<{ sessions: InterviewSession[] }>('/interview/sessions', { token: savedToken });
        result = { sessions: sessions.sessions };
      } else if (screen === 'feedback') {
        result = await apiRequest<WorkspaceData>('/site-feedback', { token: savedToken });
      }
      setData(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load this page.');
    } finally {
      setLoading(false);
    }
  }, [screen]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function save() {
    if (!token) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (screen === 'profile') {
        const result = await apiRequest<{ user: AuthUser }>('/auth/profile', {
          method: 'PATCH',
          token,
          body: {
            name,
            university,
            profile: {
              degree: profile.degree || '',
              department: profile.department || '',
              degreeAndYear: profile.degreeAndYear || '',
              location: profile.location || '',
              target: profile.target || '',
            },
          },
        });
        setUser(result.user);
        setNotice('Profile saved.');
      } else if (screen === 'settings') {
        const result = await apiRequest<{ user: AuthUser }>('/auth/preferences', {
          method: 'PATCH',
          token,
          body: { preferences },
        });
        setUser(result.user);
        setNotice('Settings saved.');
      } else if (screen === 'feedback') {
        await apiRequest('/site-feedback', {
          method: 'POST',
          token,
          body: { category, message },
        });
        setMessage('');
        setNotice('Thanks—your feedback was sent.');
        await load();
      } else if (screen === 'upgrade') {
        const result = await apiRequest<{ message: string }>('/auth/payments', {
          method: 'POST',
          token,
          body: { provider, payerNumber, providerReference, plan: planChoice },
        });
        setNotice(result.message);
        setPayerNumber('');
        setProviderReference('');
        await load();
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save your changes.');
    } finally {
      setBusy(false);
    }
  }

  async function chooseAvatar() {
    if (!token) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'image/webp'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const image = result.assets[0];
      if (image.size && image.size > 2 * 1024 * 1024) {
        setError('Profile images must be 2MB or smaller.');
        return;
      }
      const extension = image.name.toLowerCase().split('.').pop();
      const mimeType =
        image.mimeType ||
        (extension === 'png'
          ? 'image/png'
          : extension === 'jpg' || extension === 'jpeg'
            ? 'image/jpeg'
            : extension === 'webp'
              ? 'image/webp'
              : 'application/octet-stream');
      setBusy(true);
      setError('');
      setNotice('');
      const response = await uploadProfileAvatar(token, {
        uri: image.uri,
        name: image.name,
        mimeType,
      });
      setUser(response.user);
      setAvatarUrl(typeof response.user.avatarUrl === 'string' ? response.user.avatarUrl : '');
      setNotice('Profile photo updated.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update your profile photo.');
    } finally {
      setBusy(false);
    }
  }

  async function reviewPayment(payment: Payment, status: 'approved' | 'rejected') {
    if (!token || !payment._id) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/admin/payments/${payment._id}`, {
        method: 'PATCH',
        token,
        body: { status },
      });
      setNotice(`Payment ${status}.`);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not review this payment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <MobileHeader
        title={title}
        userName={user?.name}
        userEmail={user?.email}
        isAdmin={user?.role === 'admin'}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>INTERVIEWMATE WORKSPACE</Text>
        <Text style={styles.title}>{title}</Text>
        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void load()}><Text style={styles.link}>Retry</Text></TouchableOpacity>
          </View>
        ) : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        {loading ? (
          <ActivityIndicator color={C.blue} style={styles.loader} />
        ) : screen === 'profile' ? (
          <ProfileForm
            user={user}
            name={name}
            university={university}
            avatarUrl={avatarUrl}
            profile={profile}
            onChooseAvatar={() => void chooseAvatar()}
            onName={setName}
            onUniversity={setUniversity}
            onProfile={(key, value) => setProfile((current) => ({ ...current, [key]: value }))}
            onSave={() => void save()}
            busy={busy}
          />
        ) : screen === 'settings' ? (
          <SettingsForm
            preferences={preferences}
            onChange={(key, value) => setPreferences((current) => ({ ...current, [key]: value }))}
            onSave={() => void save()}
            busy={busy}
          />
        ) : screen === 'upgrade' ? (
          <UpgradeForm
            data={data}
            provider={provider}
            planChoice={planChoice}
            payerNumber={payerNumber}
            reference={providerReference}
            onProvider={setProvider}
            onPlan={setPlanChoice}
            onPayer={setPayerNumber}
            onReference={setProviderReference}
            onSubmit={() => void save()}
            busy={busy}
          />
        ) : screen === 'feedback' ? (
          <FeedbackForm
            history={data.feedback || []}
            category={category}
            message={message}
            onCategory={setCategory}
            onMessage={setMessage}
            onSubmit={() => void save()}
            busy={busy}
          />
        ) : screen === 'admin' ? (
          user?.role === 'admin' ? (
            <AdminView data={data} busy={busy} onReview={reviewPayment} />
          ) : (
            <InfoCard title="Administrator access required" body="This page is available only to an administrator account." />
          )
        ) : screen === 'career' ? (
          <CareerView user={user} sessions={data.sessions || []} />
        ) : screen === 'community' ? (
          <CommunityView />
        ) : screen === 'help' ? (
          <HelpView />
        ) : (
          <InfoCard title="Page unavailable" body="This InterviewMate page could not be opened." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function PrimaryButton({ label, onPress, busy = false }: { label: string; onPress: () => void; busy?: boolean }) {
  return (
    <TouchableOpacity style={[styles.primary, busy && styles.disabled]} onPress={onPress} disabled={busy}>
      {busy ? <ActivityIndicator color={C.white} /> : <Text style={styles.primaryText}>{label}</Text>}
    </TouchableOpacity>
  );
}

function ProfileForm({
  user,
  name,
  university,
  avatarUrl,
  profile,
  onChooseAvatar,
  onName,
  onUniversity,
  onProfile,
  onSave,
  busy,
}: {
  user: AuthUser | null;
  name: string;
  university: string;
  avatarUrl: string;
  profile: Record<string, string>;
  onChooseAvatar: () => void;
  onName: (value: string) => void;
  onUniversity: (value: string) => void;
  onProfile: (key: string, value: string) => void;
  onSave: () => void;
  busy: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.avatarRow}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.profileAvatar} />
        ) : (
          <View style={styles.profileAvatarPlaceholder}>
            <Text style={styles.profileAvatarInitial}>
              {(name.trim()[0] || 'U').toUpperCase()}
            </Text>
          </View>
        )}
        <TouchableOpacity style={styles.avatarButton} onPress={onChooseAvatar} disabled={busy}>
          <Text style={styles.avatarButtonText}>Change photo</Text>
          <Text style={styles.avatarHint}>PNG, JPG, or WebP · max 2MB</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.cardTitle}>Profile information</Text>
      <Text style={styles.cardSubtitle}>{user?.email}</Text>
      <Field label="Full name" value={name} onChange={onName} />
      <Field label="University" value={university} onChange={onUniversity} />
      <Field label="Degree" value={profile.degree || ''} onChange={(value) => onProfile('degree', value)} />
      <Field label="Department" value={profile.department || ''} onChange={(value) => onProfile('department', value)} />
      <Field label="Degree and year" value={profile.degreeAndYear || ''} onChange={(value) => onProfile('degreeAndYear', value)} />
      <Field label="Location" value={profile.location || ''} onChange={(value) => onProfile('location', value)} />
      <Field label="Career target" value={profile.target || ''} onChange={(value) => onProfile('target', value)} />
      <PrimaryButton label="Save profile" onPress={onSave} busy={busy} />
    </View>
  );
}

function SettingsForm({
  preferences,
  onChange,
  onSave,
  busy,
}: {
  preferences: Record<string, unknown>;
  onChange: (key: string, value: boolean) => void;
  onSave: () => void;
  busy: boolean;
}) {
  const items = [
    ['emailNotif', 'Email notifications'],
    ['interviewReminders', 'Interview reminders'],
    ['performanceReports', 'Performance reports'],
    ['practiceSuggestions', 'Practice suggestions'],
    ['adaptiveDifficulty', 'Adaptive interview difficulty'],
    ['autoPlay', 'Auto-play interview prompts'],
  ];
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Preferences</Text>
      <Text style={styles.cardSubtitle}>Choose how InterviewMate works for you.</Text>
      {items.map(([key, label]) => (
        <View key={key} style={styles.switchRow}>
          <Text style={styles.switchLabel}>{label}</Text>
          <Switch
            value={preferences[key] === true}
            onValueChange={(value) => onChange(key, value)}
            trackColor={{ false: '#D0D5DD', true: '#A5B4FC' }}
            thumbColor={preferences[key] === true ? C.blue : '#FFFFFF'}
          />
        </View>
      ))}
      <PrimaryButton label="Save settings" onPress={onSave} busy={busy} />
    </View>
  );
}

function UpgradeForm({
  data,
  provider,
  planChoice,
  payerNumber,
  reference,
  onProvider,
  onPlan,
  onPayer,
  onReference,
  onSubmit,
  busy,
}: {
  data: WorkspaceData;
  provider: string;
  planChoice: string;
  payerNumber: string;
  reference: string;
  onProvider: (value: string) => void;
  onPlan: (value: string) => void;
  onPayer: (value: string) => void;
  onReference: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const plan = data.plan;
  const merchantAccounts = data.paymentInstructions?.merchantAccounts || {};
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Your {plan?.plan || 'Free'} plan</Text>
      {plan?.isUnlimited ? (
        <Text style={styles.successBox}>Administrators have unlimited Premium access.</Text>
      ) : plan?.plan === 'premium' ? (
        <Text style={styles.successBox}>Premium is active{plan.subscriptionExpiresAt ? ` until ${new Date(plan.subscriptionExpiresAt).toLocaleDateString()}` : ''}.</Text>
      ) : (
        <Text style={styles.cardSubtitle}>
          {plan?.freeSessionsRemaining ?? '—'} free sessions remaining this month.
        </Text>
      )}
      {plan?.plan !== 'premium' && !plan?.isUnlimited && (
        <>
          <Text style={styles.sectionLabel}>CHOOSE A PLAN</Text>
          <OptionRow values={['monthly', 'yearly']} value={planChoice} onChange={onPlan} />
          <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
          <OptionRow values={['bkash', 'nagad', 'rocket']} value={provider} onChange={onProvider} />
          <Text style={styles.instructions}>
            Send ৳{planChoice === 'yearly' ? plan?.yearlyPriceBdt ?? 2999 : plan?.monthlyPriceBdt ?? 499} to merchant account {merchantAccounts[provider] || 'shown by the administrator'} using {provider}. Submit your payer number and transaction reference below. Access begins after approval.
          </Text>
          {data.pendingPayment ? (
            <Text style={styles.successBox}>Your payment is awaiting administrator verification.</Text>
          ) : (
            <>
              <Field label="Your payment account number" value={payerNumber} onChange={onPayer} keyboardType="phone-pad" />
              <Field label="Transaction reference" value={reference} onChange={onReference} />
              <PrimaryButton label="Submit payment reference" onPress={onSubmit} busy={busy} />
            </>
          )}
          {data.latestPayment && (
            <Text style={styles.cardSubtitle}>Latest payment status: {data.latestPayment.status || 'unknown'}</Text>
          )}
        </>
      )}
    </View>
  );
}

function OptionRow({ values, value, onChange }: { values: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.options}>
      {values.map((option) => (
        <TouchableOpacity
          key={option}
          style={[styles.option, value === option && styles.optionSelected]}
          onPress={() => onChange(option)}
        >
          <Text style={[styles.optionText, value === option && styles.optionTextSelected]}>
            {option === 'bkash' ? 'bKash' : option === 'nagad' ? 'Nagad' : option === 'rocket' ? 'Rocket' : option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function FeedbackForm({
  history,
  category,
  message,
  onCategory,
  onMessage,
  onSubmit,
  busy,
}: {
  history: NonNullable<WorkspaceData['feedback']>;
  category: string;
  message: string;
  onCategory: (value: string) => void;
  onMessage: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const categories = ['Bug Report', 'Feature Request', 'General Feedback', 'Praise'];
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Share your feedback</Text>
        <Text style={styles.sectionLabel}>CATEGORY</Text>
        <OptionRow values={categories} value={category} onChange={onCategory} />
        <Field label="Message" value={message} onChange={onMessage} multiline />
        <PrimaryButton label="Send feedback" onPress={onSubmit} busy={busy} />
      </View>
      {history.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.kicker}>{item.category}</Text>
          <Text style={styles.cardSubtitle}>{item.message}</Text>
        </View>
      ))}
    </>
  );
}

function AdminView({
  data,
  busy,
  onReview,
}: {
  data: WorkspaceData;
  busy: boolean;
  onReview: (payment: Payment, status: 'approved' | 'rejected') => void;
}) {
  const stats = data.stats || {};
  return (
    <>
      <View style={styles.metricGrid}>
        {Object.entries(stats).map(([key, value]) => (
          <View key={key} style={styles.metricCard}>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{key.replace(/([A-Z])/g, ' $1')}</Text>
          </View>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent interview sessions</Text>
        {(data.sessions || []).slice(0, 25).map((session) => (
          <View key={session.id} style={styles.listItem}>
            <Text style={styles.itemTitle}>{session.purpose}</Text>
            <Text style={styles.cardSubtitle}>
              {session.user?.name || session.user?.email || 'Unknown user'} · {session.status} · {session.totalQuestions} questions
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent payments</Text>
        {(data.latestPayments || []).map((payment, index) => (
          <View key={payment._id || payment.id || `${payment.provider}-${index}`} style={styles.listItem}>
            <Text style={styles.itemTitle}>{payment.user?.name || payment.user?.email || 'User'} · {payment.provider}</Text>
            <Text style={styles.cardSubtitle}>{payment.plan} · ৳{payment.amount} · {payment.status}</Text>
            <Text style={styles.cardSubtitle}>Reference: {payment.providerReference || '—'}</Text>
            {payment.status === 'pending' && (
              <View style={styles.actionRow}>
                <TouchableOpacity disabled={busy} style={styles.approveButton} onPress={() => onReview(payment, 'approved')}>
                  <Text style={styles.actionText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={busy} style={styles.rejectButton} onPress={() => onReview(payment, 'rejected')}>
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>
    </>
  );
}

function CareerView({ user, sessions }: { user: AuthUser | null; sessions: InterviewSession[] }) {
  const profile = user?.profile && typeof user.profile === 'object'
    ? user.profile as Record<string, unknown>
    : {};
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Academic profile</Text>
        <Detail label="University" value={user?.university || 'Not added'} />
        <Detail label="Degree" value={String(profile.degree || 'Not added')} />
        <Detail label="Department" value={String(profile.department || 'Not added')} />
        <Detail label="Graduation year" value={String(profile.degreeAndYear || 'Not added')} />
        <Detail label="Career target" value={String(profile.target || 'Not set')} />
        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/profile')}>
          <Text style={styles.link}>Edit your profile  ›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Interview preparation</Text>
        <Text style={styles.cardSubtitle}>
          {sessions.length} saved interview session{sessions.length === 1 ? '' : 's'} connected to your preparation.
        </Text>
        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/history')}>
          <Text style={styles.link}>Review your sessions  ›</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.cardSubtitle}>{label}</Text>
      <Text style={styles.itemTitle}>{value}</Text>
    </View>
  );
}

function CommunityView() {
  const tips = [
    ['Structure answers with STAR', 'Use Situation, Task, Action, and Result to keep behavioral answers focused.', 'Behavioral'],
    ['Think out loud', 'Explain your reasoning; interviewers want to understand how you approach a problem.', 'Academic'],
    ['Read the feedback, not just the score', 'The written evaluation shows what to change before your next session.', 'Growth'],
    ['Upload the assigned material', 'Real syllabi, slides, and resumes make document-grounded questions more relevant.', 'Setup'],
  ];
  return (
    <>
      {tips.map(([title, body, tag]) => (
        <View key={title} style={styles.card}>
          <Text style={styles.kicker}>{tag}</Text>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{body}</Text>
        </View>
      ))}
      <InfoCard title="Peer discussions" body="Community discussions are on the roadmap. Share an idea through the Feedback page." />
      <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/feedback')}>
        <Text style={styles.link}>Suggest a community feature  ›</Text>
      </TouchableOpacity>
    </>
  );
}

function HelpView() {
  const topics = [
    ['How do I start an interview?', 'Choose Start Interview, select the purpose and difficulty, then upload a PDF, DOCX, or PPTX document.'],
    ['Why is a document required?', 'Interview questions are grounded in the material you upload, so the interview reflects your actual syllabus or resume.'],
    ['Where can I see results?', 'Open Interview History and select a completed session to view its feedback.'],
    ['How do I contact support?', 'Use the Feedback page to submit a bug report or request a feature.'],
  ];
  return (
    <>
      {topics.map(([title, body]) => (
        <View key={title} style={styles.card}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{body}</Text>
        </View>
      ))}
      <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/feedback')}>
        <Text style={styles.link}>Contact us with feedback  ›</Text>
      </TouchableOpacity>
    </>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  content: { padding: 18, paddingBottom: 38 },
  kicker: { color: C.blue, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: C.ink, fontSize: 23, fontWeight: '900', marginTop: 5, marginBottom: 13 },
  loader: { marginTop: 28 },
  error: { padding: 12, backgroundColor: '#FFF1F2', borderColor: '#FECDD3', borderWidth: 1, borderRadius: 13, marginBottom: 12 },
  errorText: { color: C.red, fontSize: 11, lineHeight: 16 },
  notice: { color: C.green, backgroundColor: '#ECFDF3', borderColor: '#A6F4C5', borderWidth: 1, borderRadius: 12, padding: 11, fontSize: 11, marginBottom: 12 },
  link: { color: C.blue, fontSize: 11, fontWeight: '800', marginTop: 7 },
  card: { padding: 15, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, marginBottom: 11 },
  cardTitle: { color: C.ink, fontSize: 14, fontWeight: '900' },
  cardSubtitle: { color: C.muted, fontSize: 10, lineHeight: 16, marginTop: 5 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  profileAvatar: { width: 58, height: 58, borderRadius: 20, backgroundColor: C.pale },
  profileAvatarPlaceholder: { width: 58, height: 58, borderRadius: 20, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' },
  profileAvatarInitial: { color: C.blue, fontSize: 20, fontWeight: '900' },
  avatarButton: { flex: 1, minHeight: 50, justifyContent: 'center' },
  avatarButtonText: { color: C.blue, fontSize: 11, fontWeight: '900' },
  avatarHint: { color: C.muted, fontSize: 9, marginTop: 4 },
  fieldWrap: { marginTop: 14 },
  label: { color: '#475467', fontSize: 9, fontWeight: '800', letterSpacing: 0.7, marginBottom: 6 },
  input: { minHeight: 45, borderRadius: 10, borderWidth: 1, borderColor: '#D0D5DD', backgroundColor: '#FFFFFF', paddingHorizontal: 11, color: C.ink, fontSize: 12 },
  multiline: { minHeight: 115, paddingTop: 12 },
  primary: { minHeight: 45, borderRadius: 11, backgroundColor: C.blue, justifyContent: 'center', alignItems: 'center', marginTop: 18 },
  primaryText: { color: C.white, fontSize: 11, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  switchRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.border },
  switchLabel: { color: C.ink, fontSize: 11, fontWeight: '600', flex: 1, paddingRight: 10 },
  sectionLabel: { color: C.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  option: { borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: '#FFFFFF', paddingHorizontal: 11, paddingVertical: 9 },
  optionSelected: { backgroundColor: C.pale, borderColor: '#A5B4FC' },
  optionText: { color: C.muted, fontSize: 10, fontWeight: '700' },
  optionTextSelected: { color: C.blue },
  instructions: { color: '#344054', fontSize: 10, lineHeight: 16, backgroundColor: C.pale, borderRadius: 11, padding: 11, marginTop: 13 },
  successBox: { color: C.green, backgroundColor: '#ECFDF3', borderRadius: 11, padding: 11, fontSize: 11, lineHeight: 16, marginTop: 13 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  metricCard: { width: '48%', backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 13, padding: 12 },
  metricValue: { color: C.ink, fontSize: 19, fontWeight: '900' },
  metricLabel: { color: C.muted, fontSize: 9, marginTop: 5, textTransform: 'capitalize' },
  listItem: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  itemTitle: { color: C.ink, fontSize: 11, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 9 },
  approveButton: { backgroundColor: '#ECFDF3', borderRadius: 9, paddingVertical: 8, paddingHorizontal: 11 },
  actionText: { color: C.green, fontSize: 9, fontWeight: '900' },
  rejectButton: { backgroundColor: '#FFF1F2', borderRadius: 9, paddingVertical: 8, paddingHorizontal: 11 },
  rejectText: { color: C.red, fontSize: 9, fontWeight: '900' },
  detailRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  linkButton: { paddingVertical: 10 },
});
