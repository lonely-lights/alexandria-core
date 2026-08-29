import { ELEMENTS } from '@alexandria/editor/screenplay/formatSpec';
import { registerRibbonTabs } from '@alexandria/ribbon/ribbonRegistry';
import type { RibbonControl, RibbonTab } from '@alexandria/ribbon/types';

import { FONT_SIZE_PRESETS } from '../fontSize';
import type { WritingRibbonContext } from './writingRibbonContext';

/**
 * The writing workspace's ribbon tabs (Ribbon Plan 2 Task 1) —
 * File / Edit / View. Controls are pure
 * data over WritingRibbonContext; the Workspace registers them once
 * at module scope via registerWritingRibbon().
 *
 * Shortcut policy: the ribbon declares NO shortcut where the editor
 * already binds one internally (TipTap owns Mod-B/I/U etc.) — only
 * workspace-level chords live here, chosen off the browser-reserved
 * list (Mod-Shift-O panel, Mod-Shift-L print layout).
 */

type Ctx = WritingRibbonContext;

const proseEditable = (ctx: Ctx): boolean => ctx.format === 'prose' && ctx.canUpdate;
const screenplayEditable = (ctx: Ctx): boolean => ctx.format === 'screenplay' && ctx.canUpdate;
const editable = (ctx: Ctx): boolean => ctx.canUpdate;
const zoomOptions = ['75', '90', '100', '110', '125', '150'];
const paperColorOptions = ['theme', 'white', 'ivory', 'cream', 'gray'];
const pageDisplayOptions = ['tight', 'pages'];
const proseStyleOptions = ['normal', 'title', 'subtitle', 'heading1', 'heading2', 'heading3', 'save-preset'];

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
        menuShortcut: `Mod-${id[0].toUpperCase()}`,
        visible: proseEditable,
        active: (ctx) => ctx.editor?.isMarkActive(id) ?? false,
        onAction: (ctx) => ctx.editor?.toggleMark(id),
    };
}

const fileTab: RibbonTab<Ctx> = {
    id: 'file',
    labelKey: 'writing.ribbon.tab_file',
    groups: [
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
        {
            id: 'sections',
            labelKey: 'writing.ribbon.group_sections',
            controls: [
                {
                    id: 'work-settings',
                    type: 'button',
                    icon: 'fa-solid fa-gear',
                    labelKey: 'writing.ribbon.settings',
                    visible: editable,
                    onAction: (ctx) => ctx.actions.openSettings(),
                },
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
            ],
        },
        {
            id: 'export',
            labelKey: 'writing.ribbon.group_export',
            controls: [
                {
                    // FDX Gateway Task 5. Visible regardless of canUpdate —
                    // export only needs works.export.fdx's `can:view,work`
                    // server-side, no update permission (a read-only viewer
                    // can still export what they can read).
                    id: 'export-fdx',
                    type: 'button',
                    icon: 'fa-solid fa-file-export',
                    labelKey: 'writing.fdx.export_action',
                    onAction: (ctx) => ctx.actions.openExportFdx(),
                },
                {
                    // Visible regardless of canUpdate: import creates a
                    // brand-new sibling Work (works.import.fdx authorizes
                    // against the PROJECT's work.create permission, not
                    // this work's canUpdate) — same reasoning as the
                    // always-visible goto controls above.
                    id: 'import-fdx',
                    type: 'button',
                    icon: 'fa-solid fa-file-import',
                    labelKey: 'writing.fdx.import_action',
                    onAction: (ctx) => ctx.actions.importFdx(),
                },
                {
                    // Placeholder — manuscript/PDF/Fountain export ships later.
                    id: 'export-stub',
                    type: 'button',
                    icon: 'fa-solid fa-file-export',
                    labelKey: 'writing.ribbon.export_coming',
                    disabled: () => true,
                    onAction: () => { /* stub — export not yet implemented */ },
                },
            ],
        },
        {
            // Scoped revisions (Stage 9). Requires update — marking a
            // revision authorizes against works.revisions.store's
            // `can:update,work`, same as add/delete section above.
            id: 'revisions',
            labelKey: 'writing.ribbon.group_revisions',
            controls: [
                {
                    id: 'mark-revision',
                    type: 'button',
                    icon: 'fa-solid fa-clock-rotate-left',
                    labelKey: 'writing.revisions.mark_action',
                    visible: editable,
                    onAction: (ctx) => ctx.actions.openMarkRevision(),
                },
            ],
        },
    ],
};

const editTab: RibbonTab<Ctx> = {
    id: 'edit',
    labelKey: 'writing.ribbon.tab_edit',
    groups: [
        {
            id: 'history-view',
            labelKey: 'writing.ribbon.group_history_view',
            controls: [
                {
                    id: 'undo',
                    type: 'button',
                    icon: 'fa-solid fa-rotate-left',
                    labelKey: 'writing.ribbon.undo',
                    menuShortcut: 'Mod-Z',
                    visible: editable,
                    disabled: (ctx) => !(ctx.editor?.canUndo() ?? false),
                    onAction: (ctx) => ctx.editor?.undo(),
                },
                {
                    id: 'redo',
                    type: 'button',
                    icon: 'fa-solid fa-rotate-right',
                    labelKey: 'writing.ribbon.redo',
                    menuShortcut: 'Shift-Mod-Z',
                    visible: editable,
                    disabled: (ctx) => !(ctx.editor?.canRedo() ?? false),
                    onAction: (ctx) => ctx.editor?.redo(),
                },
                {
                    id: 'zoom',
                    type: 'select',
                    icon: 'fa-solid fa-magnifying-glass-plus',
                    labelKey: 'writing.ribbon.zoom',
                    options: () =>
                        zoomOptions.map((value) => ({
                            value,
                            labelKey: `writing.ribbon.zoom_${value}`,
                        })),
                    value: (ctx) => ctx.zoom,
                    onAction: (ctx, value) => {
                        if (value !== undefined) {
                            ctx.actions.setZoom(value);
                        }
                    },
                },
            ],
        },
        {
            id: 'text',
            labelKey: 'writing.ribbon.group_text',
            controls: [
                {
                    id: 'block-style',
                    type: 'select',
                    icon: 'fa-solid fa-paragraph',
                    labelKey: 'writing.ribbon.style',
                    visible: editable,
                    options: (ctx) => {
                        const values = ctx.format === 'screenplay'
                            ? [...ELEMENTS, 'save-preset']
                            : proseStyleOptions;

                        return values.map((value) => ({
                            value,
                            labelKey: ctx.format === 'screenplay' && value !== 'save-preset'
                                ? `writing.elements.${value}`
                                : `writing.ribbon.style_${value.replace('-', '_')}`,
                        }));
                    },
                    value: (ctx) => {
                        const current = ctx.editor?.currentBlockStyle();

                        if (ctx.format === 'screenplay') {
                            return current && (ELEMENTS as string[]).includes(current) ? current : 'action';
                        }

                        return current ?? 'normal';
                    },
                    onAction: (ctx, value) => {
                        if (value === undefined || value === 'save-preset') {
                            return;
                        }

                        ctx.editor?.setBlockStyle(value);
                    },
                },
                {
                    /* Base size for the whole manuscript, not the
                       selection — wiki markup has no size syntax, so
                       selection-level sizing waits for a format that
                       can store it. Prose only: screenplay is 12pt
                       Courier by industry convention. */
                    id: 'font-size',
                    type: 'combo',
                    icon: 'fa-solid fa-text-size',
                    labelKey: 'writing.ribbon.font_size',
                    visible: (ctx) => ctx.format === 'prose',
                    options: () =>
                        FONT_SIZE_PRESETS.map((value) => ({
                            value,
                            labelKey: `writing.ribbon.font_size_${value}`,
                        })),
                    value: (ctx) => ctx.fontSize,
                    onAction: (ctx, value) => {
                        if (value !== undefined) {
                            ctx.actions.setFontSize(value);
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
                {
                    id: 'scene-links-panel-edit',
                    type: 'toggle',
                    icon: 'fa-solid fa-link',
                    labelKey: 'writing.ribbon.scene_links',
                    visible: (ctx) => ctx.format === 'screenplay' && ctx.hasSection,
                    active: (ctx) => ctx.sceneLinksPanelOpen,
                    onAction: (ctx) => ctx.actions.toggleSceneLinksPanel(),
                },
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
            controls: [],
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
    ],
};

const viewTab: RibbonTab<Ctx> = {
    id: 'view',
    labelKey: 'writing.ribbon.tab_view',
    groups: [
        {
            id: 'display',
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
                    id: 'outline-view',
                    type: 'toggle',
                    icon: 'fa-solid fa-list-tree',
                    labelKey: 'writing.ribbon.outline_view',
                    active: (ctx) => ctx.viewMode === 'outline',
                    onAction: (ctx) =>
                        ctx.actions.setViewMode(ctx.viewMode === 'outline' ? 'continuous' : 'outline'),
                },
                {
                    id: 'kanban-view',
                    type: 'toggle',
                    icon: 'fa-solid fa-table-columns',
                    labelKey: 'writing.ribbon.kanban_view',
                    active: (ctx) => ctx.viewMode === 'kanban',
                    onAction: (ctx) =>
                        ctx.actions.setViewMode(ctx.viewMode === 'kanban' ? 'continuous' : 'kanban'),
                },
                {
                    id: 'show-plan',
                    type: 'toggle',
                    icon: 'fa-solid fa-list-check',
                    labelKey: 'writing.ribbon.show_plan',
                    active: (ctx) => ctx.showPlan,
                    onAction: (ctx) => ctx.actions.toggleShowPlan(),
                },
                {
                    /* Sits beside print layout because it only means
                       anything inside it — the two describe one idea of
                       "show me paper". */
                    id: 'page-display',
                    type: 'select',
                    icon: 'fa-solid fa-file-lines',
                    labelKey: 'writing.flow.page_display',
                    // Prose only: the bands are a RichTextEditor
                    // decoration, and ScreenplayEditor keeps its own
                    // pagination conventions.
                    visible: (ctx) => ctx.format === 'prose',
                    options: () =>
                        pageDisplayOptions.map((value) => ({
                            value,
                            labelKey: `writing.flow.page_display_${value}`,
                        })),
                    value: (ctx) => ctx.pageDisplay,
                    onAction: (ctx, value) => {
                        if (value !== undefined) {
                            ctx.actions.setPageDisplay(value);
                        }
                    },
                },
                {
                    id: 'paper-color',
                    type: 'select',
                    icon: 'fa-solid fa-circle-half-stroke',
                    labelKey: 'writing.ribbon.paper_color',
                    options: () =>
                        paperColorOptions.map((value) => ({
                            value,
                            labelKey: `writing.ribbon.paper_${value}`,
                        })),
                    value: (ctx) => ctx.paperColor,
                    onAction: (ctx, value) => {
                        if (value !== undefined) {
                            ctx.actions.setPaperColor(value);
                        }
                    },
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
                    id: 'scene-links-panel',
                    type: 'toggle',
                    icon: 'fa-solid fa-link',
                    labelKey: 'writing.ribbon.scene_links',
                    visible: (ctx) => ctx.format === 'screenplay' && ctx.hasSection,
                    active: (ctx) => ctx.sceneLinksPanelOpen,
                    onAction: (ctx) => ctx.actions.toggleSceneLinksPanel(),
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

/** Exported raw for tests — the registry deep-merges a copy at read time. */
export const WRITING_TABS: RibbonTab<Ctx>[] = [fileTab, editTab, viewTab];

let registered = false;

/** Idempotent — Workspace.tsx calls this at module scope. */
export function registerWritingRibbon(): void {
    if (registered) {
        return;
    }

    registered = true;
    registerRibbonTabs('writing', WRITING_TABS as RibbonTab[]);
}
