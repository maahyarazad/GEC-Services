// QuillEditor.jsx
import React, { forwardRef, useRef, useState } from "react";
import Quill from "quill";
import Editor from "./Editor.jsx";
import PropTypes from "prop-types";

const QuillEditor = forwardRef(
  ({ value = "", readOnly = false, onTextChange, onSelectionChange }, ref) => {
    const quillRef = useRef();
    const [range, setRange] = useState();
    const [lastChange, setLastChange] = useState();

    React.useImperativeHandle(ref, () => ({
      getHTML: () => quillRef.current?.root.innerHTML || "",
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
  }
);
QuillEditor.displayName = "QuillEditor";

QuillEditor.propTypes = {
  value: PropTypes.string.isRequired,
  readOnly: PropTypes.bool.isRequired,
  onTextChange: PropTypes.func.isRequired,
  onSelectionChange: PropTypes.func.isRequired,
};
export default QuillEditor;
