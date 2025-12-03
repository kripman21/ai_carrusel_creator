
import React, { useState, useCallback, useLayoutEffect, useRef, useEffect } from 'react';
import { generateCarousel, generateImage, fetchPexelsImages, imageUrlToBase64 } from './services/geminiService';
import type { Slide, StyleState, LayoutState, TextAlign, VerticalAlign, ShadowState, CtaState, StylePreset, SlideSpecificStyles } from './types';

// --- Icon Component ---
const Icon: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
  const iconMap: { [key: string]: string } = {
    chevronLeft: 'bi-chevron-left',
    chevronRight: 'bi-chevron-right',
    loader: 'bi-arrow-clockwise',
    image: 'bi-image',
    star: 'bi-star-fill',
    alert: 'bi-exclamation-triangle-fill',
    undo: 'bi-arrow-counterclockwise',
    download: 'bi-download',
    alignLeft: 'bi-text-left',
    alignCenter: 'bi-text-center',
    alignRight: 'bi-text-right',
    alignTop: 'bi-align-top',
    alignMiddle: 'bi-align-middle',
    alignBottom: 'bi-align-bottom',
    upload: 'bi-upload',
    trash: 'bi-trash3',
    settings: 'bi-gear',
    refresh: 'bi-arrow-repeat',
    highlight: 'bi-highlighter',
    save: 'bi-bookmark',
    code: 'bi-code',
    copy: 'bi-clipboard',
    check: 'bi-check-lg',
    eye: 'bi-eye-fill',
    eyeSlash: 'bi-eye-slash-fill',
    search: 'bi-search',
    downloadMultiple: 'bi-file-earmark-zip',
  };

  const bootstrapClass = iconMap[name] || 'bi-question-circle'; // Fallback icon

  // The `aria-hidden` is important for accessibility, as these are decorative.
  // The parent button should have an `aria-label`.
  return <i aria-hidden="true" className={`bi ${bootstrapClass} ${className || ''}`}></i>;
};


// --- Carousel Component ---
const Carousel: React.FC<{ 
    slides: Slide[], 
    logo: string | null,
    logoSize: number,
    imageOverlay: { enabled: boolean; color: string; opacity: number; },
    aspectRatio: '1:1' | '4:5',
    currentIndex: number;
    onCurrentIndexChange: (index: number) => void;
}> = ({ slides, logo, logoSize, imageOverlay, aspectRatio, currentIndex, onCurrentIndexChange }) => {

    const prevSlide = () => onCurrentIndexChange((prev: number) => (prev === 0 ? slides.length - 1 : prev - 1));
    const nextSlide = () => onCurrentIndexChange((prev: number) => (prev === slides.length - 1 ? 0 : prev + 1));

    const renderHighlightedText = (text: string, highlightColor: string) => {
        if (!text) return '';
        // Split by the asterisk delimiter
        return text.split('*').map((part, index) => {
            if (index % 2 === 1) { // Odd parts are highlighted
                return <span key={index} style={{ color: highlightColor }}>{part}</span>;
            }
            return part; // Even parts are normal text
        });
    };

    if (slides.length === 0) {
        return (
            <div className={`w-full bg-gray-800/50 rounded-2xl flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-600 p-4 text-center ${aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[3/4]'}`}>
                <Icon name="image" className="text-7xl mb-4" />
                <h3 className="text-xl font-semibold">Your carousel will appear here</h3>
                <p className="text-sm">Describe your carousel and click generate.</p>
            </div>
        );
    }
    
    const verticalAlignClass = { top: 'justify-start', center: 'justify-center', bottom: 'justify-end' };
    const textAlignToFlex = { left: 'items-start', center: 'items-center', right: 'items-end' };
    const ctaAlignToFlex = { left: 'justify-start', center: 'justify-center', right: 'justify-end' };
    const currentSlide = slides[currentIndex];
    const { titleStyle, bodyStyle, layoutStyle, cta } = currentSlide;
    const logoPaddingTop = 4; // %
    const logoActualHeight = logoSize * 0.5 + logoPaddingTop; // A rough approximation for padding calculation
    const getShadowStyle = (shadow: ShadowState) => shadow.enabled ? `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color}` : 'none';
    
    return (
        <div className={`w-full relative overflow-hidden rounded-2xl bg-gray-800 ${aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[3/4]'}`}>
            <div className="flex transition-transform duration-500 ease-in-out h-full" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                {slides.map((slide) => (
                    <div key={slide.id} className="w-full h-full flex-shrink-0 relative">
                        {slide.src && <img src={slide.src} alt={slide.prompt} className="w-full h-full object-cover" />}
                        {slide.isLoading && (
                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
                                <Icon name="loader" className="text-5xl animate-spin text-white mb-2" />
                                <span className="text-white text-sm">Regenerating...</span>
                            </div>
                        )}
                        {imageOverlay.enabled && <div className="absolute inset-0" style={{backgroundColor: imageOverlay.color, opacity: imageOverlay.opacity}}></div>}
                        {logo && <img src={logo} alt="Logo" className="absolute top-4 left-4 h-auto pointer-events-none" style={{width: `${logoSize}%`}}/>}
                        <div 
                            className={`absolute inset-0 p-6 md:p-8 flex flex-col ${verticalAlignClass[slide.layoutStyle.verticalAlign]} ${textAlignToFlex[slide.titleStyle.textAlign]} pointer-events-none`}
                            style={{ paddingTop: (logo && slide.layoutStyle.verticalAlign === 'top') ? `${logoActualHeight}%` : undefined }}
                        >
                            <div className="relative w-full" style={{zIndex: 1}}>
                                <h2 className="font-bold leading-tight" style={{ color: slide.titleStyle.color, fontSize: `${slide.titleStyle.fontSize}px`, fontFamily: slide.titleStyle.fontFamily, textAlign: slide.titleStyle.textAlign, marginBottom: `${slide.layoutStyle.spacing}px`, textShadow: getShadowStyle(slide.titleStyle.shadow) }}>
                                    {renderHighlightedText(slide.title, slide.titleStyle.highlightColor)}
                                </h2>
                                <p style={{ color: slide.bodyStyle.color, fontSize: `${slide.bodyStyle.fontSize}px`, fontFamily: slide.bodyStyle.fontFamily, textAlign: slide.bodyStyle.textAlign, whiteSpace: 'pre-wrap', textShadow: getShadowStyle(slide.bodyStyle.shadow) }}>
                                    {renderHighlightedText(slide.body, slide.bodyStyle.highlightColor)}
                                </p>
                                {slide.cta.enabled && slide.cta.text && (
                                     <div className={`mt-4 w-full flex ${ctaAlignToFlex[slide.cta.style.textAlign]}`}>
                                        <span className="font-semibold" style={{
                                            display: 'inline-block',
                                            backgroundColor: slide.cta.background.color,
                                            borderRadius: `${slide.cta.background.borderRadius}px`,
                                            padding: `${slide.cta.background.paddingY}px ${slide.cta.background.paddingX}px`,
                                            color: slide.cta.style.color,
                                            fontSize: `${slide.cta.style.fontSize}px`,
                                            fontFamily: slide.cta.style.fontFamily,
                                        }}>
                                            {slide.cta.text}
                                        </span>
                                     </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {slides.length > 1 && (
                <>
                    <button onClick={prevSlide} aria-label="Previous slide" className="absolute top-1/2 left-2 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 z-10">
                        <Icon name="chevronLeft" className="text-2xl" />
                    </button>
                    <button onClick={nextSlide} aria-label="Next slide" className="absolute top-1/2 right-2 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 z-10">
                        <Icon name="chevronRight" className="text-2xl" />
                    </button>
                </>
            )}
             <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full z-10">
                {currentIndex + 1} / {slides.length}
            </div>
        </div>
    );
};

// --- Style Editor Component ---
const StyleEditor: React.FC<{
    titleStyle: StyleState; onTitleStyleChange: (prop: keyof StyleState, value: any) => void;
    bodyStyle: StyleState; onBodyStyleChange: (prop: keyof StyleState, value: any) => void;
    layoutStyle: LayoutState; onLayoutStyleChange: (prop: keyof LayoutState, value: any) => void;
    onApplyStylesToAll: () => void;
}> = ({ titleStyle, onTitleStyleChange, bodyStyle, onBodyStyleChange, layoutStyle, onLayoutStyleChange, onApplyStylesToAll }) => {
    const googleFonts = [
        'Roboto, sans-serif', 'Open Sans, sans-serif', 'Lato, sans-serif', 'Montserrat, sans-serif', 'Oswald, sans-serif',
        'Source Sans Pro, sans-serif', 'Raleway, sans-serif', 'Poppins, sans-serif', 'Nunito, sans-serif', 'Merriweather, serif',
        'Playfair Display, serif', 'Lora, serif', 'Inter, sans-serif', 'Work Sans, sans-serif', 'Fira Sans, sans-serif',
        'Ubuntu, sans-serif', 'PT Serif, serif', 'Crimson Text, serif', 'Karla, sans-serif', 'Arvo, serif',
        'Josefin Sans, sans-serif', 'Libre Baskerville, serif', 'Cormorant Garamond, serif', 'Pacifico, cursive', 'Caveat, cursive',
        'Lobster, cursive', 'Anton, sans-serif', 'Bebas Neue, sans-serif', 'Dancing Script, cursive', 'Shadows Into Light, cursive'
    ];
    
    return (
        <div className="mt-2 p-3 bg-gray-800/50 rounded-xl border border-gray-700">
             <div className="space-y-4">
                {/* Layout Controls */}
                <details className="p-3 bg-gray-900/50 rounded-lg group" open>
                    <summary className="font-semibold text-gray-400 text-sm cursor-pointer list-none group-open:mb-3">Layout</summary>
                    <div><label className="text-xs text-gray-400">Vertical Alignment</label>
                        <div className="flex bg-gray-800 border border-gray-700 rounded-md mt-1">
                             {(['top', 'center', 'bottom'] as VerticalAlign[]).map(align => (
                                <button key={align} onClick={() => onLayoutStyleChange('verticalAlign', align)} className={`flex-1 p-1.5 rounded-md transition-colors ${layoutStyle.verticalAlign === align ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`} aria-label={`Vertical align ${align}`}>
                                    <Icon name={`align${align.charAt(0).toUpperCase() + align.slice(1)}` as any} className="text-xl" />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div><label htmlFor="spacing" className="text-xs text-gray-400">Title/Body Spacing: {layoutStyle.spacing}px</label>
                        <input type="range" id="spacing" min="0" max="100" value={layoutStyle.spacing} onChange={(e) => onLayoutStyleChange('spacing', parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-1" />
                    </div>
                </details>
                {/* Text Styles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[['Title', titleStyle, onTitleStyleChange], ['Body', bodyStyle, onBodyStyleChange]].map(([title, style, onChange]) => {
                        const handleShadowChange = (prop: keyof ShadowState, value: any) => {
                            const newShadow = { ...(style as StyleState).shadow, [prop]: value };
                            (onChange as any)('shadow', newShadow);
                        };
                        return (
                         <div key={title as string} className="space-y-3 p-3 bg-gray-900/50 rounded-lg">
                            <h4 className="font-semibold text-gray-400 text-sm">{title as string}</h4>
                            <div className="grid grid-cols-2 gap-2">
                                 <div className="flex items-center bg-gray-800 border border-gray-700 rounded-md">
                                    <input type="color" value={(style as StyleState).color} onChange={(e) => (onChange as any)('color', e.target.value)} className="w-10 h-9 p-1 bg-transparent border-none cursor-pointer appearance-none" aria-label={`${title} color picker`} />
                                    <input type="text" value={(style as StyleState).color} onChange={(e) => (onChange as any)('color', e.target.value)} className="w-full bg-transparent text-sm focus:outline-none pr-2" aria-label={`${title} color hex code`} maxLength={7} />
                                </div>
                                <div className="flex items-center bg-gray-800 border border-gray-700 rounded-md px-2"><input type="number" value={(style as StyleState).fontSize} onChange={(e) => (onChange as any)('fontSize', parseInt(e.target.value, 10))} className="w-full bg-transparent text-sm focus:outline-none" aria-label={`${title} font size`} /><span className="text-xs text-gray-500">px</span></div>
                            </div>
                            <div className="flex bg-gray-800 border border-gray-700 rounded-md">
                                {(['left', 'center', 'right'] as TextAlign[]).map(align => (
                                    <button key={align} onClick={() => (onChange as any)('textAlign', align)} className={`flex-1 p-1.5 rounded-md transition-colors ${(style as StyleState).textAlign === align ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`} aria-label={`${title} align ${align}`}><Icon name={`align${align.charAt(0).toUpperCase() + align.slice(1)}` as any} className="text-xl" /></button>
                                ))}
                            </div>
                            <select value={(style as StyleState).fontFamily} onChange={(e) => (onChange as any)('fontFamily', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" aria-label={`${title} font family`}>
                                {googleFonts.map(font => <option key={font} value={font}>{font.split(',')[0]}</option>)}
                            </select>
                             <div className="flex items-center justify-between pt-2 border-t border-gray-800/50">
                                <label htmlFor={`highlight-color-hex-${title}`} className="text-xs text-gray-400">Highlight Color</label>
                                 <div className="flex items-center bg-gray-700 border border-gray-600 rounded-md w-1/2">
                                     <input type="color" id={`highlight-color-picker-${title}`} value={(style as StyleState).highlightColor} onChange={(e) => (onChange as any)('highlightColor', e.target.value)} className="w-8 h-7 p-1 bg-transparent border-none cursor-pointer appearance-none" aria-label={`${title} highlight color picker`}/>
                                     <input type="text" id={`highlight-color-hex-${title}`} value={(style as StyleState).highlightColor} onChange={(e) => (onChange as any)('highlightColor', e.target.value)} className="w-full bg-transparent text-xs focus:outline-none pr-2" maxLength={7} aria-label={`${title} highlight color hex code`}/>
                                </div>
                            </div>
                             <details className="p-2 bg-gray-800 rounded-md group text-xs">
                                <summary className="font-semibold text-gray-500 cursor-pointer list-none group-open:mb-2">Shadow</summary>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-gray-400"><label htmlFor={`shadow-enabled-${title}`}>Enable</label><input type="checkbox" id={`shadow-enabled-${title}`} checked={(style as StyleState).shadow.enabled} onChange={(e) => handleShadowChange('enabled', e.target.checked)} className="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"/></div>
                                    {(style as StyleState).shadow.enabled && (<>
                                        <div className="flex items-center justify-between">
                                            <label className="text-gray-400">Color</label>
                                            <div className="flex items-center bg-gray-700 border border-gray-600 rounded-md w-1/2">
                                                <input type="color" value={(style as StyleState).shadow.color} onChange={(e) => handleShadowChange('color', e.target.value)} className="w-8 h-7 p-1 bg-transparent border-none cursor-pointer appearance-none" aria-label={`${title} shadow color picker`} />
                                                <input type="text" value={(style as StyleState).shadow.color} onChange={(e) => handleShadowChange('color', e.target.value)} className="w-full bg-transparent text-xs focus:outline-none pr-2" maxLength={7} aria-label={`${title} shadow color hex code`}/>
                                            </div>
                                        </div>
                                        <div><label className="text-gray-400">Blur: {(style as StyleState).shadow.blur}px</label><input type="range" min="0" max="20" value={(style as StyleState).shadow.blur} onChange={(e) => handleShadowChange('blur', parseInt(e.target.value, 10))} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer mt-1" /></div>
                                        <div><label className="text-gray-400">Offset X: {(style as StyleState).shadow.offsetX}px</label><input type="range" min="-10" max="10" value={(style as StyleState).shadow.offsetX} onChange={(e) => handleShadowChange('offsetX', parseInt(e.target.value, 10))} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer mt-1" /></div>
                                        <div><label className="text-gray-400">Offset Y: {(style as StyleState).shadow.offsetY}px</label><input type="range" min="-10" max="10" value={(style as StyleState).shadow.offsetY} onChange={(e) => handleShadowChange('offsetY', parseInt(e.target.value, 10))} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer mt-1" /></div>
                                    </>)}
                                </div>
                            </details>
                        </div>
                    )})}
                </div>
            </div>
            <button 
                onClick={onApplyStylesToAll} 
                className="w-full mt-4 px-3 py-2 bg-blue-600/80 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 flex items-center justify-center gap-2 transition-colors">
                <Icon name="star" className="text-base" />
                Apply Styles to All Slides
            </button>
        </div>
    );
};

// --- Helper: JSON Viewer Modal ---
const JsonViewerModal: React.FC<{ preset: StylePreset; onClose: () => void; }> = ({ preset, onClose }) => {
    const [copyButtonText, setCopyButtonText] = useState('Copy');
    const jsonString = JSON.stringify(preset, null, 2);

    const handleCopy = () => {
        navigator.clipboard.writeText(jsonString).then(() => {
            setCopyButtonText('Copied!');
            setTimeout(() => setCopyButtonText('Copy'), 2000);
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-lg w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-gray-200">Preset JSON: {preset.name}</h3>
                    <button onClick={handleCopy} className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors ${copyButtonText === 'Copied!' ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        <Icon name={copyButtonText === 'Copied!' ? 'check' : 'copy'} className="text-base" /> {copyButtonText}
                    </button>
                </div>
                <pre className="p-4 overflow-y-auto text-xs text-gray-300 bg-gray-950 flex-grow rounded-b-xl">
                    <code>{jsonString}</code>
                </pre>
            </div>
        </div>
    );
};

// --- Pexels Image Search Modal Component ---
interface PexelsSearchModalProps {
    slide: Slide;
    aspectRatio: '1:1' | '4:5';
    pexelsApiKey: string;
    onImageSelect: (slideId: string, base64Image: string) => void;
    onClose: () => void;
}

const PexelsSearchModal: React.FC<PexelsSearchModalProps> = ({ slide, aspectRatio, pexelsApiKey, onImageSelect, onClose }) => {
    const [searchTerm, setSearchTerm] = useState(slide.prompt.split(/[,.]/)[0].trim());
    const [results, setResults] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

    const handleSearch = useCallback(async () => {
        if (!searchTerm.trim()) {
            setError("Please enter a search term.");
            setResults([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        setSelectedImageUrl(null);
        try {
            const images = await fetchPexelsImages(searchTerm, aspectRatio, pexelsApiKey, 30); // Fetch more images
            setResults(images);
            if (images.length === 0) {
                setError(`No images found on Pexels for "${searchTerm}".`);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred during search.");
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, aspectRatio, pexelsApiKey]);

    // Initial search when modal opens
    useEffect(() => {
        handleSearch();
    }, [handleSearch]);

    const handleSelectAndConvert = async () => {
        if (selectedImageUrl) {
            setIsLoading(true); // Re-use loading state for conversion
            try {
                const base64 = await imageUrlToBase64(selectedImageUrl);
                onImageSelect(slide.id, base64);
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to convert image.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-gray-200">Search Pexels for Image (Slide {slide.id.split('-').pop()})</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><Icon name="trash" className="text-xl"/></button>
                </div>
                <div className="p-4 flex flex-col gap-4 overflow-hidden flex-grow">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Enter search term for image..."
                            className="flex-grow bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            disabled={isLoading}
                        />
                        <button onClick={handleSearch} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed" disabled={isLoading}>
                            {isLoading && <Icon name="loader" className="animate-spin" />} Search
                        </button>
                    </div>
                    {error && <div className="bg-red-900/30 border border-red-700/50 text-red-300 text-xs rounded-lg p-2 flex items-start gap-2"><Icon name="alert" className="text-base flex-shrink-0 mt-0.5" /><span>{error}</span></div>}
                    <div className="grid grid-cols-3 gap-3 overflow-y-auto flex-grow">
                        {isLoading && results.length === 0 ? (
                            <div className="col-span-3 flex justify-center items-center h-full"><Icon name="loader" className="text-4xl animate-spin text-gray-500" /></div>
                        ) : (
                            results.map((imageUrl, index) => (
                                <div
                                    key={index}
                                    className={`relative w-full aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${selectedImageUrl === imageUrl ? 'border-blue-500 ring-2 ring-blue-500' : 'border-transparent hover:border-gray-500'}`}
                                    onClick={() => setSelectedImageUrl(imageUrl)}
                                >
                                    <img src={imageUrl} alt={`Pexels result ${index}`} className="w-full h-full object-cover" />
                                    {selectedImageUrl === imageUrl && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-blue-500/50 text-white">
                                            <Icon name="check" className="text-3xl" />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSelectAndConvert} disabled={!selectedImageUrl || isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed">
                        Select Image
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Text Editor Panel Component ---
const TextEditorPanel: React.FC<{
    slides: Slide[];
    currentIndex: number;
    onSlidesChange: (slides: Slide[]) => void;
    onStartOver: () => void;
    onDownload: (slide: Slide) => void;
    onDownloadAll: () => void;
    onRegenerateImage: (slideId: string) => void;
    onOpenPexelsSearch: (slide: Slide) => void;
    logo: string | null; onLogoChange: (logo: string | null) => void;
    logoSize: number; onLogoSizeChange: (size: number) => void;
    imageOverlay: { enabled: boolean; color: string; opacity: number; };
    onImageOverlayChange: (prop: string, value: any) => void;
    presets: StylePreset[];
    activePresetId: string | null;
    onSavePreset: (name: string) => void;
    onApplyPreset: (id: string) => void;
    onDeletePreset: (id: string) => void;
    onExportPreset: (id: string) => void; // New prop
    onImportPreset: (file: File) => void; // New prop
    imageSource: 'ai' | 'pexels';
    aspectRatio: '1:1' | '4:5';
    carouselName: string;
    onCarouselNameChange: (name: string) => void;
}> = (props) => {
    const { slides, currentIndex, onSlidesChange, onStartOver, onDownload, onDownloadAll, onRegenerateImage, onOpenPexelsSearch, logo, onLogoChange, logoSize, onLogoSizeChange, imageOverlay, onImageOverlayChange, presets, activePresetId, onSavePreset, onApplyPreset, onDeletePreset, onExportPreset, onImportPreset, imageSource, aspectRatio, carouselName, onCarouselNameChange } = props;
    const [expandedSlideId, setExpandedSlideId] = useState<string | null>(null);
    const [selection, setSelection] = useState<{ slideId: string, field: 'title' | 'body', start: number, end: number} | null>(null);
    const [isPresetsOpen, setIsPresetsOpen] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [jsonViewerPreset, setJsonViewerPreset] = useState<StylePreset | null>(null);
    const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
    const logoInputRef = React.useRef<HTMLInputElement>(null);
    const presetsRef = React.useRef<HTMLDivElement>(null);
    const downloadMenuRef = React.useRef<HTMLDivElement>(null);
    const importPresetInputRef = React.useRef<HTMLInputElement>(null);
    const googleFonts = ['Roboto, sans-serif', 'Open Sans, sans-serif', 'Lato, sans-serif', 'Montserrat, sans-serif', 'Oswald, sans-serif', 'Poppins, sans-serif', 'Playfair Display, serif'];
    const activePreset = presets.find(p => p.id === activePresetId);
    const [activeTab, setActiveTab] = useState<'slides' | 'global'>('slides');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (presetsRef.current && !presetsRef.current.contains(event.target as Node)) {
                setIsPresetsOpen(false);
            }
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
                setIsDownloadMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSaveClick = () => {
        if (!newPresetName.trim() || slides.length === 0) return;
        onSavePreset(newPresetName.trim());
        setNewPresetName('');
        setIsPresetsOpen(false);
    };
    
    const handleImportClick = () => {
        importPresetInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImportPreset(file);
            if (importPresetInputRef.current) {
                importPresetInputRef.current.value = ''; // Reset input
            }
        }
    };

    const handleSlideUpdate = (index: number, field: keyof Slide, value: any) => {
        const newSlides = [...slides];
        newSlides[index] = { ...newSlides[index], [field]: value };
        onSlidesChange(newSlides);
    };

    const handleStyleChange = (index: number, styleType: 'titleStyle' | 'bodyStyle' | 'layoutStyle' | 'cta', prop: string, value: any) => {
        const newSlides = [...slides];
        const slide = newSlides[index];
        let newPropValue;
        if (styleType === 'cta') {
            const cta = slide.cta;
            let newCtaValue;
            if (prop === 'backgroundColor') {
                newCtaValue = { ...cta, background: { ...cta.background, color: value }};
            } else if (prop in cta.style) {
                 newCtaValue = { ...cta, style: { ...cta.style, [prop]: value }};
            } else if (prop in cta.background) {
                 newCtaValue = { ...cta, background: { ...cta.background, [prop]: value }};
            } else {
                 newCtaValue = { ...cta, [prop]: value };
            }
            newPropValue = newCtaValue;
        } else {
            newPropValue = { ...slide[styleType], [prop]: value };
        }
        newSlides[index] = { ...slide, [styleType]: newPropValue };
        onSlidesChange(newSlides);
    };

    const handleApplyStylesToAll = (sourceIndex: number) => {
        const sourceSlide = slides[sourceIndex];
        if (!sourceSlide) return;
        const { titleStyle, bodyStyle, layoutStyle, cta } = sourceSlide;
        const newSlides = slides.map(slide => ({
            ...slide,
            titleStyle,
            bodyStyle,
            layoutStyle,
            cta: {
                ...slide.cta,
                style: cta.style,
                background: cta.background
            }
        }));
        onSlidesChange(newSlides);
    };
    
    const handleApplyHighlight = (slideId: string, field: 'title' | 'body') => {
        if (!selection || selection.slideId !== slideId || selection.field !== field || selection.start === selection.end) return;
        const slideIndex = slides.findIndex(s => s.id === slideId);
        if (slideIndex === -1) return;
        const originalText = slides[slideIndex][field];
        const { start, end } = selection;
        let newText;
        const isAlreadyWrapped = originalText.charAt(start - 1) === '*' && originalText.charAt(end) === '*';
        
        if (isAlreadyWrapped) {
            newText = originalText.substring(0, start - 1) + originalText.substring(start, end) + originalText.substring(end + 1);
        } else {
            newText = originalText.substring(0, start) + `*${originalText.substring(start, end)}*` + originalText.substring(end);
        }
        handleSlideUpdate(slideIndex, field, newText);
        setSelection(null); // Reset selection
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => { onLogoChange(event.target?.result as string); };
            reader.readAsDataURL(file);
        }
    };

    const handleDownloadCurrent = () => {
        if (slides[currentIndex]) {
            onDownload(slides[currentIndex]);
        }
        setIsDownloadMenuOpen(false);
    };

    const handleDownloadAll = () => {
        onDownloadAll();
        setIsDownloadMenuOpen(false);
    };

    return (
        <div className="w-full h-full flex flex-col">
             <div className="flex-shrink-0 mb-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-200">Edit Carousel</h2>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button onClick={() => setIsPresetsOpen(p => !p)} className="px-3 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 flex items-center gap-2 transition-colors">
                            <Icon name="save" className="text-base" />
                            <span className="truncate max-w-28">{activePreset ? `Preset: ${activePreset.name}` : 'Presets'}</span>
                        </button>
                        {isPresetsOpen && (
                            <div ref={presetsRef} className="absolute top-full left-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-lg z-20 p-4 animate-fade-in-down">
                                <h3 className="font-semibold text-gray-300 text-base mb-3">Save Current Style</h3>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newPresetName}
                                        onChange={(e) => setNewPresetName(e.target.value)}
                                        placeholder="Enter preset name..."
                                        className="flex-grow bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <button onClick={handleSaveClick} disabled={!newPresetName.trim() || slides.length === 0} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed">
                                        Save
                                    </button>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-700/50">
                                    <h3 className="font-semibold text-gray-300 text-base mb-2">My Presets</h3>
                                    <input type="file" accept=".json" ref={importPresetInputRef} onChange={handleFileChange} className="hidden" />
                                    <button onClick={handleImportClick} className="w-full mb-2 px-3 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 flex items-center justify-center gap-2 transition-colors">
                                        <Icon name="upload" className="text-base" /> Import Preset
                                    </button>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {presets.length > 0 ? presets.map(preset => {
                                            const isActive = preset.id === activePresetId;
                                            return (
                                                <div key={preset.id} className={`p-2 rounded-md transition-all ${isActive ? 'bg-blue-800/60 ring-1 ring-blue-500' : 'bg-gray-800/50'}`}>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-gray-300 truncate pr-2">{preset.name}</span>
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <button onClick={() => { onApplyPreset(preset.id); setIsPresetsOpen(false); }} title="Apply" className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-semibold">Apply</button>
                                                            <button onClick={() => onExportPreset(preset.id)} title="Export" className="p-1.5 bg-green-600/80 hover:bg-green-600 rounded"><Icon name="download" className="text-sm"/></button>
                                                            <button onClick={() => onDeletePreset(preset.id)} title="Delete" className="p-1.5 bg-red-600/80 hover:bg-red-600 rounded"><Icon name="trash" className="text-sm"/></button>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setJsonViewerPreset(preset)} className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Icon name="code" className="text-sm"/> View JSON</button>
                                                </div>
                                            );
                                        }) : <p className="text-xs text-gray-500 text-center py-2">No presets saved yet.</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                     <div className="relative">
                        <button onClick={() => setIsDownloadMenuOpen(p => !p)} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center gap-2 transition-colors">
                            <Icon name="download" className="text-base" />
                            <span>Download</span>
                        </button>
                        {isDownloadMenuOpen && (
                            <div ref={downloadMenuRef} className="absolute top-full right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-lg z-20 p-2 animate-fade-in-down">
                                <ul className="space-y-1">
                                    <li>
                                        <button onClick={handleDownloadCurrent} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-md flex items-center gap-2 transition-colors">
                                            <Icon name="image" /> Download Current Slide
                                        </button>
                                    </li>
                                    <li>
                                        <button onClick={handleDownloadAll} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-md flex items-center gap-2 transition-colors">
                                            <Icon name="downloadMultiple" /> Download All (.zip)
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                    <button onClick={onStartOver} className="px-3 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 flex items-center gap-2 transition-colors"><Icon name="undo" className="text-base" />Start Over</button>
                </div>
            </div>

            <div className="flex-shrink-0 p-4 bg-gray-950/50 rounded-t-xl border-b border-gray-800">
                <label htmlFor="carousel-name" className="text-sm font-medium text-gray-400">Carousel Name</label>
                <input
                    id="carousel-name"
                    type="text"
                    value={carouselName}
                    onChange={(e) => onCarouselNameChange(e.target.value)}
                    placeholder="e.g., My Awesome Carousel"
                    className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
            </div>
            
            <div className="flex-shrink-0 border-b border-gray-800">
                <nav className="flex -mb-px gap-4 px-4" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('slides')}
                        className={`flex items-center gap-2 px-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'slides' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-500'}`}
                    >
                        <Icon name="image" className="text-base" />
                        Slides
                    </button>
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`flex items-center gap-2 px-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'global' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-500'}`}
                    >
                        <Icon name="settings" className="text-base" />
                        Global Styles
                    </button>
                </nav>
            </div>
            
            {activeTab === 'slides' && (
                <div className="flex-grow overflow-y-auto space-y-4 pt-4 px-4">
                    {slides.map((slide, index) => (
                        <div key={slide.id} className="bg-gray-950/50 p-4 rounded-xl border border-gray-800">
                            <div className="flex justify-between items-center mb-3">
                               <h3 className="font-semibold text-gray-400">Slide {index + 1}</h3>
                               <div className="flex items-center gap-2">
                                   {imageSource === 'ai' ? (
                                    <button onClick={() => onRegenerateImage(slide.id)} className="text-gray-400 hover:text-white transition-colors" aria-label={`Regenerate image for slide ${index + 1}`}><Icon name="refresh" className="text-xl"/></button>
                                   ) : (
                                    <button onClick={() => onOpenPexelsSearch(slide)} className="px-3 py-1 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 flex items-center gap-2 transition-colors" aria-label={`Search Pexels image for slide ${index + 1}`}><Icon name="search" className="text-base"/>Search</button>
                                   )}
                                    <button onClick={() => setExpandedSlideId(prev => prev === slide.id ? null : slide.id)} className="text-gray-400 hover:text-white transition-colors" aria-label={`Customize slide ${index + 1}`}><Icon name="settings" className="text-xl"/></button>
                               </div>
                            </div>
                            {slide.error && (
                                 <div className="bg-red-900/30 border border-red-700/50 text-red-300 text-xs rounded-lg p-2 flex items-start gap-2 mb-3">
                                    <Icon name="alert" className="text-base flex-shrink-0 mt-0.5" />
                                    <span>{slide.error}</span>
                                </div>
                            )}
                            <div className="space-y-3">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label htmlFor={`title-${slide.id}`} className="text-sm font-medium text-gray-400">Title</label>
                                        <button onClick={() => handleApplyHighlight(slide.id, 'title')} className="text-gray-400 hover:text-white transition-colors p-1" title="Highlight selected text"><Icon name="highlight" className="text-base"/></button>
                                    </div>
                                    <input id={`title-${slide.id}`} type="text" value={slide.title} onSelect={(e) => setSelection({ slideId: slide.id, field: 'title', start: e.currentTarget.selectionStart ?? 0, end: e.currentTarget.selectionEnd ?? 0})} onChange={(e) => handleSlideUpdate(index, 'title', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label htmlFor={`body-${slide.id}`} className="text-sm font-medium text-gray-400">Body Text</label>
                                        <button onClick={() => handleApplyHighlight(slide.id, 'body')} className="text-gray-400 hover:text-white transition-colors p-1" title="Highlight selected text"><Icon name="highlight" className="text-base"/></button>
                                    </div>
                                    <textarea id={`body-${slide.id}`} value={slide.body} onSelect={(e) => setSelection({ slideId: slide.id, field: 'body', start: e.currentTarget.selectionStart ?? 0, end: e.currentTarget.selectionEnd ?? 0})} onChange={(e) => handleSlideUpdate(index, 'body', e.target.value)} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y" />
                                </div>
                                 <div className="flex items-center justify-between pt-2 border-t border-gray-800/50">
                                    <label htmlFor={`cta-enabled-${slide.id}`} className="text-sm font-medium text-gray-400">Call to Action</label>
                                    <input type="checkbox" id={`cta-enabled-${slide.id}`} checked={slide.cta.enabled} onChange={(e) => handleStyleChange(index, 'cta', 'enabled', e.target.checked)} className="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"/>
                                </div>
                                {slide.cta.enabled && (
                                    <div><label htmlFor={`cta-text-${slide.id}`} className="text-sm font-medium text-gray-400 block mb-1">CTA Text</label><input id={`cta-text-${slide.id}`} type="text" value={slide.cta.text} onChange={(e) => handleStyleChange(index, 'cta', 'text', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div>
                                )}
                            </div>
                             {expandedSlideId === slide.id && (
                                <div className="mt-3">
                                    <StyleEditor 
                                        titleStyle={slide.titleStyle} onTitleStyleChange={(p, v) => handleStyleChange(index, 'titleStyle', p, v)}
                                        bodyStyle={slide.bodyStyle} onBodyStyleChange={(p, v) => handleStyleChange(index, 'bodyStyle', p, v)}
                                        layoutStyle={slide.layoutStyle} onLayoutStyleChange={(p, v) => handleStyleChange(index, 'layoutStyle', p, v)}
                                        onApplyStylesToAll={() => handleApplyStylesToAll(index)}
                                    />
                                    {slide.cta.enabled && (
                                    <details className="mt-2 p-3 bg-gray-800/50 rounded-xl border border-gray-700 group" open>
                                        <summary className="font-semibold text-gray-300 list-none cursor-pointer group-open:mb-3">Call to Action Styles</summary>
                                        <div className="space-y-3 p-3 bg-gray-900/50 rounded-lg">
                                            <h4 className="font-semibold text-gray-400 text-sm">Text</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex items-center bg-gray-800 border border-gray-700 rounded-md">
                                                    <input type="color" value={slide.cta.style.color} onChange={(e) => handleStyleChange(index, 'cta', 'color', e.target.value)} className="w-10 h-9 p-1 bg-transparent border-none cursor-pointer appearance-none" aria-label="CTA color picker" />
                                                    <input type="text" value={slide.cta.style.color} onChange={(e) => handleStyleChange(index, 'cta', 'color', e.target.value)} className="w-full bg-transparent text-sm focus:outline-none pr-2" aria-label="CTA color hex code" maxLength={7}/>
                                                </div>
                                                <div className="flex items-center bg-gray-800 border border-gray-700 rounded-md px-2"><input type="number" value={slide.cta.style.fontSize} onChange={(e) => handleStyleChange(index, 'cta', 'fontSize', parseInt(e.target.value, 10))} className="w-full bg-transparent text-sm focus:outline-none" aria-label="CTA font size" /><span className="text-xs text-gray-500">px</span></div>
                                            </div>
                                            <div className="flex bg-gray-800 border border-gray-700 rounded-md">
                                                {(['left', 'center', 'right'] as TextAlign[]).map(align => (
                                                    <button key={align} onClick={() => handleStyleChange(index, 'cta', 'textAlign', align)} className={`flex-1 p-1.5 rounded-md transition-colors ${slide.cta.style.textAlign === align ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`} aria-label={`CTA align ${align}`}><Icon name={`align${align.charAt(0).toUpperCase() + align.slice(1)}` as any} className="text-xl" /></button>
                                                ))}
                                            </div>
                                            <select value={slide.cta.style.fontFamily} onChange={(e) => handleStyleChange(index, 'cta', 'fontFamily', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" aria-label="CTA font family">
                                                {googleFonts.map(font => <option key={font} value={font}>{font.split(',')[0]}</option>)}
                                            </select>
                                            <h4 className="font-semibold text-gray-400 text-sm pt-3 border-t border-gray-800">Background</h4>
                                            <div className="grid grid-cols-2 gap-4 items-center">
                                                <div>
                                                    <label className="text-xs text-gray-400">Color</label>
                                                    <div className="flex items-center bg-gray-800 border border-gray-700 rounded-md mt-1">
                                                        <input type="color" value={slide.cta.background.color} onChange={(e) => handleStyleChange(index, 'cta', 'backgroundColor', e.target.value)} className="w-10 h-9 p-1 bg-transparent border-none cursor-pointer appearance-none" aria-label="CTA background color picker"/>
                                                        <input type="text" value={slide.cta.background.color} onChange={(e) => handleStyleChange(index, 'cta', 'backgroundColor', e.target.value)} className="w-full bg-transparent text-sm focus:outline-none pr-2" aria-label="CTA background color hex code" maxLength={7} />
                                                    </div>
                                                </div>
                                                <div><label className="text-xs text-gray-400">Border Radius: {slide.cta.background.borderRadius}px</label><input type="range" min="0" max="50" value={slide.cta.background.borderRadius} onChange={(e) => handleStyleChange(index, 'cta', 'borderRadius', parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-1" /></div>
                                                <div><label className="text-xs text-gray-400">Padding X: {slide.cta.background.paddingX}px</label><input type="range" min="0" max="50" value={slide.cta.background.paddingX} onChange={(e) => handleStyleChange(index, 'cta', 'paddingX', parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-1" /></div>
                                                <div><label className="text-xs text-gray-400">Padding Y: {slide.cta.background.paddingY}px</label><input type="range" min="0" max="50" value={slide.cta.background.paddingY} onChange={(e) => handleStyleChange(index, 'cta', 'paddingY', parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-1" /></div>
                                            </div>
                                        </div>
                                    </details>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            {activeTab === 'global' && (
                 <div className="flex-grow overflow-y-auto pt-4 px-4">
                    <div className="space-y-4">
                        <div className="p-3 bg-gray-950/50 rounded-xl border border-gray-800 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {logo ? <img src={logo} alt="Logo" className="h-10 w-10 rounded-md object-contain bg-white/10"/> : <div className="h-10 w-10 rounded-md bg-gray-800 flex items-center justify-center"><Icon name="image" className="text-gray-500"/></div>}
                                    <div><h3 className="font-semibold text-gray-300 text-sm">Brand Logo</h3></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="file" accept="image/png" ref={logoInputRef} onChange={handleLogoUpload} className="hidden"/>
                                    <button onClick={() => logoInputRef.current?.click()} className="p-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"><Icon name="upload" className="text-base"/></button>
                                    {logo && <button onClick={() => onLogoChange(null)} className="p-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors"><Icon name="trash" className="text-base"/></button>}
                                </div>
                            </div>
                            {logo && (
                                <div><label className="text-xs text-gray-400">Logo Size: {logoSize}%</label><input type="range" min="5" max="30" value={logoSize} onChange={(e) => onLogoSizeChange(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-1" /></div>
                            )}
                            <div className="border-t border-gray-800"></div>
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-gray-300 text-sm">Image Overlay</h3>
                                <input type="checkbox" checked={imageOverlay.enabled} onChange={(e) => onImageOverlayChange('enabled', e.target.checked)} className="form-checkbox h-4 w-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"/>
                            </div>
                             {imageOverlay.enabled && (
                                <div className="grid grid-cols-2 gap-4 items-center">
                                     <div>
                                        <label className="text-xs text-gray-400">Color</label>
                                        <div className="flex items-center bg-gray-800 border border-gray-700 rounded-md mt-1">
                                            <input type="color" value={imageOverlay.color} onChange={(e) => onImageOverlayChange('color', e.target.value)} className="w-10 h-9 p-1 bg-transparent border-none cursor-pointer appearance-none" aria-label="Overlay color picker" />
                                            <input type="text" value={imageOverlay.color} onChange={(e) => onImageOverlayChange('color', e.target.value)} className="w-full bg-transparent text-sm focus:outline-none pr-2" aria-label="Overlay color hex code" maxLength={7} />
                                        </div>
                                    </div>
                                    <div><label className="text-xs text-gray-400">Opacity: {Math.round(imageOverlay.opacity * 100)}%</label><input type="range" min="0" max="1" step="0.05" value={imageOverlay.opacity} onChange={(e) => onImageOverlayChange('opacity', parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-1" /></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {jsonViewerPreset && <JsonViewerModal preset={jsonViewerPreset} onClose={() => setJsonViewerPreset(null)} />}
        </div>
    );
};

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
    const [slides, setSlides] = useState<Slide[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [imagePrompt, setImagePrompt] = useState(defaultImagePrompt);
    const [contentPrompt, setContentPrompt] = useState(defaultContentPrompt);
    const [carouselName, setCarouselName] = useState('My-AI-Carousel');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5'>('1:1');
    const [imageSource, setImageSource] = useState<'ai' | 'pexels'>('ai');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [logo, setLogo] = useState<string | null>(null);
    const [logoSize, setLogoSize] = useState(12);
    const [imageOverlayStyle, setImageOverlayStyle] = useState(DEFAULT_IMAGE_OVERLAY_STYLE);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const [presets, setPresets] = useState<StylePreset[]>([]);
    const [activePresetId, setActivePresetId] = useState<string | null>(null);
    const [toast, setToast] = useState({ message: '', visible: false });
    const [pexelsApiKey, setPexelsApiKey] = useState<string>(
        () => localStorage.getItem('pexelsApiKey') || '' 
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
        setImageOverlayStyle(s => ({...s, [prop]: value}));
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
            if(activePresetId === presetId) {
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

    useLayoutEffect(() => {
        const fontsToLoad = new Set<string>();
        slides.forEach(slide => {
            fontsToLoad.add(slide.titleStyle.fontFamily.split(',')[0].replace(/ /g, '+'));
            fontsToLoad.add(slide.bodyStyle.fontFamily.split(',')[0].replace(/ /g, '+'));
            if(slide.cta.enabled) {
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
            setSlides(currentSlides => currentSlides.map(s => s.id === slideId ? { ...s, src: `data:image/png;base64,${imageData}`, isLoading: false } : s));
        } catch(err) {
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

    const handlePexelsImageSelect = useCallback((slideId: string, base64Image: string) => {
        setSlides(currentSlides => currentSlides.map(s => s.id === slideId ? { ...s, src: `data:image/png;base64,${base64Image}`, isLoading: false, error: undefined } : s));
        setPexelsSearchModalSlide(null); // Close modal
    }, []);

    const handleStartOver = useCallback(() => {
        setSlides([]);
        setError(null);
        setCurrentIndex(0);
        resetToDefaultStyles();
        setLogo(null);
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
            if (style.textAlign === 'center') currentX = x + (ctx.canvas.width - x*2 - fullLineWidth) / 2;
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
        canvas.height = aspectRatio === '1:1' ? outputSize : Math.round(outputSize * (4/3));
        
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
        } catch(e) { console.warn("Font loading may be incomplete:", e); }
    
        const bgImage = new Image(); bgImage.crossOrigin = 'anonymous'; bgImage.src = slide.src;
        const logoImage = new Image(); if (logo) { logoImage.crossOrigin = 'anonymous'; logoImage.src = logo; }
        
        await Promise.all([ new Promise(res => { bgImage.onload = res; bgImage.onerror = () => res(null); }), logo ? new Promise(res => { logoImage.onload = res; logoImage.onerror = () => res(null); }) : Promise.resolve() ]).catch(e => console.error("Error loading images for canvas:", e));

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
        let ctaTextMetrics = { lines: [], height: 0 };
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
            applyShadow({enabled: false, color:'', blur:0, offsetX:0, offsetY:0});
            const ctaBlockY = bodyBottom + ctaMarginTop;
            
            let ctaBlockX = padding;
            if (slide.cta.style.textAlign === 'center') ctaBlockX = (canvas.width - ctaBlockWidth) / 2;
            else if (slide.cta.style.textAlign === 'right') ctaBlockX = canvas.width - padding - ctaBlockWidth;

            ctx.fillStyle = scaledCtaBg.color;
            ctx.beginPath(); ctx.roundRect(ctaBlockX, ctaBlockY, ctaBlockWidth, ctaBlockHeight, scaledCtaBg.borderRadius); ctx.fill();

            ctx.font = `bold ${scaledCtaStyle.fontSize}px ${scaledCtaStyle.fontFamily}`;
            drawStyledTextLines(ctx, ctaTextMetrics.lines, ctaBlockX + scaledCtaBg.paddingX, ctaBlockY + scaledCtaBg.paddingY, scaledCtaStyle);
        }
            
        applyShadow({enabled: false, color: '', blur: 0, offsetX: 0, offsetY: 0});
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

        zip.generateAsync({ type: "blob" }).then(function(content) {
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
