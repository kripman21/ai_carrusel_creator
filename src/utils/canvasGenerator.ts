import type { Slide, StyleState, ShadowState } from '../types';

// --- Helper Functions ---

export const parseStyledText = (text: string) => {
    if (!text) return [];
    const parts = text.split(/(\*.*?\*|\n)/g).filter(Boolean);
    return parts.map(part => {
        if (part === '\n') {
            return { text: '', isHighlighted: false, isNewline: true };
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return { text: part.slice(1, -1), isHighlighted: true, isNewline: false };
        }
        return { text: part, isHighlighted: false, isNewline: false };
    });
};

export const getWrappedStyledTextMetrics = (ctx: CanvasRenderingContext2D, parsedText: ReturnType<typeof parseStyledText>, style: StyleState, maxWidth: number) => {
    const lineHeight = style.fontSize * 1.4;
    const lines: { text: string; isHighlighted: boolean }[][] = [];
    let currentLine: { text: string; isHighlighted: boolean }[] = [];
    let currentLineWidth = 0;

    for (const part of parsedText) {
        if (part.isNewline) {
            if (currentLine.length > 0) lines.push(currentLine);
            lines.push([]); // Empty line for newline
            currentLine = [];
            currentLineWidth = 0;
            continue;
        }

        const words = part.text.split(' ');
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            if (!word) continue;

            const wordWithSpace = word + (i < words.length - 1 ? ' ' : '');
            const wordWidth = ctx.measureText(wordWithSpace).width;

            if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = [];
                currentLineWidth = 0;
            }
            currentLine.push({ text: wordWithSpace, isHighlighted: part.isHighlighted });
            currentLineWidth += wordWidth;
        }
    }
    if (currentLine.length > 0) lines.push(currentLine);

    return { lines, height: lines.length * lineHeight };
};

export const drawStyledTextLines = (ctx: CanvasRenderingContext2D, lines: { text: string; isHighlighted: boolean }[][], x: number, y: number, style: StyleState) => {
    const lineHeight = style.fontSize * 1.4;
    ctx.textBaseline = 'top';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineY = y + i * lineHeight;
        const fullLineWidth = line.reduce((acc, part) => acc + ctx.measureText(part.text).width, 0);

        let currentX;
        if (style.textAlign === 'center') currentX = x + (ctx.canvas.width - x * 2 - fullLineWidth) / 2;
        else if (style.textAlign === 'right') currentX = ctx.canvas.width - x - fullLineWidth;
        else currentX = x;

        for (const part of line) {
            ctx.fillStyle = part.isHighlighted ? style.highlightColor : style.color;
            ctx.fillText(part.text, currentX, lineY);
            currentX += ctx.measureText(part.text).width;
        }
    }
};

// --- Main Generation Function ---

export const createSlideCanvas = async (
    slide: Slide,
    logo: string | null,
    logoSize: number,
    imageOverlay: { enabled: boolean; color: string; opacity: number; },
    aspectRatio: '1:1' | '4:5',
    previewWidth: number
): Promise<HTMLCanvasElement | null> => {
    if (!slide.src) return null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const outputSize = 1080;
    canvas.width = outputSize;
    canvas.height = aspectRatio === '1:1' ? outputSize : Math.round(outputSize * (4 / 3));

    const scale = outputSize / previewWidth;

    const scaleStyle = (style: StyleState, scale: number): StyleState => ({
        ...style, fontSize: style.fontSize * scale,
        shadow: { ...style.shadow, blur: style.shadow.blur * scale, offsetX: style.shadow.offsetX * scale, offsetY: style.shadow.offsetY * scale }
    });

    const scaledTitleStyle = scaleStyle(slide.titleStyle, scale);
    const scaledBodyStyle = scaleStyle(slide.bodyStyle, scale);
    const scaledCtaStyle = scaleStyle(slide.cta.style, scale);
    const scaledCtaBg = { ...slide.cta.background, borderRadius: slide.cta.background.borderRadius * scale, paddingX: slide.cta.background.paddingX * scale, paddingY: slide.cta.background.paddingY * scale };
    const scaledSpacing = slide.layoutStyle.spacing * scale;
    const ctaMarginTop = 16 * scale;

    try {
        await Promise.all([
            document.fonts.load(`bold ${scaledTitleStyle.fontSize}px ${scaledTitleStyle.fontFamily}`),
            document.fonts.load(`normal ${scaledBodyStyle.fontSize}px ${scaledBodyStyle.fontFamily}`),
            slide.cta.enabled ? document.fonts.load(`bold ${scaledCtaStyle.fontSize}px ${scaledCtaStyle.fontFamily}`) : Promise.resolve(),
        ]);
    } catch (e) { console.warn("Font loading may be incomplete:", e); }

    const bgImage = new Image();
    bgImage.crossOrigin = 'anonymous';
    bgImage.src = slide.src;

    const logoImage = new Image();
    if (logo) { logoImage.crossOrigin = 'anonymous'; logoImage.src = logo; }

    await Promise.all([
        new Promise(res => { bgImage.onload = res; bgImage.onerror = () => res(null); }),
        logo ? new Promise(res => { logoImage.onload = res; logoImage.onerror = () => res(null); }) : Promise.resolve()
    ]).catch(e => console.error("Error loading images for canvas:", e));

    // Draw Background & Overlay
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    if (imageOverlay.enabled && imageOverlay.opacity > 0) {
        ctx.fillStyle = imageOverlay.color;
        ctx.globalAlpha = imageOverlay.opacity;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
    }

    // Draw Logo
    const logoPadding = outputSize * 0.04;
    let reservedLogoHeight = 0;
    if (logo && logoImage.complete && logoImage.naturalWidth > 0) {
        const actualLogoWidth = outputSize * (logoSize / 100);
        const logoAspectRatio = logoImage.width / logoImage.height;
        const actualLogoHeight = actualLogoWidth / logoAspectRatio;
        ctx.drawImage(logoImage, logoPadding, logoPadding, actualLogoWidth, actualLogoHeight);
        reservedLogoHeight = logoPadding + actualLogoHeight;
    }

    // Calculate Text Metrics and Position
    const padding = outputSize * 0.07;
    const contentWidth = outputSize - (padding * 2);

    ctx.font = `bold ${scaledTitleStyle.fontSize}px ${scaledTitleStyle.fontFamily}`;
    const parsedTitle = parseStyledText(slide.title);
    const titleMetrics = getWrappedStyledTextMetrics(ctx, parsedTitle, scaledTitleStyle, contentWidth);

    ctx.font = `normal ${scaledBodyStyle.fontSize}px ${scaledBodyStyle.fontFamily}`;
    const parsedBody = parseStyledText(slide.body);
    const bodyMetrics = getWrappedStyledTextMetrics(ctx, parsedBody, scaledBodyStyle, contentWidth);

    let ctaBlockHeight = 0, ctaBlockWidth = 0;
    let ctaTextMetrics = { lines: [], height: 0 };
    // Type cast for lines to avoid TS errors if implicit any
    let ctaLines: { text: string; isHighlighted: boolean }[][] = [];

    if (slide.cta.enabled && slide.cta.text) {
        ctx.font = `bold ${scaledCtaStyle.fontSize}px ${scaledCtaStyle.fontFamily}`;
        const parsedCta = parseStyledText(slide.cta.text);
        const ctaMetricsResult = getWrappedStyledTextMetrics(ctx, parsedCta, scaledCtaStyle, contentWidth - scaledCtaBg.paddingX * 2);
        ctaTextMetrics = { lines: ctaMetricsResult.lines as any, height: ctaMetricsResult.height };
        ctaLines = ctaMetricsResult.lines;

        ctaBlockHeight = ctaTextMetrics.height + scaledCtaBg.paddingY * 2;
        const ctaTextWidth = Math.max(...ctaLines.map(line => ctx.measureText(line.map(p => p.text).join('')).width));
        ctaBlockWidth = ctaTextWidth + scaledCtaBg.paddingX * 2;
    }

    let totalTextHeight = titleMetrics.height + scaledSpacing + bodyMetrics.height;
    if (slide.cta.enabled && slide.cta.text) totalTextHeight += ctaMarginTop + ctaBlockHeight;

    let startY;
    if (slide.layoutStyle.verticalAlign === 'top') {
        startY = reservedLogoHeight > 0 ? reservedLogoHeight + padding : padding;
    } else if (slide.layoutStyle.verticalAlign === 'center') {
        startY = (canvas.height - totalTextHeight) / 2;
        if (startY < reservedLogoHeight + padding) startY = reservedLogoHeight + padding;
    } else {
        startY = canvas.height - padding - totalTextHeight;
    }

    const applyShadow = (shadow: ShadowState) => {
        if (shadow.enabled) {
            ctx.shadowColor = shadow.color;
            ctx.shadowBlur = shadow.blur;
            ctx.shadowOffsetX = shadow.offsetX;
            ctx.shadowOffsetY = shadow.offsetY;
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
    };

    // --- Draw All Elements ---
    applyShadow(scaledTitleStyle.shadow);
    ctx.font = `bold ${scaledTitleStyle.fontSize}px ${scaledTitleStyle.fontFamily}`;
    drawStyledTextLines(ctx, titleMetrics.lines, padding, startY, scaledTitleStyle);
    const titleBottom = startY + titleMetrics.height;

    applyShadow(scaledBodyStyle.shadow);
    ctx.font = `normal ${scaledBodyStyle.fontSize}px ${scaledBodyStyle.fontFamily}`;
    drawStyledTextLines(ctx, bodyMetrics.lines, padding, titleBottom + scaledSpacing, scaledBodyStyle);
    const bodyBottom = titleBottom + scaledSpacing + bodyMetrics.height;

    if (slide.cta.enabled && slide.cta.text) {
        applyShadow({ enabled: false, color: '', blur: 0, offsetX: 0, offsetY: 0 });
        const ctaBlockY = bodyBottom + ctaMarginTop;

        let ctaBlockX = padding;
        if (slide.cta.style.textAlign === 'center') ctaBlockX = (canvas.width - ctaBlockWidth) / 2;
        else if (slide.cta.style.textAlign === 'right') ctaBlockX = canvas.width - padding - ctaBlockWidth;

        ctx.fillStyle = scaledCtaBg.color;
        ctx.beginPath();
        // @ts-ignore - roundRect is standard but Typescript might complain in older lib versions
        if (ctx.roundRect) ctx.roundRect(ctaBlockX, ctaBlockY, ctaBlockWidth, ctaBlockHeight, scaledCtaBg.borderRadius);
        else ctx.rect(ctaBlockX, ctaBlockY, ctaBlockWidth, ctaBlockHeight); // Fallback
        ctx.fill();

        ctx.font = `bold ${scaledCtaStyle.fontSize}px ${scaledCtaStyle.fontFamily}`;
        drawStyledTextLines(ctx, ctaLines, ctaBlockX + scaledCtaBg.paddingX, ctaBlockY + scaledCtaBg.paddingY, scaledCtaStyle);
    }

    applyShadow({ enabled: false, color: '', blur: 0, offsetX: 0, offsetY: 0 });
    return canvas;
};
