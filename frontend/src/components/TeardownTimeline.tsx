import React, { useState, useEffect } from 'react';
import { RotateCcw, Play, CheckCircle2 } from 'lucide-react';

export const TeardownTimeline: React.FC = () => {
  const [animationStep, setAnimationStep] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);

  const startReplay = () => {
    setIsPlaying(true);
    setAnimationStep(0);
  };

  useEffect(() => {
    if (!isPlaying) return;
    if (animationStep < 4) {
      const timer = setTimeout(() => {
        setAnimationStep((prev) => prev + 1);
      }, 900);
      return () => clearTimeout(timer);
    } else {
      setIsPlaying(false);
    }
  }, [isPlaying, animationStep]);

  return (
    <div className="bg-[#FAF2EA]/70 rounded-xl p-4 border border-[#4E7CB2]/20 my-4 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#203F9A] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#203F9A] animate-pulse" />
            Client vs. Server Teardown Timeline (2MSL Buffer)
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF5FB] text-[#203F9A] border border-[#94C2DA]/60">
            Live Animation
          </span>
        </div>

        <button
          onClick={startReplay}
          className="flex items-center gap-1 text-xs font-bold text-[#203F9A] hover:text-[#162c6d] bg-white/80 hover:bg-white px-2.5 py-1 rounded-lg border border-[#4E7CB2]/20 shadow-2xs transition-all"
        >
          {isPlaying ? (
            <RotateCcw className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
          <span>Replay Trace</span>
        </button>
      </div>

      {/* SVG Ladder Diagram */}
      <div className="relative w-full max-w-lg mx-auto py-2">
        <div className="flex justify-between items-center text-xs font-bold text-[#1E1B17] mb-2 px-6">
          <div className="px-3 py-1 bg-[#203F9A] text-white rounded-lg shadow-xs">
            Client (Initiator)
          </div>
          <div className="px-3 py-1 bg-[#356479] text-white rounded-lg shadow-xs">
            Server (Receiver)
          </div>
        </div>

        <svg viewBox="0 0 500 240" className="w-full h-auto overflow-visible select-none">
          <defs>
            <marker
              id="arrow-blue"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#203F9A" />
            </marker>
            <marker
              id="arrow-pink"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#E84797" />
            </marker>
          </defs>

          {/* Vertical Lifelines */}
          <line x1="80" y1="10" x2="80" y2="230" stroke="#4E7CB2" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="420" y1="10" x2="420" y2="230" stroke="#4E7CB2" strokeWidth="2" strokeDasharray="4 4" />

          {/* Packet 1: FIN [Seq=100] */}
          <g opacity={animationStep >= 1 ? 1 : 0.25} className="transition-opacity duration-300">
            <line
              x1="80"
              y1="30"
              x2="415"
              y2="60"
              stroke="#203F9A"
              strokeWidth="2.5"
              markerEnd="url(#arrow-blue)"
            />
            <rect x="180" y="24" width="130" height="20" rx="6" fill="#ffffff" stroke="#94C2DA" strokeWidth="1" />
            <text x="245" y="38" fill="#203F9A" fontSize="11" fontWeight="bold" textAnchor="middle">
              1. FIN [Seq=100]
            </text>
          </g>

          {/* Packet 2: ACK [Ack=101] */}
          <g opacity={animationStep >= 2 ? 1 : 0.25} className="transition-opacity duration-300">
            <line
              x1="420"
              y1="75"
              x2="85"
              y2="105"
              stroke="#203F9A"
              strokeWidth="2.5"
              markerEnd="url(#arrow-blue)"
            />
            <rect x="180" y="70" width="130" height="20" rx="6" fill="#ffffff" stroke="#94C2DA" strokeWidth="1" />
            <text x="245" y="84" fill="#203F9A" fontSize="11" fontWeight="bold" textAnchor="middle">
              2. ACK [Ack=101]
            </text>
          </g>

          {/* Packet 3: FIN [Seq=300] */}
          <g opacity={animationStep >= 3 ? 1 : 0.25} className="transition-opacity duration-300">
            <line
              x1="420"
              y1="120"
              x2="85"
              y2="150"
              stroke="#203F9A"
              strokeWidth="2.5"
              markerEnd="url(#arrow-blue)"
            />
            <rect x="180" y="115" width="130" height="20" rx="6" fill="#ffffff" stroke="#94C2DA" strokeWidth="1" />
            <text x="245" y="129" fill="#203F9A" fontSize="11" fontWeight="bold" textAnchor="middle">
              3. FIN [Seq=300]
            </text>
          </g>

          {/* Packet 4: Final ACK [Ack=301] */}
          <g opacity={animationStep >= 4 ? 1 : 0.25} className="transition-opacity duration-300">
            <line
              x1="80"
              y1="165"
              x2="415"
              y2="195"
              stroke="#E84797"
              strokeWidth="2.5"
              strokeDasharray="5 3"
              markerEnd="url(#arrow-pink)"
            />
            <rect x="135" y="160" width="220" height="22" rx="6" fill="#FFF0F7" stroke="#E7A0CC" strokeWidth="1.5" />
            <text x="245" y="175" fill="#E84797" fontSize="10.5" fontWeight="bold" textAnchor="middle">
              4. Final ACK [Ack=301] • Starts 2MSL Timer
            </text>
          </g>

          {/* 2MSL Buffer Bracket on Client Side */}
          <g opacity={animationStep >= 4 ? 1 : 0.4} className="transition-opacity duration-300">
            <rect
              x="20"
              y="165"
              width="55"
              height="60"
              rx="6"
              fill="#E7A0CC"
              fillOpacity="0.25"
              stroke="#E84797"
              strokeDasharray="4 3"
              strokeWidth="1.5"
            />
            <text x="47" y="185" fill="#E84797" fontSize="8" fontWeight="bold" textAnchor="middle">
              TIME_WAIT
            </text>
            <text x="47" y="196" fill="#1E1B17" fontSize="7.5" fontWeight="bold" textAnchor="middle">
              2 x MSL
            </text>
            <text x="47" y="206" fill="#444652" fontSize="7" textAnchor="middle">
              (up to 4m)
            </text>
            <circle cx="47" cy="216" r="3.5" fill="#E84797" />
            <text x="47" y="218.5" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle">
              !
            </text>
          </g>
        </svg>

        {/* Footnote */}
        <div className="mt-2 text-[11px] text-[#4E7CB2] flex items-center justify-between border-t border-[#4E7CB2]/15 pt-2">
          <span>* MSL = Maximum Segment Lifetime (typically 30s to 120s per network hop limit)</span>
          {animationStep >= 4 && (
            <span className="flex items-center gap-1 text-emerald-700 font-semibold text-[10px]">
              <CheckCircle2 className="w-3 h-3" /> State Handled Cleanly
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
