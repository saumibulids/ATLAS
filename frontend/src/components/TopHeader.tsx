import React, { useState } from 'react';
import { 
  ChevronDown, 
  Flame, 
  Zap, 
  Clock, 
  SlidersHorizontal,
  Check,
  Menu,
  X,
  User
} from 'lucide-react';
import { UserProfile } from '../types';
import { SUBJECTS } from '../data/mockData';
import { PWAInstallButton } from './PWAInstallButton';
import { playClick } from '../utils/audio';
import { Plus } from 'lucide-react';
import type { BackendConnection } from '../services/api';
import type { GamificationProfileRead } from '../services/apiTypes';

interface TopHeaderProps {
  user: UserProfile;
  currentSubject: string;
  subjects?: string[];
  backendStatus?: BackendConnection;
  gamification?: GamificationProfileRead | null;
  onSelectSubject: (subject: string) => void;
  onAddSubject?: (subject: string) => void;
  onOpenSettings: () => void;
  onToggleMobileMenu?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  user,
  currentSubject,
  subjects = [
    'Computer Networks: Transport Layer Protocol Suite',
    'AP Computer Science A: Algorithms & Data Structures',
    'AP Physics C: Electricity, Magnetism & Circuits',
    'AP Calculus BC: Series & Taylor Approximations',
  ],
  backendStatus = 'checking',
  gamification = null,
  onSelectSubject,
  onAddSubject,
  onOpenSettings,
  onToggleMobileMenu,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleAddNewSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubjectInput.trim();
    if (!trimmed) return;
    if (onAddSubject) {
      onAddSubject(trimmed);
    }
    onSelectSubject(trimmed);
    setNewSubjectInput('');
    setIsAddingNew(false);
    setDropdownOpen(false);
  };

  return (
    <header className="h-16 px-4 md:px-8 border-b border-[#4E7CB2]/15 bg-[#FFF8F1]/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
      {/* Mobile Hamburger & Current Subject Selector */}
      <div className="flex items-center gap-2 md:gap-3 relative min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={() => {
              playClick();
              onToggleMobileMenu();
            }}
            className="md:hidden p-2 rounded-xl text-[#203F9A] hover:bg-[#FAF2EA] transition-colors cursor-pointer"
            title="Toggle Navigation Menu"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <span className="hidden lg:inline text-xs font-bold tracking-wider text-[#757683] uppercase whitespace-nowrap">
          CURRICULUM
        </span>
        <span className="hidden lg:inline text-[#4E7CB2]/40 font-semibold">/</span>

        <div className="relative min-w-0">
          <button
            id="subject-dropdown-trigger"
            onClick={() => {
              playClick();
              setDropdownOpen(!dropdownOpen);
            }}
            className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 rounded-lg bg-white/80 hover:bg-white text-xs md:text-sm font-semibold text-[#1E1B17] border border-[#4E7CB2]/20 shadow-2xs transition-all truncate max-w-[220px] sm:max-w-[320px] md:max-w-[420px] cursor-pointer"
          >
            <span className="truncate">{currentSubject}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#4E7CB2] flex-shrink-0" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[#4E7CB2]/20 py-2 z-50 max-h-96 overflow-y-auto">
              <div className="px-3.5 py-1.5 text-[11px] font-bold text-[#4E7CB2] uppercase tracking-wider flex items-center justify-between">
                <span>Select Active Curriculum Track</span>
                <span className="text-[10px] text-[#757683]">{subjects.length} Tracks</span>
              </div>
              <div className="space-y-0.5">
                {subjects.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => {
                      playClick();
                      onSelectSubject(sub);
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-[#FAF2EA] flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className={sub === currentSubject ? 'font-bold text-[#203F9A]' : 'text-[#1E1B17]'}>
                      {sub}
                    </span>
                    {sub === currentSubject && (
                      <Check className="w-3.5 h-3.5 text-[#203F9A] flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Add Custom Subject */}
              <div className="mt-2 pt-2 border-t border-[#4E7CB2]/15 px-3">
                {isAddingNew ? (
                  <form onSubmit={handleAddNewSubject} className="space-y-2">
                    <input
                      type="text"
                      autoFocus
                      value={newSubjectInput}
                      onChange={(e) => setNewSubjectInput(e.target.value)}
                      placeholder="e.g. AP Chemistry: Molecular Orbitals"
                      className="w-full text-xs p-2 rounded-lg border border-[#4E7CB2]/30 bg-[#FAF2EA]/40 focus:outline-[#203F9A]"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsAddingNew(false)}
                        className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="tactile-btn-primary text-xs font-bold px-3 py-1 rounded-lg cursor-pointer"
                      >
                        Add Track
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingNew(true)}
                    className="w-full py-1.5 px-2 text-xs font-semibold text-[#203F9A] hover:bg-[#FAF2EA] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Custom Curriculum Track</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats, PWA Install & User Quick Profile */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {/* PWA Install Button in Header */}
        <div className="hidden sm:block">
          <PWAInstallButton variant="compact" />
        </div>

        {/* Backend Connectivity */}
        <div
          title={
            backendStatus === 'online'
              ? 'Connected to the ATLAS backend'
              : backendStatus === 'offline'
                ? 'ATLAS backend unreachable — start it with: uvicorn app.main:app --reload'
                : 'Checking ATLAS backend connection…'
          }
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold shadow-2xs ${
            backendStatus === 'online'
              ? 'bg-[#EAF7EF] border-[#16A34A]/40 text-[#14532D]'
              : backendStatus === 'offline'
                ? 'bg-[#FDF1F0] border-[#DC2626]/40 text-[#7F1D1D]'
                : 'bg-white/80 border-[#4E7CB2]/25 text-[#757683]'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              backendStatus === 'online'
                ? 'bg-emerald-500'
                : backendStatus === 'offline'
                  ? 'bg-red-500'
                  : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span>
            {backendStatus === 'online'
              ? `Backend online${gamification ? ` · Lv ${gamification.level}` : ''}`
              : backendStatus === 'offline'
                ? 'Backend offline'
                : 'Connecting…'}
          </span>
        </div>

        {/* Streak */}
        <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/80 border border-[#E7A0CC]/50 text-xs font-bold text-[#1E1B17] shadow-2xs">
          <Flame className="w-3.5 h-3.5 text-[#E84797] fill-[#E84797]" />
          <span>{user.streakDays}d</span>
        </div>

        {/* XP */}
        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/80 border border-[#94C2DA]/60 text-xs font-bold text-[#1E1B17] shadow-2xs">
          <Zap className="w-3.5 h-3.5 text-[#203F9A] fill-[#203F9A]" />
          <span>{user.totalXp.toLocaleString()} XP</span>
        </div>

        {/* Daily Goal */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-[#4E7CB2]/20 text-xs font-bold text-[#1E1B17] shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-[#356479]" />
          <span>
            {user.dailySpentMinutes}/{user.dailyGoalMinutes}m
          </span>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-[#4E7CB2]/20 mx-0.5" />

        {/* User Pill */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-[#FAF2EA] border border-[#203F9A]/30 flex items-center justify-center text-xs font-bold text-[#203F9A]">
              {user.avatarInitials || <User className="w-4 h-4 text-[#203F9A]" />}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          
          <button
            onClick={() => {
              playClick();
              onOpenSettings();
            }}
            className="p-1.5 text-[#4E7CB2] hover:text-[#203F9A] hover:bg-white rounded-lg transition-colors cursor-pointer"
            title="Studio Preferences"
            aria-label="Preferences"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
