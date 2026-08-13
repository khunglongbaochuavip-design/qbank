'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Modal, Input } from 'antd';
import MathRenderer from './MathRenderer';

// Import mathlive CSS for the math-field web component
import 'mathlive/fonts.css';

interface MathEditorProps {
  /** Current value — plain text mixed with MathML <math> fragments */
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** Number of visible text rows (default 3) */
  rows?: number;
  style?: React.CSSProperties;
  disabled?: boolean;
}

/**
 * MathEditor
 *
 * A robust formula editor that uses standard Ant Design Input.TextArea for input
 * (avoiding cursor jumping and focus issues of contenteditable) and opens an
 * Ant Design Modal with a MathLive math-field to type and insert formulas.
 * Includes a live rendered preview of the typeset result below the editor.
 */
export default function MathEditor({ value = '', onChange, placeholder, rows = 3, style, disabled }: MathEditorProps) {
  const textareaRef = useRef<any>(null);
  const mathFieldContainerRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const mathfieldRef = useRef<any>(null);

  // ── Insert MathML at current caret position in textarea
  const insertMathML = useCallback((mathml: string) => {
    const textarea = textareaRef.current?.resizableTextArea?.textArea || textareaRef.current?.textArea;
    if (!textarea) {
      // Fallback
      const newValue = value + mathml;
      onChange?.(newValue);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value || '';
    const newValue = text.substring(0, start) + mathml + text.substring(end);

    onChange?.(newValue);

    // Reposition cursor after the inserted content
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + mathml.length;
    }, 100);
  }, [value, onChange]);

  // Load mathlive client-side
  useEffect(() => {
    import('mathlive');
  }, []);

  // Initialize and append Mathfield inside the Modal once opened
  useEffect(() => {
    if (modalOpen && mathFieldContainerRef.current) {
      mathFieldContainerRef.current.innerHTML = '';
      
      import('mathlive').then(({ MathfieldElement }) => {
        const mf = new MathfieldElement();
        mf.style.width = '100%';
        mf.style.fontSize = '22px';
        mf.style.border = '2px solid #3b82f6';
        mf.style.borderRadius = '10px';
        mf.style.padding = '12px';
        mf.style.minHeight = '80px';
        mf.style.display = 'block';
        mf.style.outline = 'none';
        mf.style.background = '#fff';
        mf.style.color = '#000';
        
        // Force the virtual keyboard policy to show automatically on focus
        (mf as any).virtualKeyboardMode = 'onfocus';
        mf.setAttribute('virtual-keyboard-mode', 'onfocus');
        
        mathFieldContainerRef.current?.appendChild(mf);
        mathfieldRef.current = mf;
        
        // Delay focus slightly for modal transition and show virtual keyboard programmatically
        setTimeout(() => {
          if (mf && typeof mf.focus === 'function') {
            mf.focus();
            const MathLive = (window as any).mathVirtualKeyboard;
            if (MathLive && typeof MathLive.show === 'function') {
              MathLive.show();
            }
          }
        }, 300);
      });
    }
  }, [modalOpen]);

  const handleInsert = () => {
    const mf = mathfieldRef.current;
    if (mf) {
      const latex = mf.value;
      if (!latex.trim()) {
        setModalOpen(false);
        return;
      }
      // Convert via mathlive's built-in MathML export
      const mathml = mf.getValue('math-ml');
      if (mathml) {
        // Strip namespace declarations to produce MathML 3.0 (no namespace)
        const clean = mathml
          .replace(/\s*xmlns(?::\w+)?="[^"]*"/g, '')
          .replace(/\s*mathvariant="[^"]*"/g, '')
          .trim();
        insertMathML(clean);
      }
    }
    setModalOpen(false);
  };

  const handleCancel = () => {
    setModalOpen(false);
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
        <button
          type="button"
          title="Chèn công thức toán học (MathML)"
          onClick={() => setModalOpen(true)}
          disabled={disabled}
          style={{
            padding: '3px 10px', borderRadius: 6, border: '1px solid #3b82f6',
            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            color: '#1d4ed8', fontWeight: 700, fontSize: 15, cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          Σ Công thức
        </button>
        <span style={{ fontSize: 11, color: '#94a3b8', alignSelf: 'center' }}>
          Nhập văn bản thường, nhấn &quot;Σ Công thức&quot; để chèn ký hiệu toán học
        </span>
      </div>

      {/* Input Text Area */}
      <Input.TextArea
        ref={textareaRef}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        style={{
          borderRadius: 8,
          color: '#1e293b',
          lineHeight: 1.6,
          ...style,
        }}
      />

      {/* Live Preview of Typeset Formula */}
      {value && (
        <div style={{ marginTop: 8, padding: '10px 14px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>Xem trước kết quả:</div>
          <MathRenderer content={value} />
        </div>
      )}

      <Modal
        title="✏️ Nhập công thức toán học"
        open={modalOpen}
        onOk={handleInsert}
        onCancel={handleCancel}
        okText="Chèn vào"
        cancelText="Hủy"
        width={600}
        destroyOnClose
        zIndex={10000}
      >
        <div style={{ marginBottom: 12, fontSize: 13, color: '#64748b' }}>
          Gõ ký hiệu bằng phím ảo bên dưới hoặc gõ trực tiếp phím tắt LaTeX (ví dụ: <code>x^2</code>, <code>{`\\frac{a}{b}`}</code>, <code>{`\\sqrt{x}`}</code>)
        </div>
        {/* Mathfield container */}
        <div ref={mathFieldContainerRef} style={{ minHeight: '80px', marginBottom: 12 }} />
      </Modal>
    </div>
  );
}
