import type { Project } from './models';

export interface WorkbenchBlueprint {
    id: number;
    slug: string;
    name: string;
    allow_ai_sorting: boolean;
    description: string | null;
    routed_count: number;
}

export interface WorkbenchNotebook {
    id: number;
    slug: string;
    title: string;
    allow_ai_sort: boolean;
    is_catch_all: boolean;
    description: string | null;
    note_count: number;
}

export interface WorkbenchProps {
    project: Pick<Project, 'id' | 'name' | 'slug'> & { can: { update: boolean } };
    blueprints: WorkbenchBlueprint[];
    notebooks: WorkbenchNotebook[];
    unsorted_count: number;
    pending_count: number;
    [key: string]: unknown;
}
