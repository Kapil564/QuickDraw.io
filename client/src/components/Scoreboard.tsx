import { useEffect, useState } from 'react';
import type { ScoreEntry } from '../types';

interface ScoreboardProps {
  isRoundEnd: boolean;
  isGameOver: boolean;
  scoreboard: ScoreEntry[];
  currentWord?: string;
  round?: number;
  maxRounds?: number;
  currentTurn?: number;
  totalTurnsPerRound?: number;
  winnerName?: string;
  myId?: string;
  isAdmin: boolean;
  onPlayAgain: () => void;
}

const MEDALS = ['🥇', '🥈', '🥉'];
const ROUND_END_DURATION = 7; // must match server timeout (7s)

export default function Scoreboard({
  isRoundEnd,
  isGameOver,
  scoreboard,
  currentWord,
  round,
  maxRounds,
  currentTurn,
  totalTurnsPerRound,
  winnerName,
  myId,
  isAdmin,
  onPlayAgain,
}: ScoreboardProps) {
  const [countdown, setCountdown] = useState(ROUND_END_DURATION);

  // Reset and tick countdown each time roundEnd appears
  useEffect(() => {
    if (!isRoundEnd || isGameOver) return;
    setCountdown(ROUND_END_DURATION);
    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRoundEnd, isGameOver]);

  if (!isRoundEnd && !isGameOver) return null;

  return (
    <div className="scoreboard-overlay">
      <div className={`scoreboard-card ${isGameOver ? 'sb-game-over' : ''}`}>

        {/* ── ROUND END ── */}
        {!isGameOver && (
          <>
            <div className="sb-header">
              <span className="sb-round-badge">
                Round {round} / {maxRounds}
                {currentTurn != null && totalTurnsPerRound != null && (
                  <span className="sb-turn-tag"> &mdash; Turn {currentTurn} / {totalTurnsPerRound}</span>
                )}
              </span>
              <h2 className="sb-title">⏱️ Round Over!</h2>
              {currentWord && (
                <p className="sb-word-reveal">
                  The word was <span className="sb-word">{currentWord}</span>
                </p>
              )}
            </div>

            {/* Countdown bar */}
            <div className="sb-countdown-track">
              <div
                className="sb-countdown-bar"
                style={{ width: `${(countdown / ROUND_END_DURATION) * 100}%` }}
              />
              <span className="sb-countdown-label">Next round in {countdown}s</span>
            </div>
          </>
        )}

        {/* ── GAME OVER ── */}
        {isGameOver && (
          <div className="sb-header">
            <h2 className="sb-title">🏆 Game Over!</h2>
            {winnerName && (
              <p className="sb-winner-text">
                🎉 <strong>{winnerName}</strong> wins!
              </p>
            )}
          </div>
        )}

        {/* ── LEADERBOARD ── */}
        <ol className="sb-list">
          {scoreboard.map((entry, idx) => (
            <li
              key={entry.id}
              className={`sb-row ${entry.id === myId ? 'sb-row-me' : ''} ${idx === 0 ? 'sb-row-first' : ''}`}
            >
              <span className="sb-rank">
                {idx < 3 ? MEDALS[idx] : `${idx + 1}.`}
              </span>
              <span
                className="sb-avatar"
                style={{ backgroundColor: entry.avatarColor }}
              >
                {entry.name.charAt(0).toUpperCase()}
              </span>
              <span className="sb-name">
                {entry.name}
                {entry.id === myId && <span className="sb-you-tag"> (you)</span>}
              </span>
              <span className="sb-score">{entry.score.toLocaleString()} pts</span>
            </li>
          ))}
        </ol>

        {/* ── PLAY AGAIN (game over, admin only) ── */}
        {isGameOver && isAdmin && (
          <button className="sb-play-again-btn" onClick={onPlayAgain}>
            🎮 Play Again
          </button>
        )}
        {isGameOver && !isAdmin && (
          <p className="sb-waiting-text">Waiting for admin to start a new game…</p>
        )}
      </div>
    </div>
  );
}
