import { useState, useEffect } from 'react';
import { useSocketContext } from './context/SocketContext';
import { useTheme } from './hooks/useTheme';
import { useCanvas } from './hooks/useCanvas';
import TopBar from './components/TopBar';
import DrawingBoard from './components/DrawingBoard';
import ToolsPanel from './components/ToolsPanel';
import ChatPanel from './components/ChatPanel';
import Lobby from './components/Lobby';
import type { DrawingMode, Player } from './types';

export default function App() {
  const { socket } = useSocketContext();
  const { theme, toggleTheme } = useTheme();

  // Room state
  const [roomID, setRoomID] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  // Drawing tool state
  const [color, setColor] = useState('primary');
  const [brushSize, setBrushSize] = useState(5);
  const [mode, setMode] = useState<DrawingMode>('brush');

  const { canvasRef, containerRef, undo, clearCanvas } = useCanvas({
    socket, color, brushSize, mode, theme,
  });

  // Extract initial room from URL: ?room=XYZ
  const urlParams = new URLSearchParams(window.location.search);
  const initialRoomID = urlParams.get('room') || undefined;

  useEffect(() => {
    socket.on('player-list', (list: Player[]) => {
      setPlayers(list);
    });

    return () => {
      socket.off('player-list');
    };
  }, [socket]);

  const handleJoin = (id: string, p: Player) => {
    setRoomID(id);
    setPlayer(p);
    // Update URL without reloading
    window.history.pushState({}, '', `?room=${id}`);
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Room link copied to clipboard!');
  };

  return (
    <div className="app-container">
      <TopBar theme={theme} onToggleTheme={toggleTheme} />
      
      {!roomID ? (
        <Lobby onJoin={handleJoin} initialRoomID={initialRoomID} />
      ) : (
        <main className="main-content">
          <div className="board-area">
            <div className="room-header">
              <div className="room-info">
                Room: <strong>{roomID}</strong>
                <button onClick={copyRoomLink} className="copy-btn" title="Copy Invite Link">🔗</button>
              </div>
              <div className="players-list">
                {players.map(p => (
                  <div key={p.id} className="player-avatar" style={{ backgroundColor: p.avatarColor }} title={p.name}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
            
            <DrawingBoard canvasRef={canvasRef} containerRef={containerRef} mode={mode} />
            <ToolsPanel
              color={color} onColorChange={setColor}
              brushSize={brushSize} onBrushSizeChange={setBrushSize}
              mode={mode} onModeChange={setMode}
              onUndo={undo} onClear={clearCanvas}
            />
          </div>
          <ChatPanel />
        </main>
      )}
    </div>
  );
}
