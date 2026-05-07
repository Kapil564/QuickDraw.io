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
  type: 'self' | 'other' | 'system';
}

export interface Player {
  id: string;
  name: string;
  avatarColor: string;
}

export type DrawingMode = 'brush' | 'fill';
export type ThemeMode = 'dark' | 'light';
