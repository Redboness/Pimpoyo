// src/components/InteractiveTerm/InteractiveTerm.tsx
import React, { useState } from 'react';
import './InteractiveTerm.css'; // Crearemos este archivo para los estilos

interface InteractiveTermProps {
  term: string;
  definition: string;
  // Opcional: para manejar clic y llevar al panel del glosario
  onTermClick?: (term: string) => void; 
}

// Componente para mostrar un término del glosario de forma interactiva
const InteractiveTerm: React.FC<InteractiveTermProps> = ({ term, definition, onTermClick }) => {
  const [showPopover, setShowPopover] = useState(false);

  // Función para manejar el clic en el término
  const handleClick = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault(); // Previene comportamiento por defecto si es un link, etc.
    if (onTermClick) {
      onTermClick(term);
    } else {
      // Si no hay onTermClick, simplemente alterna el popover
      setShowPopover(!showPopover);
    }
  };

  return (
    <span
      className="interactive-term"
      onMouseEnter={() => !onTermClick && setShowPopover(true)}
      onMouseLeave={() => !onTermClick && setShowPopover(false)}
      onClick={handleClick}
      onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e);}} // Para accesibilidad con teclado
      tabIndex={0} // Hace que el span sea enfocable
      role="button" // Indica que es interactivo
      aria-expanded={showPopover}
      aria-describedby={showPopover ? `tooltip-${term.replace(/\s+/g, '-')}` : undefined}
    >
      {term}
      {showPopover && !onTermClick && (
        <span className="interactive-term-popover" id={`tooltip-${term.replace(/\s+/g, '-')}`} role="tooltip">
          {definition}
        </span>
      )}
    </span>
  );
};

export default InteractiveTerm;