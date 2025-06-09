/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faX, faLightbulb, faBook, faChartPie, faGear } from '@fortawesome/free-solid-svg-icons';
import { SidePanelProps, GlossaryTermPublic, UserDetailedStats } from '../../types/types';
import EstadisticasPimpoyo from '../EstadisticasPimpoyo/EstadisticasPimpoyo';

interface GlossaryEntry {
  id?: number;
  term: string;
  definition: string;
  isDefault: boolean;
  userId?: number | string;
  fecha_creacion?: Date | string;
}

const defaultGlossaryTerms: GlossaryEntry[] = [
    { term: "Algoritmo", definition: "Son como recetas secretas que usan las apps y webs (¡como TikTok o YouTube!). Siguen unos pasos ordenados para decidir qué vídeos mostrarte, qué amigos sugerirte o qué anuncios poner. ¡Intentan aprender lo que te gusta!", isDefault: true },
    { term: "Bulo", definition: "Es una mentira disfrazada de noticia que alguien inventa y comparte para engañar, gastar una broma pesada o incluso para intentar hacer daño. ¡Hay que estar atentos para no caer en ellos!", isDefault: true },
    { term: "Cámara de Eco", definition: "A veces, en internet o en las redes sociales, los algoritmos nos muestran solo noticias e ideas que ya nos gustan o con las que estamos de acuerdo. Esto crea como una 'burbuja' donde no vemos otras opiniones y parece que todo el mundo piensa igual que nosotros.", isDefault: true },
    { term: "Clickbait", definition: "Son esos titulares o imágenes súper exagerados y curiosos que ves en internet y que te hacen pinchar casi sin pensar (¡clic!). A veces, la noticia que encuentras después no es tan emocionante o incluso es un poco engañosa. ¡Solo querían tu clic!", isDefault: true },
    { term: "Contrastar", definition: "Imagina que un amigo te cuenta algo sorprendente. Para saber si es del todo cierto, ¿a que le preguntarías a otros amigos también? Contrastar es hacer eso con las noticias: buscar la misma información en diferentes sitios (periódicos, webs, teles...) para ver si todos cuentan lo mismo o si hay pistas diferentes. ¡Es como ser un detective que junta varias piezas!", isDefault: true },
    { term: "Contexto", definition: "Es como el escenario completo de una película. Para entender bien una noticia, necesitas saber no solo *qué* pasó, sino también *cuándo* pasó, *dónde*, *quiénes* estaban allí y *qué más* importante estaba ocurriendo al mismo tiempo. ¡Una foto o una frase sacada de contexto puede engañar mucho!", isDefault: true },
    { term: "Deepfake", definition: "¡Es como magia de ordenador muy avanzada! Usan inteligencia artificial para crear vídeos o audios falsos que parecen súper reales, donde una persona famosa (¡o cualquiera!) dice o hace cosas que nunca hizo de verdad. ¡Pueden ser muy difíciles de pillar!", isDefault: true },
    { term: "Desinformación", definition: "Es información que es mentira y que alguien la crea y la comparte (a propósito) para engañar, confundir o hacer que la gente crea algo que no es cierto. No es un simple error, ¡hay intención detrás!", isDefault: true },
    { term: "Evidencia", definition: "Son las pistas que te ayudan a saber si algo es verdad. Pueden ser números, fotos que no estén trucadas, documentos oficiales, o lo que dice un verdadero experto en un tema. ¡Como un detective!", isDefault: true },
    { term: "Fake news", definition: "Es otra forma de llamar a las noticias que son mentira. Se escriben y se comparten a propósito para que la gente crea cosas que no son ciertas, a veces para confundir o para que alguien piense de una manera determinada.", isDefault: true },
    { term: "Fiable", definition: "Cuando decimos que una fuente de noticias (como un periódico o una web) es 'fiable', significa que podemos confiar bastante en que la información que nos da es verdadera y ha sido bien investigada. Es como un amigo que sabes que casi siempre te cuenta las cosas como son.", isDefault: true },
    { term: "Fuente (de información)", definition: "Es de dónde viene la noticia, ¡como saber quién te contó un chisme! Puede ser un periódico, una página web, un canal de tele, un experto o incluso un amigo. Siempre hay que preguntarse: ¿quién lo dice? ¿Y puedo confiar en esa fuente?", isDefault: true },
    { term: "Hecho", definition: "Es algo que se puede demostrar que es verdad o que realmente ocurrió. Por ejemplo, 'Madrid es la capital de España' es un hecho. No depende de si te gusta o no, ¡simplemente es así!", isDefault: true },
    { term: "Imagen manipulada", definition: "Es una foto o un dibujo que alguien ha cambiado con el ordenador para que parezca de verdad, pero en realidad está trucada. Puede ser para quitar a alguien, añadir algo que no estaba, o hacer que parezca que pasó algo que no es cierto. ¡Ojo, que no todo lo que brilla es oro!", isDefault: true },
    { term: "Manipulación", definition: "Es cuando alguien intenta cambiar la forma en que piensas o sientes sobre algo, usando información de manera tramposa. Puede ser mostrando solo una parte de la historia, exagerando mucho o inventando cosas para llevarte a una conclusión que a esa persona le interesa.", isDefault: true },
    { term: "Noticia falsa", definition: "Es simplemente una noticia que no es verdad. Alguien la inventó o se equivocó mucho, pero la presentan como si fuera real.", isDefault: true },
    { term: "Opinión", definition: "Es lo que una persona piensa, siente o cree sobre algo. Por ejemplo, decir 'el color azul es el más bonito' es una opinión. No se puede demostrar si es verdadera o falsa, ¡porque es el gusto de cada uno! Es diferente a un hecho.", isDefault: true },
    { term: "Propaganda", definition: "Es información que se presenta de una forma especial para intentar convencerte de que apoyes una idea, un producto o a un grupo de personas (como un partido político). A veces usa verdades, pero otras exagera mucho o esconde partes de la historia para lograr su objetivo.", isDefault: true },
    { term: "Sátira / Parodia", definition: "Son como noticias 'de mentirijillas' que se hacen para hacer reír o para criticar algo de forma graciosa. Imitan el estilo de las noticias serias, ¡pero cuentan cosas inventadas y exageradas! Si no pillas la broma, ¡te la pueden colar como si fuera verdad!", isDefault: true },
    { term: "Sesgo", definition: "Imagina que en un partido de fútbol, el comentarista solo habla bien de un equipo y mal del otro. ¡Eso es sesgo! En las noticias, ocurre cuando la información se presenta de forma que favorece más una idea o a un grupo, en lugar de contar todos los lados de la historia de manera equilibrada.", isDefault: true },
    { term: "Titular", definition: "Es como el título de un libro o una película, ¡pero para las noticias! Es esa frase grande y llamativa que ves primero y que intenta contarte de qué va la historia y hacer que quieras leer más.", isDefault: true },
    { term: "Verificar", definition: "¡Es hacer de detective con las noticias! Significa no creerte algo a la primera, sino buscar más información, mirar en otros sitios o preguntar a expertos para estar más seguro de si es verdad o no.", isDefault: true },
    { term: "Viral", definition: "Piensa en un vídeo súper divertido o una noticia muy sorprendente que de repente todo el mundo está viendo y compartiendo en TikTok, WhatsApp o YouTube. ¡Eso es que se ha hecho viral! Se extiende súper rápido, como un resfriado en clase.", isDefault: true }
];

const tipsResumen = [
  { icon: '🕵️‍♀️', text: 'Verifica siempre quién publica la noticia (la fuente).' },
  { icon: '🆚', text: 'Busca la noticia en otros medios fiables para contrastar.' },
  { icon: '📅', text: 'Revisa la fecha de publicación. ¡Las noticias viejas pueden engañar!' },
  { icon: '🎣', text: 'Desconfía de titulares muy exagerados o que buscan el "clickbait".' },
  { icon: '✍️', text: 'Fíjate en si hay faltas de ortografía o está mal escrito.' },
  { icon: '🔍', text: 'Busca si la noticia aporta pruebas (evidencia) o solo opiniones.' },
  { icon: '🧐', text: 'Analiza si la noticia cuenta diferentes puntos de vista o tiene sesgo.' },
  { icon: '😲', text: 'Cuidado si una noticia busca provocarte una emoción muy fuerte y repentina.' },
  { icon: '🤔', text: 'Pregúntate siempre: ¿quién se beneficia al difundir esta información?' }
];

function SidePanel({
    isOpen,
    onClose,
    userInfo,
    authToken,
    onLogout,
    onSettingsSaved,
    onStartPostTest,
    selectedTerm,
    initialSection
}: SidePanelProps) {
  const [activeSection, setActiveSection] = useState<string | null>(initialSection || 'chuleta');
  const [nicknameSetting, setNicknameSetting] = useState('');
  const [avatarUrlSetting, setAvatarUrlSetting] = useState('');
  const [settingsLoading, setSettingsLoading] = useState<boolean>(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [userGlossaryTerms, setUserGlossaryTerms] = useState<GlossaryEntry[]>([]);
  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [glossaryLoading, setGlossaryLoading] = useState(false);
  const [glossaryError, setGlossaryError] = useState<string | null>(null);
  const [fetchedStats, setFetchedStats] = useState<UserDetailedStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (userInfo) {
      setNicknameSetting(userInfo.apodo);
      setAvatarUrlSetting(userInfo.avatar_url || '');
    } else {
      setNicknameSetting('');
      setAvatarUrlSetting('');
    }
  }, [userInfo]);

  const fetchUserGlossaryTerms = useCallback(async () => {
    if (!authToken) { return; }
    setGlossaryLoading(true);
    setGlossaryError(null);
    try {
      const response = await fetch('/api/glossary/', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP error ${response.status}` }));
        throw new Error(errorData.detail || `Failed to fetch glossary: ${response.status}`);
      }
      const fetchedData: GlossaryTermPublic[] = await response.json();
      const formattedData: GlossaryEntry[] = fetchedData.map(termFromApi => ({
        id: termFromApi.id, term: termFromApi.termino, definition: termFromApi.definicion,
        isDefault: false, userId: termFromApi.usuario_sesion_id, fecha_creacion: termFromApi.fecha_creacion
      })).filter(entry => entry.term && entry.definition);
      setUserGlossaryTerms(formattedData);
    } catch (error) {
      setGlossaryError(error instanceof Error ? error.message : 'No se pudieron cargar tus palabras.');
      setUserGlossaryTerms([]);
    } finally {
      setGlossaryLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (isOpen && activeSection === 'glossary' && authToken) {
      fetchUserGlossaryTerms();
    }
   }, [isOpen, activeSection, authToken, fetchUserGlossaryTerms]);

  const fetchUserStats = useCallback(async () => {
    if (!authToken) {
      setStatsError("No autenticado. No se pueden cargar estadísticas.");
      setFetchedStats(null);
      return;
    }
    setIsStatsLoading(true);
    setStatsError(null);
    try {
      const response = await fetch('/api/users/me/detailed-stats', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `Error HTTP ${response.status}` }));
        throw new Error(errorData.detail || `Error al cargar estadísticas: ${response.status}`);
      }
      const statsData: UserDetailedStats = await response.json();
      setFetchedStats(statsData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'No se pudieron cargar las estadísticas.';
      setStatsError(errorMessage);
      setFetchedStats(null);
    } finally {
      setIsStatsLoading(false);
    }
  }, [authToken]);
  
  useEffect(() => {
    if (isOpen && activeSection === 'stats' && !isStatsLoading) {
      fetchUserStats();
    }
    if ((!isOpen && activeSection === 'stats') || (isOpen && activeSection !== 'stats')) {
       setFetchedStats(null);
       setStatsError(null);
    }
  }, [isOpen, activeSection, fetchUserStats]);

  useEffect(() => {
    if (isOpen && initialSection) {
      if (activeSection !== initialSection) {
        setActiveSection(initialSection);
      }
    }
  }, [isOpen, initialSection]);

  useEffect(() => {
    if (isOpen && activeSection === 'glossary' && selectedTerm) {
      const timer = setTimeout(() => {
        const sanitizedTermId = `glossary-entry-${selectedTerm.toLowerCase().replace(/[^a-z0-9ñáéíóúü]+/gi, '-')}`;
        const element = document.getElementById(sanitizedTermId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlighted-term-momentarily');
          setTimeout(() => {
            element.classList.remove('highlighted-term-momentarily');
          }, 2500);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeSection, selectedTerm]);

  const handleSectionChange = (section: string | null) => {
    setActiveSection(section);
    if (section === 'settings' && userInfo) {
      setNicknameSetting(userInfo.apodo);
      setAvatarUrlSetting(userInfo.avatar_url || '');
    }
    if (section !== 'glossary') {
      setNewTerm('');
      setNewDefinition('');
      setGlossaryError(null);
    }
  };

  const handleSaveSettings = async () => {
     setSettingsFeedback(null);
    const newNickname = nicknameSetting.trim();
    const newAvatarUrl = avatarUrlSetting.trim();
    if (!newNickname) { setSettingsFeedback({ type: 'error', message: 'El nickname no puede estar vacío.' }); return; }
    setSettingsLoading(true);
    try {
        const bodyPayload = { apodo: newNickname, avatar_url: newAvatarUrl || null };
        const response = await fetch('/api/users/me/', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }, body: JSON.stringify(bodyPayload) });
        setSettingsLoading(false);
        const responseData = await response.json();
        if (!response.ok) { throw new Error(responseData.detail || `Error: ${response.status}`); }
        setSettingsFeedback({ type: 'success', message: '¡Cambios guardados!' });
        onSettingsSaved();
        setTimeout(() => setSettingsFeedback(null), 3000);
    } catch (error) {
        setSettingsLoading(false);
        const message = error instanceof Error ? error.message : 'Error al guardar ajustes.';
        setSettingsFeedback({ type: 'error', message });
    }
  };

  const handleAddGlossaryTerm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTerm.trim() || !newDefinition.trim()) { setGlossaryError("Debes escribir un término y una definición."); return; }
    if (!authToken) { setGlossaryError("Error de autenticación."); return; }
    setGlossaryError(null);
    setGlossaryLoading(true);
    try {
        const response = await fetch('/api/glossary/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' },
            body: JSON.stringify({ termino: newTerm.trim(), definicion: newDefinition.trim() })
        });
        if (!response.ok) {
             let errorDetail = `Error ${response.status}: ${response.statusText}`;
             try {
                 const errorJson = await response.json();
                 errorDetail = errorJson.detail || errorDetail;
             } catch (e) { console.error("Error parsing JSON:", e); }
            throw new Error(errorDetail);
        }
        setNewTerm('');
        setNewDefinition('');
        await fetchUserGlossaryTerms();
    } catch (error) {
        setGlossaryError(error instanceof Error ? error.message : 'No se pudo añadir la palabra.');
    } finally {
        setGlossaryLoading(false);
    }
  };

  const groupedGlossary = useMemo(() => {
    const combinedTerms = [...defaultGlossaryTerms, ...userGlossaryTerms];
    const validTerms = combinedTerms.filter((term) => term && typeof term.term === 'string' && term.term.length > 0);
    let sortedTerms: GlossaryEntry[] = [];
    try {
        sortedTerms = [...validTerms].sort((a, b) => a.term.localeCompare(b.term));
    } catch (sortError) {
        console.error("Error durante la ordenación:", sortError);
        sortedTerms = [...validTerms];
    }
    const finalGroupedResult = sortedTerms.reduce((acc, term) => {
        const firstLetter = term.term[0].toUpperCase();
        if (/^[A-Z]$/.test(firstLetter)) {
            if (!acc[firstLetter]) { acc[firstLetter] = []; }
            acc[firstLetter].push(term);
        } else {
            const otherCategory = '#';
            if (!acc[otherCategory]) { acc[otherCategory] = []; }
            acc[otherCategory].push(term);
        }
        return acc;
    }, {} as Record<string, GlossaryEntry[]>);
    return finalGroupedResult;
  }, [userGlossaryTerms]);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

  const puedeHacerPostTest = userInfo &&
                             (userInfo.puntuacion_pre_test !== null && userInfo.puntuacion_pre_test !== undefined) &&
                             (userInfo.puntuacion_post_test === null || userInfo.puntuacion_post_test === undefined);

  const yaHizoPostTest = userInfo &&
                        (userInfo.puntuacion_post_test !== null && userInfo.puntuacion_post_test !== undefined);

  const necesitaPreTest = userInfo && (userInfo.puntuacion_pre_test === null || userInfo.puntuacion_pre_test === undefined);

  return (
    <div id="side-panel" className={`side-panel ${isOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <h2>PANEL DE AYUDA</h2>
        <button id="close-panel-btn" className="panel-button-close" aria-label="Cerrar panel" onClick={onClose}>
          <FontAwesomeIcon icon={faX} />
        </button>
      </div>

      <div className="panel-content">
        <div className="panel-nav-buttons">
            <button id="btn-chuleta" className={`panel-button ${activeSection === 'chuleta' ? 'active' : ''}`} onClick={() => handleSectionChange('chuleta')}>
                <FontAwesomeIcon icon={faLightbulb} />
                <span>Chuleta</span>
            </button>
            <button id="btn-glossary" className={`panel-button ${activeSection === 'glossary' ? 'active' : ''}`} onClick={() => handleSectionChange('glossary')}>
                <FontAwesomeIcon icon={faBook} />
                <span>Glosario</span>
            </button>
            <button id="btn-stats" className={`panel-button ${activeSection === 'stats' ? 'active' : ''}`} onClick={() => handleSectionChange('stats')}>
                <FontAwesomeIcon icon={faChartPie} />
                <span>Estadísticas</span>
            </button>
            <button id="btn-settings" className={`panel-button ${activeSection === 'settings' ? 'active' : ''}`} onClick={() => handleSectionChange('settings')}>
                <FontAwesomeIcon icon={faGear} />
                <span>Ajustes</span>
            </button>
        </div>

        {activeSection === 'chuleta' && (
          <div id="chuleta-content" className="panel-section-content" style={{ display: 'block' }}>
            <h3>Chuleta de Consejos 📝</h3>
            <ul className="chuleta-list">
              {tipsResumen.map((tip, index) => (
                <li key={index} className="chuleta-item">
                  <span className="chuleta-icon">{tip.icon}</span>
                  <p>{tip.text}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeSection === 'glossary' && (
          <div id="glossary-content" className="panel-section-content" style={{ display: 'block' }}>
            <h3>Glosario de Términos</h3>
            <form onSubmit={handleAddGlossaryTerm} className="glossary-add-form">
              <h4>Añadir mi palabra</h4>
              <div className="form-field">
                <label htmlFor="new-term-input">Término:</label>
                <input type="text" id="new-term-input" className="form-input" value={newTerm} onChange={(e) => setNewTerm(e.target.value)} placeholder="Escribe la palabra..." maxLength={50} required disabled={glossaryLoading} />
              </div>
              <div className="form-field">
                <label htmlFor="new-definition-input">Definición:</label>
                <textarea id="new-definition-input" className="form-textarea" value={newDefinition} onChange={(e) => setNewDefinition(e.target.value)} placeholder="Escribe qué significa..." rows={3} required disabled={glossaryLoading} />
              </div>
              {glossaryError && !glossaryLoading && <p className="error-message">{glossaryError}</p>}
              <button type="submit" className="form-button primary" disabled={glossaryLoading}>
                {glossaryLoading ? 'Guardando...' : 'Añadir Palabra'}
              </button>
            </form>
            <hr className="separator"/>
            <div className="glossary-index">
              {alphabet.map(letter => (
                groupedGlossary[letter]
                  ? <a key={letter} href={`#glossary-letter-${letter.toLowerCase()}`}>{letter}</a>
                  : <span key={letter}>{letter}</span>
              ))}
              {groupedGlossary['#'] && <a href="#glossary-letter-symbol">#</a>}
            </div>
            <hr className="separator"/>
            {glossaryLoading && userGlossaryTerms.length === 0 && !glossaryError && <p>Cargando tus palabras...</p> }
            {!glossaryLoading && !glossaryError && Object.keys(groupedGlossary).length === 0 && <p>Aún no hay palabras en el glosario. ¡Añade la primera!</p> }
            {Object.keys(groupedGlossary).sort((a, b) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)).map(letter => (
              <div key={letter} className="glossary-letter-group">
                <h4 id={`glossary-letter-${letter === '#' ? 'symbol' : letter.toLowerCase()}`} className="glossary-letter-heading">{letter}</h4>
                <dl>
                  {groupedGlossary[letter].map((entry) => {
                    const termId = `glossary-entry-${entry.term.toLowerCase().replace(/[^a-z0-9ñáéíóúü]+/gi, '-')}`;
                    return (
                      <React.Fragment key={termId}>
                        <dt id={termId}>{entry.term} {!entry.isDefault && <span className="user-term-tag">(Mi palabra)</span>}</dt>
                        <dd>{entry.definition}</dd>
                      </React.Fragment>
                    );
                  })}
                </dl>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'stats' && (
          <div id="stats-content" className="panel-section-content" style={{ display: 'block' }}>
            <EstadisticasPimpoyo
              totalAnalizadas={fetchedStats?.totalAnalizadas ?? 0}
              aciertos={fetchedStats?.aciertos ?? 0}
              fallos={fetchedStats?.fallos ?? 0}
              xp={fetchedStats?.xp ?? 0}
              xpNextLevel={fetchedStats && fetchedStats.xpNextLevel > 0 ? fetchedStats.xpNextLevel : 1}
            />
            <div className="progress-section">
                <h3>Evaluación de progreso</h3>
                {necesitaPreTest && (
                    <p className="progress-text">
                        Primero necesitas completar las actividades iniciales para desbloquear la evaluación de progreso.
                    </p>
                )}
                {puedeHacerPostTest && (
                    <button
                        className="panel-button action-button"
                        onClick={() => {
                            if(onStartPostTest) onStartPostTest();
                            onClose();
                        }}
                    >
                        Evaluar mi progreso actual
                    </button>
                )}
                {yaHizoPostTest && userInfo && (
                    <p className="progress-text-completed">
                        ¡Ya completaste tu evaluación de progreso!
                        <br />
                        Puntuación: {userInfo.puntuacion_post_test?.toFixed(2)}%
                    </p>
                )}
            </div>
          </div>
        )}

        {activeSection === 'settings' && (
          <div id="settings-content" className="panel-section-content" style={{ display: 'block' }}>
            <h3>Ajustes de Perfil</h3>
            {userInfo ? (<>
              <div className="setting-item">
                <label htmlFor="settings-nickname-input">Nickname</label>
                <input type="text" id="settings-nickname-input" className="settings-input" value={nicknameSetting} onChange={(e) => setNicknameSetting(e.target.value)} maxLength={20} disabled={settingsLoading} />
              </div>
              <div className="setting-item">
                <label htmlFor="settings-avatar-url-input">URL del Avatar</label>
                <input type="url" id="settings-avatar-url-input" className="settings-input" placeholder="Pega la URL de tu imagen aquí..." value={avatarUrlSetting} onChange={(e) => setAvatarUrlSetting(e.target.value)} disabled={settingsLoading} />
                {avatarUrlSetting && <img src={avatarUrlSetting} alt="Avatar preview" className="avatar-preview" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
              </div>
              <button id="settings-save-btn" className="panel-button action-button" onClick={handleSaveSettings} disabled={settingsLoading}>
                {settingsLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              {settingsFeedback && (
                <p className={`settings-feedback ${settingsFeedback.type}`}>
                  {settingsFeedback.message}
                </p>
              )}
            </>) : (
              <p>Cargando información...</p>
            )}
          </div>
        )}
      </div>

      <div className="logout-button-wrapper">
        <button id="settings-logout-btn" onClick={onLogout}>
          Salir de Pimpoyo
        </button>
      </div>
    </div>
  );
}

export default SidePanel;