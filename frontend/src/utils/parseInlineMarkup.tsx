import type { ReactNode } from 'react';

const TOKEN_RE = /(\[\[.+?\]\]|\*\*.+?\*\*)/g;

export function parseInlineMarkup(text: string): ReactNode[] {
  const parts = text.split(TOKEN_RE).filter((part) => part.length > 0);

  return parts.map((part, index) => {
    if (part.startsWith('[[') && part.endsWith(']]')) {
      return (
        <mark key={index} className="grammarHighlight">
          {part.slice(2, -2)}
        </mark>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}