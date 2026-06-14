import { ELEMENTS } from '@alexandria/editor/screenplay/formatSpec';
import { registerRibbonTabs } from '@alexandria/ribbon/ribbonRegistry';
import type { RibbonControl, RibbonTab } from '@alexandria/ribbon/types';

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
            // RESERVED — future export tooling (manuscript/PDF/Fountain
            // export) contributes controls here when it ships.
            id: 'export',
            labelKey: 'writing.ribbon.group_export',
            controls: [],
        },
    ],
};

const editTab: RibbonTab<Ctx> = {
    id: 'edit',
    labelKey: 'writing.ribbon.tab_edit',
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
                    id: 'neutral-chrome',
                    type: 'toggle',
                    icon: 'fa-solid fa-circle-half-stroke',
                    labelKey: 'writing.ribbon.neutral_chrome',
                    active: (ctx) => ctx.neutralChrome,
                    onAction: (ctx) => ctx.actions.toggleNeutralChrome(),
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

/** Exported raw for tests — the registry deep-merges a copy at read time. */
export const WRITING_TABS: RibbonTab<Ctx>[] = [fileTab, editTab, viewTab];

let registered = false;

/** Idempotent — Workspace.tsx calls this at module scope. */
export function registerWritingRibbon(): void {
    if (registered) {
        return;
    }

    registered = true;
    registerRibbonTabs('writing', WRITING_TABS as RibbonTab<unknown>[]);
}
