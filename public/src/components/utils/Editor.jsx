import React, { forwardRef, useEffect, useLayoutEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const Editor = forwardRef(
  ({ readOnly, htmlValue = "", onTextChange, onSelectionChange }, ref) => {
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
      container.innerHTML = "";

      const editorContainer = container.ownerDocument.createElement("div");
      container.appendChild(editorContainer);

      const toolbarOptions = [
        ["bold", "italic", "underline", "strike"], // toggled buttons
        ["blockquote", "code-block"],
        ["link", "image", "video"],

        [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
        [{ direction: "rtl" }], // text direction

        [{ header: [1, 2, 3, 4, 5, 6, false] }],

        [{ color: [] }, { background: [] }], // dropdown with defaults from theme
        [{ font: [] }],
        [{ align: [] }],
      ];

      const quill = new Quill(editorContainer, {
        modules: {
          toolbar: toolbarOptions,
        },
        theme: "snow",
      });

      const toolbar = quill.getModule("toolbar");
      toolbar.addHandler("image", () => {
        const input = document.createElement("input");
        input.setAttribute("type", "file");
        input.setAttribute("accept", "image/png, image/jpeg, image/webp"); // Specify allowed file types
        input.click();

        input.onchange = () => {
          const file = input.files[0];
          if (file) {
            const fileType = file.type;
            const validTypes = ["image/png", "image/jpeg", "image/webp"];

            if (validTypes.includes(fileType)) {
              const reader = new FileReader();
              reader.onload = () => {
                const range = quill.getSelection();
                quill.insertEmbed(range.index, "image", reader.result);
              };
              reader.readAsDataURL(file);
            } else {
              alert("Invalid file type. Please upload a PNG or JPEG image.");
            }
          }
        };
      });

      // Set direction explicitly
      quill.root.style.direction = "ltr";
      quill.root.style.textAlign = "left";
      editorContainer.style.direction = "ltr";
      container.style.direction = "ltr";

      ref.current = quill;

      quill.on(Quill.events.TEXT_CHANGE, (...args) => {
        onTextChangeRef.current?.(...args);
      });

      quill.on(Quill.events.SELECTION_CHANGE, (...args) => {
        onSelectionChangeRef.current?.(...args);
      });

      return () => {
        ref.current = null;
        container.innerHTML = "";
      };
    }, [ref]);

    // Update editor content only when htmlValue changes and is different
    useEffect(() => {
      if (ref.current && htmlValue !== ref.current.root.innerHTML) {
        ref.current.clipboard.dangerouslyPasteHTML(htmlValue);
      }
    }, [htmlValue, ref]);

    return <div ref={containerRef} dir="ltr"></div>;
  }
);

Editor.displayName = "Editor";

export default Editor;
