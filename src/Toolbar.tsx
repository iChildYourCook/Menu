import { useState } from "react";
import { downloadPdf, downloadPng } from "./exportMenu.ts";
import type { Editor } from "./useEditor.ts";

export function Toolbar({ editor }: { editor: Editor }) {
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);

  const [whiteExport, setWhiteExport] = useState(false);

  async function runExport(kind: "png" | "pdf") {
    const node = document.getElementById("menu-poster");
    if (!(node instanceof HTMLElement) || busy) return;
    setBusy(kind);
    editor.setExporting(true);
    editor.setStatus("");
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    try {
      if (kind === "png") await downloadPng(node, whiteExport);
      else await downloadPdf(node, whiteExport);
      editor.setStatus(kind === "png" ? "PNG скачан" : "PDF A3 скачан");
    } catch (error) {
      editor.setStatus(error instanceof Error ? error.message : "Не удалось собрать файл");
    } finally {
      editor.setExporting(false);
      setBusy(null);
    }
  }

  return (
    <header className="toolbar">
      <div className="brand">
        <strong>Конструктор меню</strong>
        <span>Тяните блок за шапку, угол меняет размер</span>
      </div>
      <div className="toolbar-group">
        <button type="button" className="tool" onClick={editor.undo} disabled={!editor.canUndo}>
          Отменить
        </button>
        <button type="button" className="tool" onClick={editor.redo} disabled={!editor.canRedo}>
          Повторить
        </button>
        <label className="zoom">
          Масштаб
          <input
            type="range"
            min={0.6}
            max={2.2}
            step={0.05}
            value={editor.zoom}
            onChange={(event) => editor.setZoom(Number(event.target.value))}
          />
          <span>{Math.round(editor.zoom * 100)}%</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={editor.snap}
            onChange={(event) => editor.setSnap(event.target.checked)}
          />
          Привязка
        </label>
        <button type="button" className="tool" onClick={editor.addSection}>
          Новый блок
        </button>
        <button type="button" className="tool" onClick={editor.reset}>
          Исходное меню
        </button>
      </div>
      <div className="toolbar-group">
        <label className="check"><input type="checkbox" checked={whiteExport} disabled={busy !== null} onChange={(event) => setWhiteExport(event.target.checked)} />Белый фон / только текст</label>
        <button type="button" className="tool primary" disabled={busy !== null} onClick={() => void runExport("png")}>
          {busy === "png" ? "PNG…" : "Скачать PNG"}
        </button>
        <button type="button" className="tool primary" disabled={busy !== null} onClick={() => void runExport("pdf")}>
          {busy === "pdf" ? "PDF…" : "Скачать PDF"}
        </button>
        {editor.status ? <span className="status">{editor.status}</span> : null}
      </div>
    </header>
  );
}
