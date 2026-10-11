import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../Logo';
import {
  Loader2,
  AlertCircle,
  Mic,
  Square,
  Keyboard,
  Video,
  VideoOff,
  Timer,
  ArrowRight,
  Flag,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from 'lucide-react';
import {
  submitInterviewAnswer,
  completeInterviewSession,
  skipInterviewQuestion,
  getInterviewSession,
  timeoutInterviewSession,
} from '../../api';

// Browser speech-to-text (real transcription). Not available in every browser,
// so a typed answer is always offered as a fallback.
const SpeechRecognitionAPI =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

const PAUSE_MS = 1200; // silence at least this long (after speaking began) counts as a pause
const SPEAKING_RMS = 0.02;

const freshSignals = () => ({
  recordedMs: 0,
  silenceMs: 0,
  runMs: 0,
  pauseCount: 0,
  longestPauseMs: 0,
  hasSpoken: false,
  faceChecks: 0,
  faceHits: 0,
  motionSum: 0,
  motionN: 0,
  prevFrame: null,
});

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const ADAPT_COPY = {
  deepen: { icon: TrendingUp, text: 'Going deeper', tone: 'text-emerald-700 bg-emerald-50 ring-emerald-100' },
  simplify: { icon: TrendingDown, text: 'Revisiting fundamentals', tone: 'text-amber-700 bg-amber-50 ring-amber-100' },
  maintain: { icon: Minus, text: 'Staying at this level', tone: 'text-slate-600 bg-slate-100 ring-slate-200' },
};

export default function MockInterview() {
  const navigate = useNavigate();
  const location = useLocation();

  // React Router state is lost on refresh, so the active id is mirrored in
  // localStorage and re-validated against the backend (which checks ownership).
  const sessionId = location.state?.sessionId || localStorage.getItem('active_session_id') || null;

  const [session, setSession] = useState(location.state?.session || null);
  const [currentQuestion, setCurrentQuestion] = useState(location.state?.question || null);
  const [answerText, setAnswerText] = useState('');
  const [phase, setPhase] = useState('answering'); // answering | analyzing
  const [isRestoring, setIsRestoring] = useState(!location.state?.question && Boolean(sessionId));
  const [error, setError] = useState('');
  const [resumeNotice, setResumeNotice] = useState(false);
  const [adaptive, setAdaptive] = useState(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const finishedRef = useRef(false);

  const goToResults = useCallback(() => {
    finishedRef.current = true;
    localStorage.removeItem('active_session_id');
    navigate('/interview-completed', { state: { sessionId }, replace: true });
  }, [navigate, sessionId]);

  // ---- Restore / validate the session ----
  useEffect(() => {
    if (!sessionId) {
      navigate('/start-interview', { replace: true });
      return undefined;
    }
    localStorage.setItem('active_session_id', sessionId);
    if (session && currentQuestion) return undefined;

    let mounted = true;
    getInterviewSession(sessionId)
      .then(({ data }) => {
        if (!mounted) return;
        if (data.session.status !== 'in_progress' || !data.currentQuestion) {
          goToResults();
          return;
        }
        setSession(data.session);
        setCurrentQuestion(data.currentQuestion);
        if (data.pendingAnswer) {
          setAnswerText(data.pendingAnswer);
          setResumeNotice(true);
        }
        setIsRestoring(false);
      })
      .catch(() => {
        if (!mounted) return;
        localStorage.removeItem('active_session_id');
        navigate('/start-interview', { replace: true });
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mode = session?.mode || 'Text Response';
  const wantsAudio = /audio|video/i.test(mode);
  const wantsVideo = /video/i.test(mode);

  const [typedOnly, setTypedOnly] = useState(!wantsAudio);
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState('');
  const [cameraState, setCameraState] = useState('idle'); // idle | ready | denied

  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const micStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioCtxRef = useRef(null);
  const meterTimerRef = useRef(null);
  const videoTimerRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const canvasRef = useRef(null);
  const baseTextRef = useRef('');
  const startedAtRef = useRef(null);
  const totalMsRef = useRef(0);
  const sigRef = useRef(freshSignals());

  useEffect(() => {
    setTypedOnly(!/audio|video/i.test(session?.mode || 'Text Response'));
  }, [session?.mode]);

  const stopCapture = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    clearInterval(meterTimerRef.current);
    meterTimerRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    clearInterval(videoTimerRef.current);
    videoTimerRef.current = null;
    setIsRecording(false);
    if (startedAtRef.current) {
      totalMsRef.current += Date.now() - startedAtRef.current;
      startedAtRef.current = null;
    }
  }, []);

  const stopEverything = useCallback(() => {
    stopCapture();
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
  }, [stopCapture]);

  useEffect(() => stopEverything, [stopEverything]);

  // Camera preview for Audio + Video so the candidate can frame themselves
  // before answering. Video only; the microphone is requested on Record.
  useEffect(() => {
    if (!wantsVideo || typedOnly || cameraStreamRef.current || !currentQuestion) return undefined;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        cameraStreamRef.current = stream;
        setCameraState('ready');
      })
      .catch(() => !cancelled && setCameraState('denied'));
    return () => {
      cancelled = true;
    };
  }, [wantsVideo, typedOnly, currentQuestion]);

  useEffect(() => {
    if (cameraState === 'ready' && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [cameraState, typedOnly, phase]);

  // Reset per-question state when the question changes.
  useEffect(() => {
    stopCapture();
    if (!resumeNotice) setAnswerText('');
    totalMsRef.current = 0;
    sigRef.current = freshSignals();
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id]);

  const startVideoSampling = () => {
    const video = videoRef.current;
    if (!video || !cameraStreamRef.current) return;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 64;
      canvasRef.current.height = 48;
    }
    if (!faceDetectorRef.current && 'FaceDetector' in window) {
      try {
        faceDetectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      } catch {
        faceDetectorRef.current = null;
      }
    }
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    let tick = 0;
    videoTimerRef.current = setInterval(async () => {
      if (video.readyState < 2) return;
      tick += 1;
      const sig = sigRef.current;
      ctx.drawImage(video, 0, 0, 64, 48);
      const data = ctx.getImageData(0, 0, 64, 48).data;
      const gray = new Uint8Array(64 * 48);
      for (let i = 0, p = 0; i < data.length; i += 4, p += 1) gray[p] = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (sig.prevFrame) {
        let diff = 0;
        for (let i = 0; i < gray.length; i += 1) diff += Math.abs(gray[i] - sig.prevFrame[i]);
        sig.motionSum += diff / gray.length;
        sig.motionN += 1;
      }
      sig.prevFrame = gray;
      if (faceDetectorRef.current && tick % 3 === 0) {
        try {
          const faces = await faceDetectorRef.current.detect(video);
          sig.faceChecks += 1;
          if (faces.length > 0) sig.faceHits += 1;
        } catch {
          faceDetectorRef.current = null;
        }
      }
    }, 400);
  };

  const startRecording = async () => {
    setMicError('');
    if (!SpeechRecognitionAPI) {
      setMicError("This browser can't transcribe speech. Please type your answer instead.");
      setTypedOnly(true);
      return;
    }
    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError('Microphone access was denied. Please type your answer instead.');
      setTypedOnly(true);
      return;
    }

    // Observable pause measurement from the microphone level.
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      audioCtx.createMediaStreamSource(micStreamRef.current).connect(analyser);
      audioCtxRef.current = audioCtx;
      const buf = new Uint8Array(analyser.fftSize);
      meterTimerRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i += 1) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        const sig = sigRef.current;
        sig.recordedMs += 100;
        if (rms > SPEAKING_RMS) {
          if (sig.hasSpoken && sig.runMs >= PAUSE_MS) {
            sig.pauseCount += 1;
            sig.longestPauseMs = Math.max(sig.longestPauseMs, sig.runMs);
          }
          sig.hasSpoken = true;
          sig.runMs = 0;
        } else if (sig.hasSpoken) {
          sig.runMs += 100;
          sig.silenceMs += 100;
        }
      }, 100);
    } catch {
      // Pause measurement is optional; transcription still works without it.
    }

    if (wantsVideo) startVideoSampling();

    startedAtRef.current = Date.now();
    baseTextRef.current = answerText ? `${answerText} ` : '';
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let finalText = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interim += t;
      }
      if (finalText) baseTextRef.current += finalText;
      setAnswerText((baseTextRef.current + interim).trim());
    };
    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setMicError('Microphone access was denied. Please type your answer instead.');
        setTypedOnly(true);
      }
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  // ---- Global timer (display only; the server enforces the deadline) ----
  const [remaining, setRemaining] = useState(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!session?.deadlineAt || session.status !== 'in_progress') return undefined;
    const deadline = new Date(session.deadlineAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !finishedRef.current) {
        setTimeUp(true);
        stopCapture();
        // If an answer is mid-evaluation the server decides: that answer was
        // sent in time and still counts. Otherwise close the interview now.
        if (!submittingRef.current) {
          finishedRef.current = true;
          timeoutInterviewSession(sessionId).finally(goToResults);
        }
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session?.deadlineAt, session?.status, sessionId, goToResults, stopCapture]);

  if (isRestoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1020]">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-300" />
      </div>
    );
  }
  if (!sessionId || !currentQuestion || !session) return null;

  const total = session.totalQuestions;
  const idx = currentQuestion.index;
  const isLast = idx + 1 === total;
  const wordCount = answerText.trim() ? answerText.trim().split(/\s+/).length : 0;
  const analyzing = phase === 'analyzing';
  const locked = analyzing || timeUp;
  const lowTime = remaining !== null && remaining <= 60;
  const warnTime = remaining !== null && remaining <= 180;
  const usingCamera = wantsVideo && !typedOnly;

  const submit = async () => {
    if ((!answerText.trim() && !resumeNotice) || locked) return;
    setError('');
    setPhase('analyzing');
    submittingRef.current = true;

    const snapshotMs = totalMsRef.current + (startedAtRef.current ? Date.now() - startedAtRef.current : 0);
    const spokenSeconds = wantsAudio && !typedOnly && snapshotMs > 0 ? Math.round(snapshotMs / 1000) : undefined;
    const sig = sigRef.current;
    const clientSignals =
      spokenSeconds && sig.recordedMs > 0
        ? {
            pauseCount: sig.pauseCount,
            longestPauseSeconds: Math.round(sig.longestPauseMs / 100) / 10,
            silenceRatio: sig.silenceMs / sig.recordedMs,
            ...(wantsVideo && sig.motionN > 0 ? { movementScore: Math.min(100, Math.round((sig.motionSum / sig.motionN) * 8)) } : {}),
            ...(wantsVideo && sig.faceChecks > 0 ? { faceVisibleRatio: sig.faceHits / sig.faceChecks } : {}),
          }
        : undefined;

    stopCapture();

    try {
      const { data } = await submitInterviewAnswer(sessionId, {
        questionId: currentQuestion.id,
        text: answerText,
        ...(spokenSeconds ? { responseDurationSeconds: spokenSeconds } : {}),
        ...(clientSignals ? { clientSignals } : {}),
      });

      if (data.completed) {
        goToResults();
        return;
      }

      setResumeNotice(false);
      setAdaptive(data.adaptive || null);
      setSession(data.session);
      setCurrentQuestion(data.nextQuestion);
      setAnswerText('');
      setPhase('answering');

      // The deadline can pass while the answer was being evaluated.
      if (data.session.deadlineAt && Date.now() >= new Date(data.session.deadlineAt).getTime()) {
        finishedRef.current = true;
        timeoutInterviewSession(sessionId).finally(goToResults);
      }
    } catch (err) {
      setPhase('answering');
      if (err.response?.data?.timedOut || (err.response?.status === 400 && /already been completed/i.test(err.response?.data?.message || ''))) {
        goToResults();
        return;
      }
      // The server keeps the saved answer, so retrying resumes without losing anything.
      setResumeNotice(err.response?.data?.retryable === true);
      setError(
        err.response?.data?.message ||
          (err.response ? 'Could not submit your answer. Please try again.' : 'Could not reach the server. Your answer is still here - try again.')
      );
    } finally {
      submittingRef.current = false;
    }
  };

  const skip = async () => {
    if (locked || isSkipping || isRecording) return;
    setError('');
    setIsSkipping(true);
    submittingRef.current = true;
    stopCapture();
    try {
      const { data } = await skipInterviewQuestion(sessionId);
      if (data.completed) {
        goToResults();
        return;
      }
      setResumeNotice(false);
      setAdaptive(null);
      setSession(data.session);
      setCurrentQuestion(data.nextQuestion);
      setAnswerText('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not skip this question. Please try again.');
    } finally {
      submittingRef.current = false;
      setIsSkipping(false);
    }
  };

  const endInterview = async () => {
    if (isEnding) return;
    setIsEnding(true);
    stopEverything();
    try {
      await completeInterviewSession(sessionId);
      goToResults();
    } catch (err) {
      setIsEnding(false);
      setConfirmEnd(false);
      setError(err.response?.data?.message || 'Could not end the interview. Please try again.');
    }
  };

  const adaptInfo = adaptive ? ADAPT_COPY[adaptive.direction] || ADAPT_COPY.maintain : null;
  const AdaptIcon = adaptInfo?.icon;

  return (
    <div className="im-auth-page min-h-screen bg-[#F4F5FA] text-slate-800 antialiased">
      {/* Top bar */}
      <header className="sticky top-0 z-30 pt-[env(safe-area-inset-top,0px)] border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Logo size={28} textClassName="text-base" className="shrink-0" />
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              {idx + 1} / {total}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {remaining !== null && (
              <span
                title="Total time remaining"
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold tabular-nums ring-1 transition-colors ${
                  lowTime ? 'bg-rose-50 text-rose-600 ring-rose-200' : warnTime ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-white text-slate-700 ring-slate-200'
                }`}
              >
                <Timer className={`h-3.5 w-3.5 ${lowTime ? 'im-pulse-dot' : ''}`} />
                {fmt(remaining)}
              </span>
            )}
            <button
              onClick={() => setConfirmEnd(true)}
              disabled={isEnding || timeUp}
              className="im-btn rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              <Flag className="h-3.5 w-3.5" /> End
            </button>
          </div>
        </div>
        {/* Progress segments */}
        <div className="mx-auto flex max-w-6xl gap-1 px-4 pb-0 sm:px-6" aria-label={`Question ${idx + 1} of ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-[3px] flex-1 rounded-full transition-colors duration-500 ${
                i < idx ? 'bg-[#5846F6]' : i === idx ? 'bg-[#5846F6]/50' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </header>

      <main className={`mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 ${usingCamera ? 'lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]' : 'lg:grid-cols-1 max-w-3xl'}`}>
        {/* Question + camera */}
        <section key={currentQuestion.id} className="space-y-4 im-fade-up">
          <div className="im-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-[#5846F6]">{currentQuestion.category}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{currentQuestion.difficulty}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                <FileText className="h-3 w-3" /> From your document
              </span>
              {adaptInfo && (
                <span className={`im-scale-in inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${adaptInfo.tone}`}>
                  <AdaptIcon className="h-3 w-3" /> {adaptInfo.text}
                </span>
              )}
            </div>
            <div className="px-5 py-6 sm:px-7 sm:py-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Question {idx + 1}</p>
              <p className="mt-2 text-xl font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl">{currentQuestion.text}</p>
            </div>
          </div>

          {usingCamera && (
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 shadow-xl ring-1 ring-slate-900/10" style={{ aspectRatio: '4 / 3', maxHeight: '64vh', width: '100%' }}>
              {cameraState === 'ready' ? (
                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover [transform:scaleX(-1)]" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-slate-300">
                  {cameraState === 'denied' ? <VideoOff className="h-8 w-8" /> : <Loader2 className="h-6 w-6 animate-spin" />}
                  <p className="text-xs font-medium">
                    {cameraState === 'denied'
                      ? 'Camera unavailable. You can continue with your voice, or type your answer.'
                      : 'Starting camera...'}
                  </p>
                </div>
              )}
              {cameraState === 'ready' && (
                <>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className={`h-[78%] w-[46%] rounded-[50%] border-2 border-dashed transition-colors duration-500 ${isRecording ? 'border-white/20' : 'border-white/45'}`} />
                  </div>
                  <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                    <span className={`h-2 w-2 rounded-full ${isRecording ? 'im-pulse-dot bg-rose-400' : 'bg-slate-400'}`} />
                    {isRecording ? 'Recording' : 'Camera ready'}
                  </span>
                  {!isRecording && (
                    <span className="absolute inset-x-4 bottom-4 mx-auto w-fit rounded-full bg-black/45 px-3 py-1.5 text-center text-[11px] font-medium text-white/90 backdrop-blur">
                      Sit at a normal distance with your face inside the guide
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {/* Answer */}
        <section className="space-y-4">
          <div className="im-card p-5">
            {analyzing ? (
              <div className="im-fade-in space-y-4 py-2" aria-live="polite">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-[#5846F6]" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">Analysing your answer</p>
                    <p className="text-xs text-slate-500">
                      {isLast ? 'Preparing your results...' : 'Evaluating against your document, then choosing the next question...'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="im-skeleton h-3 w-11/12" />
                  <div className="im-skeleton h-3 w-9/12" />
                  <div className="im-skeleton h-3 w-10/12" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {wantsAudio && !typedOnly && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Your answer - {mode}</span>
                    <button type="button" onClick={() => { stopCapture(); setTypedOnly(true); }} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#5846F6]">
                      <Keyboard className="h-3 w-3" /> Type instead
                    </button>
                  </div>
                )}
                {wantsAudio && typedOnly && (
                  <button type="button" onClick={() => { setMicError(''); setTypedOnly(false); }} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5846F6] hover:underline">
                    <Video className="h-3 w-3" /> Switch back to {mode.toLowerCase()}
                  </button>
                )}

                {wantsAudio && !typedOnly && (
                  <button
                    type="button"
                    onClick={isRecording ? stopCapture : startRecording}
                    disabled={locked}
                    className={`im-btn w-full py-3 text-sm ${isRecording ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-200' : 'im-btn-primary'}`}
                  >
                    {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {isRecording ? 'Stop recording' : answerText ? 'Resume recording' : 'Start recording'}
                  </button>
                )}

                {micError && (
                  <p role="alert" className="rounded-xl bg-rose-50 p-2.5 text-[11px] font-medium text-rose-600">{micError}</p>
                )}

                {(!wantsAudio || typedOnly || answerText) && (
                  <div>
                    {wantsAudio && !typedOnly && <p className="mb-1 text-[11px] font-bold text-slate-400">Transcript (edit if needed)</p>}
                    <textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submit(); }}
                      placeholder="Type your answer here..."
                      rows={wantsAudio && !typedOnly ? 5 : 9}
                      disabled={locked}
                      className="im-input resize-none leading-relaxed disabled:opacity-60"
                    />
                    <div className="mt-1.5 flex justify-between text-[11px] font-medium text-slate-400">
                      <span>{wordCount} words</span>
                      <span>Ctrl + Enter to submit</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {resumeNotice && !analyzing && (
            <div className="im-scale-in flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs font-medium text-indigo-800">
              <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Your answer is saved. Press continue to finish evaluating it and get the next question.</span>
            </div>
          )}
          {error && (
            <div role="alert" className="im-scale-in flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={skip}
            disabled={locked || isSkipping || isRecording || resumeNotice}
            title={isRecording ? 'Stop recording before skipping' : 'Skip without answering. Counts as missed.'}
            className="im-btn w-full border border-slate-200 bg-white py-2.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            {isSkipping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isSkipping ? 'Skipping...' : 'Skip question'}
          </button>
          <button
            onClick={submit}
            disabled={locked || isSkipping || isRecording || (!answerText.trim() && !resumeNotice)}
            className="im-btn im-btn-primary w-full py-3.5 text-sm"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {analyzing ? 'Analysing...' : isRecording ? 'Stop recording first' : resumeNotice ? 'Continue' : isLast ? 'Submit and finish' : 'Submit answer'}
            {!analyzing && <ArrowRight className="h-4 w-4" />}
          </button>
        </section>
      </main>

      {/* End confirmation */}
      {confirmEnd && !timeUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="im-fade-in absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isEnding && setConfirmEnd(false)} />
          <div role="dialog" aria-modal="true" className="im-scale-in relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900">End this interview?</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              You will get feedback on the questions you answered. Unanswered questions count as missed in your final score.
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirmEnd(false)} disabled={isEnding} className="im-btn flex-1 border border-slate-200 bg-white py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                Keep going
              </button>
              <button onClick={endInterview} disabled={isEnding} className="im-btn flex-1 bg-rose-500 py-2.5 text-sm text-white hover:bg-rose-600">
                {isEnding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'End interview'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time's up */}
      {timeUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="im-fade-in absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
          <div role="alertdialog" aria-modal="true" className="im-scale-in relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <Timer className="mx-auto h-7 w-7 text-amber-500" />
            <h2 className="mt-3 text-base font-bold text-slate-900">Time is up</h2>
            <p className="mt-1.5 text-sm text-slate-500">Answers can no longer be submitted. Preparing your results.</p>
            <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-[#5846F6]" />
          </div>
        </div>
      )}
    </div>
  );
}
