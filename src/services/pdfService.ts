import { jsPDF } from 'jspdf';
import type { Slide } from '../types';
import { createSlideCanvas } from '../utils/canvasGenerator';

export const generatePDF = async (
    slides: Slide[],
    logo: string | null,
    logoSize: number,
    imageOverlay: { enabled: boolean; color: string; opacity: number; },
    aspectRatio: '1:1' | '4:5',
    carouselName: string
): Promise<void> => {
    if (slides.length === 0) return;

    // Definir dimensiones del PDF. Usamos un ancho estándar de 210mm (aprox A4)
    // y calculamos el alto según el aspecto para que llene la página sin bordes blancos.
    const pdfWidth = 210;
    const pdfHeight = aspectRatio === '1:1' ? 210 : 262.5; // 4:5 ratio

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
    });

    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        // Generamos el canvas usando la utilidad compartida
        // Usamos 1080 como 'previewWidth' base para asegurar alta resolución en el PDF
        const canvas = await createSlideCanvas(slide, logo, logoSize, imageOverlay, aspectRatio, 1080);

        if (canvas) {
            const imgData = canvas.toDataURL('image/png');

            if (i > 0) {
                pdf.addPage([pdfWidth, pdfHeight]);
            }

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }
    }

    const safeName = carouselName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'carousel';
    pdf.save(`${safeName}.pdf`);
};
