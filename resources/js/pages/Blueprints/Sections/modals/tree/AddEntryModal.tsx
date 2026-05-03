import { useRef, useState } from 'react';
import ActionButton from '@alexandria/components/ui/ActionButton';
import Modal from '@alexandria/components/ui/Modal';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import type { BlueprintDetail, SiblingBlueprint } from '@alexandria/types/blueprints';
import type { TreeNode } from '../../TreeView';

/**
 * Add an entry to the tree — three modes:
 *  - Folder: stub-only container for grouping
 *  - Entry:  full entry page with its own URL
 *  - Link:   attach an existing entry under a parent
 *
 * The parent's `child_blueprint_ids` list narrows which blueprints are
 * valid under it; if set, search results filter accordingly (togglable
 * via "Search all"). Newly-created folders/entries can carry their
 * own child_blueprint_ids via the shared selector at the bottom.
 */
export default function AddEntryModal({ parentId, parentEntry, projectId, blueprint, projectBlueprints, onCreated, onClose }: {
    parentId: number | null;
    parentEntry: TreeNode | null;
    projectId: number;
    blueprint: BlueprintDetail;
    projectBlueprints: SiblingBlueprint[];
    onCreated: (entryId: number) => void;
    onClose: () => void;
}) {
    const parentChildBpIds = parentEntry?.child_blueprint_ids ?? [];
    const canLink = parentChildBpIds.length > 0;
    const effectiveBlueprintId = parentChildBpIds.length === 1 ? parentChildBpIds[0] : blueprint.id;
    const effectiveBpName = parentChildBpIds.length > 0
        ? parentChildBpIds.map((id) => projectBlueprints.find((b) => b.id === id)?.name).filter(Boolean).join(', ')
        : blueprint.name;

    const [mode, setMode] = useState<'folder' | 'create' | 'link'>('folder');
    const [childBlueprintIds, setChildBlueprintIds] = useState<number[]>([]);
    const [showAllSearch, setShowAllSearch] = useState(false);

    // Create state
    const [name, setName] = useState('');
    const [summary, setSummary] = useState('');
    const [saving, setSaving] = useState(false);

    // Link state
    const [linkSearch, setLinkSearch] = useState('');
    const [linkResults, setLinkResults] = useState<Array<{ id: number; name: string; blueprint_name: string; blueprint_id?: number }>>([]);
    const [searching, setSearching] = useState(false);
    const [linking, setLinking] = useState(false);
    const [selectedLink, setSelectedLink] = useState<{ id: number; name: string; blueprint_name: string } | null>(null);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function handleCreate() {
        if (!name.trim()) return;
        setSaving(true);
        fetch(`/api/v1/projects/${projectId}/tree/entries`, {
            method: 'POST',
            headers: { ...csrfHeaders(), 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                name: name.trim(),
                blueprint_id: effectiveBlueprintId,
                parent_id: parentId,
                is_stub: true,
                summary: summary.trim() || undefined,
            }),
        })
            .then((r) => r.json())
            .then(async (data) => {
                const entryId = data.entry?.id;
                if (!entryId) { setSaving(false); return; }

                const metaPayload: Record<string, unknown> = {};
                if (childBlueprintIds.length > 0) metaPayload.child_blueprint_ids = childBlueprintIds;

                if (Object.keys(metaPayload).length > 0) {
                    await fetch(`/api/v1/entries/${entryId}/meta`, {
                        method: 'PATCH',
                        headers: { ...csrfHeaders(), 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify(metaPayload),
                    });
                }

                setSaving(false);
                onCreated(entryId);
            })
            .catch(() => setSaving(false));
    }

    function doSearch(query: string) {
        if (!query.trim()) { setLinkResults([]); return; }
        setSearching(true);
        fetch(`/api/v1/entries/search?q=${encodeURIComponent(query)}&project_id=${projectId}&limit=10`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data) => {
                const results = data.data ?? [];
                const filtered = (!showAllSearch && parentChildBpIds.length > 0)
                    ? results.filter((r: { blueprint_id?: number }) => parentChildBpIds.includes(r.blueprint_id ?? 0))
                    : results;
                setLinkResults(filtered);
                setSearching(false);
            })
            .catch(() => setSearching(false));
    }

    function handleLinkSearchChange(value: string) {
        setLinkSearch(value);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => doSearch(value), 250);
    }

    function handleLink() {
        if (!selectedLink) return;
        setLinking(true);
        const entryId = selectedLink.id;
        fetch(`/api/v1/entries/${entryId}/reparent`, {
            method: 'PUT',
            headers: { ...csrfHeaders(), 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ parent_id: parentId }),
        }).then(async () => {
            if (childBlueprintIds.length > 0) {
                await fetch(`/api/v1/entries/${entryId}/meta`, {
                    method: 'PATCH',
                    headers: { ...csrfHeaders(), 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ child_blueprint_ids: childBlueprintIds }),
                });
            }
            setLinking(false);
            onCreated(entryId);
        }).catch(() => setLinking(false));
    }

    // Shared children blueprint selector
    const [bpSearch, setBpSearch] = useState('');
    const filteredBlueprints = bpSearch.trim()
        ? projectBlueprints.filter((bp) => bp.name.toLowerCase().includes(bpSearch.toLowerCase()))
        : projectBlueprints;

    const childBlueprintSelect = (
        <div className="rounded-xl bg-base-200/40 p-3">
            <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-base-content/60">Children Blueprints</label>
                {childBlueprintIds.length > 0 && (
                    <span className="text-xs text-base-content/40">{childBlueprintIds.length} selected</span>
                )}
            </div>
            <input
                type="text"
                value={bpSearch}
                onChange={(e) => setBpSearch(e.target.value)}
                placeholder="Filter blueprints..."
                className="input input-bordered mb-1 h-8 min-h-0 w-full rounded-xl text-xs"
            />
            <div className="max-h-[150px] overflow-y-auto rounded-xl border border-base-content/10">
                {filteredBlueprints.map((bp) => {
                    const checked = childBlueprintIds.includes(bp.id);
                    return (
                        <label key={bp.id} className={`flex cursor-pointer items-center gap-2 border-b border-base-content/5 px-3 py-2 text-sm transition-colors last:border-b-0 hover:bg-base-200/50 ${checked ? 'bg-primary/5' : ''}`}>
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => setChildBlueprintIds((prev) => checked ? prev.filter((id) => id !== bp.id) : [...prev, bp.id])}
                                className="checkbox checkbox-primary checkbox-xs"
                            />
                            <span className={checked ? 'font-medium text-primary' : ''}>{bp.name}</span>
                        </label>
                    );
                })}
                {filteredBlueprints.length === 0 && (
                    <p className="px-3 py-2 text-xs text-base-content/40">No matches</p>
                )}
            </div>
        </div>
    );

    const parentLabel = parentEntry ? parentEntry.name : 'Root';

    return (
        <Modal open onClose={onClose} maxWidth="max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between bg-base-300 px-5 py-3">
                <div>
                    <h3 className="text-sm font-semibold">Add to {parentLabel}</h3>
                </div>
                <button type="button" onClick={onClose} className="btn btn-ghost btn-xs btn-circle">
                    <i className="fa-solid fa-xmark text-xs" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-base-300">
                <button
                    type="button"
                    onClick={() => setMode('folder')}
                    className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${mode === 'folder' ? 'border-b-2 border-secondary text-secondary' : 'text-base-content/50 hover:text-base-content/70'}`}
                >
                    <i className="fa-solid fa-folder-plus text-xs" /> Folder
                </button>
                <button
                    type="button"
                    onClick={() => setMode('create')}
                    className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${mode === 'create' ? 'border-b-2 border-success text-success' : 'text-base-content/50 hover:text-base-content/70'}`}
                >
                    <i className="fa-solid fa-file-circle-plus text-xs" /> Entry
                </button>
                <button
                    type="button"
                    onClick={() => setMode('link')}
                    className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${mode === 'link' ? 'border-b-2 border-primary text-primary' : 'text-base-content/50 hover:text-base-content/70'}`}
                >
                    <i className="fa-solid fa-link text-xs" /> Link
                </button>
            </div>

            {(mode === 'create' || mode === 'folder') ? (
                <div className="space-y-4 p-6">
                    <p className="text-xs text-base-content/50">
                        {mode === 'folder'
                            ? 'Create an organizational container to group items.'
                            : 'Create a new entry with its own detail page.'}
                    </p>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-base-content/60">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) handleCreate(); }}
                            placeholder="Entry name..."
                            className="input input-bordered w-full rounded-xl text-sm"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-base-content/60">Summary</label>
                        <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder="Brief description (optional)..."
                            className="textarea textarea-bordered w-full rounded-xl text-sm"
                            rows={2}
                        />
                    </div>

                    {childBlueprintSelect}

                    <div className="flex items-center gap-2 pt-2">
                        <ActionButton
                            icon={mode === 'folder' ? 'fa-solid fa-folder-plus' : 'fa-solid fa-plus'}
                            label={mode === 'folder' ? 'Create Folder' : 'Create Entry'}
                            variant={mode === 'folder' ? 'secondary' : 'primary'}
                            onClick={handleCreate}
                            loading={saving}
                            disabled={!name.trim()}
                        />
                        <ActionButton icon="fa-solid fa-xmark" label="Cancel" variant="ghost" onClick={onClose} />
                    </div>
                </div>
            ) : (
                /* ── Link form ── */
                <div className="space-y-4 p-6">
                    <p className="text-xs text-base-content/50">
                        Attach an existing entry from your project into this tree.
                    </p>
                    {selectedLink ? (
                        /* Selected entry */
                        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                            <div className="flex-1">
                                <p className="font-medium">{selectedLink.name}</p>
                                <p className="text-xs text-base-content/50">{selectedLink.blueprint_name}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedLink(null)}
                                className="btn btn-ghost btn-xs btn-circle"
                            >
                                <i className="fa-solid fa-xmark text-xs" />
                            </button>
                        </div>
                    ) : (
                        /* Search */
                        <>
                            <div>
                                <div className="mb-1 flex items-center justify-between">
                                    <label className="text-xs font-medium text-base-content/60">
                                        {!showAllSearch && canLink ? `Search ${effectiveBpName}` : 'Search all entries'}
                                    </label>
                                    {canLink && (
                                        <label className="flex cursor-pointer items-center gap-1.5">
                                            <input
                                                type="checkbox"
                                                checked={showAllSearch}
                                                onChange={(e) => { setShowAllSearch(e.target.checked); setLinkResults([]); setLinkSearch(''); }}
                                                className="checkbox checkbox-xs"
                                            />
                                            <span className="text-xs text-base-content/40">Search all</span>
                                        </label>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={linkSearch}
                                        onChange={(e) => handleLinkSearchChange(e.target.value)}
                                        placeholder="Start typing to search..."
                                        className="input input-bordered w-full rounded-xl pr-8 text-sm"
                                        autoFocus
                                    />
                                    {searching && (
                                        <span className="loading loading-spinner loading-xs absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30" />
                                    )}
                                </div>
                            </div>

                            {linkResults.length > 0 && (
                                <div className="max-h-48 overflow-y-auto rounded-xl border border-base-content/10">
                                    {linkResults.map((r) => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => { setSelectedLink(r); setLinkSearch(''); setLinkResults([]); }}
                                            className="flex w-full items-center justify-between border-b border-base-content/5 px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-base-200/50"
                                        >
                                            <div>
                                                <p className="font-medium">{r.name}</p>
                                                <p className="text-xs text-base-content/40">{r.blueprint_name}</p>
                                            </div>
                                            <i className="fa-solid fa-check text-xs text-base-content/30" />
                                        </button>
                                    ))}
                                </div>
                            )}
                            {linkResults.length === 0 && linkSearch.trim().length >= 2 && !searching && (
                                <p className="text-center text-sm text-base-content/40">No results found</p>
                            )}
                        </>
                    )}

                    {childBlueprintSelect}

                    <div className="flex items-center gap-2 pt-2">
                        <ActionButton
                            icon="fa-solid fa-link"
                            label="Link"
                            onClick={handleLink}
                            loading={linking}
                            disabled={!selectedLink}
                        />
                        <ActionButton icon="fa-solid fa-xmark" label="Cancel" variant="ghost" onClick={onClose} />
                    </div>
                </div>
            )}
        </Modal>
    );
}
