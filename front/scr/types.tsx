export interface User {
  id: number;
  username: string;
  photoUrl: string;
  score: number;
  gamesPlayed: number;
  gamesWon: number;
  themePreference?: 'light' | 'dark';
}
