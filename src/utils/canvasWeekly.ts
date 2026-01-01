import type { WeeklyHighlights, Dish, MenuTemplate } from "../types";

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
    let currentY = y+10;
    let lineCount = 0;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, currentY - (n*2));
            line = words[n] + " ";
            currentY += lineHeight;
            lineCount++;
            if (maxLines && lineCount >= maxLines) {
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

export async function generateWeeklyCanvas(
    weekly: WeeklyHighlights,
    dishes: Dish[],
    template?: MenuTemplate
): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920; // format vertical
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Impossible de créer le contexte canvas");

    const centerX = canvas.width / 2;

    // 1) Fond : priorité au background du template
    let backgroundDone = false;

    if (template?.data.background_image?.url) {
        try {
            const bg = await loadImage(template.data.background_image.url);
            const ratioCanvas = canvas.width / canvas.height;
            const ratioImg = bg.width / bg.height;

            let sx = 0;
            let sy = 0;
            let sWidth = bg.width;
            let sHeight = bg.height;

            if (ratioImg > ratioCanvas) {
                sWidth = bg.height * ratioCanvas;
                sx = (bg.width - sWidth) / 2;
            } else {
                sHeight = bg.width / ratioCanvas;
                sy = (bg.height - sHeight) / 2;
            }

            ctx.drawImage(bg, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
            backgroundDone = true;
        } catch (e) {
            console.warn("Erreur chargement background template weekly", e);
        }
    }

    // Fallback thème "bistro Noël" si pas d'image template
    if (!backgroundDone) {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "#3c1b1f");
        gradient.addColorStop(0.5, "#281015");
        gradient.addColorStop(1, "#10070b");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "#f6d27b";
        ctx.lineWidth = 10;
        roundRect(ctx, 40, 40, canvas.width - 80, canvas.height - 80, 40);
        ctx.stroke();
    }

    // 2) Titre + période
    ctx.fillStyle = "#fdf7ee";
    ctx.textBaseline = "top";

    ctx.font = "700 64px 'Playfair Display', serif";
    const title = weekly.data.title || "Plats de la semaine";
    const titleWidth = ctx.measureText(title).width;
    ctx.fillText(title, centerX - titleWidth / 2, 70);

    // 3) Cartes de plats en colonne
    const maxItems = Math.min(dishes.length, 6);
    const cardWidth = canvas.width - 140;
    const cardHeight = 210;
    const firstCardY = 220;
    const cardSpacing = 30;

    for (let i = 0; i < maxItems; i++) {
        const dish = dishes[i];
        const cardX = (canvas.width - cardWidth) / 2;
        const cardY = firstCardY + i * (cardHeight + cardSpacing);

        // Alternance : pair = image à gauche, impair = image à droite
        const imageOnLeft = i % 2 === 0;

        // Carte
        ctx.save();
        roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 32);
        ctx.fillStyle = "rgba(255, 250, 245, 0.93)";
        ctx.fill();

        ctx.shadowColor = "rgba(0,0,0,0.18)";
        ctx.shadowBlur = 16;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;
        ctx.fill();
        ctx.restore();

        // Image
        const imgSize = 170;
        const imgX = imageOnLeft
            ? cardX + 26
            : cardX + cardWidth - 26 - imgSize;
        const imgY = cardY + (cardHeight - imgSize) / 2;

        try {
            const img = await loadImage(dish.data.image.url);
            ctx.save();
            roundRect(ctx, imgX, imgY, imgSize, imgSize, 26);
            ctx.clip();
            ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
            ctx.restore();
        } catch {
            ctx.save();
            ctx.strokeStyle = "#d3b88c";
            ctx.lineWidth = 3;
            roundRect(ctx, imgX, imgY, imgSize, imgSize, 26);
            ctx.stroke();
            ctx.restore();
        }

        // Texte
        let textX: number;
        const textY = imgY + 10;
        let maxTextWidth: number;

        if (imageOnLeft) {
            // image à gauche → texte à droite
            textX = imgX + imgSize + 28;
            maxTextWidth = cardX + cardWidth - 32 - textX;
        } else {
            // image à droite → texte à gauche
            textX = cardX + 32;
            maxTextWidth = imgX - 32 - textX;
        }

        ctx.textBaseline = "top";

        // Nom du plat
        ctx.fillStyle = "#43251c";
        ctx.font = "600 40px 'Montserrat', sans-serif";
        wrapText(ctx, dish.data.title, textX, textY, maxTextWidth, 30, 2);

        // Catégorie + petite note
        ctx.font = "400 22px 'Montserrat', sans-serif";
        ctx.fillStyle = "#6a4635";

        if (dish.data.description) {
            const plainDesc = extractPlainText(dish.data.description);
            wrapText(ctx, plainDesc, textX, textY + 135, maxTextWidth, 24, 2);
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
