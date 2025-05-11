// src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import ProfileSetup from './components/ProfileSetup/ProfileSetup';
import ChatContainer from './components/ChatContainer/ChatContainer';
import './index.css'; // Tus estilos globales

function App() {
  // Estado para guardar el token de autenticación (ej. JWT)
  // Inicializa desde localStorage para comprobar si ya estaba logueado
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('authToken'));

  // Opcional: Estado para guardar la info del usuario decodificada del token o de una llamada API /users/me
  // const [userInfo, setUserInfo] = useState<UserProfile | null>(null);

  // Función callback para ProfileSetup tras login exitoso
  // Recibe el token de la respuesta de la API backend.
  const handleAuthSuccess = useCallback((token: string) => {
    console.log("App: Autenticación exitosa, token recibido.");
    localStorage.setItem('authToken', token); // Guarda el token para persistencia
    setAuthToken(token); // Actualiza el estado para re-renderizar y mostrar ChatContainer
    // Opcional: Podrías decodificar el token aquí o hacer una llamada a /users/me para obtener info del usuario
    // y guardarla en 'userInfo' si la necesitas.
  }, []); // useCallback para memorizar la función

  // Función para manejar el logout
  const handleLogout = useCallback(() => {
    console.log("App: Cerrando sesión.");
    localStorage.removeItem('authToken'); // Elimina el token del storage
    setAuthToken(null); // Actualiza el estado para volver a ProfileSetup
    // setUserInfo(null); // Limpia también la info del usuario si la usas
  }, []);


   useEffect(() => {
     if (authToken) {
       console.log("App: Token encontrado, aplicación cargada en modo autenticado.");
     }
   }, [authToken, handleLogout]);

  return (
    <div className="App"> {/* Contenedor principal de la aplicación */}
      {!authToken ? (
        // Si no hay token, muestra la pantalla ProfileSetup para login/registro
        <ProfileSetup onAuthSuccess={handleAuthSuccess} />
      ) : (
        // Si el token existe, muestra la aplicación principal de chat
        // Pasa el token y la función de logout a ChatContainer
        <ChatContainer authToken={authToken} onLogout={handleLogout} /* userInfo={userInfo} */ />
        // Podrías pasar userInfo también si ChatContainer lo necesita
      )}
    </div>
  );
}

export default App;
