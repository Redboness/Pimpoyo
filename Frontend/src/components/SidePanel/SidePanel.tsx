/* eslint-disable react-hooks/exhaustive-deps */
// src/components/SidePanel/SidePanel.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faX } from '@fortawesome/free-solid-svg-icons';
import { SidePanelProps, GlossaryTermPublic, UserDetailedStats } from '../../types/types'; // Asegúrate que UserInfo y SidePanelProps estén actualizadas en types.ts
import EstadisticasPimpoyo from '../EstadisticasPimpoyo/EstadisticasPimpoyo';

// Define la estructura interna y los términos por defecto para el glosario
interface GlossaryEntry {
  id?: number;
  term: string;
  definition: string;
  isDefault: boolean;
  userId?: number | string;
  fecha_creacion?: Date | string;
}

const defaultGlossaryTerms: GlossaryEntry[] = [
  { term: "Algoritmo", definition: "Conjunto ordenado de operaciones sistemáticas que permite hacer un cálculo y hallar la solución de un tipo de problemas.", isDefault: true },
  { term: "Bulo", definition: "Noticia falsa propagada con algún fin.", isDefault: true },
  { term: "Clickbait", definition: "Título o miniatura llamativa que busca generar clics a toda costa, a menudo con contenido engañoso.", isDefault: true },
  { term: "Deepfake", definition: "Video o audio manipulado usando inteligencia artificial para hacer que alguien parezca decir o hacer algo que no hizo.", isDefault: true },
  { term: "Fake news", definition: "Noticia falsa o bulo difundido con intención de engañar.", isDefault: true },
  { term: "Fuente (de información)", definition: "El origen de una noticia o información. Puede ser un periódico, una web, una persona, etc. Es importante saber si la fuente es fiable.", isDefault: true },
  { term: "Manipulación", definition: "Información falsa que se crea y difunde a propósito para engañar o hacer daño.", isDefault: true },
  { term: "Noticia Falsa", definition: "Información engañosa presentada como noticia.", isDefault: true },
  { term: "Verificar", definition: "Comprobar si una información es verdadera buscando pruebas o consultando otras fuentes.", isDefault: true },
];

// Componente SidePanel
function SidePanel({
    isOpen,
    onClose,
    userInfo,
    authToken,
    onLogout,
    onSettingsSaved,
    onStartPostTest // <--- RECIBIR LA NUEVA PROP
}: SidePanelProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
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
    if (!authToken) { console.warn("fetchUserGlossaryTerms: No auth token found."); return; }
    console.log("Fetching user glossary terms from API...");
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
      console.error("Error fetching user glossary terms:", error);
      setGlossaryError(error instanceof Error ? error.message : 'No se pudieron cargar tus palabras.');
      setUserGlossaryTerms([]);
    } finally {
      setGlossaryLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (activeSection === 'glossary' && authToken) {
      fetchUserGlossaryTerms();
    }
   }, [activeSection, authToken, fetchUserGlossaryTerms]);

  const fetchUserStats = useCallback(async () => {
    if (!authToken) {
      console.warn("fetchUserStats: No auth token found.");
      setStatsError("No autenticado. No se pueden cargar estadísticas.");
      setFetchedStats(null);
      return;
    }
    console.log("Fetching detailed user stats...");
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
      console.log("Detailed stats fetched successfully:", statsData);

    } catch (error) {
      console.error("Error fetching user stats:", error);
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
    if (!isOpen || activeSection !== 'stats') {
       setFetchedStats(null);
       setStatsError(null);
    }
  }, [isOpen, activeSection, fetchUserStats]);

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
        onSettingsSaved(); // Esto refrescará la userInfo en ChatContainer
        setTimeout(() => setSettingsFeedback(null), 3000);
    } catch (error) {
        setSettingsLoading(false);
        const message = error instanceof Error ? error.message : 'Error al guardar ajustes.';
        console.error("Error guardando ajustes:", error);
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
        await fetchUserGlossaryTerms(); // Refrescar la lista
    } catch (error) {
        console.error("Error al añadir término del glosario:", error);
        setGlossaryError(error instanceof Error ? error.message : 'No se pudo añadir la palabra.');
    } finally {
        setGlossaryLoading(false); // Asegurar que se quita el loading incluso si hay error al final
    }
  };

  const groupedGlossary = useMemo(() => {
    // ... (tu lógica de groupedGlossary)
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

  // Lógica para decidir si mostrar el botón de post-test
  // Asumiendo que UserInfo en types.ts ahora tiene puntuacion_pre_test y puntuacion_post_test
  const puedeHacerPostTest = userInfo &&
                             (userInfo.puntuacion_pre_test !== null && userInfo.puntuacion_pre_test !== undefined) &&
                             (userInfo.puntuacion_post_test === null || userInfo.puntuacion_post_test === undefined);

  const yaHizoPostTest = userInfo &&
                        (userInfo.puntuacion_post_test !== null && userInfo.puntuacion_post_test !== undefined);

  const necesitaPreTest = userInfo && (userInfo.puntuacion_pre_test === null || userInfo.puntuacion_pre_test === undefined);


  return (
    <div id="side-panel" className={`side-panel ${isOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <h2>PANEL</h2>
        <button id="close-panel-btn" className="panel-button-close" aria-label="Cerrar panel" onClick={onClose}>
          <FontAwesomeIcon icon={faX} />
        </button>
      </div>

      <div className="panel-content">
        <div className="panel-nav-buttons">
          <button id="btn-glossary" className={`panel-button ${activeSection === 'glossary' ? 'active' : ''}`} onClick={() => handleSectionChange('glossary')}>GLOSARIO</button>
          <button id="btn-stats" className={`panel-button ${activeSection === 'stats' ? 'active' : ''}`} onClick={() => handleSectionChange('stats')}>ESTADÍSTICAS</button>
          <button id="btn-settings" className={`panel-button ${activeSection === 'settings' ? 'active' : ''}`} onClick={() => handleSectionChange('settings')}>AJUSTES</button>
        </div>

        {activeSection === 'glossary' && (
          // ... (tu contenido de glosario) ...
          <div id="glossary-content" className="panel-section-content" style={{ display: 'block' }}>
            <h3>Glosario</h3>
            <form onSubmit={handleAddGlossaryTerm} className="glossary-add-form" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fdf9e0', borderRadius: '8px' }}>
               <h4 style={{marginTop: 0, marginBottom: '15px'}}>Añadir mi palabra</h4>
               <div className="form-field" style={{ marginBottom: '10px' }}>
                  <label htmlFor="new-term-input" style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>Término:</label>
                  <input type="text" id="new-term-input" className="form-input" value={newTerm} onChange={(e) => setNewTerm(e.target.value)} placeholder="Escribe la palabra..." maxLength={50} required disabled={glossaryLoading} style={{ width: '100%', boxSizing: 'border-box' }} />
               </div>
               <div className="form-field" style={{ marginBottom: '15px' }}>
                 <label htmlFor="new-definition-input" style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>Definición:</label>
                 <textarea id="new-definition-input" className="form-textarea" value={newDefinition} onChange={(e) => setNewDefinition(e.target.value)} placeholder="Escribe qué significa..." rows={3} required disabled={glossaryLoading} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
               </div>
               {glossaryError && !glossaryLoading && <p className="error-message" style={{color: 'red', marginTop: '-5px', marginBottom: '10px'}}>{glossaryError}</p>}
                <button type="submit" className="form-button primary" disabled={glossaryLoading}>
                    {glossaryLoading ? (userGlossaryTerms.length === 0 && !glossaryError ? 'Cargando...' : 'Guardando...') : 'Añadir Palabra'}
                </button>
            </form>
            <hr className="separator"/>
            <div className="glossary-index">
              {alphabet.map(letter => (
                groupedGlossary[letter]
                  ? <a key={letter} href={`#glossary-${letter}`}>{letter}</a>
                  : <span key={letter} style={{ padding: '2px 5px', color: '#ccc' }}>{letter}</span>
              ))}
              {groupedGlossary['#'] && <a href="#glossary-#">#</a>}
            </div>
            <hr className="separator"/>
            {glossaryLoading && userGlossaryTerms.length === 0 && !glossaryError && <p>Cargando tus palabras...</p> }
            {!glossaryLoading && !glossaryError && Object.keys(groupedGlossary).length === 0 && <p>Aún no hay palabras en el glosario. ¡Añade la primera!</p> }
            {Object.keys(groupedGlossary).sort((a, b) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)).map(letter => (
              <div key={letter} className="glossary-letter-group">
                <h4 id={`glossary-${letter}`} className="glossary-letter-heading">{letter}</h4>
                <dl>
                  {groupedGlossary[letter].map((entry, index) => (
                    <React.Fragment key={entry.isDefault ? `default-${letter}-${index}` : `user-${entry.id}`}>
                      <dt>{entry.term} {!entry.isDefault && <span style={{color: 'purple', fontSize: '0.8em', marginLeft: '5px'}}>(Mi palabra)</span>}</dt>
                      <dd>{entry.definition}</dd>
                    </React.Fragment>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'stats' && (
          <div id="stats-content" className="panel-section-content rpg-stats-section" style={{ display: 'block' }}>
             {isStatsLoading && <p>Cargando estadísticas...</p>}
             {statsError && <p className="error-message" style={{color: 'red'}}>Error: {statsError}</p>}
             {!isStatsLoading && !statsError && fetchedStats && (
               <EstadisticasPimpoyo
                 totalAnalizadas={fetchedStats.totalAnalizadas ?? 0}
                 aciertos={fetchedStats.aciertos ?? 0}
                 fallos={fetchedStats.fallos ?? 0}
                 xp={fetchedStats.xp ?? 0}
                 xpNextLevel={fetchedStats.xpNextLevel > 0 ? fetchedStats.xpNextLevel : 1}
               />
             )}
             {!isStatsLoading && !statsError && !fetchedStats && (
                <p>No hay datos de estadísticas disponibles o aún no has jugado.</p>
             )}

            {/* Sección para el Botón de Post-Test */}
            <hr className="separator" style={{marginTop: '25px', marginBottom: '15px'}}/>
            <h3 style={{color: '#4a3112', marginBottom: '10px'}}>Evaluación de progreso</h3>
            {necesitaPreTest && (
                 <p style={{textAlign: 'center', color: '#777', fontSize: '0.9em'}}>
                    Primero necesitas completar las actividades iniciales para desbloquear la evaluación de progreso.
                 </p>
            )}
            {puedeHacerPostTest && (
                <button
                    className="panel-button"
                    onClick={() => {
                        if(onStartPostTest) onStartPostTest();
                        onClose(); // Cierra el panel lateral
                    }}
                    // Aplicar un estilo distintivo para este botón
                    style={{ backgroundColor: '#5cb85c', color: 'white', fontWeight: 'bold', border: 'none' }}
                >
                    Evaluar mi progreso actual
                </button>
            )}
            {yaHizoPostTest && userInfo && ( // Mostrar puntuación si ya hizo el post-test
                <p style={{textAlign: 'center', color: 'green', fontWeight: 'bold', marginTop:'10px'}}>
                    ¡Ya completaste tu evaluación de progreso!
                    <br />
                    Puntuación: {userInfo.puntuacion_post_test?.toFixed(2)}%
                </p>
            )}
          </div>
        )}

        {activeSection === 'settings' && (
          // ... (tu contenido de ajustes) ...
          <div id="settings-content" className="panel-section-content" style={{ display: 'block' }}>
            <h3>Ajustes</h3>
            {userInfo ? (<>
              <div className="setting-item">
                <label htmlFor="settings-nickname-input">Nickname:</label>
                <input type="text" id="settings-nickname-input" className="settings-input" value={nicknameSetting} onChange={(e) => setNicknameSetting(e.target.value)} maxLength={20} disabled={settingsLoading} />
              </div>
              <div className="setting-item">
                <label htmlFor="settings-avatar-url-input">URL del Avatar:</label>
                {avatarUrlSetting &&
                  <img src={avatarUrlSetting} alt="Avatar preview" className="avatar-preview" style={{ width: '40px', height: '40px', borderRadius: '50%', verticalAlign: 'middle', marginLeft: '10px', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).src = ''; }}
                    onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'inline-block'; }} />
                }
                <input type="url" id="settings-avatar-url-input" className="settings-input" placeholder="Pega la URL de tu imagen aquí..." value={avatarUrlSetting} onChange={(e) => setAvatarUrlSetting(e.target.value)} disabled={settingsLoading} />
              </div>
              <button id="settings-save-btn" className="panel-button" style={{ marginTop: '20px' }} onClick={handleSaveSettings} disabled={settingsLoading}>
                {settingsLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              {settingsFeedback && (
                <p style={{ color: settingsFeedback.type === 'success' ? 'green' : 'red', textAlign: 'center', marginTop: '10px', fontWeight: 'bold' }}>
                  {settingsFeedback.message}
                </p>
              )}
            </>) : (
              <p>Cargando información...</p>
            )}
            {/* El botón de Logout se mueve al final del panel-content */}
          </div>
        )}
      </div>
      {/* Contenedor separado para el botón de logout, siempre visible al final del panel */}
      <div style={{padding: '20px', borderTop: '1px solid rgba(148, 171, 61, 0.2)', marginTop: 'auto' }}>
        <button id="settings-logout-btn" className="panel-button logout-button" onClick={onLogout}>
          Salir de Pimpoyo
        </button>
      </div>
    </div>
  );
}

export default SidePanel;
