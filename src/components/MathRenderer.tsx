'use client';

import React, { useEffect, useRef } from 'react';

interface MathRendererProps {
  /** HTML string that may contain MathML <math>...</math> elements */
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * MathRenderer
 * Renders HTML content that may contain MathML 3.0 (no namespace) markup.
 * Uses MathJax 3 (loaded globally in layout.tsx) to typeset the math.
 */
export default function MathRenderer({ content, className, style }: MathRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    // Trigger MathJax typesetting after the content is injected into the DOM
    const typeset = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const MathJax = (window as any).MathJax;
      if (MathJax && typeof MathJax.typesetPromise === 'function' && ref.current) {
        MathJax.typesetPromise([ref.current]).catch(console.error);
      }
    };
    // MathJax may still be loading; poll until ready
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).MathJax?.typesetPromise) {
      typeset();
    } else {
      const poll = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).MathJax?.typesetPromise) {
          clearInterval(poll);
          typeset();
        }
      }, 200);
      return () => clearInterval(poll);
    }
  }, [content]);

  return (
    <div
      ref={ref}
      className={className}
      style={style}
      // dangerouslySetInnerHTML is intentional: content is MathML authored by
      // admin/teachers, not user-submitted HTML from the public.
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
