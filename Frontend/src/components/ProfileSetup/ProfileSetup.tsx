import React, { useState } from 'react';
// import './ProfileSetup.css'; // Asegúrate de tener un CSS para los estilos si lo necesitas

// --- Tipos (sin cambios) ---
interface PreSurveyNewsItem {
    headline: string;
    body: string;
    source_hint: string;
}
interface PreSurveyPracticalQuestionPart {
    id_q_suffix: '_VF' | '_Expl';
    text: string;
    type: 'radio' | 'textarea';
    options?: string[];
}
interface PreSurveyBaseQuestion {
    id: string;
    text: string;
    type: 'radio' | 'checkbox';
    options: string[];
    isPractical?: false;
}
interface PreSurveyPracticalQuestion {
    id: string;
    isPractical: true;
    news_item: PreSurveyNewsItem;
    question_quantitative: PreSurveyPracticalQuestionPart & { type: 'radio'; options: string[] };
    question_qualitative: PreSurveyPracticalQuestionPart & { type: 'textarea' };
}
type AnyPreSurveyQuestion = PreSurveyBaseQuestion | PreSurveyPracticalQuestion;
interface RegisterPayload {
    apodo: string;
    genero: string;
    edad: number;
    password: string;
    consentimiento_obtenido: boolean;
    curso_escolar: string;
    respuestas_pre_test?: Record<string, string | string[]>;
    pre_test_s1_perfil_puntos: number;
    pre_test_s2_estrategias_puntos: number;
    pre_test_s3_practica_puntos: number;
    puntuacion_pre_test_total: number;
}
interface ProfileSetupProps {
    onAuthSuccess: (token: string) => void;
}
type RegisterStep = 'apodo' | 'genero' | 'edad' | 'curso' | 'pretest' | 'final';
interface FormDataState {
    apodo: string;
    genero: string;
    edad: string;
    curso_escolar: string;
    password: string;
    confirmPassword: string;
    consentimiento: boolean;
    preTestAnswers: Record<string, string | string[]>;
    scores: {
        s1: number;
        s2: number;
        s3: number;
        total: number;
    } | null;
}

// --- Preguntas y Clave de Puntuación (sin cambios) ---
const preSurveyQuestions: AnyPreSurveyQuestion[] = [
    // ... (contenido de las preguntas sin cambios)
    // Sección 1
    { id: 'P1_Horas', text: '1. ¿Cuántas horas aproximadamente pasas conectado/a a internet al día (contando tiempo para el cole, redes sociales, ver vídeos, jugar, etc.)? (marca SOLO UNA opción)', type: 'radio', options: ['Menos de 1 hora.', 'Entre 1 y 2 horas.', 'Entre 2 y 3 horas.', 'Entre 3 y 4 horas.', 'Más de 4 horas.'] },
    { id: 'P2_Plataformas', text: '2. ¿Cuáles de estas redes sociales o plataformas usas más a menudo para enterarte de noticias o cosas nuevas que pasan? (puedes marcar TODAS las que apliquen)', type: 'checkbox', options: ['Tik Tok.', 'YouTube.', 'Instagram.', 'WhatsApp.', 'Facebook.', 'Twitter/X.', 'La televisión o la radio.', 'Páginas web de noticias (en papel o web) (El Mundo, El País, Euronews...)', 'Mis familiares o amigos/as.', 'Otro.'] },
    { id: 'P3_Habilidad_Tech', text: '3. En una escala del 1 (me cuesta mucho) al 5 (se me da genial), ¿cómo de bien se te da usar tecnologías como el móvil, la tablet o el ordenador? (marca SOLO UNA opción)', type: 'radio', options: ['No se me da bien.', 'Se me da un poco bien.', 'Normal, me defiendo.', 'Bastante bien.', 'Se me da genial.'] },
    { id: 'P4_Charla_Peligros', text: '4. ¿Con qué frecuencia tus padres, profesores u otros adultos te hablan sobre los peligros de internet o cómo reconocer noticias falsas? (marca SOLO UNA opción)', type: 'radio', options: ['Muy a menudo.', 'A menudo.', 'Alguna vez.', 'Casi nunca.', 'Nunca.'] },
    // Sección 2
    { id: 'P5_Habilidad_VF', text: '5. En una escala del 1 (no soy nada bueno) al 5 (¡se me da genial!), ¿cómo dirías que se te da descubrir si una noticia que ves en internet o redes sociales es verdadera o es falsa? (marca SOLO UNA opción)', type: 'radio', options: ['Nada bueno/a, me cuesta muchísimo.', 'No muy bueno/a, suelo dudar.', 'Normal, a veces acierto y otras no.', 'Bastante bueno/a, suelo acertar', '¡Soy un crack!, se me da muy bien.'] },
    { id: 'P6_Dificultad_VF', text: '6. ¿Cómo de difícil crees que es saber si una noticia es real hoy en día? (marca SOLO UNA opción)', type: 'radio', options: ['Muy fácil, casi nunca tengo dudas.', 'Bastante fácil, aunque a veces dudo.', 'Ni fácil ni difícil, depende mucho de la noticia.', 'Bastante difícil, dudo a menudo.', 'Muy difícil, casi siempre dudo o no lo sé.'] },
    { id: 'P7_Estrategias', text: '7. Cuando ves una noticia y no estás seguro/a, ¿en qué cosas te sueles fijar? (puedes marcar TODAS las que apliquen)', type: 'checkbox', options: ['Si la web o la persona que la publica parece de confianza.', 'Si el titular es muy exagerado o busca polémica.', 'Si está bien escrita, sin faltas de ortografía.', 'Si explica de dónde viene la información o da pruebas.', 'Si busco esa misma noticia o sobre quién la publica en otros sitios web para comparar.', 'Si tiene fotos o vídeos (me creo más las que tienen).', 'Si la comparten mis amigos o mucha gente.', 'Si la fecha es reciente o antigua.', 'Si me hace sentir muy enfadado/a o sorprendido/a.', 'La verdad, no me suelo fijar mucho.'] },
    { id: 'P8_Fuentes_Confianza', text: '8. ¿Qué tipo de FUENTES (quién escribe o publica) te hacen CONFIAR MÁS en que una noticia es verdad? (puedes marcar TODAS las que te den confianza)', type: 'checkbox', options: ['Periódicos, telediarios o webs de noticias famosas. (El Mundo, BBC, La Vanguardia...)', 'Webs oficiales (del gobierno, de la NASA, de universidades...).', 'Un científico o experto conocido que habla del tema.', 'Mis amigos o mi familia cuando me cuentan algo.', 'Un Youtuber o Tiktoker con muchos seguidores.', 'Cualquier web que parezca profesional, aunque no la conozca.', 'Mensajes que se reenvían mucho por WhatsApp.'] },
    { id: 'P9_Sospecha_Falsa', text: '9. ¿Qué cosas en una noticia te harían SOSPECHAR MÁS de que podría ser FALSA? (puedes marcar TODAS las que te hagan dudar)', type: 'checkbox', options: ['Un titular súper exagerado o increíble.', 'Muchas faltas de ortografía o frases mal escritas.', 'Uso de MUCHAS MAYÚSCULAS y signos de exclamación (!!!)', 'Un lenguaje que busca enfadarte, darte miedo o insultar.', 'Que no diga de dónde saca la información o no dé pruebas.', 'Que te pida compartirla "URGENTE" con todo el mundo.', 'Que no tenga fecha o sea muy, muy antigua.', 'Que nadie más hable de esa noticia en otros sitios.'] },
    { id: 'P10_Prob_Verdad', text: '10. Y al revés, ¿qué cosas te harían pensar que una noticia tiene MÁS POSIBILIDADES de ser VERDAD? (Puedes marcar TODAS las que te ayuden)', type: 'checkbox', options: ['Si explica claramente de dónde viene la información y da enlaces o nombres.', 'Si la escriben expertos o periodistas conocidos.', 'Si varios periódicos o webs de noticias fiables cuentan lo mismo.', 'Si está escrita de forma tranquila y objetiva, sin insultar ni exagerar.', 'Si tiene una fecha clara y es reciente.', 'Si presenta datos o números concretos (y dice de dónde salen).', 'Si encaja con cosas que ya sé que son verdad.'] },
    // Sección 3
    { id: 'P11', isPractical: true, news_item: { headline: '¡LO OCULTAN! APAGÓN MASIVO NO FUE CASUALIDAD : Expertos independientes denuncian posible CIBERATAQUE COMBINADO  a la red eléctrica', body: 'Mientras las autoridades ofrecen explicaciones técnicas sobre "fallos en cadena" para el gran apagón que afectó a la península el pasado 28 de abril, crece la preocupación entre círculos de expertos en ciberseguridad que apuntan a una causa mucho más siniestra. Un informe filtrado, elaborado por un grupo de ingenieros eléctricos de internet piensa que la historia podría ser diferente a la que nos cuentan. Ellos aseguran tener pruebas convincentes de una invasión externa coordinada en los sistemas de control de la red eléctrica nacional. El informe que se hace eco en los foros especializados dice: "Esto no fue un simple fallo, fue una prueba. Alguien atacó los ordenadores especiales (llamados SCADA) que controlan que la luz llegue bien a todas las casas y ciudades". También informa que el ataque pudo ser obra de otro país con el objetivo de probar cómo de bien se defiende España ante un ataque por internet y ver si estamos preparados para una "guerra moderna" en la que no se usan solo armas, sino también ataques informáticos (virus). El informe recomienda a la gente no creerse la historia del "fallo técnico" y estar preparados por si hay nuevos apagones más serios en el futuro. Las compañías eléctricas y el Centro Criptológico Nacional, por el momento, han mantenido silencio sobre estas alegaciones específicas, limitándose a difundir los comunicados sobre fallos técnicos.', source_hint: '(Fuente: “informe filtrado” distribuido por canales de mensajería encriptada y foros de ciberseguridad alternativos - Abril 2025)'}, question_quantitative: { id_q_suffix: '_VF', text: '11. ¿Crees que esta noticia sobre el ciberataque y el apagón es verdadera o falsa?', type: 'radio', options: ['Verdadera', 'Falsa'] }, question_qualitative: { id_q_suffix: '_Expl', text: 'Explica brevemente por qué crees que es verdadera o falsa. ¿Qué pistas o señales viste en la noticia (en el titular, en el texto, en la fuente...)?', type: 'textarea' } },
];
const preTestScoringKey: Record<string, Record<string, number>> = {
    'P7_Estrategias': { 'Si la web o la persona que la publica parece de confianza.': 2, 'Si el titular es muy exagerado o busca polémica.': 2, 'Si está bien escrita, sin faltas de ortografía.': 2, 'Si explica de dónde viene la información o da pruebas.': 2, 'Si busco esa misma noticia o sobre quién la publica en otros sitios web para comparar.': 2 },
    'P8_Fuentes_Confianza': { 'Periódicos, telediarios o webs de noticias famosas.': 5, 'Webs oficiales (del gobierno, de la NASA, de universidades...).': 5, 'Un científico o experto conocido que habla del tema.': 5 },
    'P9_Sospecha_Falsa': { 'Un titular súper exagerado o increíble.': 2, 'Muchas faltas de ortografía o frases mal escritas.': 2, 'Uso de MUCHAS MAYÚSCULAS y signos de exclamación !!!': 2, 'Un lenguaje que busca enfadarte, darte miedo o insultar.': 2, 'Que te pida compartirla "URGENTE" con todo el mundo.': 3, 'Que no tenga fecha o sea muy, muy antigua.': 2, 'Que nadie más hable de esa noticia en otros sitios.': 2 },
    'P10_Prob_Verdad': { 'Si explica claramente de dónde viene la información y da enlaces o nombres.': 2, 'Si la escriben expertos o periodistas conocidos.': 1, 'Si varios periódicos o webs de noticias fiables cuentan lo mismo.': 2, 'Si está escrita de forma tranquila y objetiva, sin insultar ni exagerar.': 2, 'Si tiene una fecha clara y es reciente.': 2, 'Si presenta datos o números concretos (y dice de dónde salen).': 1 },
    'P11_VF': { 'Falsa': 15 },
};

function ProfileSetup({ onAuthSuccess }: ProfileSetupProps) {
    const [mode, setMode] = useState<'register' | 'login'>('register');
    const [step, setStep] = useState<RegisterStep>('apodo');
    const initialFormData: FormDataState = {
        apodo: '', genero: '', edad: '', curso_escolar: '',
        password: '', confirmPassword: '', consentimiento: false,
        preTestAnswers: {}, scores: null,
    };
    const [formData, setFormData] = useState<FormDataState>(initialFormData);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // ... (El resto de funciones como calculatePreTestScores, handleInputChange, etc., se mantienen igual)
    const calculatePreTestScores = (answers: Record<string, string | string[]>) => {
        let s1_score = 0; // Perfil (P1-P4) -> No puntúa
        let s2_score = 0; // Estrategias (P5-P10) -> P5 y P6 no puntúan, el resto sí.
        let s3_score = 0; // Práctica (P11)

        const questionToSectionMap: Record<string, 's1' | 's2' | 's3'> = {
            'P1_Horas': 's1', 'P2_Plataformas': 's1', 'P3_Habilidad_Tech': 's1', 'P4_Charla_Peligros': 's1',
            'P5_Habilidad_VF': 's2', 'P6_Dificultad_VF': 's2', 'P7_Estrategias': 's2',
            'P8_Fuentes_Confianza': 's2', 'P9_Sospecha_Falsa': 's2', 'P10_Prob_Verdad': 's2',
            'P11': 's3',
        };

        for (const [questionIdWithSuffix, userAnswer] of Object.entries(answers)) {
            const questionId = questionIdWithSuffix.replace(/_VF$|_Expl$/, '');
            const section = questionToSectionMap[questionId];

            const scoringRule = preTestScoringKey[questionId] || preTestScoringKey[questionIdWithSuffix];

            if (!section || !scoringRule) continue;

            let questionScore = 0;
            if (Array.isArray(userAnswer)) {
                for (const selectedOption of userAnswer) {
                    if (scoringRule[selectedOption]) {
                        questionScore += scoringRule[selectedOption];
                    }
                }
            } else if (typeof userAnswer === 'string') {
                const score = scoringRule[userAnswer];
                if (score !== undefined) {
                    questionScore = score;
                }
            }

            if (section === 's2') s2_score += questionScore;
            else if (section === 's3') s3_score += questionScore;
        }

        return {
            s1: parseFloat(s1_score.toFixed(2)),
            s2: parseFloat(s2_score.toFixed(2)),
            s3: parseFloat(s3_score.toFixed(2)),
            total: parseFloat((s1_score + s2_score + s3_score).toFixed(2)),
        };
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = event.target;
        const isConsentCheckbox = type === 'checkbox' && name === 'consentimiento';
        const newValue = isConsentCheckbox ? (event.target as HTMLInputElement).checked : value;

        if (name.startsWith("preTestAnswer_")) {
            const questionFullId = name.substring("preTestAnswer_".length);
            setFormData(prev => ({
                ...prev,
                preTestAnswers: { ...prev.preTestAnswers, [questionFullId]: newValue as string }
            }));
        } else {
            setFormData(prevData => ({ ...prevData, [name]: newValue }));
        }
        setError('');
    };

    const handlePreTestAnswerChange = (questionId: string, answerValue: string, questionType: 'radio' | 'checkbox') => {
        setError('');
        setFormData(prev => {
            const newAnswers = { ...prev.preTestAnswers };
            if (questionType === 'radio') {
                newAnswers[questionId] = answerValue;
            } else {
                const currentSelection = (newAnswers[questionId] as string[] | undefined) || [];
                newAnswers[questionId] = currentSelection.includes(answerValue)
                    ? currentSelection.filter(item => item !== answerValue)
                    : [...currentSelection, answerValue];
            }
            return { ...prev, preTestAnswers: newAnswers };
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
                { const edadNum = parseInt(formData.edad, 10);
                if (!formData.edad || isNaN(edadNum) || edadNum < 5 || edadNum > 18) { setError('Introduce una edad válida (entre 5 y 18).'); return; }
                setStep('curso');
                break; }
            case 'curso':
                if (!formData.curso_escolar) { setError('Por favor, selecciona tu curso.'); return; }
                setStep('pretest');
                break;
            case 'pretest':
                {
                const answeredAllQuestions = preSurveyQuestions.every(q => {
                    if (q.isPractical) {
                        const vfAnswerKey = q.id + q.question_quantitative.id_q_suffix;
                        const explAnswerKey = q.id + q.question_qualitative.id_q_suffix;
                        const hasVfAnswer = !!formData.preTestAnswers[vfAnswerKey];
                        const hasExplAnswer = !!(formData.preTestAnswers[explAnswerKey] as string || "").trim();
                        return hasVfAnswer && hasExplAnswer;
                    }
                    const answer = formData.preTestAnswers[q.id];
                    return q.type === 'radio' ? !!answer : (Array.isArray(answer) && answer.length > 0);
                });

                if (!answeredAllQuestions) {
                    setError('Por favor, responde todas las preguntas del test, incluyendo la justificación de la noticia.');
                    return;
                }

                const calculatedScores = calculatePreTestScores(formData.preTestAnswers);
                console.log("Puntuaciones calculadas:", calculatedScores);
                setFormData(prev => ({ ...prev, scores: calculatedScores }));
                setStep('final');
                break; }
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
        const registrationData: RegisterPayload = {
            apodo: formData.apodo.trim(),
            genero: formData.genero || 'prefiero_no_decir',
            edad: parseInt(formData.edad, 10),
            password: formData.password,
            consentimiento_obtenido: formData.consentimiento,
            curso_escolar: formData.curso_escolar,
            respuestas_pre_test: formData.preTestAnswers,
            pre_test_s1_perfil_puntos: formData.scores?.s1 ?? 0,
            pre_test_s2_estrategias_puntos: formData.scores?.s2 ?? 0,
            pre_test_s3_practica_puntos: formData.scores?.s3 ?? 0,
            puntuacion_pre_test_total: formData.scores?.total ?? 0,
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

    // --- (MODIFICADO) Función de renderizado con la estructura corregida ---
    const renderQuestion = (q: AnyPreSurveyQuestion) => {
        const createInputId = (questionId: string, index: number) => `${questionId}-${index}`;

        return (
            <div key={q.id} className="pretest-question-card">
            {!q.isPractical ? (
                <>
                    <p className="pretest-question-text">{q.text}</p>
                    {q.type === 'checkbox' && <p className="pretest-instruction">(Puedes marcar todas las que quieras)</p>}
                    <div className="pretest-options-group">
                        {q.options.map((option, index) => {
                            const inputId = createInputId(q.id, index);
                            // La estructura ahora es input y label como hermanos, no anidados.
                            // Esto proporciona una asociación más fiable.
                            return (
                                <label key={inputId} className="radio-checkbox-item">
                                    <input
                                        type={q.type}
                                        id={inputId}
                                        name={q.id}
                                        value={option}
                                        checked={q.type === 'radio' ? formData.preTestAnswers[q.id] === option : (formData.preTestAnswers[q.id] as string[] || []).includes(option)}
                                        onChange={() => handlePreTestAnswerChange(q.id, option, q.type)}
                                        disabled={isLoading}
                                    />
                                    <span>{option}</span>
                                </label>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="practical-news-item">
                    <div className="news-content">
                        <h3>{q.news_item.headline}</h3>
                        {q.news_item.body.split('\n').map((p, i) => p.trim() && <p key={i}>{p}</p>)}
                        {q.news_item.source_hint && <small><em>{q.news_item.source_hint}</em></small>}
                    </div>
                    <div className="question-quantitative">
                        <p className="pretest-question-text">{q.question_quantitative.text}</p>
                        {q.question_quantitative.options.map((option, index) => {
                            const answerKey = q.id + q.question_quantitative.id_q_suffix;
                            const practicalInputId = createInputId(answerKey, index);
                            return (
                                <label key={practicalInputId} className="radio-checkbox-item">
                                    <input
                                        type="radio"
                                        id={practicalInputId}
                                        name={answerKey}
                                        value={option}
                                        checked={formData.preTestAnswers[answerKey] === option}
                                        onChange={() => handlePreTestAnswerChange(answerKey, option, 'radio')}
                                        disabled={isLoading}
                                    />
                                    <span>{option}</span>
                                </label>
                            );
                        })}
                    </div>
                    <div className="question-qualitative">
                        <p className="pretest-question-text">{q.question_qualitative.text}</p>
                        <textarea
                            name={`preTestAnswer_${q.id}${q.question_qualitative.id_q_suffix}`}
                            value={formData.preTestAnswers[q.id + q.question_qualitative.id_q_suffix] as string || ''}
                            onChange={handleInputChange}
                            rows={3}
                            disabled={isLoading}
                            placeholder="Escribe aquí tu explicación..."
                            style={{ width: '100%', marginTop: '5px', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', borderColor: '#ccc', fontFamily: 'inherit', fontSize: '0.95em' }}
                        />
                    </div>
                </div>
            )}
            </div>
        );
    };

    const renderPreTest = () => {
        const sections: Record<string, AnyPreSurveyQuestion[]> = {
          s1: preSurveyQuestions.filter(q => ['P1_Horas', 'P2_Plataformas', 'P3_Habilidad_Tech', 'P4_Charla_Peligros'].includes(q.id)),
          s2: preSurveyQuestions.filter(q => ['P5_Habilidad_VF', 'P6_Dificultad_VF', 'P7_Estrategias', 'P8_Fuentes_Confianza', 'P9_Sospecha_Falsa', 'P10_Prob_Verdad'].includes(q.id)),
          s3: preSurveyQuestions.filter(q => ['P11'].includes(q.id)),
        };

        return (
          <form onSubmit={(e) => handleRegisterNextStep(e)} style={{ maxWidth: '700px', width: '100%' }}>
            <h2>Pequeño test inicial</h2>
            <p className="intro-text-pimpoyo">¡Hola! Soy Pimpoyo. Antes de empezar nuestra aventura para ser detectives de noticias, quiero saber un poco sobre lo que ya conoces. ¡No es un examen, no hay respuestas buenas ni malas! Solo marca lo que piensas o haces normalmente. ¡Gracias por ayudarme!</p>

            <h3>Sección 1: Sobre ti y cómo usas internet</h3>
            {sections.s1.map(q => renderQuestion(q))}

            <h3>Sección 2: ¿Cómo detectas noticias falsas?</h3>
            {sections.s2.map(q => renderQuestion(q))}

            <h3>Sección 3: ¡A practicar!</h3>
            {sections.s3.map(q => renderQuestion(q))}

            <p className="outro-text-pimpoyo">¡Listo! ¡Mil gracias por tus respuestas! Has ayudado mucho a Pimpoyo.</p>
            <button type="submit" className="form-button" style={{ marginTop: '20px' }} disabled={isLoading}>Siguiente</button>
            {error && <p className="error-message">{error}</p>}
          </form>
        );
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
                        <input type="text" className="form-input" name="apodo" placeholder="Escribe tu nickname..." value={formData.apodo} onChange={handleInputChange} required disabled={isLoading} />
                        <input type="password" className="form-input" name="password" placeholder="Contraseña..." value={formData.password} onChange={handleInputChange} required disabled={isLoading} />
                        <button type="submit" className="form-button" disabled={isLoading}>{isLoading ? 'Iniciando...' : 'Entrar'}</button>
                    </form>
                    {error && <p className="error-message">{error}</p>}
                </div>
            )}

            {mode === 'register' && (
                <div className="register-flow">
                    {step === 'apodo' && ( <div className="step-container"><h2>¡Bienvenido/a a Pimpoyo!</h2><p>Por favor, introduce un nickname para empezar:</p><form className="nickname-input-area" onSubmit={(e) => handleRegisterNextStep(e)}><input type="text" className="form-input" name="apodo" value={formData.apodo} onChange={handleInputChange} placeholder="Escribe tu nickname..." maxLength={20} required disabled={isLoading} /><button type="submit" className="form-button" disabled={isLoading}>Siguiente</button></form><div style={{ marginTop: '15px' }}><button type="button" className="switch-mode-link" disabled={isLoading} onClick={() => { setMode('login'); setError(''); setFormData(initialFormData); }}>¿Ya tienes cuenta? Inicia Sesión</button></div>{error && <p className="error-message">{error}</p>}</div>)}
                    {step === 'genero' && (<div className="step-container"><h2>Un poco más sobre ti...</h2><p>Selecciona tu género:</p><div className="nickname-input-area"><select className="form-select" name="genero" value={formData.genero} onChange={handleInputChange} required disabled={isLoading}><option value="">Selecciona...</option><option value="masculino">Masculino</option><option value="femenino">Femenino</option><option value="otro">Otro</option><option value="prefiero_no_decir">Prefiero no decirlo</option></select><button type="button" className="form-button" onClick={handleRegisterNextStep} disabled={isLoading || !formData.genero}>Siguiente</button></div>{error && <p className="error-message">{error}</p>}</div>)}
                    {step === 'edad' && (<div className="step-container"><h2>¡Casi listo!</h2><p>Introduce tu edad:</p><div className="nickname-input-area"><input type="number" className="form-input" name="edad" value={formData.edad} onChange={handleInputChange} placeholder="Tu edad..." required min="5" max="18" disabled={isLoading} /><button type="button" className="form-button" onClick={handleRegisterNextStep} disabled={isLoading || !formData.edad}>Siguiente</button></div>{error && <p className="error-message">{error}</p>}</div>)}
                    {step === 'curso' && (<div className="step-container"><h2>¿En qué curso estás?</h2><p>Esto nos ayudará a adaptar mejor el contenido.</p><div className="nickname-input-area"><select className="form-select" name="curso_escolar" value={formData.curso_escolar} onChange={handleInputChange} required disabled={isLoading}><option value="">Selecciona tu curso...</option><option value="5º de Primaria">5º de Primaria</option><option value="6º de Primaria">6º de Primaria</option><option value="1º de la ESO">1º de la ESO</option><option value="2º de la ESO">2º de la ESO</option><option value="Otro">Otro</option></select><button type="button" className="form-button" onClick={handleRegisterNextStep} disabled={isLoading || !formData.curso_escolar}>Siguiente</button></div>{error && <p className="error-message">{error}</p>}</div>)}
                    {step === 'pretest' && (<div className="step-container pretest-step-style">{renderPreTest()}</div>)}
                    {step === 'final' && (<div className="step-container final-step-style"><h2>Seguridad y Consentimiento</h2><form className="final-step-area" onSubmit={handleRegisterSubmit}><div className="form-field"><label htmlFor="register-password">Contraseña (mín. 6 caracteres):</label><input type="password" id="register-password" name="password" className="form-input" value={formData.password} onChange={handleInputChange} required disabled={isLoading} /></div><div className="form-field"><label htmlFor="register-confirmPassword">Confirmar Contraseña:</label><input type="password" id="register-confirmPassword" name="confirmPassword" className="form-input" value={formData.confirmPassword} onChange={handleInputChange} required disabled={isLoading} /></div><div className="form-field" style={{display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center'}}><input type="checkbox" id="register-consentimiento" name="consentimiento" checked={formData.consentimiento} onChange={handleInputChange} required disabled={isLoading} style={{ width: 'auto' }} /><label htmlFor="register-consentimiento">He leído y acepto el consentimiento informado.</label></div><div style={{textAlign: 'center'}}><button type="submit" className="form-button" disabled={isLoading}>{isLoading ? 'Registrando...' : 'Completar Registro'}</button></div></form>{error && <p className="error-message">{error}</p>}</div>)}
                </div>
            )}
        </div>
    );
}

export default ProfileSetup;