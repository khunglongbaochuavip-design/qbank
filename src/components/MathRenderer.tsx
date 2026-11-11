'use client';

import React, { useEffect, useRef, memo } from 'react';

interface MathRendererProps {
  /** HTML/text string that may contain MathML <math>...</math> or LaTeX ($...$, $$...$$, \(...\), \[...\]) */
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

// ── Global batched & serialized MathJax 3 typesetting queue ───────────────
// Prevents concurrent typesetPromise() races when 20+ table rows or modal fields mount at once.
const pendingElements = new Set<HTMLElement>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let typesetChain: Promise<void> = Promise.resolve();

function getMathJax(): {
  typesetPromise?: (els?: HTMLElement[]) => Promise<void>;
  typesetClear?: (els?: HTMLElement[]) => void;
  startup?: { promise?: Promise<void> };
} | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).MathJax || null;
}

function scheduleFlush(delayMs = 25) {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const mj = getMathJax();
    if (!mj || typeof mj.typesetPromise !== 'function') {
      // MathJax script still loading from CDN — retry shortly
      if (pendingElements.size > 0) scheduleFlush(120);
      return;
    }

    const batch = Array.from(pendingElements).filter(el => el.isConnected);
    pendingElements.clear();
    if (batch.length === 0) return;

    typesetChain = typesetChain
      .then(async () => {
        if (mj.startup?.promise) {
          await mj.startup.promise;
        }
        const connected = batch.filter(el => el.isConnected);
        if (connected.length === 0) return;
        if (typeof mj.typesetClear === 'function') {
          mj.typesetClear(connected);
        }
        await mj.typesetPromise!(connected);
      })
      .catch(err => {
        console.error('MathJax typeset error:', err);
      });
  }, delayMs);
}

function enqueueElement(el: HTMLElement) {
  pendingElements.add(el);
  scheduleFlush(25);
}

/**
 * MathRenderer
 * Renders content that may contain MathML 3.0 (<math>...</math>) and/or LaTeX ($...$, $$...$$, \(...\), \[...\]).
 * Uses a global batched queue for MathJax 3 so tables, modals, and exam cards always typeset reliably without F5.
 */
function MathRendererInner({ content, className, style }: MathRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raw = content || '';
    el.innerHTML = raw;
    enqueueElement(el);

    // Second pass after modal/table animation settles if raw math delimiters are still un-typeset
    const hasMath = raw.includes('$') || raw.includes('\\(') || raw.includes('\\[') || raw.includes('<math');
    if (hasMath) {
      const verifyTimer = setTimeout(() => {
        if (!el.isConnected) return;
        if (!el.querySelector('mjx-container')) {
          el.innerHTML = raw;
          enqueueElement(el);
        }
      }, 350);
      return () => {
        clearTimeout(verifyTimer);
        pendingElements.delete(el);
      };
    }

    return () => {
      pendingElements.delete(el);
    };
  }, [content]);

  return (
    <div
      ref={ref}
      className={`math-renderer ${className || ''}`.trim()}
      style={style}
    />
  );
}

const MathRenderer = memo(MathRendererInner);
export default MathRenderer;
