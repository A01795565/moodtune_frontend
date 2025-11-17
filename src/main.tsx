import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ensureInitialTheme } from './utils/theme';

// Punto de entrada de la aplicación React.
ensureInitialTheme();
const container = document.getElementById('root');
if (!container) throw new Error('#root no encontrado');

createRoot(container).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
