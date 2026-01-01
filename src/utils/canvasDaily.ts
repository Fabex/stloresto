import type { DailyMenu, Dish, MenuTemplate } from "../types";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function generateDailyMenuCanvas(
  menu: DailyMenu,
  dishMap: Record<string, Dish>,
  template?: MenuTemplate
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920; // format story vertical
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossible de créer le contexte canvas");

  const centerX = canvas.width / 2;

  // 1) Fond : priorité au template Prismic
  let backgroundDone = false;

  if (template?.data.background_image?.url) {
    try {
      const bg = await loadImage(template.data.background_image.url);
      // on "cover" l'écran
      const ratioCanvas = canvas.width / canvas.height;
      const ratioImg = bg.width / bg.height;

      let sx = 0;
      let sy = 0;
      let sWidth = bg.width;
      let sHeight = bg.height;

      if (ratioImg > ratioCanvas) {
        // image plus large → on coupe à gauche/droite
        sWidth = bg.height * ratioCanvas;
        sx = (bg.width - sWidth) / 2;
      } else {
        // image plus haute → on coupe en haut/bas
        sHeight = bg.width / ratioCanvas;
        sy = (bg.height - sHeight) / 2;
      }

      ctx.drawImage(bg, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
      backgroundDone = true;
    } catch (e) {
      console.warn("Erreur chargement background template", e);
    }
  }

  // Fallback Noël si pas de template ou image cassée
  if (!backgroundDone) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#911b24");
    gradient.addColorStop(0.5, "#5a1018");
    gradient.addColorStop(1, "#120b13");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#f6d27b";
    ctx.lineWidth = 12;
    roundRect(ctx, 40, 40, canvas.width - 80, canvas.height - 80, 40);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 3 + 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2) Titre
  const title = menu.data.title || "Menu du jour";
  ctx.fillStyle = "#fdf7ee";
  ctx.textBaseline = "top";
  ctx.font = "700 70px 'Playfair Display', serif";
  const titleWidth = ctx.measureText(title).width;
  ctx.fillText(title, centerX - titleWidth / 2, 80);

  const dateText = menu.data.date ?? "";
  if (dateText) {
    ctx.font = "500 30px 'Montserrat', sans-serif";
    const dateWidth = ctx.measureText(dateText).width;
    ctx.fillText(dateText, centerX - dateWidth / 2, 170);
  }

  // 3) Cartes de plats (Entrée / Plat / Dessert)
  type SectionKey = "starter" | "main" | "dessert";
  const sections: { key: SectionKey; label: string }[] = [
    { key: "starter", label: "Entrée" },
    { key: "main", label: "Plat" },
    { key: "dessert", label: "Dessert" }
  ];

  const cardWidth = canvas.width - 140;
  const cardHeight = 320;
  const firstCardY = 260;
  const cardSpacing = 40;

  for (let index = 0; index < sections.length; index++) {
    const section = sections[index];
    const linkField: any = (menu.data as any)[section.key];
    if (!linkField?.id) continue;

    const dish = dishMap[linkField.id];
    if (!dish) continue;

    const cardX = (canvas.width - cardWidth) / 2;
    const cardY = firstCardY + index * (cardHeight + cardSpacing);

    // Carte
    ctx.save();
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 40);
    ctx.fillStyle = "rgba(255, 250, 245, 0.92)";
    ctx.fill();

    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;
    ctx.fill();
    ctx.restore();

    // Ruban label
    const ribbonHeight = 48;
    ctx.save();
    roundRect(ctx, cardX + 24, cardY - ribbonHeight / 2, 220, ribbonHeight, 24);
    ctx.fillStyle = "#b22a2a";
    ctx.fill();
    ctx.fillStyle = "#fbe7b5";
    ctx.font = "600 24px 'Montserrat', sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(section.label, cardX + 42, cardY - ribbonHeight / 2 + ribbonHeight / 2);
    ctx.restore();

    // Image du plat
    const imgSize = 230;
    const imgX = cardX + 32;
    const imgY = cardY + (cardHeight - imgSize) / 2;

    try {
      const img = await loadImage(dish.data.image.url);
      ctx.save();
      roundRect(ctx, imgX, imgY, imgSize, imgSize, 30);
      ctx.clip();
      ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
      ctx.restore();
    } catch {
      ctx.save();
      ctx.strokeStyle = "#d3b88c";
      ctx.lineWidth = 3;
      roundRect(ctx, imgX, imgY, imgSize, imgSize, 30);
      ctx.stroke();
      ctx.restore();
    }

    // Texte
    const textX = imgX + imgSize + 36;
    const textY = imgY + 10;

    ctx.fillStyle = "#43251c";
    ctx.textBaseline = "top";

    ctx.font = "600 30px 'Montserrat', sans-serif";
    wrapText(ctx, dish.data.title, textX, textY, cardX + cardWidth - 40 - textX, 34);

    if (dish.data.price != null) {
      ctx.font = "500 26px 'Montserrat', sans-serif";
      const priceText = `${dish.data.price.toFixed(2)} €`;
      ctx.fillStyle = "#b22a2a";
      ctx.fillText(priceText, textX, textY + 110);
    }

    ctx.font = "400 22px 'Montserrat', sans-serif";
    ctx.fillStyle = "#6a4635";
    const descY = textY + 150;
    const descMaxWidth = cardX + cardWidth - 40 - textX;
    if (dish.data.description) {
      const descText = extractPlainText(dish.data.description);
      wrapText(ctx, descText, textX, descY, descMaxWidth, 26, 3);
    }
  }

  return canvas;
}

function extractPlainText(rich: any): string {
  if (!Array.isArray(rich)) return "";
  return rich
    .map((block) => ("text" in block ? block.text : ""))
    .join(" ")
    .trim();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines?: number
) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
      lineCount++;
      if (maxLines && lineCount >= maxLines - 1) {
        const remaining = words.slice(n + 1).join(" ");
        const lastLine = line + remaining;
        const ellipsis = "...";
        let truncated = lastLine;
        while (ctx.measureText(truncated + ellipsis).width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + ellipsis, x, currentY);
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}
