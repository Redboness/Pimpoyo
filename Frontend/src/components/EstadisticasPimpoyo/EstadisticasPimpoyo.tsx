// src/components/EstadisticasPimpoyo/EstadisticasPimpoyo.tsx
import React from 'react';
import PropTypes from 'prop-types';
import './EstadisticasPimpoyo.css'; // Importa el CSS

// CORREGIDO: Interfaz actualizada para incluir xp y xpNextLevel
interface EstadisticasProps {
  totalAnalizadas: number;
  aciertos: number;
  fallos: number;
  xp: number;           // <-- Prop recibida
  xpNextLevel: number;  // <-- Prop recibida
}

// CORREGIDO: Firma de la función actualizada para recibir las props
function EstadisticasPimpoyo({ totalAnalizadas, aciertos, fallos, xp, xpNextLevel }: EstadisticasProps) {

  // --- NUEVO: Lógica para determinar el Rango ---
  let rango = "Detective Novato"; // Rango por defecto
  if (xp >= 300) {
    rango = "Detective Maestro";
  } else if (xp >= 150) {
    rango = "Investigador Experto"; // Ajustado nombre para ejemplo 175 XP
  } else if (xp >= 50) {
    rango = "Aprendiz de Detective";
  }
  // --------------------------------------

  // --- CORREGIDO: Cálculo de progreso usa XP ---
  const porcentajeProgresoXP = xpNextLevel > 0 ? Math.round((xp / xpNextLevel) * 100) : 0;

  const estiloRellenoProgreso = {
    width: `${porcentajeProgresoXP}%`, // Usamos el nuevo porcentaje
  };
  // -----------------------------------------

  return (
    <div className="estadisticas-pimpoyo">
    <h2>Registro del Detective</h2>

    {/* --- Rango --- */}
    <div className="estadistica-item rango-detective">
      <span className="icono">🎖️</span>
      {/* Contenedor para etiqueta y valor */}
      <div className="stat-main">
        <span className="etiqueta">Rango Actual:</span>
        <span className="valor-texto">{rango}</span>
      </div>
    </div>

    {/* --- Noticias Analizadas --- */}
    <div className="estadistica-item">
      <span className="icono" aria-label="Total">📰</span>
      {/* Contenedor para etiqueta y valor */}
      <div className="stat-main">
        <span className="etiqueta">Noticias Analizadas:</span>
        {/* Contenedor solo para el valor (sin barra aquí) */}
        <div className="stat-details">
           <span className="valor">{totalAnalizadas}</span>
           {/* No ponemos mini-barra para el total */}
        </div>
      </div>
    </div>

    {/* --- Aciertos + Mini Barra --- */}
    <div className="estadistica-item aciertos">
      <span className="icono" aria-label="Aciertos">✔️</span>
      {/* Contenedor para etiqueta y valor+barra */}
      <div className="stat-main">
        <span className="etiqueta">Aciertos Detectivescos:</span>
        {/* Contenedor para valor Y la nueva mini-barra */}
        <div className="stat-details">
          <span className="valor">{aciertos}</span>
          {/* Mini barra para Aciertos */}
          {totalAnalizadas > 0 && (
            <div className="mini-barra-progreso">
              <div
                className="mini-barra-progreso-relleno acierto-fill" // Clase específica para color
                style={{ width: `${(aciertos / totalAnalizadas) * 100}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* --- Fallos + Mini Barra --- */}
    <div className="estadistica-item fallos">
      <span className="icono" aria-label="Fallos">❌</span>
       {/* Contenedor para etiqueta y valor+barra */}
      <div className="stat-main">
        <span className="etiqueta">Pistas a Revisar:</span>
         {/* Contenedor para valor Y la nueva mini-barra */}
        <div className="stat-details">
          <span className="valor">{fallos}</span>
           {/* Mini barra para Fallos */}
          {totalAnalizadas > 0 && (
            <div className="mini-barra-progreso">
              <div
                className="mini-barra-progreso-relleno fallo-fill" // Clase específica para color
                style={{ width: `${(fallos / totalAnalizadas) * 100}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* --- Barra de XP (sin cambios estructurales aquí) --- */}
    {xpNextLevel > 0 && (
      <div className="progreso-contenedor">
        {/* Separador visual opcional */}
        {/* <hr className="rpg-separator" /> */}
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

// CORREGIDO: PropTypes actualizados (si los usas)
EstadisticasPimpoyo.propTypes = {
  totalAnalizadas: PropTypes.number.isRequired,
  aciertos: PropTypes.number.isRequired,
  fallos: PropTypes.number.isRequired,
  xp: PropTypes.number.isRequired,           // <-- Añadido
  xpNextLevel: PropTypes.number.isRequired,  // <-- Añadido
};

export default EstadisticasPimpoyo;
