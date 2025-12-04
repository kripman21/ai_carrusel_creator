import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import { Icon } from './Icon';
import { StyleEditor } from './StyleEditor';
import { JsonViewerModal } from './JsonViewerModal';
import type { Slide, StylePreset, TextAlign } from '../types';

interface TextEditorPanelProps {
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
    onExportPreset: (id: string) => void;
    onImportPreset: (file: File) => void;
    imageSource: 'ai' | 'pexels';
    aspectRatio: '1:1' | '4:5';
    carouselName: string;
    onCarouselNameChange: (name: string) => void;
    onDownloadPdf: () => void;
}

export const TextEditorPanel: React.FC<TextEditorPanelProps> = (props) => {
    const { slides, currentIndex, onSlidesChange, onStartOver, onDownload, onDownloadAll, onDownloadPdf, onRegenerateImage, onOpenPexelsSearch, logo, onLogoChange, logoSize, onLogoSizeChange, imageOverlay, onImageOverlayChange, presets, activePresetId, onSavePreset, onApplyPreset, onDeletePreset, onExportPreset, onImportPreset, imageSource, carouselName, onCarouselNameChange } = props;

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = slides.findIndex((slide) => slide.id === active.id);
            const newIndex = slides.findIndex((slide) => slide.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                onSlidesChange(arrayMove(slides, oldIndex, newIndex));
            }
        }
    };

    const [expandedSlideId, setExpandedSlideId] = useState<string | null>(null);
    const [selection, setSelection] = useState<{ slideId: string, field: 'title' | 'body', start: number, end: number } | null>(null);
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
                newCtaValue = { ...cta, background: { ...cta.background, color: value } };
            } else if (prop in cta.style) {
                newCtaValue = { ...cta, style: { ...cta.style, [prop]: value } };
            } else if (prop in cta.background) {
                newCtaValue = { ...cta, background: { ...cta.background, [prop]: value } };
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
                                                            <button onClick={() => onExportPreset(preset.id)} title="Export" className="p-1.5 bg-green-600/80 hover:bg-green-600 rounded"><Icon name="download" className="text-sm" /></button>
                                                            <button onClick={() => onDeletePreset(preset.id)} title="Delete" className="p-1.5 bg-red-600/80 hover:bg-red-600 rounded"><Icon name="trash" className="text-sm" /></button>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setJsonViewerPreset(preset)} className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Icon name="code" className="text-sm" /> View JSON</button>
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
                                    <li>
                                        <button onClick={() => { onDownloadPdf(); setIsDownloadMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-md flex items-center gap-2 transition-colors">
                                            <Icon name="download" /> Download PDF
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
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={slides.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {slides.map((slide, index) => (
                                <SortableItem key={slide.id} id={slide.id}>
                                    <div className="bg-gray-950/50 p-4 rounded-xl border border-gray-800 mb-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="font-semibold text-gray-400 cursor-grab active:cursor-grabbing">Slide {index + 1} <Icon name="list" className="ml-2 text-gray-600 text-xs inline" /></h3>
                                            <div className="flex items-center gap-2">
                                                {imageSource === 'ai' ? (
                                                    <button onClick={() => onRegenerateImage(slide.id)} className="text-gray-400 hover:text-white transition-colors" aria-label={`Regenerate image for slide ${index + 1}`}><Icon name="refresh" className="text-xl" /></button>
                                                ) : (
                                                    <button onClick={() => onOpenPexelsSearch(slide)} className="px-3 py-1 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 flex items-center gap-2 transition-colors" aria-label={`Search Pexels image for slide ${index + 1}`}><Icon name="search" className="text-base" />Search</button>
                                                )}
                                                <button onClick={() => setExpandedSlideId(prev => prev === slide.id ? null : slide.id)} className="text-gray-400 hover:text-white transition-colors" aria-label={`Customize slide ${index + 1}`}><Icon name="settings" className="text-xl" /></button>
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
                                                    <button onClick={() => handleApplyHighlight(slide.id, 'title')} className="text-gray-400 hover:text-white transition-colors p-1" title="Highlight selected text"><Icon name="highlight" className="text-base" /></button>
                                                </div>
                                                <input id={`title-${slide.id}`} type="text" value={slide.title} onSelect={(e) => setSelection({ slideId: slide.id, field: 'title', start: e.currentTarget.selectionStart ?? 0, end: e.currentTarget.selectionEnd ?? 0 })} onChange={(e) => handleSlideUpdate(index, 'title', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label htmlFor={`body-${slide.id}`} className="text-sm font-medium text-gray-400">Body Text</label>
                                                    <button onClick={() => handleApplyHighlight(slide.id, 'body')} className="text-gray-400 hover:text-white transition-colors p-1" title="Highlight selected text"><Icon name="highlight" className="text-base" /></button>
                                                </div>
                                                <textarea id={`body-${slide.id}`} value={slide.body} onSelect={(e) => setSelection({ slideId: slide.id, field: 'body', start: e.currentTarget.selectionStart ?? 0, end: e.currentTarget.selectionEnd ?? 0 })} onChange={(e) => handleSlideUpdate(index, 'body', e.target.value)} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y" />
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-800/50">
                                                <label htmlFor={`cta-enabled-${slide.id}`} className="text-sm font-medium text-gray-400">Call to Action</label>
                                                <input type="checkbox" id={`cta-enabled-${slide.id}`} checked={slide.cta.enabled} onChange={(e) => handleStyleChange(index, 'cta', 'enabled', e.target.checked)} className="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" />
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
                                                                    <input type="text" value={slide.cta.style.color} onChange={(e) => handleStyleChange(index, 'cta', 'color', e.target.value)} className="w-full bg-transparent text-sm focus:outline-none pr-2" aria-label="CTA color hex code" maxLength={7} />
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
                                                                        <input type="color" value={slide.cta.background.color} onChange={(e) => handleStyleChange(index, 'cta', 'backgroundColor', e.target.value)} className="w-10 h-9 p-1 bg-transparent border-none cursor-pointer appearance-none" aria-label="CTA background color picker" />
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
                                </SortableItem>
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>
            )}

            {activeTab === 'global' && (
                <div className="flex-grow overflow-y-auto pt-4 px-4">
                    <div className="space-y-4">
                        <div className="p-3 bg-gray-950/50 rounded-xl border border-gray-800 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {logo ? <img src={logo} alt="Logo" className="h-10 w-10 rounded-md object-contain bg-white/10" /> : <div className="h-10 w-10 rounded-md bg-gray-800 flex items-center justify-center"><Icon name="image" className="text-gray-500" /></div>}
                                    <div><h3 className="font-semibold text-gray-300 text-sm">Brand Logo</h3></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="file" accept="image/png" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" />
                                    <button onClick={() => logoInputRef.current?.click()} className="p-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"><Icon name="upload" className="text-base" /></button>
                                    {logo && <button onClick={() => onLogoChange(null)} className="p-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors"><Icon name="trash" className="text-base" /></button>}
                                </div>
                            </div>
                            {logo && (
                                <div><label className="text-xs text-gray-400">Logo Size: {logoSize}%</label><input type="range" min="5" max="30" value={logoSize} onChange={(e) => onLogoSizeChange(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-1" /></div>
                            )}
                            <div className="border-t border-gray-800"></div>
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-gray-300 text-sm">Image Overlay</h3>
                                <input type="checkbox" checked={imageOverlay.enabled} onChange={(e) => onImageOverlayChange('enabled', e.target.checked)} className="form-checkbox h-4 w-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500" />
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
