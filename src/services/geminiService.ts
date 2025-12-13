import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey) {
        throw new Error("VITE_API_KEY is missing. Please set it in your .env file.");
    }
    return new GoogleGenAI({ apiKey });
};

const base64ToBlobURL = (base64: string, contentType: string = 'image/png'): string => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: contentType });
    return URL.createObjectURL(blob);
};

// Helper to fetch image from URL and convert to base64
export const imageUrlToBase64 = async (url: string): Promise<string> => {
    // Use a proxy to avoid CORS issues if running in a strict browser environment
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from Pexels: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                // reader.result is "data:image/jpeg;base64,..."
                // We need to strip the prefix for consistency with the Gemini API response
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to read image as base64 string."));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};


/**
 * Searches for multiple images on Pexels and returns an array of their URLs.
 */
export const fetchPexelsImages = async (query: string, aspectRatio: '1:1' | '4:5', pexelsKey: string, perPage: number = 15): Promise<string[]> => {
    if (!pexelsKey) {
        throw new Error("Pexels API key is not set. Please add it in Global Styles.");
    }

    // Pexels uses 'square' and 'portrait' for orientation
    const orientation = aspectRatio === '1:1' ? 'square' : 'portrait';
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=${orientation}`;

    const response = await fetch(url, {
        headers: {
            Authorization: pexelsKey,
        },
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Pexels API request failed: Invalid Pexels API key. Please check your key in Global Styles.");
        }
        throw new Error(`Pexels API request failed with status ${response.status}: ${response.statusText}. Please try again later.`);
    }

    const data = await response.json();
    if (!data.photos || data.photos.length === 0) {
        throw new Error(`No images found on Pexels for query: "${query}". Try a different search term.`);
    }

    // Return an array of 'large' image URLs
    return data.photos.map((photo: any) => photo.src.large).filter(Boolean);
};


/**
 * Generates a single image from a detailed prompt using the imagen model.
 * This function no longer falls back to Pexels; it is a dedicated AI image generator.
 */
export const generateImage = async (prompt: string, aspectRatio: '1:1' | '4:5'): Promise<string> => {
    if (!prompt.trim()) {
        throw new Error("Prompt cannot be empty.");
    }
    const model = 'imagen-4.0-generate-001';

    try {
        // Map the app's '4:5' aspect ratio to imagen's supported '3:4'
        const imagenAspectRatio = aspectRatio === '4:5' ? '3:4' : '1:1';

        const response = await getAiClient().models.generateImages({
            model,
            prompt,
            config: {
                numberOfImages: 1,
                aspectRatio: imagenAspectRatio,
                outputMimeType: 'image/png',
            },
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error("The AI did not return any image. Your prompt might have been blocked for safety reasons.");
        }

        const image = response.generatedImages[0];

        if (!image?.image?.imageBytes) {
            throw new Error("No image data was found in the AI's response. Please try adjusting your 'Image Style Prompt'.");
        }

        return base64ToBlobURL(image.image.imageBytes, 'image/png');

    } catch (geminiError) {
        console.error("Error generating image with imagen:", geminiError);
        if (geminiError instanceof Error) {
            if (geminiError.message.includes('SAFETY')) {
                throw new Error('Image generation failed due to safety filters. Please adjust your prompt.');
            }
            throw new Error(`Failed to generate image. The model may have rejected the prompt. Details: ${geminiError.message}`);
        }
        throw new Error("Failed to generate image due to an unknown error.");
    }
};


/**
 * Generates a full carousel from a high-level image prompt and a content prompt.
 * It instructs the model to plan the slides, then generates images for them
 * using either the AI model or Pexels, based on the `imageSource` parameter.
 */
export const generateCarousel = async (
    imagePrompt: string | null, // Made nullable
    contentPrompt: string,
    aspectRatio: '1:1' | '4:5',
    imageSource: 'ai' | 'pexels',
    pexelsKey: string
): Promise<{ prompt: string; src: string; title: string; body: string }[]> => {
    // Step 1: Generate a structured list of detailed prompts and copy for each slide.
    let slideData: { prompt: string; title: string; body: string }[] = [];
    try {
        const promptGeneratorModel = 'gemini-2.5-flash';
        const newAspectRatioText = aspectRatio === '1:1' ? 'square (1:1)' : 'portrait (3:4)';

        // Adjust system instruction based on image source
        let systemInstruction = `You are an expert social media graphic designer and copywriter specializing in creating stunning Instagram carousels. The desired aspect ratio for the images is ${newAspectRatioText}.
You will receive two sets of instructions.
1.  **Image Style Prompt**: This dictates the overall visual aesthetic, including colors, mood, and subject style. (This is optional if using a stock image source)
2.  **Slide Content Prompt**: This provides the text, topics, and information for the slides.

Your task is to break down the content prompt into a series of slides, writing a catchy 'title' and concise 'body' for each.

**TEXT HIGHLIGHTING RULES (CRITICAL):**
1.  **Body**: Identify the most important phrases or key ideas within the text and enclose them in single asterisks (*highlighted text*) to emphasize them.
2.  **Title**: If the title has **more than 3 words**, enclose the last 1-3 words in single asterisks for emphasis (e.g., "The Power of *Red*"). If the title has 3 words or less, do NOT use asterisks.

For each slide, you must also generate a detailed 'prompt' for an image generation model that strictly adheres to the visual style described in the Image Style Prompt (if provided) and is suitable for the ${newAspectRatioText} aspect ratio. These image prompts should be rich in visual detail to ensure the model can successfully generate a relevant and high-quality image. Crucially, if a slide's content is abstract (like a quote), you must translate that abstract concept into a concrete, visually descriptive scene. For example, for a quote about 'boldness', you could describe 'a woman in a vibrant red dress standing confidently at the edge of a skyscraper overlooking a city at dusk'. Do not create abstract or metaphorical prompts; always describe a physical scene. You must return a JSON array of these slide objects.`;

        const combinedUserPrompt = imagePrompt ? `IMAGE STYLE PROMPT:\n${imagePrompt}\n\nSLIDE CONTENT PROMPT:\n${contentPrompt}` : `SLIDE CONTENT PROMPT:\n${contentPrompt}`;

        const response = await getAiClient().models.generateContent({
            model: promptGeneratorModel,
            contents: combinedUserPrompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            prompt: {
                                type: Type.STRING,
                                description: "A detailed, descriptive prompt for an image generation model to create a single slide of the carousel, following the Image Style Prompt."
                            },
                            title: {
                                type: Type.STRING,
                                description: "A short, catchy title for the slide, based on the Slide Content Prompt."
                            },
                            body: {
                                type: Type.STRING,
                                description: "The main body text for the slide, based on the Slide Content Prompt. Keep it concise."
                            }
                        },
                        required: ["prompt", "title", "body"],
                    },
                },
            },
        });

        const jsonText = response.text?.trim() || '[]';
        slideData = JSON.parse(jsonText);

        if (!Array.isArray(slideData) || slideData.length === 0) {
            throw new Error("The AI failed to generate a valid list of slide prompts and copy.");
        }

    } catch (error) {
        console.error("Error generating slide prompts:", error);
        throw new Error("Failed to plan the carousel. The AI could not generate slide descriptions from your prompt.");
    }

    // Step 2: Generate an image for each prompt in parallel based on the selected source.
    try {
        const imageGenerationPromises = slideData.map(slide => {
            const imagePromise = imageSource === 'ai'
                ? generateImage(slide.prompt, aspectRatio)
                // For Pexels, we fetch only one image initially using the AI-generated prompt
                : fetchPexelsImages(slide.prompt.split(/[,.]/)[0].trim(), aspectRatio, pexelsKey, 1)
                    .then(urls => {
                        if (urls.length > 0) return urls[0];
                        throw new Error(`No Pexels image found for "${slide.prompt}"`);
                    });

            return imagePromise.then(imageSrc => ({
                prompt: slide.prompt,
                title: slide.title,
                body: slide.body,
                src: imageSrc
            }));
        });

        const generatedSlides = await Promise.all(imageGenerationPromises);
        return generatedSlides;

    } catch (error) {
        console.error("Error during parallel image generation:", error);
        if (error instanceof Error) {
            const sourceName = imageSource === 'ai' ? 'the AI model' : 'Pexels';
            throw new Error(`One or more images could not be created from ${sourceName}. Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while generating carousel images.");
    }
};