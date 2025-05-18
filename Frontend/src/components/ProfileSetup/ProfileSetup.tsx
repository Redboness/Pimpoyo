// src/components/ProfileSetup/ProfileSetup.tsx
import React, { useState } from 'react';

interface RegisterPayload {
  apodo: string;
  genero: string;
  edad: number;
  password: string;
  consentimiento_obtenido: boolean;
  curso_escolar: string;
  puntuacion_pre_test?: number; // Lo haremos opcional en el payload del frontend por ahora
}

interface ProfileSetupProps {
  onAuthSuccess: (token: string) => void;
}

// NUEVO PASO: 'pretest'
type RegisterStep = 'apodo' | 'genero' | 'edad' | 'curso' | 'pretest' | 'final';

// Simulación de preguntas del pre-test
const preTestQuestions = [
  { id: 'q1', text: '¿Es siempre verdad todo lo que lees en internet?', options: ['Sí', 'No', 'A veces'], correctAnswer: 'No' },
  { id: 'q2', text: 'Si una noticia te hace sentir muy enfadado o muy feliz muy rápido, ¿qué deberías hacer?', options: ['Compartirla inmediatamente', 'Creerla sin dudar', 'Parar y pensar si podría ser para provocarte'], correctAnswer: 'Parar y pensar si podría ser para provocarte' },
  // Añade más preguntas (por ejemplo, hasta 5)
];

function ProfileSetup({ onAuthSuccess }: ProfileSetupProps) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [step, setStep] = useState<RegisterStep>('apodo');

  const [formData, setFormData] = useState({
    apodo: '',
    genero: '',
    edad: '',
    curso_escolar: '',
    password: '',
    confirmPassword: '',
    consentimiento: false,
    // Estado para las respuestas del pre-test
    preTestAnswers: {} as Record<string, string>, // ej: {q1: 'No', q2: 'Sí'}
    puntuacion_pre_test: null as number | null, // Para guardar la puntuación calculada
  });

  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const newValue = type === 'checkbox' ? (event.target as HTMLInputElement).checked : value;
    setFormData(prevData => ({ ...prevData, [name]: newValue }));
    setError('');
  };

  const handlePreTestAnswerChange = (questionId: string, answer: string) => {
    setFormData(prev => ({
      ...prev,
      preTestAnswers: {
        ...prev.preTestAnswers,
        [questionId]: answer,
      }
    }));
  };

  const calculatePreTestScore = () => {
    let score = 0;
    preTestQuestions.forEach(q => {
      if (formData.preTestAnswers[q.id] === q.correctAnswer) {
        score += (100 / preTestQuestions.length); // Puntuación simple sobre 100
      }
    });
    return parseFloat(score.toFixed(2)); // Redondear a 2 decimales
  };

  const handleRegisterNextStep = (event?: React.MouseEvent<HTMLButtonElement> | React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    setError('');

    if (step === 'apodo') {
      if (!formData.apodo.trim()) { setError('Por favor, introduce un nickname.'); return; }
      setStep('genero');
    } else if (step === 'genero') {
      if (!formData.genero) { setError('Por favor, selecciona un género.'); return; }
      setStep('edad');
    } else if (step === 'edad') {
       const edadNum = parseInt(formData.edad, 10);
       if (!formData.edad || isNaN(edadNum) || edadNum <= 0) { setError('Introduce una edad válida.'); return; }
       setStep('curso');
    } else if (step === 'curso') {
       if (!formData.curso_escolar) { setError('Por favor, selecciona tu curso.'); return; }
       setStep('pretest'); // <--- IR AL NUEVO PASO 'pretest'
    } else if (step === 'pretest') {
        // Validar que todas las preguntas del pre-test han sido respondidas
        const answeredAllQuestions = preTestQuestions.every(q => formData.preTestAnswers[q.id]);
        if (!answeredAllQuestions) {
            setError('Por favor, responde todas las preguntas del test.');
            return;
        }
        const score = calculatePreTestScore();
        setFormData(prev => ({...prev, puntuacion_pre_test: score })); // Guardar puntuación
        setStep('final');
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (formData.puntuacion_pre_test === null) {
        setError("Por favor, completa el pre-test antes de finalizar.");
        setStep('pretest'); // Volver al pre-test si no se completó
        return;
    }
    // ... (otras validaciones del paso final) ...
    if (formData.password !== formData.confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    if (!formData.consentimiento) { setError('Debes aceptar el consentimiento informado.'); return; }


    setIsLoading(true);
    const edadNum = parseInt(formData.edad, 10);

    const registrationData: RegisterPayload = {
      apodo: formData.apodo.trim(),
      genero: formData.genero || 'prefiero_no_decir',
      edad: edadNum,
      password: formData.password,
      consentimiento_obtenido: formData.consentimiento,
      curso_escolar: formData.curso_escolar,
      puntuacion_pre_test: formData.puntuacion_pre_test, // Enviar la puntuación
    };

    try {
      const response = await fetch('/api/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });
      // ... (resto del try-catch como lo tenías) ...
      setIsLoading(false);
      const responseData = await response.json();
      if (!response.ok) { throw new Error(responseData.detail || `Error: ${response.status}`); }

      console.log('Registration successful:', responseData);
      alert('¡Registro completado! Ahora puedes iniciar sesión.');
      setMode('login');
      setFormData(prev => ({
        apodo: prev.apodo, // Mantener apodo para facilitar login
        genero: '',
        edad: '',
        curso_escolar: '',
        password: '',
        confirmPassword: '',
        consentimiento: false,
        preTestAnswers: {},
        puntuacion_pre_test: null
      }));
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Error de conexión al registrarse.');
    }
  };

  // ... (handleLoginSubmit sin cambios) ...
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
      {/* ... (Selector de Modo sin cambios) ... */}
      <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
        <button onClick={() => { setMode('register'); setStep('apodo'); setError(''); }} disabled={mode === 'register' || isLoading} className={`button-mode ${mode === 'register' ? 'active' : ''}`} style={{ marginRight: '10px' }}>Registrarse</button>
        <button onClick={() => { setMode('login'); setError(''); }} disabled={mode === 'login' || isLoading} className={`button-mode ${mode === 'login' ? 'active' : ''}`}>Iniciar Sesión</button>
      </div>

      {mode === 'login' && (
        // ... (Formulario de LOGIN sin cambios) ...
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
            {/* ... (Pasos 'apodo', 'genero', 'edad', 'curso' como los tenías o como los ajustamos antes) ... */}
            {step === 'apodo' && ( <div className="step-container"><h2>¡Bienvenido/a a Pimpoyo!</h2><p>Por favor, introduce un nickname para empezar:</p><form className="nickname-input-area" onSubmit={handleRegisterNextStep}><input type="text" className="form-input" id="register-apodo" name="apodo" value={formData.apodo} onChange={handleInputChange} placeholder="Escribe tu nickname..." maxLength={20} required disabled={isLoading} /><button type="submit" className="form-button" disabled={isLoading}>Siguiente</button></form><div style={{ marginTop: '15px' }}><button type="button" className="switch-mode-link" disabled={isLoading} onClick={() => { setMode('login'); setError(''); }}>¿Ya tienes cuenta? Inicia Sesión</button></div>{error && <p className="error-message" style={{ color: 'red', display: 'block' }}>{error}</p>}</div>)}
            {step === 'genero' && (<div className="step-container gender-step-style"><h2>Un poco más sobre ti...</h2><p>Selecciona tu género:</p><div className="nickname-input-area"><select className="form-select" id="register-genero" name="genero" value={formData.genero} onChange={handleInputChange} required disabled={isLoading} style={{ width: 'auto', minWidth: '200px'}}><option value="">Selecciona...</option><option value="masculino">Masculino</option><option value="femenino">Femenino</option><option value="otro">Otro</option><option value="prefiero_no_decir">Prefiero no decirlo</option></select><button type="button" className="form-button nickname-style-button" onClick={handleRegisterNextStep} disabled={isLoading}>Siguiente</button></div>{error && <p className="error-message" style={{ color: 'red', display: 'block' }}>{error}</p>}</div>)}
            {step === 'edad' && (<div className="step-container age-step-style"><h2>¡Casi listo!</h2><p>Introduce tu edad:</p><div className="nickname-input-area"><input type="number" className="form-input age-style-input" id="register-edad" name="edad" value={formData.edad} onChange={handleInputChange} placeholder="Tu edad..." required min="1" disabled={isLoading} style={{ width: 'auto', minWidth: '150px'}} /><button type="button" className="form-button nickname-style-button" onClick={handleRegisterNextStep} disabled={isLoading}>Siguiente</button></div>{error && <p className="error-message" style={{ color: 'red', display: 'block' }}>{error}</p>}</div>)}
            {step === 'curso' && (<div className="step-container course-step-style"><h2>¿En qué curso estás?</h2><p>Esto nos ayudará a adaptar mejor el contenido.</p><div className="nickname-input-area"><select className="form-select" id="register-curso" name="curso_escolar" value={formData.curso_escolar} onChange={handleInputChange} required disabled={isLoading} style={{ width: 'auto', minWidth: '220px'}}><option value="">Selecciona tu curso...</option><option value="quinto">Quinto de Primaria</option><option value="sexto">Sexto de Primaria</option></select><button type="button" className="form-button nickname-style-button" onClick={handleRegisterNextStep} disabled={isLoading || !formData.curso_escolar} >Siguiente</button></div>{error && <p className="error-message" style={{ color: 'red', display: 'block' }}>{error}</p>}</div>)}

            {/* === NUEVO PASO: PRE-TEST === */}
            {step === 'pretest' && (
              <div className="step-container pretest-step-style">
                <h2>Pequeño Test Inicial</h2>
                <p>Responde estas preguntas para ayudarnos a entender mejor tus conocimientos actuales.</p>
                <form onSubmit={handleRegisterNextStep}>
                  {preTestQuestions.map(q => (
                    <div key={q.id} className="form-field" style={{ marginBottom: '20px', textAlign: 'left' }}>
                      <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>{q.text}</p>
                      {/* Contenedor para las opciones de esta pregunta */}
                      <div className="pretest-options-group" style={{ marginLeft: '10px' }}>
                        {q.options.map(option => (
                          // Cada opción (radio + label) en su propio div para mejor control
                          <div key={option} style={{
                              display: 'flex', // Usa Flexbox para alinear radio y label
                              alignItems: 'center', // Centra verticalmente el radio y el texto
                              marginBottom: '8px'  // Espacio entre opciones
                            }}>
                            <input
                              type="radio"
                              id={`${q.id}-${option.replace(/\s+/g, '-')}`} // Crear un ID más robusto para el label
                              name={q.id}
                              value={option}
                              checked={formData.preTestAnswers[q.id] === option}
                              onChange={() => handlePreTestAnswerChange(q.id, option)}
                              disabled={isLoading}
                              style={{ marginRight: '8px' }} // Espacio entre el radio y el texto
                            />
                            <label htmlFor={`${q.id}-${option.replace(/\s+/g, '-')}`}>
                              {option}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    type="submit"
                    className="form-button nickname-style-button"
                    style={{ marginTop: '20px' }} // Añadir un poco de margen superior al botón
                    disabled={isLoading || preTestQuestions.some(q => !formData.preTestAnswers[q.id])}
                  >
                    Siguiente
                  </button>
                </form>
                {error && <p className="error-message" style={{ color: 'red', display: 'block', marginTop: '10px' }}>{error}</p>}
              </div>
            )}

            {step === 'final' && (
             <div className="step-container final-step-style">
              <h2>Seguridad y Consentimiento</h2>
              <form className="final-step-area" onSubmit={handleRegisterSubmit} style={{ maxWidth: '450px', margin: '0 auto', textAlign: 'left' }}>
                 <div className="form-field" style={{ marginBottom: '15px' }}>
                    <label htmlFor="register-password">Contraseña:</label>
                    <input type="password" id="register-password" name="password" className="form-input" value={formData.password} onChange={handleInputChange} required  disabled={isLoading} />
                </div>
                 <div className="form-field" style={{ marginBottom: '15px' }}>
                    <label htmlFor="register-confirmPassword">Confirmar Contraseña:</label>
                    <input type="password" id="register-confirmPassword" name="confirmPassword" className="form-input" value={formData.confirmPassword} onChange={handleInputChange} required disabled={isLoading} />
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
