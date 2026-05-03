import type { BlueprintViewDefinition, ViewRenderProps } from '../types';
import GalleryView from './GalleryView';
import GalleryPanel from './GalleryPanel';
import type { GalleryConfig } from './types';
import { defaultGalleryConfig } from './types';

function GalleryRender({ blueprint, config }: ViewRenderProps) {
    const galleryConfig = config as unknown as GalleryConfig;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const widened = blueprint as any;

    return (
        <GalleryView
            projectId={widened.projectId}
            blueprintId={blueprint.id}
            config={galleryConfig}
        />
    );
}

export const GalleryViewDef: BlueprintViewDefinition = {
    type: 'gallery',
    label: 'Gallery',
    icon: 'fa-solid fa-images',
    access: { type: 'tier', minTier: 'starter' },
    supportedClassifications: ['standard', 'list'],
    render: GalleryRender,
    settingsPanel: GalleryPanel,
    defaultConfig: () => defaultGalleryConfig() as unknown as Record<string, unknown>,
};
