// src/components/PostTestFlow/PostTestFlow.tsx
import React, { useState, useEffect, useMemo } from 'react';
import './PostTestFlow.css';
import {
    PostTestFlowProps, PostTestQuestion, NoticiaParaAnalisisPostTest,
    PostTestStartResponse, PostTestSubmitPayload, PostTestSubmitResponse
} from '../../types/types';

type TestPhase = 'loading' | 'in-progress' | 'submitting' | 'finished' | 'error';
type AllTestItems = (PostTestQuestion | NoticiaParaAnalisisPostTest)[];

const combineTestItems = (questions: PostTestQuestion[], news: NoticiaParaAnalisisPostTest[]): AllTestItems => {
    const items: AllTestItems = [...questions];
    const s3NewsIndex = questions.findIndex(q => q.seccion_id === 's4');
    if (s3NewsIndex !== -1) {
        items.splice(s3NewsIndex, 0, ...news);
    } else {
        items.push(...news);
    }
    return items;
};

function PostTestFlow({ authToken, onTestComplete, onCancelTest }: PostTestFlowProps) {
    const [phase, setPhase] = useState<TestPhase>('loading');
    const [allItems, setAllItems] = useState<AllTestItems>([]);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);

    const [respuestasEleccion, setRespuestasEleccion] = useState<Record<string, string[]>>({});
    const [respuestasTexto, setRespuestasTexto] = useState<Record<string, string>>({});
    const [respuestaNoticia, setRespuestaNoticia] = useState<{ evaluacion?: 'Verdadero' | 'Falso', justificacion: string }>({ justificacion: '' });

    const [error, setError] = useState<string | null>(null);
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
                const combined = combineTestItems(data.preguntas, data.noticias_para_analizar);
                setAllItems(combined);
                setPhase('in-progress');
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error desconocido al cargar el test.');
                setPhase('error');
            }
        };
        fetchTestData();
    }, [authToken]);

    const currentItem = useMemo(() => allItems[currentItemIndex], [allItems, currentItemIndex]);
    const isQuestion = (item: any): item is PostTestQuestion => 'texto_pregunta' in item;

    const handleNext = async () => {
        setError(null);
        if (isQuestion(currentItem)) {
            if (currentItem.tipo === 'eleccion_unica' || currentItem.tipo === 'eleccion_multiple') {
                if (!respuestasEleccion[currentItem.id_pregunta] || respuestasEleccion[currentItem.id_pregunta].length === 0) {
                    setError("Por favor, selecciona al menos una opción.");
                    return;
                }
            }
            if (currentItem.tipo === 'texto_libre') {
                if (!respuestasTexto[currentItem.id_pregunta]?.trim()) {
                    setError("Por favor, escribe una respuesta.");
                    return;
                }
            }
        } else {
            if (!respuestaNoticia.evaluacion) {
                setError("Por favor, evalúa si la noticia es Verdadera o Falsa.");
                return;
            }
            if (!respuestaNoticia.justificacion.trim()) {
                setError("Por favor, escribe una justificación.");
                return;
            }
        }

        if (currentItemIndex < allItems.length - 1) {
            setCurrentItemIndex(prev => prev + 1);
        } else {
            await handleSubmitTest();
        }
    };

    const handleSubmitTest = async () => {
        setPhase('submitting');
        const payload: PostTestSubmitPayload = {
            respuestas_eleccion: Object.entries(respuestasEleccion).map(([id, resp]) => ({ id_pregunta: id, respuestas_seleccionadas: resp })),
            respuestas_texto: Object.entries(respuestasTexto).map(([id, resp]) => ({ id_pregunta: id, texto_respuesta: resp })),
            respuestas_analisis: allItems
                .filter(item => !isQuestion(item))
                .map(item => ({
                    noticia_id_json: (item as NoticiaParaAnalisisPostTest).noticia_id_json,
                    evaluacion_usuario: respuestaNoticia.evaluacion!,
                    justificacion: respuestaNoticia.justificacion
                }))
        };
        try {
            const response = await fetch('/api/activity/post-test/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify(payload),
            });
            const resultData: PostTestSubmitResponse = await response.json();
            if (!response.ok) throw new Error(resultData.message || 'Error al enviar el test.');
            setTestResultData(resultData);
            setPhase('finished');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido al enviar el test.');
            setPhase('error');
        }
    };

    const handleChoiceChange = (preguntaId: string, opcionId: string, tipo: 'eleccion_unica' | 'eleccion_multiple') => {
        setRespuestasEleccion(prev => {
            const newAnswers = { ...prev };
            if (tipo === 'eleccion_unica') {
                newAnswers[preguntaId] = [opcionId];
            } else {
                const current = newAnswers[preguntaId] || [];
                if (current.includes(opcionId)) {
                    newAnswers[preguntaId] = current.filter(id => id !== opcionId);
                } else {
                    newAnswers[preguntaId] = [...current, opcionId];
                }
            }
            return newAnswers;
        });
    };

    const renderCurrentItem = () => {
        if (!currentItem) return <p>Cargando pregunta...</p>;

        if (isQuestion(currentItem)) {
            const q = currentItem;
            switch (q.tipo) {
                case 'eleccion_unica':
                case 'eleccion_multiple':
                    return (
                        <>
                            <p className="post-test-question-text">{q.texto_pregunta}</p>
                            {q.tipo === 'eleccion_multiple' && (
                                <p className="post-test-instruction">(Selecciona todas las que creas correctas)</p>
                            )}
                            <div className="post-test-options-group">
                                {q.opciones?.map(op => (
                                    <label key={op.id} className={`post-test-option-item ${respuestasEleccion[q.id_pregunta]?.includes(op.id) ? 'selected' : ''}`}>
                                        <input type={q.tipo === 'eleccion_unica' ? 'radio' : 'checkbox'} name={q.id_pregunta} checked={respuestasEleccion[q.id_pregunta]?.includes(op.id) || false} onChange={() => handleChoiceChange(q.id_pregunta, op.id, q.tipo)} />
                                        <span>{op.text}</span>
                                    </label>
                                ))}
                            </div>
                        </>
                    );
                case 'texto_libre':
                     return (
                        <>
                            <p className="post-test-question-text">{q.texto_pregunta}</p>
                            <textarea className="post-test-textarea" value={respuestasTexto[q.id_pregunta] || ''} onChange={e => setRespuestasTexto(prev => ({ ...prev, [q.id_pregunta]: e.target.value }))} rows={5} />
                        </>
                    );
                default: return <p>Tipo de pregunta no reconocido.</p>;
            }
        } else {
            const n = currentItem as NoticiaParaAnalisisPostTest;
            return (
                <>
                    <h3 className="post-test-news-headline">{n.headline}</h3>
                    {n.source && <p className="post-test-news-source">Fuente: {n.source}</p>}
                    <div className="post-test-news-text-scroll">
                        {n.text.split('\n').map((p, i) => <p key={i}>{p}</p>)}
                    </div>
                    <div className="news-evaluation-group">
                        <p>¿Crees que esta noticia es Verdadera o Falsa?</p>
                        <div className="post-test-options-group">
                            <label className={`post-test-option-item option-true ${respuestaNoticia.evaluacion === 'Verdadero' ? 'selected' : ''}`}>
                                <input type="radio" name={n.noticia_id_json} checked={respuestaNoticia.evaluacion === 'Verdadero'} onChange={() => setRespuestaNoticia(p => ({...p, evaluacion: 'Verdadero'}))} />
                                Verdadera
                            </label>
                            <label className={`post-test-option-item option-false ${respuestaNoticia.evaluacion === 'Falso' ? 'selected' : ''}`}>
                                <input type="radio" name={n.noticia_id_json} checked={respuestaNoticia.evaluacion === 'Falso'} onChange={() => setRespuestaNoticia(p => ({...p, evaluacion: 'Falso'}))} />
                                Falsa
                            </label>
                        </div>
                    </div>
                    <p style={{marginTop: '25px', fontWeight: '500'}}>¿Qué pistas o señales ves AHORA en la noticia para justificar tu respuesta?</p>
                    <textarea className="post-test-textarea" value={respuestaNoticia.justificacion} onChange={e => setRespuestaNoticia(p => ({...p, justificacion: e.target.value}))} rows={4} />
                </>
            );
        }
    };

    if (phase === 'loading') return <div className="post-test-flow-container"><p className="post-test-loading-error">Cargando Post-Test...</p></div>;
    if (phase === 'error') return <div className="post-test-flow-container"><p className="post-test-loading-error">Error: {error}</p>{onCancelTest && <button className="post-test-button" onClick={onCancelTest}>Cancelar</button>}</div>;
    if (phase === 'submitting') return <div className="post-test-flow-container"><p className="post-test-loading-error">Enviando y corrigiendo...</p></div>;

    if (phase === 'finished' && testResultData) {
        return (
            <div className="post-test-flow-container">
                <div className="post-test-finished-message">
                    <h2>¡Test completado!</h2>
                    <p>Tu puntuación final ha sido de <strong>{testResultData.puntuacion_total.toFixed(1)}</strong> sobre {testResultData.puntuacion_maxima_posible.toFixed(1)} puntos.</p>
                    <ul className='score-breakdown'>
                        {testResultData.puntuaciones_por_seccion.map(s => (
                            <li key={s.seccion_id}><strong>Sección {s.seccion_id.substring(1)}:</strong> {s.puntos_obtenidos.toFixed(1)} / {s.puntos_maximos.toFixed(1)} pts</li>
                        ))}
                    </ul>
                    <button className="post-test-button" onClick={() => onTestComplete(testResultData.puntuacion_total, testResultData.puntuacion_maxima_posible, testResultData.puntuaciones_por_seccion)}>
                        Volver al Chat
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="post-test-flow-container">
            <h2 className="post-test-title">Post-Test ({currentItemIndex + 1} / {allItems.length})</h2>
            <div className="post-test-content-wrapper">
                <div className="post-test-item-block">
                    {renderCurrentItem()}
                </div>
            </div>
            <div className="post-test-navigation">
                <div className="post-test-loading-error">{error}</div>
                <button className="post-test-button" onClick={handleNext}>
                    {currentItemIndex < allItems.length - 1 ? 'Siguiente' : 'Finalizar y Corregir Test'}
                </button>
            </div>
        </div>
    );
}

export default PostTestFlow;
