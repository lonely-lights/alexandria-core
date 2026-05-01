import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { getPresetForTier, toolbarButtons } from './config/toolbar-presets.js';
import createMentionExtension from './extensions/mention.js';
import createEntryLinkExtension from './extensions/entry-link.js';
import { serializeToWiki } from './utils/wiki-serializer.js';
import { parseWikiToHtml } from './utils/wiki-parser.js';

/**
 * TipTap Bio Editor - Alpine.js Component
 *
 * A rich text editor for user bios with @mention autocomplete support.
 * Stores content in Alexandria wiki markup format for consistency with the
 * content processing system.
 *
 * Storage Format: Wiki markup ('''bold''', ''italic'', [[Entry Links]], @mentions)
 * Display Format: Rich text via TipTap
 */
export default function tiptapBioEditor(config = {}) {
    return {
        // Configuration
        wireModel: config.wireModel || null,
        initialContent: config.initialContent || '',
        placeholder: config.placeholder || 'Write something...',
        maxLength: config.maxLength || 1000,
        tier: config.tier || 'free',
        mentionSearchEndpoint: config.mentionSearchEndpoint || '/api/v1/users/search',
        entrySearchEndpoint: config.entrySearchEndpoint || '/api/v1/entries/search',
        projectId: config.projectId || null,
        useWikiFormat: config.useWikiFormat !== false, // Default to wiki format
        enableEntryLinks: config.enableEntryLinks === true, // Default to disabled

        // State
        editor: null,
        content: '',       // Wiki markup (for storage)
        htmlContent: '',   // HTML (for editor display)
        charCount: 0,
        isFocused: false,
        updatedAt: Date.now(), // Reactive trigger for button states
        showLinkModal: false,
        linkModalReady: false, // Prevents immediate dismissal from mouseup
        hasExistingLink: false, // Whether cursor is on an existing link
        showLegendModal: false,
        legendModalReady: false,
        linkUrl: '',
        linkText: '',
        syncTimeout: null,

        // Computed
        get toolbarConfig() {
            return getPresetForTier(this.tier);
        },

        get isOverLimit() {
            return this.charCount > this.maxLength;
        },

        get isMac() {
            return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        },

        get legendItems() {
            // Get buttons available for current tier, excluding dividers
            const items = this.toolbarConfig.toolbar
                .filter(key => key !== 'divider')
                .map(key => {
                    const btn = toolbarButtons[key];
                    return {
                        key,
                        icon: btn.icon,
                        title: btn.title,
                        description: btn.description,
                        shortcut: this.isMac ? btn.shortcutMac : btn.shortcut,
                    };
                });

            // Add @mention button (always available)
            const mentionBtn = toolbarButtons.mention;
            items.push({
                key: 'mention',
                icon: mentionBtn.icon,
                title: mentionBtn.title,
                description: mentionBtn.description,
                shortcut: '@',
            });

            // Add [[entry link]] button (only when enabled)
            if (this.enableEntryLinks) {
                const entryLinkBtn = toolbarButtons.entryLink;
                items.push({
                    key: 'entryLink',
                    icon: entryLinkBtn.icon,
                    title: entryLinkBtn.title,
                    description: entryLinkBtn.description,
                    shortcut: '[[',
                });
            }

            return items;
        },

        init() {
            const preset = this.toolbarConfig;

            // Build extensions array based on tier
            const extensions = [
                StarterKit.configure({
                    heading: preset.extensions.includes('heading') ? { levels: [2, 3] } : false,
                    bulletList: preset.extensions.includes('bulletList'),
                    orderedList: preset.extensions.includes('orderedList'),
                    bold: preset.extensions.includes('bold'),
                    italic: preset.extensions.includes('italic'),
                    // Disable StarterKit's Link - we configure our own below
                    link: false,
                }),
                Placeholder.configure({
                    placeholder: this.placeholder,
                }),
                Link.configure({
                    openOnClick: false,
                    HTMLAttributes: {
                        class: 'text-primary hover:underline',
                        rel: 'noopener noreferrer nofollow',
                    },
                }),
                Underline,
                createMentionExtension({
                    searchEndpoint: this.mentionSearchEndpoint,
                    onSelect: (user) => {
                        // Mention selected callback
                    },
                }),
            ];

            // Add entry link extension only if enabled (for project-scoped editors)
            if (this.enableEntryLinks) {
                extensions.push(
                    createEntryLinkExtension({
                        searchEndpoint: this.entrySearchEndpoint,
                        projectId: this.projectId,
                        onSelect: (entry) => {
                            // Entry link selected callback
                        },
                    })
                );
            }

            // TODO: Image extension will be re-added with display options (inline, float, gallery, etc.)

            // Parse initial content: wiki markup → HTML for editor
            this.content = this.initialContent || '';
            if (this.useWikiFormat && this.content) {
                this.htmlContent = parseWikiToHtml(this.content);
            } else {
                this.htmlContent = this.content;
            }

            // Store reference to component for use in editor callbacks
            const component = this;

            // Initialize the editor with HTML content
            this.editor = new Editor({
                element: this.$refs.editor,
                extensions,
                content: this.htmlContent,
                editorProps: {
                    attributes: {
                        class: 'prose prose-sm max-w-none focus:outline-none min-h-[8rem] p-4',
                    },
                    handleKeyDown(view, event) {
                        // Ctrl+K or Cmd+K to open link modal
                        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                            event.preventDefault();
                            component.openLinkModal();
                            return true;
                        }
                        return false;
                    },
                },
                onUpdate: ({ editor }) => {
                    // Convert editor content to wiki markup for storage
                    if (this.useWikiFormat) {
                        this.content = serializeToWiki(editor);
                    } else {
                        this.content = editor.getHTML();
                    }
                    this.htmlContent = editor.getHTML();
                    this.charCount = editor.getText().length;
                    this.updatedAt = Date.now();
                    this.syncToLivewire();
                },
                onSelectionUpdate: () => {
                    // Trigger reactive update for button states when selection changes
                    this.updatedAt = Date.now();
                },
                onTransaction: () => {
                    // Trigger reactive update on any transaction (formatting, etc.)
                    this.updatedAt = Date.now();
                },
                onFocus: () => {
                    this.isFocused = true;
                    this.updatedAt = Date.now();
                },
                onBlur: () => {
                    this.isFocused = false;
                },
            });

            // Update char count
            this.charCount = this.editor.getText().length;

            // Listen for Livewire component updates
            if (this.wireModel) {
                const self = this;

                Livewire.hook('morph.updated', ({ el, component }) => {
                    const rawEditor = self.getRawEditor();
                    if (self.$wire && rawEditor) {
                        const newValue = self.$wire[self.wireModel];
                        const hasNewValue = newValue !== undefined && newValue !== null && newValue !== '';
                        const hasCurrentContent = self.content && self.content !== '';

                        if (newValue !== self.content && (hasNewValue || !hasCurrentContent)) {
                            self.content = newValue || '';
                            // Parse wiki to HTML for editor
                            if (self.useWikiFormat) {
                                self.htmlContent = parseWikiToHtml(self.content);
                            } else {
                                self.htmlContent = self.content;
                            }
                            rawEditor.commands.setContent(self.htmlContent, false);
                            self.charCount = rawEditor.getText().length;
                        }
                    }
                });
            }
        },

        // Alpine's destroy lifecycle hook
        destroy() {
            if (this.syncTimeout) {
                clearTimeout(this.syncTimeout);
            }
            if (this.editor) {
                this.editor.destroy();
            }
        },

        syncToLivewire() {
            if (this.syncTimeout) {
                clearTimeout(this.syncTimeout);
            }
            this.syncTimeout = setTimeout(() => {
                if (this.wireModel && this.$wire) {
                    // Send wiki markup to Livewire
                    this.$wire.$set(this.wireModel, this.content, false);
                }
            }, 500);
        },

        // Get unwrapped editor instance (Alpine.js wraps in Proxy which breaks transactions)
        getRawEditor() {
            if (this.editor && window.Alpine) {
                return window.Alpine.raw(this.editor);
            }
            return this.editor;
        },

        // Toolbar actions
        executeToolbarAction(buttonKey) {
            const button = toolbarButtons[buttonKey];
            const rawEditor = this.getRawEditor();
            if (button && rawEditor) {
                button.action(rawEditor, this);
            }
        },

        // updatedAt param forces Alpine to re-evaluate when editor state changes
        isButtonActive(buttonKey, updatedAt) {
            const button = toolbarButtons[buttonKey];
            const rawEditor = this.getRawEditor();
            if (button && rawEditor) {
                return button.isActive(rawEditor);
            }
            return false;
        },

        getButtonConfig(buttonKey) {
            return toolbarButtons[buttonKey] || null;
        },

        // Link modal
        openLinkModal() {
            const rawEditor = this.getRawEditor();
            if (!rawEditor) return;

            // Check if cursor is on an existing link
            const previousUrl = rawEditor.getAttributes('link').href || '';
            this.linkUrl = previousUrl;
            this.hasExistingLink = rawEditor.isActive('link');

            // Get currently selected text as default display text
            const { from, to } = rawEditor.state.selection;
            const selectedText = rawEditor.state.doc.textBetween(from, to, '');
            this.linkText = selectedText;

            // Show modal but delay enabling click-outside to prevent mouseup dismissal
            this.linkModalReady = false;
            this.showLinkModal = true;
            setTimeout(() => {
                this.linkModalReady = true;
            }, 100);
        },

        setLink() {
            const rawEditor = this.getRawEditor();
            if (!rawEditor) return;

            if (this.linkUrl) {
                const { from, to, empty } = rawEditor.state.selection;
                const displayText = this.linkText || this.linkUrl;

                if (empty) {
                    // No text selected - insert the link with display text
                    rawEditor
                        .chain()
                        .focus()
                        .insertContent({
                            type: 'text',
                            text: displayText,
                            marks: [{ type: 'link', attrs: { href: this.linkUrl } }],
                        })
                        .unsetMark('link') // Ensure cursor exits the link mark
                        .run();
                } else {
                    // Text is selected - if linkText differs from selection, replace it
                    const selectedText = rawEditor.state.doc.textBetween(from, to, '');

                    if (this.linkText && this.linkText !== selectedText) {
                        // Replace selected text with new display text and apply link
                        rawEditor
                            .chain()
                            .focus()
                            .deleteSelection()
                            .insertContent({
                                type: 'text',
                                text: displayText,
                                marks: [{ type: 'link', attrs: { href: this.linkUrl } }],
                            })
                            .unsetMark('link') // Ensure cursor exits the link mark
                            .run();
                    } else {
                        // Just apply link to existing selection, then move cursor to end
                        const endPos = to;
                        rawEditor
                            .chain()
                            .focus()
                            .extendMarkRange('link')
                            .setLink({ href: this.linkUrl })
                            .setTextSelection(endPos)
                            .unsetMark('link') // Ensure cursor exits the link mark
                            .run();
                    }
                }
            } else {
                rawEditor.chain().focus().unsetLink().run();
            }
            this.showLinkModal = false;
            this.linkModalReady = false;
            this.hasExistingLink = false;
            this.linkUrl = '';
            this.linkText = '';
        },

        unlinkText() {
            const rawEditor = this.getRawEditor();
            if (rawEditor) {
                rawEditor.chain().focus().unsetLink().run();
            }
            this.showLinkModal = false;
            this.linkModalReady = false;
            this.hasExistingLink = false;
            this.linkUrl = '';
            this.linkText = '';
        },

        // Focus the editor
        focus() {
            const rawEditor = this.getRawEditor();
            if (rawEditor) {
                rawEditor.commands.focus();
            }
        },

        // Insert @mention trigger
        insertMention() {
            const rawEditor = this.getRawEditor();
            if (rawEditor) {
                rawEditor.chain().focus().insertContent('@').run();
            }
        },

        // Insert [[entry link]] trigger
        insertEntryLink() {
            const rawEditor = this.getRawEditor();
            if (rawEditor) {
                rawEditor.chain().focus().insertContent('[[').run();
            }
        },

        // Debug: Get current wiki markup
        getWikiMarkup() {
            return this.content;
        },

        // Debug: Get current HTML
        getHtmlContent() {
            return this.htmlContent;
        },
    };
}
