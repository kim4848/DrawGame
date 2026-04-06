import { useRef, useState, useEffect, useCallback } from 'react';

interface DrawCanvasProps {
  prompt: string;
  onSubmit: (blob: Blob) => void;
  disabled: boolean;
}

const COLORS = ['#000000', '#FF0000', '#0000FF', '#00AA00', '#FF8800', '#8800FF', '#FF00FF', '#888888'];

export default function DrawCanvas({ prompt, onSubmit, disabled }: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Close color picker when clicking outside
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
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSubmit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onSubmit(blob);
    }, 'image/png');
  }, [onSubmit]);

  return (
    <div className="flex flex-col items-center gap-3">
      <h2 className="text-xl font-semibold">
        Tegn: <span className="text-blue-600">{prompt}</span>
      </h2>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <button
          onClick={() => setTool('pen')}
          className={`px-3 py-1.5 rounded text-sm ${tool === 'pen' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Pen
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`px-3 py-1.5 rounded text-sm ${tool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Viskelæder
        </button>

        <div className="flex gap-1 items-center">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool('pen'); setShowColorPicker(false); }}
              className={`w-7 h-7 rounded-full border-2 ${color === c && tool === 'pen' && !showColorPicker ? 'border-blue-500 scale-110' : 'border-gray-300'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="relative" ref={colorPickerRef}>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={`w-7 h-7 rounded-full border-2 ${!COLORS.includes(color) && tool === 'pen' ? 'border-blue-500 scale-110' : 'border-gray-300'}`}
              style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
              title="Vælg farve"
            />
            {showColorPicker && (
              <div className="absolute top-9 left-1/2 -translate-x-1/2 z-50 bg-white rounded-lg shadow-lg p-3 border border-gray-200 flex flex-col gap-2 items-center"
                   data-testid="color-picker-dropdown">
                <canvas
                  data-testid="color-picker-canvas"
                  width={160}
                  height={160}
                  className="cursor-crosshair rounded"
                  ref={(el) => {
                    if (!el) return;
                    const ctx = el.getContext('2d')!;
                    // Draw hue/saturation grid
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
                  <div className="w-6 h-6 rounded-full border border-gray-300 shrink-0" style={{ backgroundColor: color }} />
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => { setColor(e.target.value); setTool('pen'); }}
                    className="w-6 h-6 cursor-pointer border-0 p-0 bg-transparent shrink-0"
                    title="Systemfarvevælger"
                  />
                  <span className="text-xs text-gray-500 font-mono">{color}</span>
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
          className="w-24"
        />

        <button
          onClick={clearCanvas}
          className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
        >
          Ryd
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full max-w-2xl border-2 border-gray-300 rounded-lg cursor-crosshair touch-none bg-white"
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
        className="px-8 py-3 bg-blue-500 text-white rounded-lg text-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Indsend
      </button>
    </div>
  );
}
