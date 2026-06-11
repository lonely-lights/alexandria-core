import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { useRef, useState, type CSSProperties, type MouseEvent } from 'react';

import Select from '@alexandria/components/form/Select';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import Tooltip from '@alexandria/components/ui/Tooltip';
import { parseScreenplay, serializeScreenplay } from '@alexandria/editor/screenplay/codec';
import {
    blocksToDoc,
    buildScreenplayExtensions,
    docToBlocks,
} from '@alexandria/editor/screenplay/extensions';
import { ELEMENTS } from '@alexandria/editor/screenplay/formatSpec';
import type { ScreenplayElement } from '@alexandria/editor/screenplay/types';
import useT from '@alexandria/hooks/useT';

import ManuscriptRuler from '@alexandria/components/editor/ManuscriptRuler';

import {
    PRINT_LAYOUT_STORAGE_KEY,
    readPrintLayoutPreference,
    type ManuscriptEditorProps,
} from './ManuscriptEditor';
import SectionChrome from './SectionChrome';
import useSectionAutosave from './useSectionAutosave';

// Same platform sniff RichTextEditor uses for shortcut labels.
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

/**
 * Workspace screenplay editor — Stage 8g.1 (Plan 3 Task 2).
 *
 * The center pane for `format: 'screenplay'` sections: same shell
 * contract as ManuscriptEditor (the shared SectionChrome menu bar +
 * counts footer, autosave via the shared useSectionAutosave hook), but
 * the writing surface is a schema-constrained TipTap instance whose
 * document only admits the six screenplay block nodes
 * (editor/screenplay/extensions.ts). Storage format is the
 * Fountain-flavored codec text (editor/screenplay/codec.ts).
 *
 * The chrome root carries BOTH `rte-manuscript` and `rte-screenplay`,
 * so the desk/sheet/print geometry comes from manuscript.css and the
 * Courier voice + element indents from screenplay.css.
 */

/* ── Theme styles ── */

const toolbarStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

/** Compact icon button — same idiom as RichTextEditor's toolbar buttons. */
function ToolbarIconButton({
    onMouseDown,
    active = false,
    disabled = false,
    icon,
    pressed,
}: {
    onMouseDown: (e: MouseEvent) => void;
    active?: boolean;
    disabled?: boolean;
    icon: string;
    pressed?: boolean;
}) {
    return (
        <button
            type="button"
            onMouseDown={onMouseDown}
            disabled={disabled}
            aria-pressed={pressed}
            className={`alex-toolbar-btn inline-flex h-8 w-8 items-center justify-center text-sm transition-colors ${active ? 'alex-toolbar-btn--active' : ''}`}
            style={{
                background: active
                    ? 'color-mix(in srgb, var(--theme-brand-secondary-500) 18%, transparent)'
                    : 'transparent',
                color: active
                    ? 'var(--theme-brand-secondary-500)'
                    : 'var(--theme-base-content)',
                borderRadius: 'var(--theme-radius-button)',
                opacity: disabled ? 0.4 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
            }}
        >
            <i className={`fa-solid ${icon}`} />
        </button>
    );
}

/* ── Editable surface ── */

interface ScreenplaySurfaceProps {
    projectId: number;
    initialContent: string;
    printLayout: boolean;
    onTogglePrintLayout: () => void;
    /** Receives the codec-serialized doc, 300ms-debounced. */
    onSerialized: (serialized: string) => void;
}

/**
 * The TipTap instance lives in its own component so the read-only path
 * never constructs an editor (hooks must run unconditionally).
 */
function ScreenplaySurface({
    projectId,
    initialContent,
    printLayout,
    onTogglePrintLayout,
    onSerialized,
}: ScreenplaySurfaceProps) {
    const t = useT();
    const [showKeys, setShowKeys] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const editor = useEditor({
        extensions: buildScreenplayExtensions({ projectId }),
        content: blocksToDoc(parseScreenplay(initialContent)),
        onUpdate: ({ editor: e }) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                onSerialized(serializeScreenplay(docToBlocks(e.getJSON())));
            }, 300);
        },
    });

    // The current selection's block element drives the indicator
    // Select; useEditorState subscribes to transactions, so it tracks
    // selectionUpdate without shouldRerenderOnTransaction.
    const currentElement = useEditorState({
        editor,
        selector: ({ editor: e }): ScreenplayElement => {
            const name = e?.state.selection.$from.parent.type.name ?? '';

            return (ELEMENTS as string[]).includes(name)
                ? (name as ScreenplayElement)
                : 'action';
        },
    }) ?? 'action';

    // Forward desk-gutter clicks into the editor (the sheet is
    // narrower than the pane) — same affordance as RichTextEditor's
    // manuscript mode.
    function handleGutterMouseDown(e: MouseEvent<HTMLDivElement>) {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        editor?.commands.focus('end');
    }

    if (!editor) return null;

    return (
        <>
            {/* Toolbar — element indicator + entry link left, ruler + help right */}
            <div className="flex shrink-0 items-center justify-between p-2" style={toolbarStyle}>
                <div className="flex items-center gap-2">
                    <div className="w-44">
                        <Select
                            size="sm"
                            aria-label={t('writing.workspace.element')}
                            options={ELEMENTS.map((element) => ({
                                value: element,
                                label: t(`writing.elements.${element}`),
                            }))}
                            value={currentElement}
                            onChange={(e) => {
                                editor.chain().focus().setNode(e.target.value).run();
                            }}
                        />
                    </div>
                    <Tooltip content={t('editor.toolbar.entry_link.title')}>
                        <ToolbarIconButton
                            icon="fa-file-lines"
                            disabled={currentElement !== 'action'}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                editor.chain().focus().insertContent('[[').run();
                            }}
                        />
                    </Tooltip>
                </div>
                <div className="flex items-center gap-1">
                    <Tooltip content={t('writing.workspace.print_layout')}>
                        <ToolbarIconButton
                            icon="fa-ruler-horizontal"
                            active={printLayout}
                            pressed={printLayout}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onTogglePrintLayout();
                            }}
                        />
                    </Tooltip>
                    <Tooltip content={t('writing.workspace.keys_title')}>
                        <ToolbarIconButton
                            icon="fa-circle-question"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setShowKeys(true);
                            }}
                        />
                    </Tooltip>
                </div>
            </div>

            {/* Print-layout ruler — pinned between toolbar and the scrolling page */}
            {printLayout && <ManuscriptRuler />}

            {/* The sheet — the content wrapper scrolls; geometry from
                manuscript.css, element layout from screenplay.css */}
            <EditorContent
                editor={editor}
                className="tiptap-editor min-h-0 flex-1 overflow-y-auto"
                onMouseDown={handleGutterMouseDown}
            />

            {/* Keyboard-flow help */}
            <Modal open={showKeys} onClose={() => setShowKeys(false)} maxWidth="max-w-md">
                <ModalHeader title={t('writing.workspace.keys_title')} onClose={() => setShowKeys(false)} />
                <div className="space-y-3 p-6 text-sm">
                    {(['keys_enter', 'keys_tab', 'keys_paren', 'keys_elements'] as const).map((key) => (
                        <div key={key} className="flex items-start gap-3">
                            <kbd
                                className="mt-0.5 shrink-0 px-1.5 py-0.5 font-mono text-xs"
                                style={{
                                    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                                    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
                                    borderRadius: 'var(--theme-radius-button)',
                                    color: 'var(--theme-base-content)',
                                }}
                            >
                                {key === 'keys_enter'
                                    ? 'Enter'
                                    : key === 'keys_tab'
                                        ? 'Tab'
                                        : key === 'keys_paren'
                                            ? '('
                                            : isMac
                                                ? '⌘⌥ 0–5'
                                                : 'Ctrl+Alt+0–5'}
                            </kbd>
                            <p className="min-w-0">{t(`writing.workspace.${key}`)}</p>
                        </div>
                    ))}
                </div>
            </Modal>
        </>
    );
}

/* ── Component ── */

export default function ScreenplayEditor({
    projectId,
    projectSlug,
    workSlug,
    section,
    canUpdate,
    onCounts,
}: ManuscriptEditorProps) {
    const { status, wordCount, pageEstimate, noteChange, initialContent } =
        useSectionAutosave({ projectSlug, workSlug, section, onCounts });
    const [printLayout, setPrintLayout] = useState(readPrintLayoutPreference);

    function togglePrintLayout() {
        const next = !printLayout;
        setPrintLayout(next);
        try {
            localStorage.setItem(PRINT_LAYOUT_STORAGE_KEY, String(next));
        } catch {
            // Storage unavailable (private mode / quota) — the toggle
            // still works for this session.
        }
    }

    return (
        <SectionChrome
            projectSlug={projectSlug}
            workSlug={workSlug}
            section={section}
            canUpdate={canUpdate}
            status={status}
            wordCount={wordCount}
            pageEstimate={pageEstimate}
            className={`rte-manuscript rte-screenplay${printLayout && canUpdate ? ' rte-manuscript--print' : ''}`}
        >
            {canUpdate ? (
                <ScreenplaySurface
                    projectId={projectId}
                    initialContent={initialContent}
                    printLayout={printLayout}
                    onTogglePrintLayout={togglePrintLayout}
                    onSerialized={noteChange}
                />
            ) : (
                /* Read-only: the parsed blocks as styled static markup
                   inside the sheet — no editor instance. The class
                   names reuse the desk/sheet/element CSS directly. */
                <div className="tiptap-editor min-h-0 flex-1 overflow-y-auto">
                    <div className="ProseMirror">
                        {parseScreenplay(initialContent).map((block, index) => (
                            <p
                                key={index}
                                data-element={block.element}
                                className={`sp-${block.element} whitespace-pre-wrap`}
                            >
                                {block.text}
                            </p>
                        ))}
                    </div>
                </div>
            )}
        </SectionChrome>
    );
}
