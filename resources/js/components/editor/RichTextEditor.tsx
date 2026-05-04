import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useEffect, useRef, useCallback } from 'react';
import AiWritingModal from './AiWritingModal';
import { parseWikiToHtml } from '../tiptap-bio-editor/utils/wiki-parser';
import { serializeToWiki } from '../tiptap-bio-editor/utils/wiki-serializer';
import createMentionExtension from '../tiptap-bio-editor/extensions/mention';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import Tooltip from '@alexandria/components/ui/Tooltip';

/**
 * RichTextEditor — Tiptap 3 wiki-markup editor surface.
 *
 * Storage format: Alexandria wiki markup ('''bold''', ''italic'',
 * [[Entry Links]], @mentions). Display format: HTML via Tiptap.
 *
 * Tier gating: `EditorTier = 'free' | 'premium' | 'pro'` is a generic
 * discrimination — consumer apps decide which tier to pass at runtime.
 * No coupling to a specific billing system.
 *
 * Network endpoints used by this component (consumer apps must expose
 * these; the URLs are kept verbatim from legacy as a sensible default):
 *
 * - `POST /api/v1/ai/write` — AI writing-assistant action. Used only
 *   when `enableAi` is true. Body shape:
 *   `{ action, text, prompt, project_id, instruction_id }`
 *   Expected response: `{ result: string }` (wiki markup).
 *
 * - `GET /api/v1/users/search?q=…&limit=…` — Mention autocomplete
 *   (override via the `mentionSearchEndpoint` prop).
 *
 * - `GET /api/v1/ai/prompts`, `POST /api/v1/ai/prompts`,
 *   `DELETE /api/v1/ai/prompts/{id}` — saved-prompt CRUD used by the
 *   AI writing modal.
 */
export type EditorTier = 'free' | 'premium' | 'pro';

interface RichTextEditorProps {
    /** Wiki markup value */
    value: string;
    /** Called with wiki markup on change (300ms debounced) */
    onChange: (wiki: string) => void;
    placeholder?: string;
    maxLength?: number;
    /** Controls which toolbar buttons are available */
    tier?: EditorTier;
    /** Show @mention button and enable @ trigger */
    enableMentions?: boolean;
    /** API endpoint for @mention user search */
    mentionSearchEndpoint?: string;
    /** Show [[entry link]] button and enable [[ trigger */
    enableEntryLinks?: boolean;
    /** Enable AI writing assistant commands */
    enableAi?: boolean;
    /** Project ID for AI transaction tracking */
    projectId?: number;
    /** Available AI writing instruction sets for this project */
    aiInstructions?: Array<{ id: number; label: string; is_default: boolean }>;
    /** Label shown above the editor */
    label?: string;
    className?: string;
}

/* ── Toolbar button definitions ── */

interface ToolbarButtonDef {
    icon: string;
    title: string;
    description: string;
    shortcut: string | null;
    shortcutMac: string | null;
    action: (editor: Editor, actions: EditorActions) => void;
    isActive: (editor: Editor) => boolean;
}

interface EditorActions {
    openLinkModal: () => void;
    insertMention: () => void;
}

const BUTTONS: Record<string, ToolbarButtonDef> = {
    bold: {
        icon: 'fa-bold', title: 'Bold', description: 'Make text bold',
        shortcut: 'Ctrl+B', shortcutMac: '⌘+B',
        action: (e) => e.chain().focus().toggleBold().run(),
        isActive: (e) => e.isActive('bold'),
    },
    italic: {
        icon: 'fa-italic', title: 'Italic', description: 'Make text italic',
        shortcut: 'Ctrl+I', shortcutMac: '⌘+I',
        action: (e) => e.chain().focus().toggleItalic().run(),
        isActive: (e) => e.isActive('italic'),
    },
    underline: {
        icon: 'fa-underline', title: 'Underline', description: 'Underline text',
        shortcut: 'Ctrl+U', shortcutMac: '⌘+U',
        action: (e) => e.chain().focus().toggleUnderline().run(),
        isActive: (e) => e.isActive('underline'),
    },
    link: {
        icon: 'fa-link', title: 'Link', description: 'Insert or edit a hyperlink',
        shortcut: 'Ctrl+K', shortcutMac: '⌘+K',
        action: (_e, a) => a.openLinkModal(),
        isActive: (e) => e.isActive('link'),
    },
    bulletList: {
        icon: 'fa-list-ul', title: 'Bullet List', description: 'Create a bulleted list',
        shortcut: null, shortcutMac: null,
        action: (e) => e.chain().focus().toggleBulletList().run(),
        isActive: (e) => e.isActive('bulletList'),
    },
    orderedList: {
        icon: 'fa-list-ol', title: 'Numbered List', description: 'Create a numbered list',
        shortcut: null, shortcutMac: null,
        action: (e) => e.chain().focus().toggleOrderedList().run(),
        isActive: (e) => e.isActive('orderedList'),
    },
    heading2: {
        icon: 'fa-h2', title: 'Heading 2', description: 'Large heading',
        shortcut: '==', shortcutMac: '==',
        action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
        isActive: (e) => e.isActive('heading', { level: 2 }),
    },
    heading3: {
        icon: 'fa-h3', title: 'Heading 3', description: 'Medium heading',
        shortcut: '===', shortcutMac: '===',
        action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
        isActive: (e) => e.isActive('heading', { level: 3 }),
    },
    mention: {
        icon: 'fa-at', title: 'Mention User', description: 'Mention a user with @username',
        shortcut: '@', shortcutMac: '@',
        action: (_e, a) => a.insertMention(),
        isActive: () => false,
    },
    entryLink: {
        icon: 'fa-file-lines', title: 'Entry Link', description: 'Link to an entry with [[Page Name]]',
        shortcut: '[[', shortcutMac: '[[',
        action: (e) => e.chain().focus().insertContent('[[').run(),
        isActive: () => false,
    },
};

const TIER_TOOLBARS: Record<EditorTier, string[]> = {
    free: ['bold', 'italic', 'underline', 'link', '|', 'bulletList', 'orderedList'],
    premium: ['bold', 'italic', 'underline', 'link', '|', 'bulletList', 'orderedList', '|', 'heading2', 'heading3'],
    pro: ['bold', 'italic', 'underline', 'link', '|', 'bulletList', 'orderedList', '|', 'heading2', 'heading3'],
};

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

/* ── Component ── */

export default function RichTextEditor({
    value,
    onChange,
    placeholder = 'Start writing...',
    maxLength = 1000,
    tier = 'free',
    enableMentions = true,
    mentionSearchEndpoint = '/api/v1/users/search',
    enableEntryLinks = false,
    enableAi = false,
    label,
    className,
    projectId,
    aiInstructions = [],
}: RichTextEditorProps) {
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [showLegend, setShowLegend] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkText, setLinkText] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [codeView, setCodeView] = useState(false);
    const [codeValue, setCodeValue] = useState('');
    const [, setEditorState] = useState(0);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
    const isExternalUpdate = useRef(false);

    const extensions = [
        StarterKit.configure({
            heading: tier !== 'free' ? { levels: [2, 3] } : false,
        }),
        Underline,
        LinkExtension.configure({
            openOnClick: false,
            HTMLAttributes: { rel: 'noopener noreferrer nofollow' },
        }),
        Placeholder.configure({ placeholder }),
        ...(enableMentions ? [createMentionExtension({ searchEndpoint: mentionSearchEndpoint })] : []),
    ];

    const editor = useEditor({
        extensions,
        content: parseWikiToHtml(value),
        // Tiptap React >=3.21 disables auto re-render on transactions by
        // default for perf. Without this, pressing Ctrl+B (or any
        // keyboard shortcut that toggles a mark/node) flips the editor
        // state but the toolbar buttons don't update isActive() until
        // some other React re-render comes along. Re-enable the v3.20
        // behavior so the toolbar tracks the cursor's mark set live.
        shouldRerenderOnTransaction: true,
        onUpdate: ({ editor: e }) => {
            if (isExternalUpdate.current) return;

            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                onChange(serializeToWiki(e));
            }, 300);
        },
        onFocus: () => setIsFocused(true),
        onBlur: () => setIsFocused(false),
        onTransaction: () => setEditorState((n) => n + 1),
    });

    // Sync external value changes back to editor
    useEffect(() => {
        if (!editor || editor.isDestroyed) return;

        const currentWiki = serializeToWiki(editor);
        if (value !== currentWiki) {
            isExternalUpdate.current = true;
            editor.commands.setContent(parseWikiToHtml(value), { emitUpdate: false });
            isExternalUpdate.current = false;
        }
    }, [value]);

    // Toggle between WYSIWYG and code view
    function toggleCodeView() {
        if (!editor) return;
        if (codeView) {
            // Switching back to WYSIWYG — apply the edited wiki markup
            isExternalUpdate.current = true;
            editor.commands.setContent(parseWikiToHtml(codeValue), { emitUpdate: false });
            isExternalUpdate.current = false;
            onChange(codeValue);
            setCodeView(false);
        } else {
            // Switching to code view — capture current wiki markup
            setCodeValue(serializeToWiki(editor));
            setCodeView(true);
        }
    }

    const charCount = value.length;
    const overLimit = charCount > maxLength;
    const toolbarItems = TIER_TOOLBARS[tier];

    const actions: EditorActions = {
        openLinkModal: useCallback(() => {
            if (!editor) return;
            const existingLink = editor.getAttributes('link');
            const { from, to } = editor.state.selection;
            const selectedText = editor.state.doc.textBetween(from, to, '');
            setLinkUrl(existingLink.href ?? '');
            setLinkText(selectedText || '');
            setShowLinkModal(true);
        }, [editor]),
        insertMention: useCallback(() => {
            if (!editor) return;
            editor.chain().focus().insertContent('@').run();
        }, [editor]),
    };

    function applyLink() {
        if (!editor || !linkUrl) return;
        if (linkText) {
            editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkText}</a>`).run();
        } else {
            editor.chain().focus().setLink({ href: linkUrl }).run();
        }
        setShowLinkModal(false);
        setLinkUrl('');
        setLinkText('');
    }

    function removeLink() {
        if (!editor) return;
        editor.chain().focus().unsetLink().run();
        setShowLinkModal(false);
        setLinkUrl('');
        setLinkText('');
    }

    // AI writing assistant
    async function executeAiAction(action: string, customPrompt = '', instructionId: number | null = null) {
        if (!editor) return;

        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, '\n');

        setAiLoading(true);

        const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

        const r = await fetch('/api/v1/ai/write', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                action,
                text: selectedText || serializeToWiki(editor),
                prompt: customPrompt,
                project_id: projectId,
                instruction_id: instructionId,
            }),
        }).catch(() => null);

        if (r?.ok) {
            const data = await r.json();
            if (data.result) {
                const htmlContent = parseWikiToHtml(data.result);

                if (selectedText) {
                    // Replace selection with parsed HTML
                    editor.chain().focus().deleteRange({ from, to }).insertContent(htmlContent).run();
                } else if (action === 'continue') {
                    // Append parsed HTML at end
                    editor.chain().focus().insertContentAt(editor.state.doc.content.size - 1, htmlContent).run();
                } else {
                    // Replace all content
                    editor.commands.setContent(htmlContent, { emitUpdate: false });
                }
                // Trigger onChange
                if (debounceRef.current) clearTimeout(debounceRef.current);
                onChange(serializeToWiki(editor));
            }
        }

        setAiLoading(false);
        if (r?.ok) setShowAiModal(false);
    }

    // Build legend items from the active toolbar + special buttons
    function getLegendItems() {
        const items = toolbarItems
            .filter((k) => k !== '|')
            .map((k) => BUTTONS[k])
            .filter(Boolean)
            .map((btn) => ({
                icon: btn.icon,
                title: btn.title,
                description: btn.description,
                shortcut: isMac ? btn.shortcutMac : btn.shortcut,
            }));

        if (enableMentions) {
            const m = BUTTONS.mention;
            items.push({ icon: m.icon, title: m.title, description: m.description, shortcut: '@' });
        }
        if (enableEntryLinks) {
            const e = BUTTONS.entryLink;
            items.push({ icon: e.icon, title: e.title, description: e.description, shortcut: '[[' });
        }

        return items;
    }

    if (!editor) return null;

    return (
        <div className={`space-y-2 ${className ?? ''}`}>
            {/* Label + Character Count Row */}
            {(label || maxLength > 0) && (
                <div className="flex items-center justify-between">
                    {label && (
                        <span className={`text-sm font-semibold transition-colors duration-200 ${isFocused ? 'text-secondary' : ''}`}>
                            {label}
                        </span>
                    )}
                    <span className={`text-xs ${overLimit ? 'text-error' : 'text-base-content/50'}`}>
                        {charCount}/{maxLength}
                    </span>
                </div>
            )}

            {/* Editor Container */}
            <div className={`relative rounded-2xl border transition-all ${
                overLimit
                    ? 'border-error ring-2 ring-error'
                    : isFocused
                        ? 'border-secondary ring-2 ring-secondary'
                        : 'border-base-300'
            }`}>
                {/* Toolbar */}
                <div className="flex items-center justify-between rounded-t-2xl border-b border-base-300 bg-base-300/30 p-2">
                    <div className={`flex items-center gap-1 ${codeView ? 'pointer-events-none opacity-30' : ''}`}>
                        {/* Tier-based buttons */}
                        {toolbarItems.map((item, i) => {
                            if (item === '|') {
                                return <span key={`div-${i}`} className="mx-1 inline-block h-5 w-px bg-base-300" />;
                            }

                            const btn = BUTTONS[item];
                            if (!btn) return null;
                            const active = !codeView && btn.isActive(editor);

                            return (
                                <Tooltip key={item} content={btn.title}>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); btn.action(editor, actions); }}
                                        className={`btn btn-sm btn-ghost btn-square ${active ? 'bg-secondary/20 text-secondary' : ''}`}
                                        disabled={codeView}
                                    >
                                        <i className={`fa-solid ${btn.icon}`} />
                                    </button>
                                </Tooltip>
                            );
                        })}

                        {/* Divider before special buttons (only if any are visible) */}
                        {(enableMentions || enableEntryLinks) && (
                            <span className="mx-1 inline-block h-5 w-px bg-base-300" />
                        )}

                        {/* @Mention (always if enabled) */}
                        {enableMentions && (
                            <Tooltip content="Mention User">
                                <button
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); actions.insertMention(); }}
                                    className="btn btn-sm btn-ghost btn-square"
                                >
                                    <i className="fa-solid fa-at" />
                                </button>
                            </Tooltip>
                        )}

                        {/* [[Entry Link]] (only when enabled) */}
                        {enableEntryLinks && (
                            <Tooltip content="Entry Link">
                                <button
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().insertContent('[[').run(); }}
                                    className="btn btn-sm btn-ghost btn-square"
                                >
                                    <i className="fa-solid fa-file-lines" />
                                </button>
                            </Tooltip>
                        )}
                        {/* AI Writing Assistant */}
                        {enableAi && (
                            <>
                                <span className="mx-1 inline-block h-5 w-px bg-base-300" />
                                <Tooltip content="AI Writing Assistant">
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); setShowAiModal(true); }}
                                        className={`btn btn-sm btn-ghost btn-square ${aiLoading ? 'animate-pulse text-secondary' : 'text-secondary/70 hover:text-secondary'}`}
                                        disabled={aiLoading}
                                    >
                                        {aiLoading ? <span className="loading loading-spinner loading-xs" /> : <i className="fa-solid fa-wand-magic-sparkles" />}
                                    </button>
                                </Tooltip>
                            </>
                        )}
                    </div>

                    {/* Right-side buttons */}
                    <div className="flex items-center gap-1">
                        {/* Code View Toggle */}
                        <Tooltip content={codeView ? 'Switch to WYSIWYG' : 'Switch to Code View'}>
                            <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); toggleCodeView(); }}
                                className={`btn btn-sm btn-ghost btn-square ${codeView ? 'bg-secondary/20 text-secondary' : 'text-base-content/50 hover:text-base-content'}`}
                            >
                                <i className={`fa-solid ${codeView ? 'fa-eye' : 'fa-code'}`} />
                            </button>
                        </Tooltip>

                        {/* Help/Legend button */}
                        <Tooltip content="Formatting Help">
                            <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); setShowLegend(true); }}
                                className="btn btn-sm btn-ghost btn-square text-base-content/50 hover:text-base-content"
                            >
                                <i className="fa-solid fa-circle-question" />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Editor Area / Code View */}
                {codeView ? (
                    <div className="overflow-hidden rounded-b-2xl bg-base-100">
                        <textarea
                            value={codeValue}
                            onChange={(e) => { setCodeValue(e.target.value); onChange(e.target.value); }}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            className="min-h-[120px] w-full resize-none bg-base-100 p-4 font-mono text-sm text-base-content outline-none"
                            spellCheck={false}
                        />
                    </div>
                ) : (
                    <div className="tiptap-editor overflow-hidden rounded-b-2xl bg-base-100 [&_.ProseMirror>*:last-child]:mb-0">
                        <EditorContent editor={editor} />
                    </div>
                )}
            </div>

            {/* Link Modal */}
            <Modal open={showLinkModal} onClose={() => setShowLinkModal(false)} maxWidth="max-w-sm">
                <div className="p-6">
                    <h3 className="mb-4 text-lg font-bold">Insert Link</h3>
                    <div className="mb-4 space-y-3">
                        <div>
                            <label className="label py-1">
                                <span className="label-text text-sm">URL <span className="text-error">*</span></span>
                            </label>
                            <input
                                type="url"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyLink()}
                                placeholder="https://example.com"
                                className="input input-bordered w-full rounded-xl"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="label py-1">
                                <span className="label-text text-sm">Display Text</span>
                                <span className="label-text-alt text-xs text-base-content/50">Optional</span>
                            </label>
                            <input
                                type="text"
                                value={linkText}
                                onChange={(e) => setLinkText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyLink()}
                                placeholder="Leave empty to show URL"
                                className="input input-bordered w-full rounded-xl"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        {editor.isActive('link') && (
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); removeLink(); }} className="btn btn-ghost rounded-xl text-error hover:bg-error/10">
                                Unlink
                            </button>
                        )}
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); setShowLinkModal(false); }} className="btn btn-ghost rounded-xl">
                            Cancel
                        </button>
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); applyLink(); }} className="btn btn-secondary rounded-xl" disabled={!linkUrl}>
                            Apply
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Legend/Help Modal */}
            <Modal open={showLegend} onClose={() => setShowLegend(false)} maxWidth="max-w-md">
                <ModalHeader title="Formatting Help" onClose={() => setShowLegend(false)} />
                <div className="max-h-[60vh] space-y-1 overflow-y-auto p-6">
                    {getLegendItems().map((item) => (
                        <div key={item.title} className="flex items-center gap-3 rounded-lg p-2 hover:bg-base-300/50">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-base-300">
                                <i className={`fa-solid ${item.icon} text-sm`} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium">{item.title}</div>
                                <div className="text-xs text-base-content/60">{item.description}</div>
                            </div>
                            {item.shortcut && (
                                <kbd className="kbd kbd-sm flex-shrink-0 text-xs">{item.shortcut}</kbd>
                            )}
                        </div>
                    ))}
                </div>
                <div className="border-t border-base-300 px-6 py-4">
                    <p className="text-xs text-base-content/60">
                        Tip: Type @ to mention a user{enableEntryLinks ? ', or [[ to link to an entry' : ''}.
                    </p>
                </div>
            </Modal>

            {/* AI Writing Modal */}
            {enableAi && (
                <AiWritingModal
                    open={showAiModal}
                    hasSelection={editor ? editor.state.selection.from !== editor.state.selection.to : false}
                    aiInstructions={aiInstructions}
                    onClose={() => setShowAiModal(false)}
                    onExecute={(action, prompt, instructionId) => executeAiAction(action, prompt, instructionId).then()}
                    loading={aiLoading}
                />
            )}
        </div>
    );
}
