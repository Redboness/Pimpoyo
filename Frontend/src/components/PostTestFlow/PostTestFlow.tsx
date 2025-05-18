// src/components/PostTestFlow/PostTestFlow.tsx
import React, { useState, useEffect } from 'react';
import {
    NoticiaParaAnalisisPostTest,
    PostTestFlowProps,
    // PostTestFlowProps, // Ya está en la definición de la función
    PostTestStartResponse,
    PostTestSubmitPayload,
    PostTestSubmitResponse,
    PreguntaPostTestEleccion,
    RespuestaAnalisisNoticiaItem,
    RespuestaPreguntaEleccionItem
} from '../../types/types';

type TestPhase = 'loading' | 'preguntasEleccion' | 'analisisNoticias' | 'submitting' | 'finished' | 'error';

function PostTestFlow({ authToken, onTestComplete, onCancelTest }: PostTestFlowProps) {
  const [phase, setPhase] = useState<TestPhase>('loading');
  const [preguntasEleccion, setPreguntasEleccion] = useState<PreguntaPostTestEleccion[]>([]);
  const [noticiasParaAnalizar, setNoticiasParaAnalizar] = useState<NoticiaParaAnalisisPostTest[]>([]);

  const [currentPreguntaEleccionIndex, setCurrentPreguntaEleccionIndex] = useState(0);
  const [currentNoticiaAnalisisIndex, setCurrentNoticiaAnalisisIndex] = useState(0);

  const [respuestasEleccion, setRespuestasEleccion] = useState<RespuestaPreguntaEleccionItem[]>([]);
  const [respuestasAnalisis, setRespuestasAnalisis] = useState<RespuestaAnalisisNoticiaItem[]>([]);

  const [currentAnswersEleccion, setCurrentAnswersEleccion] = useState<Record<string, string>>({});

  const [error, setError] = useState<string | null>(null);

  // ESTADO PARA GUARDAR LOS DATOS NUMÉRICOS DEL RESULTADO
  const [testResultData, setTestResultData] = useState<PostTestSubmitResponse | null>(null);

  useEffect(() => {
    const fetchTestData = async () => {
      setError(null);
      setPhase('loading');
      try {
        const response = await fetch('/api/activity/post-test/start', {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || 'No se pudieron cargar los ítems para el test.');
        }
        const data: PostTestStartResponse = await response.json();

        const numExpectedChoiceQuestions = 5;
        const numExpectedAnalysisNews = 6;

        if (!data.preguntas_eleccion || data.preguntas_eleccion.length < numExpectedChoiceQuestions ||
            !data.noticias_para_analizar || data.noticias_para_analizar.length < numExpectedAnalysisNews) {
          console.warn("Datos recibidos del backend para post-test:", data);
          throw new Error(`No se recibieron suficientes ítems para el test. Se esperaban ${numExpectedChoiceQuestions} preguntas y ${numExpectedAnalysisNews} noticias. Recibido: ${data.preguntas_eleccion?.length || 0} preguntas, ${data.noticias_para_analizar?.length || 0} noticias.`);
        }

        setPreguntasEleccion(data.preguntas_eleccion.slice(0, numExpectedChoiceQuestions));
        setNoticiasParaAnalizar(data.noticias_para_analizar.slice(0, numExpectedAnalysisNews));
        setPhase('preguntasEleccion');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido al cargar el test.');
        setPhase('error');
      }
    };
    fetchTestData();
  }, [authToken]);

  const handleEleccionAnswer = (idPregunta: string, opcionSeleccionada: string) => {
    setError(null);
    setCurrentAnswersEleccion(prev => ({ ...prev, [idPregunta]: opcionSeleccionada }));
  };

  const nextPreguntaEleccion = () => {
    if (preguntasEleccion.length === 0 || !preguntasEleccion[currentPreguntaEleccionIndex]) {
        setError("Error: No hay pregunta actual para responder.");
        return;
    }
    const currentPregunta = preguntasEleccion[currentPreguntaEleccionIndex];
    if (!currentAnswersEleccion[currentPregunta.id_pregunta]) {
        setError("Por favor, selecciona una respuesta.");
        return;
    }
    setError(null);
    const nuevaRespuesta: RespuestaPreguntaEleccionItem = {
        id_pregunta: currentPregunta.id_pregunta,
        respuesta_seleccionada: currentAnswersEleccion[currentPregunta.id_pregunta]
    };
    setRespuestasEleccion(prev => {
        const otrasRespuestas = prev.filter(r => r.id_pregunta !== currentPregunta.id_pregunta);
        return [...otrasRespuestas, nuevaRespuesta];
    });

    if (currentPreguntaEleccionIndex < preguntasEleccion.length - 1) {
      setCurrentPreguntaEleccionIndex(prev => prev + 1);
      setCurrentAnswersEleccion({});
    } else {
      setPhase('analisisNoticias');
      setCurrentAnswersEleccion({});
    }
  };

  const handleAnalisisAnswer = (idNoticia: string, evaluacion: 'TRUE' | 'FALSE') => {
    setError(null);
    setRespuestasAnalisis(prev => {
        const otrasRespuestas = prev.filter(r => r.noticia_id_json !== idNoticia);
        return [...otrasRespuestas, { noticia_id_json: idNoticia, evaluacion_usuario: evaluacion }];
    });

    if (currentNoticiaAnalisisIndex < noticiasParaAnalizar.length - 1) {
      setCurrentNoticiaAnalisisIndex(prev => prev + 1);
    } else {
      console.log("Última noticia analizada. El useEffect se encargará del envío.");
    }
  };

  useEffect(() => {
    if (phase === 'analisisNoticias' &&
        noticiasParaAnalizar.length > 0 &&
        preguntasEleccion.length > 0 && // Añadido para asegurar que las preguntas de elección también están listas
        respuestasAnalisis.length === noticiasParaAnalizar.length &&
        respuestasEleccion.length === preguntasEleccion.length) {
      console.log("Todas las preguntas y noticias respondidas, procediendo a enviar el test.");
      handleSubmitTest();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [respuestasAnalisis, respuestasEleccion, noticiasParaAnalizar, preguntasEleccion, phase]);


  const handleSubmitTest = async () => {
    if (respuestasEleccion.length !== preguntasEleccion.length ||
        respuestasAnalisis.length !== noticiasParaAnalizar.length) {
      console.error("Discrepancia en handleSubmitTest:", {
          respuestasEleccionL: respuestasEleccion.length, pE: preguntasEleccion.length,
          respuestasAnalisisL: respuestasAnalisis.length, nA: noticiasParaAnalizar.length
      });
      setError("Asegúrate de responder todas las preguntas y analizar todas las noticias.");
      return;
    }

    setPhase('submitting');
    setError(null);
    try {
      const payload: PostTestSubmitPayload = {
        respuestas_eleccion: respuestasEleccion,
        respuestas_analisis_noticias: respuestasAnalisis
      };
      const response = await fetch('/api/activity/post-test/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload),
      });
      const resultDataFromAPI: PostTestSubmitResponse = await response.json();
      if (!response.ok) {
        throw new Error(resultDataFromAPI.message || 'Error al enviar el test.');
      }
      setTestResultData(resultDataFromAPI); // <--- GUARDAR EL RESULTADO DIRECTAMENTE
      setPhase('finished');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al enviar el test.');
      setPhase('error');
    }
  };

  // --- Renderizado ---
  if (phase === 'loading') return <div className="post-test-flow-container"><p className="post-test-loading-error">Cargando Post-Test...</p></div>;
  if (phase === 'error') return <div className="post-test-flow-container"><p className="post-test-loading-error">Error: {error} <button className="post-test-button post-test-button-next" onClick={() => window.location.reload()}>Reintentar</button>{onCancelTest && <button className="post-test-button post-test-button-cancel" onClick={onCancelTest}>Cancelar</button>}</p></div>;

  if (phase === 'finished' && testResultData) { // <--- AHORA DEPENDE DE testResultData
    return (
      <div className="post-test-flow-container">
        <div className="post-test-finished-message">
            {/* Construir el mensaje usando los datos numéricos del estado testResultData */}
            <p>
              ¡Test completado! Tu puntuación final: {testResultData.puntuacion_final.toFixed(2)}%
              ({testResultData.aciertos}/{testResultData.total_preguntas} aciertos).
            </p>
            <button
                className="post-test-button post-test-button-next"
                style={{ marginTop: '20px' }}
                onClick={() => {
                    // Pasar los datos numéricos directamente desde testResultData
                    onTestComplete(
                        testResultData.puntuacion_final,
                        testResultData.aciertos,
                        testResultData.total_preguntas
                    );
                }}
            >
                Volver al Chat
            </button>
        </div>
      </div>
    );
  }

  if (phase === 'preguntasEleccion') {
    // ... (tu JSX para preguntasEleccion se mantiene igual)
    if (preguntasEleccion.length === 0 || !preguntasEleccion[currentPreguntaEleccionIndex]) {
         return <div className="post-test-flow-container"><p>No hay preguntas de elección disponibles o índice fuera de rango.</p>{onCancelTest && <button className="post-test-button post-test-button-cancel" onClick={onCancelTest}>Cancelar Test</button>}</div>;
    }
    const currentP = preguntasEleccion[currentPreguntaEleccionIndex];
    return (
      <div className="post-test-flow-container">
        <h2 className="post-test-title">Preguntas ({currentPreguntaEleccionIndex + 1} / {preguntasEleccion.length})</h2>
        <div className="post-test-item-block">
          <p className="post-test-question-text">{currentP.texto_pregunta}</p>
          <div className="post-test-options-group">
            {currentP.opciones.map((opcion: string) => (
              <label
                key={opcion}
                className={`post-test-option-item ${currentAnswersEleccion[currentP.id_pregunta] === opcion ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name={currentP.id_pregunta}
                  value={opcion}
                  checked={currentAnswersEleccion[currentP.id_pregunta] === opcion}
                  onChange={() => handleEleccionAnswer(currentP.id_pregunta, opcion)}
                />
                {opcion}
              </label>
            ))}
          </div>
        </div>
        <button
          onClick={nextPreguntaEleccion}
          disabled={!currentAnswersEleccion[currentP.id_pregunta]}
          className="post-test-button post-test-button-next"
        >
          {currentPreguntaEleccionIndex < preguntasEleccion.length - 1 ? 'Siguiente Pregunta' : 'Pasar a Análisis de Noticias'}
        </button>
        {error && <p className="post-test-loading-error" style={{marginTop: '10px'}}>{error}</p>}
        {onCancelTest && <button className="post-test-button post-test-button-cancel" style={{marginTop: '10px'}} onClick={onCancelTest}>Cancelar Test</button>}
      </div>
    );
  }

  if (phase === 'analisisNoticias') {
    // ... (tu JSX para analisisNoticias se mantiene igual)
     if (noticiasParaAnalizar.length === 0 || !noticiasParaAnalizar[currentNoticiaAnalisisIndex]) {
        return <div className="post-test-flow-container"><p>No hay noticias para analizar o índice fuera de rango.</p>{onCancelTest && <button className="post-test-button post-test-button-cancel" onClick={onCancelTest}>Cancelar Test</button>}</div>;
    }
    const currentN = noticiasParaAnalizar[currentNoticiaAnalisisIndex];
    // const esUltimaNoticia = currentNoticiaAnalisisIndex === noticiasParaAnalizar.length - 1; // Ya no necesitamos un botón de submit explícito aquí

    return (
      <div className="post-test-flow-container">
        <h2 className="post-test-title">Análisis de Noticia ({currentNoticiaAnalisisIndex + 1} / {noticiasParaAnalizar.length})</h2>
        <div className="post-test-item-block">
          <h3 className="post-test-news-headline">{currentN.headline}</h3>
          {currentN.source && <p className="post-test-news-source">Fuente: {currentN.source}</p>}
          <div className="post-test-news-text-scroll">
            {currentN.text.split('\n').map((paragraph: string, index: number) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
                onClick={() => handleAnalisisAnswer(currentN.noticia_id_json, 'TRUE')}
                className="post-test-button post-test-button-true"
            >
              Creo que es Verdadera
            </button>
            <button
                onClick={() => handleAnalisisAnswer(currentN.noticia_id_json, 'FALSE')}
                className="post-test-button post-test-button-false"
            >
              Creo que es Falsa
            </button>
          </div>
        </div>
        {error && <p className="post-test-loading-error" style={{marginTop: '10px'}}>{error}</p>}
        {onCancelTest && <button className="post-test-button post-test-button-cancel" style={{marginTop: '20px'}} onClick={onCancelTest}>Cancelar Test</button>}
      </div>
    );
  }

  return <div className="post-test-flow-container"><p>Cargando el test...</p></div>;
}

export default PostTestFlow;
