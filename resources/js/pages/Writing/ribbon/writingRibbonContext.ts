/**
 * Writing ribbon context — the host-defined Ctx the workspace threads
 * through `<Ribbon setKey="writing">` (Ribbon Plan 2 Task 1). The
 * Workspace builds one of these per render; `editorTick` bumps on
 * editor selection/content changes so control predicates re-read the
 * bridge.
 */

/** Commands both editors expose to the ribbon (via ref). All methods
 *  must be safe to call when unsupported — no-op + reflect via the
 *  capability queries so controls disable instead of breaking. */
export interface WritingEditorBridge {
    /** prose marks: bold | italic | underline; lists: bulletList | orderedList; headings via setHeading */
    toggleMark(name: 'bold' | 'italic' | 'underline'): void;
    toggleList(name: 'bulletList' | 'orderedList'): void;
    toggleHeading(level: 1 | 2 | 3): void;
    isMarkActive(name: string): boolean;
    setBlockStyle(style: string): void;
    currentBlockStyle(): string | null;
    /** screenplay elements */
    setElement(element: string): void;
    currentElement(): string | null;
    /** shared */
    insertEntryLink(): void;
    openHelp(): void;
    toggleCodeView(): void;
    isCodeView(): boolean;
    undo(): void;
    redo(): void;
    canUndo(): boolean;
    canRedo(): boolean;
    focus(): void;
    // Comment mark operations (Stage 11.5 Task 3)
    applyCommentMark(from: number, to: number, commentId: number): void;
    scrollToCommentMark(commentId: number): void;
    hasNonEmptySelection(): boolean;
    getSelectionRange(): { from: number; to: number } | null;
    getCommentPositionMap(): Record<number, number>;
    /**
     * Find all occurrences of `text` in the current doc.
     * Returns doc-position ranges { from, to } for each match.
     * Used by reanchorComments to restore marks after page reload.
     */
    findTextInDoc(text: string): Array<{ from: number; to: number }>;
    /**
     * Apply a comment mark from `from` to `to` without adding to undo
     * history. Used by reanchorComments — re-anchoring must not be undoable.
     */
    reanchorCommentMark(from: number, to: number, commentId: number): void;
    /**
     * Remove the comment mark for `commentId` from the entire doc in a
     * single transaction (regular history — undoing a delete restores the
     * highlight). Called by CommentRail immediately after a successful DELETE.
     */
    removeCommentMark(commentId: number): void;
    /**
     * Return the editor's current text content as a plain string (no markup).
     * Uses the same text-node traversal as findTextInDoc so character offsets
     * from analyzers map directly to positions returned by findTextInDoc.
     * Returns '' when no editor is active.
     */
    getPlainText(): string;
    /**
     * Scroll the editor viewport to show the given ProseMirror document
     * position. Used by panel consumers (e.g. CraftPanel) to jump to a
     * finding without modifying the selection. No-op when the position is
     * out of range or no editor is active.
     */
    scrollToOffset(pos: number): void;
}

export interface WritingRibbonContext {
    format: 'prose' | 'screenplay';
    canUpdate: boolean;
    panelOpen: boolean;
    sceneLinksPanelOpen: boolean;
    printLayout: boolean;
    /** How print layout draws a page boundary: 'tight' | 'pages'. */
    pageDisplay: string;
    paperColor: string;
    zoom: string;
    hasSection: boolean;
    /** bumped on editor selection/content changes so active/value states re-render */
    editorTick: number;
    editor: WritingEditorBridge | null;
    actions: {
        togglePanel(): void;
        toggleSceneLinksPanel(): void;
        togglePrintLayout(): void;
        setPageDisplay(value: string): void;
        setPaperColor(value: string): void;
        setZoom(value: string): void;
        openSettings(): void;
        openReports(): void;
        addSection(): void;       // root-level (opens the existing AddSectionModal)
        addInside(): void;        // child of current section (disabled when none)
        deleteSection(): void;    // current section (confirm modal; disabled when none)
        setStatus(value: string): void; // work status select
        goToIndex(): void;        // project works index
        goToDashboard(): void;    // global /writing
    };
    workStatus: string;
}
