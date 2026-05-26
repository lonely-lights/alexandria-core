/* ── AiStatusFooter ── */

import { useState, useEffect, type CSSProperties } from 'react';
import type { Note } from '@alexandria/types/notes-dashboard';
import useT from '@alexandria/hooks/useT';

export type AiState = 'idle' | 'processing' | 'routed' | 'commands_ready' | 'completed' | 'error';

interface AiStatusFooterProps {
    note: Note;
    projectId: number;
    contextType: string;
    contextId: number;
    onCategorize: () => void;
    onApproveRouting: (selectedSlugs: string[]) => void;
    onRejectRouting: () => void;
    onReviewCommands: () => void;
    onRetry: () => void;
}

export function resolveAiState(note: Note): AiState {
    const ai = note.ai_notes as Record<string, unknown> | null;

    if (!ai) {
        return 'idle';
    }

    if (ai.status === 'processing') {
        return 'processing';
    }

    if (ai.status === 'failed') {
        return 'error';
    }

    if (ai.status === 'completed' && ai.batch_id) {
        return 'commands_ready';
    }

    if (ai.status === 'completed' && typeof ai.routing_count === 'number' && ai.routing_count > 0) {
        return 'routed';
    }

    if (ai.status === 'completed') {
        return 'completed';
    }

    return 'idle';
}

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };

const containerStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const dotBase: CSSProperties = {
    height: '0.5rem',
    width: '0.5rem',
    borderRadius: '9999px',
    flexShrink: 0,
};

const primaryBtnStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.25rem 0.625rem',
    fontSize: '0.75rem',
    gap: '0.25rem',
};

function routedSlugStyle(active: boolean): CSSProperties {
    if (active) {
        return {
            background: 'var(--theme-brand-secondary-500)',
            color: 'var(--theme-brand-secondary-content)',
            borderRadius: 'var(--theme-radius-badge)',
        };
    }
    return {
        background: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
        color: 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
        borderRadius: 'var(--theme-radius-badge)',
    };
}

export default function AiStatusFooter({
    note,
    onCategorize,
    onApproveRouting,
    onRejectRouting,
    onReviewCommands,
    onRetry,
}: AiStatusFooterProps) {
    const t = useT();
    const state = resolveAiState(note);
    const ai = note.ai_notes as Record<string, unknown> | null;

    // Track which routed blueprints the user has selected
    const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

    // Reset selection when the note changes
    useEffect(() => {
        setSelectedSlugs([]);
    }, [note.id]);

    const routedBlueprints = Array.isArray(ai?.routed_blueprints) ? (ai.routed_blueprints as string[]) : [];

    const toggleSlug = (slug: string) => {
        setSelectedSlugs((prev) =>
            prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
        );
    };

    const commandCount = typeof ai?.command_count === 'number' ? ai.command_count : 0;
    const errorMessage = typeof ai?.last_error === 'string'
        ? ai.last_error
        : t('notes.ai_footer.error.fallback');

    return (
        <div className="flex-shrink-0 px-4 py-2.5" style={containerStyle}>
            {state === 'idle' && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span style={{ ...dotBase, background: 'var(--theme-status-success-stroke)' }} />
                        <span className="text-xs font-medium">{t('notes.ai_footer.idle.label')}</span>
                    </div>
                    <button
                        type="button"
                        className="alex-btn alex-btn--primary"
                        style={primaryBtnStyle}
                        onClick={onCategorize}
                    >
                        {t('notes.ai_footer.idle.action')}
                    </button>
                </div>
            )}

            {state === 'processing' && (
                <div className="flex items-center gap-2">
                    <i
                        className="fa-solid fa-circle-notch fa-spin text-xs"
                        style={{ color: 'var(--theme-status-info-stroke)' }}
                        aria-hidden="true"
                    />
                    <span className="text-xs font-medium">{t('notes.ai_footer.processing.label')}</span>
                    <span className="text-xs opacity-50">{t('notes.ai_footer.processing.hint')}</span>
                </div>
            )}

            {state === 'routed' && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="flex-shrink-0 text-xs" style={fadedText}>
                            {t('notes.ai_footer.routed.prompt')}
                        </span>
                        <div className="flex flex-1 flex-wrap items-center gap-1.5">
                            {routedBlueprints.map((slug) => {
                                const isSelected = selectedSlugs.includes(slug);
                                return (
                                    <button
                                        key={slug}
                                        type="button"
                                        onClick={() => toggleSlug(slug)}
                                        className="cursor-pointer px-2 py-1 text-[11px] font-medium transition-colors"
                                        style={routedSlugStyle(isSelected)}
                                    >
                                        {isSelected && <span className="mr-1">✓</span>}
                                        {slug.replace(/\b\w/g, (c) => c.toUpperCase())}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                            <button
                                type="button"
                                className="alex-btn alex-btn--outline"
                                style={{
                                    ...primaryBtnStyle,
                                    color: 'var(--theme-status-error-stroke)',
                                    borderColor: 'color-mix(in srgb, var(--theme-status-error-stroke) 50%, transparent)',
                                }}
                                onClick={onRejectRouting}
                            >
                                {t('notes.ai_footer.routed.reject')}
                            </button>
                            <button
                                type="button"
                                className="alex-btn alex-btn--primary"
                                style={{
                                    ...primaryBtnStyle,
                                    background: 'var(--theme-status-success-fill)',
                                    color: 'var(--theme-status-success-content)',
                                    opacity: selectedSlugs.length === 0 ? 0.5 : 1,
                                    cursor: selectedSlugs.length === 0 ? 'not-allowed' : 'pointer',
                                }}
                                onClick={() => selectedSlugs.length > 0 && onApproveRouting(selectedSlugs)}
                                disabled={selectedSlugs.length === 0}
                            >
                                {t('notes.ai_footer.routed.process').replace(':count', String(selectedSlugs.length))}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {state === 'commands_ready' && (
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <span style={{ ...dotBase, background: 'var(--theme-status-warning-stroke)' }} />
                        <div className="min-w-0">
                            <div className="text-xs font-medium">
                                {t('notes.ai_footer.commands_ready.label').replace(':count', String(commandCount))}
                            </div>
                            <div className="text-[11px]" style={fadedText}>
                                {t('notes.ai_footer.commands_ready.hint')}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="alex-btn alex-btn--primary flex-shrink-0"
                        style={primaryBtnStyle}
                        onClick={onReviewCommands}
                    >
                        {t('notes.ai_footer.commands_ready.action')}
                    </button>
                </div>
            )}

            {state === 'completed' && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span style={{ ...dotBase, background: 'var(--theme-status-success-stroke)' }} />
                        <span className="text-xs font-medium">{t('notes.ai_footer.completed.label')}</span>
                    </div>
                    <button
                        type="button"
                        className="alex-btn alex-btn--primary"
                        style={primaryBtnStyle}
                        onClick={onCategorize}
                    >
                        <i className="fa-solid fa-bolt text-[10px]" /> {t('notes.ai_footer.completed.action')}
                    </button>
                </div>
            )}

            {state === 'error' && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span style={{ ...dotBase, background: 'var(--theme-status-error-stroke)' }} />
                        <span
                            className="text-xs font-medium"
                            style={{ color: 'var(--theme-status-error-stroke)' }}
                        >
                            {errorMessage}
                        </span>
                    </div>
                    <button
                        type="button"
                        className="alex-btn alex-btn--primary"
                        style={primaryBtnStyle}
                        onClick={onRetry}
                    >
                        {t('notes.ai_footer.error.action')}
                    </button>
                </div>
            )}
        </div>
    );
}
