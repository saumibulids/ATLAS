import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  RotateCcw, 
  Plus, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  Trash2, 
  Shuffle, 
  Filter,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Flashcard } from '../types';
import { playClick, playChime } from '../utils/audio';
import { getFlashcards, reviewFlashcard, STUDENT_ID } from '../services/api';
import type { FlashcardRating, FlashcardRead, GamificationAward } from '../services/apiTypes';

interface FlashcardsViewProps {
  cards: Flashcard[];
  onAddXp: (amount: number) => void;
  onGamification?: (award: GamificationAward | null) => void;
  onAddCard: (question: string, answer: string, category: string) => void;
  onDeleteCard?: (id: string) => void;
  currentSubject?: string;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  cards,
  onAddXp,
  onGamification,
  onAddCard,
  onDeleteCard,
  currentSubject = 'Computer Networks',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  
  // Modals
  const [newCardOpen, setNewCardOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState(currentSubject);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  // Backend revision queue (GET /api/students/{id}/flashcards)
  const [backendCards, setBackendCards] = useState<FlashcardRead[]>([]);
  const [deckLoading, setDeckLoading] = useState(true);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  // Manual Form
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const [newCategory, setNewCategory] = useState(currentSubject);

  const loadBackendDeck = () => {
    setDeckLoading(true);
    setDeckError(null);
    getFlashcards('routing', 8, STUDENT_ID)
      .then((deck) => {
        setBackendCards(deck.cards);
        setDeckLoading(false);
      })
      .catch(() => {
        setBackendCards([]);
        setDeckError("Couldn't load your revision deck. Please try again.");
        setDeckLoading(false);
      });
  };

  useEffect(() => {
    loadBackendDeck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackendReview = async (flashcardId: number, rating: FlashcardRating) => {
    playChime(rating === 'easy' || rating === 'knew_it' ? 'high' : 'medium');
    setReviewingId(flashcardId);
    try {
      const res = await reviewFlashcard(flashcardId, rating, STUDENT_ID);
      if (onGamification) onGamification(res.gamification ?? null);
      // Refresh the deck so due/next-review state reflects the backend schedule.
      loadBackendDeck();
    } catch (err) {
      console.warn('Flashcard review failed:', err);
    } finally {
      setReviewingId(null);
    }
  };

  // Filtered cards
  const filteredCards = selectedCategory === 'All' 
    ? cards 
    : cards.filter(c => c.category.toLowerCase() === selectedCategory.toLowerCase());

  const currentCard = filteredCards[currentIndex] || filteredCards[0];

  const categories = ['All', ...Array.from(new Set(cards.map(c => c.category)))];

  const handleRating = (multiplier: number) => {
    playChime('medium');
    onAddXp(Math.round(10 * multiplier));
    setReviewedCount((prev) => prev + 1);
    setIsFlipped(false);
    if (currentIndex < filteredCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleShuffle = () => {
    playClick();
    if (filteredCards.length > 1) {
      setCurrentIndex(Math.floor(Math.random() * filteredCards.length));
      setIsFlipped(false);
    }
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQ.trim() || !newA.trim()) return;
    playChime('success');
    onAddCard(newQ.trim(), newA.trim(), newCategory.trim() || 'General');
    onAddXp(15);
    setNewQ('');
    setNewA('');
    setNewCardOpen(false);
  };

  const handleGenerateWithAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim() || aiGenerating) return;

    try {
      playClick();
      setAiGenerating(true);
      setAiSuccessMsg(null);

      const res = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          count: 5,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate flashcards from server');
      }

      const data = await res.json();
      const generatedCards = data.flashcards || [];

      if (generatedCards.length > 0) {
        generatedCards.forEach((c: { question: string; answer: string; category?: string }) => {
          onAddCard(c.question, c.answer, c.category || aiTopic.trim());
        });
        playChime('success');
        onAddXp(30);
        setAiSuccessMsg(`Added ${generatedCards.length} high-yield flashcards to your deck!`);
        setTimeout(() => {
          setAiModalOpen(false);
          setAiSuccessMsg(null);
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      alert('Could not generate flashcards. Please check connection and try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Backend Revision Queue (ATLAS spaced repetition from the backend) */}
      <div className="paper-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF5FB] border border-[#94C2Da]/60 text-xs font-bold text-[#203F9A] mb-1">
              <Layers className="w-3.5 h-3.5" />
              <span>ATLAS Spaced-Repetition Deck</span>
            </div>
            <h3 className="font-bold text-lg text-[#1E1B17]">
              Due Now from the Backend {!deckLoading && !deckError && backendCards.length > 0 && `(${backendCards.length})`}
            </h3>
            <p className="text-xs text-[#4E7CB2]">
              Ratings sync to the backend — it schedules the next review and awards XP.
            </p>
          </div>
        </div>

        {deckLoading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#757683]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your revision deck…
          </div>
        )}

        {deckError && (
          <div className="rounded-xl bg-[#FDF1F0] border border-[#DC2626]/30 text-[#7F1D1D] text-xs font-semibold px-4 py-3">
            {deckError}
          </div>
        )}

        {!deckLoading && !deckError && backendCards.length === 0 && (
          <div className="rounded-xl bg-[#FAF2EA] border border-[#4E7CB2]/20 text-[#757683] text-xs font-semibold px-4 py-3">
            No learning activity yet. Your scheduled revision cards will appear here once the backend builds your deck.
          </div>
        )}

        {!deckLoading && !deckError && backendCards.length > 0 && (
          <div className="space-y-3">
            {backendCards.map((card) => (
              <div
                key={card.id}
                className="rounded-xl bg-white border border-[#4E7CB2]/15 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-bold text-[#1E1B17]">{card.front}</div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#FAF2EA] border border-[#4E7CB2]/20 text-[10px] font-bold text-[#444652]">
                    {card.concept_slug.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-xs text-[#444652] whitespace-pre-line bg-[#FAF2EA]/50 p-3 rounded-lg border border-[#4E7CB2]/10">
                  {card.back}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(
                    [
                      { label: 'Didn\'t know', rating: 'didnt_know' as const, cls: 'bg-[#FFF0F7] border-[#E7A0CC] text-[#E84797]' },
                      { label: 'Almost', rating: 'almost' as const, cls: 'bg-[#FAF2EA] border-[#4E7CB2]/25 text-[#444652]' },
                      { label: 'Knew it', rating: 'knew_it' as const, cls: 'bg-[#EBF5FB] border-[#94C2DA] text-[#203F9A]' },
                      { label: 'Easy', rating: 'easy' as const, cls: 'bg-[#EAF7EF] border-emerald-300 text-emerald-800' },
                    ]
                  ).map((opt) => (
                    <button
                      key={opt.rating}
                      onClick={() => handleBackendReview(card.id, opt.rating)}
                      disabled={reviewingId === card.id}
                      className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold hover:opacity-80 transition-all cursor-pointer disabled:opacity-50 ${opt.cls}`}
                    >
                      {reviewingId === card.id ? 'Saving…' : opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF5FB] border border-[#94C2DA]/60 text-xs font-bold text-[#203F9A] mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Tactile Memory Deck • Spaced Repetition</span>
          </div>
          <h2 className="text-2xl font-bold text-[#1E1B17]">
            Active Revision Queue ({filteredCards.length} Cards)
          </h2>
          <p className="text-xs text-[#4E7CB2]">
            Flip cards to review fundamental principles, sequence math, and protocol behaviors.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-ai-generate-flashcards"
            onClick={() => {
              playClick();
              setAiTopic(currentSubject);
              setAiModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#EBF5FB] hover:bg-[#D5EBF8] text-[#203F9A] border border-[#94C2DA]/60 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate with AI</span>
          </button>

          <button
            onClick={() => {
              playClick();
              setNewCardOpen(true);
            }}
            className="tactile-btn-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Card</span>
          </button>
        </div>
      </div>

      {/* Category Pills & Deck Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/70 p-3 rounded-2xl border border-[#4E7CB2]/15">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
          <span className="text-[11px] font-bold text-[#757683] uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Track:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                playClick();
                setSelectedCategory(cat);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`text-xs px-3 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#203F9A] text-white shadow-2xs'
                  : 'bg-[#FAF2EA] text-[#444652] hover:bg-[#EEE7DF]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {filteredCards.length > 1 && (
            <button
              onClick={handleShuffle}
              className="text-xs px-2.5 py-1 rounded-lg border border-[#4E7CB2]/20 hover:bg-[#FAF2EA] text-[#444652] font-semibold flex items-center gap-1 cursor-pointer"
              title="Shuffle Deck Order"
            >
              <Shuffle className="w-3 h-3 text-[#4E7CB2]" />
              <span>Shuffle</span>
            </button>
          )}
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#FAF2EA] text-[#203F9A] border border-[#4E7CB2]/20">
            Reviewed: {reviewedCount}
          </span>
        </div>
      </div>

      {/* 3D Flashcard Stage */}
      {currentCard && (
        <div className="relative pt-2">
          <div className="flex justify-between items-center text-xs font-bold text-[#757683] mb-2 px-2">
            <span>Card {currentIndex + 1} of {filteredCards.length}</span>
            <div className="flex items-center gap-3">
              {onDeleteCard && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this flashcard?')) {
                      onDeleteCard(currentCard.id);
                      if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
                    }
                  }}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  title="Delete flashcard"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
              <span className="text-[#203F9A]">Click card to flip</span>
            </div>
          </div>

          <div
            onClick={() => {
              playClick();
              setIsFlipped(!isFlipped);
            }}
            className="w-full min-h-[340px] bg-white rounded-3xl p-8 border border-[#4E7CB2]/25 shadow-lg shadow-[#203F9A]/5 cursor-pointer relative flex flex-col justify-between select-none hover:border-[#203F9A]/40 transition-all group"
          >
            {/* Top tab corner */}
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FAF2EA] text-[#203F9A] border border-[#4E7CB2]/20">
                {currentCard.category}
              </span>
              <span className="text-xs font-semibold text-[#757683] flex items-center gap-1">
                <RotateCcw className="w-3 h-3 text-[#4E7CB2] group-hover:rotate-180 transition-transform duration-500" />
                {isFlipped ? 'Answer View' : 'Question View'}
              </span>
            </div>

            {/* Content */}
            <div className="py-8 text-center px-4">
              {!isFlipped ? (
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#4E7CB2]">
                    Concept Prompt
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-[#1E1B17] leading-snug">
                    {currentCard.question}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Mastery Blueprint
                  </div>
                  <div className="text-base md:text-lg font-medium text-[#1E1B17] whitespace-pre-line leading-relaxed text-left max-w-2xl mx-auto bg-[#FAF2EA]/50 p-5 rounded-2xl border border-[#4E7CB2]/15">
                    {currentCard.answer}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom cue */}
            <div className="flex items-center justify-between text-xs text-[#757683] pt-4 border-t border-[#4E7CB2]/10">
              <span>Interval: {currentCard.intervalDays} days</span>
              <span className="text-[#203F9A] font-semibold">Tap to flip ↷</span>
            </div>
          </div>

          {/* Rating Buttons (Visible when flipped) */}
          {isFlipped ? (
            <div className="grid grid-cols-4 gap-3 mt-5">
              <button
                onClick={() => handleRating(0.5)}
                className="p-3 rounded-2xl bg-[#FFF0F7] border border-[#E7A0CC] text-[#E84797] font-bold text-xs hover:bg-[#FFE0EF] transition-all cursor-pointer"
              >
                <div>Again</div>
                <div className="text-[10px] font-normal text-[#757683] mt-0.5">&lt; 10 min</div>
              </button>
              <button
                onClick={() => handleRating(1)}
                className="p-3 rounded-2xl bg-[#FAF2EA] border border-[#4E7CB2]/20 text-[#444652] font-bold text-xs hover:bg-[#EEE7DF] transition-all cursor-pointer"
              >
                <div>Hard</div>
                <div className="text-[10px] font-normal text-[#757683] mt-0.5">1 day</div>
              </button>
              <button
                onClick={() => handleRating(1.5)}
                className="p-3 rounded-2xl bg-[#EBF5FB] border border-[#94C2DA] text-[#203F9A] font-bold text-xs hover:bg-[#D5EBF8] transition-all cursor-pointer"
              >
                <div>Good</div>
                <div className="text-[10px] font-normal text-[#757683] mt-0.5">3 days</div>
              </button>
              <button
                onClick={() => handleRating(2)}
                className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-all cursor-pointer"
              >
                <div>Easy</div>
                <div className="text-[10px] font-normal text-emerald-600 mt-0.5">7 days</div>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4 mt-5">
              <button
                onClick={() => {
                  playClick();
                  setCurrentIndex((prev) => (prev > 0 ? prev - 1 : filteredCards.length - 1));
                  setIsFlipped(false);
                }}
                className="px-4 py-2 rounded-xl bg-white border border-[#4E7CB2]/20 text-xs font-bold text-[#444652] flex items-center gap-1.5 cursor-pointer hover:bg-[#FAF2EA]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous Card
              </button>
              <button
                onClick={() => {
                  playClick();
                  setCurrentIndex((prev) => (prev < filteredCards.length - 1 ? prev + 1 : 0));
                  setIsFlipped(false);
                }}
                className="px-4 py-2 rounded-xl bg-white border border-[#4E7CB2]/20 text-xs font-bold text-[#203F9A] flex items-center gap-1.5 cursor-pointer hover:bg-[#FAF2EA]"
              >
                Next Card
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State when no cards in filtered selection */}
      {filteredCards.length === 0 && (
        <div className="paper-card rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF2EA] text-[#203F9A] flex items-center justify-center mx-auto border border-[#4E7CB2]/20">
            <Layers className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#1E1B17]">No flashcards found</h3>
            <p className="text-xs text-[#4E7CB2] max-w-md mx-auto">
              Generate 5 smart flashcards with Atlas AI, or create your first revision card manually.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setAiTopic(currentSubject);
                setAiModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#203F9A] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate with AI</span>
            </button>
            <button
              onClick={() => setNewCardOpen(true)}
              className="tactile-btn-secondary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Manually</span>
            </button>
          </div>
        </div>
      )}

      {/* AI Generate Flashcards Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#203F9A]/30 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-[#4E7CB2]/30 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#EBF5FB] text-[#203F9A] border border-[#94C2DA]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1E1B17]">Generate Flashcards with Atlas</h3>
                <p className="text-xs text-[#757683]">AI builds 5 exam-grade flashcards instantly</p>
              </div>
            </div>

            <form onSubmit={handleGenerateWithAi} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#444652]">Study Topic or Exam Chapter</label>
                <input
                  type="text"
                  required
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. TCP Handshake & SYN Floods, BGP Routing, Binary Search Trees"
                  className="w-full text-xs p-2.5 rounded-lg border border-[#4E7CB2]/20 bg-[#FAF2EA]/40 mt-1 focus:outline-[#203F9A]"
                />
              </div>

              {aiSuccessMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{aiSuccessMsg}</span>
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
                      <span>Generating Deck...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate 5 Flashcards (+30 XP)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual New Card Modal */}
      {newCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#203F9A]/30 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-[#4E7CB2]/30 shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-[#1E1B17]">Add New Tactile Flashcard</h3>
            <form onSubmit={handleSaveCard} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#444652]">Category / Subject</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#4E7CB2]/20 bg-[#FAF2EA]/40 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#444652]">Prompt / Question</label>
                <textarea
                  rows={2}
                  required
                  value={newQ}
                  onChange={(e) => setNewQ(e.target.value)}
                  placeholder="e.g. What is the role of SYN-ACK?"
                  className="w-full text-xs p-2.5 rounded-lg border border-[#4E7CB2]/20 bg-[#FAF2EA]/40 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#444652]">Answer / Explanation</label>
                <textarea
                  rows={3}
                  required
                  value={newA}
                  onChange={(e) => setNewA(e.target.value)}
                  placeholder="e.g. Synchronizes server sequence number and confirms client's ISN..."
                  className="w-full text-xs p-2.5 rounded-lg border border-[#4E7CB2]/20 bg-[#FAF2EA]/40 mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewCardOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#757683] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tactile-btn-primary px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Save Card (+15 XP)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
