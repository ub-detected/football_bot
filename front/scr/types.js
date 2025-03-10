  export class User {
    constructor(id, username, photoUrl, score, gamesPlayed, gamesWon, themePreference) {
        this.id = id;
        this.username = username;
        this.photoUrl = photoUrl;
        this.score = score;
        this.gamesPlayed = gamesPlayed;
        this.gamesWon = gamesWon;
        this.themePreference = themePreference;
    }
}

export class GameRoom {
  constructor(
      id, name, creator, players, maxPlayers, location, timeRange, status,
      teamA, teamB, captainA, captainB, scoreA, scoreB, 
      captainASubmitted, captainBSubmitted, scoreMismatch, scoreSubmissionAttempts,
      startTime, endTime
  ) {
      this.id = id;
      this.name = name;
      this.creator = creator;
      this.players = players;
      this.maxPlayers = maxPlayers;
      this.location = location;
      this.timeRange = timeRange;
      this.status = status;
      this.teamA = teamA;
      this.teamB = teamB;
      this.captainA = captainA;
      this.captainB = captainB;
      this.scoreA = scoreA;
      this.scoreB = scoreB;
      this.captainASubmitted = captainASubmitted;
      this.captainBSubmitted = captainBSubmitted;
      this.scoreMismatch = scoreMismatch;
      this.scoreSubmissionAttempts = scoreSubmissionAttempts;
      this.startTime = startTime;
      this.endTime = endTime;
  }
}