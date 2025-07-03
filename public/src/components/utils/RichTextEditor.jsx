// import React, { useEffect } from 'react';
// import { useEditor, EditorContent } from '@tiptap/react';
// import StarterKit from '@tiptap/starter-kit';
// import Placeholder from '@tiptap/extension-placeholder';
// import TextAlign from '@tiptap/extension-text-align';
// import Image from '@tiptap/extension-image';

// const RichTextEditor = ({ value, onChange }) => {
//   const editor = useEditor({
//     extensions: [
//       StarterKit,
//       Image,
//       Placeholder.configure({
//         placeholder: 'Write something…',
//       }),
//       TextAlign.configure({
//         types: ['heading', 'paragraph'],
//       }),
//     ],
//     content: value || '<p>Hello World</p>',
//     onUpdate: ({ editor }) => {
//       const html = editor.getHTML();
//       onChange?.(html);
//     },
//   });

//   useEffect(() => {
//     if (editor && value !== editor.getHTML()) {
//       editor.commands.setContent(value || '', false);
//     }
//   }, [value, editor]);

//   if (!editor) return <p>Loading editor...</p>;

//   return (
//     <div className="admin">
// <div
//       style={{
//         border: '1px solid #ccc',
//         borderRadius: '6px',
//         padding: '1rem',
//         minHeight: '200px',
//         backgroundColor: 'white',
//         fontFamily: 'sans-serif',
//         fontSize: '1rem',
//         lineHeight: '1.6',
//       }}
//     >
//       <EditorContent
//         editor={editor}
//         style={{
//           outline: 'none',
//           minHeight: '150px',
//         }}
//       />
//     </div>
//     </div>
    
//   );
// };

// export default RichTextEditor;
