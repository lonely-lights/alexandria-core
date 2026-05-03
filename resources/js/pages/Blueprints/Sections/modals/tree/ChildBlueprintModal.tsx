import { useState } from 'react';
import ActionButton from '@alexandria/components/ui/ActionButton';
import Modal from '@alexandria/components/ui/Modal';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import type { SiblingBlueprint } from '@alexandria/types/blueprints';
import type { TreeNode } from '../../TreeView';

/**
 * Per-entry child blueprint picker — controls which blueprint types
 * are allowed as children of this entry in the tree. Persisted on the
 * entry's `child_blueprint_ids` meta via PATCH.
 */
export default function ChildBlueprintModal({ entry, projectBlueprints, onClose, onSaved }: {
    entry: TreeNode;
    projectBlueprints: SiblingBlueprint[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<number>>(new Set(entry.child_blueprint_ids));
    const [saving, setSaving] = useState(false);

    const filtered = search.trim()
        ? projectBlueprints.filter((bp) => bp.name.toLowerCase().includes(search.toLowerCase()))
        : projectBlueprints;

    function toggle(bpId: number) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(bpId)) next.delete(bpId);
            else next.add(bpId);
            return next;
        });
    }

    function handleSave() {
        setSaving(true);
        fetch(`/api/v1/entries/${entry.id}/meta`, {
            method: 'PATCH',
            headers: { ...csrfHeaders(), 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ child_blueprint_ids: [...selected] }),
        }).then(() => {
            setSaving(false);
            onSaved();
        }).catch(() => setSaving(false));
    }

    return (
        <Modal open onClose={onClose} maxWidth="max-w-sm">
            <div className="flex items-center justify-between bg-base-300 px-5 py-3">
                <div>
                    <h3 className="text-sm font-semibold">Child Blueprints</h3>
                    <p className="text-xs text-base-content/50">{entry.name}</p>
                </div>
                <button type="button" onClick={onClose} className="btn btn-ghost btn-xs btn-circle">
                    <i className="fa-solid fa-xmark text-xs" />
                </button>
            </div>

            <div className="p-4">
                <div className="relative mb-3">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search blueprints..."
                        className="input input-bordered w-full rounded-xl pr-8 text-sm"
                        autoFocus
                    />
                </div>

                <div className="max-h-64 overflow-y-auto rounded-xl border border-base-content/10">
                    {filtered.map((bp) => {
                        const isSelected = selected.has(bp.id);
                        return (
                            <button
                                key={bp.id}
                                type="button"
                                onClick={() => toggle(bp.id)}
                                className={`flex w-full items-center gap-3 border-b border-base-content/5 px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-base-200/50 ${
                                    isSelected ? 'bg-primary/5' : ''
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    readOnly
                                    className="checkbox checkbox-primary checkbox-xs"
                                />
                                <i className={`${bp.icon ? (bp.icon.includes(' ') ? bp.icon : `fa-solid ${bp.icon}`) : 'fa-solid fa-file'} w-4 text-center text-xs text-base-content/40`} />
                                <span className={isSelected ? 'font-medium text-primary' : ''}>{bp.name}</span>
                                <span className="ml-auto text-xs text-base-content/30">{bp.classification}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-base-content/40">
                        {selected.size > 0 ? `${selected.size} selected` : 'None selected'}
                    </p>
                    <ActionButton
                        icon="fa-solid fa-check"
                        label="Save"
                        size="xs"
                        onClick={handleSave}
                        loading={saving}
                    />
                </div>
            </div>
        </Modal>
    );
}
