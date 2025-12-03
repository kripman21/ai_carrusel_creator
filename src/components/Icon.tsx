import React from 'react';

// --- Icon Component ---
export const Icon: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
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
