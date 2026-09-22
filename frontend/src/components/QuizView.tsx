import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  ArrowRight, 
  RotateCcw, 
  Trophy, 
  History,
  Check,
  Sparkles,
  Loader2,
  Trash2,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuizQuestion } from '../types';
import { QUIZ_TRACKS, QuizTrack } from '../data/mockData';
import { playClick, playChime } from '../utils/audio';
import {
  loadStoredQuizHistory,
  saveStoredQuizHistory,
  QuizAttemptRecord,
  loadStoredQuizTracks,
  saveStoredQuizTracks,
} from '../utils/storage';
import { createAssessment, submitAssessment, STUDENT_ID, DEFAULT_TOPIC } from '../services/api';
import type {
  AssessmentCreateResponse,
  AssessmentQuestionRead,
  AssessmentSubmitResponse,
  GamificationAward,
  SubmittedAnswer,
} from '../services/apiTypes';

interface QuizViewProps {
  questions?: QuizQuestion[];
  onAddXp: (amount: number) => void;
  onGamification?: (award: GamificationAward | null) => void;
  currentSubject?: string;
}

export const QuizView: React.FC<QuizViewProps> = ({
  onAddXp,
  onGamification,
  currentSubject = 'Computer Networks',
}) => {
  const [tracks, setTracks] = useState<QuizTrack[]>(() => loadStoredQuizTracks());
  const [selectedTrackId, setSelectedTrackId] = useState<string>(() => {
    const loaded = loadStoredQuizTracks();
    return loaded[0]?.id || QUIZ_TRACKS[0].id;
  });

  const currentTrack: QuizTrack = tracks.find((t) => t.id === selectedTrackId) || tracks[0] || QUIZ_TRACKS[0];
  const questions = currentTrack?.questions || [];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [history, setHistory] = useState<QuizAttemptRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // AI Quiz Generator Modal
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState(currentSubject);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Backend ATLAS assessment (generation + grading owned by the backend)
  const [assessmentQuestions, setAssessmentQuestions] = useState<AssessmentQuestionRead[] | null>(null);
  const [assessmentId, setAssessmentId] = useState<number | null>(null);
  const [assessmentAnswers, setAssessmentAnswers] = useState<SubmittedAnswer[]>([]);
  const [assessmentIdx, setAssessmentIdx] = useState(0);
  const [assessmentSelected, setAssessmentSelected] = useState<string | null>(null);
  const [assessmentTextInput, setAssessmentTextInput] = useState('');
  const [assessmentResult, setAssessmentResult] = useState<AssessmentSubmitResponse | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadStoredQuizHistory());
  }, []);

  const currentQ = questions[currentIdx] || questions[0];

  const handleSelectTrack = (trackId: string) => {
    playClick();
    setSelectedTrackId(trackId);
    setCurrentIdx(0);
    setSelectedOption(null);
    setSubmitted(false);
    setScore(0);
    setQuizFinished(false);
  };

  const handleDeleteTrack = (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    if (tracks.length <= 1) {
      alert('You must keep at least one quiz track.');
      return;
    }
    if (confirm('Delete this custom quiz track?')) {
      playClick();
      const updated = tracks.filter((t) => t.id !== trackId);
      setTracks(updated);
      saveStoredQuizTracks(updated);
      if (selectedTrackId === trackId) {
        setSelectedTrackId(updated[0].id);
        setCurrentIdx(0);
        setSelectedOption(null);
        setSubmitted(false);
        setScore(0);
        setQuizFinished(false);
      }
    }
  };

  const handleSelectOption = (label: string) => {
    if (submitted) return;
    playClick();
    setSelectedOption(label);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption || !currentQ) return;
    setSubmitted(true);
    const isCorrect = selectedOption === currentQ.correctAnswer;

    if (isCorrect) {
      playChime('high');
      setScore((s) => s + 1);
      onAddXp(currentQ.xpReward || 20);
    } else {
      playClick();
    }
  };

  const handleNext = () => {
    playClick();
    setSelectedOption(null);
    setSubmitted(false);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      // Quiz finished
      setQuizFinished(true);
      playChime('success');

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#203F9A', '#E84797', '#94C2DA', '#FFD56B', '#16A34A'],
        });
      } catch (e) {}

      const finalScore = score + (selectedOption === currentQ.correctAnswer && !submitted ? 1 : 0);
      const newRecord: QuizAttemptRecord = {
        id: `qa-${Date.now()}`,
        quizTitle: currentTrack.title,
        score: finalScore,
        totalQuestions: questions.length,
        percentage: Math.round((finalScore / questions.length) * 100),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        xpEarned: finalScore * 25,
      };
      const updated = [newRecord, ...history.slice(0, 14)];
      setHistory(updated);
      saveStoredQuizHistory(updated);
    }
  };

  const handleRestart = () => {
    playClick();
    setCurrentIdx(0);
    setSelectedOption(null);
    setSubmitted(false);
    setScore(0);
    setQuizFinished(false);
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim() || aiGenerating) return;

    try {
      playClick();
      setAiGenerating(true);
      setAiError(null);

      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          count: 5,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate quiz from server');
      }

      const data = await res.json();
      const generatedQuestions = data.questions;

      if (!generatedQuestions || generatedQuestions.length === 0) {
        throw new Error('No questions returned by AI model');
      }

      const newTrack: QuizTrack = {
        id: `ai-track-${Date.now()}`,
        title: `${aiTopic.trim()}: AI Diagnostic Drill`,
        category: 'AI Generated Drill',
        badge: 'AI Drill',
        description: `Dynamic exam drill generated by Atlas for ${aiTopic.trim()}`,
        questions: generatedQuestions,
      };

      const updatedTracks = [...tracks, newTrack];
      setTracks(updatedTracks);
      saveStoredQuizTracks(updatedTracks);
      setSelectedTrackId(newTrack.id);
      setCurrentIdx(0);
      setSelectedOption(null);
      setSubmitted(false);
      setScore(0);
      setQuizFinished(false);
      setAiModalOpen(false);
      playChime('success');
      onAddXp(40);
    } catch (err: any) {
      console.error('AI quiz generation error:', err);
      setAiError(err.message || 'Unable to generate quiz. Please check server.');
    } finally {
      setAiGenerating(false);
    }
  };

  // ── Backend ATLAS assessment flow ────────────────────────────────────────────
  const currentAssessmentQuestion = assessmentQuestions?.[assessmentIdx] ?? null;

  const handleStartAssessment = async () => {
    playClick();
    setAssessmentError(null);
    setAssessmentResult(null);
    setAssessmentLoading(true);
    try {
      const created: AssessmentCreateResponse = await createAssessment(DEFAULT_TOPIC, 5, STUDENT_ID);
      setAssessmentId(created.assessment_id);
      setAssessmentQuestions(created.questions);
      setAssessmentAnswers([]);
      setAssessmentIdx(0);
      setAssessmentSelected(null);
      setAssessmentTextInput('');
    } catch (e) {
      setAssessmentError(
        e instanceof Error ? e.message : 'Could not start the assessment. Please try again.'
      );
    } finally {
      setAssessmentLoading(false);
    }
  };

  const submitAssessmentNow = async (finalAnswers: SubmittedAnswer[]) => {
    if (!assessmentId) return;
    setAssessmentLoading(true);
    setAssessmentError(null);
    try {
      const result = await submitAssessment(assessmentId, finalAnswers);
      setAssessmentResult(result);
      if (onGamification) onGamification(result.gamification ?? null);
      playChime(result.score_summary.percent >= 70 ? 'success' : 'medium');
    } catch (e) {
      setAssessmentError(
        e instanceof Error ? e.message : 'Could not submit the assessment. Please try again.'
      );
    } finally {
      setAssessmentLoading(false);
    }
  };

  const handleAssessmentNext = () => {
    if (!assessmentQuestions || !currentAssessmentQuestion) return;
    playClick();
    const answer = (assessmentSelected ?? assessmentTextInput).trim();
    if (!answer) return;
    const updated: SubmittedAnswer[] = [
      ...assessmentAnswers,
      { question_id: currentAssessmentQuestion.id, answer, hint_used: false, time_seconds: null },
    ];
    setAssessmentAnswers(updated);
    setAssessmentSelected(null);
    setAssessmentTextInput('');
    if (assessmentIdx < assessmentQuestions.length - 1) {
      setAssessmentIdx((i) => i + 1);
    } else {
      submitAssessmentNow(updated);
    }
  };

  const handleAssessmentSelect = (answer: string) => {
    if (!currentAssessmentQuestion) return;
    playClick();
    setAssessmentSelected(answer);
  };

  const handleAssessmentReset = () => {
    playClick();
    setAssessmentQuestions(null);
    setAssessmentId(null);
    setAssessmentAnswers([]);
    setAssessmentIdx(0);
    setAssessmentResult(null);
    setAssessmentSelected(null);
    setAssessmentTextInput('');
    setAssessmentError(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* ATLAS Backend Assessment — question bank + grading owned by the backend */}
      <div className="paper-card rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF5FB] border border-[#94C2DA]/60 text-xs font-bold text-[#203F9A] mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ATLAS Graded Assessment</span>
            </div>
            <h3 className="font-bold text-lg text-[#1E1B17]">Backend Practice Drill</h3>
            <p className="text-xs text-[#4E7CB2]">
              Questions are generated by ATLAS; scoring, mastery updates, and XP are all decided by the backend.
            </p>
          </div>
          {!assessmentQuestions && !assessmentResult && (
            <button
              onClick={handleStartAssessment}
              disabled={assessmentLoading}
              className="tactile-btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
            >
              {assessmentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              <span>{assessmentLoading ? 'Starting…' : 'Start Drill'}</span>
            </button>
          )}
        </div>

        {assessmentError && (
          <div className="rounded-xl bg-[#FDF1F0] border border-[#DC2626]/30 text-[#7F1D1D] text-xs font-semibold px-4 py-3">
            {assessmentError}
          </div>
        )}

        {assessmentResult && (
          <div className="space-y-4">
            <div
              className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
                assessmentResult.score_summary.percent >= 70
                  ? 'bg-[#EAF7EF] border-[#16A34A]/40 text-[#14532D]'
                  : 'bg-[#FFF8E1] border-[#F59E0B]/40 text-[#78350F]'
              }`}
            >
              Score: {assessmentResult.score_summary.correct}/{assessmentResult.score_summary.total} (
              {Math.round(assessmentResult.score_summary.percent * 100)}%) · Mastery{' '}
              {Math.round(assessmentResult.mastery_before * 100)}% →{' '}
              {Math.round(assessmentResult.mastery_after * 100)}% ({assessmentResult.mastery_band})
              {assessmentResult.gamification && assessmentResult.gamification.xp_awarded > 0 && (
                <div className="mt-1 font-bold">
                  +{assessmentResult.gamification.xp_awarded} XP · total {assessmentResult.gamification.new_total}
                  {assessmentResult.gamification.level_up ? ' · Level up!' : ''}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {assessmentResult.results.map((r) => (
                <div
                  key={r.question_id}
                  className={`rounded-xl border px-3 py-2.5 text-xs ${
                    r.correct ? 'bg-[#EAF7EF] border-[#16A34A]/25' : 'bg-[#FFF0F7] border-[#E7A0CC]/40'
                  }`}
                >
                  <div className="font-bold text-[#1E1B17] flex items-center gap-1.5">
                    {r.correct ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-[#E84797]" />}
                    {r.correct ? 'Correct' : 'Incorrect'}
                  </div>
                  <div className="text-[#444652] mt-1">{r.explanation}</div>
                  {r.misconception_tag && (
                    <div className="text-[11px] font-bold text-[#E84797] mt-1">
                      Misconception: {r.misconception_tag.replace(/_/g, ' ')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {assessmentResult.next_activity && (
              <div className="rounded-xl bg-[#FAF2EA] border border-[#4E7CB2]/20 px-3 py-2.5 text-xs text-[#444652]">
                <span className="font-bold text-[#203F9A]">Next suggested activity:</span>{' '}
                {assessmentResult.next_activity.activity} on {assessmentResult.next_activity.topic} —{' '}
                {assessmentResult.next_activity.reason}
              </div>
            )}

            <button
              onClick={handleAssessmentReset}
              className="tactile-btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start New Drill</span>
            </button>
          </div>
        )}

        {assessmentQuestions && !assessmentResult && currentAssessmentQuestion && (
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[#757683] mb-2">
              <span>
                Question {assessmentIdx + 1} of {assessmentQuestions.length}
              </span>
              <span className="text-[#203F9A]">
                {currentAssessmentQuestion.type.replace(/_/g, ' ')} · difficulty {currentAssessmentQuestion.difficulty}
              </span>
            </div>
            <div className="text-base font-bold text-[#1E1B17] mb-4">{currentAssessmentQuestion.prompt}</div>

            {currentAssessmentQuestion.options.length > 0 ? (
              <div className="grid gap-2">
                {currentAssessmentQuestion.options.map((opt, idx) => (
                  <button
                    key={`${opt}-${idx}`}
                    onClick={() => handleAssessmentSelect(opt)}
                    className={`text-left px-3.5 py-2.5 rounded-xl border text-sm transition-all cursor-pointer ${
                      assessmentSelected === opt
                        ? 'bg-[#203F9A] text-white border-[#203F9A] shadow-xs'
                        : 'bg-white border-[#4E7CB2]/20 text-[#1E1B17] hover:bg-[#FAF2EA]'
                    }`}
                  >
                    <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={assessmentTextInput}
                onChange={(e) => setAssessmentTextInput(e.target.value)}
                placeholder="Type your answer…"
                className="w-full p-3 rounded-xl border border-[#4E7CB2]/30 bg-white text-sm focus:outline-[#203F9A]"
              />
            )}

            <button
              onClick={handleAssessmentNext}
              disabled={!assessmentSelected && !assessmentTextInput.trim()}
              className="tactile-btn-primary mt-4 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ArrowRight className="w-4 h-4" />
              <span>
                {assessmentLoading
                  ? 'Submitting…'
                  : assessmentIdx < assessmentQuestions.length - 1
                    ? 'Next Question'
                    : 'Submit Assessment'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Header & Track Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF5FB] border border-[#94C2DA]/60 text-xs font-bold text-[#203F9A] mb-1">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Diagnostic Drill & Exam Simulator</span>
          </div>
          <h2 className="text-2xl font-bold text-[#1E1B17]">
            {currentTrack?.title || 'Practice Drill'}
          </h2>
          <p className="text-xs text-[#4E7CB2]">
            {currentTrack?.description || 'Test understanding with step-by-step verified explanations.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-ai-generate-quiz"
            onClick={() => {
              playClick();
              setAiTopic(currentSubject);
              setAiModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#EBF5FB] hover:bg-[#D5EBF8] text-[#203F9A] border border-[#94C2DA]/60 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Drill with AI</span>
          </button>

          <button
            onClick={() => {
              playClick();
              setShowHistory(!showHistory);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              showHistory
                ? 'bg-[#203F9A] text-white border-[#203F9A]'
                : 'bg-white text-[#444652] border-[#4E7CB2]/20 hover:bg-[#FAF2EA]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Drill History ({history.length})</span>
          </button>
        </div>
      </div>

      {/* Track Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tracks.map((t) => (
          <div
            key={t.id}
            onClick={() => handleSelectTrack(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              selectedTrackId === t.id
                ? 'bg-[#203F9A] text-white shadow-xs'
                : 'bg-white border border-[#4E7CB2]/20 text-[#444652] hover:bg-[#FAF2EA]'
            }`}
          >
            <span>{t.title.split(':')[0]}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              selectedTrackId === t.id ? 'bg-white/20 text-white' : 'bg-[#FAF2EA] text-[#4E7CB2]'
            }`}>
              {t.questions.length}Q
            </span>
            {t.id.startsWith('ai-track-') && (
              <button
                onClick={(e) => handleDeleteTrack(e, t.id)}
                className="opacity-70 hover:opacity-100 hover:text-red-300 ml-1 p-0.5"
                title="Delete custom track"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Attempt History Drawer */}
      {showHistory && (
        <div className="bg-white rounded-2xl p-5 border border-[#4E7CB2]/20 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#4E7CB2]/15 pb-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#757683]">
              Recent Drill Scores & Mastery
            </h4>
            <span className="text-xs text-[#203F9A] font-semibold">
              Persisted in Local Storage
            </span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#757683]">
              No drills recorded yet. Complete a quiz to see your retention history!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {history.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-[#FAF2EA]/50 border border-[#4E7CB2]/15 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-[#1E1B17] truncate max-w-[180px]">
                      {item.quizTitle}
                    </div>
                    <div className="text-[10px] text-[#757683] mt-0.5">
                      {item.timestamp} • +{item.xpEarned} XP
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-xs font-black ${
                    item.percentage >= 75
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.percentage >= 50
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {item.score}/{item.totalQuestions}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Quiz Station */}
      {questions.length > 0 && !quizFinished ? (
        <div className="paper-card rounded-2xl p-7 space-y-6">
          {/* Progress row */}
          <div className="flex items-center justify-between text-xs font-bold text-[#757683] pb-3 border-b border-[#4E7CB2]/15">
            <span>
              Question {currentIdx + 1} of {questions.length}
            </span>
            <span className="flex items-center gap-1 text-[#203F9A]">
              <Zap className="w-3.5 h-3.5 fill-current" />
              +{currentQ?.xpReward || 20} XP per correct answer
            </span>
          </div>

          {/* Question text */}
          <div className="text-lg font-bold text-[#1E1B17] leading-snug">
            {currentQ?.question}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQ?.options?.map((opt) => {
              const isSelected = selectedOption === opt.label;
              const isCorrect = opt.label === currentQ.correctAnswer;

              let btnStyle = 'bg-[#FAF2EA]/50 border-[#4E7CB2]/20 hover:bg-[#FAF2EA] text-[#1E1B17]';
              if (submitted) {
                if (isCorrect) {
                  btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                } else if (isSelected && !isCorrect) {
                  btnStyle = 'bg-rose-50 border-rose-400 text-rose-900';
                } else {
                  btnStyle = 'opacity-50 bg-[#FAF2EA]/30 border-gray-200';
                }
              } else if (isSelected) {
                btnStyle = 'bg-[#EBF5FB] border-[#203F9A] text-[#203F9A] font-bold shadow-xs';
              }

              return (
                <button
                  key={opt.label}
                  disabled={submitted}
                  onClick={() => handleSelectOption(opt.label)}
                  className={`w-full text-left p-4 rounded-xl text-xs md:text-sm font-medium border transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-white border border-[#4E7CB2]/20 flex items-center justify-center font-bold text-xs">
                      {opt.label}
                    </span>
                    <span>{opt.text}</span>
                  </div>
                  {submitted && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  )}
                  {submitted && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Banner */}
          {submitted && (
            <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1 ${
              selectedOption === currentQ?.correctAnswer
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                : 'bg-[#FAF2EA] border-[#4E7CB2]/20 text-[#444652]'
            }`}>
              <div className="font-bold flex items-center gap-1.5">
                {selectedOption === currentQ?.correctAnswer ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Correct Analysis!</span>
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-4 h-4 text-[#203F9A]" />
                    <span>Conceptual Analysis:</span>
                  </>
                )}
              </div>
              <p>{currentQ?.explanation}</p>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-end pt-4 border-t border-[#4E7CB2]/15">
            {!submitted ? (
              <button
                disabled={!selectedOption}
                onClick={handleSubmitAnswer}
                className="tactile-btn-primary px-6 py-2.5 rounded-xl font-bold text-xs disabled:opacity-40 cursor-pointer"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="tactile-btn-primary px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>{currentIdx < questions.length - 1 ? 'Next Question' : 'Complete Drill'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : quizFinished ? (
        /* Quiz Finished Summary */
        <div className="paper-card rounded-3xl p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#FAF2EA] border-2 border-[#203F9A] flex items-center justify-center mx-auto text-3xl shadow-md">
            <Trophy className="w-8 h-8 text-[#203F9A]" />
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-[#1E1B17]">Drill Completed!</h3>
            <p className="text-xs text-[#757683]">
              Diagnostic score: <strong className="text-[#203F9A] text-sm">{score} / {questions.length}</strong> correct ({Math.round((score / Math.max(1, questions.length)) * 100)}%)
            </p>
          </div>

          <p className="text-xs text-[#444652] max-w-md mx-auto">
            Your results have been saved to your scholar history. Missed concepts have been flagged for spaced-repetition retrieval.
          </p>

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={handleRestart}
              className="tactile-btn-primary px-6 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Diagnostic Drill</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="paper-card rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm text-gray-500">No questions available in this track.</p>
          <button
            onClick={() => setAiModalOpen(true)}
            className="tactile-btn-primary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Questions with AI</span>
          </button>
        </div>
      )}

      {/* AI Generate Quiz Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#203F9A]/30 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-[#4E7CB2]/30 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#EBF5FB] text-[#203F9A] border border-[#94C2DA]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1E1B17]">Generate Diagnostic Drill</h3>
                <p className="text-xs text-[#757683]">Atlas crafts 5 rigorous questions with full explanations</p>
              </div>
            </div>

            <form onSubmit={handleGenerateQuiz} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#444652]">Curriculum Topic or Exam Section</label>
                <input
                  type="text"
                  required
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Subnetting & CIDR Math, DNS Resolution, BGP Protocol"
                  className="w-full text-xs p-2.5 rounded-lg border border-[#4E7CB2]/20 bg-[#FAF2EA]/40 mt-1 focus:outline-[#203F9A]"
                />
              </div>

              {aiError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {aiError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={aiGenerating}
                  onClick={() => setAiModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#757683] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={aiGenerating}
                  className="tactile-btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Drill...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Create Drill (+40 XP)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
