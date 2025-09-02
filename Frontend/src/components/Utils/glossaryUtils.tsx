// src/components/Utils/glossaryUtils.tsx
import React from 'react';
import InteractiveTerm from '../InteractiveTerm/InteractiveTerm.tsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface GlossaryItem {
  term: string;
  definition: string;
}

/**
 * Procesa una cadena de texto para encontrar y reemplazar términos del glosario
 * marcados con una sintaxis especial (`[[término]]` o `[[término|alias]]`).
 * Cada término encontrado se convierte en un componente `InteractiveTerm`,
 * mientras que el resto del texto se renderiza como Markdown.
 * @param {string} text - La cadena de texto de entrada que puede contener términos del glosario.
 * @param {GlossaryItem[]} glossary - Un array de objetos, donde cada uno contiene un `term` y su `definition`.
 * @param {(term: string) => void} [onTermClickHandler] - Un manejador opcional que se pasará al componente `InteractiveTerm` para gestionar los clics.
 * @returns {React.ReactNode[]} Un array de nodos de React listos para ser renderizados.
 */
export const processTextForGlossary = (
  text: string,
  glossary: GlossaryItem[],
  onTermClickHandler?: (term: string) => void
): React.ReactNode[] => {

  if (!glossary || glossary.length === 0) {
    return [<ReactMarkdown key="full-text-markdown" remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>];
  }

  const definitionMap = new Map<string, string>();
  glossary.forEach(item => {
    definitionMap.set(item.term.toLowerCase(), item.definition);
  });

  const regex = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;

  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyCounter = 0;

  for (const match of text.matchAll(regex)) {
    const termToLookUp = match[1].trim();
    const textToDisplay = match[2]?.trim() || termToLookUp;
    const termDefinition = definitionMap.get(termToLookUp.toLowerCase());
    const matchIndex = match.index || 0;

    if (matchIndex > lastIndex) {
      result.push(
        <ReactMarkdown key={`markdown-part-${keyCounter++}`} remarkPlugins={[remarkGfm]} components={{ p: React.Fragment }}>
          {text.substring(lastIndex, matchIndex)}
        </ReactMarkdown>
      );
    }

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
      result.push(textToDisplay);
    }

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    result.push(
      <ReactMarkdown key={`markdown-part-${keyCounter++}`} remarkPlugins={[remarkGfm]} components={{ p: React.Fragment }}>
        {text.substring(lastIndex)}
      </ReactMarkdown>
    );
  }

  return result;
};
