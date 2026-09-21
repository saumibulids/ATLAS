import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  RefreshCw, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  PenTool, 
  Eraser, 
  Trash2, 
  Download, 
  Layers 
} from 'lucide-react';
import { playClick } from '../utils/audio';

interface TactileMemoryCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMarkerColor?: string;
}

export const TactileMemoryCanvasModal: React.FC<TactileMemoryCanvasModalProps> = ({
  isOpen,
  onClose,
  activeMarkerColor = '#203F9A',
}) => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'whiteboard'>('simulator');
  
  // Protocol Handshake Simulator State
  const [clientSeq, setClientSeq] = useState(1000);
  const [serverSeq, setServerSeq] = useState(5000);
  const [step, setStep] = useState(1);
  const [synCookiesActive, setSynCookiesActive] = useState(true);

  // Whiteboard Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState(activeMarkerColor);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  useEffect(() => {
    if (activeMarkerColor) {
      setDrawColor(activeMarkerColor);
    }
  }, [activeMarkerColor]);

  // Setup Whiteboard Canvas
  useEffect(() => {
    if (isOpen && activeTab === 'whiteboard' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle high DPI displays
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * 2) {
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);

        // Fill warm background
        ctx.fillStyle = '#FFF8F1';
        ctx.fillRect(0, 0, rect.width, rect.height);

        // Draw light dot grid pattern on canvas
        ctx.fillStyle = 'rgba(78, 124, 178, 0.15)';
        for (let x = 20; x < rect.width; x += 24) {
          for (let y = 20; y < rect.height; y += 24) {
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const resetHandshake = () => {
    playClick();
    setClientSeq(Math.floor(1000 + Math.random() * 8000));
    setServerSeq(Math.floor(5000 + Math.random() * 4000));
    setStep(1);
  };

  // Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = tool === 'eraser' ? strokeWidth * 6 : strokeWidth;
    ctx.strokeStyle = tool === 'eraser' ? '#FFF8F1' : drawColor;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    playClick();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    ctx.fillStyle = '#FFF8F1';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Redraw subtle dots
    ctx.fillStyle = 'rgba(78, 124, 178, 0.15)';
    for (let x = 20; x < rect.width; x += 24) {
      for (let y = 20; y < rect.height; y += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const downloadCanvasImage = () => {
    playClick();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Atlas_Study_Diagram_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#203F9A]/30 backdrop-blur-xs p-3 md:p-6">
      <div className="bg-[#FFF8F1] w-full max-w-4xl rounded-3xl border border-[#4E7CB2]/30 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#4E7CB2]/15 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-[#203F9A] text-white rounded-xl flex items-center justify-center">
              <PenTool className="w-5 h-5 text-white" />
            </span>
            <div>
              <h2 className="font-bold text-base text-[#1E1B17]">
                Tactile Memory Canvas & Protocol Simulator
              </h2>
              <p className="text-xs text-[#4E7CB2]">
                Interactive packet sequence verification & freeform diagram scratchpad
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab switchers */}
            <div className="inline-flex p-1 rounded-xl bg-[#FAF2EA] border border-[#4E7CB2]/20">
              <button
                onClick={() => {
                  playClick();
                  setActiveTab('simulator');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'simulator'
                    ? 'bg-[#203F9A] text-white shadow-xs'
                    : 'text-[#444652] hover:text-[#1E1B17]'
                }`}
              >
                Handshake Simulator
              </button>
              <button
                onClick={() => {
                  playClick();
                  setActiveTab('whiteboard');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'whiteboard'
                    ? 'bg-[#203F9A] text-white shadow-xs'
                    : 'text-[#444652] hover:text-[#1E1B17]'
                }`}
              >
                Desk Whiteboard
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-[#757683] hover:text-[#1E1B17] hover:bg-[#FAF2EA] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'simulator' ? (
            /* Simulator View */
            <div className="space-y-6">
              {/* Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#4E7CB2]/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1E1B17]">SYN Cookies Defense:</span>
                  <button
                    onClick={() => {
                      playClick();
                      setSynCookiesActive(!synCookiesActive);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      synCookiesActive
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {synCookiesActive ? 'Enabled (RFC 4987)' : 'Disabled'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={resetHandshake}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#4E7CB2]/25 bg-[#FAF2EA] hover:bg-white transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 text-[#203F9A]" />
                    <span>New Sequence Numbers</span>
                  </button>
                </div>
              </div>

              {/* Interactive Flow Visualizer */}
              <div className="bg-white rounded-2xl p-6 border border-[#4E7CB2]/20 shadow-xs space-y-6">
                <div className="grid grid-cols-3 text-center">
                  <div className="p-3.5 bg-[#EBF5FB] border border-[#94C2DA]/50 rounded-xl">
                    <div className="text-xs font-bold uppercase text-[#203F9A]">Client Host</div>
                    <div className="text-sm font-semibold mt-1">
                      State:{' '}
                      <span className="text-[#203F9A] font-bold">
                        {step === 1 ? 'SYN_SENT' : 'ESTABLISHED'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#4E7CB2] mt-0.5 font-mono">ISN_c = {clientSeq}</div>
                  </div>

                  <div className="flex flex-col items-center justify-center text-xs font-medium text-[#757683]">
                    <span className="font-bold text-[#203F9A]">Step {step} of 3</span>
                    <span className="text-[11px] text-gray-500">Duplex Transmission Channel</span>
                  </div>

                  <div className="p-3.5 bg-[#FAF2EA] border border-[#4E7CB2]/30 rounded-xl">
                    <div className="text-xs font-bold uppercase text-[#356479]">Server Host</div>
                    <div className="text-sm font-semibold mt-1">
                      State:{' '}
                      <span className="text-[#356479] font-bold">
                        {step === 1 ? (synCookiesActive ? 'STATELESS (Cookie)' : 'SYN_RCVD') : 'ESTABLISHED'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#4E7CB2] mt-0.5 font-mono">ISN_s = {serverSeq}</div>
                  </div>
                </div>

                {/* Stepped Packet Path */}
                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    step >= 1 ? 'border-[#203F9A] bg-[#203F9A]/5' : 'border-gray-200 opacity-40'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#203F9A] text-white text-xs font-bold flex items-center justify-center">1</span>
                        <span className="font-bold text-sm text-[#203F9A]">Client sends SYN</span>
                      </div>
                      <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-[#203F9A]/20">
                        SYN=1 | Seq = {clientSeq} | CTL = 0x02
                      </span>
                    </div>
                    <p className="text-xs text-[#444652] mt-1 ml-8">
                      Client generates Initial Sequence Number and requests duplex synchronization.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    step >= 2 ? 'border-[#203F9A] bg-[#203F9A]/5' : 'border-gray-200 opacity-40'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#203F9A] text-white text-xs font-bold flex items-center justify-center">2</span>
                        <span className="font-bold text-sm text-[#203F9A]">Server responds SYN-ACK</span>
                      </div>
                      <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-[#203F9A]/20">
                        SYN=1, ACK=1 | Seq = {serverSeq} | Ack = {clientSeq + 1}
                      </span>
                    </div>
                    <p className="text-xs text-[#444652] mt-1 ml-8">
                      Server verifies client and responds with Ack = Seq_c + 1. {synCookiesActive && '(SYN Cookie calculated from SHA1 hash to resist SYN flooding!)'}
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    step >= 3 ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 opacity-40'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">3</span>
                        <span className="font-bold text-sm text-emerald-800">Client sends final ACK</span>
                      </div>
                      <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-emerald-400">
                        ACK=1 | Seq = {clientSeq + 1} | Ack = {serverSeq + 1}
                      </span>
                    </div>
                    <p className="text-xs text-[#444652] mt-1 ml-8">
                      Handshake finalized. Socket transitions into <strong className="text-emerald-800">ESTABLISHED</strong> on both endpoints. Data can now flow!
                    </p>
                  </div>
                </div>

                {/* Step Navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <button
                    disabled={step <= 1}
                    onClick={() => {
                      playClick();
                      setStep((s) => Math.max(1, s - 1));
                    }}
                    className="px-3.5 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold disabled:opacity-30 cursor-pointer"
                  >
                    Previous Step
                  </button>

                  {step < 3 ? (
                    <button
                      onClick={() => {
                        playClick();
                        setStep((s) => Math.min(3, s + 1));
                      }}
                      className="px-4 py-2 rounded-xl bg-[#203F9A] text-white text-xs font-bold flex items-center gap-1.5 tactile-btn-primary cursor-pointer"
                    >
                      <span>Advance Packet Step</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Full 3-Way Handshake Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Whiteboard Canvas View */
            <div className="space-y-4">
              {/* Whiteboard Controls */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#4E7CB2]/20 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      playClick();
                      setTool('pen');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      tool === 'pen' ? 'bg-[#203F9A] text-white' : 'bg-[#FAF2EA] text-[#444652]'
                    }`}
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Ink Pen</span>
                  </button>

                  <button
                    onClick={() => {
                      playClick();
                      setTool('eraser');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      tool === 'eraser' ? 'bg-[#203F9A] text-white' : 'bg-[#FAF2EA] text-[#444652]'
                    }`}
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>Eraser</span>
                  </button>

                  {/* Marker Color Palette */}
                  <div className="h-5 w-px bg-[#4E7CB2]/20 mx-1" />
                  <div className="flex items-center gap-1.5">
                    {[
                      { color: '#203F9A', label: 'Ink Blue' },
                      { color: '#E84797', label: 'Rose Highlighter' },
                      { color: '#356479', label: 'Slate Teal' },
                      { color: '#16A34A', label: 'Terminal Green' },
                      { color: '#63003A', label: 'Plum' },
                    ].map((m) => (
                      <button
                        key={m.color}
                        onClick={() => {
                          setDrawColor(m.color);
                          setTool('pen');
                        }}
                        title={m.label}
                        style={{ backgroundColor: m.color }}
                        className={`w-5 h-5 rounded-full transition-all ${
                          drawColor === m.color && tool === 'pen'
                            ? 'ring-2 ring-offset-2 ring-[#203F9A] scale-110'
                            : 'opacity-75 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-[#757683]">
                    <span>Stroke:</span>
                    {[2, 4, 7].map((s) => (
                      <button
                        key={s}
                        onClick={() => setStrokeWidth(s)}
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          strokeWidth === s ? 'bg-[#203F9A] text-white' : 'bg-[#FAF2EA] text-[#444652]'
                        }`}
                      >
                        {s}px
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={clearCanvas}
                    className="p-1.5 text-[#757683] hover:text-rose-600 rounded-lg transition-colors"
                    title="Clear Canvas"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={downloadCanvasImage}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FAF2EA] hover:bg-white text-xs font-bold text-[#203F9A] border border-[#4E7CB2]/20 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save Image</span>
                  </button>
                </div>
              </div>

              {/* HTML5 Canvas Element */}
              <div className="border-2 border-[#4E7CB2]/20 rounded-2xl overflow-hidden bg-[#FFF8F1] shadow-inner relative cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[420px] block touch-none"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#757683] px-1">
                <span>Freehand packet diagramming desk • Touch & Mouse supported</span>
                <span>Draw protocol timing, state transitions, or memory notes</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
