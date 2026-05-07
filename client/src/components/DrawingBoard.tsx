import type { RefObject } from 'react';
import type { DrawingMode } from '../types';

interface DrawingBoardProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  mode: DrawingMode;
}

export default function DrawingBoard({ canvasRef, containerRef, mode }: DrawingBoardProps) {
  const cursorClass = mode === 'fill' ? 'cursor-fill' : 'cursor-brush';

  return (
    <div className="canvas-container" ref={containerRef}>
      <canvas
        id="drawing-board"
        ref={canvasRef}
        className={cursorClass}
      />
    </div>
  );
}
