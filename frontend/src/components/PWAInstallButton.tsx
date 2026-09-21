import React, { useState } from 'react';
import { Download, Sparkles, X, Smartphone, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'button' | 'compact' | 'pill';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'button' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as standalone app, show subtle installed badge or nothing
  if (isInstalled) {
    if (variant === 'compact') return null;
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold">
        <Check className="w-3.5 h-3.5" />
        <span>Installed App</span>
      </div>
    );
  }

  // Chromium / Desktop / Android flow
  if (isInstallable) {
    if (variant === 'compact') {
      return (
        <button
          onClick={install}
          title="Install Atlas Studio to Desktop / Homescreen"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#203F9A] text-white text-xs font-bold shadow-xs hover:bg-[#18317A] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
      );
    }

    return (
      <button
        onClick={install}
        className="tactile-btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
      >
        <Download className="w-4 h-4" />
        <span>Install Desktop / Mobile App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF2EA] border border-[#4E7CB2]/25 text-[#203F9A] text-xs font-bold hover:bg-white transition-colors"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Add to Home Screen</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#203F9A]/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#FFF8F1] p-6 shadow-2xl border border-[#4E7CB2]/30 space-y-4">
              <div className="flex items-center justify-between border-b border-[#4E7CB2]/15 pb-3">
                <div className="flex items-center gap-2 text-[#203F9A] font-bold text-sm">
                  <Smartphone className="w-4 h-4" />
                  <span>Install on iPhone / iPad</span>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-[#757683] hover:text-[#1E1B17] rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#444652] leading-relaxed">
                Enjoy zero-distraction fullscreen study without browser address bars:
              </p>

              <div className="space-y-2 text-xs text-[#1E1B17] bg-white p-3 rounded-xl border border-[#4E7CB2]/20">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#203F9A] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</span>
                  <span>Tap the <strong>Share</strong> button (box with upward arrow) in Safari.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#203F9A] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</span>
                  <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#203F9A] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</span>
                  <span>Tap <strong>Add</strong> in the top-right corner.</span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 rounded-xl bg-[#203F9A] text-white text-xs font-bold tactile-btn-primary"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
