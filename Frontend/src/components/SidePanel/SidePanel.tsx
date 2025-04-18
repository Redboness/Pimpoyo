// src/components/SidePanel/SidePanel.tsx
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faX } from '@fortawesome/free-solid-svg-icons'; // Assuming UserInfo is defined in types.ts or similar
import { SidePanelProps } from '../../types/types';

// --- Componente SidePanel ---
function SidePanel({ isOpen, onClose, userInfo, authToken, onLogout, onSettingsSaved }: SidePanelProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // State for Settings fields
  const [nicknameSetting, setNicknameSetting] = useState('');
  const [avatarUrlSetting, setAvatarUrlSetting] = useState(''); // State for avatar URL input
  const [settingsLoading, setSettingsLoading] = useState<boolean>(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Effect to update settings fields when userInfo changes (loads or updates)
  useEffect(() => {
    if (userInfo) {
        setNicknameSetting(userInfo.apodo);
        // <<< MODIFIED: Load avatar_url from userInfo >>>
        setAvatarUrlSetting(userInfo.avatar_url || ''); // Use '' if null/undefined
    } else {
        setNicknameSetting('');
        setAvatarUrlSetting('');
    }
  }, [userInfo]); // Depends on userInfo

  // Change active panel section
  const handleSectionChange = (section: string | null) => {
    setActiveSection(section);
    // Reset fields only if opening settings and userInfo is available
    if (section === 'settings' && userInfo) {
        setNicknameSetting(userInfo.apodo);
        setAvatarUrlSetting(userInfo.avatar_url || '');
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setSettingsFeedback(null);
    const newNickname = nicknameSetting.trim();
    const newAvatarUrl = avatarUrlSetting.trim(); // Get trimmed avatar URL

    if (!newNickname) {
        setSettingsFeedback({ type: 'error', message: 'El nickname no puede estar vacío.' });
        return;
    }

    setSettingsLoading(true);

    try {
        // <<< MODIFIED: Include avatar_url in the PATCH body >>>
        const bodyPayload: { apodo: string; avatar_url?: string | null } = {
            apodo: newNickname,
            // Send avatar_url only if it's not empty, otherwise potentially send null
            // Adjust based on backend requirements (does it accept null or empty string?)
            avatar_url: newAvatarUrl || null
        };

        const response = await fetch('/api/users/me/', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(bodyPayload),
        });

        setSettingsLoading(false);
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.detail || `Error: ${response.status}`);
        }

        // Success
        setSettingsFeedback({ type: 'success', message: '¡Cambios guardados!' });

        // <<< ADDED: Call the callback to notify parent >>>
        onSettingsSaved();

        setTimeout(() => setSettingsFeedback(null), 3000); // Hide feedback

    } catch (error) {
        setSettingsLoading(false);
        const message = error instanceof Error ? error.message : 'Error al guardar ajustes.';
        console.error("Error guardando ajustes:", error);
        setSettingsFeedback({ type: 'error', message });
    }
  };

  // --- Renderizado ---
  return (
    <div id="side-panel" className={isOpen ? 'open' : ''}>
      <div className="panel-header">
        <h2>PANEL</h2>
        <button id="close-panel-btn" className="button-panel" aria-label="Cerrar panel" onClick={onClose}>
          <FontAwesomeIcon icon={faX} />
        </button>
      </div>
      <div className="panel-content">
        <button id="btn-glossary" className="panel-button" onClick={() => handleSectionChange('glossary')}>GLOSARIO</button>
        <button id="btn-stats" className="panel-button" onClick={() => handleSectionChange('stats')}>ESTADÍSTICAS</button>
        <button id="btn-settings" className="panel-button" onClick={() => handleSectionChange('settings')}>AJUSTES</button>

        {/* --- Secciones --- */}
        {activeSection === 'glossary' && ( <div id="glossary-content" className="panel-section-content" style={{ display: 'block' }}><h3>Glosario</h3><p>(Contenido...)</p></div> )}
        {activeSection === 'stats' && ( <div id="stats-content" className="panel-section-content" style={{ display: 'block' }}><h3>Estadísticas</h3><p>(Contenido...)</p></div> )}

        {/* Sección Ajustes */}
        {activeSection === 'settings' && (
          <div id="settings-content" className="panel-section-content" style={{ display: 'block' }}>
            <h3>Ajustes</h3>
            {userInfo ? (
              <>
                {/* Nickname */}
                <div className="setting-item">
                  <label htmlFor="settings-nickname-input">Nickname:</label>
                  <input type="text" id="settings-nickname-input" className="settings-input"
                    value={nicknameSetting} onChange={(e) => setNicknameSetting(e.target.value)}
                    maxLength={20} disabled={settingsLoading} />
                </div>
                {/* Avatar URL */}
                <div className="setting-item">
                  <label htmlFor="settings-avatar-url-input">URL del Avatar:</label>
                  {/* <<< Simple preview - enhance as needed >>> */}
                  {avatarUrlSetting && <img src={avatarUrlSetting} alt="Avatar preview" style={{ width: '40px', height: '40px', borderRadius: '50%', verticalAlign: 'middle', marginLeft: '10px', objectFit: 'cover' }} onError={(e) => (e.currentTarget.style.display = 'none')} onLoad={(e) => (e.currentTarget.style.display = 'inline-block')} />}
                  <input type="url" id="settings-avatar-url-input" className="settings-input"
                    placeholder="Pega la URL de tu imagen aquí..." value={avatarUrlSetting}
                    onChange={(e) => setAvatarUrlSetting(e.target.value)} disabled={settingsLoading} />
                </div>
                {/* Save Button */}
                <button id="settings-save-btn" className="panel-button" style={{ marginTop: '20px' }}
                  onClick={handleSaveSettings} disabled={settingsLoading}>
                  {settingsLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                {/* Feedback */}
                {settingsFeedback && (
                  <p style={{ color: settingsFeedback.type === 'success' ? 'green' : 'red', textAlign: 'center', marginTop: '10px', fontWeight: 'bold' }}>
                    {settingsFeedback.message}
                  </p>
                )}
              </>
            ) : ( <p>Cargando información...</p> )}
            <hr style={{ margin: '25px 0 15px 0', border: 'none', borderTop: '1px solid #eee' }} />
            {/* Logout Button */}
            <button id="settings-logout-btn" className="panel-button logout-button" onClick={onLogout}>
              Salir del Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SidePanel;
