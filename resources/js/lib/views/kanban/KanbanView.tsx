import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import useT from '@alexandria/hooks/useT';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import { pageUrl } from '@alexandria/lib/urls';
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

const ctaCardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const ctaInnerStyle: CSSProperties = {
    background: 'var(--theme-base-200)',
    borderRadius: 'inherit',
};

const ctaIconStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
};

const ctaHeadingStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const ctaSubStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const ctaButtonStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
};

const spinnerStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
};

export default function KanbanView({
    projectId,
    projectSlug,
    blueprintId,
    blueprintSlug,
    config,
    onOpenSettings,
}: KanbanViewProps) {
    const t = useT();
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
        pageUrl(projectSlug, blueprintSlug, slug);

    // No field configured yet — surface a CTA to open settings.
    if (!config.group_field_name) {
        return (
            <>
                <div className="paper-board" style={ctaCardStyle}>
                    <div
                        className="flex flex-col items-center py-16 text-center"
                        style={ctaInnerStyle}
                    >
                        <i className="fa-solid fa-table-columns mb-3 text-3xl" style={ctaIconStyle} />
                        <p className="text-sm font-medium" style={ctaHeadingStyle}>{t('views.kanban.cta.title')}</p>
                        <p className="mt-1 max-w-sm text-xs" style={ctaSubStyle}>
                            {t('views.kanban.cta.subtitle')}
                        </p>
                        <button
                            type="button"
                            onClick={onOpenSettings}
                            className="mt-4"
                            style={ctaButtonStyle}
                        >
                            <i className="fa-solid fa-sliders text-xs" />
                            {t('views.kanban.cta.action')}
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
                    <i className="fa-solid fa-circle-notch fa-spin text-3xl" style={spinnerStyle} />
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
