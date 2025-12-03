import React, { useState } from 'react';
import { Icon } from './Icon';
import type { StylePreset } from '../types';

export const JsonViewerModal: React.FC<{ preset: StylePreset; onClose: () => void; }> = ({ preset, onClose }) => {
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
