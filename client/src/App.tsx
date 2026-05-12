import { useState, useEffect, useCallback } from 'react';
import { useSocketContext } from './context/SocketContext';
import { useTheme } from './hooks/useTheme';
import { useCanvas } from './hooks/useCanvas';
import TopBar from './components/TopBar';
import DrawingBoard from './components/DrawingBoard';
import ToolsPanel from './components/ToolsPanel';
import ChatPanel from './components/ChatPanel';
import Lobby from './components/Lobby';
import WordSelection from './components/WordSelection';
import type { DrawingMode, Player, GameState, WordChoice } from './types';

export default function App() {
  const { socket } = useSocketContext();
  const { theme, toggleTheme } = useTheme();

  const [roomID, setRoomID] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  const [gameState, setGameState] = useState<GameState>({ state: 'waiting' });
  const [wordChoices, setWordChoices] = useState<WordChoice[] | null>(null);
  const [wordTimeLimit, setWordTimeLimit] = useState(15000);
  const [localTimeLeft, setLocalTimeLeft] = useState<number | null>(null);

  const [color, setColor] = useState('primary');
  const [brushSize, setBrushSize] = useState(5);
  const [mode, setMode] = useState<DrawingMode>('brush');

  const { canvasRef, containerRef, undo, clearCanvas } = useCanvas({
    socket, color, brushSize, mode, theme,
    canDraw: gameState.drawerId === socket.id,
  });

  const urlParams = new URLSearchParams(window.location.search);
  const initialRoomID = urlParams.get('room') || undefined;

  useEffect(() => {
    socket.on('player-list', (list: Player[]) => {
      setPlayers(list);
    });

    socket.on('word-choices', ({ choices, timeLimit }: { choices: WordChoice[]; timeLimit: number }) => {
      setWordChoices(choices);
      setWordTimeLimit(timeLimit);
      setGameState(prev => ({ ...prev, state: 'choosing' }));
    });

    socket.on('game-state', (state: GameState) => {
      setGameState(state);
      
      if (state.state !== 'choosing') {
        setWordChoices(null);
      }
      if (state.timeLeft !== undefined) {
        setLocalTimeLeft(state.timeLeft);
      } else {
        setLocalTimeLeft(null);
      }
    });

    socket.on('word-assigned', ({ word }: { word: string }) => {
      setWordChoices(null);
      setGameState(prev => ({ ...prev, state: 'drawing', currentWord: word }));
    });

    return () => {
      socket.off('player-list');
      socket.off('word-choices');
      socket.off('game-state');
      socket.off('word-assigned');
    };
  }, [socket]);

  useEffect(() => {
    if (localTimeLeft === null || localTimeLeft <= 0 || gameState.state !== 'drawing') return;
    const interval = setInterval(() => {
      setLocalTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [localTimeLeft, gameState.state]);

  const handleJoin = (id: string, p: Player) => {
    setRoomID(id);
    setPlayer(p);
    setGameState({ state: 'waiting' });
    window.history.pushState({}, '', `?room=${id}`);
  };

  const copyRoomID = () => {
    if (roomID) {
      navigator.clipboard.writeText(roomID);
      alert('Room ID copied to clipboard!');
    }
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Room link copied to clipboard!');
  };

  const exitRoom = () => {
    socket.emit('leave-room', { roomID });
    setRoomID(null);
    setPlayer(null);
    setPlayers([]);
    setGameState({ state: 'waiting' });
    setWordChoices(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  const startGame = useCallback(() => {
    socket.emit('start-game', (response: any) => {
      if (!response.success) {
        alert(response.error || 'Failed to start game');
      }
    });
  }, [socket]);

  const chooseWord = useCallback((word: string) => {
    socket.emit('choose-word', { word }, (response: any) => {
      if (!response.success) {
        console.error('Choose word failed:', response.error);
      }
    });
  }, [socket]);

  const isDrawer = gameState.drawerId === socket.id;
  const isAdmin = player?.role === 'admin';
  const isWaiting = gameState.state === 'waiting';
  const isChoosing = gameState.state === 'choosing';
  const isDrawing = gameState.state === 'drawing';
  const isRoundEnd = gameState.state === 'roundEnd';

  return (
    <div className="app-container">
      <TopBar theme={theme} onToggleTheme={toggleTheme} />
      
      {!roomID ? (
        <Lobby onJoin={handleJoin} initialRoomID={initialRoomID} />
      ) : (
        <main className="main-content">
          <div className="board-area">
            <DrawingBoard canvasRef={canvasRef} containerRef={containerRef} mode={mode} canDraw={isDrawer}>
              
              <div className="room-header floating-room-header">
                <div className="room-info">
                  Room: <strong onClick={copyRoomID} style={{ cursor: 'pointer' }} title="Click to copy ID">{roomID}</strong>
                  <button onClick={copyRoomID} className="copy-btn" title="Copy Room ID">📋</button>
                  <button onClick={copyRoomLink} className="copy-btn" title="Copy Invite Link">🔗</button>
                  <button onClick={exitRoom} className="exit-btn" title="Exit Room">🚪</button>
                </div>
                <div className="players-list">
                  {players.map(p => (
                    <div
                      key={p.id}
                      className={`player-avatar ${p.role === 'admin' ? 'is-admin' : ''} ${gameState.drawerId === p.id ? 'is-drawing' : ''}`}
                      style={{ backgroundColor: p.avatarColor }}
                      title={`${p.name}${p.role === 'admin' ? ' (Admin)' : ''}${gameState.drawerId === p.id ? ' ✏️ Drawing' : ''}`}
                    >
                      {gameState.drawerId === p.id && <span className="drawer-pencil">✏️</span>}
                      {p.role === 'admin' && gameState.drawerId !== p.id && <span className="admin-crown">👑</span>}
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>

              {!isWaiting && (
                <div className="game-status-bar">
                  {isChoosing && !isDrawer && (
                    <span>🎨 <strong>{gameState.drawerName}</strong> is choosing a word...</span>
                  )}
                  {isDrawing && isDrawer && (
                    <span>✏️ Draw: <strong className="secret-word">{gameState.currentWord}</strong></span>
                  )}
                  {isDrawing && !isDrawer && (
                    <span>🤔 Guess the word: <strong className="word-hint">{gameState.hint}</strong></span>
                  )}
                  {isRoundEnd && (
                    <span>Round over! The word was: <strong className="secret-word">{gameState.currentWord}</strong></span>
                  )}
                  {isDrawing && localTimeLeft !== null && (
                    <span className="timer" style={{ marginLeft: 'auto', fontWeight: 'bold' }}>⏱️ {localTimeLeft}s</span>
                  )}
                </div>
              )}

              {isChoosing && wordChoices && (
                <WordSelection
                  choices={wordChoices}
                  timeLimit={wordTimeLimit}
                  onChoose={chooseWord}
                />
              )}

              {isWaiting && isAdmin && players.length >= 2 && (
                <button className="start-game-btn" onClick={startGame}>
                  🎮 Start Game
                </button>
              )}
            </DrawingBoard>
            <ToolsPanel
              color={color} onColorChange={setColor}
              brushSize={brushSize} onBrushSizeChange={setBrushSize}
              mode={mode} onModeChange={setMode}
              onUndo={undo} onClear={clearCanvas}
              disabled={!isDrawer}
            />
          </div>
          <ChatPanel playerName={player?.name} />
        </main>
      )}
    </div>
  );
}
