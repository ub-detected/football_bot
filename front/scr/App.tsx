import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Leaderboard from './Leaderboard';
import Games from './Games';
import Profile from './Profile';
import GameRoom from './GameRoom';
import Navigation from './Navigation';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
        <Routes>
          <Route path="/" element={<Leaderboard />} />
          <Route path="/games" element={<Games />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/game-rooms/:roomId" element={<GameRoom />} />
        </Routes>
        <Navigation />
      </div>
    </BrowserRouter>
  );
}

export default App;
