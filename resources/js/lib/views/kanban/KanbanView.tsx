import { useCallback, useEffect, useState } from 'react';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import { useBlueprintSettingsModal } from '@alexandria/lib/views/useBlueprintSettingsModal';
import type { KanbanColumnData, KanbanConfig } from './types';
import { useKanbanModel } from './useKanbanModel';
import KanbanBoard from './KanbanBoard';

interface KanbanViewProps {
    projectId: number;
    projectSlug: string;
    blueprintId: number;
    blueprintSlug: string;
    config: KanbanConfig;
    onOpenSettings: () => void;
}

export default function KanbanView({
    projectId,
    projectSlug,
    blueprintId,
    blueprintSlug,
    config,
    onOpenSettings,
}: KanbanViewProps) {
    const { modal: settingsModal } = useBlueprintSettingsModal('kanban');

    const [loading, setLoading] = useState(true);
    const [initialColumns, setInitialColumns] = useState<KanbanColumnData[]>([]);
    const { columns, moveCard, reset } = useKanbanModel(initialColumns);

    const fetchColumns = useCallback(async () => {
        if (!config.group_field_name) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const params = new URLSearchParams({
                group_field: config.group_field_name,
                column_sort: config.column_sort ?? 'sort_order',
            });
            const res = await fetch(
                `/api/v1/projects/${projectId}/blueprints/${blueprintId}/kanban?${params}`,
                {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                },
            );
            if (res.ok) {
                const data = await res.json();
                setInitialColumns(data.columns ?? []);
                reset(data.columns ?? []);
            }
        } finally {
            setLoading(false);
        }
    }, [projectId, blueprintId, config.group_field_name, config.column_sort, reset]);

    useEffect(() => {
        void fetchColumns();
    }, [fetchColumns]);

    async function handleCardMove(cardId: number, toKey: string | null) {
        const rollback = moveCard(cardId, toKey);

        const fieldName = config.group_field_name;
        if (!fieldName) return;

        const res = await fetch(`/api/v1/entries/${cardId}/meta`, {
            method: 'PATCH',
            headers: csrfHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({
                fields: { [fieldName]: toKey },
            }),
        });

        if (!res.ok) {
            // Roll back the optimistic move and refetch server state.
            reset(rollback);
            void fetchColumns();
        }
    }

    const entryHrefFor = (_cardId: number, slug: string) =>
        `/p/${projectSlug}/${blueprintSlug}/${slug}`;

    // No field configured yet — surface a CTA to open settings.
    if (!config.group_field_name) {
        return (
            <>
                <div className="paper-board rounded-2xl border border-base-content/10">
                    <div
                        className="flex flex-col items-center bg-base-200 py-16 text-center"
                        style={{ borderRadius: 'inherit' }}
                    >
                        <i className="fa-solid fa-table-columns mb-3 text-3xl text-base-content/20" />
                        <p className="text-sm font-medium text-base-content/50">Kanban isn't configured yet</p>
                        <p className="mt-1 max-w-sm text-xs text-base-content/40">
                            Pick a field whose values will become the board's columns.
                        </p>
                        <button
                            type="button"
                            onClick={onOpenSettings}
                            className="btn btn-primary btn-sm mt-4 gap-1.5 rounded-xl"
                        >
                            <i className="fa-solid fa-sliders text-xs" />
                            Configure Kanban
                        </button>
                    </div>
                </div>
                {settingsModal}
            </>
        );
    }

    if (loading && columns.length === 0) {
        return (
            <>
                <div className="flex items-center justify-center py-16">
                    <span className="loading loading-spinner loading-lg text-base-content/20" />
                </div>
                {settingsModal}
            </>
        );
    }

    return (
        <>
            <KanbanBoard
                columns={columns}
                entryHrefFor={entryHrefFor}
                onCardMove={handleCardMove}
            />
            {settingsModal}
        </>
    );
}
