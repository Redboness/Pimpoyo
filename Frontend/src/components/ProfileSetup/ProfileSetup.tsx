// src/components/ProfileSetup/ProfileSetup.tsx
import React, { useState } from 'react';

// --- Tipos para las preguntas del Pre-Test ---
interface PreSurveyNewsItem {
  headline: string;
  body: string;
  source_hint: string;
}

interface PreSurveyPracticalQuestionPart {
  id_q_suffix: '_q' | '_a';
  text: string;
  type: 'radio' | 'textarea';
  options?: string[]; // Options es opcional aquí, pero obligatorio en la parte cuantitativa si es radio
}

interface PreSurveyBaseQuestion {
  id: string;
  text: string;
  type: 'radio' | 'checkbox';
  options: string[]; // Options es obligatorio para preguntas base
  isPractical?: false;
}

interface PreSurveyPracticalQuestion {
  id: string;
  isPractical: true;
  news_item: PreSurveyNewsItem;
  // Aquí nos aseguramos de que 'options' esté presente si question_quantitative es de tipo 'radio'
  question_quantitative: PreSurveyPracticalQuestionPart & { type: 'radio'; options: string[] };
  question_qualitative: PreSurveyPracticalQuestionPart & { type: 'textarea' };
}

type AnyPreSurveyQuestion = PreSurveyBaseQuestion | PreSurveyPracticalQuestion;

// --- Interfaces del Componente ---
interface RegisterPayload {
  apodo: string;
  genero: string;
  edad: number;
  password: string;
  consentimiento_obtenido: boolean;
  curso_escolar: string;
  puntuacion_pre_test?: number;
  respuestas_pre_test?: Record<string, string | string[]>;
}

interface ProfileSetupProps {
  onAuthSuccess: (token: string) => void;
}

type RegisterStep = 'apodo' | 'genero' | 'edad' | 'curso' | 'pretest' | 'final';

// --- Definición del Estado del Formulario ---
interface FormDataState {
  apodo: string;
  genero: string;
  edad: string;
  curso_escolar: string;
  password: string;
  confirmPassword: string;
  consentimiento: boolean; // Este es el único boolean directamente en formData
  preTestAnswers: Record<string, string | string[]>; // Solo string o array de strings
  puntuacion_pre_test: number | null;
}

// --- Preguntas del Pre-Test ---
const preSurveyQuestions: AnyPreSurveyQuestion[] = [
  // ... (tu array preSurveyQuestions completo, como lo tenías)
  {
    id: 'q1', text: '1. En una escala del 1 (no soy nada bueno) al 5 (¡se me da genial!), ¿cómo dirías que se te da descubrir si una noticia que ves en internet o redes sociales es verdadera o es falsa?', type: 'radio',
    options: ['1 - Nada bueno/a, me cuesta muchísimo.', '2 - No muy bueno/a, suelo dudar.', '3 - Normal, a veces acierto y a veces no.', '4 - Bastante bueno/a, suelo acertar.', '5 - ¡Soy un crack!, se me da muy bien.']
  },
  {
    id: 'q2', text: '2. ¿Te ha pasado alguna vez que te creíste mucho una noticia que luego resultó ser mentira?', type: 'radio',
    options: ['Sí, varias veces.', 'Sí, alguna vez.', 'No que yo recuerde.', 'No estoy seguro/a.']
  },
  {
    id: 'q3', text: '3. ¿Y al revés? ¿Alguna vez pensaste que una noticia era falsa, pero luego te diste cuenta de que era verdad?', type: 'radio',
    options: ['Sí, varias veces.', 'Sí, alguna vez.', 'No que yo recuerde.', 'No estoy seguro/a.']
  },
  {
    id: 'q4', text: '4. ¿Cómo de difícil crees que es saber si una noticia es real hoy en día?', type: 'radio',
    options: ['Es muy fácil, casi nunca tengo dudas.', 'Es bastante fácil, aunque a veces dudo.', 'Ni fácil ni difícil, depende mucho de la noticia.', 'Bastante difícil, dudo a menudo.', 'Muy difícil, casi siempre dudo o no lo sé.']
  },
  {
    id: 'q5', text: '5. Cuando ves una noticia y no estás seguro/a, ¿en qué cosas te sueles fijar? (Puedes marcar TODAS las que apliquen)', type: 'checkbox',
    options: ['Si la web o la persona que la publica parece de confianza.', 'Si el titular es muy exagerado o busca polémica.', 'Si está bien escrita, sin faltas de ortografía.', 'Si explica de dónde viene la información o da pruebas.', 'Si busco esa misma noticia o sobre quién la publica en otros sitios web para comparar.', 'Si tiene fotos o vídeos (¡me creo más las que tienen!).', 'Si la comparten mis amigos o mucha gente.', 'Si la fecha es reciente o antigua.', 'Si me hace sentir muy enfadado/a o sorprendido/a.', 'La verdad, no me suelo fijar mucho.']
  },
  {
    id: 'q6', text: '6. ¿Qué tipo de FUENTES (quién escribe o publica) te hacen CONFIAR MÁS en que una noticia es verdad? (Puedes marcar TODAS las que te den confianza)', type: 'checkbox',
    options: ['Periódicos, telediarios o webs de noticias famosas.', 'Webs oficiales (del gobierno, de la NASA, de universidades...).', 'Un científico o experto conocido que habla del tema.', 'Mis amigos o mi familia cuando me cuentan algo.', 'Un Youtuber o Tiktoker con muchos seguidores.', 'Cualquier web que parezca profesional, aunque no la conozca.', 'Mensajes que se reenvían mucho por WhatsApp.']
  },
  {
    id: 'q7', text: '7. ¿Qué cosas en una noticia te harían SOSPECHAR MÁS de que podría ser FALSA? (Puedes marcar TODAS las que te hagan dudar)', type: 'checkbox',
    options: ['Un titular súper exagerado o increíble.', 'Muchas faltas de ortografía o frases mal escritas.', 'Uso de MUCHAS MAYÚSCULAS y signos de exclamación !!!', 'Un lenguaje que busca enfadarte, darte miedo o insultar.', 'Que no diga de dónde saca la información o no dé pruebas.', 'Que te pida compartirla "URGENTE" con todo el mundo.', 'Que no tenga fecha o sea muy, muy antigua.', 'Que nadie más hable de esa noticia en otros sitios.']
  },
  {
    id: 'q8', text: '8. Y al revés, ¿qué cosas te harían PENSAR que una noticia tiene MÁS POSIBILIDADES de ser VERDAD? (Puedes marcar TODAS las que te ayuden)', type: 'checkbox',
    options: ['Si explica claramente de dónde viene la información y da enlaces o nombres.', 'Si la escriben expertos o periodistas conocidos.', 'Si varios periódicos o webs de noticias fiables cuentan lo mismo.', 'Si está escrita de forma tranquila y objetiva, sin insultar ni exagerar.', 'Si tiene una fecha clara y es reciente.', 'Si presenta datos o números concretos (y dice de dónde salen).', 'Si encaja con cosas que ya sé que son verdad.']
  },
  {
    id: 'q9', isPractical: true,
    news_item: { headline: 'ALERTA MÁXIMA EN BONAIRE: ¿Cientos de fallecidos ocultos tras la DANA? Crece la indignación por el supuesto silencio oficial', body: 'Fuentes extraoficiales y testimonios virales en redes sociales describen un panorama desolador en el parking del centro comercial Bonaire, Aldaia, tras el paso de la DANA. Ciudadanos anónimos, algunos identificándose como "contactos de los servicios de emergencia", aseguran que se han encontrado "entre 200 y 600 cadáveres" en las instalaciones subterráneas, y acusan a las autoridades de un supuesto encubrimiento para "evitar el pánico y ocultar la cifra real de víctimas".\n\nLos mensajes, que incluyen audios donde se escuchan voces relatando el supuesto hallazgo de "cuerpos flotando" y la llegada de "camiones frigoríficos por la noche para trasladar los cuerpos sin que nadie se entere", se propagan rápidamente. Se argumenta que la falta de denuncias públicas de familiares se debe al "shock" y a la "confusión generalizada", e incluso se sugiere que se estarían "quemando cadáveres en cementerios de municipios cercanos para no dejar rastro".\n\nEstas narrativas insisten en que "los medios no lo cuentan todo" y llaman a "difundir para que se sepa la verdad". A pesar de la gravedad de estas afirmaciones, por el momento no se han presentado pruebas gráficas concluyentes ni identificaciones de las supuestas víctimas por parte de quienes difunden estas alertas. Las autoridades locales aún no han emitido un desmentido formal sobre estas cifras específicas, lo que alimenta la especulación.', source_hint: '(Extracto de un supuesto "reportaje de investigación alternativo" circulando en blogs y foros online - Oct/Nov 2024)'},
    question_quantitative: { id_q_suffix: '_q', text: '9. Esta noticia sobre el parking de Bonaire y la DANA, ¿crees que es Verdadera o Falsa?', type: 'radio', options: ['Verdadera', 'Falsa'] },
    question_qualitative: { id_q_suffix: '_a', text: 'Explica brevemente por qué crees que es Verdadera o Falsa. ¿Qué pistas o señales viste en la noticia (en el titular, en el texto, en la fuente...)?', type: 'textarea' }
  },
  {
    id: 'q10', isPractical: true,
    news_item: { headline: 'Un bebé con una enfermedad rara recibe una terapia de edición genética que permite editar el ADN por primera vez en el mundo para su dolencia', body: 'Un bebé estadounidense conocido como KJ, diagnosticado poco después de nacer con un raro trastorno genético llamado deficiencia grave de carbamoilfosfato sintetasa 1 (CPS1), ha sido tratado con CRISPR, una terapia de edición genética personalizada. Esta enfermedad, que afecta a uno de cada millón de bebés, provoca un aumento de los niveles de amoníaco en la sangre y puede ser mortal. \n\nKJ empezó a recibir el tratamiento CRISPR personalizado a los seis meses, permitiendo a sus médicos reducir su dependencia a la medicación para mantener bajos sus niveles de amoníaco, según un estudio publicado en \'The New England Journal of Medicine\'. La Dra. Rebecca Ahrens-Nicklas, del Hospital Infantil de Filadelfia, calificó los resultados iniciales como "bastante prometedores", aunque KJ necesitará seguimiento de por vida. \n\nLa terapia CRISPR actúa cortando el ADN en puntos específicos para desactivar un gen dañino o insertar una versión corregida. En este caso, se corrigió un gen defectuoso en el hígado de KJ. Los investigadores esperan que este éxito permita tratar a otros pacientes, aunque reconocen retos como la dificultad de aplicar la terapia a otros órganos y el alto coste del procedimiento (más de 700.000 euros), similar al de un trasplante de hígado. El equipo no pudo evaluar completamente los posibles efectos secundarios por motivos de seguridad. \n\nExpertos como la Dra. Alena Pance señalan que, si bien CRISPR es aplicable a enfermedades por un solo cambio de nucleótido, muchas enfermedades son causadas por diversas mutaciones, donde estrategias más generales podrían ser más eficaces.', source_hint: '(Fuente: The New England Journal of Medicine, Hospital Infantil de Filadelfia, reportado por varios medios - Información basada en hechos reales)'},
    question_quantitative: { id_q_suffix: '_q', text: '10. ¿Crees que esta noticia sobre el bebé KJ y la terapia CRISPR es Verdadera o Falsa?', type: 'radio', options: ['Verdadera', 'Falsa'] },
    question_qualitative: { id_q_suffix: '_a', text: 'Explica brevemente por qué crees que es Verdadera o Falsa. ¿Qué pistas o señales viste en la noticia (en el titular, en el texto, en la fuente...)?', type: 'textarea' }
  },

];

// --- CLAVE DE PUNTUACIÓN (sin cambios, correcta con puntuación fraccionada) ---
const preTestScoringKey: Record<string, {
  type: 'checkboxFractional' | 'radioDefinitive';
  requiredOptions?: string[];
  forbiddenOptions?: string[];
  correctAnswer?: string;
}> = {
  q5: {
    type: 'checkboxFractional',
    requiredOptions: ['Si la web o la persona que la publica parece de confianza.', 'Si el titular es muy exagerado o busca polémica.', 'Si está bien escrita, sin faltas de ortografía.', 'Si explica de dónde viene la información o da pruebas.', 'Si busco esa misma noticia o sobre quién la publica en otros sitios web para comparar.', 'Si la fecha es reciente o antigua.', 'Si me hace sentir muy enfadado/a o sorprendido/a.' ],
    forbiddenOptions: [ 'Si tiene fotos o vídeos (¡me creo más las que tienen!).', 'Si la comparten mis amigos o mucha gente.', 'La verdad, no me suelo fijar mucho.' ]
  },
  q6: {
    type: 'checkboxFractional',
    requiredOptions: [ 'Periódicos, telediarios o webs de noticias famosas.', 'Webs oficiales (del gobierno, de la NASA, de universidades...).', 'Un científico o experto conocido que habla del tema.' ],
    forbiddenOptions: [ 'Mis amigos o mi familia cuando me cuentan algo.', 'Un Youtuber o Tiktoker con muchos seguidores.', 'Cualquier web que parezca profesional, aunque no la conozca.', 'Mensajes que se reenvían mucho por WhatsApp.' ]
  },
  q7: {
    type: 'checkboxFractional',
    requiredOptions: [ 'Un titular súper exagerado o increíble.', 'Muchas faltas de ortografía o frases mal escritas.', 'Uso de MUCHAS MAYÚSCULAS y signos de exclamación !!!', 'Un lenguaje que busca enfadarte, darte miedo o insultar.', 'Que no diga de dónde saca la información o no dé pruebas.', 'Que te pida compartirla "URGENTE" con todo el mundo.', 'Que no tenga fecha o sea muy, muy antigua.', 'Que nadie más hable de esa noticia en otros sitios.' ],
    forbiddenOptions: []
  },
  q8: {
    type: 'checkboxFractional',
    requiredOptions: [ 'Si explica claramente de dónde viene la información y da enlaces o nombres.', 'Si la escriben expertos o periodistas conocidos.', 'Si varios periódicos o webs de noticias fiables cuentan lo mismo.', 'Si está escrita de forma tranquila y objetiva, sin insultar ni exagerar.', 'Si tiene una fecha clara y es reciente.', 'Si presenta datos o números concretos (y dice de dónde salen).' ],
    forbiddenOptions: [ 'Si encaja con cosas que ya sé que son verdad.' ]
  },
  q9_q: { type: 'radioDefinitive', correctAnswer: 'Falsa' },
  q10_q: { type: 'radioDefinitive', correctAnswer: 'Verdadera' }
};

// --- FUNCIONES HELPER PARA PUNTUACIÓN (sin cambios) ---
// Comentario encima de la función calculatePreTestScore
function calculatePreTestScore(
  answers: Record<string, string | string[]>,
  key: typeof preTestScoringKey
): number {
  let totalScore = 0;
  const questionsToScoreIds = ['q5', 'q6', 'q7', 'q8', 'q9_q', 'q10_q'];

  for (const questionId of questionsToScoreIds) {
    const scoringRule = key[questionId];
    const userAnswer = answers[questionId];

    if (scoringRule && userAnswer !== undefined) {
      if (scoringRule.type === 'radioDefinitive') {
        if (typeof userAnswer === 'string' && userAnswer === scoringRule.correctAnswer) {
          totalScore += 1;
        }
      } else if (scoringRule.type === 'checkboxFractional') {
        if (Array.isArray(userAnswer) && scoringRule.requiredOptions && scoringRule.forbiddenOptions) {
          const hasForbiddenSelected = scoringRule.forbiddenOptions.some(forbiddenOpt => userAnswer.includes(forbiddenOpt));
          if (hasForbiddenSelected) {
            totalScore += 0;
          } else {
            let correctRequiredCount = 0;
            for (const reqOpt of scoringRule.requiredOptions) {
              if (userAnswer.includes(reqOpt)) {
                correctRequiredCount++;
              }
            }
            if (scoringRule.requiredOptions.length > 0) {
              const questionScore = correctRequiredCount / scoringRule.requiredOptions.length;
              totalScore += questionScore;
            }
          }
        }
      }
    }
  }
  return parseFloat(totalScore.toFixed(4));
}

// --- COMPONENTE PRINCIPAL ---
// Comentario encima de la función ProfileSetup
function ProfileSetup({ onAuthSuccess }: ProfileSetupProps) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [step, setStep] = useState<RegisterStep>('apodo');

  const initialFormData: FormDataState = {
    apodo: '', genero: '', edad: '', curso_escolar: '',
    password: '', confirmPassword: '', consentimiento: false,
    preTestAnswers: {}, puntuacion_pre_test: null,
  };
  const [formData, setFormData] = useState<FormDataState>(initialFormData);

  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Comentario encima de la función handleInputChange
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    const targetAsInput = event.target as HTMLInputElement; // Aserción segura, 'type' y 'checked' existen en HTMLInputElement
    const inputType = targetAsInput.type;

    // Para el checkbox de consentimiento, el valor es booleano
    const newValue = inputType === 'checkbox' && name === 'consentimiento'
                   ? targetAsInput.checked
                   : value;

    if (name.startsWith("preTestAnswer_")) { // Para textareas de Q9_a, Q10_a
        const questionFullId = name.substring("preTestAnswer_".length);
        setFormData((prev: FormDataState) => ({ // Tipar 'prev' explícitamente
            ...prev,
            preTestAnswers: { ...prev.preTestAnswers, [questionFullId]: newValue as string } // newValue es string
        }));
    } else { // Para campos del formulario (apodo, edad, consentimiento, etc.)
        setFormData((prevData: FormDataState) => ({ ...prevData, [name]: newValue }));
    }
    setError('');
  };

  // Comentario encima de la función handlePreTestAnswerChange
  const handlePreTestAnswerChange = (
    questionFullId: string,
    answerValue: string,
    questionType: 'radio' | 'checkbox'
  ) => {
    setError('');
    setFormData((prev: FormDataState) => { // Tipar 'prev' explícitamente
      const newPreTestAnswers = { ...prev.preTestAnswers };
      if (questionType === 'radio') {
        newPreTestAnswers[questionFullId] = answerValue;
      } else { // Checkbox
        const currentSelection = (newPreTestAnswers[questionFullId] as string[] | undefined) || [];
        if (currentSelection.includes(answerValue)) {
          newPreTestAnswers[questionFullId] = currentSelection.filter(item => item !== answerValue);
        } else {
          newPreTestAnswers[questionFullId] = [...currentSelection, answerValue];
        }
      }
      return { ...prev, preTestAnswers: newPreTestAnswers };
    });
  };

  // Comentario encima de la función handleRegisterNextStep
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
        { const edadNum = parseInt(formData.edad, 10);
        if (!formData.edad || isNaN(edadNum) || edadNum < 5 || edadNum > 18) { setError('Introduce una edad válida (entre 5 y 18).'); return; }
        setStep('curso');
        break; }
      case 'curso':
        if (!formData.curso_escolar) { setError('Por favor, selecciona tu curso.'); return; }
        setStep('pretest');
        break;
      case 'pretest':
        { const answeredAllQuestions = preSurveyQuestions.every(qAny => {
          const q = qAny; // No es necesaria la aserción AnyPreSurveyQuestion aquí si preSurveyQuestions ya tiene ese tipo
          if (q.isPractical) {
            const answerQuantitativeKey = q.id + q.question_quantitative.id_q_suffix;
            return !!formData.preTestAnswers[answerQuantitativeKey];
          } else {
            const answer = formData.preTestAnswers[q.id];
            if (q.type === 'radio') {
              return !!answer;
            } else if (q.type === 'checkbox') {
              return Array.isArray(answer) && answer.length > 0;
            }
          }
          return false;
        });

        if (!answeredAllQuestions) {
          setError('Por favor, responde todas las preguntas del test (para las noticias, al menos la opción V/F).');
          return;
        }
        const calculatedScore = calculatePreTestScore(formData.preTestAnswers, preTestScoringKey);
        console.log("Puntuación Pre-Test Calculada (max 6, fraccionada):", calculatedScore);
        setFormData(prev => ({ ...prev, puntuacion_pre_test: calculatedScore }));
        setStep('final');
        break; }
      default:
        break;
    }
  };

  // Comentario encima de la función handleRegisterSubmit
  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    if (formData.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (!formData.consentimiento) { setError('Debes aceptar el consentimiento informado.'); return; }

    setIsLoading(true);
    const edadNum = parseInt(formData.edad, 10);
    const preTestScoreToSend = formData.puntuacion_pre_test === null ? undefined : parseFloat(formData.puntuacion_pre_test.toFixed(2));

    const registrationData: RegisterPayload = {
      apodo: formData.apodo.trim(),
      genero: formData.genero || 'prefiero_no_decir',
      edad: edadNum,
      password: formData.password,
      consentimiento_obtenido: formData.consentimiento,
      curso_escolar: formData.curso_escolar,
      puntuacion_pre_test: preTestScoreToSend,
      respuestas_pre_test: formData.preTestAnswers
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
      setFormData(initialFormData);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Error de conexión al registrarse.');
    }
  };

  // Comentario encima de la función handleLoginSubmit
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

  // Comentario encima de la función isChecked
  const isChecked = (questionId: string, option: string): boolean => {
      const answer = formData.preTestAnswers[questionId];
      return Array.isArray(answer) && answer.includes(option);
  };

  // Comentario encima de la función isPreTestNextDisabled
  const isPreTestNextDisabled = () => {
       return isLoading || !preSurveyQuestions.every(qAny => {
            const q = qAny; // Ya es AnyPreSurveyQuestion
            if (q.isPractical) {
                const answerQuantitativeKey = q.id + q.question_quantitative.id_q_suffix;
                return !!formData.preTestAnswers[answerQuantitativeKey];
            } else {
                const answer = formData.preTestAnswers[q.id];
                if (q.type === 'radio') {
                    return !!answer;
                } else if (q.type === 'checkbox') {
                    return Array.isArray(answer) && answer.length > 0;
                }
            }
            return false;
        });
  };

  return (
    <div className="profile-setup-wrapper">
      <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
        <button onClick={() => { setMode('register'); setStep('apodo'); setError(''); setFormData(initialFormData); }} disabled={mode === 'register' || isLoading} className={`button-mode ${mode === 'register' ? 'active' : ''}`} style={{ marginRight: '10px' }}>Registrarse</button>
        <button onClick={() => { setMode('login'); setError(''); setFormData(initialFormData);}} disabled={mode === 'login' || isLoading} className={`button-mode ${mode === 'login' ? 'active' : ''}`}>Iniciar Sesión</button>
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
            {step === 'apodo' && ( <div className="step-container"><h2>¡Bienvenido/a a Pimpoyo!</h2><p>Por favor, introduce un nickname para empezar:</p><form className="nickname-input-area" onSubmit={(e) => handleRegisterNextStep(e)}><input type="text" className="form-input" id="register-apodo" name="apodo" value={formData.apodo} onChange={handleInputChange} placeholder="Escribe tu nickname..." maxLength={20} required disabled={isLoading} /><button type="submit" className="form-button" disabled={isLoading}>Siguiente</button></form><div style={{ marginTop: '15px' }}><button type="button" className="switch-mode-link" disabled={isLoading} onClick={() => { setMode('login'); setError(''); setFormData(initialFormData); }}>¿Ya tienes cuenta? Inicia Sesión</button></div>{error && <p className="error-message">{error}</p>}</div>)}
            {step === 'genero' && (<div className="step-container"><h2>Un poco más sobre ti...</h2><p>Selecciona tu género:</p><div className="nickname-input-area"><select className="form-select" id="register-genero" name="genero" value={formData.genero} onChange={handleInputChange} required disabled={isLoading}><option value="">Selecciona...</option><option value="masculino">Masculino</option><option value="femenino">Femenino</option><option value="otro">Otro</option><option value="prefiero_no_decir">Prefiero no decirlo</option></select><button type="button" className="form-button" onClick={handleRegisterNextStep} disabled={isLoading || !formData.genero}>Siguiente</button></div>{error && <p className="error-message">{error}</p>}</div>)}
            {step === 'edad' && (<div className="step-container"><h2>¡Casi listo!</h2><p>Introduce tu edad:</p><div className="nickname-input-area"><input type="number" className="form-input" id="register-edad" name="edad" value={formData.edad} onChange={handleInputChange} placeholder="Tu edad..." required min="5" max="18" disabled={isLoading} /><button type="button" className="form-button" onClick={handleRegisterNextStep} disabled={isLoading || !formData.edad}>Siguiente</button></div>{error && <p className="error-message">{error}</p>}</div>)}
            {step === 'curso' && (<div className="step-container"><h2>¿En qué curso estás?</h2><p>Esto nos ayudará a adaptar mejor el contenido.</p><div className="nickname-input-area"><select className="form-select" id="register-curso" name="curso_escolar" value={formData.curso_escolar} onChange={handleInputChange} required disabled={isLoading}><option value="">Selecciona tu curso...</option><option value="quinto">5º de Primaria</option><option value="sexto">6º de Primaria</option><option value="1º de la ESO">1º de la ESO</option><option value="2º de la ESO">2º de la ESO</option></select><button type="button" className="form-button" onClick={handleRegisterNextStep} disabled={isLoading || !formData.curso_escolar}>Siguiente</button></div>{error && <p className="error-message">{error}</p>}</div>)}

            {step === 'pretest' && (
              <div className="step-container pretest-step-style">
                <h2>Pequeño test inicial</h2>
                <p className="intro-text-pimpoyo">
                  ¡Hola! Soy Pimpoyo. Antes de empezar nuestra aventura para ser detectives de noticias,
                  quiero saber un poco sobre lo que ya conoces. ¡No es un examen, no hay respuestas
                  buenas ni malas! Solo marca lo que piensas o haces normalmente. ¡Gracias por ayudarme!
                </p>

                <form onSubmit={(e) => handleRegisterNextStep(e)} style={{maxWidth: '700px', width: '100%'}}>
                  {preSurveyQuestions.map(q => { // q es AnyPreSurveyQuestion
                    return (
                        <div key={q.id} className="pretest-question-card">
                        {!q.isPractical ? (
                            <>
                            <div className="pretest-question-text">{q.text}</div> {/* q es PreSurveyBaseQuestion aquí */}
                            <div className="pretest-options-group">
                                {q.options.map((option: string, index: number) => {
                                const inputId = `${q.id}-${index}`;
                                return (
                                    <div key={inputId} className="radio-checkbox-item">
                                    <input
                                        type={q.type}
                                        id={inputId}
                                        name={q.id}
                                        value={option}
                                        checked={q.type === 'radio' ? formData.preTestAnswers[q.id] === option : isChecked(q.id, option)}
                                        onChange={() => handlePreTestAnswerChange(q.id, option, q.type)}
                                        disabled={isLoading}
                                    />
                                    <label htmlFor={inputId}>{option}</label>
                                    </div>
                                );
                                })}
                            </div>
                            </>
                        ) : (
                            <div className="practical-news-item">
                            <div className="news-content">
                                <h3>{q.news_item.headline}</h3> {/* q es PreSurveyPracticalQuestion aquí */}
                                {q.news_item.body.split('\n').map((paragraph: string, i: number) => (
                                  paragraph.trim() !== '' && <p key={i}>{paragraph}</p>
                                ))}
                                {q.news_item.source_hint && <small><em>{q.news_item.source_hint}</em></small>}
                            </div>
                            <div className="question-quantitative">
                                <p>{q.question_quantitative.text}</p>
                                {q.question_quantitative.options.map((option: string, index: number) => { // No necesita '!'
                                const answerKey = q.id + q.question_quantitative.id_q_suffix;
                                const inputId = `${answerKey}-${index}`;
                                return (
                                    <div key={inputId} className="radio-checkbox-item">
                                    <input
                                        type="radio"
                                        id={inputId}
                                        name={answerKey}
                                        value={option}
                                        checked={formData.preTestAnswers[answerKey] === option}
                                        onChange={() => handlePreTestAnswerChange(answerKey, option, 'radio')}
                                        disabled={isLoading}
                                    />
                                    <label htmlFor={inputId}>{option}</label>
                                    </div>
                                );
                                })}
                            </div>
                            <div className="question-qualitative">
                                <p>{q.question_qualitative.text}</p>
                                <textarea
                                name={`preTestAnswer_${q.id}${q.question_qualitative.id_q_suffix}`}
                                value={formData.preTestAnswers[q.id + q.question_qualitative.id_q_suffix] as string || ''}
                                onChange={handleInputChange}
                                rows={3}
                                style={{ width: '100%', marginTop: '5px', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', borderColor: '#ccc', fontFamily: 'inherit', fontSize: '0.95em' }}
                                disabled={isLoading}
                                placeholder="Escribe aquí tu explicación..."
                                />
                            </div>
                            </div>
                        )}
                        </div>
                    );
                  })}
                  <p className="outro-text-pimpoyo">
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
