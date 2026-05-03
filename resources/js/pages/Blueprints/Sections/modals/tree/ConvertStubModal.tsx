import { useEffect, useRef, useState } from 'react';
import ActionButton from '@alexandria/components/ui/ActionButton';
import Modal from '@alexandria/components/ui/Modal';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import type { SiblingBlueprint } from '@alexandria/types/blueprints';
import type { TreeNode } from '../../TreeView';

/**
 * Stub → real entry converter. Offered from the tree on stub rows;
 * user chooses between creating a fresh entry (picking a blueprint)
 * or linking an existing entry under the stub's slot.
 */
export default function ConvertStubModal({ entry, projectId, projectBlueprints, parentChildBlueprintIds, onClose, onConverted }: {
    entry: TreeNode;
    projectId: number;
    projectBlueprints: SiblingBlueprint[];
    parentChildBlueprintIds: number[];
    onClose: () => void;
    onConverted: () => void;
}) {
    const [mode, setMode] = useState<'choose' | 'create' | 'link'>('choose');
    const [converting, setConverting] = useState(false);
    const [bpSearch, setBpSearch] = useState('');

    // Link mode
    const [linkSearch, setLinkSearch] = useState('');
    const [linkResults, setLinkResults] = useState<Array<{ id: number; name: string; blueprint_name: string; blueprint_id?: number }>>([]);
    const [searching, setSearching] = useState(false);
    const [selectedLink, setSelectedLink] = useState<{ id: number; name: string; blueprint_name: string } | null>(null);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const availableBlueprints = parentChildBlueprintIds.length > 0
        ? projectBlueprints.filter((bp) => parentChildBlueprintIds.includes(bp.id))
        : projectBlueprints;

    const filteredBps = bpSearch.trim()
        ? availableBlueprints.filter((bp) => bp.name.toLowerCase().includes(bpSearch.toLowerCase()))
        : availableBlueprints;

    // Auto-convert if only one blueprint and mode is create
    useEffect(() => {
        if (availableBlueprints.length === 1 && mode === 'choose') {
            // Don't auto — let the user choose create vs link
        }
    }, []);

    function handleCreateConvert(blueprintId: number) {
        setConverting(true);
        fetch(`/api/v1/entries/${entry.id}/convert`, {
            method: 'PUT',
            headers: { ...csrfHeaders(), 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ blueprint_id: blueprintId }),
        }).then(() => { setConverting(false); onConverted(); })
            .catch(() => setConverting(false));
    }

    function handleLinkConvert() {
        if (!selectedLink) return;
        setConverting(true);
        // Reparent the existing entry under this stub, then mark stub as non-stub
        fetch(`/api/v1/entries/${selectedLink.id}/reparent`, {
            method: 'PUT',
            headers: { ...csrfHeaders(), 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ parent_id: entry.id }),
        }).then(() =>
            fetch(`/api/v1/entries/${entry.id}/meta`, {
                method: 'PATCH',
                headers: { ...csrfHeaders(), 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ is_stub: false }),
            })
        ).then(() => { setConverting(false); onConverted(); })
            .catch(() => setConverting(false));
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
                const filtered = parentChildBlueprintIds.length > 0
                    ? results.filter((r: { blueprint_id?: number }) => parentChildBlueprintIds.includes(r.blueprint_id ?? 0))
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

    return (
        <Modal open onClose={onClose} maxWidth="max-w-sm">
            <div className="flex items-center justify-between bg-base-300 px-5 py-3">
                <div>
                    <h3 className="text-sm font-semibold">Convert to Entry</h3>
                    <p className="text-xs text-base-content/50">{entry.name}</p>
                </div>
                <button type="button" onClick={() => mode === 'choose' ? onClose() : setMode('choose')} className="btn btn-ghost btn-xs btn-circle">
                    <i className={`fa-solid ${mode === 'choose' ? 'fa-xmark' : 'fa-arrow-left'} text-xs`} />
                </button>
            </div>

            {mode === 'choose' ? (
                <div className="p-4">
                    <div className="grid grid-cols-1 gap-3">
                        <button
                            type="button"
                            onClick={() => setMode('create')}
                            className="flex items-center gap-4 rounded-xl border border-base-content/10 p-4 text-left transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
                        >
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <i className="fa-solid fa-plus text-primary" />
                            </div>
                            <div>
                                <p className="font-medium">Create New</p>
                                <p className="text-xs text-base-content/50">Create a new entry page</p>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('link')}
                            className="flex items-center gap-4 rounded-xl border border-base-content/10 p-4 text-left transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
                        >
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <i className="fa-solid fa-link text-primary" />
                            </div>
                            <div>
                                <p className="font-medium">Link Existing</p>
                                <p className="text-xs text-base-content/50">Attach an existing entry</p>
                            </div>
                        </button>
                    </div>
                </div>
            ) : mode === 'create' ? (
                <div className="p-4">
                    <p className="mb-3 text-xs text-base-content/50">Select a blueprint for the new entry:</p>
                    <input
                        type="text"
                        value={bpSearch}
                        onChange={(e) => setBpSearch(e.target.value)}
                        placeholder="Search blueprints..."
                        className="input input-bordered mb-2 w-full rounded-xl text-sm"
                        autoFocus
                    />
                    <div className="max-h-[250px] overflow-y-auto rounded-xl border border-base-content/10">
                        {filteredBps.map((bp) => (
                            <button
                                key={bp.id}
                                type="button"
                                onClick={() => handleCreateConvert(bp.id)}
                                disabled={converting}
                                className="flex w-full items-center gap-3 border-b border-base-content/5 px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-base-200/50"
                            >
                                <i className={`${bp.icon ? (bp.icon.includes(' ') ? bp.icon : `fa-solid ${bp.icon}`) : 'fa-solid fa-file'} w-4 text-center text-xs text-base-content/40`} />
                                <span>{bp.name}</span>
                                <span className="ml-auto text-xs text-base-content/30">{bp.classification}</span>
                            </button>
                        ))}
                        {filteredBps.length === 0 && (
                            <p className="px-3 py-3 text-center text-xs text-base-content/40">No matches</p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-4 p-4">
                    {selectedLink ? (
                        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                            <div className="flex-1">
                                <p className="font-medium">{selectedLink.name}</p>
                                <p className="text-xs text-base-content/50">{selectedLink.blueprint_name}</p>
                            </div>
                            <button type="button" onClick={() => setSelectedLink(null)} className="btn btn-ghost btn-xs btn-circle">
                                <i className="fa-solid fa-xmark text-xs" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-base-content/60">Search entries</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={linkSearch}
                                        onChange={(e) => handleLinkSearchChange(e.target.value)}
                                        placeholder="Start typing to search..."
                                        className="input input-bordered w-full rounded-xl pr-8 text-sm"
                                        autoFocus
                                    />
                                    {searching && <span className="loading loading-spinner loading-xs absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30" />}
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
                    <div className="flex items-center gap-2 pt-2">
                        <ActionButton
                            icon="fa-solid fa-link"
                            label="Link"
                            onClick={handleLinkConvert}
                            loading={converting}
                            disabled={!selectedLink}
                        />
                        <ActionButton icon="fa-solid fa-xmark" label="Cancel" variant="ghost" onClick={onClose} />
                    </div>
                </div>
            )}
        </Modal>
    );
}
