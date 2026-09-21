import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { Sparkles, Loader2, ShieldAlert, Mic, MicOff, Video, Keyboard, Timer } from 'lucide-react';
import { submitInterviewAnswer, completeInterviewSession, getInterviewSession, timeoutInterviewSession } from '../../api';

// The browser's own speech-to-text - real transcription, not a simulation.
// Not supported in every browser (notably Firefox), so callers must handle
// SpeechRecognition being unavailable and fall back to typed input.
const SpeechRecognitionAPI =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export default function MockInterview() {
  const navigate = useNavigate();
  const location = useLocation();

  // Passed from StartInterview when the session was created. This page can
  // only be reached with a live session - if it's missing (e.g. a hard
  // refresh, which drops React Router state) we bounce back to set one up.
  // React Router state is lost on a hard refresh, so the active session id is
  // also mirrored in localStorage and re-fetched from the backend (which
  // verifies it belongs to the logged-in user) to survive a reload.
  const sessionId = location.state?.sessionId || localStorage.getItem('active_session_id') || null;

  const [session, setSession] = useState(location.state?.session || null);
  const [currentQuestion, setCurrentQuestion] = useState(location.state?.question || null);
  const [answerText, setAnswerText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isRestoring, setIsRestoring] = useState(!location.state?.question && Boolean(sessionId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      navigate('/start-interview', { replace: true });
      return;
    }

    localStorage.setItem('active_session_id', sessionId);

    // Already have everything from navigation state - nothing to restore.
    if (session && currentQuestion) return;

    let isMounted = true;
    getInterviewSession(sessionId)
      .then(({ data }) => {
        if (!isMounted) return;
        if (data.session.status !== 'in_progress' || !data.currentQuestion) {
          navigate('/interview-completed', { state: { sessionId }, replace: true });
          return;
        }
        setSession(data.session);
        setCurrentQuestion(data.currentQuestion);
        setIsRestoring(false);
      })
      .catch(() => {
        if (!isMounted) return;
        localStorage.removeItem('active_session_id');
        navigate('/start-interview', { replace: true });
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Voice/video capture for Audio Only / Audio + Video modes ---
  // Uses the browser's real microphone/camera and native speech-to-text -
  // nothing here is simulated. A typed-answer fallback is always available
  // (below) in case the browser lacks SpeechRecognition or permission is denied.
  const mode = session?.mode || 'Text Response';
  const wantsAudio = /audio|video/i.test(mode);
  const wantsVideo = /video/i.test(mode);

  const [useTypedFallback, setUseTypedFallback] = useState(!wantsAudio);
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const baseTextRef = useRef(''); // answer text captured before the current recording segment
  const recordingStartedAtRef = useRef(null);
  const totalRecordingMsRef = useRef(0); // real measured mic-open time, accumulated across start/stop/resume

  const stopCapture = useCallback(() => {
    recognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsRecording(false);
    if (recordingStartedAtRef.current) {
      totalRecordingMsRef.current += Date.now() - recordingStartedAtRef.current;
      recordingStartedAtRef.current = null;
    }
  }, []);

  // Release camera/mic and stop recognition on unmount or when leaving this question
  useEffect(() => stopCapture, [stopCapture]);
  useEffect(() => {
    stopCapture();
    setAnswerText('');
    totalRecordingMsRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id]);

  const startRecording = async () => {
    setMicError('');
    if (!SpeechRecognitionAPI) {
      setMicError("Your browser doesn't support voice transcription. Please type your answer instead.");
      setUseTypedFallback(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: wantsVideo });
      streamRef.current = stream;
      if (wantsVideo && videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setMicError('Microphone/camera access was denied. Please type your answer instead.');
      setUseTypedFallback(true);
      return;
    }

    recordingStartedAtRef.current = Date.now();
    baseTextRef.current = answerText ? `${answerText} ` : '';
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (finalText) baseTextRef.current += finalText;
      setAnswerText((baseTextRef.current + interimText).trim());
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicError('Microphone access was denied. Please type your answer instead.');
        setUseTypedFallback(true);
      }
    };
    recognition.onend = () => {
      setIsRecording(false);
      if (recordingStartedAtRef.current) {
        totalRecordingMsRef.current += Date.now() - recordingStartedAtRef.current;
        recordingStartedAtRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  // --- Global interview timer ---
  // Purely a display countdown derived from the server-issued deadline; the
  // backend independently enforces this on every answer submission and via
  // this timeout call, so a paused tab or clock drift can't extend the
  // interview.
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const timedOutRef = useRef(false);

  useEffect(() => {
    if (!session?.deadlineAt || session.status !== 'in_progress') return undefined;

    const deadline = new Date(session.deadlineAt).getTime();

    const tick = () => {
      const secondsLeft = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);

      if (secondsLeft === 0 && !timedOutRef.current) {
        timedOutRef.current = true;
        localStorage.removeItem('active_session_id');
        timeoutInterviewSession(sessionId)
          .then(() => navigate('/interview-completed', { state: { sessionId }, replace: true }))
          .catch(() => navigate('/interview-completed', { state: { sessionId }, replace: true }));
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session?.deadlineAt, session?.status, sessionId, navigate]);

  const formattedTimeLeft =
    remainingSeconds === null
      ? null
      : `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`;
  const isTimeRunningLow = remainingSeconds !== null && remainingSeconds <= 60;

  if (isRestoring) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#5846F6]" />
        </main>
      </div>
    );
  }

  if (!sessionId || !currentQuestion || !session) {
    return null;
  }

  const totalQuestionsCount = session.totalQuestions;
  const currentIndex = currentQuestion.index;

  const wordCount = answerText.trim() ? answerText.trim().split(/\s+/).length : 0;

  const handleSubmitAnswer = async () => {
    if (!answerText.trim() || isSubmitting) return;

    setError('');
    setIsSubmitting(true);
    try {
      // Only meaningful when the answer actually came from mic capture - a
      // typed answer has no real "response duration" to measure.
      const responseDurationSeconds =
        wantsAudio && !useTypedFallback && totalRecordingMsRef.current > 0
          ? Math.round(totalRecordingMsRef.current / 1000)
          : undefined;

      const { data } = await submitInterviewAnswer(sessionId, {
        questionId: currentQuestion.id,
        text: answerText,
        ...(responseDurationSeconds ? { responseDurationSeconds } : {}),
      });

      stopCapture();

      if (data.completed) {
        localStorage.removeItem('active_session_id');
        navigate('/interview-completed', { state: { sessionId } });
        return;
      }

      setSession(data.session);
      setCurrentQuestion(data.nextQuestion);
      setAnswerText('');
      setIsSubmitting(false);
    } catch (err) {
      setIsSubmitting(false);
      setError(err.response?.data?.message || 'Could not submit your answer. Please try again.');
    }
  };

  const handleEndInterview = async () => {
    if (isEnding) return;
    if (!window.confirm('End this interview now? You will get feedback based on the questions answered so far.')) {
      return;
    }
    setIsEnding(true);
    stopCapture();
    try {
      await completeInterviewSession(sessionId);
      localStorage.removeItem('active_session_id');
      navigate('/interview-completed', { state: { sessionId } });
    } catch (err) {
      setIsEnding(false);
      setError(err.response?.data?.message || 'Could not end the interview. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-200/60">
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
            <span className="font-bold text-slate-900">Mock Interview</span>
            <span className="text-slate-300">|</span>
            <span>
              Question {currentIndex + 1} of {totalQuestionsCount}
            </span>
            <div className="w-28 h-1.5 bg-slate-200 rounded-full overflow-hidden ml-1">
              <div
                className="h-full bg-[#5846F6] rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / totalQuestionsCount) * 100}%` }}
              ></div>
            </div>
            {remainingSeconds !== null && (
              <>
                <span className="text-slate-300">|</span>
                <span
                  className={`flex items-center gap-1.5 font-bold ${
                    isTimeRunningLow ? 'text-rose-500' : 'text-slate-500'
                  }`}
                  title="Total time remaining for this interview"
                >
                  <Timer className="w-3.5 h-3.5" />
                  {formattedTimeLeft}
                </span>
              </>
            )}
          </div>
          <button
            onClick={handleEndInterview}
            disabled={isEnding}
            className="bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-70"
          >
            {isEnding ? 'Ending...' : 'End Interview'}
          </button>
        </div>

        {/* Content Box */}
        <div className="max-w-3xl w-full mx-auto my-8 space-y-6">
          <div className="bg-[#F8F9FE] p-8 rounded-3xl border border-indigo-50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#5846F6] text-white flex items-center justify-center shadow-md shadow-indigo-100">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900">InterviewMate AI</h3>
                  <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                    Listening...
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#5846F6] bg-indigo-50 px-3 py-1 rounded-md">
                {currentQuestion.category} — {currentQuestion.difficulty}
              </span>
              {currentQuestion.source === 'ai' && (
                <span
                  title="This question was generated by Gemini"
                  className="flex items-center gap-1 text-[9px] font-extrabold px-2.5 py-1 rounded-md bg-gradient-to-r from-blue-50 to-purple-50 border border-indigo-100"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                    Gemini
                  </span>
                </span>
              )}
            </div>

            <p className="text-lg font-black text-slate-900 leading-snug pt-2">
              "{currentQuestion.text}"
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Voice/video capture (Audio Only / Audio + Video modes) */}
          {wantsAudio && !useTypedFallback && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  {mode} Mode
                </span>
                <button
                  type="button"
                  onClick={() => { stopCapture(); setUseTypedFallback(true); }}
                  className="text-[10px] font-bold text-slate-400 hover:text-[#5846F6] flex items-center gap-1"
                >
                  <Keyboard className="w-3 h-3" /> Type instead
                </button>
              </div>

              {wantsVideo && (
                <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 shadow-lg" style={{ aspectRatio: '4 / 3', maxHeight: '520px' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {/* Framing guide - purely visual, helps the candidate sit at a normal
                      head-and-shoulders distance without cropping their face. */}
                  {isRecording && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="w-[50%] h-[80%] border-2 border-dashed border-white/40 rounded-[45%]" />
                    </div>
                  )}
                  <span className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-white">
                    <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-400 animate-pulse' : 'bg-slate-400'}`} />
                    {isRecording ? 'Recording' : 'Camera preview'}
                  </span>
                  {!isRecording && (
                    <div className="absolute bottom-4 left-4 right-4 text-center">
                      <span className="inline-block bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full text-[11px] font-medium text-white/90">
                        Sit at a normal distance so your head and shoulders are fully visible
                      </span>
                    </div>
                  )}
                </div>
              )}

              {micError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 p-2.5 rounded-xl text-[11px]">
                  {micError}
                </div>
              )}

              <button
                type="button"
                onClick={isRecording ? stopCapture : startRecording}
                disabled={isSubmitting}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  isRecording ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-[#5846F6] hover:bg-[#4735E5] text-white'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isRecording ? 'Stop Recording' : answerText ? 'Resume Recording' : 'Start Recording'}
              </button>

              {answerText && (
                <div className="pt-1">
                  <p className="text-[10px] font-bold text-slate-400 mb-1">Transcript (edit if needed):</p>
                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    rows={4}
                    disabled={isSubmitting}
                    className="w-full text-xs font-medium text-slate-700 bg-slate-50/70 rounded-xl p-3 focus:outline-none resize-none leading-relaxed disabled:opacity-60"
                  ></textarea>
                </div>
              )}
            </div>
          )}

          {/* Typed Answer Input */}
          {(!wantsAudio || useTypedFallback) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              {wantsAudio && (
                <button
                  type="button"
                  onClick={() => { setMicError(''); setUseTypedFallback(false); }}
                  className="text-[10px] font-bold text-[#5846F6] hover:text-indigo-700 flex items-center gap-1"
                >
                  <Video className="w-3 h-3" /> Switch back to {mode.toLowerCase()}
                </button>
              )}
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Type your answer here..."
                rows={6}
                disabled={isSubmitting}
                className="w-full text-xs font-medium text-slate-700 focus:outline-none resize-none leading-relaxed disabled:opacity-60"
              ></textarea>
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 pt-2 border-t border-slate-50">
                <span>Use Shift+Enter for newline</span>
                <span>{wordCount} / 1000 words</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleSubmitAnswer}
              disabled={isSubmitting || !answerText.trim()}
              className="px-6 py-2.5 bg-[#5846F6] hover:bg-[#4735E5] text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {currentIndex + 1 === totalQuestionsCount ? 'Finish Interview' : 'Submit Answer'}
            </button>
          </div>
        </div>

        <div></div>
      </main>
    </div>
  );
}
