// src/components/Utils/glossaryUtils.tsx
import React from 'react';
import InteractiveTerm from '../InteractiveTerm/InteractiveTerm.tsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface GlossaryItem {
  term: string;
  definition: string;
}

// Comentario encima de la función processTextForGlossary
export const processTextForGlossary = (
  text: string,
  glossary: GlossaryItem[],
  onTermClickHandler?: (term: string) => void
): React.ReactNode[] => {

  if (!glossary || glossary.length === 0) {
    return [<ReactMarkdown key="full-text-markdown" remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>];
  }

  // Mapa para buscar definiciones fácilmente (case-insensitive)
  const definitionMap = new Map<string, string>();
  glossary.forEach(item => {
    definitionMap.set(item.term.toLowerCase(), item.definition);
  });

  // Regex mejorada que busca [[término]] o [[término|alias]]
  const regex = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;
  
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyCounter = 0;

  // Usamos matchAll para iterar sobre todas las coincidencias
  for (const match of text.matchAll(regex)) {
    const termToLookUp = match[1].trim(); // El término real para buscar en el glosario
    const textToDisplay = match[2]?.trim() || termToLookUp; // El alias a mostrar, o el término si no hay alias
    const termDefinition = definitionMap.get(termToLookUp.toLowerCase());
    const matchIndex = match.index || 0;

    // 1. Añadir el fragmento de texto ANTES de la coincidencia
    if (matchIndex > lastIndex) {
      result.push(
        <ReactMarkdown key={`markdown-part-${keyCounter++}`} remarkPlugins={[remarkGfm]} components={{ p: React.Fragment }}>
          {text.substring(lastIndex, matchIndex)}
        </ReactMarkdown>
      );
    }

    // 2. Añadir el término interactivo SI existe en el glosario
    if (termDefinition) {
      result.push(
        React.createElement(InteractiveTerm, {
          key: `interactive-${termToLookUp}-${keyCounter++}`,
          term: textToDisplay,
          definition: termDefinition,
          onTermClick: onTermClickHandler ? () => onTermClickHandler(termToLookUp) : undefined,
        })
      );
    } else {
      // Si no se encuentra en el glosario, mostrarlo como texto normal
      result.push(textToDisplay);
    }

    lastIndex = matchIndex + match[0].length;
  }

  // 3. Añadir el resto del texto después de la última coincidencia
  if (lastIndex < text.length) {
    result.push(
      <ReactMarkdown key={`markdown-part-${keyCounter++}`} remarkPlugins={[remarkGfm]} components={{ p: React.Fragment }}>
        {text.substring(lastIndex)}
      </ReactMarkdown>
    );
  }

  return result;
};