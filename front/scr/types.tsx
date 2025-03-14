export interface User {
  id: number;
  username: string;
  photoUrl: string;
  score: number;
  gamesPlayed: number;
  gamesWon: number;
  themePreference?: 'light' | 'dark';
}

export interface GameHistory {
  id: number;
  user: User;
  wasWinner: boolean;
  team: string;
  scoreA: number;
  scoreB: number;
  wasCaptain: boolean;
  result: string;
  pointsEarned: number;
  playedAt: string;
  createdAt: string;
  gameStartTime?: string;
  gameEndTime?: string;
  gameDuration?: string;
  gameRoom: GameRoom;
}

export interface GameRoom {
  id: number;
  name: string;
  creator: User;
  players: User[];
  maxPlayers: number;
  location: string;
  timeRange: string;
  status: 'waiting' | 'team_selection' | 'in_progress' | 'score_submission' | 'completed';
  teamA: User[];
  teamB: User[];
  captainA: User | null;
  captainB: User | null;
  scoreA: number | null;
  scoreB: number | null;
  captainASubmitted: boolean;
  captainBSubmitted: boolean;
  scoreMismatch: boolean;
  scoreSubmissionAttempts: number;
  startTime?: string;
  endTime?: string;
}

export interface Complaint {
  id: number;
  reporter: User;
  reportedUser: User;
  gameRoom: GameRoom;
  reason: string;
  createdAt: string;
}