import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  Coffee,
  Flag,
  Loader2,
  BarChart2,
  Clock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playClick, playChime, startFocusAmbience, stopFocusAmbience } from '../utils/audio';
import {
  STUDENT_ID,
  DEFAULT_TOPIC,
  startFocus,
  getFocusSession,
  interruptFocus,
  resumeFocus,
  startFocusBreak,
  endFocusBreak,
  completeFocus,
  getFocusAnalytics,
  type BackendConnection,
} from '../services/api';
import type {
  FocusAnalyticsRead,
  FocusBreakResponse,
  FocusCompleteResponse,
  FocusSessionRead,
  FocusStartResponse,
  GamificationAward,
} from '../services/apiTypes';

interface FocusModeViewProps {
  onGamification: (award: GamificationAward | null) => void;
  backendStatus?: BackendConnection;
}

type SessionKind = 'single' | 'pomodoro';

const errMessage = (e: unknown): string =>
  e instanceof Error ? e.message : 'Something went wrong. Please try again.';

const formatTime = (secs: number): string => {
  const safe = Math.max(0, Math.floor(secs));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const FocusModeView: React.FC<FocusModeViewProps> = ({
  onGamification,
  backendStatus = 'checking',
}) => {
  const [kind, setKind] = useState<SessionKind>('single');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [session, setSession] = useState<FocusSessionRead | null>(null);
  const [result, setResult] = useState<FocusCompleteResponse | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(false);

  // Focus analytics (backend-computed — the frontend only displays it).
  const [analytics, setAnalytics] = useState<FocusAnalyticsRead | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Decorative TCP sliding-window sandbox (does not compute time/XP).
  const [windowSize, setWindowSize] = useState(4);
  const [simPackets] = useState([
    { id: 1, state: 'acked' },
    { id: 2, state: 'acked' },
    { id: 3, state: 'in-flight' },
    { id: 4, state: 'in-flight' },
    { id: 5, state: 'queued' },
    { id: 6, state: 'queued' },
    { id: 7, state: 'queued' },
    { id: 8, state: 'queued' },
  ]);

  const isLive = Boolean(sessionId) && !result;

  // Audio ambient effect management (visual ambience only — no timing here).
  useEffect(() => {
    if (isLive && soundEnabled) {
      startFocusAmbience();
    } else {
      stopFocusAmbience();
    }
    return () => {
      stopFocusAmbience();
    };
  }, [isLive, soundEnabled]);

  // Poll the backend for server-owned session state (the source of truth).
  useEffect(() => {
    if (!sessionId || result) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const s = await getFocusSession(sessionId);
        if (cancelled) return;
        setSession(s);
        if (s.status === 'completed' || s.status === 'abandoned') {
          const ended: FocusCompleteResponse = {
            session_id: s.session_id,
            status: s.status,
            active_seconds: s.active_seconds,
            planned_minutes: s.planned_minutes,
            message: s.message ?? 'Focus session ended.',
            gamification: null,
          };
          setResult(ended);
        }
      } catch {
        // Session may 404 once ended — ignore transient poll errors.
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId, result]);

  // Tab hidden → interrupt; tab visible → resume (backend records both).
  useEffect(() => {
    if (!sessionId || result) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        interruptFocus(sessionId).catch(() => {});
      } else {
        resumeFocus(sessionId)
          .then((r) => {
            setSession((prev) =>
              prev
                ? { ...prev, status: r.status, remaining_seconds: r.remaining_seconds, message: r.message }
                : prev
            );
          })
          .catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [sessionId, result]);

  // Load focus analytics once on mount.
  useEffect(() => {
    let cancelled = false;
    getFocusAnalytics(STUDENT_ID)
      .then((a) => {
        if (cancelled) return;
        setAnalytics(a);
        setAnalyticsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAnalyticsError("Couldn't load your focus analytics. Please try again.");
        setAnalyticsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const buildSessionFromStart = (started: FocusStartResponse): FocusSessionRead => ({
    session_id: started.session_id,
    student_id: STUDENT_ID,
    topic: started.topic,
    mode: started.mode,
    planned_minutes: started.planned_minutes,
    study_minutes: started.study_minutes,
    break_minutes: started.break_minutes,
    rounds: started.rounds,
    status: started.status,
    started_at: started.started_at,
    ended_at: null,
    elapsed_seconds: 0,
    remaining_seconds: started.remaining_seconds,
    active_seconds: 0,
    break_seconds: 0,
    interruption_count: 0,
    current_round: 1,
    questions_attempted: null,
    concepts_studied: [],
    plan: started.plan,
    current_phase: started.plan[0] ?? null,
    segment: null,
    segment_remaining_seconds: null,
    message: started.message,
  });

  const handleStart = async (nextKind: SessionKind = kind) => {
    playClick();
    setActionError(null);
    setResult(null);
    setSession(null);
    setSessionId(null);
    setIsStarting(true);
    try {
      const started = await startFocus({
        student_id: STUDENT_ID,
        topic: DEFAULT_TOPIC,
        mode: nextKind,
        ...(nextKind === 'single'
          ? { duration_minutes: 25 }
          : { preset: '25/5' as const, rounds: 4 }),
      });
      setKind(nextKind);
      setSessionId(started.session_id);
      setSession(buildSessionFromStart(started));
    } catch (e) {
      setActionError(errMessage(e));
    } finally {
      setIsStarting(false);
    }
  };

  const handleComplete = async () => {
    if (!sessionId) return;
    playClick();
    setActionError(null);
    try {
      const done = await completeFocus(sessionId, {
        questions_attempted: 0,
        concepts_studied: [],
      });
      setResult(done);
      if (done.status === 'completed') {
        playChime('success');
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.5 },
            colors: ['#203F9A', '#E84797', '#94C2DA', '#16A34A'],
          });
        } catch (err) {
          /* confetti is decorative */
        }
      }
      if (onGamification) onGamification(done.gamification ?? null);
    } catch (e) {
      setActionError(errMessage(e));
    }
  };

  const applyBreakResponse = useCallback((b: FocusBreakResponse, segment: 'study' | 'break') => {
    setSession((prev) =>
      prev
        ? {
            ...prev,
            status: b.status,
            message: b.message,
            remaining_seconds: b.remaining_seconds,
            segment,
            segment_remaining_seconds: b.segment_remaining_seconds,
            current_round: b.current_round,
          }
        : prev
    );
  }, []);

  const handleBreakStart = async () => {
    if (!sessionId) return;
    playClick();
    setActionError(null);
    try {
      const b = await startFocusBreak(sessionId);
      applyBreakResponse(b, 'break');
    } catch (e) {
      setActionError(errMessage(e));
    }
  };

  const handleBreakEnd = async () => {
    if (!sessionId) return;
    playClick();
    setActionError(null);
    try {
      const b = await endFocusBreak(sessionId);
      applyBreakResponse(b, 'study');
    } catch (e) {
      setActionError(errMessage(e));
    }
  };

  const handleInterrupt = async () => {
    if (!sessionId) return;
    playClick();
    try {
      const r = await interruptFocus(sessionId);
      setSession((prev) =>
        prev ? { ...prev, status: r.status, remaining_seconds: r.remaining_seconds, message: r.message } : prev
      );
    } catch (e) {
      setActionError(errMessage(e));
    }
  };

  const handleResume = async () => {
    if (!sessionId) return;
    playClick();
    try {
      const r = await resumeFocus(sessionId);
      setSession((prev) =>
        prev ? { ...prev, status: r.status, remaining_seconds: r.remaining_seconds, message: r.message } : prev
      );
    } catch (e) {
      setActionError(errMessage(e));
    }
  };

  const handleReset = () => {
    playClick();
    setSessionId(null);
    setSession(null);
    setResult(null);
    setActionError(null);
  };

  const toggleSound = () => {
    playClick();
    setSoundEnabled(!soundEnabled);
  };

  const pomodoro = session?.mode === 'pomodoro';
  const onBreak = session?.segment === 'break';
  const breakAvailable =
    pomodoro &&
    !onBreak &&
    Boolean(session) &&
    (session!.rounds ?? 1) > session!.current_round;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF2EA] border border-[#4E7CB2]/20 text-xs font-bold text-[#444652] mb-1">
          <Sparkles className="w-3.5 h-3.5 text-[#203F9A]" />
          <span>Tactile Study Block • Single & Pomodoro Sessions</span>
        </div>
        <h2 className="text-2xl font-bold text-[#1E1B17]">Atlas Focus Studio</h2>
        <p className="text-xs text-[#4E7CB2]">
          The backend owns the clock, breaks, completion, and XP — this view only displays the server state.
        </p>
      </div>

      {/* Session Card */}
      <div className="paper-card rounded-3xl p-8 text-center space-y-6 relative overflow-hidden">
        {backendStatus === 'offline' && (
          <div className="rounded-xl bg-[#FDF1F0] border border-[#DC2626]/30 text-[#7F1D1D] text-xs font-semibold px-4 py-3">
            The ATLAS backend is offline. Start it with `uvicorn app.main:app --reload` (port 8000) to use Focus Mode.
          </div>
        )}

        {/* Session Type Selector (idle only) */}
        {!sessionId && !result && (
          <div className="inline-flex items-center gap-2 bg-[#FAF2EA] p-1.5 rounded-full border border-[#4E7CB2]/20">
            <button
              onClick={() => setKind('single')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                kind === 'single'
                  ? 'bg-[#203F9A] text-white shadow-xs'
                  : 'text-[#444652] hover:text-[#1E1B17]'
              }`}
            >
              25m Deep Work
            </button>
            <button
              onClick={() => setKind('pomodoro')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                kind === 'pomodoro'
                  ? 'bg-[#203F9A] text-white shadow-xs'
                  : 'text-[#444652] hover:text-[#1E1B17]'
              }`}
            >
              Pomodoro 25/5 × 4
            </button>
          </div>
        )}

        {/* Big Display Clock — always the backend's remaining_seconds */}
        <div className="py-4">
          <div className="text-7xl md:text-8xl font-black text-[#1E1B17] font-mono tracking-tight select-none">
            {formatTime(session?.remaining_seconds ?? 0)}
          </div>
          <div className="text-xs font-semibold text-[#757683] mt-2">
            {result
              ? result.status === 'completed'
                ? 'Session complete — nice work!'
                : 'Session ended.'
              : session
                ? session.status === 'on_break'
                  ? 'On break • backend clock paused for study'
                  : `${session.status === 'active' ? 'Sprint in progress' : 'Session ready'} · planned ${session.planned_minutes}m`
                : 'Paused • Choose a session type and start'}
          </div>
          {pomodoro && session && (
            <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-[#EBF5FB] border border-[#94C2DA]/50 text-[11px] font-bold text-[#203F9A]">
              <Coffee className="w-3.5 h-3.5" />
              <span>
                Round {session.current_round}/{session.rounds} ·{' '}
                {onBreak ? 'Break' : 'Study'} · segment{' '}
                {formatTime(session.segment_remaining_seconds ?? session.remaining_seconds)}
              </span>
            </div>
          )}
          {session && session.interruption_count > 0 && (
            <div className="text-[11px] text-[#757683] mt-1">
              Interruptions recorded: {session.interruption_count} (server-tracked)
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {!sessionId && !result && (
            <button
              onClick={() => handleStart()}
              disabled={isStarting || backendStatus === 'offline'}
              className="tactile-btn-primary px-8 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
              <span>{isStarting ? 'Starting…' : 'Start Focus Session'}</span>
            </button>
          )}

          {isLive && (
            <>
              <button
                onClick={handleComplete}
                className="tactile-btn-pink px-8 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 cursor-pointer"
              >
                <Flag className="w-5 h-5 fill-current" />
                <span>Complete Session</span>
              </button>

              {pomodoro && breakAvailable && (
                <button
                  onClick={handleBreakStart}
                  className="px-5 py-3 rounded-2xl bg-[#FAF2EA] hover:bg-white border border-[#4E7CB2]/20 text-xs font-bold text-[#203F9A] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Coffee className="w-4 h-4" />
                  <span>Start Break</span>
                </button>
              )}
              {pomodoro && onBreak && (
                <button
                  onClick={handleBreakEnd}
                  className="px-5 py-3 rounded-2xl bg-[#EAF7EF] hover:bg-white border border-emerald-300 text-xs font-bold text-emerald-800 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>End Break</span>
                </button>
              )}

              <button
                onClick={session?.status === 'active' ? handleInterrupt : handleResume}
                className="p-3 rounded-2xl bg-[#FAF2EA] hover:bg-white border border-[#4E7CB2]/20 text-[#4E7CB2] hover:text-[#203F9A] transition-colors cursor-pointer"
                title={session?.status === 'active' ? 'Interrupt (pause) session' : 'Resume session'}
              >
                {session?.status === 'active' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
            </>
          )}

          {result && (
            <button
              onClick={handleReset}
              className="tactile-btn-primary px-8 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Start New Session</span>
            </button>
          )}

          {(sessionId || result) && (
            <button
              onClick={toggleSound}
              className={`p-3 rounded-2xl border transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                  : 'bg-[#FAF2EA] border-[#4E7CB2]/20 text-[#757683]'
              }`}
              title="Desk Ambient Rain (Web Audio Synthesizer)"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-700" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Result / Error messaging */}
        {result && (
          <div
            className={`mx-auto max-w-xl rounded-xl border px-4 py-3 text-xs font-semibold ${
              result.status === 'completed'
                ? 'bg-[#EAF7EF] border-[#16A34A]/40 text-[#14532D]'
                : 'bg-[#FFF8E1] border-[#F59E0B]/40 text-[#78350F]'
            }`}
          >
            {result.message}
            {result.gamification && result.gamification.xp_awarded > 0 && (
              <div className="mt-1 font-bold">
                +{result.gamification.xp_awarded} XP · total {result.gamification.new_total}
                {result.gamification.level_up ? ' · Level up!' : ''}
                {result.gamification.badges_unlocked.length > 0
                  ? ` · Badges: ${result.gamification.badges_unlocked.join(', ')}`
                  : ''}
              </div>
            )}
          </div>
        )}

        {actionError && (
          <div className="mx-auto max-w-xl rounded-xl bg-[#FDF1F0] border border-[#DC2626]/30 text-[#7F1D1D] text-xs font-semibold px-4 py-3">
            {actionError}
          </div>
        )}
      </div>

      {/* Interactive Sliding Window Buffer Sandbox (decorative) */}
      <div className="paper-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#1E1B17]">Sliding Window Buffer Sandbox (Live State)</h3>
            <p className="text-xs text-[#757683]">
              Visualizing Advertised Window (rwnd) & Congestion Window (cwnd)
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-[#444652]">Window Size:</span>
            <div className="flex items-center gap-1">
              {[2, 4, 6].map((w) => (
                <button
                  key={w}
                  onClick={() => {
                    playClick();
                    setWindowSize(w);
                  }}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer ${
                    windowSize === w ? 'bg-[#203F9A] text-white' : 'bg-[#FAF2EA] text-[#444652]'
                  }`}
                >
                  {w} MSS
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#FAF2EA]/50 rounded-xl border border-[#4E7CB2]/20 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-[500px]">
            {simPackets.map((pkt, idx) => {
              const inWindow = idx >= 2 && idx < 2 + windowSize;
              return (
                <div
                  key={pkt.id}
                  className={`flex-1 p-3 rounded-xl border text-center transition-all ${
                    inWindow
                      ? 'bg-white border-[#203F9A] ring-2 ring-[#203F9A]/30 shadow-xs'
                      : pkt.state === 'acked'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'
                  }`}
                >
                  <div className="text-[10px] font-mono font-bold text-[#757683]">Seq #{pkt.id}00</div>
                  <div className="text-xs font-bold mt-1">
                    {pkt.state === 'acked' ? (
                      <span className="text-emerald-700">ACKed</span>
                    ) : inWindow ? (
                      <span className="text-[#203F9A]">In Flight</span>
                    ) : (
                      <span>Queued</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#757683] pt-1">
          <span>Active Window spans packets #300 to #{2 + windowSize}00</span>
          <span className="text-[#203F9A] font-semibold">Self-clocking ACK loop stable</span>
        </div>
      </div>

      {/* Focus Analytics (backend-provided) */}
      <div className="paper-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-[#203F9A]" />
          <h3 className="font-bold text-sm text-[#1E1B17]">Focus Analytics</h3>
        </div>

        {analyticsLoading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#757683]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your focus analytics…
          </div>
        )}

        {analyticsError && (
          <div className="rounded-xl bg-[#FDF1F0] border border-[#DC2626]/30 text-[#7F1D1D] text-xs font-semibold px-4 py-3">
            {analyticsError}
          </div>
        )}

        {!analyticsLoading && !analyticsError && analytics && analytics.total_sessions === 0 && (
          <div className="rounded-xl bg-[#FAF2EA] border border-[#4E7CB2]/20 text-[#757683] text-xs font-semibold px-4 py-3">
            No learning activity yet. Complete your first focus session to see analytics here.
          </div>
        )}

        {analytics && analytics.total_sessions > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#FAF2EA] p-3 border border-[#4E7CB2]/15">
              <div className="text-[10px] font-bold text-[#757683] uppercase tracking-wider">Total sessions</div>
              <div className="text-xl font-black text-[#1E1B17]">{analytics.total_sessions}</div>
            </div>
            <div className="rounded-xl bg-[#EAF7EF] p-3 border border-[#16A34A]/20">
              <div className="text-[10px] font-bold text-[#757683] uppercase tracking-wider">Completed</div>
              <div className="text-xl font-black text-emerald-700">{analytics.completed_count}</div>
            </div>
            <div className="rounded-xl bg-[#FFF8E1] p-3 border border-[#F59E0B]/25">
              <div className="text-[10px] font-bold text-[#757683] uppercase tracking-wider">Abandoned</div>
              <div className="text-xl font-black text-amber-700">{analytics.abandoned_count}</div>
            </div>
            <div className="rounded-xl bg-white p-3 border border-[#4E7CB2]/15">
              <div className="text-[10px] font-bold text-[#757683] uppercase tracking-wider">Active time</div>
              <div className="text-xl font-black text-[#1E1B17]">{analytics.total_active_minutes} min</div>
            </div>
            <div className="rounded-xl bg-white p-3 border border-[#4E7CB2]/15">
              <div className="text-[10px] font-bold text-[#757683] uppercase tracking-wider">Avg session</div>
              <div className="text-sm font-black text-[#1E1B17]">
                {analytics.avg_active_minutes.toFixed(1)}m active / {analytics.avg_planned_minutes.toFixed(1)}m planned
              </div>
            </div>
            <div className="rounded-xl bg-white p-3 border border-[#4E7CB2]/15">
              <div className="text-[10px] font-bold text-[#757683] uppercase tracking-wider">Avg interruptions</div>
              <div className="text-xl font-black text-[#1E1B17]">
                {analytics.avg_interruptions_per_session.toFixed(1)}
              </div>
            </div>
          </div>
        )}

        {analytics && analytics.topics_studied.length > 0 && (
          <div>
            <div className="text-xs font-bold text-[#444652] mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#203F9A]" /> Time by topic
            </div>
            <div className="flex flex-wrap gap-2">
              {analytics.topics_studied.map((t) => (
                <span
                  key={t.topic}
                  className="px-2.5 py-1 rounded-full bg-[#EBF5FB] border border-[#94C2DA]/50 text-[11px] font-bold text-[#203F9A]"
                >
                  {t.topic.replace(/_/g, ' ')} · {t.active_minutes}m
                </span>
              ))}
            </div>
          </div>
        )}

        {analytics && analytics.recent_sessions.length > 0 && (
          <div>
            <div className="text-xs font-bold text-[#444652] mb-2">Recent sessions</div>
            <div className="space-y-1.5">
              {analytics.recent_sessions.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl bg-white border border-[#4E7CB2]/10 px-3 py-2 text-xs"
                >
                  <div className="font-semibold text-[#1E1B17]">
                    {s.topic?.replace(/_/g, ' ') || 'General'}{' '}
                    <span className="text-[#757683] font-medium">
                      · {s.mode} · {Math.round(s.active_seconds / 60)}m active
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      s.status === 'completed'
                        ? 'bg-[#EAF7EF] text-emerald-700'
                        : s.status === 'abandoned'
                          ? 'bg-[#FFF8E1] text-amber-700'
                          : 'bg-[#EBF5FB] text-[#203F9A]'
                    }`}
                  >
                    {s.status} · {s.interruption_count} interrupts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};