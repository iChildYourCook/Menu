import { Canvas } from "./Canvas.tsx";
import { Inspector } from "./Inspector.tsx";
import { Toolbar } from "./Toolbar.tsx";
import { useEditor } from "./useEditor.ts";

export default function App() {
  const editor = useEditor();
  return (
    <div className="editor">
      <Toolbar editor={editor} />
      <Inspector editor={editor} />
      <Canvas editor={editor} />
    </div>
  );
}
