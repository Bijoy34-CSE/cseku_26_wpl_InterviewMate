import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
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
  evaluatePracticeAnswer,
  listPracticeQuestions,
} from '@/lib/api';
import type { PracticeEvaluation, PracticeQuestion } from '@/lib/api';
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

const difficultyOptions = ['All', 'Easy', 'Medium', 'Hard'] as const;
type DifficultyFilter = (typeof difficultyOptions)[number];

export default function PracticeScreen() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<PracticeQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<PracticeEvaluation | null>(null);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('All');
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState('');
  const [practiceError, setPracticeError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const savedToken = await getSavedToken();
      if (!savedToken) {
        router.replace('/login');
        return;
      }
      const [currentUser, result] = await Promise.all([
        getCurrentUser(),
        listPracticeQuestions(savedToken),
      ]);
      setToken(savedToken);
      setUser(currentUser);
      setQuestions(result.questions);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not load practice questions.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const filteredQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return questions.filter((question) => {
      const matchesSearch =
        !query ||
        question.question.toLowerCase().includes(query) ||
        question.topic.toLowerCase().includes(query);
      return (
        matchesSearch &&
        (difficulty === 'All' || question.difficulty === difficulty)
      );
    });
  }, [difficulty, questions, search]);

  function chooseQuestion(question: PracticeQuestion) {
    setSelectedQuestion(question);
    setAnswer('');
    setEvaluation(null);
    setPracticeError('');
  }

  async function submitAnswer() {
    if (!token || !selectedQuestion || answer.trim().length < 2) return;
    setEvaluating(true);
    setPracticeError('');
    try {
      const result = await evaluatePracticeAnswer(token, {
        question: selectedQuestion.question,
        answer: answer.trim(),
        topic: selectedQuestion.topic,
        difficulty: selectedQuestion.difficulty,
      });
      setEvaluation(result.result);
    } catch (requestError) {
      setPracticeError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not evaluate your answer. Please try again.',
      );
    } finally {
      setEvaluating(false);
    }
  }

  function returnToQuestions() {
    setSelectedQuestion(null);
    setAnswer('');
    setEvaluation(null);
    setPracticeError('');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <MobileHeader
        title="Practice questions"
        userName={user?.name}
        userEmail={user?.email}
        isAdmin={user?.role === 'admin'}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>AI-EVALUATED PRACTICE</Text>
        <Text style={styles.title}>Practice Questions</Text>
        <Text style={styles.subtitle}>
          Work through a question and get feedback on your written answer.
        </Text>

        {selectedQuestion ? (
          <View style={styles.card}>
            <TouchableOpacity onPress={returnToQuestions} style={styles.backButton}>
              <Text style={styles.backText}>‹  All questions</Text>
            </TouchableOpacity>
            <View style={styles.tags}>
              <Text style={styles.topicTag}>{selectedQuestion.topic}</Text>
              <Text style={styles.difficultyTag}>{selectedQuestion.difficulty}</Text>
            </View>
            <Text style={styles.questionText}>{selectedQuestion.question}</Text>

            {evaluation ? (
              <EvaluationResult
                evaluation={evaluation}
                onTryAgain={() => {
                  setEvaluation(null);
                  setPracticeError('');
                }}
                onDone={returnToQuestions}
              />
            ) : (
              <>
                <Text style={styles.label}>Your answer</Text>
                <TextInput
                  style={styles.answerInput}
                  value={answer}
                  onChangeText={setAnswer}
                  placeholder="Write your answer here..."
                  placeholderTextColor="#98A2B3"
                  multiline
                  textAlignVertical="top"
                  maxLength={12000}
                  editable={!evaluating}
                />
                <Text style={styles.characterCount}>{answer.length}/12,000</Text>
                {practiceError ? (
                  <Text accessibilityRole="alert" style={styles.errorText}>
                    {practiceError}
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (evaluating || answer.trim().length < 2) && styles.disabledButton,
                  ]}
                  onPress={() => void submitAnswer()}
                  disabled={evaluating || answer.trim().length < 2}
                >
                  {evaluating ? (
                    <ActivityIndicator color={C.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Submit for feedback</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search questions or topics"
              placeholderTextColor="#98A2B3"
              accessibilityLabel="Search practice questions"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
            >
              {difficultyOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => setDifficulty(option)}
                  style={[
                    styles.filter,
                    difficulty === option && styles.selectedFilter,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      difficulty === option && styles.selectedFilterText,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {error ? (
              <View style={styles.messageCard}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => void load()}>
                  <Text style={styles.actionText}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : loading ? (
              <ActivityIndicator color={C.blue} style={styles.loader} />
            ) : !user ? (
              <View style={styles.messageCard}>
                <Text style={styles.cardTitle}>Sign in to practice</Text>
                <Text style={styles.subtitle}>
                  Sign in to load questions and receive AI feedback.
                </Text>
              </View>
            ) : filteredQuestions.length > 0 ? (
              filteredQuestions.map((question) => (
                <TouchableOpacity
                  key={question._id}
                  style={styles.questionCard}
                  onPress={() => chooseQuestion(question)}
                  activeOpacity={0.8}
                >
                  <View style={styles.tags}>
                    <Text style={styles.topicTag}>{question.topic}</Text>
                    <Text style={styles.difficultyTag}>{question.difficulty}</Text>
                  </View>
                  <Text style={styles.listQuestion} numberOfLines={4}>
                    {question.question}
                  </Text>
                  <Text style={styles.actionText}>Answer question  ›</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.messageCard}>
                <Text style={styles.cardTitle}>
                  {questions.length === 0
                    ? 'No curated questions yet'
                    : 'No matching questions'}
                </Text>
                <Text style={styles.subtitle}>
                  {questions.length === 0
                    ? 'Try a mock interview while new practice questions are being added.'
                    : 'Try a different search or difficulty filter.'}
                </Text>
                {questions.length === 0 ? (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => router.push('/explore')}
                  >
                    <Text style={styles.primaryButtonText}>Start a mock interview</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function EvaluationResult({
  evaluation,
  onTryAgain,
  onDone,
}: {
  evaluation: PracticeEvaluation;
  onTryAgain: () => void;
  onDone: () => void;
}) {
  const scores: [string, number | null | undefined][] = [
    ['Correctness', evaluation.technicalAccuracy],
    ['Structure', evaluation.structuralFlow],
    ['Communication', evaluation.communication],
    ['Relevance', evaluation.relevance],
    ['Completeness', evaluation.completeness],
  ];
  const feedbackSections: [string, string[]][] = [
    ['Strengths', evaluation.strengths],
    ['Areas to improve', evaluation.weaknesses],
    ['Suggested improvements', evaluation.improvementSuggestions],
  ];

  return (
    <View style={styles.result}>
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>OVERALL SCORE</Text>
        <Text style={styles.score}>{evaluation.overall}/100</Text>
        <Text style={styles.feedbackText}>{evaluation.aiFeedback}</Text>
      </View>
      <View style={styles.scoreGrid}>
        {scores.map(([label, value]) => (
          <View key={label} style={styles.scoreTile}>
            <Text style={styles.scoreTileLabel}>{label}</Text>
            <Text style={styles.scoreTileValue}>{value ?? '—'}</Text>
          </View>
        ))}
      </View>
      {feedbackSections.map(([title, items]) =>
        items?.length ? (
          <View key={title} style={styles.feedbackSection}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {items.map((item, index) => (
              <Text key={`${title}-${index}`} style={styles.feedbackItem}>
                •  {item}
              </Text>
            ))}
          </View>
        ) : null,
      )}
      <View style={styles.feedbackSection}>
        <Text style={styles.sectionTitle}>Example answer</Text>
        <Text style={styles.exampleAnswer}>{evaluation.suggestedAnswer}</Text>
      </View>
      <TouchableOpacity style={styles.secondaryButton} onPress={onTryAgain}>
        <Text style={styles.secondaryButtonText}>Try again</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.primaryButton} onPress={onDone}>
        <Text style={styles.primaryButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  kicker: { color: C.blue, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: C.ink, fontSize: 26, fontWeight: '900', marginTop: -8 },
  subtitle: { color: C.muted, fontSize: 13, lineHeight: 20 },
  searchInput: {
    minHeight: 48,
    paddingHorizontal: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    color: C.ink,
    fontSize: 14,
  },
  filters: { gap: 8, paddingVertical: 2 },
  filter: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selectedFilter: { borderColor: C.blue, backgroundColor: C.pale },
  filterText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  selectedFilterText: { color: C.blue },
  questionCard: {
    padding: 17,
    gap: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  tags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  topicTag: {
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: C.pale,
    color: C.blue,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '800',
  },
  difficultyTag: {
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#F2F4F7',
    color: C.muted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '800',
  },
  listQuestion: { color: C.ink, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  actionText: { color: C.blue, fontSize: 12, fontWeight: '800' },
  messageCard: {
    padding: 18,
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  cardTitle: { color: C.ink, fontSize: 16, fontWeight: '800' },
  loader: { padding: 28 },
  card: {
    padding: 17,
    gap: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  backButton: { alignSelf: 'flex-start', paddingVertical: 3 },
  backText: { color: C.blue, fontSize: 13, fontWeight: '800' },
  questionText: { color: C.ink, fontSize: 17, lineHeight: 25, fontWeight: '800' },
  label: { color: C.ink, fontSize: 13, fontWeight: '800', marginTop: 3 },
  answerInput: {
    minHeight: 170,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#F9FAFB',
    color: C.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  characterCount: { alignSelf: 'flex-end', color: C.muted, fontSize: 11, marginTop: -7 },
  errorText: { color: C.red, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: C.blue,
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: C.white, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  disabledButton: { opacity: 0.55 },
  result: { gap: 14, marginTop: 3 },
  scoreCard: {
    alignItems: 'center',
    padding: 17,
    borderRadius: 16,
    backgroundColor: C.pale,
    gap: 7,
  },
  scoreLabel: { color: C.blue, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  score: { color: C.blue, fontSize: 34, fontWeight: '900' },
  feedbackText: { color: C.ink, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  scoreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scoreTile: {
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  scoreTileLabel: { color: C.muted, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  scoreTileValue: { color: C.ink, fontSize: 17, fontWeight: '900', marginTop: 4 },
  feedbackSection: { gap: 8 },
  sectionTitle: { color: C.ink, fontSize: 14, fontWeight: '900' },
  feedbackItem: { color: C.muted, fontSize: 12, lineHeight: 19 },
  exampleAnswer: {
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#F8F9FD',
    color: C.ink,
    fontSize: 13,
    lineHeight: 20,
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
  },
  secondaryButtonText: { color: C.muted, fontSize: 13, fontWeight: '800' },
});
