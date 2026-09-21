import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-6 z-50 flex items-center gap-2 rounded-xl bg-[#63003A] text-white px-3.5 py-2 text-xs font-semibold shadow-xl border border-[#E7A0CC]/40 animate-pulse">
      <WifiOff className="w-4 h-4 text-[#E7A0CC]" />
      <span>Offline Study Mode — Cached local data active.</span>
    </div>
  );
};
