// QuillEditor.jsx
import React, { forwardRef, useRef, useState } from 'react';
import Quill from 'quill';
import Editor from './Editor.jsx';

const QuillEditor = forwardRef(({ value = '', readOnly = false, onTextChange, onSelectionChange }, ref) => {
  const quillRef = useRef();
  const [range, setRange] = useState();
  const [lastChange, setLastChange] = useState();

  React.useImperativeHandle(ref, () => ({
    getHTML: () => quillRef.current?.root.innerHTML || '',
    getEditor: () => quillRef.current,
  }));



  return (
    <div>
      <Editor
        
        ref={quillRef}
        readOnly={readOnly}
        htmlValue={value} // 👈 now controlled by this prop
        onTextChange={(...args) => {
          setLastChange(args[0]);
          onTextChange?.(...args);
        }}
        onSelectionChange={(...args) => {
          setRange(args[0]);
          onSelectionChange?.(...args);
        }}
      />
    </div>
  );
});

export default QuillEditor;
