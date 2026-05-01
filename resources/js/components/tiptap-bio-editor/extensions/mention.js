import Mention from '@tiptap/extension-mention';

/**
 * Creates a custom mention extension for @user mentions
 */
export default function createMentionExtension(options = {}) {
    const {
        searchEndpoint = '/api/v1/users/search',
        onSelect = () => {},
    } = options;

    /** @type {Partial<import('@tiptap/extension-mention').MentionOptions>} */
    const mentionConfig = {
        HTMLAttributes: {
            class: 'mention mention-user text-primary font-medium cursor-pointer hover:underline',
        },
        /**
         * @param {{ node: import('@tiptap/pm/model').Node }} props
         */
        renderText({ node }) {
            const attrs = node.attrs;
            return `@${attrs.label ?? attrs.id}`;
        },
        /**
         * @param {{ options: import('@tiptap/extension-mention').MentionOptions, node: import('@tiptap/pm/model').Node }} props
         */
        renderHTML({ options, node }) {
            const attrs = node.attrs;
            const username = attrs.label ?? attrs.id;
            return [
                'a',
                {
                    ...options.HTMLAttributes,
                    'data-type': 'mention',
                    'data-id': attrs.id,
                    'data-label': attrs.label,
                    'href': `/u/${(username || '').toLowerCase()}`,
                },
                `@${username}`,
            ];
        },
        suggestion: {
            char: '@',
            allowSpaces: false,

            items: async ({ query }) => {
                if (query.length < 2) {
                    return [];
                }

                try {
                    const response = await fetch(
                        `${searchEndpoint}?q=${encodeURIComponent(query)}&limit=10`,
                        {
                            headers: {
                                'Accept': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                            },
                            credentials: 'same-origin',
                        }
                    );

                    if (!response.ok) {
                        return [];
                    }

                    const data = await response.json();
                    return data.data || [];
                } catch (error) {
                    console.error('Error fetching users for mention:', error);
                    return [];
                }
            },

            render: () => {
                let component;
                let popup;

                return {
                    onStart: (props) => {
                        popup = document.createElement('div');
                        popup.className = 'tiptap-mention-popup';
                        document.body.appendChild(popup);

                        component = createSuggestionComponent(props, popup, onSelect);
                        updatePopupPosition(props, popup);
                    },

                    onUpdate: (props) => {
                        if (component) {
                            component.update(props);
                            updatePopupPosition(props, popup);
                        }
                    },

                    onKeyDown: (props) => {
                        if (props.event.key === 'Escape') {
                            popup?.remove();
                            return true;
                        }

                        if (component) {
                            return component.onKeyDown(props);
                        }

                        return false;
                    },

                    onExit: () => {
                        popup?.remove();
                        component = null;
                    },
                };
            },
        },
    };

    return Mention.extend({
        name: 'mention',
        priority: 1001,

        parseHTML() {
            return [
                {
                    tag: `a[data-type="mention"]`,
                    priority: 60,
                    getAttrs: (element) => ({
                        id: element.getAttribute('data-id'),
                        label: element.getAttribute('data-label'),
                    }),
                },
                {
                    tag: `span[data-type="mention"]`,
                    priority: 60,
                    getAttrs: (element) => ({
                        id: element.getAttribute('data-id'),
                        label: element.getAttribute('data-label'),
                    }),
                },
            ];
        },
    }).configure(mentionConfig);
}

/**
 * Updates popup position relative to the cursor
 */
function updatePopupPosition(props, popup) {
    if (!popup || !props.clientRect) return;

    const rect = props.clientRect();
    if (!rect) return;

    popup.style.position = 'fixed';
    popup.style.left = `${rect.left}px`;
    popup.style.top = `${rect.bottom + 8}px`;
    popup.style.zIndex = '9999';
}

/**
 * Creates the suggestion dropdown component using safe DOM methods
 */
function createSuggestionComponent(props, container, onSelectCallback) {
    let selectedIndex = 0;
    let items = props.items;

    function render() {
        // Clear container safely
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        if (items.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'bg-base-200 rounded-xl shadow-xl border border-base-300 p-3 text-sm text-base-content/60';
            emptyDiv.textContent = 'No users found';
            container.appendChild(emptyDiv);
            return;
        }

        const listContainer = document.createElement('div');
        listContainer.className = 'bg-base-200 rounded-xl shadow-xl border border-base-300 overflow-hidden max-h-64 overflow-y-auto';

        items.forEach((item, index) => {
            const button = createUserButton(item, index, index === selectedIndex);
            button.addEventListener('click', (e) => {
                e.preventDefault();
                selectItem(index);
            });
            listContainer.appendChild(button);
        });

        container.appendChild(listContainer);
    }

    function createUserButton(item, index, isSelected) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `mention-suggestion-item w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${isSelected ? 'bg-primary/20' : 'hover:bg-base-300'}`;
        button.dataset.index = index;

        // Avatar container - using mask-squircle to match app style
        const avatarContainer = document.createElement('div');
        avatarContainer.className = 'w-8 h-8 mask mask-squircle overflow-hidden flex-shrink-0';

        if (item.avatar_thumb_url) {
            const img = document.createElement('img');
            img.src = item.avatar_thumb_url;
            img.alt = '';
            img.className = 'w-full h-full object-cover';
            avatarContainer.appendChild(img);
        } else {
            // Gradient background with initial - matches avatar-with-ring component
            const placeholder = document.createElement('div');
            placeholder.className = 'w-full h-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center';
            const initial = document.createElement('span');
            initial.className = 'text-sm font-bold text-primary/50 select-none';
            initial.textContent = (item.display_name || item.username || '?').charAt(0).toUpperCase();
            placeholder.appendChild(initial);
            avatarContainer.appendChild(placeholder);
        }

        // Text container
        const textContainer = document.createElement('div');
        textContainer.className = 'flex-1 min-w-0';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'font-medium text-sm truncate';
        nameDiv.textContent = item.display_name || item.username;

        const usernameDiv = document.createElement('div');
        usernameDiv.className = 'text-xs text-base-content/60 truncate';
        usernameDiv.textContent = `@${item.username}`;

        textContainer.appendChild(nameDiv);
        textContainer.appendChild(usernameDiv);

        button.appendChild(avatarContainer);
        button.appendChild(textContainer);

        return button;
    }

    function selectItem(index) {
        const item = items[index];
        if (item) {
            props.command({
                id: item.id,
                label: item.username,
            });
            onSelectCallback(item);
        }
    }

    function update(newProps) {
        props = newProps;
        items = newProps.items;
        selectedIndex = 0;
        render();
    }

    function onKeyDown({ event }) {
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            render();
            return true;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            render();
            return true;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            selectItem(selectedIndex);
            return true;
        }

        return false;
    }

    // Initial render
    render();

    return {
        update,
        onKeyDown,
    };
}
