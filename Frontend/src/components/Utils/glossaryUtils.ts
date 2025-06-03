// src/utils/glossaryUtils.ts
import React from 'react';
import InteractiveTerm from '../InteractiveTerm/InteractiveTerm';

interface GlossaryItem {
  term: string;
  definition: string;
}

// Función para procesar el texto y convertirlo en elementos de React
export const processTextForGlossary = (
  text: string,
  glossary: GlossaryItem[],
  onTermClickHandler?: (term: string) => void // Callback para cuando se hace clic en un término
): React.ReactNode[] => {
  if (!glossary || glossary.length === 0) {
    return [text]; // Si no hay glosario, devuelve el texto original
  }

  // Crear un mapa para buscar definiciones fácilmente y priorizar términos más largos
  const termMap = new Map(glossary.map(item => [item.term.toLowerCase(), item]));

  // Ordenar los términos por longitud descendente para evitar coincidencias parciales
  // (ej. si "Fake News" y "News" están, queremos que "Fake News" se detecte primero)
  const sortedTerms = [...glossary].sort((a, b) => b.term.length - a.term.length);

  // Construir una expresión regular que encuentre cualquiera de los términos del glosario.
  // Se escapa cada término para que caracteres especiales en ellos no rompan el regex.
  const termsPattern = sortedTerms
    .map(item => item.term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
    .join('|');
  
  const regex = new RegExp(`(${termsPattern})`, 'gi'); // Global e Insensible a mayúsculas/minúsculas

  const parts = text.split(regex);
  let keyCounter = 0;

  return parts.map((part) => {
    const lowerPart = part.toLowerCase();
    const glossaryMatch = termMap.get(lowerPart);

    if (glossaryMatch) {
      // Es un término del glosario
      return React.createElement(InteractiveTerm, {
        key: `${glossaryMatch.term}-${keyCounter++}`,
        term: part, // Usamos 'part' para mantener la capitalización original del texto
        definition: glossaryMatch.definition,
        onTermClick: onTermClickHandler,
      });
    }
    // Es un fragmento de texto normal
    return part;
  }).filter(part => part !== ''); // Eliminar partes vacías que puedan surgir del split
};