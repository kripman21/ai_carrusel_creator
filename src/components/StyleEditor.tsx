import React from 'react';
import { Icon } from './Icon';
import type { StyleState, LayoutState, TextAlign, VerticalAlign, ShadowState } from '../types';

interface StyleEditorProps {
    titleStyle: StyleState;
    onTitleStyleChange: (prop: keyof StyleState, value: any) => void;
    bodyStyle: StyleState;
    onBodyStyleChange: (prop: keyof StyleState, value: any) => void;
    layoutStyle: LayoutState;
    onLayoutStyleChange: (prop: keyof LayoutState, value: any) => void;
    onApplyStylesToAll: () => void;
}

export const StyleEditor: React.FC<StyleEditorProps> = ({ titleStyle, onTitleStyleChange, bodyStyle, onBodyStyleChange, layoutStyle, onLayoutStyleChange, onApplyStylesToAll }) => {
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
                                        <input type="color" id={`highlight-color-picker-${title}`} value={(style as StyleState).highlightColor} onChange={(e) => (onChange as any)('highlightColor', e.target.value)} className="w-8 h-7 p-1 bg-transparent border-none cursor-pointer appearance-none" aria-label={`${title} highlight color picker`} />
                                        <input type="text" id={`highlight-color-hex-${title}`} value={(style as StyleState).highlightColor} onChange={(e) => (onChange as any)('highlightColor', e.target.value)} className="w-full bg-transparent text-xs focus:outline-none pr-2" maxLength={7} aria-label={`${title} highlight color hex code`} />
                                    </div>
                                </div>
                                <details className="p-2 bg-gray-800 rounded-md group text-xs">
                                    <summary className="font-semibold text-gray-500 cursor-pointer list-none group-open:mb-2">Shadow</summary>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-gray-400"><label htmlFor={`shadow-enabled-${title}`}>Enable</label><input type="checkbox" id={`shadow-enabled-${title}`} checked={(style as StyleState).shadow.enabled} onChange={(e) => handleShadowChange('enabled', e.target.checked)} className="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" /></div>
                                        {(style as StyleState).shadow.enabled && (<>
                                            <div className="flex items-center justify-between">
                                                <label className="text-gray-400">Color</label>
                                                <div className="flex items-center bg-gray-700 border border-gray-600 rounded-md w-1/2">
                                                    <input type="color" value={(style as StyleState).shadow.color} onChange={(e) => handleShadowChange('color', e.target.value)} className="w-8 h-7 p-1 bg-transparent border-none cursor-pointer appearance-none" aria-label={`${title} shadow color picker`} />
                                                    <input type="text" value={(style as StyleState).shadow.color} onChange={(e) => handleShadowChange('color', e.target.value)} className="w-full bg-transparent text-xs focus:outline-none pr-2" maxLength={7} aria-label={`${title} shadow color hex code`} />
                                                </div>
                                            </div>
                                            <div><label className="text-gray-400">Blur: {(style as StyleState).shadow.blur}px</label><input type="range" min="0" max="20" value={(style as StyleState).shadow.blur} onChange={(e) => handleShadowChange('blur', parseInt(e.target.value, 10))} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer mt-1" /></div>
                                            <div><label className="text-gray-400">Offset X: {(style as StyleState).shadow.offsetX}px</label><input type="range" min="-10" max="10" value={(style as StyleState).shadow.offsetX} onChange={(e) => handleShadowChange('offsetX', parseInt(e.target.value, 10))} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer mt-1" /></div>
                                            <div><label className="text-gray-400">Offset Y: {(style as StyleState).shadow.offsetY}px</label><input type="range" min="-10" max="10" value={(style as StyleState).shadow.offsetY} onChange={(e) => handleShadowChange('offsetY', parseInt(e.target.value, 10))} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer mt-1" /></div>
                                        </>)}
                                    </div>
                                </details>
                            </div>
                        )
                    })}
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
