export type ReflectionMode = 'reflect' | 'summarize' | 'brainstorm' | 'action';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  modelUsed?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  initialPrompt: string;
  reflectionMode: ReflectionMode;
  tags: string[];
  messages: ChatMessage[];
  summary?: string;
  wordCount: number;
  createdAt: number;
  updatedAt: number;
  isFavorite?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface ReflectionModeConfig {
  id: ReflectionMode;
  label: string;
  description: string;
  badgeColor: string;
  placeholder: string;
  starterPrompts: string[];
}
