import { Node, mergeAttributes } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { positionWritingPopup } from '@alexandria/editor/positionWritingPopup';
import type { Translator } from '@alexandria/hooks/useT';

/**
 * Entry Link Extension for TipTap
 *
 * Creates wiki-style internal links to entries: [[Entry Name]] or [[Entry Name|Display Text]].
 * Triggered by typing [[ by default; callers may also enable @ as a shortcut
 * for entry-focused surfaces such as screenplay character lines.
 */

const EntryLinkPluginKey = new PluginKey<number>('entryLink');

/** Explicit commands do not fire handleTextInput; signal the picker as well. */
export function startEntryLinkSearch(editor: Editor | null): boolean {
    if (!editor || editor.isDestroyed || !editor.isEditable) {
        return false;
    }

    const type = editor.schema.nodes.entryLink;
    const { selection } = editor.state;

    if (!type || !selection.$to.parent.type.contentMatch.matchType(type)) {
        return false;
    }

    return editor
        .chain()
        .focus()
        .setTextSelection(selection.to)
        .insertContent('[[')
        .command(({ tr }) => {
            tr.setMeta(EntryLinkPluginKey, 'open');

            return true;
        })
        .run();
}

export interface EntryLinkSearchResult {
    id: number | string;
    name: string;
    slug?: string | null;
    blueprint_slug?: string | null;
    blueprint_name?: string | null;
    blueprint_icon?: string | null;
}

export interface EntryLinkOptions {
    searchEndpoint?: string;
    projectId?: number | string | null;
    triggers?: Array<'[[' | '@'>;
    onSelect?: (item: EntryLinkSearchResult) => void;
    translate?: Translator;
}

interface EntryLinkAttrs {
    id: string | number | null;
    name: string | null;
    displayText: string | null;
    slug: string | null;
    blueprintSlug: string | null;
}

export default function createEntryLinkExtension(
    options: EntryLinkOptions = {},
) {
    const {
        searchEndpoint = '/api/v1/entries/search',
        projectId = null,
        triggers = ['[['],
        onSelect = () => {},
        translate = (key, fallback) => fallback ?? key,
    } = options;
    const triggerSet = new Set(triggers);

    // State for the suggestion popup
    let popup: HTMLDivElement | null = null;
    let selectedIndex = 0;
    let items: EntryLinkSearchResult[] = [];
    let query = '';
    let active = false;
    let startPos: number | null = null;
    let request: AbortController | null = null;
    let requestSequence = 0;
    let searchTimer: ReturnType<typeof setTimeout> | null = null;
    let detachPopupListeners: (() => void) | null = null;

    return Node.create({
        name: 'entryLink',

        priority: 2000,

        group: 'inline',

        inline: true,

        content: 'text*',

        marks: '',

        selectable: false,

        atom: false,

        addAttributes() {
            return {
                id: {
                    default: null,
                },
                name: {
                    default: null,
                },
                displayText: {
                    default: null,
                },
                slug: {
                    default: null,
                },
                blueprintSlug: {
                    default: null,
                },
            };
        },

        parseHTML() {
            return [
                {
                    tag: 'a[data-type="entry-link"]',
                    getAttrs: (element: HTMLElement | string) => {
                        if (typeof element === 'string') {
                            return false;
                        }

                        return {
                            id: element.getAttribute('data-id'),
                            name: element.getAttribute('data-name'),
                            displayText: element.textContent,
                            slug: element.getAttribute('data-slug'),
                            blueprintSlug: element.getAttribute(
                                'data-blueprint-slug',
                            ),
                        };
                    },
                },
            ];
        },

        renderHTML({
            node,
            HTMLAttributes,
        }: {
            node: PMNode;
            HTMLAttributes: Record<string, unknown>;
        }) {
            const attrs = node.attrs as EntryLinkAttrs;

            return [
                'a',
                mergeAttributes(HTMLAttributes, {
                    'data-type': 'entry-link',
                    'data-id': attrs.id,
                    'data-name': attrs.name,
                    'data-slug': attrs.slug,
                    'data-blueprint-slug': attrs.blueprintSlug,
                    class: 'entry-link font-medium cursor-pointer hover:underline',
                    href:
                        attrs.slug && attrs.blueprintSlug
                            ? `/entries/${attrs.blueprintSlug}/${attrs.slug}`
                            : '#',
                }),
                0,
            ];
        },

        renderText({ node }: { node: PMNode }): string {
            const attrs = node.attrs as EntryLinkAttrs;
            const name = attrs.name ?? '';
            const displayText = node.textContent || attrs.displayText || '';

            if (displayText && displayText !== name) {
                return `[[${name}|${displayText}]]`;
            }

            return `[[${name}]]`;
        },

        addProseMirrorPlugins() {
            // Capture only the dependencies needed by the nested handlers.
            const extension = { editor: this.editor, type: this.type };

            return [
                new Plugin({
                    key: EntryLinkPluginKey,
                    state: {
                        init: () => 0,
                        apply: (tr, value) =>
                            tr.getMeta(EntryLinkPluginKey) === 'open'
                                ? value + 1
                                : value,
                    },
                    view: () => ({
                        update: (current, previous) => {
                            if (
                                EntryLinkPluginKey.getState(current.state) !==
                                EntryLinkPluginKey.getState(previous)
                            ) {
                                active = true;
                                startPos = current.state.selection.from - 2;
                                query = '';
                                showPopup(current);
                            }

                            if (!active || startPos === null) {
                                return;
                            }

                            const { selection, doc } = current.state;

                            if (
                                !current.editable ||
                                !selection.empty ||
                                startPos < selection.$from.start() ||
                                startPos > selection.from
                            ) {
                                hidePopup();

                                return;
                            }

                            const typed = doc.textBetween(
                                startPos,
                                selection.from,
                            );
                            const prefix = typed.startsWith('[[')
                                ? '[['
                                : typed.startsWith('@')
                                  ? '@'
                                  : null;

                            if (
                                !prefix ||
                                !triggerSet.has(prefix) ||
                                typed.includes(']')
                            ) {
                                hidePopup();

                                return;
                            }

                            const next = typed.slice(prefix.length);

                            if (next !== query) {
                                query = next;
                                void updateSuggestions();
                            }

                            updatePopupPosition(current);
                        },
                        destroy: () => {
                            hidePopup();
                        },
                    }),

                    // Plugin handlers below are referenced by ProseMirror via the
                    // plugin spec; the IDE can't always trace that, so don't
                    // remove them as "unused". The 4-argument handleTextInput
                    // signature (view, from, to, text) is part of the
                    // ProseMirror contract — `to` is required even when
                    // unused.
                    props: {
                        handleTextInput(
                            view: EditorView,
                            from: number,
                            _to: number,
                            text: string,
                        ): boolean {
                            const { state } = view;

                            // Check if we're starting a new [[ sequence.
                            if (
                                triggerSet.has('[[') &&
                                text === '[' &&
                                canInsertEntryLink(view)
                            ) {
                                const prevChar = state.doc.textBetween(
                                    Math.max(0, from - 1),
                                    from,
                                );

                                if (prevChar === '[') {
                                    // We have [[ - start the suggestion
                                    active = true;
                                    startPos = from - 1; // Position of the first [
                                    query = '';
                                    showPopup(view);

                                    return false;
                                }
                            }

                            if (
                                triggerSet.has('@') &&
                                text === '@' &&
                                canInsertEntryLink(view)
                            ) {
                                active = true;
                                startPos = from;
                                query = '';
                                showPopup(view);

                                return false;
                            }

                            return false;
                        },

                        handleKeyDown(
                            view: EditorView,
                            event: KeyboardEvent,
                        ): boolean {
                            if (!active) {
                                return false;
                            }

                            switch (event.key) {
                                case 'ArrowUp':
                                    event.preventDefault();
                                    selectedIndex = Math.max(
                                        0,
                                        selectedIndex - 1,
                                    );
                                    renderPopup();

                                    return true;

                                case 'ArrowDown':
                                    event.preventDefault();
                                    selectedIndex = Math.min(
                                        items.length - 1,
                                        selectedIndex + 1,
                                    );
                                    renderPopup();

                                    return true;

                                case 'Enter':
                                    event.preventDefault();

                                    if (items[selectedIndex]) {
                                        selectEntry(view, items[selectedIndex]);
                                    }

                                    return true;

                                case 'Escape':
                                    hidePopup();

                                    return true;

                                default:
                                    return false;
                            }
                        },

                        handleClick(
                            _view: EditorView,
                            _pos: number,
                            event: MouseEvent,
                        ): boolean {
                            // Ordinary taps edit the document, not the anchor's legacy URL.
                            // Screenplay's companion click handler still receives the event.
                            if (
                                event.target instanceof Element &&
                                event.target.closest(
                                    'a[data-type="entry-link"]',
                                ) &&
                                !event.metaKey &&
                                !event.ctrlKey &&
                                !event.shiftKey &&
                                !event.altKey
                            ) {
                                event.preventDefault();
                            }

                            if (active) {
                                hidePopup();
                            }

                            return false;
                        },
                    },
                }),
            ];

            function showPopup(view: EditorView): void {
                detachPopupListeners?.();
                const reposition = () => updatePopupPosition(view);
                const outside = (event: Event) => {
                    if (
                        event.target instanceof globalThis.Node &&
                        !popup?.contains(event.target) &&
                        !view.dom.contains(event.target)
                    ) {
                        hidePopup();
                    }
                };
                const visual = window.visualViewport;
                window.addEventListener('resize', reposition);
                window.addEventListener('scroll', reposition, true);
                visual?.addEventListener('resize', reposition);
                visual?.addEventListener('scroll', reposition);
                document.addEventListener('pointerdown', outside);
                document.addEventListener('focusin', outside);
                detachPopupListeners = () => {
                    window.removeEventListener('resize', reposition);
                    window.removeEventListener('scroll', reposition, true);
                    visual?.removeEventListener('resize', reposition);
                    visual?.removeEventListener('scroll', reposition);
                    document.removeEventListener('pointerdown', outside);
                    document.removeEventListener('focusin', outside);
                };

                if (popup) {
                    popup.remove();
                }

                popup = document.createElement('div');
                popup.className =
                    'entry-link-popup fixed z-[9999] shadow-xl overflow-y-auto overscroll-contain';
                popup.setAttribute('role', 'listbox');
                popup.setAttribute(
                    'aria-label',
                    translate(
                        'editor.entry_links.suggestions',
                        'Entry suggestions',
                    ),
                );
                Object.assign(popup.style, {
                    background: 'var(--theme-base-200)',
                    border: '1px solid var(--theme-base-300)',
                    borderRadius: 'var(--theme-radius-card)',
                });
                document.body.appendChild(popup);

                updatePopupPosition(view);
                void updateSuggestions();
            }

            function hidePopup(): void {
                detachPopupListeners?.();
                detachPopupListeners = null;
                requestSequence++;
                request?.abort();
                request = null;

                if (searchTimer !== null) {
                    clearTimeout(searchTimer);
                }

                searchTimer = null;
                active = false;
                query = '';
                startPos = null;
                items = [];
                selectedIndex = 0;

                if (popup) {
                    popup.remove();
                    popup = null;
                }
            }

            function updatePopupPosition(view: EditorView): void {
                if (!popup || !view) {
                    return;
                }

                const coords = view.coordsAtPos(view.state.selection.from);
                const visual = window.visualViewport;
                const viewport = {
                    left: visual?.offsetLeft ?? 0,
                    top: visual?.offsetTop ?? 0,
                    width: visual?.width ?? window.innerWidth,
                    height: visual?.height ?? window.innerHeight,
                };
                const strip = document
                    .querySelector('.writing-editing-strip')
                    ?.getBoundingClientRect();

                if (
                    strip &&
                    strip.top > viewport.top &&
                    strip.top < viewport.top + viewport.height
                ) {
                    viewport.height = strip.top - viewport.top;
                }

                popup.style.width = `${Math.min(320, Math.max(0, viewport.width - 16))}px`;
                const position = positionWritingPopup(
                    coords,
                    viewport,
                    popup.scrollHeight,
                );
                popup.style.left = `${position.left}px`;
                popup.style.top = `${position.top}px`;
                popup.style.maxHeight = `${position.maxHeight}px`;
            }

            function updateSuggestions(): void {
                if (!active) {
                    return;
                }

                const sequence = ++requestSequence;
                request?.abort();

                if (searchTimer !== null) {
                    clearTimeout(searchTimer);
                }

                items = [];

                // Show loading state
                renderPopup(
                    translate('editor.entry_links.loading', 'Loading…'),
                );

                if (query.length < 1) {
                    items = [];
                    renderPopup(
                        translate(
                            'editor.entry_links.prompt',
                            'Type to search entries…',
                        ),
                    );

                    return;
                }

                searchTimer = setTimeout(() => {
                    searchTimer = null;
                    void fetchSuggestions(sequence);
                }, 150);
            }

            async function fetchSuggestions(sequence: number): Promise<void> {
                if (!active || sequence !== requestSequence) {
                    return;
                }

                const controller = new AbortController();
                request = controller;

                try {
                    let url = `${searchEndpoint}?q=${encodeURIComponent(query)}&limit=10`;

                    if (projectId) {
                        url += `&project_id=${projectId}`;
                    }

                    const response = await fetch(url, {
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'same-origin',
                        signal: controller.signal,
                    });

                    if (!active || sequence !== requestSequence) {
                        return;
                    }

                    if (!response.ok) {
                        items = [];
                        renderPopup(
                            translate(
                                'editor.entry_links.error',
                                'Could not load entries. Try typing again.',
                            ),
                        );

                        return;
                    }

                    const data = await response.json();

                    if (!active || sequence !== requestSequence) {
                        return;
                    }

                    items = Array.isArray(data.data)
                        ? data.data.filter(
                              (item: EntryLinkSearchResult) =>
                                  item &&
                                  typeof item.name === 'string' &&
                                  ['string', 'number'].includes(typeof item.id),
                          )
                        : [];
                    selectedIndex = 0;
                    renderPopup();
                } catch {
                    if (
                        !active ||
                        sequence !== requestSequence ||
                        controller.signal.aborted
                    ) {
                        return;
                    }

                    items = [];
                    renderPopup(
                        translate(
                            'editor.entry_links.error',
                            'Could not load entries. Try typing again.',
                        ),
                    );
                }
            }

            function clearPopup(): void {
                if (!popup) {
                    return;
                }

                while (popup.firstChild) {
                    popup.removeChild(popup.firstChild);
                }
            }

            function renderPopup(message: string | null = null): void {
                if (!popup) {
                    return;
                }

                clearPopup();

                const mutedColor =
                    'color-mix(in srgb, var(--theme-base-content) 60%, transparent)';

                if (message) {
                    const msgDiv = document.createElement('div');
                    msgDiv.className = 'p-3 text-sm';
                    msgDiv.style.color = mutedColor;
                    msgDiv.textContent = message;
                    popup.appendChild(msgDiv);
                    updatePopupPosition(extension.editor.view);

                    return;
                }

                if (items.length === 0) {
                    const emptyDiv = document.createElement('div');
                    emptyDiv.className = 'p-3 text-sm';
                    emptyDiv.style.color = mutedColor;
                    emptyDiv.textContent = translate(
                        'editor.entry_links.empty',
                        'No entries found',
                    );
                    popup.appendChild(emptyDiv);
                    updatePopupPosition(extension.editor.view);

                    return;
                }

                items.forEach((item, index) => {
                    const button = createEntryButton(
                        item,
                        index === selectedIndex,
                    );
                    button.addEventListener('click', (e) => {
                        e.preventDefault();

                        if (extension.editor) {
                            selectEntry(extension.editor.view, item);
                        }
                    });

                    if (popup) {
                        popup.appendChild(button);
                    }
                });
                updatePopupPosition(extension.editor.view);
                popup
                    .querySelector('[aria-selected="true"]')
                    ?.scrollIntoView({ block: 'nearest' });
            }

            function createEntryButton(
                item: EntryLinkSearchResult,
                isSelected: boolean,
            ): HTMLButtonElement {
                const button = document.createElement('button');
                button.type = 'button';
                button.setAttribute('role', 'option');
                button.setAttribute('aria-selected', String(isSelected));
                button.addEventListener('mousedown', (event) =>
                    event.preventDefault(),
                );
                button.className =
                    'alex-row w-full flex items-center gap-3 px-3 py-2 text-left transition-colors';

                if (isSelected) {
                    button.style.background =
                        'color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)';
                }

                // Icon container
                const iconContainer = document.createElement('div');
                iconContainer.className =
                    'w-8 h-8 flex items-center justify-center flex-shrink-0';
                Object.assign(iconContainer.style, {
                    background: 'var(--theme-base-300)',
                    borderRadius: 'var(--theme-radius-input)',
                });

                const icon = document.createElement('i');
                icon.className = `fa-solid ${item.blueprint_icon || 'fa-file'} text-sm`;
                icon.style.color =
                    'color-mix(in srgb, var(--theme-base-content) 60%, transparent)';
                iconContainer.appendChild(icon);

                // Text container
                const textContainer = document.createElement('div');
                textContainer.className = 'flex-1 min-w-0';

                const nameDiv = document.createElement('div');
                nameDiv.className = 'font-medium text-sm truncate';
                nameDiv.textContent = item.name;

                const typeDiv = document.createElement('div');
                typeDiv.className = 'text-xs truncate';
                typeDiv.style.color =
                    'color-mix(in srgb, var(--theme-base-content) 60%, transparent)';
                typeDiv.textContent =
                    item.blueprint_name ||
                    translate('editor.entry_links.entry', 'Entry');

                textContainer.appendChild(nameDiv);
                textContainer.appendChild(typeDiv);

                button.appendChild(iconContainer);
                button.appendChild(textContainer);

                return button;
            }

            function selectEntry(
                view: EditorView,
                entry: EntryLinkSearchResult,
            ): void {
                if (
                    !view ||
                    !entry ||
                    !active ||
                    startPos === null ||
                    !view.editable ||
                    !view.state.selection.empty
                ) {
                    return;
                }

                const { state, dispatch } = view;

                // Calculate the range to replace (from [[ to current position)
                const from = startPos;
                const to = state.selection.from;

                // Create the entry link node. The linked entry identity
                // lives in attrs; the visible text is editable content.
                const node = extension.type.create(
                    {
                        id: entry.id,
                        name: entry.name,
                        displayText: entry.name,
                        slug: entry.slug,
                        blueprintSlug: entry.blueprint_slug,
                    },
                    state.schema.text(entry.name),
                );

                // Replace the [[ and query with the node
                const tr = state.tr.replaceWith(from, to, node);
                dispatch(tr);

                // Call the onSelect callback
                onSelect(entry);

                // Hide the popup
                hidePopup();

                // Focus the editor
                view.focus();
            }

            function canInsertEntryLink(view: EditorView): boolean {
                const parent = view.state.selection.$from.parent;

                return (
                    view.editable &&
                    parent.type.contentMatch.matchType(extension.type) !== null
                );
            }
        },
    });
}
