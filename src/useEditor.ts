import { useEffect, useReducer, useRef, useState } from "react";
import {
  bringForward,
  createDish,
  defaultDoc,
  deleteBlock,
  deleteDish,
  duplicateBlock,
  loadDoc,
  moveDish,
  moveDishStep,
  saveDoc,
  sendBackward,
  updateDish,
  withBlock,
  addSection,
  type Block,
  type MenuDoc,
} from "./model.ts";

type History = {
  past: MenuDoc[];
  doc: MenuDoc;
  future: MenuDoc[];
};

type Action =
  | { type: "preview"; doc: MenuDoc }
  | { type: "end-gesture"; base: MenuDoc }
  | { type: "commit"; doc: MenuDoc }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset" };

function same(a: MenuDoc, b: MenuDoc): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function reducer(state: History, action: Action): History {
  switch (action.type) {
    case "preview":
      return { ...state, doc: action.doc };
    case "commit":
      if (same(state.doc, action.doc)) return state;
      return {
        past: [...state.past, state.doc].slice(-50),
        doc: action.doc,
        future: [],
      };
    case "end-gesture":
      if (same(action.base, state.doc)) return state;
      return {
        past: [...state.past, action.base].slice(-50),
        doc: state.doc,
        future: [],
      };
    case "undo": {
      const prev = state.past[state.past.length - 1];
      if (!prev) return state;
      return {
        past: state.past.slice(0, -1),
        doc: prev,
        future: [state.doc, ...state.future],
      };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        past: [...state.past, state.doc],
        doc: next,
        future: state.future.slice(1),
      };
    }
    case "reset":
      return {
        past: [...state.past, state.doc].slice(-50),
        doc: defaultDoc(),
        future: [],
      };
  }
}

export function useEditor() {
  const [history, dispatch] = useReducer(reducer, null, () => ({
    past: [],
    doc: loadDoc(),
    future: [],
  }));
  const docRef = useRef(history.doc);
  const gestureBase = useRef<MenuDoc | null>(null);
  useEffect(() => {
    docRef.current = history.doc;
  }, [history.doc]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [snap, setSnap] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => saveDoc(history.doc), 200);
    return () => window.clearTimeout(timer);
  }, [history.doc]);

  function gestureStart() {
    if (!gestureBase.current) gestureBase.current = structuredClone(docRef.current);
  }

  function preview(doc: MenuDoc) {
    docRef.current = doc;
    dispatch({ type: "preview", doc });
  }

  function gestureEnd() {
    const base = gestureBase.current;
    if (!base) return;
    gestureBase.current = null;
    dispatch({ type: "end-gesture", base });
  }

  function commit(doc: MenuDoc) {
    docRef.current = doc;
    dispatch({ type: "commit", doc });
  }

  function patchBlock(id: string, patch: Partial<Block>, mode: "preview" | "commit") {
    const next = withBlock(docRef.current, id, patch);
    if (mode === "preview") preview(next);
    else commit(next);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "redo" : "undo" });
        return;
      }
      if (typing) return;
      if (!selectedId) return;
      const step = event.shiftKey ? 1 : 0.25;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const block = docRef.current.blocks.find((item) => item.id === selectedId);
        if (block) commit(withBlock(docRef.current, selectedId, { x: block.x - step }));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        const block = docRef.current.blocks.find((item) => item.id === selectedId);
        if (block) commit(withBlock(docRef.current, selectedId, { x: block.x + step }));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const block = docRef.current.blocks.find((item) => item.id === selectedId);
        if (block) commit(withBlock(docRef.current, selectedId, { y: block.y - step }));
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        const block = docRef.current.blocks.find((item) => item.id === selectedId);
        if (block) commit(withBlock(docRef.current, selectedId, { y: block.y + step }));
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectedDishId) {
        event.preventDefault();
        commit(deleteDish(docRef.current, selectedDishId));
        setSelectedDishId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, selectedDishId]);

  const doc = history.doc;
  const selected = doc.blocks.find((block) => block.id === selectedId) ?? null;

  return {
    doc,
    selected,
    selectedId,
    selectedDishId,
    snap,
    zoom,
    exporting,
    status,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    setSelectedId,
    setSelectedDishId,
    setSnap,
    setZoom,
    setExporting,
    setStatus,
    gestureStart,
    preview,
    gestureEnd,
    commit,
    patchBlock,
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
    reset: () => {
      if (window.confirm("Вернуть исходное меню? Текущая раскладка заменится.")) {
        dispatch({ type: "reset" });
        setSelectedId(null);
        setSelectedDishId(null);
      }
    },
    addSection: () => {
      const result = addSection(docRef.current);
      commit(result.doc);
      setSelectedId(result.id);
      setSelectedDishId(null);
    },
    duplicate: () => {
      if (!selectedId) return;
      const result = duplicateBlock(docRef.current, selectedId);
      commit(result.doc);
      setSelectedId(result.id);
    },
    removeBlock: () => {
      if (!selectedId) return;
      commit(deleteBlock(docRef.current, selectedId));
      setSelectedId(null);
      setSelectedDishId(null);
    },
    forward: () => selectedId && commit(bringForward(docRef.current, selectedId)),
    backward: () => selectedId && commit(sendBackward(docRef.current, selectedId)),
    addDish: () => {
      if (!selected || selected.kind !== "section") return;
      const result = createDish(docRef.current, selected.id);
      commit(result.doc);
      setSelectedDishId(result.dishId);
    },
    removeDish: (dishId: string) => {
      commit(deleteDish(docRef.current, dishId));
      if (selectedDishId === dishId) setSelectedDishId(null);
    },
    changeDish: (dishId: string, patch: Parameters<typeof updateDish>[2], mode: "preview" | "commit") => {
      const next = updateDish(docRef.current, dishId, patch);
      if (mode === "preview") preview(next);
      else commit(next);
    },
    moveDishTo: (dishId: string, blockId: string, index: number) => {
      commit(moveDish(docRef.current, dishId, blockId, index));
    },
    shiftDish: (dishId: string, direction: -1 | 1) => {
      commit(moveDishStep(docRef.current, dishId, direction));
    },
  };
}

export type Editor = ReturnType<typeof useEditor>;
