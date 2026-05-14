import Mention from '@tiptap/extension-mention';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';

/**
 * Shape of a single user record returned by the mention search endpoint.
 * The actual API may return additional fields (id, etc.); we declare the
 * subset this component renders.
 */
export interface MentionUser {
    id: number | string;
    username: string;
    display_name?: string | null;
    avatar_thumb_url?: string | null;
}

export interface MentionExtensionOptions {
    searchEndpoint?: string;
    onSelect?: (item: MentionUser) => void;
}

/**
 * Mention attribute shape stored on the ProseMirror node. Tiptap's
 * built-in `MentionNodeAttrs` declares `id: string | null`, but in
 * practice numeric IDs flow through fine — they get serialized via
 * `data-id` either way. The `Partial` widening below avoids invariance
 * collisions with Tiptap's declared `MentionOptions<any, MentionNodeAttrs>`.
 */
type MentionAttrs = {
    id: string | null;
    label?: string | null;
};

type MentionSuggestionProps = SuggestionProps<MentionUser, MentionAttrs>;

interface SuggestionComponent {
    update: (newProps: MentionSuggestionProps) => void;
    onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

/**
 * Creates a custom mention extension for @user mentions.
 */
export default function createMentionExtension(options: MentionExtensionOptions = {}) {
    const {
        searchEndpoint = '/api/v1/users/search',
        onSelect = () => {},
    } = options;

    const mentionConfig = {
        HTMLAttributes: {
            class: 'mention mention-user font-medium cursor-pointer hover:underline',
        },
        // noinspection JSUnusedGlobalSymbols — consumed by Tiptap MentionExtension via .configure()
        renderText({ node }: { node: PMNode }): string {
            const attrs = node.attrs as MentionAttrs;
            return `@${attrs.label ?? attrs.id ?? ''}`;
        },
        // noinspection JSUnusedGlobalSymbols — consumed by Tiptap MentionExtension via .configure()
        renderHTML({ options: opts, node }: { options: { HTMLAttributes: Record<string, unknown> }; node: PMNode }) {
            const attrs = node.attrs as MentionAttrs;
            const username = attrs.label ?? attrs.id ?? '';
            return [
                'a',
                {
                    ...opts.HTMLAttributes,
                    'data-type': 'mention',
                    'data-id': attrs.id,
                    'data-label': attrs.label,
                    'href': `/u/${String(username).toLowerCase()}`,
                },
                `@${username}`,
            ] as const;
        },
        suggestion: {
            char: '@',
            allowSpaces: false,

            items: async ({ query }: { query: string }): Promise<MentionUser[]> => {
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
                    return (data.data as MentionUser[] | undefined) ?? [];
                } catch (error) {
                    console.error('Error fetching users for mention:', error);
                    return [];
                }
            },

            render: () => {
                let component: SuggestionComponent | null = null;
                let popup: HTMLDivElement | null = null;

                return {
                    // noinspection JSUnusedGlobalSymbols — Tiptap suggestion render() lifecycle callback
                    onStart: (props: MentionSuggestionProps) => {
                        popup = document.createElement('div');
                        popup.className = 'tiptap-mention-popup';
                        document.body.appendChild(popup);

                        component = createSuggestionComponent(props, popup, onSelect);
                        updatePopupPosition(props, popup);
                    },

                    onUpdate: (props: MentionSuggestionProps) => {
                        if (component) {
                            component.update(props);
                            if (popup) {
                                updatePopupPosition(props, popup);
                            }
                        }
                    },

                    onKeyDown: (props: SuggestionKeyDownProps): boolean => {
                        if (props.event.key === 'Escape') {
                            popup?.remove();
                            return true;
                        }

                        if (component) {
                            return component.onKeyDown(props);
                        }

                        return false;
                    },

                    // noinspection JSUnusedGlobalSymbols — Tiptap suggestion render() lifecycle callback
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
                    getAttrs: (element: HTMLElement | string) => {
                        if (typeof element === 'string') return false;
                        return {
                            id: element.getAttribute('data-id'),
                            label: element.getAttribute('data-label'),
                        };
                    },
                },
                {
                    tag: `span[data-type="mention"]`,
                    priority: 60,
                    getAttrs: (element: HTMLElement | string) => {
                        if (typeof element === 'string') return false;
                        return {
                            id: element.getAttribute('data-id'),
                            label: element.getAttribute('data-label'),
                        };
                    },
                },
            ];
        },
    }).configure(mentionConfig);
}

/**
 * Updates popup position relative to the cursor.
 */
function updatePopupPosition(
    props: MentionSuggestionProps,
    popup: HTMLDivElement,
): void {
    if (!popup || !props.clientRect) return;

    const rect = props.clientRect();
    if (!rect) return;

    popup.style.position = 'fixed';
    popup.style.left = `${rect.left}px`;
    popup.style.top = `${rect.bottom + 8}px`;
    popup.style.zIndex = '9999';
}

/**
 * Creates the suggestion dropdown component using safe DOM methods.
 */
function createSuggestionComponent(
    initialProps: MentionSuggestionProps,
    container: HTMLDivElement,
    onSelectCallback: (item: MentionUser) => void,
): SuggestionComponent {
    let props = initialProps;
    let selectedIndex = 0;
    let items: MentionUser[] = props.items;

    function render(): void {
        // Clear container safely
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        if (items.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'shadow-xl p-3 text-sm';
            Object.assign(emptyDiv.style, {
                background: 'var(--theme-base-200)',
                border: '1px solid var(--theme-base-300)',
                borderRadius: 'var(--theme-radius-card)',
                color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
            });
            emptyDiv.textContent = 'No users found';
            container.appendChild(emptyDiv);
            return;
        }

        const listContainer = document.createElement('div');
        listContainer.className = 'shadow-xl overflow-hidden max-h-64 overflow-y-auto';
        Object.assign(listContainer.style, {
            background: 'var(--theme-base-200)',
            border: '1px solid var(--theme-base-300)',
            borderRadius: 'var(--theme-radius-card)',
        });

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

    function createUserButton(item: MentionUser, index: number, isSelected: boolean): HTMLButtonElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'alex-row mention-suggestion-item w-full flex items-center gap-3 px-3 py-2 text-left transition-colors';
        if (isSelected) {
            button.style.background = 'color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)';
        }
        button.dataset.index = String(index);

        // Avatar container — squircle shape from .alex-mask-squircle (ui-polish.css).
        const avatarContainer = document.createElement('div');
        avatarContainer.className = 'w-8 h-8 alex-mask-squircle overflow-hidden flex-shrink-0';

        if (item.avatar_thumb_url) {
            const img = document.createElement('img');
            img.src = item.avatar_thumb_url;
            img.alt = '';
            img.className = 'w-full h-full object-cover';
            avatarContainer.appendChild(img);
        } else {
            // Gradient placeholder with initial — matches AvatarWithRing.
            const placeholder = document.createElement('div');
            placeholder.className = 'w-full h-full flex items-center justify-center';
            placeholder.style.background = 'linear-gradient(to bottom right, color-mix(in srgb, var(--theme-brand-primary-500) 30%, transparent), color-mix(in srgb, var(--theme-brand-secondary-500) 30%, transparent))';
            const initial = document.createElement('span');
            initial.className = 'text-sm font-bold select-none';
            initial.style.color = 'color-mix(in srgb, var(--theme-brand-primary-500) 50%, transparent)';
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
        usernameDiv.className = 'text-xs truncate';
        usernameDiv.style.color = 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)';
        usernameDiv.textContent = `@${item.username}`;

        textContainer.appendChild(nameDiv);
        textContainer.appendChild(usernameDiv);

        button.appendChild(avatarContainer);
        button.appendChild(textContainer);

        return button;
    }

    function selectItem(index: number): void {
        const item = items[index];
        if (item) {
            props.command({
                id: String(item.id),
                label: item.username,
            });
            onSelectCallback(item);
        }
    }

    function update(newProps: MentionSuggestionProps): void {
        props = newProps;
        items = newProps.items;
        selectedIndex = 0;
        render();
    }

    function onKeyDown({ event }: SuggestionKeyDownProps): boolean {
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
