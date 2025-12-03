
import { useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import type { FunctionCall, FunctionDeclaration } from '@google/genai';
import type { AppStatus, Transcription } from '../types';

// Audio Utility Functions (embedded to reduce file count)
const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
};

const createBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
};

// --- Function Declarations for Gemini ---
const createImageFunctionDeclaration: FunctionDeclaration = {
    name: 'createImage',
    description: "Creates a new image for the carousel based on a detailed descriptive prompt from the user.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            prompt: { type: Type.STRING, description: 'A detailed description of the image to create. e.g., "a photorealistic image of a cat wearing sunglasses on a beach"' },
        },
        required: ['prompt'],
    },
};

const editLastImageFunctionDeclaration: FunctionDeclaration = {
    name: 'editLastImage',
    description: "Edits the most recently added image in the carousel using an editing instruction.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            prompt: { type: Type.STRING, description: 'The editing instruction. e.g., "make it black and white", "add a retro filter", "remove the person in the background"' },
        },
        required: ['prompt'],
    },
};

// --- The Custom Hook ---
interface UseGeminiLiveProps {
    onTranscriptionUpdate: (transcript: Transcription) => void;
    onToolCall: (call: FunctionCall) => Promise<any>;
    onStatusChange: (status: AppStatus, message?: string) => void;
}

export const useGeminiLive = ({ onTranscriptionUpdate, onToolCall, onStatusChange }: UseGeminiLiveProps) => {
    const sessionRef = useRef<any | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRefs = useRef<{ input: AudioContext | null, output: AudioContext | null, processor: ScriptProcessorNode | null }>({ input: null, output: null, processor: null });
    const outputPlayback = useRef<{ nextStartTime: number, sources: Set<AudioBufferSourceNode> }>({ nextStartTime: 0, sources: new Set() });

    const stopSession = useCallback(() => {
        onStatusChange('idle', 'Tap to start');
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRefs.current.input) {
            audioContextRefs.current.input.close();
            audioContextRefs.current.input = null;
        }
        if (audioContextRefs.current.output) {
            audioContextRefs.current.output.close();
            audioContextRefs.current.output = null;
        }
        if (audioContextRefs.current.processor) {
            audioContextRefs.current.processor.disconnect();
            audioContextRefs.current.processor = null;
        }
        outputPlayback.current.sources.forEach(source => source.stop());
        outputPlayback.current.sources.clear();
        outputPlayback.current.nextStartTime = 0;
    }, [onStatusChange]);

    const startSession = useCallback(async () => {
        try {
            onStatusChange('processing', 'Connecting...');
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            audioContextRefs.current = { input: inputAudioContext, output: outputAudioContext, processor: null };
            outputPlayback.current.nextStartTime = 0;

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    tools: [{ functionDeclarations: [createImageFunctionDeclaration, editLastImageFunctionDeclaration] }],
                    systemInstruction: 'You are a creative assistant helping a user build a visual carousel. Guide them through creating and editing images. Keep your responses concise and friendly. After you perform an action successfully via a tool call, just give a simple confirmation like "Done!" or "Here it is.".'
                },
                callbacks: {
                    onopen: () => {
                        onStatusChange('listening', 'Listening...');
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        audioContextRefs.current.processor = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message) => {
                        if (message.serverContent?.inputTranscription) {
                            const { text } = message.serverContent.inputTranscription;
                            if (text) onTranscriptionUpdate({ id: Date.now().toString() + 'user', speaker: 'user', text });
                        }
                        if (message.serverContent?.outputTranscription) {
                            const { text } = message.serverContent.outputTranscription;
                            if (text) onTranscriptionUpdate({ id: Date.now().toString() + 'ai', speaker: 'ai', text });
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContext) {
                            onStatusChange('speaking', '...');
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                            const source = outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContext.destination);

                            source.onended = () => {
                                outputPlayback.current.sources.delete(source);
                                if (outputPlayback.current.sources.size === 0) {
                                    onStatusChange('listening', 'Listening...');
                                }
                            };

                            const currentTime = outputAudioContext.currentTime;
                            const startTime = Math.max(currentTime, outputPlayback.current.nextStartTime);
                            source.start(startTime);
                            outputPlayback.current.nextStartTime = startTime + audioBuffer.duration;
                            outputPlayback.current.sources.add(source);
                        }

                        if (message.toolCall?.functionCalls) {
                            onStatusChange('processing', 'Creating...');
                            for (const fc of message.toolCall.functionCalls) {
                                const result = await onToolCall(fc);
                                sessionPromise.then(session => session.sendToolResponse({
                                    functionResponses: { id: fc.id, name: fc.name, response: { result: JSON.stringify(result) } }
                                }));
                            }
                        }
                    },
                    onerror: (e) => {
                        console.error('Gemini Live API Error:', e);
                        onStatusChange('error', 'Connection error.');
                        stopSession();
                    },
                    onclose: () => {
                        // Handled by manual stopSession call
                    },
                }
            });
            sessionPromise.then(s => sessionRef.current = s);

        } catch (error) {
            console.error("Failed to start session:", error);
            onStatusChange('error', 'Microphone access denied.');
        }
    }, [onStatusChange, onToolCall, onTranscriptionUpdate, stopSession]);

    return { startSession, stopSession };
};
