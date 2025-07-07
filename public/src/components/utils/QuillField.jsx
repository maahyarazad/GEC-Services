import React, { useRef } from 'react';
import { useField, useFormikContext } from 'formik';
import QuillEditor from './QuillEditor'; // Adjust path if needed

const QuillField = ({ name }) => {
  const [field, meta] = useField(name);
  const { setFieldValue, setFieldTouched } = useFormikContext();
  const editorRef = useRef();

  // Handler to capture changes from Quill
  const handleTextChange = () => {
    const html = editorRef.current?.getHTML?.() || '';
    
    setFieldValue(name, html);
  };

  return (
    <div>
      <QuillEditor
        ref={editorRef}
        value={field.value || ''}
        onTextChange={handleTextChange}
        onSelectionChange={() => setFieldTouched(name, true)}
      />

      {/* Optional hidden input for compatibility */}
      <input type="hidden" name={name} value={field.value || ''} />

      {/* Show validation error if any */}
      {meta.touched && meta.error && (
        <div className="text-danger small mt-1">{meta.error}</div>
      )}
    </div>
  );
};

export default QuillField;
