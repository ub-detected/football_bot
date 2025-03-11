import { NavLink } from 'react-router-dom';
import { Trophy, GamepadIcon, User } from 'lucide-react';

const Navigation = () => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 glass-effect border-t border-white/20 max-w-md mx-auto">
            <div className="flex justify-around items-center h-16">
                <NavLink
                    to="/"
                    className={({ isActive }) =>
                        `flex flex-col items-center w-1/3 py-1 ${
                            isActive ? 'text-green-600 font-semibold active-tab' : 'text-gray-600'
                        }`
                    }
                >
                    <Trophy size={24} />
                    <span className="text-xs mt-1">Leaderboard</span>
                </NavLink>
                <NavLink
          to="/games"
          className={({ isActive }) =>
            `flex flex-col items-center w-1/3 py-1 ${
              isActive 
                ? 'text-green-600 font-semibold active-tab' 
                : 'text-gray-600'
            }`
          }
        >
          <GamepadIcon size={24} />
          <span className="text-xs mt-1">Games</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex flex-col items-center w-1/3 py-1 ${
              isActive 
                ? 'text-green-600 font-semibold active-tab' 
                : 'text-gray-600'
            }`
          }
        >
          <User size={24} />
          <span className="text-xs mt-1">Profile</span>
        </NavLink>      
            </div>
        </nav>

    );
};

export default Navigation;