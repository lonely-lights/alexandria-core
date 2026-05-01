export interface MediaItem {
    id: number;
    collection: 'page_image' | 'banner' | 'gallery';
    file_name: string;
    mime_type: string;
    size: number;
    original_url: string;
    conversions: Record<string, string>;
    alt_text: string | null;
    caption: string | null;
    crop: CropData | null;
    created_at: string | null;
}

export interface CropData {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface UploadPayload {
    image: File;
    alt_text: string;
    caption?: string;
}

export interface CropPayload {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface MetadataPayload {
    alt_text: string;
    caption?: string;
}

export type MediaModelType = 'projects' | 'blueprints' | 'entries';

export interface CropRatio {
    label: string;
    value: number;
}
