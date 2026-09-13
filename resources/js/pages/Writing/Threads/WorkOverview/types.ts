import type {
    PatternMarkRole,
    PatternScopeType,
    PatternStance,
} from "../threadApi";

export interface WorkPatternMoment {
    id: number;
    work_section_id: number;
    anchor_offset_hint: number | null;
    role: PatternMarkRole;
    anchor_text: string | null;
    note: string | null;
    section_slug: string;
    section_path: string[];
}

export interface WorkPatternThread {
    id: number;
    pattern_card_id: number;
    scope_id: number;
    entry_id: number | null;
    title: string;
    notes: string | null;
    stance: PatternStance | null;
    scope_type: PatternScopeType | "unknown";
    scope_title: string | null;
    status: "open" | "kept";
    unplanted: boolean;
    other_work_marks: number;
    card: {
        id: number;
        name: string | null;
        kind: string | null;
        definition: string | null;
        craft_guidance: string | null;
        pitfalls: string | null;
        archived: boolean;
    };
    marks: WorkPatternMoment[];
}

export interface WorkPatternSection {
    id: number;
    title: string;
    depth: number;
}

export const MOMENT_ROLES: PatternMarkRole[] = ["setup", "develop", "payoff"];

export function roleCount(
    thread: WorkPatternThread,
    role: PatternMarkRole,
): number {
    return thread.marks.filter((mark) => mark.role === role).length;
}
