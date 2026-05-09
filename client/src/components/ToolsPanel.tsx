import type { DrawingMode } from '../types';

const PRESET_COLORS = [
  { value: 'primary', label: '⚫', style: { backgroundColor: '#1a1a2e' } },
  { value: '#ff3b30', label: '', style: { backgroundColor: '#ff3b30' } },
  { value: '#ff9500', label: '', style: { backgroundColor: '#ff9500' } },
  { value: '#4cd964', label: '', style: { backgroundColor: '#4cd964' } },
  { value: '#5ac8fa', label: '', style: { backgroundColor: '#5ac8fa' } },
  { value: '#007aff', label: '', style: { backgroundColor: '#007aff' } },
  { value: '#5856d6', label: '', style: { backgroundColor: '#5856d6' } },
  { value: '#ffffff', label: '', style: { backgroundColor: '#ffffff' } },
];

interface ToolsPanelProps {
  color: string;
  onColorChange: (color: string) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  mode: DrawingMode;
  onModeChange: (mode: DrawingMode) => void;
  onUndo: () => void;
  onClear: () => void;
}

export default function ToolsPanel({
  color, onColorChange,
  brushSize, onBrushSizeChange,
  mode, onModeChange,
  onUndo, onClear,
}: ToolsPanelProps) {
  return (
    <div className="tools-panel">
      
      <div className="tool-group mode-selector">
        <button
          id="mode-brush"
          className={`mode-btn ${mode === 'brush' ? 'active' : ''}`}
          title="Brush"
          onClick={() => onModeChange('brush')}
        >
          🖌️
        </button>
        <button
          id="mode-fill"
          className={`mode-btn ${mode === 'fill' ? 'active' : ''}`}
          title="Fill"
          onClick={() => onModeChange('fill')}
        >
          🪣
        </button>
      </div>

      <div className="tool-group">
        <div className="colors">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              className={`color-btn ${color === c.value ? 'active' : ''}`}
              style={c.style}
              data-color={c.value}
              onClick={() => onColorChange(c.value)}
            />
          ))}
          <input
            type="color"
            id="color-picker"
            className="color-picker"
            value={color.startsWith('#') ? color : '#000000'}
            onChange={(e) => onColorChange(e.target.value)}
          />
        </div>
      </div>

      <div className="tool-group size-group">
        <label>
          Brush Size (<span id="brush-size-val">{brushSize}</span>px)
        </label>
        <input
          type="range"
          id="brush-size"
          min={1}
          max={50}
          value={brushSize}
          onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
        />
      </div>

      <div className="actions">
        <div className="action-row">
          <button id="undo-btn" className="action-btn secondary-btn" title="Undo" onClick={onUndo}>
            ↩️
          </button>
          <button id="clear-btn" className="action-btn clear-btn" title="Delete" onClick={onClear}>
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
