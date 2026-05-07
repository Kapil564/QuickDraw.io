import { useRef, useEffect, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import type { DrawEvent, DrawingMode, FillEvent, UndoEvent, ThemeMode } from '../types';

interface UseCanvasOptions {
  socket: Socket;
  color: string;
  brushSize: number;
  mode: DrawingMode;
  theme: ThemeMode;
}

export function useCanvas({ socket, color, brushSize, mode, theme }: UseCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Performance-critical state stored in refs (avoids re-renders during drawing)
  const isDrawing = useRef(false);
  const posX = useRef(0);
  const posY = useRef(0);
  const history = useRef<string[]>([]);

  // Mirror props into refs so event handlers always see latest values
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  const modeRef = useRef(mode);
  const themeRef = useRef(theme);

  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { themeRef.current = theme; }, [theme]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const resolveColor = useCallback((c: string) => {
    return c === 'primary'
      ? (themeRef.current === 'light' ? '#1c1c1e' : '#ffffff')
      : c;
  }, []);

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    history.current.push(canvas.toDataURL());
    if (history.current.length > 20) history.current.shift();
  }, []);

  const restoreCanvas = useCallback((dataUrl?: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (!dataUrl) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl;
  }, []);

  const drawLine = useCallback(
    (x0: number, y0: number, x1: number, y1: number, lineColor: string, size: number, emit: boolean) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = resolveColor(lineColor);
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.closePath();

      if (!emit) return;
      const w = canvas.width, h = canvas.height;
      socket.emit('draw', { x0: x0 / w, y0: y0 / h, x1: x1 / w, y1: y1 / h, color: lineColor, size });
    },
    [socket, resolveColor]
  );

  const fillCanvas = useCallback(
    (fillColor: string, emit: boolean) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      ctx.fillStyle = resolveColor(fillColor);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (emit) socket.emit('fill', { color: fillColor });
    },
    [socket, resolveColor]
  );

  // ── Public actions (called by ToolsPanel) ─────────────────────────────────

  const undo = useCallback(() => {
    if (history.current.length > 0) {
      const prev = history.current.pop()!;
      restoreCanvas(prev);
      socket.emit('undo', { imgData: prev });
    }
  }, [socket, restoreCanvas]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    saveHistory();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear');
  }, [socket, saveHistory]);

  // ── Canvas resize (ResizeObserver) ────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    return () => observer.disconnect();
  }, []);

  // ── Mouse & Touch events ─────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if ('clientX' in e) return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if ('touches' in e && e.touches.length > 0)
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
      return { x: 0, y: 0 };
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      saveHistory();
      if (modeRef.current === 'fill') { fillCanvas(colorRef.current, true); return; }
      isDrawing.current = true;
      const p = getPos(e);
      posX.current = p.x;
      posY.current = p.y;
    };

    const onUp = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      const p = getPos(e);
      drawLine(posX.current, posY.current, p.x, p.y, colorRef.current, brushSizeRef.current, true);
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return;
      const p = getPos(e);
      drawLine(posX.current, posY.current, p.x, p.y, colorRef.current, brushSizeRef.current, true);
      posX.current = p.x;
      posY.current = p.y;
    };

    // Mouse
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseout', onUp as EventListener);
    canvas.addEventListener('mousemove', onMove);

    // Touch
    const opts: AddEventListenerOptions = { passive: false };
    const wrap = (fn: (e: MouseEvent | TouchEvent) => void) =>
      (e: TouchEvent) => { e.preventDefault(); fn(e); };
    const tStart = wrap(onDown), tEnd = wrap(onUp), tMove = wrap(onMove);

    canvas.addEventListener('touchstart', tStart, opts);
    canvas.addEventListener('touchend', tEnd, opts);
    canvas.addEventListener('touchcancel', tEnd, opts);
    canvas.addEventListener('touchmove', tMove, opts);

    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseout', onUp as EventListener);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('touchstart', tStart);
      canvas.removeEventListener('touchend', tEnd);
      canvas.removeEventListener('touchcancel', tEnd);
      canvas.removeEventListener('touchmove', tMove);
    };
  }, [saveHistory, fillCanvas, drawLine]);

  // ── Incoming socket events ────────────────────────────────────────────────

  useEffect(() => {
    const onDraw = (data: DrawEvent) => {
      const c = canvasRef.current;
      if (!c) return;
      drawLine(data.x0 * c.width, data.y0 * c.height, data.x1 * c.width, data.y1 * c.height, data.color, data.size, false);
    };
    const onClear = () => {
      saveHistory();
      const c = canvasRef.current;
      c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    };
    const onUndo = (data: UndoEvent) => restoreCanvas(data?.imgData);
    const onFill = (data: FillEvent) => { saveHistory(); fillCanvas(data.color, false); };

    socket.on('draw', onDraw);
    socket.on('clear', onClear);
    socket.on('undo', onUndo);
    socket.on('fill', onFill);

    return () => {
      socket.off('draw', onDraw);
      socket.off('clear', onClear);
      socket.off('undo', onUndo);
      socket.off('fill', onFill);
    };
  }, [socket, drawLine, saveHistory, restoreCanvas, fillCanvas]);

  return { canvasRef, containerRef, undo, clearCanvas };
}
