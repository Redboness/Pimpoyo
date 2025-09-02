// src/components/InteractiveTerm/InteractiveTerm.tsx
import React, { useState } from 'react';
import './InteractiveTerm.css';

interface InteractiveTermProps {
  term: string;
  definition: string;
  onTermClick?: (term: string) => void;
}

/**
 * Muestra un término de texto de forma interactiva.
 * Al pasar el ratón (si no se proporciona `onTermClick`), muestra su definición en un popover.
 * Si se proporciona `onTermClick`, actúa como un botón para activar una acción externa,
 * como abrir un panel de glosario.
 * @param {InteractiveTermProps} props - Las propiedades del componente.
 * @param {string} props.term - El término que se mostrará.
 * @param {string} props.definition - La definición del término, mostrada en el popover.
 * @param {(term: string) => void} [props.onTermClick] - Callback opcional que se ejecuta al hacer clic. Si se provee, deshabilita el popover y delega la acción.
 * @returns {React.ReactElement} El elemento `span` interactivo renderizado.
 */
const InteractiveTerm: React.FC<InteractiveTermProps> = ({ term, definition, onTermClick }) => {
  const [showPopover, setShowPopover] = useState(false);

  /**
   * Gestiona los eventos de clic y de teclado ('Enter', 'Space') en el término.
   * Si existe la prop `onTermClick`, la invoca. De lo contrario, alterna la visibilidad
   * del popover con la definición.
   * @param {React.MouseEvent | React.KeyboardEvent} event - El evento de ratón o teclado que activó la función.
   * @returns {void}
   */
  const handleClick = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    if (onTermClick) {
      onTermClick(term);
    } else {
      setShowPopover(!showPopover);
    }
  };

  return (
    <span
      className="interactive-term"
      onMouseEnter={() => !onTermClick && setShowPopover(true)}
      onMouseLeave={() => !onTermClick && setShowPopover(false)}
      onClick={handleClick}
      onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e); }}
      tabIndex={0}
      role="button"
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
