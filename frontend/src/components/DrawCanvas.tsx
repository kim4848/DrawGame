import { useRef, useState, useEffect, useCallback } from 'react';

interface DrawCanvasProps {
  prompt: string;
  onSubmit: (blob: Blob) => void;
  disabled: boolean;
}

const COLORS = ['#000000', '#FF0000', '#0000FF', '#00AA00', '#FF8800', '#8800FF', '#FF00FF', '#888888'];
const MAX_UNDO = 30;

export default function DrawCanvas({ prompt, onSubmit, disabled }: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const overflowMenuRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(e.target as Node)) {
        setShowOverflowMenu(false);
      }
    };
    if (showColorPicker || showOverflowMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker, showOverflowMenu]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // High-DPI/Retina display scaling
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.offsetWidth;

    // Responsive canvas height (mobile-first)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let maxHeight: number;

    if (viewportWidth < 768) {
      // Mobile: 70% of viewport height
      maxHeight = viewportHeight * 0.7;
    } else if (viewportWidth < 1024) {
      // Tablet: 60% of viewport, max 500px
      maxHeight = Math.min(500, viewportHeight * 0.6);
    } else {
      // Desktop: Keep current 450px max
      maxHeight = Math.min(450, viewportHeight * 0.5);
    }

    // Set internal canvas resolution (scaled for high-DPI)
    canvas.width = displayWidth * dpr;
    canvas.height = maxHeight * dpr;

    // Set display size (CSS pixels)
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${maxHeight}px`;

    const ctx = canvas.getContext('2d')!;
    // Scale all drawing operations by devicePixelRatio
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, displayWidth, maxHeight);
    undoStack.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    redoStack.current = [];
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    // Don't scale by canvas.width/rect.width because ctx is already scaled by dpr
    // Just convert to canvas-relative CSS pixels
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDrawing(true);
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);
    const prev = lastPos.current!;

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
    ctx.lineWidth = tool === 'eraser' ? brushSize * 4 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPos.current = pos;
  };

  const endDraw = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d')!;
        const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (undoStack.current.length >= MAX_UNDO) undoStack.current.shift();
        undoStack.current.push(snapshot);
        redoStack.current = [];
        forceRender((n) => n + 1);
      }
    }
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (undoStack.current.length >= MAX_UNDO) undoStack.current.shift();
    undoStack.current.push(snapshot);
    redoStack.current = [];
    forceRender((n) => n + 1);
  };

  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || undoStack.current.length <= 1) return;
    const ctx = canvas.getContext('2d')!;
    const current = undoStack.current.pop()!;
    redoStack.current.push(current);
    ctx.putImageData(undoStack.current[undoStack.current.length - 1], 0, 0);
    forceRender((n) => n + 1);
  }, []);

  const redo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || redoStack.current.length === 0) return;
    const ctx = canvas.getContext('2d')!;
    const next = redoStack.current.pop()!;
    undoStack.current.push(next);
    ctx.putImageData(next, 0, 0);
    forceRender((n) => n + 1);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, undo, redo]);

  const handleSubmit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onSubmit(blob);
    }, 'image/png');
  }, [onSubmit]);

  return (
    <div className="flex flex-col items-center gap-3">
      <h2 className="font-heading text-xl font-semibold text-warm-dark">
        Tegn: <span className="text-coral">{prompt}</span>
      </h2>

      {/* Toolbar - Mobile-first 2-row layout */}
      <div className="clay-card p-2 w-full max-w-2xl">
        {/* Top row: Tools, brush size, overflow menu */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTool('pen')}
              className={`clay-btn px-3 py-2 text-sm min-h-[44px] min-w-[44px] ${tool === 'pen' ? 'clay-btn-primary' : 'clay-btn-soft'}`}
              aria-label="Pen"
            >
              Pen
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`clay-btn px-3 py-2 text-sm min-h-[44px] min-w-[44px] ${tool === 'eraser' ? 'clay-btn-primary' : 'clay-btn-soft'}`}
              aria-label="Viskelæder"
            >
              Viskelæder
            </button>
          </div>

          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="flex-1 max-w-[120px] accent-coral min-h-[44px]"
            aria-label="Penselstørrelse"
          />

          {/* Overflow menu (mobile) / Inline buttons (desktop) */}
          <div className="flex items-center gap-2">
            {/* Desktop: show inline */}
            <button
              onClick={undo}
              disabled={undoStack.current.length <= 1}
              className="hidden md:flex clay-btn px-3 py-2 text-sm clay-btn-soft min-h-[44px]"
              title="Fortryd (Ctrl+Z)"
              aria-label="Fortryd"
            >
              Fortryd
            </button>
            <button
              onClick={redo}
              disabled={redoStack.current.length === 0}
              className="hidden md:flex clay-btn px-3 py-2 text-sm clay-btn-soft min-h-[44px]"
              title="Gendan (Ctrl+Y)"
              aria-label="Gendan"
            >
              Gendan
            </button>
            <button
              onClick={clearCanvas}
              className="hidden md:flex clay-btn px-3 py-2 text-sm bg-red-100 border-red-200 text-red-700 hover:bg-red-200 min-h-[44px]"
              aria-label="Ryd canvas"
            >
              Ryd
            </button>

            {/* Mobile: overflow menu */}
            <div className="relative md:hidden" ref={overflowMenuRef}>
              <button
                onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                className="clay-btn clay-btn-soft min-h-[44px] min-w-[44px] flex items-center justify-center text-xl leading-none"
                aria-label="Flere værktøjer"
                aria-expanded={showOverflowMenu}
              >
                ⋮
              </button>
              {showOverflowMenu && (
                <div className="absolute right-0 top-12 z-50 clay-card p-2 flex flex-col gap-1 min-w-[160px]">
                  <button
                    onClick={() => { undo(); setShowOverflowMenu(false); }}
                    disabled={undoStack.current.length <= 1}
                    className="clay-btn clay-btn-soft px-4 py-2 text-sm min-h-[44px] text-left disabled:opacity-50"
                  >
                    Fortryd (Ctrl+Z)
                  </button>
                  <button
                    onClick={() => { redo(); setShowOverflowMenu(false); }}
                    disabled={redoStack.current.length === 0}
                    className="clay-btn clay-btn-soft px-4 py-2 text-sm min-h-[44px] text-left disabled:opacity-50"
                  >
                    Gendan (Ctrl+Y)
                  </button>
                  <button
                    onClick={() => { clearCanvas(); setShowOverflowMenu(false); }}
                    className="clay-btn px-4 py-2 text-sm bg-red-100 border-red-200 text-red-700 hover:bg-red-200 min-h-[44px] text-left"
                  >
                    Ryd alt
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom row: Color palette */}
        <div className="flex items-center justify-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool('pen'); setShowColorPicker(false); }}
              className={`w-8 h-8 p-2 rounded-full border-3 transition-transform ${
                color === c && tool === 'pen' && !showColorPicker
                  ? 'border-warm-dark scale-110'
                  : 'border-warm-border'
              }`}
              style={{ backgroundColor: c, minWidth: '44px', minHeight: '44px' }}
              aria-label={`Vælg farve ${c}`}
            />
          ))}
          <div className="relative" ref={colorPickerRef}>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={`w-8 h-8 p-2 rounded-full border-3 ${
                !COLORS.includes(color) && tool === 'pen'
                  ? 'border-warm-dark scale-110'
                  : 'border-warm-border'
              }`}
              style={{
                background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                minWidth: '44px',
                minHeight: '44px'
              }}
              title="Vælg farve"
              aria-label="Vælg tilpasset farve"
            />
            {showColorPicker && (
              <div className="fixed md:absolute top-1/2 md:top-12 left-1/2 -translate-x-1/2 md:-translate-x-0 -translate-y-1/2 md:-translate-y-0 z-50 clay-card p-4 flex flex-col gap-2 items-center"
                   data-testid="color-picker-dropdown">
                <button
                  onClick={() => setShowColorPicker(false)}
                  className="absolute top-2 right-2 text-warm-mid hover:text-warm-dark text-xl leading-none w-8 h-8 flex items-center justify-center md:hidden"
                  aria-label="Luk farvevælger"
                >
                  &times;
                </button>
                <canvas
                  data-testid="color-picker-canvas"
                  width={200}
                  height={200}
                  className="cursor-crosshair rounded-[var(--radius-clay-sm)] w-[200px] h-[200px] md:w-[160px] md:h-[160px]"
                  ref={(el) => {
                    if (!el) return;
                    const ctx = el.getContext('2d')!;
                    const size = 200;
                    for (let x = 0; x < size; x++) {
                      for (let y = 0; y < size; y++) {
                        const hue = (x / size) * 360;
                        const lightness = 100 - (y / size) * 100;
                        ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
                        ctx.fillRect(x, y, 1, 1);
                      }
                    }
                  }}
                  onClick={(e) => {
                    const canvas = e.currentTarget;
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const ctx = canvas.getContext('2d')!;
                    const pixel = ctx.getImageData(x, y, 1, 1).data;
                    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');
                    setColor(hex);
                    setTool('pen');
                  }}
                />
                <div className="flex items-center gap-2 w-full">
                  <div className="w-6 h-6 rounded-full border-2 border-warm-border shrink-0" style={{ backgroundColor: color }} />
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => { setColor(e.target.value); setTool('pen'); }}
                    className="w-6 h-6 cursor-pointer border-0 p-0 bg-transparent shrink-0"
                    title="Systemfarvevælger"
                  />
                  <span className="text-xs text-warm-mid font-mono">{color}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full max-w-2xl border-3 border-warm-border rounded-[var(--radius-clay)] cursor-crosshair touch-none bg-white"
        style={{ boxShadow: '6px 6px 0px var(--color-card-shadow)' }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
        aria-label={`Tegneområde for: ${prompt}`}
        role="img"
        aria-live="polite"
      />

      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="clay-btn clay-btn-primary px-8 py-3 text-lg min-h-[48px] w-full sm:w-auto max-w-xs relative"
      >
        {disabled ? (
          <>
            <span className="opacity-50">Indsender</span>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl animate-spin">⏳</span>
          </>
        ) : (
          'Indsend'
        )}
      </button>
    </div>
  );
}
