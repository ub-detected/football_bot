import { createRoot } from 'react-dom/client';
import React from 'react';
import App from './App';

const rootElement = document.getElementById('root');

if (rootElement) {
    createRoot(rootElement).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}