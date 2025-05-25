// src/components/ProfileSetup/ProfileSetup.tsx
import React, { useState } from 'react';

// --- Interfaces ---
interface RegisterPayload {
  apodo: string;
  genero: string;
  edad: number;
  password: string;
  consentimiento_obtenido: boolean;
  curso_escolar: string;
  puntuacion_pre_test?: number;
}

interface ProfileSetupProps {
  onAuthSuccess: (token: string) => void;
}

type RegisterStep = 'apodo' | 'genero' | 'edad' | 'curso' | 'pretest' | 'final';

// --- Preguntas del Pre-Test ---
const preSurveyQuestions = [
  {
    id: 'q1',
    text: '1. En una escala del 1 (no soy nada bueno) al 5 (¡se me da genial!), ¿cómo dirías que se te da descubrir si una noticia que ves en internet o redes sociales es verdadera o es falsa?',
    type: 'radio',
    options: [
      '1 - Nada bueno/a, me cuesta muchísimo.',
      '2 - No muy bueno/a, suelo dudar.',
      '3 - Normal, a veces acierto y a veces no.',
      '4 - Bastante bueno/a, suelo acertar.',
      '5 - ¡Soy un crack!, se me da muy bien.'
    ]
  },
  {
    id: 'q2',
    text: '2. ¿Te ha pasado alguna vez que te creíste mucho una noticia que luego resultó ser mentira?',
    type: 'radio',
    options: [
      'Sí, varias veces.',
      'Sí, alguna vez.',
      'No que yo recuerde.',
      'No estoy seguro/a.'
    ]
  },
  {
    id: 'q3',
    text: '3. ¿Y al revés? ¿Alguna vez pensaste que una noticia era falsa, pero luego te diste cuenta de que era verdad?',
    type: 'radio',
    options: [
      'Sí, varias veces.',
      'Sí, alguna vez.',
      'No que yo recuerde.',
      'No estoy seguro/a.'
    ]
  },
  {
    id: 'q4',
    text: '4. ¿Cómo de difícil crees que es saber si una noticia es real hoy en día?',
    type: 'radio',
    options: [
      'Es muy fácil, casi nunca tengo dudas.',
      'Es bastante fácil, aunque a veces dudo.',
      'Ni fácil ni difícil, depende mucho de la noticia.',
      'Bastante difícil, dudo a menudo.',
      'Muy difícil, casi siempre dudo o no lo sé.'
    ]
  },
  {
    id: 'q5',
    text: '5. Cuando ves una noticia y no estás seguro/a, ¿en qué cosas te sueles fijar? (Puedes marcar TODAS las que apliquen)',
    type: 'checkbox',
    options: [
      'Si la web o la persona que la publica parece de confianza.',
      'Si el titular es muy exagerado o busca polémica.',
      'Si tiene fotos o vídeos (¡me creo más las que tienen!).',
      'Si está bien escrita, sin faltas de ortografía.',
      'Si explica de dónde viene la información o da pruebas.',
      'Si la comparten mis amigos o mucha gente.',
      'Si la fecha es reciente o antigua.',
      'Si me hace sentir muy enfadado/a o sorprendido/a.',
      'La verdad, no me suelo fijar mucho.'
    ]
  },
  {
    id: 'q6',
    text: '6. ¿Qué tipo de FUENTES (quién escribe o publica) te hacen CONFIAR MÁS en que una noticia es verdad? (Puedes marcar TODAS las que te den confianza)',
    type: 'checkbox',
    options: [
      'Periódicos, telediarios o webs de noticias famosas.',
      'Webs oficiales (del gobierno, de la NASA, de universidades...).',
      'Un científico o experto conocido que habla del tema.',
      'Mis amigos o mi familia cuando me cuentan algo.',
      'Un Youtuber o Tiktoker con muchos seguidores.',
      'Cualquier web que parezca profesional, aunque no la conozca.',
      'Mensajes que se reenvían mucho por WhatsApp.'
    ]
  },
  {
    id: 'q7',
    text: '7. ¿Qué cosas en una noticia te harían SOSPECHAR MÁS de que podría ser FALSA? (Puedes marcar TODAS las que te hagan dudar)',
    type: 'checkbox',
    options: [
      'Un titular súper exagerado o increíble.',
      'Muchas faltas de ortografía o frases mal escritas.',
      'Uso de MUCHAS MAYÚSCULAS y signos de exclamación !!!',
      'Un lenguaje que busca enfadarte, darte miedo o insultar.',
      'Que no diga de dónde saca la información o no dé pruebas.',
      'Que te pida compartirla "URGENTE" con todo el mundo.',
      'Que no tenga fecha o sea muy, muy antigua.',
      'Que nadie más hable de esa noticia en otros sitios.'
    ]
  },
  {
    id: 'q8',
    text: '8. Y al revés, ¿qué cosas te harían PENSAR que una noticia tiene MÁS POSIBILIDADES de ser VERDAD? (Puedes marcar TODAS las que te ayuden)',
    type: 'checkbox',
    options: [
      'Si explica claramente de dónde viene la información y da enlaces o nombres.',
      'Si la escriben expertos o periodistas conocidos.',
      'Si varios periódicos o webs de noticias fiables cuentan lo mismo.',
      'Si está escrita de forma tranquila y objetiva, sin insultar ni exagerar.',
      'Si tiene una fecha clara y es reciente.',
      'Si presenta datos o números concretos (y dice de dónde salen).',
      'Si encaja con cosas que ya sé que son verdad.'
    ]
  }
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
    preTestAnswers: {} as Record<string, string | string[]>,
    puntuacion_pre_test: null as number | null,
  });

  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const newValue = type === 'checkbox' ? (event.target as HTMLInputElement).checked : value;
    setFormData(prevData => ({ ...prevData, [name]: newValue }));
    setError('');
  };

  const handlePreTestAnswerChange = (questionId: string, answer: string, type: 'radio' | 'checkbox') => {
    setError('');
    setFormData(prev => {
      const currentAnswers = { ...prev.preTestAnswers };
      if (type === 'radio') {
        currentAnswers[questionId] = answer;
      } else {
        const currentSelection = (currentAnswers[questionId] as string[] | undefined) || [];
        if (currentSelection.includes(answer)) {
          currentAnswers[questionId] = currentSelection.filter(item => item !== answer);
        } else {
          currentAnswers[questionId] = [...currentSelection, answer];
        }
      }
      return { ...prev, preTestAnswers: currentAnswers };
    });
  };

  const handleRegisterNextStep = (event?: React.MouseEvent<HTMLButtonElement> | React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    setError('');

    switch (step) {
      case 'apodo':
        if (!formData.apodo.trim()) { setError('Por favor, introduce un nickname.'); return; }
        setStep('genero');
        break;
      case 'genero':
        if (!formData.genero) { setError('Por favor, selecciona un género.'); return; }
        setStep('edad');
        break;
      case 'edad':
        const edadNum = parseInt(formData.edad, 10);
        if (!formData.edad || isNaN(edadNum) || edadNum < 5 || edadNum > 18) { setError('Introduce una edad válida (entre 5 y 18).'); return; }
        setStep('curso');
        break;
      case 'curso':
        if (!formData.curso_escolar) { setError('Por favor, selecciona tu curso.'); return; }
        setStep('pretest');
        break;
      case 'pretest':
        const answeredAllQuestions = preSurveyQuestions.every(q => {
            const answer = formData.preTestAnswers[q.id];
            return (q.type === 'radio' && !!answer) || (q.type === 'checkbox' && Array.isArray(answer) && answer.length > 0);
        });
        if (!answeredAllQuestions) {
            setError('Por favor, responde todas las preguntas del test.');
            return;
        }
        setFormData(prev => ({ ...prev, puntuacion_pre_test: 0 }));
        setStep('final');
        break;
      default:
        break;
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    if (formData.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
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
      puntuacion_pre_test: formData.puntuacion_pre_test ?? 0,
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
      alert('¡Registro completado! Ahora puedes iniciar sesión.');
      setMode('login');
      setFormData(prev => ({
          ...prev, genero: '', edad: '', curso_escolar: '', password: '',
          confirmPassword: '', consentimiento: false,
          preTestAnswers: {}, puntuacion_pre_test: null
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

  const isChecked = (questionId: string, option: string): boolean => {
      const answer = formData.preTestAnswers[questionId];
      return Array.isArray(answer) && answer.includes(option);
  };

  const isPreTestNextDisabled = () => {
       return isLoading || !preSurveyQuestions.every(q => {
            const answer = formData.preTestAnswers[q.id];
            return (q.type === 'radio' && !!answer) || (q.type === 'checkbox' && Array.isArray(answer) && answer.length > 0);
        });
  };

  return (
    <div className="profile-setup-wrapper">
      <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
        <button onClick={() => { setMode('register'); setStep('apodo'); setError(''); }} disabled={mode === 'register' || isLoading} className={`button-mode ${mode === 'register' ? 'active' : ''}`} style={{ marginRight: '10px' }}>Registrarse</button>
        <button onClick={() => { setMode('login'); setError(''); }} disabled={mode === 'login' || isLoading} className={`button-mode ${mode === 'login' ? 'active' : ''}`}>Iniciar Sesión</button>
      </div>

      {mode === 'login' && (
        <div className="step-container login-view">
          <h2>Iniciar Sesión</h2>
          <form className="nickname-input-area" onSubmit={handleLoginSubmit}>
            <input type="text" className="form-input" id="login-apodo-input" name="apodo" placeholder="Escribe tu nickname..." value={formData.apodo} onChange={handleInputChange} required disabled={isLoading} />
            <input type="password" className="form-input" id="login-password-input" name="password" placeholder="Contraseña..." value={formData.password} onChange={handleInputChange} required disabled={isLoading} />
            <button type="submit" className="form-button" disabled={isLoading}>
              {isLoading ? 'Iniciando...' : 'Entrar'}
            </button>
          </form>
          {error && <p className="error-message">{error}</p>}
        </div>
      )}

       {mode === 'register' && (
         <div className="register-flow">
            {step === 'apodo' && ( <div className="step-container"><h2>¡Bienvenido/a a Pimpoyo!</h2><p>Por favor, introduce un nickname para empezar:</p><form className="nickname-input-area" onSubmit={(e) => handleRegisterNextStep(e)}><input type="text" className="form-input" id="register-apodo" name="apodo" value={formData.apodo} onChange={handleInputChange} placeholder="Escribe tu nickname..." maxLength={20} required disabled={isLoading} /><button type="submit" className="form-button" disabled={isLoading}>Siguiente</button></form><div style={{ marginTop: '15px' }}><button type="button" className="switch-mode-link" disabled={isLoading} onClick={() => { setMode('login'); setError(''); }}>¿Ya tienes cuenta? Inicia Sesión</button></div>{error && <p className="error-message">{error}</p>}</div>)}
            {step === 'genero' && (<div className="step-container"><h2>Un poco más sobre ti...</h2><p>Selecciona tu género:</p><div className="nickname-input-area"><select className="form-select" id="register-genero" name="genero" value={formData.genero} onChange={handleInputChange} required disabled={isLoading}><option value="">Selecciona...</option><option value="masculino">Masculino</option><option value="femenino">Femenino</option><option value="otro">Otro</option><option value="prefiero_no_decir">Prefiero no decirlo</option></select><button type="button" className="form-button" onClick={handleRegisterNextStep} disabled={isLoading || !formData.genero}>Siguiente</button></div>{error && <p className="error-message">{error}</p>}</div>)}
            {step === 'edad' && (<div className="step-container"><h2>¡Casi listo!</h2><p>Introduce tu edad:</p><div className="nickname-input-area"><input type="number" className="form-input" id="register-edad" name="edad" value={formData.edad} onChange={handleInputChange} placeholder="Tu edad..." required min="5" max="18" disabled={isLoading} /><button type="button" className="form-button" onClick={handleRegisterNextStep} disabled={isLoading || !formData.edad}>Siguiente</button></div>{error && <p className="error-message">{error}</p>}</div>)}
            {step === 'curso' && (<div className="step-container"><h2>¿En qué curso estás?</h2><p>Esto nos ayudará a adaptar mejor el contenido.</p><div className="nickname-input-area"><select className="form-select" id="register-curso" name="curso_escolar" value={formData.curso_escolar} onChange={handleInputChange} required disabled={isLoading}><option value="">Selecciona tu curso...</option><option value="quinto">Quinto de Primaria</option><option value="sexto">Sexto de Primaria</option><option value="1º de la ESO">1º de la ESO</option><option value="2º de la ESO">2º de la ESO</option></select><button type="button" className="form-button" onClick={handleRegisterNextStep} disabled={isLoading || !formData.curso_escolar}>Siguiente</button></div>{error && <p className="error-message">{error}</p>}</div>)}

            {/* === SECCIÓN DEL PRE-TEST ACTUALIZADA CON className === */}
            {step === 'pretest' && (
              <div className="step-container pretest-step-style">
                <h2>Pequeño test inicial</h2>
                <p className="intro-text-pimpoyo"> {/* Añadido className */}
                  ¡Hola! Soy Pimpoyo. Antes de empezar nuestra aventura para ser detectives de noticias,
                  quiero saber un poco sobre lo que ya conoces. ¡No es un examen, no hay respuestas
                  buenas ni malas! Solo marca lo que piensas o haces normalmente. ¡Gracias por ayudarme!
                </p>

                <form onSubmit={(e) => handleRegisterNextStep(e)} style={{maxWidth: '700px', width: '100%'}}>
                  {preSurveyQuestions.map(q => (
                    <div key={q.id} className="pretest-question-card"> {/* className cambiado y estilos inline eliminados */}
                      <p>{q.text}</p>
                      <div className="pretest-options-group"> {/* className y estilos inline eliminados */}
                        {q.options.map((option, index) => {
                           const inputId = `${q.id}-${index}`;
                           return (
                              <div key={inputId} className="radio-checkbox-item"> {/* Añadido className y estilos inline eliminados */}
                                <input
                                  type={q.type as 'radio' | 'checkbox'}
                                  id={inputId}
                                  name={q.id}
                                  value={option}
                                  checked={q.type === 'radio' ? formData.preTestAnswers[q.id] === option : isChecked(q.id, option)}
                                  onChange={() => handlePreTestAnswerChange(q.id, option, q.type as 'radio' | 'checkbox')}
                                  disabled={isLoading}
                                  // Estilos inline eliminados para que los tome el CSS
                                />
                                <label htmlFor={inputId} /* Estilos inline eliminados */ >
                                  {option}
                                </label>
                              </div>
                           );
                        })}
                      </div>
                    </div>
                  ))}

                  <p className="outro-text-pimpoyo"> {/* Añadido className y estilos inline eliminados */}
                    ¡Listo! ¡Mil gracias por tus respuestas! Has ayudado mucho a Pimpoyo.
                  </p>

                  <button
                    type="submit"
                    className="form-button"
                    style={{ marginTop: '10px' }}
                    disabled={isPreTestNextDisabled()}
                  >
                    Siguiente
                  </button>
                </form>
                {error && <p className="error-message">{error}</p>}
              </div>
            )}
            {/* === FIN DE LA SECCIÓN DEL PRE-TEST ACTUALIZADA === */}

            {step === 'final' && (
             <div className="step-container final-step-style">
              <h2>Seguridad y Consentimiento</h2>
              <form className="final-step-area" onSubmit={handleRegisterSubmit}>
                 <div className="form-field">
                    <label htmlFor="register-password">Contraseña (mín. 6 caracteres):</label>
                    <input type="password" id="register-password" name="password" className="form-input" value={formData.password} onChange={handleInputChange} required disabled={isLoading} />
                </div>
                 <div className="form-field">
                    <label htmlFor="register-confirmPassword">Confirmar Contraseña:</label>
                    <input type="password" id="register-confirmPassword" name="confirmPassword" className="form-input" value={formData.confirmPassword} onChange={handleInputChange} required disabled={isLoading} />
                </div>
                 <div className="form-field" style={{display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center'}}>
                    <input type="checkbox" id="register-consentimiento" name="consentimiento" checked={formData.consentimiento} onChange={handleInputChange} required disabled={isLoading} style={{ width: 'auto' }} />
                    <label htmlFor="register-consentimiento">He leído y acepto el consentimiento informado.</label>
                </div>
                <div style={{textAlign: 'center'}}>
                   <button type="submit" className="form-button" disabled={isLoading}>{isLoading ? 'Registrando...' : 'Completar Registro'}</button>
                </div>
              </form>
              {error && <p className="error-message">{error}</p>}
            </div>
            )}
        </div>
      )}
    </div>
  );
}

export default ProfileSetup;