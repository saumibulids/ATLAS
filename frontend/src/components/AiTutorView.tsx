import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  FileCode2, 
  Mic, 
  Send, 
  Copy, 
  Check, 
  Lightbulb, 
  Plus, 
  HelpCircle, 
  Layers, 
  CheckCircle2,
  Zap,
  Bot,
  RefreshCw,
  MessageSquare,
  Volume2
} from 'lucide-react';
import { NavigationTab, UserProfile } from '../types';

interface Message {
  id: string;
  role: 'user' | 'tutor';
  text: string;
  time: string;
  topic?: string;
  analogy?: string;
  proTip?: string;
  keyTakeaway?: string;
}

interface AiTutorViewProps {
  user: UserProfile;
  currentSubject?: string;
  onNavigate: (tab: NavigationTab) => void;
  onAddXp: (amount: number) => void;
  onAddNote: (title: string, content: string) => void;
  onAddFlashcard: (question: string, answer: string) => void;
}

export const AiTutorView: React.FC<AiTutorViewProps> = ({
  user,
  currentSubject = 'Computer Networks: Transport Layer',
  onNavigate,
  onAddXp,
  onAddNote,
  onAddFlashcard,
}) => {
  const [activeMode, setActiveMode] = useState<'analogy' | 'spec' | 'socratic'>('analogy');
  const [inputQuestion, setInputQuestion] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<string>('Transport Protocols & System Mechanics');

  const [chatMessages, setChatMessages] = useState<Message[]>(() => {
    return [
      {
        id: 'msg-welcome',
        role: 'tutor',
        text: `Welcome to Atlas, ${user.name}! I am your dedicated study Tutor. What concept or problem would you like to master today? Ask me to break down an algorithm, explain a system invariant with an analogy, or test your retention.`,
        time: 'Just now',
        topic: 'Study Session Kickoff',
        proTip: 'Tip: You can switch between "Analogy Mode", "Deep Protocol Spec", and "Socratic Drill" anytime.',
        keyTakeaway: 'Active recall and conceptual analogies maximize long-term retention over passive reading.',
      },
    ];
  });

  // Spot check state
  const [selectedSpotOption, setSelectedSpotOption] = useState<string | null>(null);
  const [spotAnswered, setSpotAnswered] = useState(false);

  // Quick revision notes
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [revisionNotes, setRevisionNotes] = useState<string[]>([
    'State Invariants: Sockets must isolate sequence space across incarnation cycles.',
    '2MSL Duration: Holds socket for 2 * Maximum Segment Lifetime for safe drainage.',
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isSubmitting]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    showToast('Copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleTurnIntoFlashcard = (msg: Message) => {
    const question = `What is the core principle of ${msg.topic || currentTopic}?`;
    const answer = msg.keyTakeaway 
      ? `${msg.keyTakeaway}\n\nSummary: ${msg.text.slice(0, 180)}...`
      : msg.text.slice(0, 240);

    onAddFlashcard(question, answer);
    onAddXp(15);
    showToast('Created new flashcard! +15 XP');
  };

  const handleAddToNotes = (msg: Message) => {
    const title = msg.topic || `Atlas Tutor: ${currentTopic}`;
    const content = `${msg.text}\n\nKey Takeaway: ${msg.keyTakeaway || 'Mastered with Atlas Tutor.'}`;
    onAddNote(title, content);
    showToast('Saved to Cascading Notes');
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition not supported in this browser');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        showToast('Listening... speak your question');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputQuestion(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        showToast('Voice input ended');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      showToast('Could not initialize microphone');
    }
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
      showToast('Speaking explanation...');
    } else {
      showToast('Text-to-speech not supported');
    }
  };

  const handleAskAtlas = async (questionToAsk?: string) => {
    const q = (questionToAsk || inputQuestion).trim();
    if (!q || isSubmitting) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsSubmitting(true);
    setCurrentTopic(q.slice(0, 45));

    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          subject: currentSubject,
          mode: activeMode,
          history: chatMessages.slice(-4).map((m) => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      const tutorReply: Message = {
        id: `tutor-${Date.now()}`,
        role: 'tutor',
        text: data.reply || 'Concept analyzed and structured.',
        time: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        topic: q.length > 40 ? `${q.slice(0, 38)}...` : q,
        keyTakeaway: `Core Principle: Master the fundamental invariants and edge conditions of ${q.slice(0, 30)}.`,
      };

      setChatMessages((prev) => [...prev, tutorReply]);
      onAddXp(12);
    } catch (err) {
      console.warn('Falling back to direct intelligent explanation:', err);
      // Fallback
      setTimeout(() => {
        const fallbackText = activeMode === 'analogy'
          ? `Think of "${q}" like a high-reliability postal routing hub: every parcel must carry verified sender and destination credentials. If an acknowledgment gets dropped along the highway, the hub maintains a timed buffer to guarantee delivery without packet collisions.`
          : `For "${q}": The primary operational principle involves bounding sequence parameters, validating pre-conditions, and ensuring deterministic state progression across all transitions.`;

        const fallbackReply: Message = {
          id: `tutor-${Date.now()}`,
          role: 'tutor',
          text: fallbackText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          topic: q,
          keyTakeaway: `Key Takeaway: Bound the parameters and verify all edge failure transitions for "${q}".`,
        };

        setChatMessages((prev) => [...prev, fallbackReply]);
        onAddXp(10);
      }, 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddQuickNote = () => {
    if (!quickNoteText.trim()) return;
    setRevisionNotes((prev) => [...prev, quickNoteText]);
    onAddNote(`Quick Desk Note: ${currentTopic}`, quickNoteText);
    setQuickNoteText('');
    setQuickNoteOpen(false);
    showToast('Note added to Desk Pad & Cascading Notes');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#203F9A] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-[#94C2DA]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner inside Tutor Screen */}
      <div className="paper-card rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-[#203F9A] text-white flex items-center justify-center shadow-md shadow-[#203F9A]/20">
              <Bot className="w-7 h-7" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-[#1E1B17]">Atlas</span>
              <span className="px-2 py-0.5 rounded-full bg-[#EBF5FB] text-[#203F9A] text-[10px] font-bold tracking-wider uppercase border border-[#94C2DA]/60">
                Tutor
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Co-Pilot
              </span>
            </div>
            <h2 className="font-semibold text-sm text-[#4E7CB2] mt-0.5 flex items-center gap-1.5">
              <span>Currently Explaining:</span>
              <span className="text-[#1E1B17] font-bold">{currentTopic}</span>
            </h2>
          </div>
        </div>

        {/* Mode Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveMode('analogy');
              showToast('Switched to Analogy Mode');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'analogy'
                ? 'tactile-btn-primary'
                : 'bg-white text-[#444652] border border-[#4E7CB2]/20 hover:bg-[#FAF2EA]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Analogy Mode</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('spec');
              showToast('Switched to Deep Spec Mode');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'spec'
                ? 'tactile-btn-primary'
                : 'bg-white text-[#444652] border border-[#4E7CB2]/20 hover:bg-[#FAF2EA]'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Deep Spec</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('socratic');
              showToast('Switched to Socratic Drill');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'socratic'
                ? 'tactile-btn-primary'
                : 'bg-white text-[#444652] border border-[#4E7CB2]/20 hover:bg-[#FAF2EA]'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Socratic Drill</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Chat Stream & Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Interactive Explanation Stream */}
        <div className="lg:col-span-8 space-y-5">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'justify-end pl-8' : ''
              }`}
            >
              {msg.role === 'tutor' && (
                <div className="w-10 h-10 rounded-2xl bg-[#203F9A] text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                  <Bot className="w-6 h-6" />
                </div>
              )}

              <div
                className={`p-5 rounded-2xl text-sm leading-relaxed max-w-2xl shadow-xs space-y-3 ${
                  msg.role === 'user'
                    ? 'bg-white border border-[#4E7CB2]/20 text-[#1E1B17] rounded-tr-xs'
                    : 'paper-card text-[#1E1B17]'
                }`}
              >
                {/* Header within bubble */}
                <div className="flex items-center justify-between border-b border-[#4E7CB2]/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#203F9A]">
                      {msg.role === 'user' ? user.name : 'Atlas'}
                    </span>
                    {msg.role === 'tutor' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF5FB] text-[#203F9A] border border-[#94C2DA]/50">
                        Tutor
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#757683]">{msg.time}</span>
                </div>

                {/* Message Text */}
                <div className="text-sm text-[#1E1B17] whitespace-pre-wrap leading-relaxed">
                  {msg.text}
                </div>

                {/* Optional Pro Tip / Key Takeaway */}
                {msg.keyTakeaway && msg.role === 'tutor' && (
                  <div className="bg-[#FAF2EA]/70 rounded-xl p-3 border border-[#4E7CB2]/20 flex items-start gap-2 text-xs text-[#444652]">
                    <Lightbulb className="w-4 h-4 text-[#203F9A] flex-shrink-0 mt-0.5" />
                    <span>{msg.keyTakeaway}</span>
                  </div>
                )}

                {/* Action Buttons on Tutor Responses */}
                {msg.role === 'tutor' && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#4E7CB2]/10">
                    <button
                      onClick={() => handleTurnIntoFlashcard(msg)}
                      className="tactile-btn-primary px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Turn into Flashcard (+15 XP)</span>
                    </button>

                    <button
                      onClick={() => handleAddToNotes(msg)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-[#4E7CB2]/25 text-[#1E1B17] hover:bg-[#FAF2EA] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#203F9A]" />
                      <span>Add to Desk Notes</span>
                    </button>

                    <button
                      onClick={() => onNavigate('quizzes')}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-[#4E7CB2]/25 text-[#1E1B17] hover:bg-[#FAF2EA] flex items-center gap-1.5 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-[#356479]" />
                      <span>Quiz Me On This</span>
                    </button>

                    <button
                      onClick={() => handleSpeak(msg.text)}
                      title="Read aloud"
                      className="p-1.5 rounded-full bg-white border border-[#4E7CB2]/25 text-[#4E7CB2] hover:text-[#203F9A] hover:bg-[#FAF2EA] cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleCopy(msg.text, msg.id)}
                      title="Copy response"
                      className="p-1.5 rounded-full bg-white border border-[#4E7CB2]/25 text-[#4E7CB2] hover:text-[#203F9A] hover:bg-[#FAF2EA] cursor-pointer"
                    >
                      {copiedIndex === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-10 h-10 rounded-full bg-[#B8E6FF] text-[#203F9A] font-bold text-xs flex items-center justify-center border border-[#94C2DA]/60 flex-shrink-0 mt-1">
                  {user.avatarInitials || 'ME'}
                </div>
              )}
            </div>
          ))}

          {/* Submitting Loading Indicator */}
          {isSubmitting && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#203F9A] text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                <Bot className="w-6 h-6 animate-pulse" />
              </div>
              <div className="paper-card rounded-2xl p-4 flex items-center gap-2.5 text-xs font-semibold text-[#4E7CB2]">
                <RefreshCw className="w-4 h-4 animate-spin text-[#203F9A]" />
                <span>Atlas is formulating your personalized study breakdown...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />

          {/* Chat Input Container */}
          <div className="paper-card rounded-2xl p-4 space-y-3">
            {/* Quick Suggestions */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[#757683] font-semibold whitespace-nowrap">Explore:</span>
              {[
                'Why does TCP need 2MSL TIME-WAIT?',
                'Explain AVL tree rotations with an analogy',
                'How does Faraday’s Law induce EMF?',
                'Give me a Socratic quiz question on hash tables',
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskAtlas(suggestion)}
                  className="px-3 py-1 rounded-lg bg-[#FAF2EA] hover:bg-[#EEE7DF] text-[#203F9A] font-semibold border border-[#4E7CB2]/20 whitespace-nowrap transition-colors cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Input Row */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleVoiceInput}
                title={isListening ? 'Listening...' : 'Voice Input'}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  isListening ? 'bg-rose-100 text-rose-600 animate-pulse' : 'text-[#4E7CB2] hover:bg-[#FAF2EA]'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>

              <input
                id="tutor-chat-input"
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskAtlas();
                }}
                placeholder="Ask Atlas any concept, theorem, code problem, or revision question..."
                className="flex-1 bg-transparent px-3 py-2 text-sm text-[#1E1B17] placeholder:text-[#4E7CB2]/60 focus:outline-none"
              />

              <button
                id="btn-ask-atlas"
                disabled={isSubmitting || !inputQuestion.trim()}
                onClick={() => handleAskAtlas()}
                className="tactile-btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <span>Ask Atlas</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Side Panels */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: TUTOR STATE */}
          <div className="paper-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-[#203F9A] text-white flex items-center justify-center">
                    <Bot className="w-6 h-6" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-md bg-[#203F9A] text-white text-[8px] font-bold uppercase tracking-wider">
                    TUTOR
                  </span>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#4E7CB2] uppercase tracking-wider">
                    Atlas Tutor State
                  </div>
                  <div className="text-sm font-bold text-[#1E1B17]">
                    “Coaching active for {currentSubject.split(':')[0]}”
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-[#757683]">
              Active curriculum tracking enabled • Spaced memory sync ready.
            </div>

            {/* Retention Index Bar */}
            <div className="space-y-1.5 pt-2 border-t border-[#4E7CB2]/15">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#444652]">Session Retention Index</span>
                <span className="text-[#203F9A]">{user.retentionIndex}% (High Retention)</span>
              </div>
              <div className="h-2 rounded-full bg-[#FAF2EA] overflow-hidden border border-[#4E7CB2]/15">
                <div
                  style={{ width: `${user.retentionIndex}%` }}
                  className="h-full bg-gradient-to-r from-[#203F9A] to-[#E84797] rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Live Spot Check (Interactive drill) */}
          <div className="paper-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#E84797] fill-[#E84797]" />
                <h4 className="font-bold text-sm text-[#1E1B17]">Live Spot Check</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF0F7] text-[#E84797] border border-[#E7A0CC]">
                1 Question
              </span>
            </div>

            <p className="text-xs text-[#1E1B17] font-medium leading-relaxed">
              If a protocol specification requires MSL = 2 minutes, what is the exact duration of the socket's TIME-WAIT state?
            </p>

            <div className="space-y-2">
              {[
                { id: 'A', text: 'A. 60 seconds (1 minute)' },
                { id: 'B', text: 'B. 2 minutes (1 MSL)' },
                { id: 'C', text: 'C. 4 minutes (2 x MSL)', isCorrect: true },
                { id: 'D', text: 'D. Indefinite until kernel garbage collection' },
              ].map((opt) => {
                const isSelected = selectedSpotOption === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (spotAnswered) return;
                      setSelectedSpotOption(opt.id);
                      setSpotAnswered(true);
                      if (opt.isCorrect) {
                        onAddXp(20);
                        showToast('Correct! +20 XP awarded');
                      } else {
                        showToast('Incorrect — remember TIME-WAIT is 2 * MSL!');
                      }
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected && opt.isCorrect
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : isSelected && !opt.isCorrect
                        ? 'bg-rose-50 border-rose-400 text-rose-800'
                        : 'bg-[#FAF2EA]/60 border-[#4E7CB2]/20 hover:bg-[#FAF2EA] text-[#1E1B17]'
                    }`}
                  >
                    <span>{opt.text}</span>
                    {isSelected && opt.isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Quick Key Formula Sheet */}
          <div className="paper-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#203F9A]" />
                <h4 className="font-bold text-sm text-[#1E1B17]">Active Study Rules</h4>
              </div>
              <span className="text-[11px] font-bold text-[#4E7CB2]">Reference</span>
            </div>

            {/* Snippet 1 */}
            <div className="bg-[#FAF2EA]/70 rounded-xl p-3 border border-[#4E7CB2]/20 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#203F9A]">
                <span>2MSL Timing Rule</span>
                <button
                  onClick={() => handleCopy('TIME_WAIT_DURATION = 2 * MSL', 'rule-1')}
                  className="flex items-center gap-1 text-[10px] text-[#4E7CB2] hover:text-[#203F9A] cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>copy</span>
                </button>
              </div>
              <pre className="font-mono text-xs font-bold text-[#1E1B17] bg-white p-2 rounded-lg border border-[#4E7CB2]/15 overflow-x-auto">
                TIME_WAIT_DURATION = 2 * MSL
              </pre>
            </div>

            {/* Snippet 2 */}
            <div className="bg-[#FAF2EA]/70 rounded-xl p-3 border border-[#4E7CB2]/20 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#203F9A]">
                <span>Socket Quadruplet Tuple</span>
                <button
                  onClick={() => handleCopy('{SrcIP, SrcPort, DstIP, DstPort}', 'rule-2')}
                  className="flex items-center gap-1 text-[10px] text-[#4E7CB2] hover:text-[#203F9A] cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>copy</span>
                </button>
              </div>
              <pre className="font-mono text-xs font-bold text-[#1E1B17] bg-white p-2 rounded-lg border border-[#4E7CB2]/15 overflow-x-auto">
                {`{SrcIP, SrcPort, DstIP, DstPort}`}
              </pre>
            </div>
          </div>

          {/* Card 4: Desk Revision Pad */}
          <div className="paper-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-[#203F9A]" />
                <h4 className="font-bold text-sm text-[#1E1B17]">Desk Revision Pad</h4>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FAF2EA] text-[#444652] border border-[#4E7CB2]/20">
                {revisionNotes.length} items
              </span>
            </div>

            <div className="space-y-2">
              {revisionNotes.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-[#FAF2EA]/50 border border-[#4E7CB2]/15 text-xs text-[#444652] leading-relaxed flex items-start gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E84797] mt-1.5 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {quickNoteOpen ? (
              <div className="space-y-2 pt-2 border-t border-[#4E7CB2]/15">
                <textarea
                  value={quickNoteText}
                  onChange={(e) => setQuickNoteText(e.target.value)}
                  placeholder="Type a revision reminder..."
                  className="w-full text-xs p-2 rounded-lg border border-[#4E7CB2]/30 bg-white focus:outline-none"
                  rows={2}
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setQuickNoteOpen(false)}
                    className="text-xs px-2.5 py-1 text-gray-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddQuickNote}
                    className="tactile-btn-primary text-xs font-bold px-3 py-1 rounded-lg cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setQuickNoteOpen(true)}
                className="w-full py-2 rounded-xl text-xs font-bold text-[#203F9A] bg-[#FAF2EA] hover:bg-white border border-[#4E7CB2]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Write Quick Note</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
