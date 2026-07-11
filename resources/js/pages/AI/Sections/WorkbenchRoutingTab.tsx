import { useState, type CSSProperties } from 'react';
import { router } from '@inertiajs/react';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import { fetchJson, FetchJsonError } from '@alexandria/lib/fetchJson';
import useT from '@alexandria/hooks/useT';
import type { WorkbenchBlueprint, WorkbenchNotebook } from '@alexandria/types/workbench';

interface WorkbenchRoutingTabProps {
    projectSlug: string;
    blueprints: WorkbenchBlueprint[];
    notebooks: WorkbenchNotebook[];
    unsorted_count: number;
    pending_count: number;
}

/* ── Theme styles ── */
const cardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    padding: '1rem',
};

const cardHoverStyle: CSSProperties = {
    borderColor: 'color-mix(in srgb, var(--theme-base-content) 18%, transparent)',
};

const labelStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
    fontSize: '0.75rem',
};

const descStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)',
    fontSize: '0.8125rem',
    lineHeight: '1.4',
};

const countStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    fontSize: '0.75rem',
};

const catchAllBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 15%, transparent)',
    color: 'var(--theme-brand-primary-500)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
    letterSpacing: '0.025em',
};

const toggleTrackOn: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    borderRadius: '9999px',
    width: '2.25rem',
    height: '1.25rem',
    position: 'relative',
    transition: 'background var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
    cursor: 'pointer',
    flexShrink: 0,
};

const toggleTrackOff: CSSProperties = {
    ...toggleTrackOn,
    background: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
};

const toggleThumb: CSSProperties = {
    position: 'absolute',
    top: '0.1875rem',
    width: '0.875rem',
    height: '0.875rem',
    background: 'white',
    borderRadius: '9999px',
    transition: 'left var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

function ToggleSwitch({
    checked,
    disabled,
    label,
    onChange,
}: {
    checked: boolean;
    disabled: boolean;
    label: string;
    onChange: () => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={onChange}
            style={checked ? toggleTrackOn : toggleTrackOff}
        >
            <span
                style={{
                    ...toggleThumb,
                    left: checked ? '1.1875rem' : '0.1875rem',
                }}
            />
        </button>
    );
}

function descriptionPreview(text: string | null, maxLen = 120): string {
    if (!text) {
        return '';
    }
    return text.length > maxLen ? `${text.slice(0, maxLen).trim()}…` : text;
}

export default function WorkbenchRoutingTab({
    projectSlug,
    blueprints: initialBlueprints,
    notebooks: initialNotebooks,
    unsorted_count,
    pending_count,
}: WorkbenchRoutingTabProps) {
    const t = useT();

    // Optimistic overrides: map<id, toggled value> for in-flight toggles
    const [bpOverrides, setBpOverrides] = useState<Record<number, boolean>>({});
    const [nbOverrides, setNbOverrides] = useState<Record<number, boolean>>({});
    const [busyBp, setBusyBp] = useState<Record<number, boolean>>({});
    const [busyNb, setBusyNb] = useState<Record<number, boolean>>({});

    const blueprints = initialBlueprints.map((bp) => ({
        ...bp,
        allow_ai_sorting: bpOverrides[bp.id] ?? bp.allow_ai_sorting,
    }));

    const notebooks = initialNotebooks.map((nb) => ({
        ...nb,
        allow_ai_sort: nbOverrides[nb.id] ?? nb.allow_ai_sort,
    }));

    async function toggleBlueprint(bp: WorkbenchBlueprint) {
        const next = !(bpOverrides[bp.id] ?? bp.allow_ai_sorting);
        setBpOverrides((prev) => ({ ...prev, [bp.id]: next }));
        setBusyBp((prev) => ({ ...prev, [bp.id]: true }));

        try {
            await fetchJson(`/p/${projectSlug}/ai/workbench/blueprints/${bp.slug}`, {
                method: 'PATCH',
                headers: csrfHeaders(),
                body: JSON.stringify({ allow_ai_sorting: next }),
            });
            router.reload({ only: ['blueprints', 'notebooks', 'unsorted_count', 'pending_count'] });
        } catch (err) {
            // Revert on failure
            setBpOverrides((prev) => {
                const copy = { ...prev };
                delete copy[bp.id];
                return copy;
            });
            if (err instanceof FetchJsonError) {
                console.error('Toggle blueprint failed:', err.status);
            }
        } finally {
            setBusyBp((prev) => {
                const copy = { ...prev };
                delete copy[bp.id];
                return copy;
            });
        }
    }

    async function toggleNotebook(nb: WorkbenchNotebook) {
        const next = !(nbOverrides[nb.id] ?? nb.allow_ai_sort);
        setNbOverrides((prev) => ({ ...prev, [nb.id]: next }));
        setBusyNb((prev) => ({ ...prev, [nb.id]: true }));

        try {
            await fetchJson(`/p/${projectSlug}/ai/workbench/notebooks/${nb.slug}`, {
                method: 'PATCH',
                headers: csrfHeaders(),
                body: JSON.stringify({ allow_ai_sort: next }),
            });
            router.reload({ only: ['blueprints', 'notebooks', 'unsorted_count', 'pending_count'] });
        } catch (err) {
            setNbOverrides((prev) => {
                const copy = { ...prev };
                delete copy[nb.id];
                return copy;
            });
            if (err instanceof FetchJsonError) {
                console.error('Toggle notebook failed:', err.status);
            }
        } finally {
            setBusyNb((prev) => {
                const copy = { ...prev };
                delete copy[nb.id];
                return copy;
            });
        }
    }

    return (
        <div className="space-y-8">
            {/* Summary counts bar */}
            <div className="flex items-center gap-6 flex-wrap">
                <span style={countStyle}>
                    <i className="fa-solid fa-inbox mr-1.5" aria-hidden="true" />
                    {t('ai.workbench.roster.unsorted').replace(':count', String(unsorted_count))}
                </span>
                <span style={countStyle}>
                    <i className="fa-solid fa-hourglass-half mr-1.5" aria-hidden="true" />
                    {t('ai.workbench.roster.pending').replace(':count', String(pending_count))}
                </span>
            </div>

            {/* Blueprints section */}
            <section>
                <h2 className="mb-4 text-base font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                    {t('ai.workbench.roster.blueprints_heading')}
                </h2>

                {blueprints.length === 0 ? (
                    <p style={labelStyle}>{t('ai.workbench.roster.empty_blueprints')}</p>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {blueprints.map((bp) => (
                            <div
                                key={bp.id}
                                style={cardStyle}
                                className="group transition-[border-color]"
                                onMouseEnter={(e) => Object.assign((e.currentTarget as HTMLElement).style, cardHoverStyle)}
                                onMouseLeave={(e) => Object.assign((e.currentTarget as HTMLElement).style, { borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)' })}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium truncate" style={{ color: 'var(--theme-base-content)' }}>
                                            {bp.name}
                                        </p>
                                        <p style={countStyle} className="mt-0.5">
                                            {t('ai.workbench.roster.routed_count').replace(':count', String(bp.routed_count))}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                        <ToggleSwitch
                                            checked={bp.allow_ai_sorting}
                                            disabled={!!busyBp[bp.id]}
                                            label={`${t('ai.workbench.roster.toggle_label')}: ${bp.name}`}
                                            onChange={() => void toggleBlueprint(bp)}
                                        />
                                        <span style={labelStyle}>{t('ai.workbench.roster.toggle_label')}</span>
                                    </div>
                                </div>

                                {bp.description && (
                                    <p className="mt-2" style={descStyle}>
                                        {descriptionPreview(bp.description)}
                                    </p>
                                )}
                                {!bp.description && (
                                    <p className="mt-2 italic" style={{ ...descStyle, opacity: 0.5 }}>
                                        {t('ai.workbench.roster.no_description')}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Notebooks section */}
            <section>
                <h2 className="mb-4 text-base font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                    {t('ai.workbench.roster.notebooks_heading')}
                </h2>

                {notebooks.length === 0 ? (
                    <p style={labelStyle}>{t('ai.workbench.roster.empty_notebooks')}</p>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {notebooks.map((nb) => (
                            <div
                                key={nb.id}
                                style={cardStyle}
                                className="group transition-[border-color]"
                                onMouseEnter={(e) => Object.assign((e.currentTarget as HTMLElement).style, cardHoverStyle)}
                                onMouseLeave={(e) => Object.assign((e.currentTarget as HTMLElement).style, { borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)' })}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <p className="font-medium truncate" style={{ color: 'var(--theme-base-content)' }}>
                                                {nb.title}
                                            </p>
                                            {nb.is_catch_all && (
                                                <span style={catchAllBadgeStyle}>
                                                    {t('ai.workbench.roster.catch_all_badge')}
                                                </span>
                                            )}
                                        </div>
                                        <p style={countStyle} className="mt-0.5">
                                            {t('ai.workbench.roster.note_count').replace(':count', String(nb.note_count))}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                        <ToggleSwitch
                                            checked={nb.allow_ai_sort}
                                            disabled={!!busyNb[nb.id]}
                                            label={`${t('ai.workbench.roster.toggle_label')}: ${nb.title}`}
                                            onChange={() => void toggleNotebook(nb)}
                                        />
                                        <span style={labelStyle}>{t('ai.workbench.roster.toggle_label')}</span>
                                    </div>
                                </div>

                                {nb.description && (
                                    <p className="mt-2" style={descStyle}>
                                        {descriptionPreview(nb.description)}
                                    </p>
                                )}
                                {!nb.description && (
                                    <p className="mt-2 italic" style={{ ...descStyle, opacity: 0.5 }}>
                                        {t('ai.workbench.roster.no_description')}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
