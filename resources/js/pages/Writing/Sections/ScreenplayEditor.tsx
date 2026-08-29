import type { Editor } from '@tiptap/core';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type MouseEvent, type Ref } from 'react';

import EntryHoverCard from '@alexandria/components/entries/EntryHoverCard';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import { parseScreenplay, serializeScreenplay } from '@alexandria/editor/screenplay/codec';
import {
    blocksToDoc,
    buildScreenplayExtensions,
    convertCurrentBlock,
    docToBlocks,
} from '@alexandria/editor/screenplay/extensions';
import { ELEMENTS } from '@alexandria/editor/screenplay/formatSpec';
import {
    extractScreenplaySceneLinks,
    type ScreenplaySceneLink,
} from '@alexandria/editor/screenplay/sceneLinks';
import type { ScreenplayElement } from '@alexandria/editor/screenplay/types';
import AddCommentBubble from '@alexandria/editor/extensions/AddCommentBubble';
import MarkDeviceBubble from '@alexandria/editor/extensions/MarkDeviceBubble';
import { applySheetMargins } from '@alexandria/editor/extensions/pageBreakDecorations';
import useT from '@alexandria/hooks/useT';

import ManuscriptRuler from '@alexandria/components/editor/ManuscriptRuler';

import {
    readPrintLayoutPreference,
    type ManuscriptEditorProps,
} from './ManuscriptEditor';
import type { WritingEditorBridge } from '../ribbon/writingRibbonContext';
import * as bridge from '@alexandria/editor/extensions/commentBridgeHelpers';
import SectionChrome from './SectionChrome';
import useSectionAutosave from './useSectionAutosave';

// Same platform sniff RichTextEditor uses for shortcut labels.
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
type HistoryCommand = 'undo' | 'redo';
type ScreenplayKeyHelp = 'keys_enter' | 'keys_tab' | 'keys_paren' | 'keys_elements';

const SCREENPLAY_KEY_HELP: ScreenplayKeyHelp[] = [
    'keys_enter',
    'keys_tab',
    'keys_paren',
    'keys_elements',
];

function runHistoryCommand(editor: Editor | null, command: HistoryCommand): void {
    const chain = editor?.chain().focus() as (Record<HistoryCommand, unknown> & { run?: () => boolean }) | undefined;
    const fn = chain?.[command];

    if (typeof fn !== 'function') {
        return;
    }

    const runnable = fn.call(chain) as { run?: () => boolean };
    runnable.run?.();
}

function canRunHistoryCommand(editor: Editor | null, command: HistoryCommand): boolean {
    const chain = editor?.can().chain() as (Record<HistoryCommand, unknown> & { run?: () => boolean }) | undefined;
    const fn = chain?.[command];

    if (typeof fn !== 'function') {
        return false;
    }

    const runnable = fn.call(chain) as { run?: () => boolean };

    return runnable.run?.() ?? false;
}

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
    /**
     * Who owns the scroll. `'parent'` drops the internal scrollport (and
     * the rulers) so a stacked container can scroll many sections as one
     * continuous flow; `'self'` is today's bounded, self-scrolling pane.
     */
    scrollMode?: 'self' | 'parent';
    /** Side margin in proportional inches (ruler-draggable). */
    marginXIn?: number;
    /** Ribbon editor bridge (Ribbon Plan 2) — element commands + queries. */
    bridgeRef?: Ref<WritingEditorBridge>;
    /** Fires when the selection's element changes — the Workspace bumps `editorTick`. */
    onStateChange?: () => void;
    onSceneLinksChange?: (links: ScreenplaySceneLink[]) => void;
    onEntryLinkSelect?: () => void;
    /** Receives the codec-serialized doc, 300ms-debounced. */
    onSerialized: (serialized: string) => void;
    /** Enable the floating "Add comment" affordance (Stage 11.5 Task 3). */
    enableComments?: boolean;
    /** Fires with the selected range + snapshotted text when the user clicks "Add comment". */
    onAddComment?: (anchor: { from: number; to: number; text: string }) => void;
    /** Enable the floating "Mark device" affordance (Devices & Tropes Task 5). */
    enableMarkThread?: boolean;
    /** Fires with the selected range + snapshotted text when the user clicks "Mark device". */
    onMarkThread?: (anchor: { from: number; to: number; text: string }) => void;
}

/**
 * The TipTap instance lives in its own component so the read-only path
 * never constructs an editor (hooks must run unconditionally).
 */
function ScreenplaySurface({
    projectId,
    initialContent,
    printLayout,
    scrollMode = 'self',
    marginXIn = 1,
    bridgeRef,
    onStateChange,
    onSceneLinksChange,
    onEntryLinkSelect,
    onSerialized,
    enableComments = false,
    onAddComment,
    enableMarkThread = false,
    onMarkThread,
}: ScreenplaySurfaceProps) {
    const t = useT();
    const [showKeys, setShowKeys] = useState(false);
    const [hoveredEntry, setHoveredEntry] = useState<{ entryId: number; rect: DOMRect } | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const entryLookupCacheRef = useRef(new Map<string, number | 'loading' | 'missing'>());
    const onStateChangeRef = useRef(onStateChange);
    const onSceneLinksChangeRef = useRef(onSceneLinksChange);
    const onEntryLinkSelectRef = useRef(onEntryLinkSelect);
    onStateChangeRef.current = onStateChange;
    onSceneLinksChangeRef.current = onSceneLinksChange;
    onEntryLinkSelectRef.current = onEntryLinkSelect;

    function currentBlockIndex(e: Editor): number {
        let activeIndex = 0;
        const selectionPosition = e.state.selection.from;

        e.state.doc.forEach((node, offset, index) => {
            if (selectionPosition >= offset && selectionPosition <= offset + node.nodeSize) {
                activeIndex = index;
            }
        });

        return activeIndex;
    }

    function reportSceneLinks(e: Editor) {
        onSceneLinksChangeRef.current?.(
            extractScreenplaySceneLinks(e.getJSON(), currentBlockIndex(e)),
        );
    }

    const editor = useEditor({
        extensions: buildScreenplayExtensions({
            projectId,
            onEntryLinkSelect: () => {
                onEntryLinkSelectRef.current?.();
            },
            enableComments,
        }),
        content: blocksToDoc(parseScreenplay(initialContent)),
        onCreate: ({ editor: e }) => {
            reportSceneLinks(e);
        },
        onUpdate: ({ editor: e }) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                onSerialized(serializeScreenplay(docToBlocks(e.getJSON())));
            }, 300);
            reportSceneLinks(e);
        },
        onTransaction: ({ editor: e }) => {
            onStateChangeRef.current?.();
            reportSceneLinks(e);
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
            if (hoverCloseTimerRef.current !== null) {
                clearTimeout(hoverCloseTimerRef.current);
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

    /* The screenplay sheet honors the same proportional margins as
       prose. It has no pagination pass to write the sheet variables, so
       a small observer does the same job here. */
    useEffect(() => {
        if (!editor) {
            return;
        }

        const dom = editor.view.dom as HTMLElement;
        const apply = () => applySheetMargins(dom, marginXIn);

        apply();

        const observer = new ResizeObserver(apply);
        observer.observe(dom);

        return () => observer.disconnect();
    }, [editor, marginXIn]);

    // Comment selection state (Stage 11.5 Task 3) — mirrors
    // RichTextEditor's commentSelectionRange; must run before early return.
    const commentSelectionRange = useEditorState({
        editor,
        selector: ({ editor: e }): { from: number; to: number } | null => {
            if (!e || (!enableComments && !enableMarkThread)) return null;
            const { from, to } = e.state.selection;
            return from !== to ? { from, to } : null;
        },
    }) ?? null;

    // Ribbon editor bridge (Ribbon Plan 2 Task 2) — recreated per
    // render so it always closes over the current editor. Prose-only
    // methods are safe no-ops: the schema makes marks/headings/lists
    // impossible by construction.
    useImperativeHandle(bridgeRef, (): WritingEditorBridge => ({
        toggleMark() {},
        toggleList() {},
        toggleHeading() {},
        isMarkActive: () => false,
        setBlockStyle(style) {
            if (!editor || !(ELEMENTS as string[]).includes(style)) return;
            editor.commands.focus();
            convertCurrentBlock(editor, style as ScreenplayElement);
        },
        currentBlockStyle() {
            const name = editor?.state.selection.$from.parent.type.name ?? '';

            return (ELEMENTS as string[]).includes(name) ? name : 'action';
        },
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
        undo() {
            runHistoryCommand(editor, 'undo');
        },
        redo() {
            runHistoryCommand(editor, 'redo');
        },
        canUndo() {
            return canRunHistoryCommand(editor, 'undo');
        },
        canRedo() {
            return canRunHistoryCommand(editor, 'redo');
        },
        focus() {
            editor?.commands.focus();
        },
        // Comment mark operations (Stage 11.5 Task 3) — delegated to commentBridgeHelpers
        applyCommentMark(from, to, commentId) {
            if (!editor) return;
            bridge.applyCommentMark(editor, from, to, commentId);
        },
        scrollToCommentMark(commentId) {
            if (!editor) return;
            bridge.scrollToCommentMark(editor, commentId);
        },
        hasNonEmptySelection() {
            if (!editor) return false;
            return bridge.hasNonEmptySelection(editor);
        },
        getSelectionRange() {
            if (!editor) return null;
            return bridge.getSelectionRange(editor);
        },
        getCommentPositionMap() {
            if (!editor) return {};
            return bridge.getCommentPositionMap(editor);
        },
        findTextInDoc(text: string): Array<{ from: number; to: number }> {
            if (!editor) return [];
            return bridge.findTextInDoc(editor, text);
        },
        reanchorCommentMark(from: number, to: number, commentId: number): void {
            if (!editor) return;
            bridge.reanchorCommentMark(editor, from, to, commentId);
        },
        removeCommentMark(commentId: number): void {
            if (!editor) return;
            bridge.removeCommentMark(editor, commentId);
        },
        getPlainText(): string {
            if (!editor) return '';
            return bridge.getPlainText(editor);
        },
        scrollToOffset(pos: number): void {
            if (!editor) return;
            bridge.scrollToOffset(editor, pos);
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

    function entryLinkFromTarget(target: EventTarget | null): HTMLAnchorElement | null {
        return target instanceof Element
            ? target.closest<HTMLAnchorElement>('a[data-type="entry-link"]')
            : null;
    }

    function entryIdFromLink(link: HTMLAnchorElement): number | null {
        const rawId = link.getAttribute('data-id');
        const entryId = rawId !== null ? Number.parseInt(rawId, 10) : Number.NaN;

        return Number.isFinite(entryId) ? entryId : null;
    }

    function openEntryHover(entryId: number, rect: DOMRect) {
        clearHoverTimer();
        setHoveredEntry((current) => (
            current?.entryId === entryId
                ? current
                : { entryId, rect }
        ));
    }

    function resolveEntryHover(link: HTMLAnchorElement) {
        const directId = entryIdFromLink(link);
        const rect = link.getBoundingClientRect();

        if (directId !== null) {
            openEntryHover(directId, rect);

            return;
        }

        const name = link.getAttribute('data-name')?.trim() ?? '';

        if (name === '') {
            return;
        }

        const cached = entryLookupCacheRef.current.get(name);

        if (typeof cached === 'number') {
            openEntryHover(cached, rect);

            return;
        }

        if (cached === 'loading' || cached === 'missing') {
            return;
        }

        entryLookupCacheRef.current.set(name, 'loading');
        fetch(`/api/v1/entries/search?q=${encodeURIComponent(name)}&project_id=${projectId}&limit=5`, {
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((response) => (response.ok ? response.json() : Promise.reject()))
            .then((payload: { data?: Array<{ id: number | string; name: string }> }) => {
                const match = (payload.data ?? []).find(
                    (row) => row.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
                ) ?? payload.data?.[0];
                const resolvedId = match ? Number.parseInt(String(match.id), 10) : Number.NaN;

                if (Number.isFinite(resolvedId)) {
                    entryLookupCacheRef.current.set(name, resolvedId);
                    openEntryHover(resolvedId, rect);
                } else {
                    entryLookupCacheRef.current.set(name, 'missing');
                }
            })
            .catch(() => {
                entryLookupCacheRef.current.set(name, 'missing');
            });
    }

    function clearHoverTimer() {
        if (hoverCloseTimerRef.current !== null) {
            clearTimeout(hoverCloseTimerRef.current);
            hoverCloseTimerRef.current = null;
        }
    }

    function closeHoveredEntry() {
        clearHoverTimer();
        hoverCloseTimerRef.current = setTimeout(() => {
            setHoveredEntry(null);
        }, 120);
    }

    function handleEntryLinkMouseMove(e: MouseEvent<HTMLDivElement>) {
        const link = entryLinkFromTarget(e.target);

        if (link === null) {
            return;
        }

        clearHoverTimer();
        resolveEntryHover(link);
    }

    function handleEntryLinkMouseLeave() {
        closeHoveredEntry();
    }

    function handleEntryLinkClick(e: MouseEvent<HTMLDivElement>) {
        const link = entryLinkFromTarget(e.target);

        if (link === null || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
            return;
        }

        e.preventDefault();
        onEntryLinkSelectRef.current?.();
    }

    if (!editor) return null;

    // scrollMode='parent': a stacked ancestor owns the scrollport, so the
    // bounded-frame classes (flex-1 + min-h-0, overflow-y-auto) and the
    // per-section rulers drop out and the sheet grows to content height.
    const ownsScroll = scrollMode === 'self';

    return (
        <div className={ownsScroll ? 'flex min-h-0 flex-1 flex-col' : 'flex flex-col'}>
            {/* No gutter spacer — the vertical ruler it aligned with is
                retired; a spacer now would skew footprint centering. */}
            {printLayout && ownsScroll && <ManuscriptRuler marginXIn={marginXIn} />}

            {/* The sheet: geometry from manuscript.css, element layout from screenplay.css. */}
            <div className={ownsScroll ? 'flex min-h-0 flex-1' : 'flex'}>
                {/* Vertical ruler retired 2026-08-09 — see ManuscriptRuler. */}
                <EditorContent
                    editor={editor}
                    className={
                        ownsScroll
                            ? 'tiptap-editor writing-workspace-scroll min-h-0 flex-1 overflow-y-auto'
                            : 'tiptap-editor flex-1'
                    }
                    onClick={handleEntryLinkClick}
                    onMouseMove={handleEntryLinkMouseMove}
                    onMouseLeave={handleEntryLinkMouseLeave}
                    onMouseDown={handleGutterMouseDown}
                />
            </div>

            {hoveredEntry !== null && (
                <EntryHoverCard
                    entryId={hoveredEntry.entryId}
                    triggerRect={hoveredEntry.rect}
                    onEnter={clearHoverTimer}
                    onClose={closeHoveredEntry}
                />
            )}

            {commentSelectionRange !== null && (
                <>
                    {enableComments && (
                        <AddCommentBubble
                            editor={editor}
                            range={commentSelectionRange}
                            onAddComment={onAddComment}
                        />
                    )}
                    {enableMarkThread && (
                        <MarkDeviceBubble
                            editor={editor}
                            range={commentSelectionRange}
                            onMarkThread={onMarkThread}
                        />
                    )}
                </>
            )}

            {/* Keyboard-flow help — opened via bridge.openHelp() */}
            <Modal open={showKeys} onClose={() => setShowKeys(false)} maxWidth="max-w-lg">
                <ModalHeader title={t('writing.workspace.keys_title')} onClose={() => setShowKeys(false)} />
                <div className="grid gap-2.5 p-5 text-sm">
                    {SCREENPLAY_KEY_HELP.map((key) => (
                        <div
                            key={key}
                            className="flex items-start gap-3 rounded-md px-3 py-3"
                            style={{
                                background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
                                border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                            }}
                        >
                            <kbd
                                className="inline-flex min-h-7 min-w-[4.5rem] shrink-0 items-center justify-center px-2 font-mono text-[11px] font-semibold"
                                style={{
                                    background: 'color-mix(in srgb, var(--theme-base-content) 9%, transparent)',
                                    border: '1px solid color-mix(in srgb, var(--theme-base-content) 18%, transparent)',
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
                            <p className="min-w-0 pt-0.5 leading-relaxed">{t(`writing.workspace.${key}`)}</p>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
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
    marginXIn,
    scrollMode = 'self',
    bridgeRef,
    onStateChange,
    onSceneLinksChange,
    onEntryLinkSelect,
    enableComments,
    onAddComment,
    enableMarkThread,
    onMarkThread,
}: ManuscriptEditorProps) {
    const { noteChange, initialContent } =
        useSectionAutosave({ projectSlug, workSlug, section, onCounts });

    // Read the stored preference ONCE (a function-call prop default
    // would re-read localStorage every render). The `??` fallback keeps
    // the editor self-sufficient until the Workspace passes the prop
    // (Ribbon Plan 2 Task 3 always does).
    const storedPrintLayout = useMemo(readPrintLayoutPreference, []);
    const effectivePrintLayout = printLayout ?? storedPrintLayout;

    return (
        <SectionChrome
            className={`rte-manuscript rte-screenplay${effectivePrintLayout && canUpdate ? ' rte-manuscript--print' : ''}`}
        >
            {canUpdate ? (
                <ScreenplaySurface
                    projectId={projectId}
                    initialContent={initialContent}
                    printLayout={effectivePrintLayout}
                    marginXIn={marginXIn}
                    scrollMode={scrollMode}
                    bridgeRef={bridgeRef}
                    onStateChange={onStateChange}
                    onSceneLinksChange={onSceneLinksChange}
                    onEntryLinkSelect={onEntryLinkSelect}
                    onSerialized={noteChange}
                    enableComments={enableComments}
                    onAddComment={onAddComment}
                    enableMarkThread={enableMarkThread}
                    onMarkThread={onMarkThread}
                />
            ) : (
                /* Read-only: the parsed blocks as styled static markup
                   inside the sheet — no editor instance. The class
                   names reuse the desk/sheet/element CSS directly. */
                <div
                    className={
                        scrollMode === 'self'
                            ? 'tiptap-editor writing-workspace-scroll min-h-0 flex-1 overflow-y-auto'
                            : 'tiptap-editor'
                    }
                >
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
