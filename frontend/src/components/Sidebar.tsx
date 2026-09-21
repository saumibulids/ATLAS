import React from 'react';
import { 
  LayoutDashboard, 
  Bot, 
  FileText, 
  Layers, 
  HelpCircle, 
  Scan, 
  GraduationCap, 
  Settings,
  X
} from 'lucide-react';
import { NavigationTab, UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { playClick } from '../utils/audio';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  user: UserProfile;
  onOpenSettings: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onOpenSettings,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'ai-tutor' as NavigationTab,
      label: 'Atlas',
      icon: Bot,
      badge: 'Tutor',
    },
    {
      id: 'cascading-notes' as NavigationTab,
      label: 'Cascading Notes',
      icon: FileText,
    },
    {
      id: 'flashcards' as NavigationTab,
      label: 'Flashcards',
      icon: Layers,
    },
    {
      id: 'quizzes' as NavigationTab,
      label: 'Practice Quizzes',
      icon: HelpCircle,
    },
    {
      id: 'focus-mode' as NavigationTab,
      label: 'Focus Mode',
      icon: Scan,
    },
  ];

  const handleNavClick = (id: NavigationTab) => {
    playClick();
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-[#203F9A]/30 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      <aside
        className={`w-64 flex-shrink-0 bg-[#FFF8F1] border-r border-[#4E7CB2]/15 flex flex-col justify-between h-screen fixed md:sticky top-0 z-50 transition-transform duration-200 select-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#203F9A] flex items-center justify-center shadow-md shadow-[#203F9A]/15 text-white">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight text-[#203F9A] leading-tight">
                  ATLAS
                </h1>
                <p className="text-[11px] font-bold text-[#4E7CB2] tracking-widest uppercase">
                  Study Studio
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="md:hidden p-1.5 rounded-lg text-[#757683] hover:text-[#1E1B17] hover:bg-[#FAF2EA]"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation items */}
          <nav className="px-3 space-y-1.5 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#203F9A] text-white shadow-sm shadow-[#203F9A]/20'
                      : 'text-[#444652] hover:bg-[#FAF2EA] hover:text-[#1E1B17]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-5 h-5 ${
                        isActive ? 'text-white' : 'text-[#4E7CB2]'
                      }`}
                    />
                    <span className={isActive ? 'font-semibold' : ''}>
                      {item.label}
                    </span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white border border-white/30'
                          : 'bg-[#EBF5FB] text-[#203F9A] border border-[#94C2DA]/60'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile and install prompt footer */}
        <div className="p-4 border-t border-[#4E7CB2]/15 space-y-3">
          <div className="block sm:hidden">
            <PWAInstallButton variant="button" />
          </div>

          <div className="bg-[#FAF2EA] rounded-xl p-2.5 border border-[#4E7CB2]/15 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#B8E6FF] text-[#203F9A] font-bold text-xs flex items-center justify-center border border-[#94C2DA]/60">
                {user.avatarInitials}
              </div>
              <div className="truncate max-w-[120px]">
                <div className="text-xs font-bold text-[#1E1B17] leading-tight truncate">
                  {user.name}
                </div>
                <div className="text-[10px] font-semibold text-[#4E7CB2] truncate">
                  {user.grade}
                </div>
              </div>
            </div>
            <button
              id="settings-btn"
              onClick={() => {
                playClick();
                onOpenSettings();
              }}
              className="p-1.5 text-[#4E7CB2] hover:text-[#1E1B17] hover:bg-white/60 rounded-lg transition-colors cursor-pointer"
              title="Studio Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
