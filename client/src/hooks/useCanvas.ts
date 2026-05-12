import { useRef, useEffect, useCallback, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { DrawEvent, DrawingMode, FillEvent, UndoEvent, ThemeMode } from '../types';

interface UseCanvasOptions {
  socket: Socket;
  color: string;
  brushSize: number;
  mode: DrawingMode;
  theme: ThemeMode;
  canDraw: boolean;
}

export function useCanvas({ socket, color, brushSize, mode, canDraw }: UseCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);

  const isDrawing = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const history = useRef<string[]>([]);

  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  const modeRef = useRef(mode);

  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    if (canvasRef.current && containerRef.current) {
      setMounted(true);
      return;
    }
    const id = setInterval(() => {
      if (canvasRef.current && containerRef.current) {
        setMounted(true);
        clearInterval(id);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  const resolveColor = useCallback((c: string) => {
    return c === 'primary' ? '#1a1a2e' : c;
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

    const dpr = window.devicePixelRatio || 1;

    if (!dataUrl) {
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);
      return;
    }

    const img = new Image();
    img.onload = () => {
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      ctx.scale(dpr, dpr);
    };
    img.src = dataUrl;
  }, []);

    const drawSegment = useCallback(
    (x0: number, y0: number, x1: number, y1: number, lineColor: string, size: number) => {
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
    },
    [resolveColor],
  );

  const fillCanvas = useCallback(
    (fillColor: string, emit: boolean) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      
      ctx.fillStyle = resolveColor(fillColor);
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      if (emit) socket.emit('fill', { color: fillColor });
    },
    [socket, resolveColor],
  );

  const undo = useCallback(() => {
    if (history.current.length > 0) {
      const prev = history.current.pop()!;
      restoreCanvas(prev);
      socket.emit('undo', { imgData: prev });
    }
  }, [socket, restoreCanvas]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    saveHistory();
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);
    }
    socket.emit('clear');
  }, [socket, saveHistory]);

  useEffect(() => {
    if (!mounted) return;                       
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let resizeTimeout: ReturnType<typeof setTimeout>;

    const resize = () => {
      const cssWidth = container.clientWidth;
      const cssHeight = container.clientHeight;
      if (cssWidth === 0 || cssHeight === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(cssWidth * dpr);
      const targetH = Math.round(cssHeight * dpr);
      if (canvas.width === targetW && canvas.height === targetH) return;

      const snapshot = canvas.toDataURL();

      canvas.style.width = cssWidth + 'px';
      canvas.style.height = cssHeight + 'px';

      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(dpr, dpr);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, cssWidth, cssHeight);
      img.src = snapshot;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resize, 50);
    });
    observer.observe(container);
    resize();                                   

    return () => {
      observer.disconnect();
      clearTimeout(resizeTimeout);
    };
  }, [mounted]);                                

  useEffect(() => {
    if (!mounted) return;
    // Non-drawers: no interaction handlers attached
    if (!canDraw) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    function getXY(e: MouseEvent | TouchEvent) {
      const rect = canvas!.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ('touches' in e) {
        const t = e.touches[0] ?? e.changedTouches[0];
        clientX = t.clientX;
        clientY = t.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    }

    function onDown(e: MouseEvent | TouchEvent) {
      if ('button' in e && e.button !== 0) return;

      saveHistory();

      if (modeRef.current === 'fill') {
        fillCanvas(colorRef.current, true);
        return;
      }

      isDrawing.current = true;
      const { x, y } = getXY(e);
      lastX.current = x;
      lastY.current = y;

      drawSegment(x, y, x, y, colorRef.current, brushSizeRef.current);
      socket.emit('draw', {
        x0: x / canvas!.clientWidth,
        y0: y / canvas!.clientHeight,
        x1: x / canvas!.clientWidth,
        y1: y / canvas!.clientHeight,
        color: colorRef.current,
        size: brushSizeRef.current,
      });
    }

    function onMove(e: MouseEvent | TouchEvent) {
      if (!isDrawing.current) return;
      if (e.cancelable) e.preventDefault();

      const { x, y } = getXY(e);
      if (x === lastX.current && y === lastY.current) return;

      drawSegment(lastX.current, lastY.current, x, y, colorRef.current, brushSizeRef.current);
      socket.emit('draw', {
        x0: lastX.current / canvas!.clientWidth,
        y0: lastY.current / canvas!.clientHeight,
        x1: x / canvas!.clientWidth,
        y1: y / canvas!.clientHeight,
        color: colorRef.current,
        size: brushSizeRef.current,
      });

      lastX.current = x;
      lastY.current = y;
    }

    function onUp() {
      isDrawing.current = false;
    }

    const opts: AddEventListenerOptions = { passive: false };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    canvas.addEventListener('touchstart', onDown, opts);
    canvas.addEventListener('touchmove', onMove, opts);
    window.addEventListener('touchend', onUp);

    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);

      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [mounted, canDraw, drawSegment, fillCanvas, saveHistory, socket]);

  useEffect(() => {
    function onRemoteDraw(data: DrawEvent) {
      const c = canvasRef.current;
      if (!c) return;
      drawSegment(
        data.x0 * c.clientWidth,
        data.y0 * c.clientHeight,
        data.x1 * c.clientWidth,
        data.y1 * c.clientHeight,
        data.color,
        data.size,
      );
    }

    function onRemoteClear() {
      saveHistory();
      const c = canvasRef.current;
      const ctx = c?.getContext('2d');
      if (c && ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.scale(dpr, dpr);
      }
    }

    function onRemoteUndo(data: UndoEvent) {
      restoreCanvas(data?.imgData);
    }

    function onRemoteFill(data: FillEvent) {
      saveHistory();
      fillCanvas(data.color, false);
    }

    socket.on('draw', onRemoteDraw);
    socket.on('clear', onRemoteClear);
    socket.on('undo', onRemoteUndo);
    socket.on('fill', onRemoteFill);

    return () => {
      socket.off('draw', onRemoteDraw);
      socket.off('clear', onRemoteClear);
      socket.off('undo', onRemoteUndo);
      socket.off('fill', onRemoteFill);
    };
  }, [socket, drawSegment, saveHistory, restoreCanvas, fillCanvas]);

  return { canvasRef, containerRef, undo, clearCanvas };
}
