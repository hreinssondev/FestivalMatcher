export interface User {
  id: string;
  name: string;
  age: number;
  festival: string;
  ticketType: string;
  accommodationType: string;
  photos: string[];
  interests: string[];
  lastSeen: string;
  distance?: number;
}

export interface Match {
  id: string;
  user: User;
  matchedAt: Date;
  lastMessage?: Message;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
  isRead: boolean;
}

export interface SwipeAction {
  type: 'like' | 'dislike' | 'superlike';
  userId: string;
  timestamp: Date;
}

export interface Chat {
  id: string;
  matchId: string;
  messages: Message[];
  lastActivity: Date;
}

// Navigation types
export type RootStackParamList = {
  Main: undefined;
  Chat: { matchId: string; matchName: string; matchPhoto: string };
};

export type MainTabParamList = {
  Swipe: undefined;
  Map: undefined;
  Matches: undefined;
  Profile: undefined;
}; 