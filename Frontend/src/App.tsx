// src/App.tsx
// import React from 'react'; // Eliminado si usas JSX Transform moderno
import { useState, useEffect, useCallback } from 'react';
import ProfileSetup from './components/ProfileSetup/ProfileSetup';
import ChatContainer from './components/ChatContainer/ChatContainer';
import './index.css'; // Tus estilos globales

function App() {
  // ... (resto de tu código de App.tsx se mantiene igual)
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('authToken'));

  const handleAuthSuccess = useCallback((token: string) => {
    console.log("App: Autenticación exitosa, token recibido.");
    localStorage.setItem('authToken', token); 
    setAuthToken(token); 
  }, []); 

  const handleLogout = useCallback(() => {
    console.log("App: Cerrando sesión.");
    localStorage.removeItem('authToken'); 
    setAuthToken(null); 
  }, []);


   useEffect(() => {
     if (authToken) {
       console.log("App: Token encontrado, aplicación cargada en modo autenticado.");
     }
   }, [authToken, handleLogout]); // handleLogout es una dependencia si se usa en el efecto

  return (
    <div className="App">
      {!authToken ? (
        <ProfileSetup onAuthSuccess={handleAuthSuccess} />
      ) : (
        <ChatContainer authToken={authToken} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;