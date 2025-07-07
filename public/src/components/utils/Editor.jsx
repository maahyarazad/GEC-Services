import React, { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

const Editor = forwardRef(({ readOnly, htmlValue = '', onTextChange, onSelectionChange }, ref) => {
  const containerRef = useRef(null);
  const onTextChangeRef = useRef(onTextChange);
  const onSelectionChangeRef = useRef(onSelectionChange);

  useLayoutEffect(() => {
    onTextChangeRef.current = onTextChange;
    onSelectionChangeRef.current = onSelectionChange;
  });

  useEffect(() => {
    if (ref.current) {
      ref.current.enable?.(!readOnly);
    }
  }, [readOnly, ref]);

  // Initialize Quill only once on mount
  useEffect(() => {
    const container = containerRef.current;

    // Clear container before adding new div
    container.innerHTML = '';

    const editorContainer = container.ownerDocument.createElement('div');
    container.appendChild(editorContainer);

    const quill = new Quill(editorContainer, {
      theme: 'snow',
    });

    // Set direction explicitly
    quill.root.style.direction = 'ltr';
    quill.root.style.textAlign = 'left';
    editorContainer.style.direction = 'ltr';
    container.style.direction = 'ltr';

    ref.current = quill;

    quill.on(Quill.events.TEXT_CHANGE, (...args) => {
      onTextChangeRef.current?.(...args);
    });

    quill.on(Quill.events.SELECTION_CHANGE, (...args) => {
      onSelectionChangeRef.current?.(...args);
    });

    return () => {
      ref.current = null;
      container.innerHTML = '';
    };
  }, [ref]);

  // Update editor content only when htmlValue changes and is different
  useEffect(() => {
    if (ref.current && htmlValue !== ref.current.root.innerHTML) {
      ref.current.clipboard.dangerouslyPasteHTML(htmlValue);
    }
  }, [htmlValue, ref]);

  return <div ref={containerRef} dir="ltr"></div>;
});

Editor.displayName = 'Editor';

export default Editor;
