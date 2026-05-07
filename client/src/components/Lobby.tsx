import { useState, useEffect } from 'react';
import { useSocketContext } from '../context/SocketContext';
import type { Player } from '../types';

interface LobbyProps {
  onJoin: (roomID: string, player: Player) => void;
  initialRoomID?: string;
}

export default function Lobby({ onJoin, initialRoomID }: LobbyProps) {
  const { socket, isConnected } = useSocketContext();
  const [name, setName] = useState('');
  const [roomID, setRoomID] = useState(initialRoomID || '');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [blobs, setBlobs] = useState<any[]>([]);

  useEffect(() => {
    // Generate random blobs for the background
    const colors = ['var(--yellow)', 'var(--pink)', 'var(--sky)', 'var(--mint)', 'var(--purple)', 'var(--coral)'];
    const newBlobs = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.floor(Math.random() * 50) + 20,
      left: Math.floor(Math.random() * 100),
      duration: Math.floor(Math.random() * 10) + 7,
      delay: Math.random() * 5
    }));
    setBlobs(newBlobs);
  }, []);

  const handleCreate = () => {
    if (!name.trim()) return setError('Please enter your name');
    if (!isConnected) return setError('Not connected to server');

    setIsJoining(true);
    socket.emit('create-room', { playerName: name }, (response: any) => {
      setIsJoining(false);
      if (response.success) {
        onJoin(response.roomID, response.player);
      } else {
        setError('Failed to create room');
      }
    });
  };

  const handleJoin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return setError('Please enter your name');
    // If no roomID is provided, create a public room (or just require it for now)
    if (!roomID.trim()) return handleCreate(); // Map empty play to create for now, or you could do random matchmaking
    if (!isConnected) return setError('Not connected to server');

    setIsJoining(true);
    socket.emit('join-room', { roomID: roomID.toUpperCase(), playerName: name }, (response: any) => {
      setIsJoining(false);
      if (response.success) {
        onJoin(response.roomID, response.player);
      } else {
        setError(response.error || 'Failed to join room');
      }
    });
  };

  return (
    <div className="lobby-wrapper">
      {/* Background Layer */}
      <div className="bg-layer">
        {['✏️', '🌟', '🖍️', '🎨', '🌈', '⭐', '💫', '🖌️'].map((emoji, i) => (
          <div key={`doodle-${i}`} className={`doodle doodle-${i}`}>{emoji}</div>
        ))}
        {blobs.map(blob => (
          <div 
            key={`blob-${blob.id}`} 
            className="blob" 
            style={{
              backgroundColor: blob.color,
              width: blob.size,
              height: blob.size,
              left: `${blob.left}vw`,
              animationDuration: `${blob.duration}s`,
              animationDelay: `${blob.delay}s`
            }}
          />
        ))}
      </div>

      {/* Main Card */}
      <div className="main-card">
        {/* Corner Stickers */}
        <div className="sticker sticker-tl">🌟</div>
        <div className="sticker sticker-tr">✨</div>
        <div className="sticker sticker-bl">🎯</div>
        <div className="sticker sticker-br">🎉</div>

        <div className="card-header">
          <h2 className="title">Let's <span className="highlight">Scribble!</span></h2>
          <p className="subtitle">Draw, guess & have a blast with friends 🎉</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div className="art-box">
          <div className="live-badge">✨ LIVE NOW</div>
          <div className="palette-emoji">🎨</div>
          <div className="color-dots">
            <div className="color-dot dot-pink"></div>
            <div className="color-dot dot-sky"></div>
            <div className="color-dot dot-mint"></div>
            <div className="color-dot dot-yellow"></div>
          </div>
        </div>

        <div className="inputs-section">
          <div className="input-group">
            <label>✍️ YOUR NAME</label>
            <input 
              type="text" 
              className="fun-input" 
              placeholder="What do your friends call you?" 
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              maxLength={15}
            />
          </div>

          <div className="input-group row-group">
            <div className="room-input-container">
              <label>🚪 ROOM ID</label>
              <input 
                type="text" 
                className="fun-input" 
                placeholder="Got a code?" 
                value={roomID}
                onChange={(e) => { setRoomID(e.target.value.toUpperCase()); setError(''); }}
                maxLength={6}
              />
            </div>
            <button className="btn-play" onClick={handleJoin} disabled={isJoining || !name}>
              PLAY! 🚀
            </button>
          </div>
        </div>

        <div className="divider">
          <span>OR</span>
        </div>

        <button className="btn-private" onClick={handleCreate} disabled={isJoining || !name}>
          🔒 Create a Private Room
        </button>

        <div className="footer-hint">
          New here? <a href="#" className="pink-link">Learn how to play →</a>
        </div>
      </div>

      {/* Fun Jokes Section to fill the scroll space! */}
      <div className="jokes-container">
        <h3>🎨 Artist Jokes While You Wait...</h3>
        <div className="joke-card">
          <p className="q">Why did the artist go to jail?</p>
          <p className="a">Because he was framed! 🖼️</p>
        </div>
        <div className="joke-card">
          <p className="q">What do you call a drawing that's struggling?</p>
          <p className="a">A sketchy situation. ✏️</p>
        </div>
        <div className="joke-card">
          <p className="q">How does an artist get around?</p>
          <p className="a">Easely! 🚕</p>
        </div>
      </div>
    </div>
  );
}
