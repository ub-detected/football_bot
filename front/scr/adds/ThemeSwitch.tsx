import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { userApi } from '../api';
interface ThemeSwitchProps {
  initialTheme?: 'light' | 'dark';
}

export default ThemeSwitch; 