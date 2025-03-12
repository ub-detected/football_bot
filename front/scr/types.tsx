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
}