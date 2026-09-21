import React, { useRef } from 'react';
import { 
  X, 
  Sliders, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  BookOpen, 
  RotateCcw, 
  Download, 
  Upload, 
  Grid, 
  HardDrive 
} from 'lucide-react';
import { UserProfile, Flashcard, NoteItem } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { playClick, playChime } from '../utils/audio';
import { resetAllStudioData, loadStoredQuizHistory } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateGoal: (minutes: number) => void;
  onUpdateProfile?: (name: string, grade: string) => void;
  onResetProgress: () => void;
  dotGridEnabled: boolean;
  onToggleDotGrid: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  flashcards: Flashcard[];
  notes: NoteItem[];
  onImportData: (data: { user: UserProfile; flashcards: Flashcard[]; notes: NoteItem[] }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateGoal,
  onUpdateProfile,
  onResetProgress,
  dotGridEnabled,
  onToggleDotGrid,
  soundEnabled,
  onToggleSound,
  flashcards,
  notes,
  onImportData,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editingProfile, setEditingProfile] = React.useState(false);
  const [editName, setEditName] = React.useState(user.name);
  const [editGrade, setEditGrade] = React.useState(user.grade);

  React.useEffect(() => {
    setEditName(user.name);
    setEditGrade(user.grade);
  }, [user.name, user.grade]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateProfile && editName.trim()) {
      onUpdateProfile(editName.trim(), editGrade.trim() || 'High School');
      playChime('success');
    }
    setEditingProfile(false);
  };

  if (!isOpen) return null;

  const handleExportBackup = () => {
    playClick();
    const backup = {
      version: 1,
      appName: 'Atlas Study Studio',
      exportDate: new Date().toISOString(),
      user,
      flashcards,
      notes,
      quizHistory: loadStoredQuizHistory(),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Atlas_Studio_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.user && parsed.flashcards && parsed.notes) {
          onImportData({
            user: parsed.user,
            flashcards: parsed.flashcards,
            notes: parsed.notes,
          });
          playChime('success');
          alert('Studio data successfully restored from backup!');
        } else {
          alert('Invalid Atlas backup format.');
        }
      } catch (err) {
        alert('Could not parse JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#203F9A]/30 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-[#4E7CB2]/30 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#4E7CB2]/15 flex items-center justify-between bg-[#FAF2EA]/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#203F9A]" />
            <h3 className="font-bold text-base text-[#1E1B17]">Studio & Scholar Preferences</h3>
          </div>
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="p-1 text-gray-500 hover:text-gray-900 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Profile Overview & Editing */}
          {editingProfile ? (
            <form onSubmit={handleSaveProfile} className="p-4 bg-[#FAF2EA]/70 rounded-2xl border border-[#4E7CB2]/20 space-y-3">
              <div className="text-xs font-bold text-[#203F9A] uppercase tracking-wider">
                Edit Scholar Profile
              </div>
              <div>
                <label className="text-xs font-semibold text-[#444652]">Your Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-[#4E7CB2]/30 bg-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#444652]">Grade / Level</label>
                <input
                  type="text"
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-[#4E7CB2]/30 bg-white mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="text-xs px-3 py-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tactile-btn-primary text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between p-3.5 bg-[#FAF2EA]/60 rounded-2xl border border-[#4E7CB2]/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#B8E6FF] text-[#203F9A] font-bold text-base flex items-center justify-center border border-[#94C2DA]">
                  {user.avatarInitials}
                </div>
                <div>
                  <div className="font-bold text-sm text-[#1E1B17]">{user.name}</div>
                  <div className="text-xs text-[#4E7CB2]">
                    {user.grade} • {user.streakDays} Day Streak • {user.totalXp.toLocaleString()} XP
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEditingProfile(true)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-[#4E7CB2]/20 hover:bg-[#FAF2EA] text-[#203F9A] cursor-pointer"
              >
                Edit
              </button>
            </div>
          )}

          {/* Daily Study Goal */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1E1B17] flex items-center justify-between">
              <span>Daily Study Target</span>
              <span className="text-[#203F9A] font-bold">{user.dailyGoalMinutes} Minutes / Day</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[30, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    playClick();
                    onUpdateGoal(mins);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    user.dailyGoalMinutes === mins
                      ? 'bg-[#203F9A] text-white border-[#203F9A]'
                      : 'bg-[#FAF2EA] text-[#444652] border-[#4E7CB2]/20 hover:bg-[#EEE7DF]'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Studio Interface Toggles */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1E1B17]">Workspace Settings</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  onToggleSound();
                  if (!soundEnabled) playChime('medium');
                }}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  soundEnabled
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-[#FAF2EA]/50 border-gray-200 text-[#757683]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4" />}
                  <span className="text-xs font-bold">Tactile Sounds</span>
                </div>
                <span className="text-[11px] font-bold">{soundEnabled ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => {
                  playClick();
                  onToggleDotGrid();
                }}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  dotGridEnabled
                    ? 'bg-[#EBF5FB] border-[#203F9A]/40 text-[#203F9A]'
                    : 'bg-[#FAF2EA]/50 border-gray-200 text-[#757683]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4" />
                  <span className="text-xs font-bold">Desk Dot Grid</span>
                </div>
                <span className="text-[11px] font-bold">{dotGridEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* PWA App Installation Station */}
          <div className="p-3.5 bg-[#FAF2EA]/50 rounded-2xl border border-[#4E7CB2]/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-[#1E1B17]">Progressive Web App (PWA)</div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Offline Ready
              </span>
            </div>
            <p className="text-xs text-[#4E7CB2] leading-relaxed">
              Install Atlas onto your computer or mobile home screen for zero-distraction fullscreen study without browser tabs.
            </p>
            <div className="pt-1">
              <PWAInstallButton variant="button" />
            </div>
          </div>

          {/* Studio Data Backup & Restore */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1E1B17] flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-[#203F9A]" />
              <span>Studio Data Persistence & Backup</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleExportBackup}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#FAF2EA] hover:bg-white text-xs font-bold text-[#203F9A] border border-[#4E7CB2]/25 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export JSON Backup</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#FAF2EA] hover:bg-white text-xs font-bold text-[#356479] border border-[#4E7CB2]/25 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Restore Backup</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Danger Zone / Reset */}
          <div className="pt-4 border-t border-[#4E7CB2]/15 flex items-center justify-between">
            <button
              onClick={() => {
                if (confirm('Reset session progress & clear local cache?')) {
                  resetAllStudioData();
                  onResetProgress();
                  onClose();
                }
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Data to Default</span>
            </button>

            <button
              onClick={() => {
                playClick();
                onClose();
              }}
              className="tactile-btn-primary px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
