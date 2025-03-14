import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Leaderboard from './pages/Leaderboard';
import Games from './pages/Games';
import Profile from './pages/Profile';
import GameRoom from './pages/GameRoom';

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