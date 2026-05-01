import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * Entry Link Extension for TipTap
 *
 * Creates wiki-style internal links to entries: [[Entry Name]] or [[Entry Name|Display Text]]
 * Triggered by typing [[ and shows an autocomplete popup for searching entries.
 */

const EntryLinkPluginKey = new PluginKey('entryLink');

export default function createEntryLinkExtension(options = {}) {
    const {
        searchEndpoint = '/api/v1/entries/search',
        projectId = null,
        onSelect = () => {},
    } = options;

    // State for the suggestion popup
    let popup = null;
    let selectedIndex = 0;
    let items = [];
    let query = '';
    let active = false;
    let startPos = null;

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
                    getAttrs: (element) => ({
                        id: element.getAttribute('data-id'),
                        name: element.getAttribute('data-name'),
                        displayText: element.textContent,
                        slug: element.getAttribute('data-slug'),
                        blueprintSlug: element.getAttribute('data-blueprint-slug'),
                    }),
                },
            ];
        },

        /**
         * @param {{ node: import('@tiptap/pm/model').Node, HTMLAttributes: Record<string, any> }} props
         */
        renderHTML({ node, HTMLAttributes }) {
            const attrs = node.attrs;
            const display = attrs.displayText || attrs.name;
            return [
                'a',
                mergeAttributes(HTMLAttributes, {
                    'data-type': 'entry-link',
                    'data-id': attrs.id,
                    'data-name': attrs.name,
                    'data-slug': attrs.slug,
                    'data-blueprint-slug': attrs.blueprintSlug,
                    'class': 'entry-link text-primary font-medium cursor-pointer hover:underline',
                    'href': attrs.slug && attrs.blueprintSlug
                        ? `/entries/${attrs.blueprintSlug}/${attrs.slug}`
                        : '#',
                }),
                display,
            ];
        },

        /**
         * @param {{ node: import('@tiptap/pm/model').Node }} props
         */
        renderText({ node }) {
            const attrs = node.attrs;
            const name = attrs.name || '';
            const displayText = attrs.displayText || '';

            if (displayText && displayText !== name) {
                return `[[${name}|${displayText}]]`;
            }
            return `[[${name}]]`;
        },

        addProseMirrorPlugins() {
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
                        /**
                         * @param {import('@tiptap/pm/view').EditorView} view
                         * @param {number} from
                         * @param {number} _to
                         * @param {string} text
                         */
                        handleTextInput(view, from, _to, text) {
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
                            if (active) {
                                if (text === ']') {
                                    // Check if we're closing with ]]
                                    const textBefore = state.doc.textBetween(startPos, from);
                                    if (textBefore.endsWith(']') || text === ']') {
                                        hidePopup();
                                        return false;
                                    }
                                }

                                query += text;
                                void updateSuggestions(view);
                            }

                            return false;
                        },

                        /**
                         * @param {import('@tiptap/pm/view').EditorView} view
                         * @param {KeyboardEvent} event
                         */
                        handleKeyDown(view, event) {
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
                                        void updateSuggestions(view);
                                    } else {
                                        hidePopup();
                                    }
                                    return false;

                                default:
                                    return false;
                            }
                        },

                        handleClick() {
                            if (active) {
                                hidePopup();
                            }
                            return false;
                        },
                    },
                }),
            ];

            /**
             * @param {import('@tiptap/pm/view').EditorView} view
             */
            function showPopup(view) {
                if (popup) {
                    popup.remove();
                }

                popup = document.createElement('div');
                popup.className = 'entry-link-popup fixed z-[9999] bg-base-200 rounded-xl shadow-xl border border-base-300 overflow-hidden max-h-64 overflow-y-auto min-w-[280px]';
                document.body.appendChild(popup);

                updatePopupPosition(view);
                void updateSuggestions(view);
            }

            function hidePopup() {
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

            /**
             * @param {import('@tiptap/pm/view').EditorView} view
             */
            function updatePopupPosition(view) {
                if (!popup || !view) return;

                const coords = view.coordsAtPos(view.state.selection.from);
                popup.style.left = `${coords.left}px`;
                popup.style.top = `${coords.bottom + 8}px`;
            }

            /**
             * The view parameter is currently unused but retained because
             * future enhancements (re-positioning the popup mid-query) will
             * need it; callers already pass it in.
             *
             * @param {import('@tiptap/pm/view').EditorView} _view
             */
            // eslint-disable-next-line no-unused-vars
            async function updateSuggestions(_view) {
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
                    items = data.data || [];
                    selectedIndex = 0;
                    renderPopup();
                } catch (error) {
                    console.error('Error fetching entries:', error);
                    items = [];
                    renderPopup('Error loading entries');
                }
            }

            function clearPopup() {
                if (!popup) return;
                while (popup.firstChild) {
                    popup.removeChild(popup.firstChild);
                }
            }

            function renderPopup(message = null) {
                if (!popup) return;

                clearPopup();

                if (message) {
                    const msgDiv = document.createElement('div');
                    msgDiv.className = 'p-3 text-sm text-base-content/60';
                    msgDiv.textContent = message;
                    popup.appendChild(msgDiv);
                    return;
                }

                if (items.length === 0) {
                    const emptyDiv = document.createElement('div');
                    emptyDiv.className = 'p-3 text-sm text-base-content/60';
                    emptyDiv.textContent = 'No entries found';
                    popup.appendChild(emptyDiv);
                    return;
                }

                items.forEach((item, index) => {
                    const button = createEntryButton(item, index === selectedIndex);
                    button.addEventListener('click', (e) => {
                        e.preventDefault();
                        const view = extension.editor.view;
                        selectEntry(view, item);
                    });
                    popup.appendChild(button);
                });
            }

            function createEntryButton(item, isSelected) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    isSelected ? 'bg-primary/20' : 'hover:bg-base-300'
                }`;

                // Icon container
                const iconContainer = document.createElement('div');
                iconContainer.className = 'w-8 h-8 rounded-lg bg-base-300 flex items-center justify-center flex-shrink-0';

                const icon = document.createElement('i');
                icon.className = `fa-solid ${item.blueprint_icon || 'fa-file'} text-sm text-base-content/60`;
                iconContainer.appendChild(icon);

                // Text container
                const textContainer = document.createElement('div');
                textContainer.className = 'flex-1 min-w-0';

                const nameDiv = document.createElement('div');
                nameDiv.className = 'font-medium text-sm truncate';
                nameDiv.textContent = item.name;

                const typeDiv = document.createElement('div');
                typeDiv.className = 'text-xs text-base-content/60 truncate';
                typeDiv.textContent = item.blueprint_name || 'Entry';

                textContainer.appendChild(nameDiv);
                textContainer.appendChild(typeDiv);

                button.appendChild(iconContainer);
                button.appendChild(textContainer);

                return button;
            }

            function selectEntry(view, entry) {
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
