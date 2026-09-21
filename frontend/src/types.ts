export type NavigationTab = 
  | 'dashboard'
  | 'ai-tutor'
  | 'cascading-notes'
  | 'flashcards'
  | 'quizzes'
  | 'focus-mode';

export interface UserProfile {
  name: string;
  role: string;
  grade: string;
  avatarInitials: string;
  streakDays: number;
  totalXp: number;
  dailyGoalMinutes: number;
  dailySpentMinutes: number;
  retentionIndex: number;
}

export interface Flashcard {
  id: string;
  category: string;
  question: string;
  answer: string;
  colorTheme: 'sky' | 'rose' | 'cream' | 'navy';
  lastReviewed?: string;
  intervalDays: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  xpReward: number;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  color: 'pink' | 'cream' | 'sky' | 'denim';
  timestamp: string;
  tags: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'tutor';
  senderName: string;
  timestamp: string;
  badge?: string;
  content?: string;
  analogyTitle?: string;
  analogySubtitle?: string;
  analogyStory?: string;
  keyConcepts?: { number: string; title: string; desc: string }[];
  proTip?: string;
  showTimeline?: boolean;
  actionChips?: string[];
}
