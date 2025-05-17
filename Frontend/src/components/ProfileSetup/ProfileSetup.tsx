// src/components/ProfileSetup/ProfileSetup.tsx
import React, { useState } from 'react';

// Interface for the data sent during registration API call
interface RegisterPayload {
  apodo: string;
  genero: string;
  edad: number; // API likely expects number
  password: string;
  consentimiento_obtenido: boolean;
  curso_escolar: string; // Asegúrate que tu backend espera este campo
}

// Interface for the props received from App.tsx
interface ProfileSetupProps {
  onAuthSuccess: (token: string) => void; // Callback after successful login
}

// Type for the different steps in registration mode
type RegisterStep = 'apodo' | 'genero' | 'edad' | 'curso' | 'final'; // 'curso' añadido

function ProfileSetup({ onAuthSuccess }: ProfileSetupProps) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [step, setStep] = useState<RegisterStep>('apodo');

  const [formData, setFormData] = useState({
    apodo: '',
    genero: '', 
    edad: '', 
    curso_escolar: '', // Campo añadido para el curso escolar
    password: '',
    confirmPassword: '',
    consentimiento: false,
  });

  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const newValue = type === 'checkbox' ? (event.target as HTMLInputElement).checked : value;
    setFormData(prevData => ({ ...prevData, [name]: newValue }));
    setError(''); 
  };

  const handleRegisterNextStep = (event?: React.MouseEvent<HTMLButtonElement> | React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    setError('');

    if (step === 'apodo') {
      if (!formData.apodo.trim()) { setError('Por favor, introduce un nickname.'); return; }
      setStep('genero');
    } else if (step === 'genero') {
      if (!formData.genero) { 
         setError('Por favor, selecciona un género.');
         return; 
      }
      setStep('edad'); 
    } else if (step === 'edad') {
       const edadNum = parseInt(formData.edad, 10);
       if (!formData.edad || isNaN(edadNum) || edadNum <= 0) { setError('Introduce una edad válida.'); return; }
       setStep('curso'); // <--- CORRECCIÓN: Ir al paso 'curso'
    } else if (step === 'curso') { 
       if (!formData.curso_escolar) { setError('Por favor, selecciona tu curso.'); return; }
       setStep('final'); 
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!formData.password || formData.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (formData.password !== formData.confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    if (!formData.consentimiento) { setError('Debes aceptar el consentimiento informado.'); return; }
    if (!formData.curso_escolar) { setError('Por favor, selecciona tu curso antes de finalizar.'); return; } // Validación adicional por si acaso

    setIsLoading(true);
    const edadNum = parseInt(formData.edad, 10);

    const registrationData: RegisterPayload = {
      apodo: formData.apodo.trim(),
      genero: formData.genero || 'prefiero_no_decir', 
      edad: edadNum,
      password: formData.password,
      consentimiento_obtenido: formData.consentimiento,
      curso_escolar: formData.curso_escolar, // <--- CORRECCIÓN: Usar el valor del estado
    };

    try {
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
      setMode('login'); 
      setFormData(prev => ({ 
        ...prev, 
        password: '', 
        confirmPassword: '', 
        // Resetea también los campos de información personal tras un registro exitoso
        edad: '', 
        genero: '',
        curso_escolar: '',
        consentimiento: false // Podrías querer resetear esto también
      }));

    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Error de conexión al registrarse.');
    }
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.apodo.trim() || !formData.password) { setError('Por favor, introduce apodo y contraseña.'); return; }
    setError('');
    setIsLoading(true);

    const loginFormData = new URLSearchParams();
    loginFormData.append('username', formData.apodo.trim());
    loginFormData.append('password', formData.password);

    try {
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: loginFormData.toString(),
      });
      setIsLoading(false);
      const responseData = await response.json();
      if (!response.ok) { throw new Error(responseData.detail || `Error: ${response.status}`); }
      onAuthSuccess(responseData.access_token);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Error de conexión al iniciar sesión.');
    }
  };

  return (
    <div className="profile-setup-wrapper">
      <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
        <button onClick={() => { setMode('register'); setStep('apodo'); setError(''); }} disabled={mode === 'register' || isLoading} className={`button-mode ${mode === 'register' ? 'active' : ''}`} style={{ marginRight: '10px' }}>Registrarse</button>
        <button onClick={() => { setMode('login'); setError(''); }} disabled={mode === 'login' || isLoading} className={`button-mode ${mode === 'login' ? 'active' : ''}`}>Iniciar Sesión</button>
      </div>

      {mode === 'login' && (
        <div className="step-container login-view" style={{ padding: '20px' }}>
          <h2>Iniciar Sesión</h2>
          <form className="nickname-input-area" onSubmit={handleLoginSubmit}>
            <input
              type="text"
              className="form-input nickname-style-input"
              id="login-apodo-input" 
              name="apodo" placeholder="Escribe tu nickname..."
              value={formData.apodo} onChange={handleInputChange} required disabled={isLoading}
            />
            <input
              type="password"
              className="form-input password-style-input"
              id="login-password-input"
              name="password" placeholder="Contraseña..."
              value={formData.password} onChange={handleInputChange} required disabled={isLoading}
              style={{ marginTop: '10px' }}
            />
            <button
              type="submit"
              className="form-button nickname-style-button"
              disabled={isLoading} style={{ marginTop: '10px' }}
            >
              {isLoading ? 'Iniciando...' : 'Entrar'}
            </button>
          </form>
          {error && <p className="error-message" style={{ color: 'red', display: 'block', marginTop: '10px' }}>{error}</p>}
        </div>
      )}

       {mode === 'register' && (
         <div className="register-flow">
            {step === 'apodo' && (
             <div className="step-container">
                <h2>¡Bienvenido/a a Pimpoyo!</h2>
                <p>Por favor, introduce un nickname para empezar:</p>
                <form className="nickname-input-area" onSubmit={handleRegisterNextStep}>
                    <input
                        type="text"
                        className="form-input"
                        id="register-apodo"
                        name="apodo" value={formData.apodo} onChange={handleInputChange}
                        placeholder="Escribe tu nickname..." maxLength={20} required disabled={isLoading}
                    />
                    <button type="submit" className="form-button" disabled={isLoading}>Siguiente</button>
                </form>
                <div style={{ marginTop: '15px' }}>
                  <button
                    type="button"
                    className="switch-mode-link"
                    disabled={isLoading}
                    onClick={() => {
                        setMode('login');
                        setError('');
                    }}
                  >
                    ¿Ya tienes cuenta? Inicia Sesión
                  </button>
                </div>
              {error && <p className="error-message" style={{ color: 'red', display: 'block' }}>{error}</p>}
            </div>
            )}

            {step === 'genero' && (
            <div className="step-container gender-step-style">
              <h2>Un poco más sobre ti...</h2>
              <p>Selecciona tu género:</p>
              <div className="nickname-input-area">
                <select
                  className="form-select"
                  id="register-genero"
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

            {step === 'edad' && (
             <div className="step-container age-step-style"> 
              <h2>¡Casi listo!</h2>
              <p>Introduce tu edad:</p>
              <div className="nickname-input-area">
                <input
                  type="number"
                  className="form-input age-style-input"
                  id="register-edad"
                  name="edad" value={formData.edad} onChange={handleInputChange}
                  placeholder="Tu edad..." required min="1" disabled={isLoading}
                  style={{ width: 'auto', minWidth: '150px'}}
                />
                {/* El botón aquí ahora correctamente llevará al paso 'curso' debido al cambio en handleRegisterNextStep */}
                <button type="button" className="form-button nickname-style-button" onClick={handleRegisterNextStep} disabled={isLoading}>Siguiente</button>
              </div>
              {error && <p className="error-message" style={{ color: 'red', display: 'block' }}>{error}</p>}
            </div>
            )}

            {/* === PASO CURSO ESCOLAR (YA DEBERÍA ESTAR VISIBLE SI `step` LLEGA A 'curso') === */}
            {step === 'curso' && (
             <div className="step-container course-step-style"> 
                <h2>¿En qué curso estás?</h2>
                <p>Esto nos ayudará a adaptar mejor el contenido.</p>
                <div className="nickname-input-area">
                  <select
                    className="form-select"
                    id="register-curso"
                    name="curso_escolar" 
                    value={formData.curso_escolar}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    style={{ width: 'auto', minWidth: '220px'}}
                  >
                    <option value="">Selecciona tu curso...</option>
                    <option value="quinto">Quinto de Primaria</option>
                    <option value="sexto">Sexto de Primaria</option>
                  </select>
                  <button 
                    type="button" 
                    className="form-button nickname-style-button" 
                    onClick={handleRegisterNextStep} 
                    disabled={isLoading || !formData.curso_escolar} 
                  >
                    Siguiente
                  </button>
                </div>
                {error && <p className="error-message" style={{ color: 'red', display: 'block' }}>{error}</p>}
              </div>
            )}

            {step === 'final' && (
             <div className="step-container final-step-style">
              <h2>Seguridad y Consentimiento</h2>
              <form className="final-step-area" onSubmit={handleRegisterSubmit} style={{ maxWidth: '450px', margin: '0 auto', textAlign: 'left' }}>
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
        </div> 
      )}
    </div>
  );
}

export default ProfileSetup;