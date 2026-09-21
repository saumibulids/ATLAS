import React from 'react';
import { Download, Grid, Palette } from 'lucide-react';

interface DeskDockProps {
  dotGridEnabled: boolean;
  onToggleDotGrid: () => void;
  activeMarker: string;
  onSelectMarker: (color: string) => void;
  onExportNotes: () => void;
}

export const DeskDock: React.FC<DeskDockProps> = ({
  dotGridEnabled,
  onToggleDotGrid,
  activeMarker,
  onSelectMarker,
  onExportNotes,
}) => {
  const markerColors = [
    { id: '#203F9A', name: 'Ink Blue', bgClass: 'bg-[#203F9A]' },
    { id: '#63003A', name: 'Plum Ink', bgClass: 'bg-[#63003A]' },
    { id: '#94C2DA', name: 'Sky Highlighter', bgClass: 'bg-[#94C2DA]' },
    { id: '#E7A0CC', name: 'Rose Highlighter', bgClass: 'bg-[#E7A0CC]' },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border border-[#4E7CB2]/20 shadow-lg shadow-[#203F9A]/10 flex items-center gap-4">
        {/* Markers */}
        <div className="flex items-center gap-2 pr-3 border-r border-[#4E7CB2]/20">
          <span className="text-[11px] font-bold text-[#4E7CB2] uppercase tracking-wider flex items-center gap-1">
            <Palette className="w-3.5 h-3.5" />
            Marker:
          </span>
          <div className="flex items-center gap-1.5">
            {markerColors.map((m) => (
              <button
                key={m.id}
                onClick={() => onSelectMarker(m.id)}
                title={m.name}
                className={`w-4 h-4 rounded-full ${m.bgClass} transition-transform ${
                  activeMarker === m.id
                    ? 'ring-2 ring-offset-2 ring-[#203F9A] scale-110'
                    : 'opacity-75 hover:opacity-100 hover:scale-105'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Export Notes */}
        <button
          onClick={onExportNotes}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#1E1B17] hover:text-[#203F9A] transition-colors py-1 px-2 rounded-md hover:bg-[#FAF2EA]"
        >
          <Download className="w-3.5 h-3.5 text-[#4E7CB2]" />
          <span>Export Notes</span>
        </button>

        {/* Dot Grid Toggle */}
        <button
          onClick={onToggleDotGrid}
          className={`flex items-center gap-1.5 text-xs font-semibold py-1 px-3 rounded-full transition-all ${
            dotGridEnabled
              ? 'bg-[#203F9A] text-white shadow-xs'
              : 'bg-[#FAF2EA] text-[#444652] hover:bg-[#EEE7DF]'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Dot Grid: {dotGridEnabled ? 'On' : 'Off'}</span>
        </button>
      </div>
    </div>
  );
};
