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
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = 450;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    undoStack.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    redoStack.current = [];
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
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

      {/* Toolbar */}
      <div className="clay-card p-3 flex flex-wrap items-center gap-2 justify-center">
        <button
          onClick={() => setTool('pen')}
          className={`clay-btn px-3 py-1.5 text-sm ${tool === 'pen' ? 'clay-btn-primary' : 'clay-btn-soft'}`}
        >
          Pen
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`clay-btn px-3 py-1.5 text-sm ${tool === 'eraser' ? 'clay-btn-primary' : 'clay-btn-soft'}`}
        >
          Viskelæder
        </button>

        <div className="flex gap-1 items-center">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool('pen'); setShowColorPicker(false); }}
              className={`w-7 h-7 rounded-full border-3 transition-transform ${
                color === c && tool === 'pen' && !showColorPicker
                  ? 'border-warm-dark scale-110'
                  : 'border-warm-border'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="relative" ref={colorPickerRef}>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={`w-7 h-7 rounded-full border-3 ${
                !COLORS.includes(color) && tool === 'pen'
                  ? 'border-warm-dark scale-110'
                  : 'border-warm-border'
              }`}
              style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
              title="Vælg farve"
            />
            {showColorPicker && (
              <div className="absolute top-9 left-1/2 -translate-x-1/2 z-50 clay-card p-3 flex flex-col gap-2 items-center"
                   data-testid="color-picker-dropdown">
                <canvas
                  data-testid="color-picker-canvas"
                  width={160}
                  height={160}
                  className="cursor-crosshair rounded-[var(--radius-clay-sm)]"
                  ref={(el) => {
                    if (!el) return;
                    const ctx = el.getContext('2d')!;
                    for (let x = 0; x < 160; x++) {
                      for (let y = 0; y < 160; y++) {
                        const hue = (x / 160) * 360;
                        const lightness = 100 - (y / 160) * 100;
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

        <input
          type="range"
          min="1"
          max="20"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-24 accent-coral"
        />

        <button
          onClick={undo}
          disabled={undoStack.current.length <= 1}
          className="clay-btn px-3 py-1.5 text-sm clay-btn-soft"
          title="Fortryd (Ctrl+Z)"
        >
          Fortryd
        </button>
        <button
          onClick={redo}
          disabled={redoStack.current.length === 0}
          className="clay-btn px-3 py-1.5 text-sm clay-btn-soft"
          title="Gendan (Ctrl+Y)"
        >
          Gendan
        </button>
        <button
          onClick={clearCanvas}
          className="clay-btn px-3 py-1.5 text-sm bg-red-100 border-red-200 text-red-700 hover:bg-red-200"
        >
          Ryd
        </button>
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
      />

      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="clay-btn clay-btn-primary px-8 py-3 text-lg"
      >
        Indsend
      </button>
    </div>
  );
}
