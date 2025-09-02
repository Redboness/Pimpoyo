import React from 'react';
import PropTypes from 'prop-types';
import './EstadisticasPimpoyo.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAward, faNewspaper, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';

interface EstadisticasProps {
  totalAnalizadas: number;
  aciertos: number;
  fallos: number;
  xp: number;
  xpNextLevel: number;
}

/**
 * Componente visual que muestra las estadísticas de progreso del usuario.
 * Incluye el rango del detective, el número de noticias analizadas, aciertos, fallos
 * y una barra de progreso de experiencia (XP).
 * @param {EstadisticasProps} props - Las propiedades del componente.
 * @param {number} props.totalAnalizadas - El número total de noticias que el usuario ha analizado.
 * @param {number} props.aciertos - El número total de aciertos.
 * @param {number} props.fallos - El número total de fallos.
 * @param {number} props.xp - Los puntos de experiencia actuales del usuario.
 * @param {number} props.xpNextLevel - Los puntos de experiencia necesarios para alcanzar el siguiente nivel.
 * @returns {React.ReactElement} El componente de estadísticas renderizado.
 */
function EstadisticasPimpoyo({ totalAnalizadas, aciertos, fallos, xp, xpNextLevel }: EstadisticasProps) {
  let rango = "Detective Novato";
  if (xp >= 300) {
    rango = "Detective Maestro";
  } else if (xp >= 150) {
    rango = "Investigador Experto";
  } else if (xp >= 50) {
    rango = "Aprendiz de Detective";
  }

  const porcentajeProgresoXP = xpNextLevel > 0 ? Math.round((xp / xpNextLevel) * 100) : 0;

  const estiloRellenoProgreso = {
    width: `${porcentajeProgresoXP}%`,
  };

  return (
    <div className="estadisticas-pimpoyo">
      <h2>Registro del detective</h2>

      <div className="estadistica-item rango-detective">
        <span className="icono"><FontAwesomeIcon icon={faAward} /></span>
        <div className="stat-main">
          <span className="etiqueta">Rango actual:</span>
          <span className="valor-texto">{rango}</span>
        </div>
      </div>

      <div className="estadistica-item">
        <span className="icono" aria-label="Total"><FontAwesomeIcon icon={faNewspaper} /></span>
        <div className="stat-main">
          <span className="etiqueta">Noticias analizadas:</span>
          <div className="stat-details">
            <span className="valor">{totalAnalizadas}</span>
          </div>
        </div>
      </div>

      <div className="estadistica-item aciertos">
        <span className="icono" aria-label="Aciertos"><FontAwesomeIcon icon={faCheck} /></span>
        <div className="stat-main">
          <span className="etiqueta">Aciertos detectivescos:</span>
          <div className="stat-details">
            <span className="valor">{aciertos}</span>
            {totalAnalizadas > 0 && (
              <div className="mini-barra-progreso">
                <div
                  className="mini-barra-progreso-relleno acierto-fill"
                  style={{ width: `${(aciertos / totalAnalizadas) * 100}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="estadistica-item fallos">
        <span className="icono" aria-label="Fallos"><FontAwesomeIcon icon={faXmark} /></span>
        <div className="stat-main">
          <span className="etiqueta">Intentos fallidos:</span>
          <div className="stat-details">
            <span className="valor">{fallos}</span>
            {totalAnalizadas > 0 && (
              <div className="mini-barra-progreso">
                <div
                  className="mini-barra-progreso-relleno fallo-fill"
                  style={{ width: `${(fallos / totalAnalizadas) * 100}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {xpNextLevel > 0 && (
        <div className="progreso-contenedor">
          <p className="xp-titulo">Experiencia (XP):</p>
          <div className="barra-progreso">
            <div
              className="barra-progreso-relleno"
              style={estiloRellenoProgreso}
              role="progressbar"
              aria-valuenow={xp}
              aria-valuemin={0}
              aria-valuemax={xpNextLevel}
            ></div>
          </div>
          <p className="xp-texto">{xp} / {xpNextLevel} XP</p>
        </div>
      )}
    </div>
  );
}

EstadisticasPimpoyo.propTypes = {
  totalAnalizadas: PropTypes.number.isRequired,
  aciertos: PropTypes.number.isRequired,
  fallos: PropTypes.number.isRequired,
  xp: PropTypes.number.isRequired,
  xpNextLevel: PropTypes.number.isRequired,
};

export default EstadisticasPimpoyo;
