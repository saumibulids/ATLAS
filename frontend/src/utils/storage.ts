import { UserProfile, Flashcard, NoteItem, QuizQuestion } from '../types';
import { INITIAL_USER, INITIAL_FLASHCARDS, INITIAL_NOTES, QuizTrack, QUIZ_TRACKS } from '../data/mockData';

export interface QuizAttemptRecord {
  id: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timestamp: string;
  xpEarned: number;
}

export interface DeskSettings {
  dotGridEnabled: boolean;
  activeMarker: string;
  soundEnabled: boolean;
  activeSubject: string;
}

const STORAGE_KEYS = {
  USER: 'atlas_user_profile_v1',
  FLASHCARDS: 'atlas_flashcards_v1',
  NOTES: 'atlas_notes_v1',
  QUIZ_HISTORY: 'atlas_quiz_history_v1',
  SETTINGS: 'atlas_desk_settings_v1',
  SUBJECTS: 'atlas_subjects_v1',
  QUIZ_TRACKS: 'atlas_quiz_tracks_v1',
};

export const loadStoredQuizTracks = (): QuizTrack[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUIZ_TRACKS);
    if (!raw) return QUIZ_TRACKS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : QUIZ_TRACKS;
  } catch {
    return QUIZ_TRACKS;
  }
};

export const saveStoredQuizTracks = (tracks: QuizTrack[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.QUIZ_TRACKS, JSON.stringify(tracks));
  } catch (err) {
    console.warn('Failed to save quiz tracks', err);
  }
};

export const loadStoredSubjects = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    if (!raw) return ['Computer Networks: Transport Layer Protocol Suite', 'AP Computer Science A: Algorithms & Data Structures', 'AP Physics C: Electricity, Magnetism & Circuits', 'AP Calculus BC: Series & Taylor Approximations'];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['Computer Networks: Transport Layer Protocol Suite', 'AP Computer Science A: Algorithms & Data Structures', 'AP Physics C: Electricity, Magnetism & Circuits', 'AP Calculus BC: Series & Taylor Approximations'];
  } catch (err) {
    return ['Computer Networks: Transport Layer Protocol Suite', 'AP Computer Science A: Algorithms & Data Structures', 'AP Physics C: Electricity, Magnetism & Circuits', 'AP Calculus BC: Series & Taylor Approximations'];
  }
};

export const saveStoredSubjects = (subjects: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  } catch (err) {
    console.warn('Failed to persist subjects', err);
  }
};

export const loadStoredUser = (): UserProfile => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return INITIAL_USER;
    const parsed = JSON.parse(raw);
    return { ...INITIAL_USER, ...parsed };
  } catch (err) {
    console.warn('Failed to load user profile from storage', err);
    return INITIAL_USER;
  }
};

export const saveStoredUser = (user: UserProfile) => {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (err) {
    console.warn('Failed to persist user profile', err);
  }
};

export const loadStoredFlashcards = (): Flashcard[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FLASHCARDS);
    if (!raw) return INITIAL_FLASHCARDS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_FLASHCARDS;
  } catch (err) {
    console.warn('Failed to load flashcards', err);
    return INITIAL_FLASHCARDS;
  }
};

export const saveStoredFlashcards = (cards: Flashcard[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.FLASHCARDS, JSON.stringify(cards));
  } catch (err) {
    console.warn('Failed to persist flashcards', err);
  }
};

export const loadStoredNotes = (): NoteItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTES);
    if (!raw) return INITIAL_NOTES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_NOTES;
  } catch (err) {
    console.warn('Failed to load notes', err);
    return INITIAL_NOTES;
  }
};

export const saveStoredNotes = (notes: NoteItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  } catch (err) {
    console.warn('Failed to persist notes', err);
  }
};

export const loadStoredQuizHistory = (): QuizAttemptRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUIZ_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load quiz history', err);
    return [];
  }
};

export const saveStoredQuizHistory = (history: QuizAttemptRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.QUIZ_HISTORY, JSON.stringify(history));
  } catch (err) {
    console.warn('Failed to persist quiz history', err);
  }
};

export const loadStoredSettings = (): DeskSettings => {
  const defaults: DeskSettings = {
    dotGridEnabled: true,
    activeMarker: '#203F9A',
    soundEnabled: true,
    activeSubject: 'Computer Networks: Transport Layer Protocol Suite',
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch (err) {
    return defaults;
  }
};

export const saveStoredSettings = (settings: DeskSettings) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to persist settings', err);
  }
};

export const resetAllStudioData = () => {
  try {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn('Failed to clear storage', err);
  }
};
