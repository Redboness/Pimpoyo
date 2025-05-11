// src/App.tsx
import React, { useState, useEffect, useCallback, JSX } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import ProfileSetup from './components/ProfileSetup/ProfileSetup';
import ChatContainer from './components/ChatContainer/ChatContainer';
import GuidedAnalysisActivity from './components/GuidedAnalysisActivity/GuidedAnalysisActivity';
import './index.css'; 
import './App.css'; 

// Componente Auxiliar para Rutas Protegidas
const ProtectedRoute: React.FC<{ authToken: string | null; children: JSX.Element }> = ({ authToken, children }) => {
  if (!authToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Componente Auxiliar para la página de Login (redirige si ya está autenticado)
const LoginPage: React.FC<{ authToken: string | null; onAuthSuccess: (token: string) => void; }> = ({ authToken, onAuthSuccess }) => {
  if (authToken) {
    return <Navigate to="/" replace />; 
  }
  return <ProfileSetup onAuthSuccess={onAuthSuccess} />;
};

// Layout principal después del login
const MainLayout: React.FC<{ authToken: string | null; onLogout: () => void; children: React.ReactNode }> = ({ authToken, onLogout, children }) => {
  // const navigate = useNavigate(); // No es necesario aquí si la navegación está en los Link/botones
  const location = useLocation();

  if (!authToken) { // Esta verificación es redundante si MainLayout siempre está dentro de ProtectedRoute
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Pimpoyo Falso/Verdadero</h1>
        <nav>
          {location.pathname !== "/chat" && <Link to="/chat">Chat Principal</Link>}
          {location.pathname !== "/analisis-guiado" && <Link to="/analisis-guiado">Análisis Guiado</Link>}
          {/* Añade más enlaces a otras actividades aquí */}
          <button onClick={onLogout} className="logout-button-header">Cerrar Sesión</button>
        </nav>
      </header>
      <main className="main-content-area">
        {children}
      </main>
    </div>
  );
};


function App() {
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('authToken'));
  
  // ELIMINADO: const navigate = useNavigate(); // Esta línea causaba el error

  const handleAuthSuccessInApp = useCallback((token: string) => {
    console.log("App: Autenticación exitosa, token recibido.");
    localStorage.setItem('authToken', token);
    setAuthToken(token);
    // La navegación se maneja en AppWrapper
  }, []);

  const handleLogoutInApp = useCallback(() => {
    console.log("App: Cerrando sesión.");
    localStorage.removeItem('authToken');
    setAuthToken(null);
    // La navegación se maneja en AppWrapper
  }, []);

  useEffect(() => {
    if (authToken) {
      console.log("App: Token encontrado, aplicación cargada en modo autenticado.");
    } else {
      console.log("App: No hay token, se mostrará la página de login.");
    }
  }, [authToken]);

  const AppWrapper: React.FC = () => {
    const navigateInternal = useNavigate(); // Hook de navegación usado correctamente aquí

    useEffect(() => {
        if (!authToken && window.location.pathname !== '/login') { // Evita bucles si ya está en /login
            navigateInternal('/login', { replace: true });
        }
    }, [authToken, navigateInternal]);


    const memoizedHandleLogout = useCallback(() => {
        handleLogoutInApp(); 
        navigateInternal('/login', { replace: true }); 
    }, [handleLogoutInApp, navigateInternal]);

    const memoizedHandleAuthSuccess = useCallback((token: string) => {
        handleAuthSuccessInApp(token); 
        navigateInternal('/', { replace: true }); 
    }, [handleAuthSuccessInApp, navigateInternal]);


    return (
      <div className="App">
        <Routes>
          <Route path="/login" element={<LoginPage authToken={authToken} onAuthSuccess={memoizedHandleAuthSuccess} />} />
          
          <Route 
            path="/*" 
            element={
              <ProtectedRoute authToken={authToken}>
                <MainLayout authToken={authToken} onLogout={memoizedHandleLogout}>
                  <Routes> 
                    <Route path="/" element={
                      <ChatContainer 
                        authToken={authToken!} 
                        onLogout={memoizedHandleLogout} 
                      />
                    } />
                    <Route path="/chat" element={ 
                       <ChatContainer 
                        authToken={authToken!} 
                        onLogout={memoizedHandleLogout}
                      />
                    } />
                    <Route path="/analisis-guiado" element={<GuidedAnalysisActivity />} />
                    {/* <Route path="/desafio-noticias" element={<NewsChallengeActivity />} /> */}
                    <Route path="*" element={<Navigate to="/" replace />} /> 
                  </Routes>
                </MainLayout>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    );
  };

  return (
    <Router>
      <AppWrapper />
    </Router>
  );
}

export default App;
