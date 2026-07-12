import { useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingPanel } from '@alexandria/hooks/useFloatingPanel';
import type { L2PreviewResult } from '@alexandria/types/workbench';

/* ── Theme styles ── */

const cardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    padding: '1rem',
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

const monoStyle: CSSProperties = {
    fontFamily: 'monospace',
    fontSize: '0.8125rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
};

const chipStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.125rem 0.5rem',
    borderRadius: 'var(--theme-radius-badge)',
    fontSize: '0.6875rem',
    fontWeight: 600,
    background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    color: 'var(--theme-base-content)',
};

const secondaryBtn: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
};

/**
 * Hone — the L2 prompt preview + source map, as a right-anchored
 * slide-over drawer (console DNA prefers dense side panels over
 * center-screen modals for "inspect, don't block" content). Reuses the
 * same `useFloatingPanel` lifecycle as Sheet.tsx, just animated on the
 * x-axis and anchored to the right edge instead of the bottom.
 */
export default function HoneDrawer({
    open,
    data,
    loading,
    projectSlug,
    onClose,
    t,
}: {
    open: boolean;
    data: L2PreviewResult | null;
    loading: boolean;
    projectSlug: string;
    onClose: () => void;
    t: (k: string) => string;
}) {
    const [copied, setCopied] = useState(false);
    const [promptVisible, setPromptVisible] = useState(true);

    const { backdropRef, panelRef, animateClose } = useFloatingPanel(
        open,
        onClose,
        {
            enter: {
                from: { x: '100%' },
                to: { x: 0, duration: 0.35, ease: 'power3.out' },
            },
            exit: { x: '100%', duration: 0.25, ease: 'power3.in' },
        },
    );

    if (!open) return null;

    function handleCopy() {
        if (!data) return;
        void navigator.clipboard.writeText(data.prompt).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    const sm = data?.source_map;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end">
            <div
                ref={backdropRef}
                className="absolute inset-0"
                style={{ background: 'rgba(0, 0, 0, 0.5)' }}
                onClick={animateClose}
            />
            <div
                ref={panelRef}
                className="relative flex h-full w-full flex-col sm:max-w-2xl"
                style={{
                    background: 'var(--theme-base-100)',
                    borderLeft: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
                    boxShadow: '-16px 0 40px rgba(0,0,0,0.28)',
                }}
            >
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between gap-4 border-b p-4" style={{ borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)' }}>
                    <h2 className="font-semibold text-base" style={{ color: 'var(--theme-base-content)' }}>
                        {t('ai.workbench.creation.hone.modal_title')}
                    </h2>
                    <div className="flex items-center gap-2">
                        {data && data.token_estimate > 0 && (
                            <span style={countStyle}>
                                {t('ai.workbench.creation.hone.token_estimate').replace(':count', String(data.token_estimate))}
                            </span>
                        )}
                        {sm && (
                            <span style={countStyle}>
                                {t('ai.workbench.creation.hone.notes_in_batch').replace(':count', String(sm.notes_in_batch))}
                            </span>
                        )}
                        <button
                            type="button"
                            className="alex-btn px-2 py-1 text-sm"
                            onClick={animateClose}
                            style={{ color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)' }}
                            aria-label="Close"
                        >
                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* Body — stacked sections (prompt on top, source map below); the
                    drawer is narrower than the old centered modal so the two
                    columns don't get cramped side by side. */}
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                    {/* Prompt */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold" style={labelStyle}>
                                {t('ai.workbench.creation.hone.prompt_section')}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="alex-btn px-2 py-1 text-xs"
                                    onClick={() => setPromptVisible((v) => !v)}
                                    style={secondaryBtn}
                                >
                                    {promptVisible ? '▲' : '▼'}
                                </button>
                                <button
                                    type="button"
                                    className="alex-btn px-3 py-1 text-xs"
                                    onClick={handleCopy}
                                    style={secondaryBtn}
                                >
                                    {copied ? t('ai.workbench.creation.hone.copied') : t('ai.workbench.creation.hone.copy_button')}
                                </button>
                            </div>
                        </div>
                        {promptVisible && (
                            <div style={cardStyle}>
                                {loading ? (
                                    <p style={labelStyle}>{t('ai.workbench.creation.hone.loading')}</p>
                                ) : (
                                    <pre style={monoStyle}>{data?.prompt ?? ''}</pre>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Source map */}
                    <div className="flex flex-col gap-3">
                        <span className="text-xs font-semibold" style={labelStyle}>
                            {t('ai.workbench.creation.hone.source_map_section')}
                        </span>

                        {sm ? (
                            <div className="space-y-3">
                                {/* Blueprint description */}
                                <div style={cardStyle} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                                            {t('ai.workbench.creation.hone.blueprint_desc_label')}
                                        </span>
                                        <a
                                            href={`/p/${projectSlug}/blueprints/${sm.blueprint_slug}`}
                                            className="text-xs"
                                            style={{ color: 'var(--theme-brand-primary-500)' }}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {t('ai.workbench.creation.hone.blueprint_desc_edit')} ↗
                                        </a>
                                    </div>
                                    <p style={descStyle}>
                                        {sm.blueprint_description ?? t('ai.workbench.creation.hone.blueprint_desc_none')}
                                    </p>
                                </div>

                                {/* Field schema */}
                                <div style={cardStyle} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                                            {t('ai.workbench.creation.hone.field_schema_label')}
                                        </span>
                                        <a
                                            href={`/p/${projectSlug}/blueprints/${sm.blueprint_slug}?tab=fields`}
                                            className="text-xs"
                                            style={{ color: 'var(--theme-brand-primary-500)' }}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {t('ai.workbench.creation.hone.field_schema_edit')} ↗
                                        </a>
                                    </div>
                                    <pre style={{ ...monoStyle, fontSize: '0.75rem', maxHeight: '8rem', overflowY: 'auto' }}>
                                        {sm.field_schema}
                                    </pre>
                                </div>

                                {/* Target index */}
                                <div style={cardStyle} className="space-y-1">
                                    <span className="text-xs font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                                        {t('ai.workbench.creation.hone.target_index_label')}
                                    </span>
                                    <p style={countStyle}>
                                        {t('ai.workbench.creation.hone.target_index_count').replace(':count', String(sm.target_index_size))}
                                        {sm.target_pruned && (
                                            <span style={{ marginLeft: '0.5rem', fontStyle: 'italic' }}>
                                                {t('ai.workbench.creation.hone.target_index_pruned')}
                                            </span>
                                        )}
                                    </p>
                                </div>

                                {/* Relationship edges */}
                                {sm.relationship_edges.length > 0 && (
                                    <div style={cardStyle} className="space-y-2">
                                        <span className="text-xs font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                                            {t('ai.workbench.creation.hone.edges_label')}
                                        </span>
                                        {sm.relationship_edges.map((edge, idx) => (
                                            <div key={idx} className="space-y-1 pl-2" style={{ borderLeft: '2px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)' }}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span style={{ ...chipStyle, fontSize: '0.6875rem' }}>
                                                            {edge.ai_priority === 'required'
                                                                ? t('ai.workbench.creation.hone.edge_required')
                                                                : t('ai.workbench.creation.hone.edge_preferred')}
                                                        </span>
                                                        <span className="text-xs font-medium" style={{ color: 'var(--theme-base-content)' }}>
                                                            {edge.relationship_name} → {edge.blueprint_slug}
                                                        </span>
                                                    </div>
                                                    <a
                                                        href={`/p/${projectSlug}/blueprints/${edge.blueprint_slug}`}
                                                        className="text-xs flex-shrink-0"
                                                        style={{ color: 'var(--theme-brand-primary-500)' }}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        {t('ai.workbench.creation.hone.edge_edit')} ↗
                                                    </a>
                                                </div>
                                                <p style={countStyle}>
                                                    {t('ai.workbench.creation.hone.edge_index_count').replace(':count', String(edge.index_size))}
                                                </p>
                                                {edge.ai_instruction && (
                                                    <p style={descStyle}>{edge.ai_instruction}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            loading && <p style={labelStyle}>{t('ai.workbench.creation.hone.loading')}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
