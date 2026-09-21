import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playClick, playChime, startFocusAmbience, stopFocusAmbience } from '../utils/audio';

interface FocusModeViewProps {
  onAddMinutes: (minutes: number) => void;
  onAddXp: (amount: number) => void;
}

export const FocusModeView: React.FC<FocusModeViewProps> = ({
  onAddMinutes,
  onAddXp,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'deep' | 'rest'>('deep');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [windowSize, setWindowSize] = useState(4);
  const [simPackets, setSimPackets] = useState([
    { id: 1, state: 'acked' },
    { id: 2, state: 'acked' },
    { id: 3, state: 'in-flight' },
    { id: 4, state: 'in-flight' },
    { id: 5, state: 'queued' },
    { id: 6, state: 'queued' },
    { id: 7, state: 'queued' },
    { id: 8, state: 'queued' },
  ]);

  // Audio ambient effect management
  useEffect(() => {
    if (isActive && soundEnabled) {
      startFocusAmbience();
    } else {
      stopFocusAmbience();
    }

    return () => {
      stopFocusAmbience();
    };
  }, [isActive, soundEnabled]);

  // Timer loop
  useEffect(() => {
    let interval: any = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsActive(false);
      stopFocusAmbience();
      playChime('success');

      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.5 },
          colors: ['#203F9A', '#E84797', '#94C2DA'],
        });
      } catch (e) {}

      if (mode === 'deep') {
        onAddMinutes(25);
        onAddXp(50);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft, mode, onAddMinutes, onAddXp]);

  const toggleTimer = () => {
    playClick();
    setIsActive(!isActive);
  };

  const resetTimer = (newMode: 'deep' | 'rest' = mode) => {
    playClick();
    setIsActive(false);
    stopFocusAmbience();
    setMode(newMode);
    setSecondsLeft(newMode === 'deep' ? 25 * 60 : 5 * 60);
  };

  const toggleSound = () => {
    playClick();
    setSoundEnabled(!soundEnabled);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF2EA] border border-[#4E7CB2]/20 text-xs font-bold text-[#444652] mb-1">
          <Sparkles className="w-3.5 h-3.5 text-[#203F9A]" />
          <span>Tactile Study Block • Pomodoro Flow</span>
        </div>
        <h2 className="text-2xl font-bold text-[#1E1B17]">
          25m Pomodoro Flow Session
        </h2>
        <p className="text-xs text-[#4E7CB2]">
          Zero-distraction focus sprint dedicated to TCP Sliding Window buffer simulations and deep protocol tracing.
        </p>
      </div>

      {/* Timer Station */}
      <div className="paper-card rounded-3xl p-8 text-center space-y-6 relative overflow-hidden">
        {/* Mode Selector */}
        <div className="inline-flex items-center gap-2 bg-[#FAF2EA] p-1.5 rounded-full border border-[#4E7CB2]/20">
          <button
            onClick={() => resetTimer('deep')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              mode === 'deep'
                ? 'bg-[#203F9A] text-white shadow-xs'
                : 'text-[#444652] hover:text-[#1E1B17]'
            }`}
          >
            25m Deep Work
          </button>
          <button
            onClick={() => resetTimer('rest')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              mode === 'rest'
                ? 'bg-[#203F9A] text-white shadow-xs'
                : 'text-[#444652] hover:text-[#1E1B17]'
            }`}
          >
            5m Desk Rest
          </button>
        </div>

        {/* Big Display Clock */}
        <div className="py-4">
          <div className="text-7xl md:text-8xl font-black text-[#1E1B17] font-mono tracking-tight select-none">
            {formatTime(secondsLeft)}
          </div>
          <div className="text-xs font-semibold text-[#757683] mt-2">
            {isActive
              ? 'Sprint in progress • Background ambient active'
              : 'Paused • Click start to commence'}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleTimer}
            className={`px-8 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 cursor-pointer ${
              isActive ? 'tactile-btn-pink' : 'tactile-btn-primary'
            }`}
          >
            {isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            <span>{isActive ? 'Pause Focus Sprint' : 'Start Focus Session'}</span>
          </button>

          <button
            onClick={() => resetTimer()}
            className="p-3 rounded-2xl bg-[#FAF2EA] hover:bg-white border border-[#4E7CB2]/20 text-[#4E7CB2] hover:text-[#203F9A] transition-colors cursor-pointer"
            title="Reset Timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={toggleSound}
            className={`p-3 rounded-2xl border transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                : 'bg-[#FAF2EA] border-[#4E7CB2]/20 text-[#757683]'
            }`}
            title="Desk Ambient Rain (Web Audio Synthesizer)"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-700" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {soundEnabled ? 'Rain Ambience: Playing' : 'Ambient: Muted'}
            </span>
          </button>
        </div>
      </div>

      {/* Interactive Sliding Window Buffer Sandbox */}
      <div className="paper-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#1E1B17]">
              Sliding Window Buffer Sandbox (Live State)
            </h3>
            <p className="text-xs text-[#757683]">
              Visualizing Advertised Window (rwnd) & Congestion Window (cwnd)
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-[#444652]">Window Size:</span>
            <div className="flex items-center gap-1">
              {[2, 4, 6].map((w) => (
                <button
                  key={w}
                  onClick={() => {
                    playClick();
                    setWindowSize(w);
                  }}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer ${
                    windowSize === w
                      ? 'bg-[#203F9A] text-white'
                      : 'bg-[#FAF2EA] text-[#444652]'
                  }`}
                >
                  {w} MSS
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Packet Buffer Line */}
        <div className="p-4 bg-[#FAF2EA]/50 rounded-xl border border-[#4E7CB2]/20 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-[500px]">
            {simPackets.map((pkt, idx) => {
              const inWindow = idx >= 2 && idx < 2 + windowSize;
              return (
                <div
                  key={pkt.id}
                  className={`flex-1 p-3 rounded-xl border text-center transition-all ${
                    inWindow
                      ? 'bg-white border-[#203F9A] ring-2 ring-[#203F9A]/30 shadow-xs'
                      : pkt.state === 'acked'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'
                  }`}
                >
                  <div className="text-[10px] font-mono font-bold text-[#757683]">
                    Seq #{pkt.id}00
                  </div>
                  <div className="text-xs font-bold mt-1">
                    {pkt.state === 'acked' ? (
                      <span className="text-emerald-700">ACKed</span>
                    ) : inWindow ? (
                      <span className="text-[#203F9A]">In Flight</span>
                    ) : (
                      <span>Queued</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#757683] pt-1">
          <span>Active Window spans packets #300 to #{2 + windowSize}00</span>
          <span className="text-[#203F9A] font-semibold">Self-clocking ACK loop stable</span>
        </div>
      </div>
    </div>
  );
};
