export interface User {
  id: number;
  username: string;
  photoUrl: string;
  score: number;
  gamesPlayed: number;
  gamesWon: number;
}

export interface GameRoom {
  id: number;
  name: string;
  creator: User;
  players: User[];
  maxPlayers: number;
  location: string;
  timeRange: string;
}