import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type MouseEvent, type Ref } from 'react';

import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import { parseScreenplay, serializeScreenplay } from '@alexandria/editor/screenplay/codec';
import {
    blocksToDoc,
    buildScreenplayExtensions,
    convertCurrentBlock,
    docToBlocks,
} from '@alexandria/editor/screenplay/extensions';
import { ELEMENTS } from '@alexandria/editor/screenplay/formatSpec';
import type { ScreenplayElement } from '@alexandria/editor/screenplay/types';
import useT from '@alexandria/hooks/useT';

import ManuscriptRuler from '@alexandria/components/editor/ManuscriptRuler';

import {
    readPrintLayoutPreference,
    type ManuscriptEditorProps,
} from './ManuscriptEditor';
import type { WritingEditorBridge } from '../ribbon/writingRibbonContext';
import SectionChrome from './SectionChrome';
import useSectionAutosave from './useSectionAutosave';

// Same platform sniff RichTextEditor uses for shortcut labels.
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

/**
 * Workspace screenplay editor — Stage 8g.1 (Plan 3 Task 2).
 *
 * The center pane for `format: 'screenplay'` sections: same shell
 * contract as ManuscriptEditor (the shared SectionChrome identity
 * strip, autosave via the shared useSectionAutosave hook), but
 * the writing surface is a schema-constrained TipTap instance whose
 * document only admits the six screenplay block nodes
 * (editor/screenplay/extensions.ts). Storage format is the
 * Fountain-flavored codec text (editor/screenplay/codec.ts).
 *
 * Ribbon Plan 2: the surface is headless — the old toolbar (element
 * select, entry-link, ruler toggle, help) is gone; the workspace
 * ribbon drives everything through `bridgeRef`. `printLayout` is owned
 * by the Workspace; the keys modal stays mounted here, opened via
 * `bridge.openHelp()`.
 *
 * The chrome root carries BOTH `rte-manuscript` and `rte-screenplay`,
 * so the desk/sheet/print geometry comes from manuscript.css and the
 * Courier voice + element indents from screenplay.css.
 */

/* ── Editable surface ── */

interface ScreenplaySurfaceProps {
    projectId: number;
    initialContent: string;
    printLayout: boolean;
    /** Ribbon editor bridge (Ribbon Plan 2) — element commands + queries. */
    bridgeRef?: Ref<WritingEditorBridge>;
    /** Fires when the selection's element changes — the Workspace bumps `editorTick`. */
    onStateChange?: () => void;
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
    bridgeRef,
    onStateChange,
    onSerialized,
}: ScreenplaySurfaceProps) {
    const t = useT();
    const [showKeys, setShowKeys] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onStateChangeRef = useRef(onStateChange);
    onStateChangeRef.current = onStateChange;

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

    // Section switches remount this component (Workspace keys the
    // editor by section id) — clear the debounce on unmount so a stale
    // timer never fires onSerialized into the dead instance.
    useEffect(() => {
        return () => {
            if (debounceRef.current !== null) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    // The current selection's block element. The toolbar indicator it
    // used to feed is gone (Ribbon Plan 2), but useEditorState's
    // transaction subscription remains the change signal the ribbon
    // needs: when the element under the cursor changes, tick the host
    // so bridge-driven states (element select value, entry-link
    // disabling) re-read.
    const currentElement = useEditorState({
        editor,
        selector: ({ editor: e }): ScreenplayElement => {
            const name = e?.state.selection.$from.parent.type.name ?? '';

            return (ELEMENTS as string[]).includes(name)
                ? (name as ScreenplayElement)
                : 'action';
        },
    }) ?? 'action';

    useEffect(() => {
        onStateChangeRef.current?.();
    }, [currentElement]);

    // Ribbon editor bridge (Ribbon Plan 2 Task 2) — recreated per
    // render so it always closes over the current editor. Prose-only
    // methods are safe no-ops: the schema makes marks/headings/lists
    // impossible by construction.
    useImperativeHandle(bridgeRef, (): WritingEditorBridge => ({
        toggleMark() {},
        toggleList() {},
        toggleHeading() {},
        isMarkActive: () => false,
        setElement(element) {
            if (!editor || !(ELEMENTS as string[]).includes(element)) return;
            editor.commands.focus();
            convertCurrentBlock(editor, element as ScreenplayElement);
        },
        currentElement() {
            const name = editor?.state.selection.$from.parent.type.name ?? '';

            return (ELEMENTS as string[]).includes(name) ? name : null;
        },
        insertEntryLink() {
            // Entry links only live in action blocks — no-op elsewhere
            // (the ribbon control disables itself off currentElement()).
            if (!editor || editor.state.selection.$from.parent.type.name !== 'action') return;
            editor.chain().focus().insertContent('[[').run();
        },
        openHelp() {
            setShowKeys(true);
        },
        toggleCodeView() {},
        isCodeView: () => false,
        focus() {
            editor?.commands.focus();
        },
    }));

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
            {/* Print-layout ruler — pinned above the scrolling page */}
            {printLayout && <ManuscriptRuler />}

            {/* The sheet — the content wrapper scrolls; geometry from
                manuscript.css, element layout from screenplay.css */}
            <EditorContent
                editor={editor}
                className="tiptap-editor min-h-0 flex-1 overflow-y-auto"
                onMouseDown={handleGutterMouseDown}
            />

            {/* Keyboard-flow help — opened via bridge.openHelp() */}
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
    printLayout,
    bridgeRef,
    onStateChange,
}: ManuscriptEditorProps) {
    const { status, noteChange, initialContent } =
        useSectionAutosave({ projectSlug, workSlug, section, onCounts });

    // Read the stored preference ONCE (a function-call prop default
    // would re-read localStorage every render). The `??` fallback keeps
    // the editor self-sufficient until the Workspace passes the prop
    // (Ribbon Plan 2 Task 3 always does).
    const storedPrintLayout = useMemo(readPrintLayoutPreference, []);
    const effectivePrintLayout = printLayout ?? storedPrintLayout;

    return (
        <SectionChrome
            projectSlug={projectSlug}
            workSlug={workSlug}
            section={section}
            canUpdate={canUpdate}
            status={status}
            className={`rte-manuscript rte-screenplay${effectivePrintLayout && canUpdate ? ' rte-manuscript--print' : ''}`}
        >
            {canUpdate ? (
                <ScreenplaySurface
                    projectId={projectId}
                    initialContent={initialContent}
                    printLayout={effectivePrintLayout}
                    bridgeRef={bridgeRef}
                    onStateChange={onStateChange}
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
                                key={`${index}-${block.element}`}
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
