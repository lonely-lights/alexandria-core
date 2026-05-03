import type { BlueprintViewDefinition } from './types';
import { TreeViewDef } from './tree';
import { TimelineViewDef } from './timeline';
import { KanbanViewDef } from './kanban';
import { GraphViewDef } from './graph';
import { GalleryViewDef } from './gallery';

export const BLUEPRINT_VIEWS: BlueprintViewDefinition[] = [
    TreeViewDef,
    TimelineViewDef,
    KanbanViewDef,
    GraphViewDef,
    GalleryViewDef,
];

export function getViewDefinition(type: string): BlueprintViewDefinition | undefined {
    return BLUEPRINT_VIEWS.find((v) => v.type === type);
}

export function getRegisteredTypes(): string[] {
    return BLUEPRINT_VIEWS.map((v) => v.type);
}
