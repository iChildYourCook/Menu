import { useEffect } from "react";
import { FONTS, type Block, type FontName, type MenuDoc } from "./model.ts";
import type { Editor } from "./useEditor.ts";

export function Inspector({ editor }: { editor: Editor }) {
  const block = editor.selected;
  const dish = block?.dishes.find((item) => item.id === editor.selectedDishId) ?? null;

  useEffect(() => {
    if (!editor.selectedDishId) return;
    document.getElementById(`dish-${editor.selectedDishId}`)?.scrollIntoView({ block: "nearest" });
  }, [editor.selectedDishId]);

  return (
    <aside className="inspector">
      {block ? (
        <BlockFields editor={editor} block={block} />
      ) : (
        <p className="hint">Выберите блок на листе или настройте всё меню целиком.</p>
      )}

      {block?.kind === "section" ? (
        <section className="panel">
          <div className="panel-title">
            <h3>Блюда</h3>
            <button type="button" className="tool" onClick={editor.addDish}>
              Добавить
            </button>
          </div>
          <ul className="dish-list">
            {block.dishes.map((item) => (
              <li key={item.id} id={`dish-${item.id}`}>
                <button
                  type="button"
                  className={item.id === editor.selectedDishId ? "dish-pick is-on" : "dish-pick"}
                  onClick={() => editor.setSelectedDishId(item.id)}
                >
                  <span>{item.name}</span>
                  <small>
                    {item.grams}г / {item.price}₽
                  </small>
                </button>
              </li>
            ))}
          </ul>
          {dish ? <DishFields editor={editor} doc={editor.doc} dishId={dish.id} /> : null}
        </section>
      ) : null}

      <details className="panel global-panel" open={!block}>
        <summary>Всё меню</summary>
        <div className="row-buttons">
          <button type="button" className="tool" onClick={() => editor.commit({ ...editor.doc, backgroundColor: undefined, textColor: undefined })}>Бежевое</button>
          <button type="button" className="tool" onClick={() => editor.commit({ ...editor.doc, backgroundColor: "#000000", textColor: "#d8ae74" })}>Чёрное</button>
        </div>
        <div className="grid-2">
          <label className="field">Цвет фона<input type="color" value={editor.doc.backgroundColor || "#d8ae74"} onChange={(event) => editor.commit({ ...editor.doc, backgroundColor: event.target.value })} /></label>
          <label className="field">Цвет текста<input type="color" value={editor.doc.textColor || "#14110e"} onChange={(event) => editor.commit({ ...editor.doc, textColor: event.target.value })} /></label>
        </div>
        <FontSelect
          label="Шрифт названия"
          value={editor.doc.fonts.title}
          onChange={(value) => {
            if (!value) return;
            editor.commit({ ...editor.doc, fonts: { ...editor.doc.fonts, title: value } });
          }}
        />
        <FontSelect
          label="Шрифт шапок"
          value={editor.doc.fonts.header}
          onChange={(value) => {
            if (!value) return;
            editor.commit({ ...editor.doc, fonts: { ...editor.doc.fonts, header: value } });
          }}
        />
        <FontSelect
          label="Шрифт блюд"
          value={editor.doc.fonts.body}
          onChange={(value) => {
            if (!value) return;
            editor.commit({ ...editor.doc, fonts: { ...editor.doc.fonts, body: value } });
          }}
        />
        <Slider
          label="Название"
          min={3}
          max={10}
          step={0.05}
          value={editor.doc.titleSize}
          onStart={editor.gestureStart}
          onChange={(value) => editor.preview({ ...editor.doc, titleSize: value })}
          onEnd={editor.gestureEnd}
        />
        <Slider
          label="Шапки"
          min={0.7}
          max={2.4}
          step={0.01}
          value={editor.doc.headerSize}
          onStart={editor.gestureStart}
          onChange={(value) => editor.preview({ ...editor.doc, headerSize: value })}
          onEnd={editor.gestureEnd}
        />
        <Slider
          label="Текст блюд"
          min={0.5}
          max={1.5}
          step={0.01}
          value={editor.doc.bodySize}
          onStart={editor.gestureStart}
          onChange={(value) => editor.preview({ ...editor.doc, bodySize: value })}
          onEnd={editor.gestureEnd}
        />
        <Slider
          label="Состав"
          min={0.4}
          max={1.2}
          step={0.01}
          value={editor.doc.detailSize}
          onStart={editor.gestureStart}
          onChange={(value) => editor.preview({ ...editor.doc, detailSize: value })}
          onEnd={editor.gestureEnd}
        />
        <Slider
          label="Межстрочный интервал"
          min={1.15}
          max={2.6}
          step={0.01}
          value={editor.doc.lineHeight}
          onStart={editor.gestureStart}
          onChange={(value) => editor.preview({ ...editor.doc, lineHeight: value })}
          onEnd={editor.gestureEnd}
        />
        <Slider
          label="Зазор у /"
          min={0.08}
          max={0.8}
          step={0.01}
          value={editor.doc.priceGap}
          onStart={editor.gestureStart}
          onChange={(value) => editor.preview({ ...editor.doc, priceGap: value })}
          onEnd={editor.gestureEnd}
        />
        <p className="hint">
          Интервал один для названия, состава и соседних блюд. Стрелки двигают выбранный блок,
          Delete убирает выбранное блюдо.
        </p>
      </details>
    </aside>
  );
}

function BlockFields({ editor, block }: { editor: Editor; block: Block }) {
  const headerLabel = block.kind === "title" ? "Размер названия" : "Размер шапки";
  const headerValue = block.titleSize || (block.kind === "title" ? editor.doc.titleSize : editor.doc.headerSize);
  const bodyValue = block.bodySize || editor.doc.bodySize;
  const lineValue = block.lineHeight || editor.doc.lineHeight;

  return (
    <section className="panel">
      <h3>{block.kind === "title" ? "Название" : block.kind === "rule" ? "Линия" : "Раздел"}</h3>
      {block.kind !== "rule" ? (
        <label className="field">
          Текст
          <input
            value={block.text}
            onFocus={editor.gestureStart}
            onBlur={editor.gestureEnd}
            onChange={(event) => editor.patchBlock(block.id, { text: event.target.value }, "preview")}
          />
        </label>
      ) : null}
      {block.kind === "section" ? (
        <label className="field">
          Подпись в шапке
          <input
            value={block.note}
            onFocus={editor.gestureStart}
            onBlur={editor.gestureEnd}
            onChange={(event) => editor.patchBlock(block.id, { note: event.target.value }, "preview")}
          />
        </label>
      ) : null}
      <FontSelect
        label="Свой шрифт"
        value={block.fontFamily}
        allowInherit
        onChange={(value) => editor.patchBlock(block.id, { fontFamily: value }, "commit")}
      />
      {block.kind !== "rule" ? (
        <Slider
          label={headerLabel}
          min={block.kind === "title" ? 3 : 0.7}
          max={block.kind === "title" ? 10 : 2.4}
          step={0.01}
          value={headerValue}
          onStart={editor.gestureStart}
          onChange={(value) => editor.patchBlock(block.id, { titleSize: value }, "preview")}
          onEnd={editor.gestureEnd}
        />
      ) : null}
      {block.kind === "section" ? (
        <>
          <Slider
            label="Высота шапки (% листа)"
            min={1} max={Math.max(1, block.h - 1)} step={0.05}
            value={block.headerHeight ?? (block.note ? 3.45 : 2.4)}
            onStart={editor.gestureStart}
            onChange={(value) => editor.patchBlock(block.id, { headerHeight: value }, "preview")}
            onEnd={editor.gestureEnd}
          />
          <Slider
            label="Ширина шапки (% блока)"
            min={30} max={100} step={1}
            value={block.headerWidth ?? 100}
            onStart={editor.gestureStart}
            onChange={(value) => editor.patchBlock(block.id, { headerWidth: value }, "preview")}
            onEnd={editor.gestureEnd}
          />
          <p className="hint">Шапка растёт внутри блока. Если блюда не влезают, увеличьте высоту блока. Высота шапки не меньше её текста.</p>
          <Slider
            label="Текст внутри"
            min={0.5}
            max={1.5}
            step={0.01}
            value={bodyValue}
            onStart={editor.gestureStart}
            onChange={(value) => editor.patchBlock(block.id, { bodySize: value }, "preview")}
            onEnd={editor.gestureEnd}
          />
          <Slider
            label="Интервал внутри"
            min={1.15}
            max={2.6}
            step={0.01}
            value={lineValue}
            onStart={editor.gestureStart}
            onChange={(value) => editor.patchBlock(block.id, { lineHeight: value }, "preview")}
            onEnd={editor.gestureEnd}
          />
          <div className="choice">
            <span>Цена</span>
            <button
              type="button"
              className={block.priceSide === "right" ? "tool is-on" : "tool"}
              onClick={() => editor.patchBlock(block.id, { priceSide: "right" }, "commit")}
            >
              Справа
            </button>
            <button
              type="button"
              className={block.priceSide === "left" ? "tool is-on" : "tool"}
              onClick={() => editor.patchBlock(block.id, { priceSide: "left" }, "commit")}
            >
              Слева
            </button>
          </div>
          <div className="choice">
            <span>Шапка</span>
            <button
              type="button"
              className={block.headerAlign === "left" ? "tool is-on" : "tool"}
              onClick={() => editor.patchBlock(block.id, { headerAlign: "left" }, "commit")}
            >
              Слева
            </button>
            <button
              type="button"
              className={block.headerAlign === "center" ? "tool is-on" : "tool"}
              onClick={() => editor.patchBlock(block.id, { headerAlign: "center" }, "commit")}
            >
              По центру
            </button>
          </div>
        </>
      ) : null}
      <div className="grid-4">
        {(["x", "y", "w", "h"] as const).map((key) => (
          <label key={key} className="field">
            {key === "x" ? "X" : key === "y" ? "Y" : key === "w" ? "Ширина" : "Высота"}
            <input
              value={String(block[key])}
              onFocus={editor.gestureStart}
              onBlur={editor.gestureEnd}
              onChange={(event) => {
                const value = Number(event.target.value.replace(",", "."));
                if (!Number.isFinite(value)) return;
                editor.patchBlock(block.id, { [key]: value }, "preview");
              }}
            />
          </label>
        ))}
      </div>
      <div className="row-buttons">
        <button type="button" className="tool" onClick={editor.backward}>
          Назад по слою
        </button>
        <button type="button" className="tool" onClick={editor.forward}>
          Вперёд по слою
        </button>
        <button type="button" className="tool" onClick={editor.duplicate}>
          Дублировать
        </button>
        <button type="button" className="tool danger" onClick={editor.removeBlock}>
          Удалить блок
        </button>
      </div>
    </section>
  );
}

function DishFields({ editor, doc, dishId }: { editor: Editor; doc: MenuDoc; dishId: string }) {
  const dish = doc.blocks.flatMap((block) => block.dishes).find((item) => item.id === dishId);
  const host = doc.blocks.find((block) => block.dishes.some((item) => item.id === dishId));
  if (!dish || !host) return null;
  const sections = doc.blocks.filter((block) => block.kind === "section");

  return (
    <div className="dish-fields">
      <label className="field">
        Название
        <input
          value={dish.name}
          onFocus={editor.gestureStart}
          onBlur={editor.gestureEnd}
          onChange={(event) => editor.changeDish(dish.id, { name: event.target.value }, "preview")}
        />
      </label>
      <div className="grid-2">
        <label className="field">
          Граммы
          <input
            type="number"
            min={0}
            value={dish.grams}
            onFocus={editor.gestureStart}
            onBlur={editor.gestureEnd}
            onChange={(event) =>
              editor.changeDish(dish.id, { grams: Number(event.target.value) || 0 }, "preview")
            }
          />
        </label>
        <label className="field">
          Цена
          <input
            type="number"
            min={0}
            value={dish.price}
            onFocus={editor.gestureStart}
            onBlur={editor.gestureEnd}
            onChange={(event) =>
              editor.changeDish(dish.id, { price: Number(event.target.value) || 0 }, "preview")
            }
          />
        </label>
      </div>
      <label className="field">
        Состав
        <textarea
          rows={3}
          value={dish.details}
          onFocus={editor.gestureStart}
          onBlur={editor.gestureEnd}
          onChange={(event) => editor.changeDish(dish.id, { details: event.target.value }, "preview")}
        />
      </label>
      <div className="row-buttons">
        <button type="button" className="tool" onClick={() => editor.shiftDish(dish.id, -1)}>
          Выше
        </button>
        <button type="button" className="tool" onClick={() => editor.shiftDish(dish.id, 1)}>
          Ниже
        </button>
        <button type="button" className="tool danger" onClick={() => editor.removeDish(dish.id)}>
          Удалить блюдо
        </button>
      </div>
      <label className="field">
        Перенести в раздел
        <select
          value={host.id}
          onChange={(event) => {
            const target = doc.blocks.find((block) => block.id === event.target.value);
            if (!target) return;
            editor.moveDishTo(dish.id, target.id, target.dishes.length);
          }}
        >
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.text}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function FontSelect({
  label,
  value,
  allowInherit = false,
  onChange,
}: {
  label: string;
  value: string;
  allowInherit?: boolean;
  onChange: (value: FontName | "") => void;
}) {
  return (
    <label className="field">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value as FontName | "")}>
        {allowInherit ? <option value="">Как в меню</option> : null}
        {FONTS.map((font) => (
          <option key={font} value={font} style={{ fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>
    </label>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onStart,
  onChange,
  onEnd,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onStart: () => void;
  onChange: (value: number) => void;
  onEnd: () => void;
}) {
  return (
    <label className="field slider">
      <span className="slider-label">
        {label}
        <strong>{value.toFixed(2)}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={onStart}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onEnd}
        onBlur={onEnd}
      />
    </label>
  );
}
