export interface Slide {
  id: string;
  title: string;
  imageUrl: string;
}

export interface Presentation {
  id: string;
  topic: string;
  style: 'business' | 'educational' | 'creative';
  slides: Slide[];
  createdAt: string;
}

export interface SlidePreview {
  id: string;
  title: string;
  thumbnailUrl: string;
}

export interface PresentationPreview {
  id: string;
  topic: string;
  style: 'business' | 'educational' | 'creative';
  slides: SlidePreview[];
  createdAt: string;
}
