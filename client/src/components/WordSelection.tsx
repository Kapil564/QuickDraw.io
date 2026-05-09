import { useState, useEffect } from 'react';
import type { WordChoice } from '../types';

interface WordSelectionProps {
  choices: WordChoice[];
  timeLimit: number;
  onChoose: (word: string) => void;
}

const DIFFICULTY_STYLES: Record<string, { emoji: string; label: string; color: string }> = {
  easy: { emoji: '🟢', label: 'Easy', color: '#4cd964' },
  medium: { emoji: '🟡', label: 'Medium', color: '#ff9500' },
  hard: { emoji: '🔴', label: 'Hard', color: '#ff3b30' },
};

export default function WordSelection({ choices, timeLimit, onChoose }: WordSelectionProps) {
  const [timeLeft, setTimeLeft] = useState(Math.floor(timeLimit / 1000));
  const [picked, setPicked] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0 || picked) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [picked, timeLeft]);

  const handlePick = (word: string) => {
    if (picked) return;
    setPicked(true);
    onChoose(word);
  };

  return (
    <div className="word-selection-overlay">
      <div className="word-selection-card">
        <div className="ws-header">
          <h2>✏️ Choose a Word!</h2>
          <p className="ws-subtitle">Pick a word to draw for your friends</p>
        </div>

        <div className="ws-timer">
          <div
            className="ws-timer-bar"
            style={{
              width: `${(timeLeft / Math.floor(timeLimit / 1000)) * 100}%`,
              backgroundColor: timeLeft <= 5 ? '#ff3b30' : 'var(--sky)',
            }}
          />
          <span className="ws-timer-text">{timeLeft}s</span>
        </div>

        <div className="ws-choices">
          {choices.map((choice) => {
            const style = DIFFICULTY_STYLES[choice.difficulty] || DIFFICULTY_STYLES.easy;
            return (
              <button
                key={choice.word}
                className={`ws-word-btn ${picked ? 'disabled' : ''}`}
                onClick={() => handlePick(choice.word)}
                disabled={picked}
              >
                <span className="ws-difficulty" style={{ color: style.color }}>
                  {style.emoji} {style.label}
                </span>
                <span className="ws-word">{choice.word}</span>
              </button>
            );
          })}
        </div>

        {picked && (
          <p className="ws-picked-msg">Great choice! Get ready to draw! 🎨</p>
        )}
      </div>
    </div>
  );
}
