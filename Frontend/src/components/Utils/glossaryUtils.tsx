// src/components/Utils/glossaryUtils.ts
import React from 'react';
import InteractiveTerm from '../InteractiveTerm/InteractiveTerm';
import ReactMarkdown from 'react-markdown'; // <--- Asegúrate de que esta línea esté
import remarkGfm from 'remark-gfm';         // <--- Asegúrate de que esta línea esté

interface GlossaryItem {
  term: string;
  definition: string;
}

// Función para procesar el texto y convertirlo en elementos de React
export const processTextForGlossary = (
  text: string,
  glossary: GlossaryItem[],
  onTermClickHandler?: (term: string) => void
): React.ReactNode[] => {
  if (!glossary || glossary.length === 0) {
    // Si no hay glosario, todo el texto debe ser procesado por Markdown
    return [<ReactMarkdown key="full-text-markdown" remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>];
  }

  const termMap = new Map(glossary.map(item => [item.term.toLowerCase(), item]));
  const sortedTerms = [...glossary].sort((a, b) => b.term.length - a.term.length);
  const termsPattern = sortedTerms
    .map(item => item.term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
    .join('|');
  const regex = new RegExp(`(${termsPattern})`, 'gi');
  const parts = text.split(regex);
  let keyCounter = 0;

  return parts.map((part) => {
    const lowerPart = part.toLowerCase();
    const glossaryMatch = termMap.get(lowerPart);

    if (glossaryMatch) {
      // Es un término del glosario
      return React.createElement(InteractiveTerm, {
        key: `${glossaryMatch.term}-${keyCounter++}`,
        term: part,
        definition: glossaryMatch.definition,
        onTermClick: onTermClickHandler,
      });
    }
    // Es un fragmento de texto normal
    if (part && part.trim() !== '') {
      // Envuelve el fragmento de texto con ReactMarkdown y remarkGfm
      return <ReactMarkdown key={`markdown-part-${keyCounter++}`} remarkPlugins={[remarkGfm]}>{part}</ReactMarkdown>;
    }
    return null; // Para partes vacías o solo con espacios
  }).filter(part => part !== null); // Filtra los elementos nulos
};
