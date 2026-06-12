import { ELEMENTS } from '@alexandria/editor/screenplay/formatSpec';
import { registerRibbonTabs } from '@alexandria/ribbon/ribbonRegistry';
import type { RibbonControl, RibbonTab } from '@alexandria/ribbon/types';

import type { WritingRibbonContext } from './writingRibbonContext';

/**
 * The writing workspace's four ribbon tabs (Ribbon Plan 2 Task 1) —
 * Write / Structure / Review / Work, per spec §3. Controls are pure
 * data over WritingRibbonContext; the Workspace registers them once
 * at module scope via registerWritingRibbon().
 *
 * Shortcut policy: the ribbon declares NO shortcut where the editor
 * already binds one internally (TipTap owns Mod-B/I/U etc.) — only
 * workspace-level chords live here, chosen off the browser-reserved
 * list (Mod-Shift-O panel, Mod-Shift-L print layout, Mod-Alt-R
 * reports — Mod-Shift-R is the browser's own hard-reload chord).
 */

type Ctx = WritingRibbonContext;

/** Mirrors WORK_STATUSES in Sections/WorkSettingsModal.tsx (kept local —
 *  importing the modal would drag its component tree into pure data). */
const WORK_STATUSES = ['concept', 'drafting', 'revising', 'complete'] as const;

const proseEditable = (ctx: Ctx): boolean => ctx.format === 'prose' && ctx.canUpdate;
const screenplayEditable = (ctx: Ctx): boolean => ctx.format === 'screenplay' && ctx.canUpdate;
const editable = (ctx: Ctx): boolean => ctx.canUpdate;

function markToggle(
    id: 'bold' | 'italic' | 'underline',
    icon: string,
): RibbonControl<Ctx> {
    return {
        id,
        type: 'toggle',
        icon,
        labelKey: `writing.ribbon.${id}`,
        // No shortcut on purpose — TipTap binds Mod-B/I/U inside the editor.
        visible: proseEditable,
        active: (ctx) => ctx.editor?.isMarkActive(id) ?? false,
        onAction: (ctx) => ctx.editor?.toggleMark(id),
    };
}

const writeTab: RibbonTab<Ctx> = {
    id: 'write',
    labelKey: 'writing.ribbon.tab_write',
    groups: [
        {
            id: 'text',
            labelKey: 'writing.ribbon.group_text',
            controls: [
                markToggle('bold', 'fa-solid fa-bold'),
                markToggle('italic', 'fa-solid fa-italic'),
                markToggle('underline', 'fa-solid fa-underline'),
                {
                    id: 'bullet-list',
                    type: 'toggle',
                    icon: 'fa-solid fa-list-ul',
                    labelKey: 'writing.ribbon.bullet_list',
                    visible: proseEditable,
                    active: (ctx) => ctx.editor?.isMarkActive('bulletList') ?? false,
                    onAction: (ctx) => ctx.editor?.toggleList('bulletList'),
                },
                {
                    id: 'ordered-list',
                    type: 'toggle',
                    icon: 'fa-solid fa-list-ol',
                    labelKey: 'writing.ribbon.ordered_list',
                    visible: proseEditable,
                    active: (ctx) => ctx.editor?.isMarkActive('orderedList') ?? false,
                    onAction: (ctx) => ctx.editor?.toggleList('orderedList'),
                },
                {
                    id: 'heading2',
                    type: 'toggle',
                    icon: 'fa-solid fa-h2',
                    labelKey: 'writing.ribbon.heading2',
                    visible: proseEditable,
                    active: (ctx) => ctx.editor?.isMarkActive('heading2') ?? false,
                    onAction: (ctx) => ctx.editor?.toggleHeading(2),
                },
                {
                    id: 'heading3',
                    type: 'toggle',
                    icon: 'fa-solid fa-h3',
                    labelKey: 'writing.ribbon.heading3',
                    visible: proseEditable,
                    active: (ctx) => ctx.editor?.isMarkActive('heading3') ?? false,
                    onAction: (ctx) => ctx.editor?.toggleHeading(3),
                },
            ],
        },
        {
            id: 'element',
            labelKey: 'writing.ribbon.group_element',
            controls: [
                {
                    id: 'element-select',
                    type: 'select',
                    icon: 'fa-solid fa-clapperboard',
                    labelKey: 'writing.ribbon.element',
                    visible: screenplayEditable,
                    options: () =>
                        ELEMENTS.map((element) => ({
                            value: element,
                            labelKey: `writing.elements.${element}`,
                        })),
                    value: (ctx) => ctx.editor?.currentElement() ?? 'action',
                    onAction: (ctx, value) => {
                        if (value !== undefined) {
                            ctx.editor?.setElement(value);
                        }
                    },
                },
                {
                    id: 'screenplay-keys',
                    type: 'button',
                    icon: 'fa-solid fa-keyboard',
                    labelKey: 'writing.ribbon.keys',
                    visible: screenplayEditable,
                    onAction: (ctx) => ctx.editor?.openHelp(),
                },
            ],
        },
        {
            id: 'world',
            labelKey: 'writing.ribbon.group_world',
            controls: [
                {
                    id: 'entry-link',
                    type: 'button',
                    icon: 'fa-solid fa-link',
                    labelKey: 'writing.ribbon.entry_link',
                    visible: editable,
                    // Screenplay entry links only live in action blocks.
                    disabled: (ctx) =>
                        ctx.format === 'screenplay' && ctx.editor?.currentElement() !== 'action',
                    onAction: (ctx) => ctx.editor?.insertEntryLink(),
                },
            ],
        },
        {
            id: 'view',
            labelKey: 'writing.ribbon.group_view',
            controls: [
                {
                    id: 'print-layout',
                    type: 'toggle',
                    icon: 'fa-solid fa-ruler-combined',
                    labelKey: 'writing.ribbon.print_layout',
                    shortcut: 'Mod-Shift-L',
                    active: (ctx) => ctx.printLayout,
                    onAction: (ctx) => ctx.actions.togglePrintLayout(),
                },
                {
                    id: 'panel',
                    type: 'toggle',
                    icon: 'fa-solid fa-table-columns',
                    labelKey: 'writing.ribbon.panel',
                    // NOT Mod-Shift-P — that's Firefox's private-window chord.
                    shortcut: 'Mod-Shift-O',
                    active: (ctx) => ctx.panelOpen,
                    onAction: (ctx) => ctx.actions.togglePanel(),
                },
                {
                    id: 'code-view',
                    type: 'toggle',
                    icon: 'fa-solid fa-code',
                    labelKey: 'writing.ribbon.code_view',
                    visible: (ctx) => ctx.format === 'prose',
                    active: (ctx) => ctx.editor?.isCodeView() ?? false,
                    onAction: (ctx) => ctx.editor?.toggleCodeView(),
                },
                {
                    id: 'editor-help',
                    type: 'button',
                    icon: 'fa-solid fa-circle-question',
                    labelKey: 'writing.ribbon.editor_help',
                    visible: (ctx) => ctx.format === 'prose',
                    onAction: (ctx) => ctx.editor?.openHelp(),
                },
            ],
        },
    ],
};

const structureTab: RibbonTab<Ctx> = {
    id: 'structure',
    labelKey: 'writing.ribbon.tab_structure',
    groups: [
        {
            id: 'sections',
            labelKey: 'writing.ribbon.group_sections',
            controls: [
                {
                    id: 'add-section',
                    type: 'button',
                    icon: 'fa-solid fa-plus',
                    labelKey: 'writing.ribbon.add_section',
                    visible: editable,
                    onAction: (ctx) => ctx.actions.addSection(),
                },
                {
                    id: 'add-inside',
                    type: 'button',
                    icon: 'fa-solid fa-indent',
                    labelKey: 'writing.ribbon.add_inside',
                    visible: editable,
                    disabled: (ctx) => !ctx.hasSection,
                    onAction: (ctx) => ctx.actions.addInside(),
                },
                {
                    id: 'delete-section',
                    type: 'button',
                    icon: 'fa-solid fa-trash-can',
                    labelKey: 'writing.ribbon.delete_section',
                    visible: editable,
                    disabled: (ctx) => !ctx.hasSection,
                    onAction: (ctx) => ctx.actions.deleteSection(),
                },
            ],
        },
        {
            id: 'plan',
            labelKey: 'writing.ribbon.group_plan',
            controls: [
                {
                    id: 'targets',
                    type: 'button',
                    icon: 'fa-solid fa-bullseye',
                    labelKey: 'writing.ribbon.targets',
                    // Settings save work targets — mutating, so canUpdate-gated.
                    visible: editable,
                    onAction: (ctx) => ctx.actions.openSettings(),
                },
            ],
        },
        {
            // RESERVED — writing guidance (#42) contributes its controls
            // here via extendRibbonTabs('writing', [{ tabId: 'structure',
            // groupId: 'guidance', controls: [...] }]). The group must
            // exist for groupId contributions to land; an empty-controls
            // group renders nothing.
            id: 'guidance',
            labelKey: 'writing.ribbon.group_guidance',
            controls: [],
        },
    ],
};

const reviewTab: RibbonTab<Ctx> = {
    id: 'review',
    labelKey: 'writing.ribbon.tab_review',
    groups: [
        {
            id: 'reports',
            labelKey: 'writing.ribbon.group_reports',
            controls: [
                {
                    id: 'open-reports',
                    type: 'button',
                    icon: 'fa-solid fa-chart-simple',
                    labelKey: 'writing.ribbon.reports',
                    shortcut: 'Mod-Alt-R',
                    onAction: (ctx) => ctx.actions.openReports(),
                },
            ],
        },
        {
            // RESERVED — the craft suite (Stage 8g.2,
            // lonely-lights/alexandria-craft) registers its analyzers via
            // extendRibbonTabs('writing', [{ tabId: 'review', groupId:
            // 'craft', controls: [...] }]). Empty groups render nothing
            // but must exist for the contribution merge to land.
            id: 'craft',
            labelKey: 'writing.ribbon.group_craft',
            controls: [],
        },
    ],
};

const workTab: RibbonTab<Ctx> = {
    id: 'work',
    labelKey: 'writing.ribbon.tab_work',
    groups: [
        {
            id: 'work',
            labelKey: 'writing.ribbon.group_work',
            controls: [
                {
                    id: 'work-settings',
                    type: 'button',
                    icon: 'fa-solid fa-gear',
                    labelKey: 'writing.ribbon.settings',
                    // No shortcut — Mod-, is the OS/browser settings chord on mac.
                    visible: editable,
                    onAction: (ctx) => ctx.actions.openSettings(),
                },
                {
                    id: 'work-status',
                    type: 'select',
                    icon: 'fa-solid fa-flag',
                    labelKey: 'writing.ribbon.status',
                    visible: editable,
                    options: () =>
                        WORK_STATUSES.map((status) => ({
                            value: status,
                            labelKey: `writing.statuses.${status}`,
                        })),
                    value: (ctx) => ctx.workStatus,
                    onAction: (ctx, value) => {
                        if (value !== undefined) {
                            ctx.actions.setStatus(value);
                        }
                    },
                },
            ],
        },
        {
            // RESERVED — future export tooling (manuscript/PDF/Fountain
            // export) contributes controls here when it ships.
            id: 'export',
            labelKey: 'writing.ribbon.group_export',
            controls: [],
        },
        {
            // RESERVED — workspace add-ons (#27) contribute controls here
            // via extendRibbonTabs('writing', [{ tabId: 'work', groupId:
            // 'addons', controls: [...] }]).
            id: 'addons',
            labelKey: 'writing.ribbon.group_addons',
            controls: [],
        },
        {
            id: 'goto',
            labelKey: 'writing.ribbon.group_goto',
            controls: [
                {
                    id: 'all-works',
                    type: 'button',
                    icon: 'fa-solid fa-folder-open',
                    labelKey: 'writing.ribbon.all_works',
                    onAction: (ctx) => ctx.actions.goToIndex(),
                },
                {
                    id: 'writing-home',
                    type: 'button',
                    icon: 'fa-solid fa-pen-nib',
                    labelKey: 'writing.ribbon.writing_home',
                    onAction: (ctx) => ctx.actions.goToDashboard(),
                },
            ],
        },
    ],
};

/** Exported raw for tests — the registry deep-merges a copy at read time. */
export const WRITING_TABS: RibbonTab<Ctx>[] = [writeTab, structureTab, reviewTab, workTab];

let registered = false;

/** Idempotent — Workspace.tsx calls this at module scope. */
export function registerWritingRibbon(): void {
    if (registered) {
        return;
    }

    registered = true;
    registerRibbonTabs('writing', WRITING_TABS as RibbonTab<unknown>[]);
}
