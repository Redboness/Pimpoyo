// src/App.tsx
import { useState, useEffect, useCallback } from 'react';
import ProfileSetup from './components/ProfileSetup/ProfileSetup';
import ChatContainer from './components/ChatContainer/ChatContainer';
import './index.css';

/**
 * Componente raíz de la aplicación que gestiona el estado de autenticación.
 * Renderiza `ProfileSetup` para usuarios no autenticados o `ChatContainer`
 * para usuarios que ya han iniciado sesión.
 * @returns {React.ReactElement} El elemento div que envuelve la aplicación.
 */
function App() {
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('authToken'));

  /**
   * Callback para manejar una autenticación exitosa.
   * Guarda el token en localStorage y actualiza el estado de la aplicación.
   * @param {string} token - El token de autenticación recibido.
   */
  const handleAuthSuccess = useCallback((token: string) => {
    console.log("App: Autenticación exitosa, token recibido.");
    localStorage.setItem('authToken', token);
    setAuthToken(token);
  }, []);

  /**
   * Callback para manejar el cierre de sesión del usuario.
   * Limpia el token de localStorage y del estado de la aplicación.
   */
  const handleLogout = useCallback(() => {
    console.log("App: Cerrando sesión.");
    localStorage.removeItem('authToken');
    setAuthToken(null);
  }, []);

  /**
   * Efecto para registrar el estado de autenticación al cargar la aplicación.
   */
  useEffect(() => {
    if (authToken) {
      console.log("App: Token encontrado, aplicación cargada en modo autenticado.");
    }
  }, [authToken]);

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
