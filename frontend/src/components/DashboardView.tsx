import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Target, 
  Flame, 
  Clock, 
  CheckCircle2, 
  Flag, 
  Play, 
  BookOpen, 
  Bookmark, 
  Layers, 
  Lightbulb, 
  ArrowRight, 
  Pin, 
  Zap, 
  Lock, 
  FileSpreadsheet, 
  BarChart2, 
  Feather, 
  Eye, 
  Check,
  Loader2,
  Trophy,
  Route
} from 'lucide-react';
import { NavigationTab, UserProfile, Flashcard, NoteItem } from '../types';
import { playClick } from '../utils/audio';
import { STUDENT_ID, getStudentProgress, getStudentNextActivity, type BackendConnection } from '../services/api';
import type {
  AchievementStateRead,
  GamificationProfileRead,
  NextActivityRead,
  ProgressRead,
  StudentRead,
} from '../services/apiTypes';

interface DashboardViewProps {
  user: UserProfile;
  currentSubject: string;
  studentId: string;
  student?: StudentRead | null;
  gamification?: GamificationProfileRead | null;
  achievements?: AchievementStateRead[];
  backendStatus?: BackendConnection;
  flashcards: Flashcard[];
  notes: NoteItem[];
  onNavigate: (tab: NavigationTab) => void;
  onOpenCanvas: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  currentSubject,
  studentId = STUDENT_ID,
  student,
  gamification = null,
  achievements = [],
  backendStatus = 'checking',
  flashcards,
  notes,
  onNavigate,
  onOpenCanvas,
}) => {
  const [blueprintSaved, setBlueprintSaved] = useState(false);

  // Backend-owned learning snapshot (mastery, confidence, next activity).
  const [progress, setProgress] = useState<ProgressRead | null>(null);
  const [nextActivity, setNextActivity] = useState<NextActivityRead | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressError, setProgressError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProgressLoading(true);
    setProgressError(null);
    Promise.allSettled([getStudentProgress(studentId), getStudentNextActivity(studentId)]).then(
      ([p, n]) => {
        if (cancelled) return;
        if (p.status === 'fulfilled') setProgress(p.value);
        if (n.status === 'fulfilled') setNextActivity(n.value);
        if (p.status === 'rejected' && n.status === 'rejected') {
          setProgressError("Couldn't load your progress. Please try again.");
        }
        setProgressLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const subjectTitle = currentSubject.includes(':') 
    ? currentSubject.split(':')[1].trim() 
    : currentSubject;
  const subjectCategory = currentSubject.includes(':') 
    ? currentSubject.split(':')[0].trim() 
    : 'Active Curriculum';

  // Mastery is computed by the backend — the frontend only displays it.
  const displayMastery = progress ? Math.round(progress.mastery * 100) : null;
  const displayMasteryBand = progress?.mastery_band ?? null;

  const latestCard = flashcards[0];
  const latestNote = notes[0];

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Top Banner & Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF5FB] border border-[#94C2DA]/60 text-xs font-bold text-[#203F9A] mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{user.grade?.toUpperCase() || 'SCHOLAR'} TRACK • {subjectCategory.toUpperCase()}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#1E1B17] tracking-tight">
            Good afternoon, <span className="text-[#203F9A]">{user.name || 'Scholar'}!</span>
          </h1>

          <div className="flex items-center gap-2 mt-2 text-xs font-medium text-[#444652]">
            <Target className="w-4 h-4 text-[#4E7CB2]" />
            <span className="text-[#757683] font-semibold">Active Subject:</span>
            <span className="px-3 py-1 rounded-lg bg-[#FAF2EA] text-[#203F9A] font-semibold border border-[#4E7CB2]/15">
              {currentSubject}
            </span>
          </div>
        </div>

        {/* Top Right Mini Metric Cards */}
        <div className="flex items-center gap-3">
          {/* Daily Goal Circular Meter */}
          <div className="bg-white rounded-2xl p-3 border border-[#4E7CB2]/20 shadow-xs flex items-center gap-3">
            <div className="relative w-12 h-12 flex items-center justify-center">
              {(() => {
                const goalPercent = Math.min(100, Math.round((user.dailySpentMinutes / (user.dailyGoalMinutes || 60)) * 100));
                return (
                  <>
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-[#FAF2EA]"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-[#203F9A]"
                        strokeDasharray={`${goalPercent}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute text-[11px] font-bold text-[#203F9A]">{goalPercent}%</span>
                  </>
                );
              })()}
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#757683] uppercase tracking-wider flex items-center gap-1">
                Daily Goal
                <span className="w-1.5 h-1.5 rounded-full bg-[#203F9A]" />
              </div>
              <div className="text-base font-bold text-[#1E1B17]">
                {user.dailySpentMinutes} <span className="text-xs font-medium text-[#757683]">/ {user.dailyGoalMinutes} min</span>
              </div>
            </div>
          </div>

          {/* Consistency Card */}
          <div className="bg-white rounded-2xl p-3 border border-[#4E7CB2]/20 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#E7A0CC]/20 border border-[#E7A0CC]/40 flex items-center justify-center text-[#E84797]">
              <Flame className="w-6 h-6 fill-[#E84797]" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#E84797] uppercase tracking-wider">
                Consistency
              </div>
              <div className="text-base font-bold text-[#1E1B17]">
                {user.streakDays} <span className="text-xs font-semibold text-[#444652]">{user.streakDays === 1 ? 'Day Run' : 'Days Run'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Hero Card */}
      <div className="paper-card rounded-2xl p-7 relative overflow-hidden">
        {/* Top meta strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#4E7CB2]/15">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-md bg-[#203F9A] text-white text-[11px] font-bold tracking-wide uppercase">
              Current Blueprint
            </span>
            <span className="text-xs font-bold text-[#4E7CB2] tracking-wider uppercase">
              {subjectCategory}
            </span>
            <span className="text-[#4E7CB2]/40">•</span>
            <span className="text-xs font-semibold text-[#757683]">Live Study Engine</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#757683] font-medium">
              <Clock className="w-3.5 h-3.5 text-[#4E7CB2]" />
              <span>Today's active sprint</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EBF5FB] text-[#203F9A] border border-[#94C2DA]/60">
              Active Session
            </span>
          </div>
        </div>

        {/* Hero Body: Left overview & Right widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
          {/* Left Column (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-[#1E1B17] tracking-tight leading-snug">
                {subjectTitle}
              </h2>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EBF5FB] text-[#203F9A] border border-[#94C2DA]/50">
                  <span className="w-2 h-2 rounded-full bg-[#203F9A]" />
                  {progressLoading ? 'Loading…' : `${displayMastery ?? '—'}% Mastery`}
                  {displayMasteryBand && <span className="text-[#4E7CB2] font-semibold">· {displayMasteryBand}</span>}
                </span>
                <span className="text-xs text-[#757683] font-medium">
                  {flashcards.length} Flashcards • {notes.length} Desk Sheets
                </span>
              </div>
            </div>

            <p className="text-[#444652] text-sm leading-relaxed">
              Explore concepts with your intelligent tutor, test retention with AI diagnostic drills, and build your physical desk revision notes with tactile markdown export.
            </p>

            {/* Milestone Checkpoints */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1E1B17]">Progress Milestones</span>
                <span className="font-bold text-[#203F9A]">Phase {displayMastery ? Math.min(4, Math.max(1, Math.ceil(displayMastery / 25))) : 1} of 4 Active</span>
              </div>

              {/* Segmented bar */}
              <div className="grid grid-cols-4 gap-2">
                <div className="h-2 rounded-full bg-[#203F9A]" />
                <div className={`h-2 rounded-full ${(displayMastery ?? 0) >= 50 ? 'bg-[#203F9A]' : 'bg-[#EFE8E0] border border-[#4E7CB2]/20'}`} />
                <div className={`h-2 rounded-full ${(displayMastery ?? 0) >= 75 ? 'bg-[#203F9A]' : 'bg-[#EFE8E0] border border-[#4E7CB2]/20'}`} />
                <div className={`h-2 rounded-full ${(displayMastery ?? 0) >= 90 ? 'bg-[#203F9A]' : 'bg-[#EFE8E0] border border-[#4E7CB2]/20'}`} />
              </div>

              {/* Labels */}
              <div className="grid grid-cols-4 text-[11px] font-semibold text-[#444652] pt-1">
                <div className="flex items-center gap-1 text-[#203F9A]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>1. Foundations</span>
                </div>
                <div className={`flex items-center gap-1 ${(displayMastery ?? 0) >= 50 ? 'text-[#203F9A]' : 'text-[#757683]'}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>2. Drill Analysis</span>
                </div>
                <div className={`flex items-center gap-1 font-bold ${(displayMastery ?? 0) >= 75 ? 'text-[#203F9A]' : 'text-[#757683]'}`}>
                  <Flag className="w-3 h-3 fill-current" />
                  <span>3. Deep Spec</span>
                </div>
                <div className={`${(displayMastery ?? 0) >= 90 ? 'text-[#203F9A]' : 'text-[#757683]'}`}>
                  <span>4. Exam Mastery</span>
                </div>
              </div>
            </div>

            {/* Hero Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                id="btn-resume-atlas"
                onClick={() => {
                  playClick();
                  onNavigate('ai-tutor');
                }}
                className="tactile-btn-primary px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Launch Session with Tutor</span>
              </button>

              <button
                id="btn-view-notes"
                onClick={() => {
                  playClick();
                  onNavigate('cascading-notes');
                }}
                className="tactile-btn-secondary px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>View Notes ({notes.length})</span>
              </button>

              <button
                onClick={() => {
                  playClick();
                  setBlueprintSaved(!blueprintSaved);
                }}
                className={`text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                  blueprintSaved ? 'text-[#203F9A] font-bold' : 'text-[#757683] hover:text-[#1E1B17]'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${blueprintSaved ? 'fill-current' : ''}`} />
                <span>{blueprintSaved ? 'Blueprint Saved' : 'Save Blueprint'}</span>
              </button>
            </div>
          </div>

          {/* Right Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Tactile Memory Deck Preview */}
            <div className="bg-[#FAF2EA]/80 rounded-xl p-4 border border-[#4E7CB2]/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#203F9A]" />
                  <span className="text-xs font-bold text-[#1E1B17]">Tactile Memory Deck</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-[#203F9A] border border-[#4E7CB2]/20">
                  {flashcards.length} Cards Queued
                </span>
              </div>

              {/* Dynamic Flashcard or Scratchpad Card */}
              <div 
                className="bg-white rounded-lg p-3 border border-[#4E7CB2]/25 shadow-xs relative overflow-hidden group cursor-pointer" 
                onClick={onOpenCanvas}
              >
                <div className="text-[10px] font-mono font-bold text-[#4E7CB2] tracking-wider uppercase flex items-center justify-between">
                  <span>TACTILE SCRATCHPAD & PROTOCOL VISUALIZER</span>
                  <Eye className="w-3.5 h-3.5 text-[#4E7CB2] group-hover:text-[#203F9A]" />
                </div>

                <div className="my-2 py-2 px-2 bg-[#FAF2EA]/40 rounded border border-[#4E7CB2]/10 text-xs font-medium text-[#1E1B17] line-clamp-2">
                  {latestCard ? (
                    <span><strong>Q:</strong> {latestCard.question}</span>
                  ) : (
                    <span>Draw custom packet flowcharts, circuit paths, and math diagrams</span>
                  )}
                </div>

                <div className="text-[10px] font-bold text-[#203F9A] flex items-center justify-between">
                  <span>Launch Freeform Canvas & Simulator</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#444652] text-[11px]">
                  {flashcards.length > 0 ? `${flashcards.length} cards in spaced repetition` : 'Build your revision deck'}
                </span>
                <button
                  onClick={() => {
                    playClick();
                    onNavigate('flashcards');
                  }}
                  className="text-xs font-bold text-[#203F9A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Review Deck</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* ATLAS Memory Cue */}
            <div className="bg-white rounded-xl p-4 border border-[#4E7CB2]/20 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[#203F9A]" />
                  <span className="text-xs font-bold text-[#203F9A] uppercase tracking-wider">
                    Atlas High-Yield Memory Cue
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF5FB] text-[#203F9A] border border-[#94C2DA]/50">
                  Key Concept
                </span>
              </div>

              <p className="text-xs text-[#1E1B17] italic leading-relaxed">
                {latestNote ? (
                  <span>“<strong className="text-[#203F9A] not-italic">{latestNote.title}:</strong> {latestNote.content.slice(0, 110)}...”</span>
                ) : (
                  <span>“Break down every complex topic into first principles, test with diagnostic drills, and reinforce with flashcard retrieval.”</span>
                )}
              </p>

              <div className="flex items-center justify-between text-[11px] pt-1 text-[#757683]">
                <span>{notes.length} Active Notes Saved</span>
                <button
                  onClick={() => {
                    playClick();
                    onNavigate('cascading-notes');
                  }}
                  className="font-bold text-[#203F9A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Notes</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ATLAS Learning Snapshot — all values computed by the backend */}
      <div className="paper-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#203F9A]" />
            <h3 className="font-bold text-base text-[#1E1B17]">ATLAS Learning Snapshot</h3>
          </div>
          {backendStatus === 'offline' && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FDF1F0] text-[#7F1D1D] border border-[#DC2626]/30">
              Backend offline
            </span>
          )}
        </div>

        {progressLoading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#757683]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your progress…
          </div>
        )}

        {progressError && (
          <div className="rounded-xl bg-[#FDF1F0] border border-[#DC2626]/30 text-[#7F1D1D] text-xs font-semibold px-4 py-3">
            {progressError}
          </div>
        )}

        {!progressLoading && !progressError && progress && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="rounded-xl bg-[#EBF5FB] p-3 border border-[#94C2DA]/40">
                <div className="text-[10px] font-bold text-[#4E7CB2] uppercase tracking-wider">Mastery</div>
                <div className="text-xl font-black text-[#203F9A]">{Math.round(progress.mastery * 100)}%</div>
                <div className="text-[10px] font-bold text-[#4E7CB2]">{progress.mastery_band}</div>
              </div>
              <div className="rounded-xl bg-white p-3 border border-[#4E7CB2]/15">
                <div className="text-[10px] font-bold text-[#757683] uppercase tracking-wider">Confidence</div>
                <div className="text-xl font-black text-[#1E1B17]">{Math.round(progress.confidence * 100)}%</div>
              </div>
              <div className="rounded-xl bg-white p-3 border border-[#4E7CB2]/15">
                <div className="text-[10px] font-bold text-[#757683] uppercase tracking-wider">Adaptability</div>
                <div className="text-xl font-black text-[#1E1B17]">{Math.round(progress.adaptability * 100)}%</div>
              </div>
              <div className="rounded-xl bg-white p-3 border border-[#4E7CB2]/15">
                <div className="text-[10px] font-bold text-[#757683] uppercase tracking-wider">Pace</div>
                <div className="text-xl font-black capitalize text-[#1E1B17]">{progress.pace}</div>
              </div>
              <div className="rounded-xl bg-[#FFF8E1] p-3 border border-[#F59E0B]/30">
                <div className="text-[10px] font-bold text-[#757683] uppercase tracking-wider">XP / Level</div>
                <div className="text-xl font-black text-amber-700">
                  {gamification ? gamification.xp.toLocaleString() : '—'}
                </div>
                {gamification && (
                  <div className="text-[10px] font-bold text-[#78350F]">
                    Level {gamification.level} · {gamification.xp_to_next_level} XP to next
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-[#FFF0F7] p-3 border border-[#E7A0CC]/40">
                <div className="text-[10px] font-bold text-[#757683] uppercase tracking-wider">Streak</div>
                <div className="text-xl font-black text-[#E84797]">
                  {gamification ? gamification.streak.current : '—'}d
                </div>
                {gamification && (
                  <div className="text-[10px] font-bold text-[#63003A]">longest {gamification.streak.longest}d</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Concept scores */}
              <div className="rounded-xl bg-[#FAF2EA]/70 p-4 border border-[#4E7CB2]/15">
                <div className="text-xs font-bold text-[#444652] mb-2">Concept mastery</div>
                {Object.entries(progress.concept_scores).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(progress.concept_scores).map(([concept, score]) => (
                      <span
                        key={concept}
                        className="px-2.5 py-1 rounded-full bg-white border border-[#4E7CB2]/20 text-[11px] font-bold text-[#203F9A]"
                      >
                        {concept.replace(/_/g, ' ')} · {Math.round(score * 100)}%
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[#757683]">No learning activity yet.</div>
                )}
              </div>

              {/* Next activity */}
              <div className="rounded-xl bg-[#EBF5FB] p-4 border border-[#94C2DA]/40">
                <div className="text-xs font-bold text-[#203F9A] mb-1 flex items-center gap-1.5">
                  <Route className="w-3.5 h-3.5" /> Next suggested activity
                </div>
                {nextActivity ? (
                  <div className="text-xs text-[#1E1B17]">
                    <span className="font-black capitalize">{nextActivity.activity}</span> on{' '}
                    <span className="font-bold">{nextActivity.topic.replace(/_/g, ' ')}</span>
                    <div className="text-[#444652] mt-1">{nextActivity.reason}</div>
                  </div>
                ) : (
                  <div className="text-xs text-[#757683]">No learning activity yet.</div>
                )}
              </div>
            </div>

            {/* Achievements / badges */}
            <div>
              <div className="text-xs font-bold text-[#444652] mb-2 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#203F9A]" /> Achievements
              </div>
              {achievements.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {achievements.map((a) => (
                    <span
                      key={a.id}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        a.unlocked
                          ? 'bg-[#EAF7EF] border-[#16A34A]/40 text-emerald-800'
                          : 'bg-[#FAF2EA] border-[#4E7CB2]/20 text-[#757683]'
                      }`}
                      title={a.criteria}
                    >
                      {a.unlocked ? '✓ ' : '🔒 '}
                      {a.name}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#757683]">No achievements yet — keep studying!</div>
              )}
            </div>
          </>
        )}

        {!progressLoading && !progressError && !progress && (
          <div className="rounded-xl bg-[#FAF2EA] border border-[#4E7CB2]/20 text-[#757683] text-xs font-semibold px-4 py-3">
            No learning activity yet. Start a tutoring session to build your progress snapshot.
          </div>
        )}
      </div>

      {/* Pinned Desk Memos & Micro-Tasks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-[#203F9A]" />
            <h3 className="font-bold text-base text-[#1E1B17]">
              Pinned Desk Memos & Micro-Tasks
            </h3>
          </div>
          <span className="text-xs font-bold text-[#4E7CB2] tracking-wider uppercase">
            TACTILE INDEX TABS • 3 ACTIONABLE STATIONS
          </span>
        </div>

        {/* 3 Sticky Cards with Physical Top Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Sticky 1 (Pink Accent Tab) - Flashcards */}
          <div className="relative group">
            <div className="absolute -top-3 left-6 px-4 py-1 bg-[#E7A0CC] text-[#63003A] text-[10px] font-bold rounded-t-md uppercase tracking-wider border-t border-l border-r border-[#E84797]/30">
              Revision Deck
            </div>
            <div className="paper-card paper-card-hover rounded-2xl p-5 pt-6 space-y-3 h-full flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-[#FFF0F7] text-[#E84797] font-bold text-[11px] border border-[#E7A0CC]">
                    Spaced Retrieval
                  </span>
                  <span className="text-xs font-bold text-[#757683]">{flashcards.length} Cards</span>
                </div>

                <h4 className="font-bold text-base text-[#1E1B17] leading-snug">
                  Flashcard Queue
                </h4>

                <p className="text-xs text-[#444652] leading-relaxed">
                  {latestCard ? `Latest: "${latestCard.question}"` : 'Practice fundamental theorems and formulas with flip-card spaced repetition.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#4E7CB2]/10">
                <span className="text-xs text-[#757683] font-medium">Spaced timing</span>
                <button
                  onClick={() => {
                    playClick();
                    onNavigate('flashcards');
                  }}
                  className="tactile-btn-pink px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 fill-current" />
                  <span>Review Deck</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sticky 2 (Sand / Cream Tab) - Focus Mode */}
          <div className="relative group">
            <div className="absolute -top-3 left-6 px-4 py-1 bg-[#E0D9D1] text-[#444652] text-[10px] font-bold rounded-t-md uppercase tracking-wider border-t border-l border-r border-[#4E7CB2]/30">
              Study Block
            </div>
            <div className="paper-card paper-card-hover rounded-2xl p-5 pt-6 space-y-3 h-full flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-[#FAF2EA] text-[#444652] font-bold text-[11px] border border-[#4E7CB2]/20">
                    ⏱ Focus Sprint
                  </span>
                  <span className="text-xs font-semibold text-[#757683]">
                    {user.dailySpentMinutes}/{user.dailyGoalMinutes}m
                  </span>
                </div>

                <h4 className="font-bold text-base text-[#1E1B17] leading-snug">
                  25m Pomodoro Deep Flow
                </h4>

                <p className="text-xs text-[#444652] leading-relaxed">
                  Zero-distraction sprint with soothing library ambient sound and interactive tactile packet flow timer.
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#4E7CB2]/10">
                <span className="text-xs text-[#757683] font-medium">25m deep / 5m rest</span>
                <button
                  onClick={() => {
                    playClick();
                    onNavigate('focus-mode');
                  }}
                  className="tactile-btn-secondary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Now</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sticky 3 (Sky Blue Tab) - Diagnostic Quizzes */}
          <div className="relative group">
            <div className="absolute -top-3 left-6 px-4 py-1 bg-[#94C2DA] text-[#00277E] text-[10px] font-bold rounded-t-md uppercase tracking-wider border-t border-l border-r border-[#4E7CB2]/30">
              Diagnostic Drill
            </div>
            <div className="paper-card paper-card-hover rounded-2xl p-5 pt-6 space-y-3 h-full flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-[#EBF5FB] text-[#203F9A] font-bold text-[11px] border border-[#94C2DA]/60">
                    📋 Exam Simulator
                  </span>
                  <span className="text-xs font-bold text-[#203F9A]">+25 XP / Question</span>
                </div>

                <h4 className="font-bold text-base text-[#1E1B17] leading-snug">
                  AI Practice Drills
                </h4>

                <p className="text-xs text-[#444652] leading-relaxed">
                  Generate 5 rapid-fire questions on any concept with detailed verified explanations.
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#4E7CB2]/10">
                <span className="text-xs text-[#757683] font-medium">Self-paced diagnostic</span>
                <button
                  onClick={() => {
                    playClick();
                    onNavigate('quizzes');
                  }}
                  className="tactile-btn-primary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Drill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Curriculum Roadmap & Weekly Study Rhythm */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Card: Curriculum Roadmap (7 cols) */}
        <div className="lg:col-span-7 paper-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#4E7CB2]/15 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EBF5FB] border border-[#94C2DA]/60 flex items-center justify-center text-[#203F9A]">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1E1B17]">Curriculum Track Progress</h3>
                <p className="text-xs text-[#4E7CB2]">{currentSubject}</p>
              </div>
            </div>
            <button
              onClick={() => {
                playClick();
                onNavigate('cascading-notes');
              }}
              className="text-xs font-bold text-[#203F9A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Desk Notes</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Units */}
          <div className="space-y-3">
            {/* Unit 1 */}
            <div className="p-3.5 rounded-xl bg-[#FAF2EA]/60 border border-[#4E7CB2]/15 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1E1B17]">
                    Unit 1: Fundamentals & Protocol Core
                  </div>
                  <div className="text-[11px] text-[#757683]">
                    Foundational theorems, axioms, and architecture definitions
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Mastered
              </span>
            </div>

            {/* Unit 2 (Active) */}
            <div className="p-3.5 rounded-xl bg-white border-2 border-[#203F9A]/30 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#203F9A] text-white flex items-center justify-center font-bold text-xs">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#203F9A] flex items-center gap-1.5">
                    <span>Unit 2: Active Investigation & Sequence Analysis</span>
                    <span className="w-2 h-2 rounded-full bg-[#E84797]" />
                  </div>
                  <div className="text-[11px] text-[#444652]">
                    Deep dives, interactive diagnostic drills, and protocol trace analysis
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  playClick();
                  onNavigate('ai-tutor');
                }}
                className="text-xs font-bold text-white bg-[#203F9A] px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer"
              >
                <span>{displayMastery === null ? '—' : `${displayMastery}%`} Active</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Unit 3 (Upcoming) */}
            <div className="p-3.5 rounded-xl bg-[#FAF2EA]/40 border border-[#4E7CB2]/10 flex items-center justify-between opacity-80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E0D9D1] text-[#757683] flex items-center justify-center font-bold text-xs">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#757683]">
                    Unit 3: Advanced Applications & Synthesis
                  </div>
                  <div className="text-[11px] text-[#757683]">
                    Edge case handling, multi-system integration, and mock exams
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#757683]">Next Level</span>
            </div>
          </div>

          {/* Recent Desk Notes Preview */}
          <div className="bg-[#FAF2EA] rounded-xl p-4 border border-[#4E7CB2]/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#203F9A]">
                <Sparkles className="w-4 h-4" />
                <span>Recent Desk Sheets</span>
              </div>
              <span className="text-[10px] text-[#757683]">{notes.length} Total</span>
            </div>
            {notes.length > 0 ? (
              <div className="space-y-1.5">
                {notes.slice(0, 2).map(n => (
                  <div key={n.id} className="text-xs text-[#444652] flex items-center justify-between bg-white/70 p-2 rounded-lg border border-[#4E7CB2]/10">
                    <span className="font-semibold truncate max-w-[240px]">{n.title}</span>
                    <span className="text-[10px] text-[#757683]">{n.timestamp}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#444652] leading-relaxed">
                No desk notes yet. Create notes in Cascading Notes or ask Tutor to summarize key learnings.
              </p>
            )}
          </div>
        </div>

        {/* Right Card: Weekly Study Rhythm & Mantra (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="paper-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#4E7CB2]/15 pb-3">
              <div>
                <div className="flex items-center gap-2 font-bold text-base text-[#1E1B17]">
                  <BarChart2 className="w-4 h-4 text-[#203F9A]" />
                  <span>Study Rhythm & Target</span>
                </div>
                <div className="text-xs text-[#4E7CB2] font-semibold mt-0.5">
                  Today: {user.dailySpentMinutes} min completed
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FAF2EA] text-[#444652] border border-[#4E7CB2]/20">
                Target: {user.dailyGoalMinutes}m
              </span>
            </div>

            {/* Weekly Bar Chart (M, T, W, T, F, S, S) */}
            <div className="pt-4 pb-2">
              <div className="h-32 flex items-end justify-between gap-3 px-2">
                {[
                  { day: 'M', height: '45%', hrs: '45m' },
                  { day: 'T', height: '65%', hrs: '60m' },
                  { day: 'W', height: '80%', hrs: '75m' },
                  { day: 'T', height: '100%', hrs: `${user.dailySpentMinutes}m`, active: true },
                  { day: 'F', height: '55%', hrs: '50m' },
                  { day: 'S', height: '40%', hrs: '35m' },
                  { day: 'S', height: '30%', hrs: '25m', isWeekend: true },
                ].map((col, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                    {col.active && (
                      <span className="absolute -top-6 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#203F9A] text-white shadow-xs whitespace-nowrap">
                        {col.hrs}
                      </span>
                    )}
                    <div
                      style={{ height: col.height }}
                      className={`w-full max-w-[28px] rounded-t-md transition-all ${
                        col.active
                          ? 'bg-[#203F9A]'
                          : col.isWeekend
                          ? 'bg-[#E7A0CC]/40 hover:bg-[#E7A0CC]'
                          : 'bg-[#94C2DA]/50 hover:bg-[#94C2DA]'
                      }`}
                    />
                    <span className={`text-xs font-bold ${
                      col.active ? 'text-[#203F9A]' : col.isWeekend ? 'text-[#E84797]' : 'text-[#757683]'
                    }`}>
                      {col.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-[#4E7CB2]/15">
              <span className="text-[#444652]">{user.totalXp} XP accumulated</span>
              <button
                onClick={() => {
                  playClick();
                  onNavigate('focus-mode');
                }}
                className="font-bold text-[#203F9A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Pomodoro Timer</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Notebook Mantra Box */}
          <div className="paper-card rounded-2xl p-5 border-dashed border-[#4E7CB2]/30 space-y-2 bg-[#FAF2EA]/40 relative">
            <div className="flex items-center justify-between text-xs font-bold text-[#4E7CB2] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Feather className="w-3.5 h-3.5" />
                Notebook Mantra
              </span>
              <span className="text-xl leading-none text-[#4E7CB2]/40">”</span>
            </div>

            <blockquote className="text-sm font-medium text-[#1E1B17] italic leading-relaxed">
              “Do not merely memorize answers. Trace the concepts until you can explain the reasons from first principles.”
            </blockquote>

            <div className="text-[11px] text-[#757683] text-right font-medium">
              — ATLAS Study Companion • Day {user.streakDays}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
