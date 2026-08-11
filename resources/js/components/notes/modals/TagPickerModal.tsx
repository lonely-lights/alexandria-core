import { useState, useEffect, type CSSProperties } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';

interface TagPickerModalProps {
    open: boolean;
    onClose: () => void;
    projectId: number;
    noteTags: string[];
    onToggle: (tag: string, currentlySelected: boolean) => Promise<void>;
    onCreate: (tag: string) => Promise<void>;
}

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const subtleText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)' };

const sectionBorderStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
};

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
};

/**
 * Pull a string label out of whatever shape the API hands us. Spatie's
 * tag relationship can return either a flat string (when the resource
 * casts it via `getNames()`) or an object like `{ name: 'foo' }` /
 * `{ name: { en: 'foo' } }` (when the relationship is loaded raw).
 * Both paths flow through this so the picker always compares strings
 * to strings — and never silently treats an object tag as
 * `[object Object]`.
 */
function tagToString(tag: unknown): string {
    if (typeof tag === 'string') return tag;
    if (tag && typeof tag === 'object') {
        const obj = tag as Record<string, unknown>;
        const name = obj.name;
        if (typeof name === 'string') return name;
        if (name && typeof name === 'object') {
            const entry = Object.values(name as Record<string, unknown>)[0];
            if (typeof entry === 'string') return entry;
        }
    }
    return '';
}

/**
 * Normalize a tag for comparison — trim + lowercase + coerce to
 * string first. Used to gate the all-tags list so a tag in
 * `selectedTags` is hidden from the "available" list even when the
 * `/tags` endpoint returns it with different casing/whitespace than
 * the notes dashboard-list endpoint did.
 */
function normalizeTag(tag: unknown): string {
    return tagToString(tag).trim().toLowerCase();
}

/**
 * De-dup a tag list by normalized name. Spatie can return a tag both
 * by display name and by slug from the same endpoint (e.g.,
 * "Plot Points" + "plot-points"), and our optimistic-add path can
 * stack a fresh entry on top of a refetched server entry. Either case
 * surfaces as the same tag appearing twice in the picker list, so
 * we collapse to the first-seen variant for each normalized key.
 */
function dedupeTags(tags: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const tag of tags) {
        const norm = normalizeTag(tag);
        if (!norm || seen.has(norm)) continue;
        seen.add(norm);
        out.push(tag);
    }
    return out;
}

export default function TagPickerModal({ open, onClose, projectId, noteTags, onToggle, onCreate }: TagPickerModalProps) {
    const t = useT();
    const [allTags, setAllTags] = useState<string[]>([]);
    const [allTagsLoading, setAllTagsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [creating, setCreating] = useState(false);
    // Internal copy of the selected-tag list so toggles can update
    // optimistically without waiting for the parent to refetch + pass
    // a new noteTags prop. Coerced to plain strings via tagToString so
    // a Spatie relationship-shaped prop still becomes ['foo', 'bar']
    // and matches against /tags items by value.
    const [selectedTags, setSelectedTags] = useState<string[]>(() =>
        (noteTags as unknown as Array<unknown>).map(tagToString).filter(Boolean),
    );

    useEffect(() => {
        setSelectedTags(
            (noteTags as unknown as Array<unknown>).map(tagToString).filter(Boolean),
        );
    }, [noteTags, open]);

    useEffect(() => {
        if (!open || !projectId) return;
        setSearch('');
        setAllTagsLoading(true);
        fetch(`/api/v1/projects/${projectId}/tags`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.ok ? r.json() : [])
            .then((tags: unknown[]) => {
                // Same shape-coercion as for selectedTags above —
                // `/tags` may return raw model objects depending on the
                // controller resource shape. Dedupe by normalized name
                // so display+slug pairs collapse to a single entry.
                setAllTags(dedupeTags(tags.map(tagToString).filter(Boolean)));
            })
            .catch(() => setAllTags([]))
            .finally(() => setAllTagsLoading(false));
    }, [open, projectId]);

    const selectedNorm = selectedTags.map(normalizeTag);

    const filtered = allTags.filter((tg) =>
        !search || tg.toLowerCase().includes(search.toLowerCase())
    );

    const exactMatch = search.trim() && allTags.some((tg) => tg.toLowerCase() === search.trim().toLowerCase());

    async function handleCreate() {
        if (!search.trim() || creating) return;
        setCreating(true);
        const trimmed = search.trim();
        const trimmedNorm = normalizeTag(trimmed);
        // Optimistic add: stamp into both lists so the UI flips
        // immediately instead of waiting on the server round-trip.
        // Dedupe by normalized name so a freshly-created tag doesn't
        // collide with a near-duplicate already in the lists (e.g.,
        // server returned "plot-points" but user typed "Plot Points").
        setSelectedTags((prev) =>
            prev.some((s) => normalizeTag(s) === trimmedNorm) ? prev : [...prev, trimmed],
        );
        setAllTags((prev) =>
            prev.some((s) => normalizeTag(s) === trimmedNorm)
                ? prev
                : [...prev, trimmed].sort(),
        );
        await onCreate(trimmed);
        setSearch('');
        setCreating(false);
    }

    /**
     * Optimistic toggle — flip `selectedTags` immediately so the
     * checkbox state reflects the click before the server write
     * resolves. The parent's `onToggle` still fires to persist;
     * we just don't wait for it to update the visible state.
     */
    async function handleToggleInternal(tag: string, currentlySelected: boolean) {
        const norm = normalizeTag(tag);
        setSelectedTags((prev) => currentlySelected
            ? prev.filter((s) => normalizeTag(s) !== norm)
            : [...prev, tag],
        );
        await onToggle(tag, currentlySelected);
    }

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
            <div className="flex flex-col max-h-[60vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4" style={sectionBorderStyle}>
                    <div>
                        <h2 className="text-base font-bold">{t('notes.tag_picker.title')}</h2>
                        <p className="mt-0.5 text-xs" style={fadedText}>{t('notes.tag_picker.subtitle')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="alex-notes-modal-icon-btn"
                        aria-label={t('notes.modal.tooltip.close')}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Selected tags */}
                {selectedTags.length > 0 && (
                    <div className="px-5 py-3" style={sectionBorderStyle}>
                        <div
                            className="mb-1.5 text-[10px] font-medium uppercase tracking-wider"
                            style={microText}
                        >
                            {t('notes.tag_picker.selected_label').replace(':count', String(selectedTags.length))}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {selectedTags.map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium"
                                    style={{
                                        background: 'var(--theme-brand-primary-500)',
                                        color: 'var(--theme-brand-primary-content)',
                                        borderRadius: 'var(--theme-radius-button)',
                                    }}
                                >
                                    {tag}
                                    <button
                                        onClick={() => void handleToggleInternal(tag, true)}
                                        className="flex items-center"
                                        style={{
                                            color: 'color-mix(in srgb, var(--theme-brand-primary-content) 60%, transparent)',
                                        }}
                                        aria-label={t('notes.modal.tooltip.close')}
                                    >
                                        <i className="fa-solid fa-xmark text-[9px]" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search + create */}
                <div className="px-5 py-3" style={sectionBorderStyle}>
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <i
                                className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs"
                                style={subtleText}
                            />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (search.trim() && !exactMatch) {
                                            void handleCreate();
                                        }
                                    }
                                }}
                                placeholder={t('notes.tag_picker.search_placeholder')}
                                autoFocus
                                className="h-8 w-full pl-9 pr-3 text-sm"
                                style={inputStyle}
                            />
                        </div>
                        {search.trim() && !exactMatch && (
                            <button
                                onClick={() => void handleCreate()}
                                disabled={creating}
                                className="alex-btn alex-btn--primary h-8"
                                style={{
                                    borderRadius: 'var(--theme-radius-button)',
                                    padding: '0 0.625rem',
                                    fontSize: '0.75rem',
                                    gap: '0.375rem',
                                }}
                            >
                                {creating
                                    ? <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                                    : <i className="fa-solid fa-plus text-[10px]" />}
                                {t('notes.tag_picker.create_button')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Tag list — only renders tags NOT yet selected. Selected
                    tags live as removable pills in the section above; the
                    list is for adding new ones. Avoids the dual-state
                    sync problem where the all-tags item could disagree
                    with `selectedTags` on casing/shape. */}
                <div className="flex-1 overflow-y-auto">
                    {allTagsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <i
                                className="fa-solid fa-circle-notch fa-spin text-xl"
                                style={microText}
                                aria-hidden="true"
                            />
                        </div>
                    ) : (() => {
                        const available = filtered.filter(
                            (tag) => !selectedNorm.includes(normalizeTag(tag)),
                        );
                        if (available.length === 0) {
                            return (
                                <div className="py-8 text-center text-xs" style={microText}>
                                    {search ? t('notes.tag_picker.empty.no_match') : t('notes.tag_picker.empty.no_tags')}
                                </div>
                            );
                        }
                        return (
                            <div>
                                {available.map((tag) => (
                                    <button
                                        key={tag}
                                        onClick={() => void handleToggleInternal(tag, false)}
                                        className="alex-notes-tag-row flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm"
                                    >
                                        <i
                                            className="fa-solid fa-plus text-[10px]"
                                            style={{ color: 'color-mix(in srgb, var(--theme-brand-primary-500) 60%, transparent)' }}
                                            aria-hidden="true"
                                        />
                                        <span>{tag}</span>
                                    </button>
                                ))}
                            </div>
                        );
                    })()}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end px-5 py-3" style={{ borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)' }}>
                    <button
                        onClick={onClose}
                        className="alex-btn alex-btn--ghost"
                        style={{
                            borderRadius: 'var(--theme-radius-button)',
                            padding: '0.25rem 0.625rem',
                            fontSize: '0.75rem',
                        }}
                    >
                        {t('notes.tag_picker.done')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
