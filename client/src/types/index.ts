export interface DrawEvent {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  size: number;
}

export interface ChatMessageData {
  text: string;
  senderId: string;
  senderName?: string;
}

export interface FillEvent {
  color: string;
}

export interface UndoEvent {
  imgData?: string;
}

export interface DisplayMessage {
  id: string;
  text: string;
  type: 'self' | 'other' | 'system' | 'correct' | 'close';
  senderName?: string;
}

export interface Player {
  id: string;
  name: string;
  avatarColor: string;
  role: 'admin' | 'player';
}

export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
  avatarColor: string;
  role: 'admin' | 'player';
}

export type DrawingMode = 'brush' | 'fill';
export type ThemeMode = 'dark' | 'light';
export type GamePhase = 'waiting' | 'choosing' | 'drawing' | 'roundEnd' | 'gameOver';

export interface WordChoice {
  word: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GameState {
  state: GamePhase;
  drawerId?: string;
  drawerName?: string;
  round?: number;
  maxRounds?: number;
  currentTurn?: number;
  totalTurnsPerRound?: number;
  hint?: string;
  wordLength?: number;
  currentWord?: string;
  timeLeft?: number;
  scoreboard?: ScoreEntry[];
  winnerName?: string;
}
