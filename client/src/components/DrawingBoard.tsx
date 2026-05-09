import type { ReactNode, RefObject } from 'react';
import type { DrawingMode } from '../types';

interface DrawingBoardProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  containerRef: RefObject<HTMLDivElement>;
  mode: DrawingMode;
  children?: ReactNode;
}

export default function DrawingBoard({ canvasRef, containerRef, mode, children }: DrawingBoardProps) {
  const cursorClass = mode === 'fill' ? 'cursor-fill' : 'cursor-brush';

  return (
    <div className="canvas-container" ref={containerRef}>
      {children}
      <canvas
        id="drawing-board"
        ref={canvasRef}
        className={cursorClass}
      />
    </div>
  );
}
