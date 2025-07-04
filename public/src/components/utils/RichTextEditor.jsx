import { useRef } from "react";
import { Button } from "@mui/material";
import StarterKit from "@tiptap/starter-kit";
import {
  MenuButtonBold,
  MenuButtonItalic,
  MenuControlsContainer,
  MenuDivider,
  MenuSelectHeading,
  RichTextEditor,
} from "mui-tiptap";

const RichTextEditorComponent = () => {
  const rteRef = useRef(null); // Removed TypeScript type

  return (
    <div>
      <RichTextEditor
        ref={rteRef}
        extensions={[StarterKit]}
        content="<p>Hello world</p>"
        renderControls={() => (
          <MenuControlsContainer>
            <MenuSelectHeading />
            <MenuDivider />
            <MenuButtonBold />
            <MenuButtonItalic />
            {/* Add more controls if needed */}
          </MenuControlsContainer>
        )}
      />

      <Button onClick={() => console.log(rteRef.current?.editor?.getHTML())}>
        Log HTML
      </Button>
    </div>
  );
}

export default RichTextEditorComponent;


