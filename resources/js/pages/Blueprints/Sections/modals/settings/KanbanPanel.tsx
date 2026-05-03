import { useState } from 'react';
import ActionButton from '@alexandria/components/ui/ActionButton';
import RevealCollapse from '@alexandria/components/ui/RevealCollapse';
import type { AvailableColumn, BlueprintDetail } from '@alexandria/types/blueprints';
import type { BlueprintViewEntry } from '@alexandria/lib/views/types';
import { saveBlueprintView } from '@alexandria/lib/views/saveBlueprintView';
import type { KanbanConfig } from '@alexandria/lib/views/kanban/types';
import { defaultKanbanConfig } from '@alexandria/lib/views/kanban/types';

interface KanbanPanelProps {
    blueprint: BlueprintDetail;
    project: { slug: string };
    availableColumns: AvailableColumn[];
}

/**
 * Dedicated Kanban settings panel. Top: enable/disable toggle +
 * description. Body: config form (group field dropdown, column sort).
 * Form controls grey out when disabled.
 *
 * Group field is a dropdown populated from the blueprint's text /
 * integer / boolean fields — no free-form text entry. Saves the
 * entire blueprint payload so views + legacy flags stay in sync.
 */
export default function KanbanPanel({ blueprint, project, availableColumns }: KanbanPanelProps) {
    const existingEntry = (blueprint.views ?? []).find((v) => v.type === 'kanban') ?? null;

    const [entry, setEntry] = useState<BlueprintViewEntry>(
        existingEntry ?? {
            type: 'kanban',
            enabled: false,
            config: { ...defaultKanbanConfig() },
            sort_order: (blueprint.views ?? []).length,
        },
    );
    const [saving, setSaving] = useState(false);

    const enabled = entry.enabled;
    // `BlueprintViewEntry.config` is deliberately typed as `Record<string, unknown>`
    // so the registry stays view-agnostic. The Kanban view owns the real shape
    // (`KanbanConfig`); the `unknown` step acknowledges that to TypeScript.
    const config = entry.config as unknown as KanbanConfig;

    // Single-value fields that work as column definitions in Phase 1.
    // entry_reference + multi-select are deferred to a later phase.
    //
    // availableColumns keys field entries as `field:<name>` (see
    // BlueprintController::buildAvailableColumns), but the backend
    // kanban endpoint + stored config use the raw field name — strip
    // the prefix so option values round-trip cleanly.
    const groupableFields = availableColumns
        .filter(
            (c) =>
                c.type === 'field'
                && ['text', 'integer', 'boolean'].includes(c.field_type?.toLowerCase() ?? ''),
        )
        .map((c) => ({
            name: c.key.replace(/^field:/, ''),
            label: c.label,
        }));

    function updateConfig(patch: Partial<KanbanConfig>) {
        setEntry((prev) => ({
            ...prev,
            config: { ...(prev.config as unknown as KanbanConfig), ...patch },
        }));
    }

    function handleSave() {
        setSaving(true);
        saveBlueprintView(blueprint, project, 'kanban', entry, {
            onSuccess: () => setSaving(false),
            onError: () => setSaving(false),
        });
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {/* Enable/disable — same chrome as Tree/Timeline toggles so
                    users recognize the pattern. */}
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-base-content/10 bg-base-100 px-4 py-3 transition-colors hover:bg-base-200/50">
                    <div>
                        <p className="text-sm font-medium">Kanban Board</p>
                        <p className="mt-0.5 text-xs text-base-content/50">
                            Drag entries between columns defined by a chosen field.
                            Pick a field whose values become the board's columns.
                        </p>
                    </div>
                    <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={enabled}
                        onChange={(e) => setEntry((prev) => ({ ...prev, enabled: e.target.checked }))}
                    />
                </label>

                {/* Form controls — slide in/out based on enable state so users
                    aren't confused by greyed-out controls when the view is off. */}
                <RevealCollapse open={enabled} innerClassName="pt-1">
                <fieldset className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-xs font-medium text-base-content/70">
                            Group field <span className="text-error">*</span>
                        </label>
                        <select
                            value={config.group_field_name ?? ''}
                            onChange={(e) =>
                                updateConfig({ group_field_name: e.target.value || null })
                            }
                            className="select select-bordered select-sm w-full"
                        >
                            <option value="">Select a field...</option>
                            {groupableFields.map((f) => (
                                <option key={f.name} value={f.name}>
                                    {f.label}
                                </option>
                            ))}
                        </select>
                        {groupableFields.length === 0 && enabled && (
                            <p className="mt-1 text-xs text-warning">
                                <i className="fa-solid fa-triangle-exclamation mr-1" />
                                No groupable fields on this blueprint. Add a text,
                                integer, or boolean field before enabling Kanban.
                            </p>
                        )}
                        <p className="mt-1 text-[11px] text-base-content/50">
                            Distinct values of this field become the board's columns.
                            Entries with no value land in an "Unassigned" column.
                        </p>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-medium text-base-content/70">
                            Sort within each column
                        </label>
                        <select
                            value={config.column_sort ?? 'sort_order'}
                            onChange={(e) =>
                                updateConfig({
                                    column_sort: e.target.value as KanbanConfig['column_sort'],
                                })
                            }
                            className="select select-bordered select-sm w-full"
                        >
                            <option value="sort_order">Manual (follows each entry's existing order)</option>
                            <option value="name">Alphabetical by name</option>
                            <option value="updated_at">Most recently updated first</option>
                            <option value="created_at">Most recently created first</option>
                        </select>
                        <p className="mt-1 text-[11px] text-base-content/50">
                            Drag-to-reorder within a column lands in a later phase;
                            for now, Manual follows the order entries already have
                            from other views (table, tree, list).
                        </p>
                    </div>
                </fieldset>
                </RevealCollapse>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-base-content/10 px-5 py-3">
                <ActionButton
                    icon="fa-solid fa-check"
                    label="Save"
                    onClick={handleSave}
                    loading={saving}
                />
            </div>
        </div>
    );
}
