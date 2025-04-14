// src/components/ProfileSetup/ProfileSetup.tsx
import React, { useState } from 'react';

// Interface for the data sent during registration API call
interface RegisterPayload {
  apodo: string;
  genero: string;
  edad: number; // API likely expects number
  password: string;
  consentimiento_obtenido: boolean;
}

// Interface for the props received from App.tsx
interface ProfileSetupProps {
  onAuthSuccess: (token: string) => void; // Callback after successful login
}

// Type for the different steps in registration mode
type RegisterStep = 'apodo' | 'genero' | 'edad' | 'final';

function ProfileSetup({ onAuthSuccess }: ProfileSetupProps) {
  // State: Current mode ('register' or 'login')
  const [mode, setMode] = useState<'register' | 'login'>('register');
  // State: Current step within registration flow
  const [step, setStep] = useState<RegisterStep>('apodo');

  // State: Unified form data storage
  const [formData, setFormData] = useState({
    apodo: '',
    genero: '', // Default empty or provide a default like 'prefiero_no_decir'
    edad: '', // Store as string from input, convert later
    password: '',
    confirmPassword: '',
    consentimiento: false,
  });

  // State: Error messages for the user
  const [error, setError] = useState<string>('');
  // State: Loading indicator for API calls
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // --- Handlers ---

  // Unified input change handler
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const newValue = type === 'checkbox' ? (event.target as HTMLInputElement).checked : value;
    setFormData(prevData => ({ ...prevData, [name]: newValue }));
    setError(''); // Clear error on input change
  };

  // Handler for moving to the next step in Registration
  const handleRegisterNextStep = (event?: React.MouseEvent<HTMLButtonElement> | React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    setError('');

    // --- Añadir estos logs para depurar ---
    console.log('Current step:', step);
    console.log('Current formData.genero:', formData.genero);
    // --- Fin de logs ---

    // Validar paso actual antes de avanzar
    if (step === 'apodo') {
      if (!formData.apodo.trim()) { setError('Por favor, introduce un nickname.'); return; }
      setStep('genero');
    } else if (step === 'genero') {
       // La validación está aquí:
      if (!formData.genero) {
         console.log('Validation failed: formData.genero is empty or null.'); // Log si falla
         setError('Por favor, selecciona un género.');
         return; // No avanza si no hay género seleccionado
      }
      // Si llega aquí, la validación pasó
      console.log('Validation passed for genero.');
      setStep('edad'); // <-- Debería llegar aquí si seleccionaste un género
    } else if (step === 'edad') {
       const edadNum = parseInt(formData.edad, 10);
       if (!formData.edad || isNaN(edadNum) || edadNum <= 0) { setError('Introduce una edad válida.'); return; }
       setStep('final');
    }
  };

  // Handler for final Registration submission
  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    // Final step validations
    if (!formData.password || formData.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (formData.password !== formData.confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    if (!formData.consentimiento) { setError('Debes aceptar el consentimiento informado.'); return; }

    setIsLoading(true);
    const edadNum = parseInt(formData.edad, 10); // Convert age string to number

    const registrationData: RegisterPayload = {
      apodo: formData.apodo.trim(),
      genero: formData.genero || 'prefiero_no_decir', // Handle case where genero might be ""
      edad: edadNum,
      password: formData.password,
      consentimiento_obtenido: formData.consentimiento,
    };

    try {
      // Use your actual register endpoint URL
      const response = await fetch('/api/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });
      setIsLoading(false);
      const responseData = await response.json();
      if (!response.ok) { throw new Error(responseData.detail || `Error: ${response.status}`); }

      console.log('Registration successful:', responseData);
      alert('¡Registro completado! Ahora puedes iniciar sesión.');
      setMode('login'); // Switch to login mode
      // Reset sensitive fields
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '', edad: '', genero: '' })); // Keep apodo for login convenience?

    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Error de conexión al registrarse.');
    }
  };

  // Handler for Login submission
  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.apodo.trim() || !formData.password) { setError('Por favor, introduce apodo y contraseña.'); return; }
    setError('');
    setIsLoading(true);

    const loginFormData = new URLSearchParams();
    loginFormData.append('username', formData.apodo.trim()); // FastAPI expects 'username'
    loginFormData.append('password', formData.password);

    try {
      // Use your actual token endpoint URL
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: loginFormData.toString(),
      });
      setIsLoading(false);
      const responseData = await response.json();
      if (!response.ok) { throw new Error(responseData.detail || `Error: ${response.status}`); }

      // On successful login, pass the token up to App.tsx
      onAuthSuccess(responseData.access_token);

    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Error de conexión al iniciar sesión.');
    }
  };


  // --- Render ---
  return (
    <div className="profile-setup-wrapper">

      {/* Selector de Modo (Aplicar clases para estilo) */}
      <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
        <button onClick={() => { setMode('register'); setStep('apodo'); setError(''); }} disabled={mode === 'register' || isLoading} className={`button-mode ${mode === 'register' ? 'active' : ''}`} style={{ marginRight: '10px' }}>Registrarse</button>
        <button onClick={() => { setMode('login'); setError(''); }} disabled={mode === 'login' || isLoading} className={`button-mode ${mode === 'login' ? 'active' : ''}`}>Iniciar Sesión</button>
      </div>

      {/* Formulario de LOGIN */}
      {mode === 'login' && (
        // Usamos la nueva clase genérica para el contenedor del paso
        <div className="step-container login-view" style={{ padding: '20px' }}>
          <h2>Iniciar Sesión</h2>
          {/* Usamos la clase original para el layout interno */}
          <form className="nickname-input-area" onSubmit={handleLoginSubmit}>
            {/* Input Apodo */}
            <input
              type="text"
              // Usamos CLASE en lugar de ID para estilo repetido
              className="form-input nickname-style-input" // Clase genérica + clase específica si se necesita
              id="login-apodo-input" // ID único para label (si hubiera)
              name="apodo" placeholder="Escribe tu nickname..."
              value={formData.apodo} onChange={handleInputChange} required disabled={isLoading}
            />
            {/* Input Password */}
            <input
              type="password"
              className="form-input password-style-input" // Clase genérica
              id="login-password-input" // ID único
              name="password" placeholder="Contraseña..."
              value={formData.password} onChange={handleInputChange} required disabled={isLoading}
              style={{ marginTop: '10px' }}
            />
            {/* Botón Login */}
            <button
              type="submit"
              // Usamos CLASE en lugar de ID para estilo repetido
              className="form-button nickname-style-button" // Clase genérica + clase específica si se necesita
              disabled={isLoading} style={{ marginTop: '10px' }}
            >
              {isLoading ? 'Iniciando...' : 'Entrar'}
            </button>
          </form>
          {/* Mensaje de Error */}
          {error && <p className="error-message" style={{ color: 'red', display: 'block', marginTop: '10px' }}>{error}</p>}
        </div>
      )}

       {/* Flujo de REGISTRO */}
       {mode === 'register' && (
         <div className="register-flow">
            {/* === PASO 1: APODO === */}
            {step === 'apodo' && (
             <div className="step-container"> {/* Clase para centrado/fondo */}
                <h2>¡Bienvenido/a a Pimpoyo!</h2>
                <p>Por favor, introduce un nickname para empezar:</p>
                <form className="nickname-input-area" onSubmit={handleRegisterNextStep}>
                    <input
                        type="text"
                        className="form-input" // Clase para estilo del input
                        id="register-apodo" // ID único
                        name="apodo" value={formData.apodo} onChange={handleInputChange}
                        placeholder="Escribe tu nickname..." maxLength={20} required disabled={isLoading}
                    />
                    <button type="submit" className="form-button" disabled={isLoading}>Siguiente</button> {/* Clase para estilo del botón */}
                </form>

                {/* --- NUEVO BOTÓN/ENLACE PARA LOGIN --- */}
                <div style={{ marginTop: '15px' }}> {/* Espacio extra */}
                  <button
                    type="button" // Importante para que no envíe el formulario de arriba
                    className="switch-mode-link" // Nueva clase para darle estilo de enlace
                    disabled={isLoading}
                    onClick={() => {
                        setMode('login'); // Cambia al modo login
                        setError(''); // Limpia cualquier error previo
                        // Opcional: Limpiar campos si es necesario al cambiar de modo
                        // setFormData(prev => ({...prev, password: '', confirmPassword: '', etc...}));
                    }}
                  >
                    ¿Ya tienes cuenta? Inicia Sesión
                  </button>
                </div>
                {/* --- FIN NUEVO BOTÓN/ENLACE --- */}
              {error && <p className="error-message" style={{ color: 'red', display: 'block' }}>{error}</p>}
            </div>
          )}

          {/* === PASO 2: GÉNERO === */}
          {step === 'genero' && (
            <div className="step-container gender-step-style"> {/* Clase genérica + específica */}
              <h2>Un poco más sobre ti...</h2>
              <p>Selecciona tu género:</p>
              {/* Área de input/botón - reutilizar clase si aplica */}
              <div className="nickname-input-area">
                <select
                  className="form-select" // Clase específica para select
                  id="register-genero" // ID único
                  name="genero" value={formData.genero} onChange={handleInputChange}
                  required disabled={isLoading}
                  style={{ width: 'auto', minWidth: '200px'}}
                >
                  <option value="">Selecciona...</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                  <option value="prefiero_no_decir">Prefiero no decirlo</option>
                </select>
                <button type="button" className="form-button nickname-style-button" onClick={handleRegisterNextStep} disabled={isLoading}>Siguiente</button>
              </div>
              {error && <p className="error-message" style={{ color: 'red', display: 'block' }}>{error}</p>}
            </div>
          )}

          {/* === PASO 3: EDAD === */}
          {step === 'edad' && (
             <div className="step-container age-step-style"> {/* Clase genérica + específica */}
              <h2>¡Casi listo!</h2>
              <p>Introduce tu edad:</p>
              <div className="nickname-input-area">
                <input
                  type="number"
                  className="form-input age-style-input" // Clase para estilo
                  id="register-edad" // ID único
                  name="edad" value={formData.edad} onChange={handleInputChange}
                  placeholder="Tu edad..." required min="1" disabled={isLoading}
                  style={{ width: 'auto', minWidth: '150px'}}
                />
                <button type="button" className="form-button nickname-style-button" onClick={handleRegisterNextStep} disabled={isLoading}>Siguiente</button>
              </div>
              {error && <p className="error-message" style={{ color: 'red', display: 'block' }}>{error}</p>}
            </div>
          )}

          {/* === PASO 4: FINAL (Contraseña + Consentimiento) === */}
          {step === 'final' && (
             <div className="step-container final-step-style"> {/* Clase genérica + específica */}
              <h2>Seguridad y Consentimiento</h2>
              <form className="final-step-area" onSubmit={handleRegisterSubmit} style={{ maxWidth: '450px', margin: '0 auto', textAlign: 'left' }}>
                {/* Inputs para password, confirmPassword, checkbox consentimiento */}
                {/* ... (Usar className="form-field", className="form-input", etc.) ... */}
                 <div className="form-field" style={{ marginBottom: '15px' }}>
                    <label htmlFor="register-password">Contraseña (mín. 8 caracteres):</label>
                    <input type="password" id="register-password" name="password" className="form-input" value={formData.password} onChange={handleInputChange} required minLength={8} disabled={isLoading} />
                </div>
                 <div className="form-field" style={{ marginBottom: '15px' }}>
                    <label htmlFor="register-confirmPassword">Confirmar Contraseña:</label>
                    <input type="password" id="register-confirmPassword" name="confirmPassword" className="form-input" value={formData.confirmPassword} onChange={handleInputChange} required minLength={8} disabled={isLoading} />
                </div>
                 <div className="form-field" style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px'}}>
                    <input type="checkbox" id="register-consentimiento" name="consentimiento" checked={formData.consentimiento} onChange={handleInputChange} required disabled={isLoading} />
                    <label htmlFor="register-consentimiento" style={{marginBottom: 0}}>He leído y acepto el consentimiento informado.</label>
                </div>
                <div style={{textAlign: 'center'}}>
                   <button type="submit" className="form-button nickname-style-button" disabled={isLoading}>{isLoading ? 'Registrando...' : 'Completar Registro'}</button>
                </div>
              </form>
              {error && <p className="error-message" style={{ color: 'red', textAlign: 'center', marginTop: '10px' }}>{error}</p>}
            </div>
          )}
        </div> // fin .register-flow
      )}
    </div> // fin .profile-setup-wrapper
  );
}


export default ProfileSetup;
