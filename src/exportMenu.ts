import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

function download(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
}

async function renderPoster(node: HTMLElement, white: boolean): Promise<string> {
  await document.fonts.ready;
  const clipped = [...node.querySelectorAll<HTMLElement>(".block-body")]
    .some((body) => body.scrollHeight - body.clientHeight > 2);
  if (clipped) throw new Error("Блюда не влезают: увеличьте блок или уменьшите шапку перед экспортом.");
  const pixelRatio = Math.min(4, Math.max(2, 4200 / node.offsetWidth));
  const copy = node.cloneNode(true) as HTMLElement;
  copy.removeAttribute("id");
  copy.classList.add("is-exporting");
  if (white) copy.classList.add("white-export");
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-100000px;top:0;width:${node.offsetWidth}px;height:${node.offsetHeight}px;pointer-events:none;`;
  host.append(copy);
  document.body.append(host);
  try {
    return await toPng(copy, {
      pixelRatio,
      cacheBust: true,
      backgroundColor: white ? "#ffffff" : getComputedStyle(node).backgroundColor,
      filter: (domNode) =>
        !(domNode instanceof HTMLElement && domNode.dataset.exportHide === "true"),
    });
  } finally {
    host.remove();
  }
}

export async function downloadPng(node: HTMLElement, white = false): Promise<void> {
  const data = await renderPoster(node, white);
  download(data, white ? "vse-svoi-menu-white.png" : "vse-svoi-menu.png");
}

export async function downloadPdf(node: HTMLElement, white = false): Promise<void> {
  const data = await renderPoster(node, white);
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a3",
    compress: true,
  });
  pdf.addImage(data, "PNG", 0, 0, 420, 297);
  pdf.save(white ? "vse-svoi-menu-white.pdf" : "vse-svoi-menu.pdf");
}
