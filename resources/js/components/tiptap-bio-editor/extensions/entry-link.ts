import { Node, mergeAttributes } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

/**
 * Entry Link Extension for TipTap
 *
 * Creates wiki-style internal links to entries: [[Entry Name]] or [[Entry Name|Display Text]]
 * Triggered by typing [[ and shows an autocomplete popup for searching entries.
 */

const EntryLinkPluginKey = new PluginKey('entryLink');

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
    onSelect?: (item: EntryLinkSearchResult) => void;
}

interface EntryLinkAttrs {
    id: string | number | null;
    name: string | null;
    displayText: string | null;
    slug: string | null;
    blueprintSlug: string | null;
}

export default function createEntryLinkExtension(options: EntryLinkOptions = {}) {
    const {
        searchEndpoint = '/api/v1/entries/search',
        projectId = null,
        onSelect = () => {},
    } = options;

    // State for the suggestion popup
    let popup: HTMLDivElement | null = null;
    let selectedIndex = 0;
    let items: EntryLinkSearchResult[] = [];
    let query = '';
    let active = false;
    let startPos: number | null = null;

    return Node.create({
        name: 'entryLink',

        group: 'inline',

        inline: true,

        selectable: false,

        atom: true,

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
                        if (typeof element === 'string') return false;
                        return {
                            id: element.getAttribute('data-id'),
                            name: element.getAttribute('data-name'),
                            displayText: element.textContent,
                            slug: element.getAttribute('data-slug'),
                            blueprintSlug: element.getAttribute('data-blueprint-slug'),
                        };
                    },
                },
            ];
        },

        renderHTML({ node, HTMLAttributes }: { node: PMNode; HTMLAttributes: Record<string, unknown> }) {
            const attrs = node.attrs as EntryLinkAttrs;
            const display = attrs.displayText || attrs.name || '';
            return [
                'a',
                mergeAttributes(HTMLAttributes, {
                    'data-type': 'entry-link',
                    'data-id': attrs.id,
                    'data-name': attrs.name,
                    'data-slug': attrs.slug,
                    'data-blueprint-slug': attrs.blueprintSlug,
                    'class': 'entry-link font-medium cursor-pointer hover:underline',
                    'href': attrs.slug && attrs.blueprintSlug
                        ? `/entries/${attrs.blueprintSlug}/${attrs.slug}`
                        : '#',
                }),
                display,
            ];
        },

        renderText({ node }: { node: PMNode }): string {
            const attrs = node.attrs as EntryLinkAttrs;
            const name = attrs.name ?? '';
            const displayText = attrs.displayText ?? '';

            if (displayText && displayText !== name) {
                return `[[${name}|${displayText}]]`;
            }
            return `[[${name}]]`;
        },

        addProseMirrorPlugins() {
            // Capture the extension instance so the inline handlers below
            // can reach `this.editor` and `this.type` without losing
            // typing under method-shorthand `this` rebinding.
            const extension = this;

            return [
                new Plugin({
                    key: EntryLinkPluginKey,

                    // Plugin handlers below are referenced by ProseMirror via the
                    // plugin spec; the IDE can't always trace that, so don't
                    // remove them as "unused". The 4-argument handleTextInput
                    // signature (view, from, to, text) is part of the
                    // ProseMirror contract — `to` is required even when
                    // unused.
                    props: {
                        handleTextInput(view: EditorView, from: number, _to: number, text: string): boolean {
                            const { state } = view;

                            // Check if we're starting a new [[ sequence
                            if (text === '[') {
                                const prevChar = state.doc.textBetween(Math.max(0, from - 1), from);
                                if (prevChar === '[') {
                                    // We have [[ - start the suggestion
                                    active = true;
                                    startPos = from - 1; // Position of the first [
                                    query = '';
                                    showPopup(view);
                                    return false;
                                }
                            }

                            // If suggestion is active, update the query
                            if (active && startPos !== null) {
                                if (text === ']') {
                                    // Check if we're closing with ]]
                                    const textBefore = state.doc.textBetween(startPos, from);
                                    if (textBefore.endsWith(']') || text === ']') {
                                        hidePopup();
                                        return false;
                                    }
                                }

                                query += text;
                                void updateSuggestions();
                            }

                            return false;
                        },

                        handleKeyDown(view: EditorView, event: KeyboardEvent): boolean {
                            if (!active) return false;

                            switch (event.key) {
                                case 'ArrowUp':
                                    event.preventDefault();
                                    selectedIndex = Math.max(0, selectedIndex - 1);
                                    renderPopup();
                                    return true;

                                case 'ArrowDown':
                                    event.preventDefault();
                                    selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
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

                                case 'Backspace':
                                    if (query.length > 0) {
                                        query = query.slice(0, -1);
                                        void updateSuggestions();
                                    } else {
                                        hidePopup();
                                    }
                                    return false;

                                default:
                                    return false;
                            }
                        },

                        handleClick(): boolean {
                            if (active) {
                                hidePopup();
                            }
                            return false;
                        },
                    },
                }),
            ];

            function showPopup(view: EditorView): void {
                if (popup) {
                    popup.remove();
                }

                popup = document.createElement('div');
                popup.className = 'entry-link-popup fixed z-[9999] shadow-xl overflow-hidden max-h-64 overflow-y-auto min-w-[280px]';
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
                if (!popup || !view) return;

                const coords = view.coordsAtPos(view.state.selection.from);
                popup.style.left = `${coords.left}px`;
                popup.style.top = `${coords.bottom + 8}px`;
            }

            async function updateSuggestions(): Promise<void> {
                if (!active) return;

                // Show loading state
                renderPopup('Loading...');

                if (query.length < 1) {
                    items = [];
                    renderPopup('Type to search entries...');
                    return;
                }

                try {
                    let url = `${searchEndpoint}?q=${encodeURIComponent(query)}&limit=10`;
                    if (projectId) {
                        url += `&project_id=${projectId}`;
                    }

                    const response = await fetch(url, {
                        headers: {
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'same-origin',
                    });

                    if (!response.ok) {
                        items = [];
                        renderPopup('Error loading entries');
                        return;
                    }

                    const data = await response.json();
                    items = (data.data as EntryLinkSearchResult[] | undefined) ?? [];
                    selectedIndex = 0;
                    renderPopup();
                } catch (error) {
                    console.error('Error fetching entries:', error);
                    items = [];
                    renderPopup('Error loading entries');
                }
            }

            function clearPopup(): void {
                if (!popup) return;
                while (popup.firstChild) {
                    popup.removeChild(popup.firstChild);
                }
            }

            function renderPopup(message: string | null = null): void {
                if (!popup) return;

                clearPopup();

                const mutedColor = 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)';

                if (message) {
                    const msgDiv = document.createElement('div');
                    msgDiv.className = 'p-3 text-sm';
                    msgDiv.style.color = mutedColor;
                    msgDiv.textContent = message;
                    popup.appendChild(msgDiv);
                    return;
                }

                if (items.length === 0) {
                    const emptyDiv = document.createElement('div');
                    emptyDiv.className = 'p-3 text-sm';
                    emptyDiv.style.color = mutedColor;
                    emptyDiv.textContent = 'No entries found';
                    popup.appendChild(emptyDiv);
                    return;
                }

                items.forEach((item, index) => {
                    const button = createEntryButton(item, index === selectedIndex);
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
            }

            function createEntryButton(item: EntryLinkSearchResult, isSelected: boolean): HTMLButtonElement {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'alex-row w-full flex items-center gap-3 px-3 py-2 text-left transition-colors';
                if (isSelected) {
                    button.style.background = 'color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)';
                }

                // Icon container
                const iconContainer = document.createElement('div');
                iconContainer.className = 'w-8 h-8 flex items-center justify-center flex-shrink-0';
                Object.assign(iconContainer.style, {
                    background: 'var(--theme-base-300)',
                    borderRadius: 'var(--theme-radius-input)',
                });

                const icon = document.createElement('i');
                icon.className = `fa-solid ${item.blueprint_icon || 'fa-file'} text-sm`;
                icon.style.color = 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)';
                iconContainer.appendChild(icon);

                // Text container
                const textContainer = document.createElement('div');
                textContainer.className = 'flex-1 min-w-0';

                const nameDiv = document.createElement('div');
                nameDiv.className = 'font-medium text-sm truncate';
                nameDiv.textContent = item.name;

                const typeDiv = document.createElement('div');
                typeDiv.className = 'text-xs truncate';
                typeDiv.style.color = 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)';
                typeDiv.textContent = item.blueprint_name || 'Entry';

                textContainer.appendChild(nameDiv);
                textContainer.appendChild(typeDiv);

                button.appendChild(iconContainer);
                button.appendChild(textContainer);

                return button;
            }

            function selectEntry(view: EditorView, entry: EntryLinkSearchResult): void {
                if (!view || !entry || startPos === null) return;

                const { state, dispatch } = view;

                // Calculate the range to replace (from [[ to current position)
                const from = startPos;
                const to = state.selection.from;

                // Create the entry link node
                const node = extension.type.create({
                    id: entry.id,
                    name: entry.name,
                    displayText: entry.name,
                    slug: entry.slug,
                    blueprintSlug: entry.blueprint_slug,
                });

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
        },
    });
}
