import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import {
  snapMove,
  snapResize,
  withBlock,
  type Block,
  type Guides,
  type MenuDoc,
} from "./model.ts";
import type { Editor } from "./useEditor.ts";

type DropTarget = { blockId: string; index: number } | null;

const HANDLES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;

function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 1000, height: 707 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setSize({ width: element.clientWidth, height: element.clientHeight });
    });
    observer.observe(element);
    setSize({ width: element.clientWidth, height: element.clientHeight });
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

function trackPointer(
  move: (event: PointerEvent) => void,
  end: (event: PointerEvent) => void,
) {
  const onMove = (event: PointerEvent) => move(event);
  const onUp = (event: PointerEvent) => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    end(event);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  return () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };
}

export function Canvas({ editor }: { editor: Editor }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [fitWidth, setFitWidth] = useState(960);
  const [guides, setGuides] = useState<Guides>({ x: null, y: null });
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const dropRef = useRef<DropTarget>(null);
  const size = useElementSize(posterRef);
  const docRef = useRef(editor.doc);
  useEffect(() => {
    docRef.current = editor.doc;
  }, [editor.doc]);

  useEffect(() => () => stopRef.current?.(), []);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const measure = () => {
      const width = element.clientWidth - 40;
      const height = element.clientHeight - 40;
      const next = Math.max(280, Math.min(width, height * (4961 / 3508)));
      setFitWidth(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const posterWidth = fitWidth * editor.zoom;
  const posterHeight = posterWidth * (3508 / 4961);

  function others(id: string) {
    return docRef.current.blocks.filter((block) => block.id !== id);
  }

  function beginMove(block: Block, event: ReactPointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    editor.setSelectedId(block.id);
    editor.setSelectedDishId(null);
    editor.gestureStart();
    const poster = posterRef.current!.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { ...block };
    stopRef.current?.();
    stopRef.current = trackPointer(
      (moveEvent) => {
        const dx = ((moveEvent.clientX - startX) / poster.width) * 100;
        const dy = ((moveEvent.clientY - startY) / poster.height) * 100;
        const snapped = snapMove(
          { ...origin, x: origin.x + dx, y: origin.y + dy },
          others(block.id),
          editor.snap,
        );
        setGuides(snapped.guides);
        editor.preview(withBlock(docRef.current, block.id, snapped.block));
      },
      () => {
        setGuides({ x: null, y: null });
        editor.gestureEnd();
        stopRef.current = null;
      },
    );
  }

  function beginResize(block: Block, dir: string, event: ReactPointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    editor.gestureStart();
    const poster = posterRef.current!.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { ...block };
    stopRef.current?.();
    stopRef.current = trackPointer(
      (moveEvent) => {
        const dx = ((moveEvent.clientX - startX) / poster.width) * 100;
        const dy = ((moveEvent.clientY - startY) / poster.height) * 100;
        let { x, y, w, h } = origin;
        if (dir.includes("e")) w = origin.w + dx;
        if (dir.includes("s")) h = origin.h + dy;
        if (dir.includes("w")) {
          x = origin.x + dx;
          w = origin.w - dx;
        }
        if (dir.includes("n")) {
          y = origin.y + dy;
          h = origin.h - dy;
        }
        const snapped = snapResize({ ...origin, x, y, w, h }, dir, others(block.id), editor.snap);
        setGuides(snapped.guides);
        editor.preview(withBlock(docRef.current, block.id, snapped.block));
      },
      () => {
        setGuides({ x: null, y: null });
        editor.gestureEnd();
        stopRef.current = null;
      },
    );
  }

  function dishIndexAt(blockId: string, clientY: number, dishId: string): number {
    const rows = [
      ...document.querySelectorAll<HTMLElement>(`[data-block-id="${blockId}"] [data-dish-id]`),
    ].filter((row) => row.dataset.dishId !== dishId);
    for (let index = 0; index < rows.length; index += 1) {
      const rect = rows[index].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return index;
    }
    return rows.length;
  }

  function rememberDrop(target: DropTarget) {
    dropRef.current = target;
    setDropTarget(target);
  }

  function beginDishDrag(dishId: string, event: ReactPointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    editor.setSelectedDishId(dishId);
    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;
    stopRef.current?.();
    stopRef.current = trackPointer(
      (moveEvent) => {
        if (!dragging && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 4) {
          return;
        }
        dragging = true;
        const hit = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        const host = hit?.closest<HTMLElement>("[data-block-kind='section']");
        if (!host?.dataset.blockId) {
          rememberDrop(null);
          return;
        }
        rememberDrop({
          blockId: host.dataset.blockId,
          index: dishIndexAt(host.dataset.blockId, moveEvent.clientY, dishId),
        });
      },
      () => {
        const current = dropRef.current;
        rememberDrop(null);
        if (dragging && current) editor.moveDishTo(dishId, current.blockId, current.index);
        stopRef.current = null;
      },
    );
  }

  return (
    <div className="canvas" ref={canvasRef} onPointerDown={() => editor.setSelectedId(null)}>
      <div className="poster-slot" style={{ width: posterWidth, height: posterHeight }}>
        <div
          id="menu-poster"
          ref={posterRef}
          style={{
            "--menu-background": editor.doc.backgroundColor || "#d8ae74",
            "--menu-text": editor.doc.textColor || "#14110e",
            "--menu-head-background": editor.doc.textColor ? editor.doc.textColor : "#0c0c0c",
            "--menu-head-text": editor.doc.backgroundColor ? editor.doc.backgroundColor : "#e1b687",
            "--menu-border": editor.doc.backgroundColor || editor.doc.textColor ? (editor.doc.textColor || "#14110e") : "#7c603d",
          } as CSSProperties}
          className={editor.exporting ? "poster is-exporting" : "poster"}
          onPointerDown={(event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) editor.setSelectedId(null);
          }}
        >
          {guides.x != null ? (
            <div className="guide guide-x" data-export-hide="true" style={{ left: `${guides.x}%` }} />
          ) : null}
          {guides.y != null ? (
            <div className="guide guide-y" data-export-hide="true" style={{ top: `${guides.y}%` }} />
          ) : null}
          {editor.doc.blocks.map((block) => (
            <BlockView
              key={block.id}
              block={block}
              doc={editor.doc}
              selected={editor.selectedId === block.id && !editor.exporting}
              selectedDishId={editor.selectedDishId}
              dropTarget={dropTarget}
              width={size.width}
              height={size.height}
              onMove={beginMove}
              onResize={beginResize}
              onSelect={(id) => {
                editor.setSelectedId(id);
                editor.setSelectedDishId(null);
              }}
              onSelectDish={(blockId, dishId) => {
                editor.setSelectedId(blockId);
                editor.setSelectedDishId(dishId);
              }}
              onDishDrag={beginDishDrag}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BlockView({
  block,
  doc,
  selected,
  selectedDishId,
  dropTarget,
  width,
  height,
  onMove,
  onResize,
  onSelect,
  onSelectDish,
  onDishDrag,
}: {
  block: Block;
  doc: MenuDoc;
  selected: boolean;
  selectedDishId: string | null;
  dropTarget: DropTarget;
  width: number;
  height: number;
  onMove: (block: Block, event: ReactPointerEvent) => void;
  onResize: (block: Block, dir: string, event: ReactPointerEvent) => void;
  onSelect: (id: string) => void;
  onSelectDish: (blockId: string, dishId: string) => void;
  onDishDrag: (dishId: string, event: ReactPointerEvent) => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const [titleScale, setTitleScale] = useState(1);
  const [clipped, setClipped] = useState(false);
  const cqw = (value: number) => (value / 100) * width;
  const cqh = (value: number) => (value / 100) * height;
  const headerSize = block.titleSize || doc.headerSize;
  const bodySize = block.bodySize || doc.bodySize;
  const linePx = cqh(block.lineHeight || doc.lineHeight);
  const bodyPx = cqw(bodySize);
  const detailPx = cqw(doc.detailSize);
  const style = {
    left: `${block.x}%`,
    top: `${block.y}%`,
    width: `${block.w}%`,
    height: `${block.h}%`,
    "--line-px": `${linePx}px`,
    "--body-px": `${bodyPx}px`,
    "--detail-px": `${detailPx}px`,
    "--price-gap": `${doc.priceGap}em`,
    "--border-px": `${Math.max(1, cqw(0.05))}px`,
  } as CSSProperties;

  useEffect(() => {
    const element = bodyRef.current;
    if (!element) return;
    const check = () => setClipped(element.scrollHeight - element.clientHeight > 2);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => observer.disconnect();
  }, [block, doc, width, height]);

  useEffect(() => {
    const text = titleRef.current;
    if (block.kind !== "title" || !text) return;
    if (block.w === 92 && block.h === 6.7) return;
    let active = true;
    const fit = () => {
      if (!active) return;
      const rect = text.getBoundingClientRect();
      const host = text.parentElement!;
      const next = Math.min(1, host.clientWidth / (rect.width / titleScale || 1), host.clientHeight / (rect.height / titleScale || 1));
      if (Math.abs(next - titleScale) > 0.001) setTitleScale(next);
    };
    fit();
    void document.fonts.ready.then(fit);
    return () => { active = false; };
  }, [block, doc, width, height, titleScale]);

  if (block.kind === "title") {
    const titlePx = cqw(block.titleSize || doc.titleSize);
    return (
      <div
        className={selected ? "block title-block is-selected" : "block title-block"}
        style={{ ...style, fontFamily: block.fontFamily || doc.fonts.title, fontSize: titlePx * (block.w === 92 && block.h === 6.7 ? 1 : titleScale) }}
        onPointerDown={(event) => {
          onSelect(block.id);
          onMove(block, event);
        }}
      >
        <span ref={titleRef} style={block.w === 92 && block.h === 6.7 ? undefined : { flexShrink: 0, whiteSpace: "nowrap" }}>{block.text}</span>
        {selected ? <Handles block={block} onResize={onResize} /> : null}
      </div>
    );
  }

  if (block.kind === "rule") {
    return (
      <div
        className={selected ? "block rule-block is-selected" : "block rule-block"}
        style={style}
        onPointerDown={(event) => {
          onSelect(block.id);
          onMove(block, event);
        }}
      >
        <div className="rule-line" />
        {selected ? <Handles block={block} onResize={onResize} /> : null}
      </div>
    );
  }

  const showDrop = dropTarget?.blockId === block.id ? dropTarget.index : null;

  return (
    <section
      className={selected ? "block section-block is-selected" : "block section-block"}
      style={style}
      data-block-id={block.id}
      data-block-kind="section"
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(block.id);
      }}
    >
      <header
        className={`${block.headerAlign === "center" ? "block-head is-center" : "block-head"}${block.headerHeight != null || block.headerWidth != null ? " custom-head" : ""}`}
        style={{
          height: cqh(block.headerHeight ?? (block.note ? 3.45 : 2.4)),
          width: `${block.headerWidth ?? 100}%`,
          ...(block.headerHeight != null || block.headerWidth != null ? { minHeight: "min-content" } : {}),
          fontFamily: block.fontFamily || doc.fonts.header,
          fontSize: cqw(headerSize),
        }}
        onPointerDown={(event) => onMove(block, event)}
      >
        <h2>{block.text}</h2>
        {block.note ? (
          <p className="note" style={{ fontSize: detailPx }}>
            • {block.note}
          </p>
        ) : null}
      </header>
      <div
        className="block-body"
        ref={bodyRef}
        style={{ fontFamily: block.fontFamily || doc.fonts.body, padding: `${cqh(0.18)}px ${cqw(0.45)}px` }}
      >
        {block.dishes.map((item, index) => (
          <article
            key={item.id}
            className={selectedDishId === item.id ? "dish is-dish-selected" : "dish"}
            data-dish-id={item.id}
            onPointerDown={(event) => {
              event.stopPropagation();
              onSelectDish(block.id, item.id);
              onDishDrag(item.id, event);
            }}
          >
            {showDrop === index ? <div className="drop-line" /> : null}
            <div className={block.priceSide === "left" ? "line price-left" : "line"}>
              <h3 className="name">{item.name}</h3>
              <span className="price">
                <span className="grams">{item.grams}г</span>
                <span className="slash">/</span>
                <span className="rub">{item.price}₽</span>
              </span>
            </div>
            {item.details ? <p className="details">{item.details}</p> : null}
          </article>
        ))}
        {showDrop === block.dishes.length ? <div className="drop-line" /> : null}
      </div>
      {clipped ? (
        <span className="clip-badge" data-export-hide="true">
          не влезает
        </span>
      ) : null}
      {selected ? <Handles block={block} onResize={onResize} /> : null}
    </section>
  );
}

function Handles({
  block,
  onResize,
}: {
  block: Block;
  onResize: (block: Block, dir: string, event: ReactPointerEvent) => void;
}) {
  return (
    <>
      {HANDLES.map((dir) => (
        <span
          key={dir}
          data-export-hide="true"
          className={`handle handle-${dir}`}
          onPointerDown={(event) => onResize(block, dir, event)}
        />
      ))}
    </>
  );
}
