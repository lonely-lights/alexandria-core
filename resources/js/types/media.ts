export interface MediaItem {
    id: number;
    collection: 'page_image' | 'banner' | 'gallery';
    /** 'generated' marks an Image Studio render surfaced read-only in the
     *  gallery via the likeness link (2026-08-23). */
    source?: 'generated';
    /** The GeneratedImage id behind a 'generated' item (for its gated
     *  file URL). */
    render_id?: number;
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
