import React from 'react';
import { Icon } from './Icon';
import type { Slide, ShadowState } from '../types';

interface CarouselProps {
    slides: Slide[];
    logo: string | null;
    logoSize: number;
    imageOverlay: { enabled: boolean; color: string; opacity: number; };
    aspectRatio: '1:1' | '4:5';
    currentIndex: number;
    onCurrentIndexChange: (index: number) => void;
}

export const Carousel: React.FC<CarouselProps> = ({ slides, logo, logoSize, imageOverlay, aspectRatio, currentIndex, onCurrentIndexChange }) => {

    const prevSlide = () => onCurrentIndexChange(currentIndex === 0 ? slides.length - 1 : currentIndex - 1);
    const nextSlide = () => onCurrentIndexChange(currentIndex === slides.length - 1 ? 0 : currentIndex + 1);

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
                        {imageOverlay.enabled && <div className="absolute inset-0" style={{ backgroundColor: imageOverlay.color, opacity: imageOverlay.opacity }}></div>}
                        {logo && <img src={logo} alt="Logo" className="absolute top-4 left-4 h-auto pointer-events-none" style={{ width: `${logoSize}%` }} />}
                        <div
                            className={`absolute inset-0 p-6 md:p-8 flex flex-col ${verticalAlignClass[slide.layoutStyle.verticalAlign]} ${textAlignToFlex[slide.titleStyle.textAlign]} pointer-events-none`}
                            style={{ paddingTop: (logo && slide.layoutStyle.verticalAlign === 'top') ? `${logoActualHeight}%` : undefined }}
                        >
                            <div className="relative w-full" style={{ zIndex: 1 }}>
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
