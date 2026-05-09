import type { ThemeMode } from '../types';
import ConnectionStatus from './ConnectionStatus';

interface TopBarProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export default function TopBar({ theme, onToggleTheme }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="logo">
        <span className="logo-pill">Scribble</span>
        <span className="logo-text">Board</span>
      </div>
      <div className="topbar-right">
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <ConnectionStatus />
      </div>
    </header>
  );
}
