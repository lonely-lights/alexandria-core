import { useState, useEffect } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import Tooltip from '@alexandria/components/ui/Tooltip';
import ActionButton from '@alexandria/components/ui/ActionButton';
import Input from '@alexandria/components/form/Input';
import type { SavedView } from '@alexandria/types/blueprints';

/* ── Views Modal ── */

export function ViewsModal({ open, onClose, views, canUpdate, onSelect, onDelete, onResetToDefault }: {
    open: boolean;
    onClose: () => void;
    views: SavedView[];
    canUpdate: boolean;
    onSelect: (viewId: number) => void;
    onDelete: (viewId: number) => void;
    /** Resets the working view to the blueprint's baseline columns /
     * sort / filters. Always available so users have a guaranteed
     * escape hatch regardless of which views are saved. */
    onResetToDefault: () => void;
}) {
    const projectViews = views.filter((v) => !v.is_personal);
    const personalViews = views.filter((v) => v.is_personal);

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
            <div className="flex items-center justify-between bg-base-300 px-5 py-3">
                <h3 className="text-sm font-semibold">
                    <i className="fa-solid fa-eye mr-2 text-info" />
                    Saved Views
                </h3>
                <button type="button" onClick={onClose} className="btn btn-ghost btn-xs btn-circle">
                    <i className="fa-solid fa-xmark text-xs" />
                </button>
            </div>

            <div className="p-4">
                <div className="space-y-4">
                    {/* Always-present "Default" entry — guaranteed escape
                        back to the blueprint's baseline columns / sort
                        / filters even when the user has unsaved changes.
                        Not deletable (no trash affordance) because it's
                        synthetic, not a stored view. */}
                    <div>
                        <div className="space-y-1">
                            <button
                                type="button"
                                onClick={() => { onResetToDefault(); onClose(); }}
                                className="group flex w-full items-center gap-2 rounded-xl border border-base-300 px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
                            >
                                <i className="fa-solid fa-rotate-left text-xs text-base-content/40 group-hover:text-primary" />
                                <span className="text-sm font-medium">Default</span>
                                <span className="ml-auto text-[10px] text-base-content/30">Reset to baseline</span>
                            </button>
                        </div>
                    </div>

                    {views.length === 0 ? null : (
                        <>
                        {/* Project views */}
                        {projectViews.length > 0 && (
                            <div>
                                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/40">Project Views</h4>
                                <div className="space-y-1">
                                    {projectViews.map((v) => (
                                        <div key={v.id} className="group flex items-center gap-2 rounded-xl border border-base-300 px-3 py-2 transition-colors hover:border-base-content/20">
                                            <button
                                                type="button"
                                                onClick={() => onSelect(v.id)}
                                                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                            >
                                                <i className="fa-solid fa-table-list text-xs text-base-content/40" />
                                                <span className="text-sm font-medium">{v.name}</span>
                                                {v.is_default && <span className="badge badge-primary badge-xs px-2 py-1.5">Default</span>}
                                            </button>
                                            {canUpdate && (
                                                <Tooltip content="Delete view" variant="error">
                                                    <button
                                                        type="button"
                                                        onClick={() => onDelete(v.id)}
                                                        className="btn btn-ghost btn-xs rounded-lg text-base-content/20 opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
                                                    >
                                                        <i className="fa-solid fa-trash text-xs" />
                                                    </button>
                                                </Tooltip>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Personal views */}
                        {personalViews.length > 0 && (
                            <div>
                                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/40">My Views</h4>
                                <div className="space-y-1">
                                    {personalViews.map((v) => (
                                        <div key={v.id} className="group flex items-center gap-2 rounded-xl border border-base-300 px-3 py-2 transition-colors hover:border-base-content/20">
                                            <button
                                                type="button"
                                                onClick={() => onSelect(v.id)}
                                                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                            >
                                                <i className="fa-solid fa-user text-xs text-base-content/40" />
                                                <span className="text-sm font-medium">{v.name}</span>
                                            </button>
                                            <Tooltip content="Delete view" variant="error">
                                                <button
                                                    type="button"
                                                    onClick={() => onDelete(v.id)}
                                                    className="btn btn-ghost btn-xs rounded-lg text-base-content/20 opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
                                                >
                                                    <i className="fa-solid fa-trash text-xs" />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-end border-t border-base-content/10 px-5 py-3">
                <button type="button" onClick={onClose} className="btn btn-ghost btn-sm rounded-xl">Close</button>
            </div>
        </Modal>
    );
}

/* ── Save View Modal ── */

export function SaveViewModal({ open, onClose, onSave, saving, currentName, isPersonal }: {
    open: boolean;
    onClose: () => void;
    onSave: (name: string, isDefault: boolean) => void;
    saving: boolean;
    currentName: string;
    isPersonal: boolean;
}) {
    const [name, setName] = useState(currentName || 'My View');
    const [isDefault, setIsDefault] = useState(false);

    useEffect(() => {
        if (open) {
            setName(currentName || 'My View');
            setIsDefault(false);
        }
    }, [open, currentName]);

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
            <div className="flex items-center justify-between bg-base-300 px-5 py-3">
                <h3 className="text-sm font-semibold">
                    <i className="fa-solid fa-floppy-disk mr-2 text-primary" />
                    Save View
                </h3>
                <button type="button" onClick={onClose} className="btn btn-ghost btn-xs btn-circle">
                    <i className="fa-solid fa-xmark text-xs" />
                </button>
            </div>

            <div className="space-y-4 p-5">
                <Input
                    label="View Name"
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                    onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSave(name.trim(), isDefault)}
                    placeholder="e.g. Overview, Detailed, Compact..."
                    maxLength={100}
                    autoFocus
                />

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-base-300 px-4 py-3 transition-colors hover:bg-base-200/50">
                    <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                    />
                    <div>
                        <span className="text-sm font-medium">Set as project default</span>
                        <p className="text-xs text-base-content/50">All members will see this view by default</p>
                    </div>
                </label>

                {isPersonal && !isDefault && (
                    <p className="text-xs text-base-content/40">
                        <i className="fa-solid fa-user mr-1" />
                        This view is personal and only visible to you.
                    </p>
                )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-base-content/10 px-5 py-3">
                <ActionButton icon="fa-solid fa-xmark" label="Cancel" variant="ghost" onClick={onClose} />
                <ActionButton icon="fa-solid fa-check" label="Save" onClick={() => onSave(name.trim(), isDefault)} disabled={!name.trim()} loading={saving} />
            </div>
        </Modal>
    );
}
