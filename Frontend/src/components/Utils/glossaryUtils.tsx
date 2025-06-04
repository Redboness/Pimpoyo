// src/components/Utils/glossaryUtils.tsx
import React from 'react';
import InteractiveTerm from '../InteractiveTerm/InteractiveTerm.tsx'; // Asegúrate que la extensión sea .tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface GlossaryItem {
  term: string;
  definition: string;
}

export const processTextForGlossary = (
  text: string,
  glossary: GlossaryItem[], // Viene de glossaryForProcessing en ChatContainer
  onTermClickHandler?: (term: string) => void
): React.ReactNode[] => {

  if (!glossary || glossary.length === 0) {
    return [<ReactMarkdown key="full-text-markdown" remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>];
  }

  const expandedTermMap = new Map<string, GlossaryItem>();
  const allFormsForRegex: string[] = [];

  glossary.forEach(item => {
    const baseTerm = item.term;
    const baseTermLower = baseTerm.toLowerCase();

    // Añadir el término base
    expandedTermMap.set(baseTermLower, item);
    if (!allFormsForRegex.includes(baseTerm)) {
      allFormsForRegex.push(baseTerm);
    }

    // Añadir plural simple con 's'
    const pluralS = baseTerm + "s";
    if (pluralS.toLowerCase() !== baseTermLower) { // Evitar añadir si es lo mismo (ej. 'lunes')
      expandedTermMap.set(pluralS.toLowerCase(), item);
      if (!allFormsForRegex.includes(pluralS)) {
        allFormsForRegex.push(pluralS);
      }
    }

    // Añadir plural simple con 'es' (para palabras que terminan en consonante)
    // Esta es una simplificación; el español tiene reglas más complejas.
    // Se podría mejorar con una librería de pluralización o reglas más detalladas.
    const lastChar = baseTerm.slice(-1).toLowerCase();
    const consonants = "bcdfghjklmnpqrstvwxyz"; // Consonantes comunes
    if (consonants.includes(lastChar)) {
      const pluralEs = baseTerm + "es";
      expandedTermMap.set(pluralEs.toLowerCase(), item);
      if (!allFormsForRegex.includes(pluralEs)) {
        allFormsForRegex.push(pluralEs);
      }
    }
  });

  // Crear patrones de regex con límites de palabra, ordenados por longitud descendente
  const sortedRegexForms = allFormsForRegex
    .sort((a, b) => b.length - a.length) // Más largos primero
    .map(form => `\\b(?:${form.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})\\b`); // Escapar y añadir límites de palabra

  if (sortedRegexForms.length === 0) {
      return [<ReactMarkdown key="full-text-markdown" remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>];
  }

  const termsPattern = sortedRegexForms.join('|');
  const regex = new RegExp(`(${termsPattern})`, 'gi'); // Captura la forma encontrada

  const parts = text.split(regex);
  let keyCounter = 0;

  return parts.map((part) => {
    keyCounter++;
    if (!part) return null; // Omitir partes vacías que puedan surgir del split

    const lowerPart = part.toLowerCase();
    // Buscar en el mapa expandido (puede encontrar la forma base o plural)
    const glossaryItemMatch = expandedTermMap.get(lowerPart);

    if (glossaryItemMatch) {
      // Se encontró un término o su plural
      return React.createElement(InteractiveTerm, {
        key: `interactive-${glossaryItemMatch.term}-${keyCounter}`, // Key con el término base
        term: part, // Mostrar la forma que se encontró en el texto (ej. "titulares")
        definition: glossaryItemMatch.definition, // Usar la definición del término base
        onTermClick: onTermClickHandler ? () => onTermClickHandler(glossaryItemMatch.term) : undefined, // Devolver el término base al handler
      });
    }

    // Es un fragmento de texto normal
    if (part.trim() !== '') { // No renderizar si es solo espacio en blanco (ya manejado por los espacios en los fragmentos de texto)
      return (
        <ReactMarkdown
          key={`markdown-part-${keyCounter}`}
          remarkPlugins={[remarkGfm]}
          components={{ p: React.Fragment }}
        >
          {part}
        </ReactMarkdown>
      );
    }
    // Si la parte es solo espacios en blanco y no se ha eliminado por trim(),
    // se puede decidir si preservarla o no. La lógica actual con trim() la omite si es solo espacios.
    // Para mantener espacios entre términos y texto, esos espacios deben ser parte de los `part` que contienen texto.
    return null;
  }).filter(Boolean); // Filtra cualquier valor null
};
