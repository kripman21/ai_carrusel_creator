
export interface ShadowState {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface StyleState {
  fontSize: number;
  color: string;
  fontFamily: string;
  textAlign: TextAlign;
  shadow: ShadowState;
  highlightColor: string;
}

export type TextAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'center' | 'bottom';

export interface LayoutState {
    verticalAlign: VerticalAlign;
    spacing: number;
}

export interface CtaBackgroundState {
  color: string;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
}

export interface CtaState {
  enabled: boolean;
  text: string;
  style: StyleState;
  background: CtaBackgroundState;
}

export interface Slide {
  id: string;
  prompt: string;
  src: string | null;
  title: string;
  body: string;
  isLoading: boolean;
  error?: string;
  // Per-slide styling properties
  titleStyle: StyleState;
  bodyStyle: StyleState;
  layoutStyle: LayoutState;
  cta: CtaState;
}

export interface SlideSpecificStyles {
  titleStyle: StyleState;
  bodyStyle: StyleState;
  layoutStyle: LayoutState;
  cta: CtaState;
}

export interface StylePreset {
  id: string;
  name: string;
  logo: string | null;
  titleStyle: StyleState;
  bodyStyle: StyleState;
  layoutStyle: LayoutState;
  cta: CtaState;
  logoSize: number;
  imageOverlay: { enabled: boolean; color: string; opacity: number; };
  lastSlideStyle?: SlideSpecificStyles;
}


// FIX: Add missing AppStatus and Transcription types used by useGeminiLive hook.
export type AppStatus = 'idle' | 'processing' | 'listening' | 'speaking' | 'error';

export interface Transcription {
  id: string;
  speaker: 'user' | 'ai';
  text: string;
}
