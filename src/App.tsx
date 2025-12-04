import { useState, useCallback, useRef, useEffect } from 'react';
import { generateCarousel, generateImage } from './services/geminiService';
import type { Slide, StyleState, LayoutState, ShadowState, CtaState, StylePreset } from './types';
import { Icon } from './components/Icon';
import { Carousel } from './components/Carousel';
import { PexelsSearchModal } from './components/PexelsSearchModal';
import { TextEditorPanel } from './components/TextEditorPanel';

// --- Constants for Default Styles ---
const DEFAULT_TITLE_STYLE: StyleState = { fontSize: 42, color: '#FFFFFF', fontFamily: 'Playfair Display, serif', textAlign: 'left', highlightColor: '#FFD700', shadow: { enabled: true, color: '#000000', blur: 8, offsetX: 2, offsetY: 2 } };
const DEFAULT_BODY_STYLE: StyleState = { fontSize: 20, color: '#F3F4F6', fontFamily: 'Roboto, sans-serif', textAlign: 'left', highlightColor: '#FFD700', shadow: { enabled: true, color: '#000000', blur: 4, offsetX: 1, offsetY: 1 } };
const DEFAULT_LAYOUT_STYLE: LayoutState = { verticalAlign: 'bottom', spacing: 16 };
const DEFAULT_IMAGE_OVERLAY_STYLE = { enabled: true, color: '#000000', opacity: 0.3 };
const DEFAULT_CTA_STATE: CtaState = {
    enabled: false,
    text: 'Shop Now',
    style: {
        fontSize: 18, color: '#FFFFFF', fontFamily: 'Poppins, sans-serif', textAlign: 'center', highlightColor: '#FFD700',
        shadow: { enabled: false, color: '#000000', blur: 0, offsetX: 0, offsetY: 0 }
    },
    background: { color: '#007BFF', borderRadius: 8, paddingX: 24, paddingY: 12 }
};

const defaultImagePrompt = `Create an elegant Instagram carousel for a luxury fashion brand. The theme is "The Power of Red". Use professional models wearing bold red outfits. The color palette should be red, white, and black with beige/nude backgrounds. The style should be minimalist, clean, and sophisticated, with a mix of close-ups and full-body shots. Ensure some slides have negative space for text overlays.`;
const defaultContentPrompt = `Create a 6-slide carousel.
Slide 1: Title "The Power of Red". Body: "Discover our new collection that redefines elegance."
Slide 2: Focus on the luxurious fabrics. Title: "Unmatched Quality". Body: "Crafted from the finest silks and velvets."
Slide 3: Showcase a specific evening gown. Title: "The Statement Piece". Body: "An unforgettable silhouette for any occasion."
Slide 4: A powerful quote. Title: "Be Bold.". Body: "“Confidence is the best outfit. Rock it and own it.”"
Slide 5: Highlight sustainable practices. Title: "Conscious Luxury". Body: "Beauty that's mindful of our planet."
Slide 6: A clear call to action. Title: "Shop The Collection". Body: "Tap the link in our bio to explore."`;

const testSlidesData = [
    { prompt: "A majestic mountain landscape at sunrise, with a serene lake reflecting the colorful sky.", title: "Embrace the Dawn", body: "Every new day brings a fresh opportunity for adventure and discovery." },
    { prompt: "A cozy, book-filled library with a warm fireplace and a comfortable armchair.", title: "Find Your Sanctuary", body: "Create a space that nourishes your mind and soul." },
    { prompt: "A vibrant city street at night, with neon lights and bustling crowds.", title: "The Energy of the City", body: "Get lost in the rhythm and pulse of urban life." },
    { prompt: "A close-up shot of a single dewdrop on a green leaf, reflecting the world around it.", title: "Focus on the Details", body: "Beauty can be found in the smallest, most overlooked moments." },
    { prompt: "A person reaching the summit of a mountain, looking out over a vast valley.", title: "Reach New Heights", body: "Your perseverance and dedication will lead you to incredible views." }
];

// --- Main App Component ---
export default function App() {
    // --- State Initialization with Persistence ---
    const savedSession = (() => {
        try {
            return JSON.parse(localStorage.getItem('acc_session_v1') || 'null');
        } catch { return null; }
    })();

    const [slides, setSlides] = useState<Slide[]>(savedSession?.slides || []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [imagePrompt, setImagePrompt] = useState(savedSession?.imagePrompt || defaultImagePrompt);
    const [contentPrompt, setContentPrompt] = useState(savedSession?.contentPrompt || defaultContentPrompt);
    const [carouselName, setCarouselName] = useState(savedSession?.carouselName || 'My-AI-Carousel');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5'>(savedSession?.aspectRatio || '1:1');
    const [imageSource, setImageSource] = useState<'ai' | 'pexels'>(savedSession?.imageSource || 'ai');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [logo, setLogo] = useState<string | null>(savedSession?.logo || null);
    const [logoSize, setLogoSize] = useState(savedSession?.logoSize || 12);
    const [imageOverlayStyle, setImageOverlayStyle] = useState(savedSession?.imageOverlayStyle || DEFAULT_IMAGE_OVERLAY_STYLE);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const [presets, setPresets] = useState<StylePreset[]>([]);
    const [activePresetId, setActivePresetId] = useState<string | null>(null);
    const [toast, setToast] = useState({ message: '', visible: false });
    const [pexelsApiKey, setPexelsApiKey] = useState<string>(
        () => localStorage.getItem('pexelsApiKey') || import.meta.env.VITE_PEXELS_API_KEY || ''
    );
    const [pexelsSearchModalSlide, setPexelsSearchModalSlide] = useState<Slide | null>(null);
    const [isPexelsKeyVisible, setIsPexelsKeyVisible] = useState(false);


    // Global styles used for initializing new slides
    const [globalTitleStyle, setGlobalTitleStyle] = useState<StyleState>(DEFAULT_TITLE_STYLE);
    const [globalBodyStyle, setGlobalBodyStyle] = useState<StyleState>(DEFAULT_BODY_STYLE);
    const [globalLayoutStyle, setGlobalLayoutStyle] = useState<LayoutState>(DEFAULT_LAYOUT_STYLE);

    useEffect(() => {
        try {
            const savedPresets = localStorage.getItem('aiCarouselPresets');
            if (savedPresets) {
                setPresets(JSON.parse(savedPresets));
            }
        } catch (e) {
            console.error("Failed to load presets from localStorage", e);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('aiCarouselPresets', JSON.stringify(presets));
        } catch (e) {
            console.error("Failed to save presets to localStorage", e);
            // FIX: Provide user feedback if saving fails due to quota limit.
            if (e instanceof Error && e.name === 'QuotaExceededError') {
                showToast("Error: Could not save presets. Storage is full. Try deleting some presets or use a smaller logo.");
            }
        }
    }, [presets]);

    // --- Auto-Save Session ---
    useEffect(() => {
        if (slides.length > 0 || imagePrompt !== defaultImagePrompt || contentPrompt !== defaultContentPrompt) {
            const sessionData = {
                slides,
                imagePrompt,
                contentPrompt,
                carouselName,
                aspectRatio,
                imageSource,
                logo,
                logoSize,
                imageOverlayStyle
            };
            localStorage.setItem('acc_session_v1', JSON.stringify(sessionData));
        }
    }, [slides, imagePrompt, contentPrompt, carouselName, aspectRatio, imageSource, logo, logoSize, imageOverlayStyle]);

    useEffect(() => {
        if (slides.length > 0 && currentIndex >= slides.length) {
            setCurrentIndex(slides.length - 1);
        } else if (slides.length === 0 && currentIndex !== 0) {
            setCurrentIndex(0);
        }
    }, [slides, currentIndex]);

    // Effect to manage Pexels API key in localStorage
    useEffect(() => {
        try {
            if (pexelsApiKey) {
                localStorage.setItem('pexelsApiKey', pexelsApiKey);
            } else {
                localStorage.removeItem('pexelsApiKey');
            }
        } catch (e) {
            console.error("Failed to save Pexels API key:", e);
        }
    }, [pexelsApiKey]);

    const showToast = (message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast({ message: '', visible: false }), 3000);
    };

    // --- Style Update Handlers (to clear active preset) ---
    const handleSlidesUpdate = (newSlides: Slide[]) => {
        setSlides(newSlides);
        setActivePresetId(null);
    };
    const handleLogoUpdate = (newLogo: string | null) => {
        setLogo(newLogo);
        setActivePresetId(null);
    };
    const handleLogoSizeUpdate = (newSize: number) => {
        setLogoSize(newSize);
        setActivePresetId(null);
    };
    const handleImageOverlayUpdate = (prop: string, value: any) => {
        setImageOverlayStyle((s: typeof DEFAULT_IMAGE_OVERLAY_STYLE) => ({ ...s, [prop]: value }));
        setActivePresetId(null);
    };

    const handleSavePreset = useCallback((name: string) => {
        if (!name || !slides.length) return;

        const firstSlide = slides[0];
        const lastSlide = slides.length > 1 ? slides[slides.length - 1] : firstSlide;

        // Deep copy all style objects to create a complete, independent snapshot
        const newPreset: StylePreset = {
            id: `preset-${Date.now()}`,
            name,
            logo: logo,
            // Base styles from the first slide
            titleStyle: JSON.parse(JSON.stringify(firstSlide.titleStyle)),
            bodyStyle: JSON.parse(JSON.stringify(firstSlide.bodyStyle)),
            layoutStyle: JSON.parse(JSON.stringify(firstSlide.layoutStyle)),
            cta: JSON.parse(JSON.stringify(firstSlide.cta)),
            // Global styles
            logoSize,
            imageOverlay: imageOverlayStyle,
            // Specific styles for the last slide
            lastSlideStyle: {
                titleStyle: JSON.parse(JSON.stringify(lastSlide.titleStyle)),
                bodyStyle: JSON.parse(JSON.stringify(lastSlide.bodyStyle)),
                layoutStyle: JSON.parse(JSON.stringify(lastSlide.layoutStyle)),
                cta: JSON.parse(JSON.stringify(lastSlide.cta)),
            }
        };
        const newPresets = [...presets, newPreset];
        setPresets(newPresets);
        setActivePresetId(newPreset.id); // Set the newly saved preset as active
        showToast(`Preset "${name}" saved successfully!`);
    }, [slides, logo, logoSize, imageOverlayStyle, presets]);

    const handleImportPreset = useCallback((file: File) => {
        if (!file || file.type !== 'application/json') {
            showToast("Invalid file type. Please select a .json file.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const importedData = JSON.parse(text);

                // Basic validation for required fields
                if (!importedData.name || !importedData.titleStyle || !importedData.bodyStyle || !importedData.layoutStyle || !importedData.cta) {
                    throw new Error("Invalid preset format. Missing required fields.");
                }

                if (presets.some(p => p.name === importedData.name)) {
                    throw new Error(`A preset named "${importedData.name}" already exists.`);
                }

                const newPreset: StylePreset = {
                    ...importedData,
                    id: `preset-${Date.now()}`, // Assign a new unique ID
                    logo: importedData.logo || null, // Ensure logo is null if not present, for compatibility
                };

                setPresets(prev => [...prev, newPreset]);
                showToast(`Preset "${newPreset.name}" imported successfully!`);
            } catch (err) {
                console.error("Failed to import preset:", err);
                showToast(err instanceof Error ? err.message : "Failed to parse the preset file.");
            }
        };
        reader.onerror = () => {
            showToast("Failed to read the file.");
        };
        reader.readAsText(file);
    }, [presets]);

    const handleExportPreset = useCallback((presetId: string) => {
        const preset = presets.find(p => p.id === presetId);
        if (!preset) return;

        const { id, ...exportData } = preset; // Exclude internal ID from export
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = preset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `${safeName}_preset.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [presets]);

    const handleApplyPreset = useCallback((presetId: string) => {
        const preset = presets.find(p => p.id === presetId);
        if (!preset) return;

        setLogo(preset.logo);
        setLogoSize(preset.logoSize);
        setImageOverlayStyle(preset.imageOverlay);

        setSlides(currentSlides => {
            const lastSlideIndex = currentSlides.length - 1;

            return currentSlides.map((slide, index) => {
                const isLastSlide = index === lastSlideIndex;

                if (isLastSlide && preset.lastSlideStyle) {
                    // Apply everything from lastSlideStyle for the last slide
                    return {
                        ...slide,
                        titleStyle: JSON.parse(JSON.stringify(preset.lastSlideStyle.titleStyle)),
                        bodyStyle: JSON.parse(JSON.stringify(preset.lastSlideStyle.bodyStyle)),
                        layoutStyle: JSON.parse(JSON.stringify(preset.lastSlideStyle.layoutStyle)),
                        cta: JSON.parse(JSON.stringify(preset.lastSlideStyle.cta)),
                    };
                } else {
                    // Apply base styles for other slides, preserving some slide-specific CTA fields.
                    return {
                        ...slide,
                        titleStyle: JSON.parse(JSON.stringify(preset.titleStyle)),
                        bodyStyle: JSON.parse(JSON.stringify(preset.bodyStyle)),
                        layoutStyle: JSON.parse(JSON.stringify(preset.layoutStyle)),
                        cta: {
                            ...slide.cta, // Preserve enabled/text from the slide itself
                            style: JSON.parse(JSON.stringify(preset.cta.style)),
                            background: JSON.parse(JSON.stringify(preset.cta.background)),
                        }
                    };
                }
            });
        });

        setActivePresetId(preset.id);
    }, [presets]);

    const handleDeletePreset = useCallback((presetId: string) => {
        if (window.confirm("Are you sure you want to delete this preset?")) {
            setPresets(prev => prev.filter(p => p.id !== presetId));
            if (activePresetId === presetId) {
                setActivePresetId(null);
            }
        }
    }, [activePresetId]);

    // --- Pre-generation Preset Selection ---
    const resetToDefaultStyles = useCallback(() => {
        setGlobalTitleStyle(DEFAULT_TITLE_STYLE);
        setGlobalBodyStyle(DEFAULT_BODY_STYLE);
        setGlobalLayoutStyle(DEFAULT_LAYOUT_STYLE);
        setLogoSize(12);
        setImageOverlayStyle(DEFAULT_IMAGE_OVERLAY_STYLE);
        setActivePresetId(null);
    }, []);

    const handleSelectPresetForGeneration = useCallback((presetId: string) => {
        const preset = presets.find(p => p.id === presetId);
        if (!preset) return;

        setGlobalTitleStyle(preset.titleStyle);
        setGlobalBodyStyle(preset.bodyStyle);
        setGlobalLayoutStyle(preset.layoutStyle);
        setLogo(preset.logo);
        setLogoSize(preset.logoSize);
        setImageOverlayStyle(preset.imageOverlay);
        setActivePresetId(preset.id);
    }, [presets]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const fontsToLoad = new Set<string>();
            slides.forEach(slide => {
                fontsToLoad.add(slide.titleStyle.fontFamily.split(',')[0].replace(/ /g, '+'));
                fontsToLoad.add(slide.bodyStyle.fontFamily.split(',')[0].replace(/ /g, '+'));
                if (slide.cta.enabled) {
                    fontsToLoad.add(slide.cta.style.fontFamily.split(',')[0].replace(/ /g, '+'));
                }
            });
            const fontFamilies = [...fontsToLoad].filter(Boolean).join('|');
            if (!fontFamilies) return;

            const linkId = 'google-fonts-stylesheet';
            let link = document.getElementById(linkId) as HTMLLinkElement;
            if (!link) {
                link = document.createElement('link');
                link.id = linkId;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
            link.href = `https://fonts.googleapis.com/css2?family=${fontFamilies}:wght@400;700&display=swap`;
        }, 800);

        return () => clearTimeout(timeoutId);
    }, [slides]);

    const handleGenerateCarousel = useCallback(async () => {
        const finalImagePrompt = imageSource === 'ai' ? imagePrompt : null; // Pass null if Pexels
        if (!finalImagePrompt && imageSource === 'ai') { // Only require imagePrompt if AI source
            setError("Image Style Prompt cannot be empty for AI generation.");
            return;
        }
        if (!contentPrompt.trim()) {
            setError("Slide Content cannot be empty.");
            return;
        }
        if (imageSource === 'pexels' && !pexelsApiKey.trim()) {
            setError("Pexels API key is required when using Pexels as image source.");
            return;
        }

        setIsLoading(true); setError(null); setSlides([]);
        try {
            const generatedSlides = await generateCarousel(finalImagePrompt, contentPrompt, aspectRatio, imageSource, pexelsApiKey);
            const activePreset = presets.find(p => p.id === activePresetId);

            const formattedSlides: Slide[] = generatedSlides.map((slide, index) => {
                const isLastSlide = index === generatedSlides.length - 1;

                // If it's the last slide and there's a valid preset with last slide styles, use them
                if (isLastSlide && activePreset?.lastSlideStyle) {
                    return {
                        id: `slide-${Date.now()}-${index}`,
                        prompt: slide.prompt, src: slide.src, title: slide.title, body: slide.body, isLoading: false,
                        titleStyle: { ...activePreset.lastSlideStyle.titleStyle },
                        bodyStyle: { ...activePreset.lastSlideStyle.bodyStyle },
                        layoutStyle: { ...activePreset.lastSlideStyle.layoutStyle },
                        cta: { ...activePreset.lastSlideStyle.cta },
                    };
                }

                // Fallback for regular slides or if no valid last-slide-style preset is active
                return {
                    id: `slide-${Date.now()}-${index}`,
                    prompt: slide.prompt, src: slide.src, title: slide.title, body: slide.body, isLoading: false,
                    titleStyle: { ...globalTitleStyle },
                    bodyStyle: { ...globalBodyStyle },
                    layoutStyle: { ...globalLayoutStyle },
                    // If preset is active, use its base CTA settings, otherwise use default logic
                    cta: activePreset
                        ? { ...activePreset.cta }
                        : { ...DEFAULT_CTA_STATE, enabled: isLastSlide, text: isLastSlide ? "Shop The Collection" : DEFAULT_CTA_STATE.text },
                };
            });
            setSlides(formattedSlides);
            setCurrentIndex(0);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [imagePrompt, contentPrompt, aspectRatio, imageSource, globalTitleStyle, globalBodyStyle, globalLayoutStyle, pexelsApiKey, presets, activePresetId]);

    const handleGenerateTest = useCallback(() => {
        const width = 1080;
        const height = aspectRatio === '1:1' ? 1080 : 1440;

        const testSlides: Slide[] = testSlidesData.map((slide, index) => {
            const isLastSlide = index === testSlidesData.length - 1;
            return {
                ...slide,
                id: `test-slide-${Date.now()}-${index}`,
                src: `https://picsum.photos/seed/${index + Date.now()}/${width}/${height}`,
                isLoading: false,
                error: undefined,
                titleStyle: { ...globalTitleStyle },
                bodyStyle: { ...globalBodyStyle },
                layoutStyle: { ...globalLayoutStyle },
                cta: { ...DEFAULT_CTA_STATE, enabled: isLastSlide, text: isLastSlide ? "Learn More" : DEFAULT_CTA_STATE.text },
            };
        });

        setSlides(testSlides);
        setError(null);
        setCurrentIndex(0);
    }, [aspectRatio, globalTitleStyle, globalBodyStyle, globalLayoutStyle]);

    const handleRegenerateImage = useCallback(async (slideId: string) => {
        const slideIndex = slides.findIndex(s => s.id === slideId);
        if (slideIndex === -1) return;

        const originalSlide = slides[slideIndex];
        setSlides(currentSlides => currentSlides.map(s => s.id === slideId ? { ...s, isLoading: true, error: undefined } : s));

        try {
            const imageData = await generateImage(originalSlide.prompt, aspectRatio);
            setSlides(currentSlides => currentSlides.map(s => s.id === slideId ? { ...s, src: imageData, isLoading: false } : s));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setSlides(currentSlides => currentSlides.map(s => s.id === slideId ? { ...s, isLoading: false, error: errorMessage } : s));
        }
    }, [slides, aspectRatio]);

    const handleOpenPexelsSearchModal = useCallback((slide: Slide) => {
        if (!pexelsApiKey.trim()) {
            setError("Pexels API key is required to search for images. Please add it in the input field above."); // Updated error message
            return;
        }
        setPexelsSearchModalSlide(slide);
    }, [pexelsApiKey]);

    const handlePexelsImageSelect = useCallback((slideId: string, imageUrl: string) => {
        setSlides(currentSlides => currentSlides.map(s => s.id === slideId ? { ...s, src: imageUrl, isLoading: false, error: undefined } : s));
        setPexelsSearchModalSlide(null); // Close modal
    }, []);

    const handleStartOver = useCallback(() => {
        if (window.confirm("Are you sure? This will clear your current workspace.")) {
            setSlides([]);
            setError(null);
            setCurrentIndex(0);
            resetToDefaultStyles();
            setLogo(null);
            // Clear Prompt Inputs too for a fresh start
            setImagePrompt(defaultImagePrompt);
            setContentPrompt(defaultContentPrompt);
            setCarouselName('My-AI-Carousel');
            localStorage.removeItem('acc_session_v1'); // Clear storage
        }
    }, [resetToDefaultStyles]);

    // --- Canvas Drawing Logic ---
    const parseStyledText = useCallback((text: string) => {
        if (!text) return [];
        // Split by asterisk pairs, keeping the delimiters, but also splitting by newlines
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
    }, []);

    const getWrappedStyledTextMetrics = useCallback((ctx: CanvasRenderingContext2D, parsedText: ReturnType<typeof parseStyledText>, style: StyleState, maxWidth: number) => {
        const lineHeight = style.fontSize * 1.4;
        const lines: { text: string; isHighlighted: boolean }[][] = [];
        let currentLine: { text: string; isHighlighted: boolean }[] = [];
        let currentLineWidth = 0;

        for (const part of parsedText) {
            if (part.isNewline) {
                if (currentLine.length > 0) lines.push(currentLine);
                lines.push([]); // Represents an empty line for paragraph breaks
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
    }, []);

    const drawStyledTextLines = useCallback((ctx: CanvasRenderingContext2D, lines: { text: string; isHighlighted: boolean }[][], x: number, y: number, style: StyleState) => {
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
    }, []);

    const generateSlideCanvas = useCallback(async (slide: Slide): Promise<HTMLCanvasElement | null> => {
        if (!slide.src) return null;
        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        const outputSize = 1080;
        canvas.width = outputSize;
        canvas.height = aspectRatio === '1:1' ? outputSize : Math.round(outputSize * (4 / 3));

        const previewWidth = previewContainerRef.current?.getBoundingClientRect().width ?? outputSize / 2;
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

        const bgImage = new Image(); bgImage.crossOrigin = 'anonymous'; bgImage.src = slide.src;
        const logoImage = new Image(); if (logo) { logoImage.crossOrigin = 'anonymous'; logoImage.src = logo; }

        await Promise.all([new Promise(res => { bgImage.onload = res; bgImage.onerror = () => res(null); }), logo ? new Promise(res => { logoImage.onload = res; logoImage.onerror = () => res(null); }) : Promise.resolve()]).catch(e => console.error("Error loading images for canvas:", e));

        // Draw Background & Overlay
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
        if (imageOverlayStyle.enabled && imageOverlayStyle.opacity > 0) {
            ctx.fillStyle = imageOverlayStyle.color; ctx.globalAlpha = imageOverlayStyle.opacity;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1.0;
        }

        // Draw Logo
        const logoPadding = outputSize * 0.04; let reservedLogoHeight = 0;
        if (logo && logoImage.complete && logoImage.naturalWidth > 0) {
            const actualLogoWidth = outputSize * (logoSize / 100);
            const logoAspectRatio = logoImage.width / logoImage.height;
            const actualLogoHeight = actualLogoWidth / logoAspectRatio;
            ctx.drawImage(logoImage, logoPadding, logoPadding, actualLogoWidth, actualLogoHeight);
            reservedLogoHeight = logoPadding + actualLogoHeight;
        }

        // Calculate Text Metrics and Position
        const padding = outputSize * 0.07; const contentWidth = outputSize - (padding * 2);

        ctx.font = `bold ${scaledTitleStyle.fontSize}px ${scaledTitleStyle.fontFamily}`;
        const parsedTitle = parseStyledText(slide.title);
        const titleMetrics = getWrappedStyledTextMetrics(ctx, parsedTitle, scaledTitleStyle, contentWidth);

        ctx.font = `normal ${scaledBodyStyle.fontSize}px ${scaledBodyStyle.fontFamily}`;
        const parsedBody = parseStyledText(slide.body);
        const bodyMetrics = getWrappedStyledTextMetrics(ctx, parsedBody, scaledBodyStyle, contentWidth);

        let ctaBlockHeight = 0, ctaBlockWidth = 0;
        let ctaTextMetrics: { lines: { text: string; isHighlighted: boolean }[][]; height: number } = { lines: [], height: 0 };
        if (slide.cta.enabled && slide.cta.text) {
            ctx.font = `bold ${scaledCtaStyle.fontSize}px ${scaledCtaStyle.fontFamily}`;
            const parsedCta = parseStyledText(slide.cta.text); // Note: CTA doesn't have highlight color, but parsing is harmless.
            ctaTextMetrics = getWrappedStyledTextMetrics(ctx, parsedCta, scaledCtaStyle, contentWidth - scaledCtaBg.paddingX * 2);
            ctaBlockHeight = ctaTextMetrics.height + scaledCtaBg.paddingY * 2;
            const ctaTextWidth = Math.max(...ctaTextMetrics.lines.map(line => ctx.measureText(line.map(p => p.text).join('')).width));
            ctaBlockWidth = ctaTextWidth + scaledCtaBg.paddingX * 2;
        }

        let totalTextHeight = titleMetrics.height + scaledSpacing + bodyMetrics.height;
        if (slide.cta.enabled && slide.cta.text) totalTextHeight += ctaMarginTop + ctaBlockHeight;

        let startY;
        if (slide.layoutStyle.verticalAlign === 'top') { startY = reservedLogoHeight > 0 ? reservedLogoHeight + padding : padding; }
        else if (slide.layoutStyle.verticalAlign === 'center') { startY = (canvas.height - totalTextHeight) / 2; if (startY < reservedLogoHeight + padding) startY = reservedLogoHeight + padding; }
        else { startY = canvas.height - padding - totalTextHeight; }

        const applyShadow = (shadow: ShadowState) => {
            if (shadow.enabled) { ctx.shadowColor = shadow.color; ctx.shadowBlur = shadow.blur; ctx.shadowOffsetX = shadow.offsetX; ctx.shadowOffsetY = shadow.offsetY; }
            else { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
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
            ctx.beginPath(); ctx.roundRect(ctaBlockX, ctaBlockY, ctaBlockWidth, ctaBlockHeight, scaledCtaBg.borderRadius); ctx.fill();

            ctx.font = `bold ${scaledCtaStyle.fontSize}px ${scaledCtaStyle.fontFamily}`;
            drawStyledTextLines(ctx, ctaTextMetrics.lines, ctaBlockX + scaledCtaBg.paddingX, ctaBlockY + scaledCtaBg.paddingY, scaledCtaStyle);
        }

        applyShadow({ enabled: false, color: '', blur: 0, offsetX: 0, offsetY: 0 });
        return canvas;
    }, [logo, logoSize, imageOverlayStyle, aspectRatio, parseStyledText, getWrappedStyledTextMetrics, drawStyledTextLines]);


    const handleDownloadSlide = useCallback(async (slide: Slide) => {
        const canvas = await generateSlideCanvas(slide);
        if (canvas) {
            const safeName = carouselName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const slideNumber = slides.findIndex(s => s.id === slide.id) + 1;
            const link = document.createElement('a');
            link.download = `${safeName}_slide_${slideNumber}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    }, [slides, carouselName, generateSlideCanvas]);

    const handleDownloadAllSlides = useCallback(async () => {
        if (slides.length === 0) return;

        showToast(`Starting download... preparing ${slides.length} slides.`);
        // @ts-ignore
        const zip = new JSZip();
        const safeName = carouselName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'carousel';

        for (let i = 0; i < slides.length; i++) {
            const slide = slides[i];
            const canvas = await generateSlideCanvas(slide);
            if (canvas) {
                const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                if (blob) {
                    zip.file(`${safeName}_slide_${i + 1}.png`, blob);
                }
            }
        }

        zip.generateAsync({ type: "blob" }).then(function (content: Blob) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${safeName}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            showToast('Carousel downloaded successfully!');
        });

    }, [slides, carouselName, generateSlideCanvas, showToast]);

    return (
        <div className="w-full h-screen bg-gray-900 text-white flex items-center justify-center">
            {toast.visible && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-down">
                    {toast.message}
                </div>
            )}
            {pexelsSearchModalSlide && (
                <PexelsSearchModal
                    slide={pexelsSearchModalSlide}
                    aspectRatio={aspectRatio}
                    pexelsApiKey={pexelsApiKey}
                    onImageSelect={handlePexelsImageSelect}
                    onClose={() => setPexelsSearchModalSlide(null)}
                />
            )}
            <main className="w-full max-w-7xl h-full md:h-[95vh] md:max-h-[900px] bg-black md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                <header className="p-4 border-b border-gray-800 flex-shrink-0"><h1 className="text-xl font-bold text-center">AI Carousel Creator</h1></header>
                <div className="flex-grow w-full flex flex-col md:flex-row overflow-hidden">
                    <div ref={previewContainerRef} className="w-full md:w-[60%] p-4 md:p-6 flex-shrink-0 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-800">
                        <Carousel slides={slides} logo={logo} logoSize={logoSize} imageOverlay={imageOverlayStyle} aspectRatio={aspectRatio} currentIndex={currentIndex} onCurrentIndexChange={setCurrentIndex} />
                    </div>
                    <div className="w-full md:w-[40%] flex-grow flex flex-col overflow-y-auto">
                        <div className="p-4 md:p-6 flex-grow overflow-y-auto">
                            {slides.length === 0 ? (
                                <div className="space-y-4 flex flex-col h-full">
                                    <div>
                                        <label className="text-lg font-semibold text-gray-300 mb-2 block">
                                            Choose a Style Preset <span className="text-gray-500 text-sm">(Optional)</span>
                                        </label>
                                        {presets.length > 0 ? (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                                                <button onClick={resetToDefaultStyles} className={`p-2 text-sm rounded-md transition-colors border truncate ${activePresetId === null ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-blue-500'}`}>
                                                    Default Style
                                                </button>
                                                {presets.map(preset => (
                                                    <button key={preset.id} onClick={() => handleSelectPresetForGeneration(preset.id)} className={`p-2 text-sm rounded-md transition-colors border truncate ${activePresetId === preset.id ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-blue-500'}`}>
                                                        {preset.name}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 mb-4 bg-gray-900/50 p-3 rounded-md border border-gray-800">No presets saved yet. You can save your favorite styles in the editor after generating a carousel.</p>
                                        )}
                                    </div>
                                    {imageSource === 'ai' && ( // Conditionally render Image Style Prompt
                                        <div><label htmlFor="image-prompt" className="text-lg font-semibold text-gray-300 mb-2 block">Image Style Prompt</label><textarea id="image-prompt" value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} placeholder="Describe the visual style..." className="w-full h-32 bg-gray-900 border border-gray-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y" aria-label="Image Style Prompt" disabled={isLoading} /></div>
                                    )}
                                    <div><label htmlFor="content-prompt" className="text-lg font-semibold text-gray-300 mb-2 block">Slide Content</label><textarea id="content-prompt" value={contentPrompt} onChange={(e) => setContentPrompt(e.target.value)} placeholder="Describe the text and topics for each slide..." className="w-full h-40 bg-gray-900 border border-gray-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y" aria-label="Slide Content" disabled={isLoading} /></div>
                                    {error && <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm rounded-lg p-3 flex items-start gap-2"><Icon name="alert" className="text-xl flex-shrink-0 mt-0.5" /><span>{error}</span></div>}
                                    <div className="flex-grow"></div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-semibold text-gray-400 block">Image Source</label>
                                            <div className="flex bg-gray-800 border border-gray-700 rounded-md mt-1">
                                                {(['ai', 'pexels'] as const).map(source => (
                                                    <button
                                                        key={source}
                                                        onClick={() => setImageSource(source)}
                                                        className={`flex-1 p-2 text-sm rounded-md transition-colors ${imageSource === source ? 'bg-blue-600 text-white font-semibold' : 'text-gray-400 hover:bg-gray-700'}`}
                                                    >
                                                        {source === 'ai' ? 'AI Generation' : 'Pexels'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {imageSource === 'pexels' && (
                                            <div className="mt-4">
                                                <label htmlFor="pexels-key" className="text-lg font-semibold text-gray-300 mb-2 block">Pexels API Key</label>
                                                <div className="relative mt-1">
                                                    <input
                                                        id="pexels-key"
                                                        type={isPexelsKeyVisible ? 'text' : 'password'}
                                                        value={pexelsApiKey}
                                                        onChange={(e) => setPexelsApiKey(e.target.value)}
                                                        placeholder="Enter your Pexels API key"
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsPexelsKeyVisible(v => !v)}
                                                        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                                                        aria-label={isPexelsKeyVisible ? 'Hide API key' : 'Show API key'}
                                                    >
                                                        <Icon name={isPexelsKeyVisible ? 'eyeSlash' : 'eye'} />
                                                    </button>
                                                </div>
                                                {!pexelsApiKey.trim() && (
                                                    <p className="text-xs text-amber-400 mt-2">
                                                        Pexels API key is required when using Pexels as image source.
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Used for generating images from stock photos instead of the AI.
                                                </p>
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-sm font-semibold text-gray-400 block">Aspect Ratio</label>
                                            <div className="flex bg-gray-800 border border-gray-700 rounded-md mt-1">
                                                {(['1:1', '4:5'] as const).map(ratio => (
                                                    <button
                                                        key={ratio}
                                                        onClick={() => setAspectRatio(ratio)}
                                                        className={`flex-1 p-2 text-sm rounded-md transition-colors ${aspectRatio === ratio ? 'bg-blue-600 text-white font-semibold' : 'text-gray-400 hover:bg-gray-700'}`}
                                                    >
                                                        {ratio === '1:1' ? 'Square (1:1)' : 'Portrait (3:4)'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-5 gap-3">
                                            <button onClick={handleGenerateTest} disabled={isLoading} className="col-span-2 w-full px-4 py-3 bg-gray-700 text-white rounded-lg text-base font-semibold hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
                                                <Icon name="image" className="text-xl" />
                                                <span>Test</span>
                                            </button>
                                            <button
                                                onClick={handleGenerateCarousel}
                                                disabled={isLoading || !contentPrompt.trim() || (imageSource === 'ai' && !imagePrompt.trim()) || (imageSource === 'pexels' && !pexelsApiKey.trim())}
                                                className="col-span-3 w-full px-4 py-3 bg-blue-600 text-white rounded-lg text-base font-semibold hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
                                                {isLoading ? (<><Icon name="loader" className="text-xl animate-spin" /><span>Generating...</span></>) : (<><Icon name="star" className="text-xl" /><span>Generate</span></>)}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <TextEditorPanel
                                    slides={slides}
                                    currentIndex={currentIndex}
                                    onSlidesChange={handleSlidesUpdate}
                                    onStartOver={handleStartOver}
                                    onDownload={handleDownloadSlide}
                                    onDownloadAll={handleDownloadAllSlides}
                                    onRegenerateImage={handleRegenerateImage}
                                    onOpenPexelsSearch={handleOpenPexelsSearchModal}
                                    logo={logo} onLogoChange={handleLogoUpdate}
                                    logoSize={logoSize} onLogoSizeChange={handleLogoSizeUpdate}
                                    imageOverlay={imageOverlayStyle} onImageOverlayChange={handleImageOverlayUpdate}
                                    presets={presets} activePresetId={activePresetId}
                                    onSavePreset={handleSavePreset}
                                    onApplyPreset={handleApplyPreset}
                                    onDeletePreset={handleDeletePreset}
                                    onExportPreset={handleExportPreset}
                                    onImportPreset={handleImportPreset}
                                    imageSource={imageSource}
                                    aspectRatio={aspectRatio}
                                    carouselName={carouselName}
                                    onCarouselNameChange={setCarouselName}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
