import type { ReactNode, RefObject } from 'react';
import type { DrawingMode } from '../types';

interface DrawingBoardProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  mode: DrawingMode;
  canDraw?: boolean;
  children?: ReactNode;
}

export default function DrawingBoard({ canvasRef, containerRef, mode, canDraw = true, children }: DrawingBoardProps) {
  const cursorClass = !canDraw ? 'cursor-default' : mode === 'fill' ? 'cursor-fill' : 'cursor-brush';

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
