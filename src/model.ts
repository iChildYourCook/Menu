import { menuColumns } from "./menu.ts";

export const FONTS = [
  "Montserrat",
  "Manrope",
  "Rubik",
  "Oswald",
  "Unbounded",
  "Nunito Sans",
  "IBM Plex Sans",
  "PT Serif",
] as const;

export type FontName = (typeof FONTS)[number];

export type Dish = {
  id: string;
  name: string;
  grams: number;
  unit?: "г" | "мл";
  price: number;
  details: string;
};

export type BlockKind = "title" | "rule" | "section";
export type PriceSide = "right" | "left";
export type HeaderAlign = "left" | "center";

export type Block = {
  id: string;
  kind: BlockKind;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  note: string;
  dishes: Dish[];
  fontFamily: string;
  titleSize: number;
  bodySize: number;
  lineHeight: number;
  priceSide: PriceSide;
  headerAlign: HeaderAlign;
  headerHeight?: number;
  headerWidth?: number;
};

export type MenuDoc = {
  version: 1;
  backgroundColor?: string;
  textColor?: string;
  fonts: {
    title: FontName;
    header: FontName;
    body: FontName;
  };
  titleSize: number;
  headerSize: number;
  bodySize: number;
  detailSize: number;
  lineHeight: number;
  priceGap: number;
  blocks: Block[];
};

export type Guides = {
  x: number | null;
  y: number | null;
};

const STORAGE_KEY = "vse-svoi-menu-doc-v1";

export function uid(): string {
  return crypto.randomUUID();
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function dish(name: string, grams: number, price: number, details = ""): Dish {
  return { id: uid(), name, grams, price, details };
}

function section(
  id: string,
  text: string,
  note: string,
  x: number,
  y: number,
  w: number,
  h: number,
  dishes: Dish[],
): Block {
  return {
    id,
    kind: "section",
    x,
    y,
    w,
    h,
    text,
    note,
    dishes,
    fontFamily: "",
    titleSize: 0,
    bodySize: 0,
    lineHeight: 0,
    priceSide: "right",
    headerAlign: "left",
  };
}

export function defaultDoc(): MenuDoc {
  const byId = new Map(menuColumns.flat().map((item) => [item.id, item]));
  const dishesOf = (id: string) =>
    (byId.get(id)?.dishes ?? []).map((item, index) => ({
      id: `${id}-dish-${index}`,
      name: item.name,
      grams: item.grams,
      price: item.price,
      details: item.details ?? "",
    }));

  return {
    version: 1,
    fonts: {
      title: "Montserrat",
      header: "Montserrat",
      body: "Montserrat",
    },
    titleSize: 6.15,
    headerSize: 1.16,
    bodySize: 0.84,
    detailSize: 0.66,
    lineHeight: 1.56,
    priceGap: 0.32,
    blocks: [
      {
        id: "title",
        kind: "title",
        x: 4,
        y: 1.35,
        w: 92,
        h: 6.7,
        text: "ВСЕ СВОИ",
        note: "",
        dishes: [],
        fontFamily: "",
        titleSize: 0,
        bodySize: 0,
        lineHeight: 0,
        priceSide: "right",
        headerAlign: "center",
      },
      {
        id: "rule",
        kind: "rule",
        x: 1.35,
        y: 8.35,
        w: 97.3,
        h: 1.45,
        text: "",
        note: "",
        dishes: [],
        fontFamily: "",
        titleSize: 0,
        bodySize: 0,
        lineHeight: 0,
        priceSide: "right",
        headerAlign: "left",
      },
      section("snacks", "Закуски", "", 1.35, 10, 29.49, 50.19, dishesOf("snacks")),
      section("salads", "Салаты", "", 1.35, 60.41, 29.49, 14.77, dishesOf("salads")),
      section("soups", "Супы", "", 1.35, 75.4, 29.49, 23.5, dishesOf("soups")),
      section(
        "burgers",
        "Бургеры и сэндвичи",
        "Подаются с картофелем фри/по-деревенски и соусом на выбор",
        31.24,
        10,
        37.38,
        64.63,
        dishesOf("burgers"),
      ),
      section("pizza", "Пицца", "", 31.24, 74.85, 37.38, 24.05, dishesOf("pizza")),
      section("hot", "Горячее", "", 69.02, 10, 29.63, 56.56, dishesOf("hot")),
      section("sauces", "Соусы", "", 69.02, 66.78, 29.63, 32.12, dishesOf("sauces")),
    ],
  };
}

export function loadDoc(): MenuDoc {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDoc();
    const parsed = JSON.parse(raw) as MenuDoc;
    if (parsed?.version !== 1 || !Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
      return defaultDoc();
    }
    return parsed;
  } catch {
    return defaultDoc();
  }
}

export function saveDoc(doc: MenuDoc): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
}

export function minSize(kind: BlockKind): { w: number; h: number } {
  if (kind === "rule") return { w: 8, h: 0.7 };
  if (kind === "title") return { w: 16, h: 4 };
  return { w: 14, h: 8 };
}

export function clampBlock(block: Block): Block {
  const min = minSize(block.kind);
  const w = Math.min(100, Math.max(min.w, block.w));
  const h = Math.min(100, Math.max(min.h, block.h));
  const x = Math.min(Math.max(0, block.x), 100 - w);
  const y = Math.min(Math.max(0, block.y), 100 - h);
  return { ...block, x: round(x), y: round(y), w: round(w), h: round(h) };
}

function nearest(value: number, edges: number[], threshold: number): number | null {
  let best: number | null = null;
  let dist = threshold;
  for (const edge of edges) {
    const delta = Math.abs(value - edge);
    if (delta < dist) {
      dist = delta;
      best = edge;
    }
  }
  return best;
}

function collectEdges(others: Block[]): { xs: number[]; ys: number[] } {
  const xs = [0, 50, 100];
  const ys = [0, 50, 100];
  for (const block of others) {
    xs.push(block.x, block.x + block.w, block.x + block.w / 2);
    ys.push(block.y, block.y + block.h, block.y + block.h / 2);
  }
  return { xs, ys };
}

export function snapMove(block: Block, others: Block[], enabled: boolean): { block: Block; guides: Guides } {
  const next = { ...block };
  const guides: Guides = { x: null, y: null };
  if (enabled) {
    const { xs, ys } = collectEdges(others);
    const threshold = 0.75;
    const left = nearest(next.x, xs, threshold);
    const right = nearest(next.x + next.w, xs, threshold);
    const centerX = nearest(next.x + next.w / 2, xs, threshold);
    if (left != null) {
      next.x = left;
      guides.x = left;
    } else if (right != null) {
      next.x = right - next.w;
      guides.x = right;
    } else if (centerX != null) {
      next.x = centerX - next.w / 2;
      guides.x = centerX;
    }
    const top = nearest(next.y, ys, threshold);
    const bottom = nearest(next.y + next.h, ys, threshold);
    const centerY = nearest(next.y + next.h / 2, ys, threshold);
    if (top != null) {
      next.y = top;
      guides.y = top;
    } else if (bottom != null) {
      next.y = bottom - next.h;
      guides.y = bottom;
    } else if (centerY != null) {
      next.y = centerY - next.h / 2;
      guides.y = centerY;
    }
  }
  return { block: clampBlock(next), guides };
}

export function snapResize(
  block: Block,
  dir: string,
  others: Block[],
  enabled: boolean,
): { block: Block; guides: Guides } {
  const next = { ...block };
  const guides: Guides = { x: null, y: null };
  if (enabled) {
    const { xs, ys } = collectEdges(others);
    const threshold = 0.75;
    if (dir.includes("e")) {
      const hit = nearest(next.x + next.w, xs, threshold);
      if (hit != null) {
        next.w = hit - next.x;
        guides.x = hit;
      }
    }
    if (dir.includes("w")) {
      const hit = nearest(next.x, xs, threshold);
      if (hit != null) {
        next.w = next.w + (next.x - hit);
        next.x = hit;
        guides.x = hit;
      }
    }
    if (dir.includes("s")) {
      const hit = nearest(next.y + next.h, ys, threshold);
      if (hit != null) {
        next.h = hit - next.y;
        guides.y = hit;
      }
    }
    if (dir.includes("n")) {
      const hit = nearest(next.y, ys, threshold);
      if (hit != null) {
        next.h = next.h + (next.y - hit);
        next.y = hit;
        guides.y = hit;
      }
    }
  }
  return { block: clampBlock(next), guides };
}

export function withBlock(doc: MenuDoc, id: string, patch: Partial<Block>): MenuDoc {
  return {
    ...doc,
    blocks: doc.blocks.map((block) =>
      block.id === id ? clampBlock({ ...block, ...patch }) : block,
    ),
  };
}

export function bringForward(doc: MenuDoc, id: string): MenuDoc {
  const block = doc.blocks.find((item) => item.id === id);
  if (!block) return doc;
  return { ...doc, blocks: [...doc.blocks.filter((item) => item.id !== id), block] };
}

export function sendBackward(doc: MenuDoc, id: string): MenuDoc {
  const block = doc.blocks.find((item) => item.id === id);
  if (!block) return doc;
  return { ...doc, blocks: [block, ...doc.blocks.filter((item) => item.id !== id)] };
}

export function duplicateBlock(doc: MenuDoc, id: string): { doc: MenuDoc; id: string } {
  const block = doc.blocks.find((item) => item.id === id);
  if (!block) return { doc, id };
  const copyId = uid();
  const copy: Block = clampBlock({
    ...structuredClone(block),
    id: copyId,
    x: block.x + 2,
    y: block.y + 2,
    text: block.kind === "section" ? `${block.text} копия` : block.text,
    dishes: block.dishes.map((item) => ({ ...item, id: uid() })),
  });
  return { doc: { ...doc, blocks: [...doc.blocks, copy] }, id: copyId };
}

export function addSection(doc: MenuDoc): { doc: MenuDoc; id: string } {
  const id = uid();
  const block = section(id, "Новый раздел", "", 8, 14, 30, 24, [
    dish("Новое блюдо", 100, 0),
  ]);
  return { doc: { ...doc, blocks: [...doc.blocks, block] }, id };
}

export function deleteBlock(doc: MenuDoc, id: string): MenuDoc {
  return { ...doc, blocks: doc.blocks.filter((block) => block.id !== id) };
}

export function createDish(doc: MenuDoc, blockId: string): { doc: MenuDoc; dishId: string } {
  const created = dish("Новое блюдо", 100, 0);
  return {
    dishId: created.id,
    doc: {
      ...doc,
      blocks: doc.blocks.map((block) =>
        block.id === blockId ? { ...block, dishes: [...block.dishes, created] } : block,
      ),
    },
  };
}

export function updateDish(doc: MenuDoc, dishId: string, patch: Partial<Dish>): MenuDoc {
  return {
    ...doc,
    blocks: doc.blocks.map((block) => ({
      ...block,
      dishes: block.dishes.map((item) => (item.id === dishId ? { ...item, ...patch } : item)),
    })),
  };
}

export function deleteDish(doc: MenuDoc, dishId: string): MenuDoc {
  return {
    ...doc,
    blocks: doc.blocks.map((block) => ({
      ...block,
      dishes: block.dishes.filter((item) => item.id !== dishId),
    })),
  };
}

export function moveDish(doc: MenuDoc, dishId: string, toBlockId: string, index: number): MenuDoc {
  let moving: Dish | undefined;
  const stripped = doc.blocks.map((block) => {
    const found = block.dishes.find((item) => item.id === dishId);
    if (!found) return block;
    moving = found;
    return { ...block, dishes: block.dishes.filter((item) => item.id !== dishId) };
  });
  if (!moving) return doc;
  const dishToInsert = moving;
  return {
    ...doc,
    blocks: stripped.map((block) => {
      if (block.id !== toBlockId || block.kind !== "section") return block;
      const dishes = block.dishes.slice();
      const at = Math.max(0, Math.min(index, dishes.length));
      dishes.splice(at, 0, dishToInsert);
      return { ...block, dishes };
    }),
  };
}

export function moveDishStep(doc: MenuDoc, dishId: string, direction: -1 | 1): MenuDoc {
  for (const block of doc.blocks) {
    const index = block.dishes.findIndex((item) => item.id === dishId);
    if (index < 0) continue;
    const next = index + direction;
    if (next < 0 || next >= block.dishes.length) return doc;
    return moveDish(doc, dishId, block.id, direction < 0 ? index - 1 : index + 1);
  }
  return doc;
}
