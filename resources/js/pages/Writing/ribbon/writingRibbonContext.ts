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
}

export interface WritingRibbonContext {
    format: 'prose' | 'screenplay';
    canUpdate: boolean;
    panelOpen: boolean;
    sceneLinksPanelOpen: boolean;
    printLayout: boolean;
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
