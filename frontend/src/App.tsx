import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DeskDock } from './components/DeskDock';
import { DashboardView } from './components/DashboardView';
import { AiTutorView } from './components/AiTutorView';
import { NotesView } from './components/NotesView';
import { FlashcardsView } from './components/FlashcardsView';
import { QuizView } from './components/QuizView';
import { FocusModeView } from './components/FocusModeView';
import { TactileMemoryCanvasModal } from './components/TactileMemoryCanvasModal';
import { SettingsModal } from './components/SettingsModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { 
  INITIAL_USER, 
  INITIAL_FLASHCARDS, 
  INITIAL_NOTES 
} from './data/mockData';
import { NavigationTab, Flashcard, NoteItem, UserProfile } from './types';
import { 
  loadStoredUser, 
  saveStoredUser, 
  loadStoredFlashcards, 
  saveStoredFlashcards, 
  loadStoredNotes, 
  saveStoredNotes,
  loadStoredSettings,
  saveStoredSettings,
  DeskSettings
} from './utils/storage';
import { playClick, playChime } from './utils/audio';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  
  // Persistent State initialization
  const [user, setUser] = useState<UserProfile>(() => loadStoredUser());
  const [flashcards, setFlashcards] = useState<Flashcard[]>(() => loadStoredFlashcards());
  const [notes, setNotes] = useState<NoteItem[]>(() => loadStoredNotes());
  const [settings, setSettings] = useState<DeskSettings>(() => loadStoredSettings());

  const [currentSubject, setCurrentSubject] = useState(
    settings.activeSubject || 'Computer Networks: Transport Layer Protocol Suite'
  );
  const [dotGridEnabled, setDotGridEnabled] = useState(settings.dotGridEnabled);
  const [activeMarker, setActiveMarker] = useState(settings.activeMarker);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);

  // Modals & Navigation
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Auto-persist changes
  useEffect(() => {
    saveStoredUser(user);
  }, [user]);

  useEffect(() => {
    saveStoredFlashcards(flashcards);
  }, [flashcards]);

  useEffect(() => {
    saveStoredNotes(notes);
  }, [notes]);

  useEffect(() => {
    saveStoredSettings({
      dotGridEnabled,
      activeMarker,
      soundEnabled,
      activeSubject: currentSubject,
    });
  }, [dotGridEnabled, activeMarker, soundEnabled, currentSubject]);

  const handleAddXp = (amount: number) => {
    if (soundEnabled) playChime('medium');
    setUser((prev) => ({
      ...prev,
      totalXp: prev.totalXp + amount,
    }));
  };

  const handleAddMinutes = (minutes: number) => {
    setUser((prev) => ({
      ...prev,
      dailySpentMinutes: Math.min(prev.dailyGoalMinutes, prev.dailySpentMinutes + minutes),
    }));
  };

  const handleUpdateGoal = (mins: number) => {
    setUser((prev) => ({
      ...prev,
      dailyGoalMinutes: mins,
    }));
  };

  const handleUpdateProfile = (name: string, grade: string) => {
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0].toUpperCase())
      .slice(0, 2)
      .join('') || 'SC';

    setUser((prev) => ({
      ...prev,
      name,
      grade,
      avatarInitials: initials,
    }));
  };

  const handleResetProgress = () => {
    setUser(INITIAL_USER);
    setFlashcards(INITIAL_FLASHCARDS);
    setNotes(INITIAL_NOTES);
  };

  const handleImportData = (imported: { user: UserProfile; flashcards: Flashcard[]; notes: NoteItem[] }) => {
    setUser(imported.user);
    setFlashcards(imported.flashcards);
    setNotes(imported.notes);
  };

  const handleAddNote = (
    title: string,
    content: string,
    color: 'pink' | 'cream' | 'sky' | 'denim' = 'sky'
  ) => {
    if (soundEnabled) playClick();
    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      title,
      content,
      color,
      timestamp: 'Just now',
      tags: ['TCP', 'DeskMemo'],
    };
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleDeleteNote = (id: string) => {
    if (soundEnabled) playClick();
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAddFlashcard = (
    question: string,
    answer: string,
    category: string = 'Transport Layer'
  ) => {
    if (soundEnabled) playClick();
    const newCard: Flashcard = {
      id: `fc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      category,
      question,
      answer,
      colorTheme: 'sky',
      intervalDays: 1,
    };
    setFlashcards((prev) => [newCard, ...prev]);
  };

  const handleDeleteFlashcard = (id: string) => {
    if (soundEnabled) playClick();
    setFlashcards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleExportNotes = () => {
    if (soundEnabled) playClick();
    const textData = notes
      .map(
        (n) =>
          `# ${n.title} (${n.timestamp})\nTags: ${n.tags.join(', ')}\n\n${n.content}\n`
      )
      .join('\n---\n\n');

    const blob = new Blob([textData], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Atlas_Study_Notes_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`min-h-screen flex bg-[#FFF8F1] text-[#1E1B17] ${
        dotGridEnabled ? 'desk-dot-grid' : ''
      }`}
    >
      {/* Offline Status Pill */}
      <OfflineIndicator />

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        user={user}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main App Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <TopHeader
          user={user}
          currentSubject={currentSubject}
          onSelectSubject={setCurrentSubject}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleMobileMenu={() => setIsMobileNavOpen(!isMobileNavOpen)}
        />

        {/* Content Body */}
        <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 md:py-8 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              user={user}
              currentSubject={currentSubject}
              flashcards={flashcards}
              notes={notes}
              onNavigate={setCurrentTab}
              onOpenCanvas={() => setIsCanvasOpen(true)}
            />
          )}

          {currentTab === 'ai-tutor' && (
            <AiTutorView
              user={user}
              currentSubject={currentSubject}
              onNavigate={setCurrentTab}
              onAddXp={handleAddXp}
              onAddNote={handleAddNote}
              onAddFlashcard={handleAddFlashcard}
            />
          )}

          {currentTab === 'cascading-notes' && (
            <NotesView
              notes={notes}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
            />
          )}

          {currentTab === 'flashcards' && (
            <FlashcardsView
              cards={flashcards}
              onAddXp={handleAddXp}
              onAddCard={handleAddFlashcard}
              onDeleteCard={handleDeleteFlashcard}
              currentSubject={currentSubject}
            />
          )}

          {currentTab === 'quizzes' && (
            <QuizView
              onAddXp={handleAddXp}
              currentSubject={currentSubject}
            />
          )}

          {currentTab === 'focus-mode' && (
            <FocusModeView
              onAddMinutes={handleAddMinutes}
              onAddXp={handleAddXp}
            />
          )}
        </main>
      </div>

      {/* Floating Bottom Desk Dock */}
      <DeskDock
        dotGridEnabled={dotGridEnabled}
        onToggleDotGrid={() => {
          if (soundEnabled) playClick();
          setDotGridEnabled(!dotGridEnabled);
        }}
        activeMarker={activeMarker}
        onSelectMarker={(color) => {
          if (soundEnabled) playClick();
          setActiveMarker(color);
        }}
        onExportNotes={handleExportNotes}
      />

      {/* Interactive Handshake Canvas & Diagram Scratchpad Modal */}
      <TactileMemoryCanvasModal
        isOpen={isCanvasOpen}
        onClose={() => {
          if (soundEnabled) playClick();
          setIsCanvasOpen(false);
        }}
        activeMarkerColor={activeMarker}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onUpdateGoal={handleUpdateGoal}
        onUpdateProfile={handleUpdateProfile}
        onResetProgress={handleResetProgress}
        dotGridEnabled={dotGridEnabled}
        onToggleDotGrid={() => setDotGridEnabled(!dotGridEnabled)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        flashcards={flashcards}
        notes={notes}
        onImportData={handleImportData}
      />
    </div>
  );
}
