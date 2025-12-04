import React, { useState, useCallback, useEffect } from 'react';
import { Icon } from './Icon';
import { fetchPexelsImages } from '../services/geminiService';
import type { Slide } from '../types';

export interface PexelsSearchModalProps {
    slide: Slide;
    aspectRatio: '1:1' | '4:5';
    pexelsApiKey: string;
    onImageSelect: (slideId: string, imageUrl: string) => void;
    onClose: () => void;
}

export const PexelsSearchModal: React.FC<PexelsSearchModalProps> = ({ slide, aspectRatio, pexelsApiKey, onImageSelect, onClose }) => {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSelectImage = () => {
        if (selectedImageUrl) {
            onImageSelect(slide.id, selectedImageUrl);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-gray-200">Search Pexels for Image (Slide {slide.id.split('-').pop()})</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><Icon name="trash" className="text-xl" /></button>
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
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto flex-grow">
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
                    <button onClick={handleSelectImage} disabled={!selectedImageUrl || isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed">
                        Select Image
                    </button>
                </div>
            </div>
        </div>
    );
};
