import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import useT from '@alexandria/hooks/useT';

interface MergeProposal {
    keep_command_id: number;
    remove_command_ids: number[];
    merged_name: string;
    merged_summary: string | null;
    reason: string;
}

interface ExistingMatch {
    command_id: number;
    existing_entry_id: number;
    reason: string;
}

interface DedupModalProps {
    open: boolean;
    onClose: () => void;
    projectId: number;
    blueprintSlug: string;
    onApplied: () => void;
}

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const subtleText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const muteText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' };

const headerIconWrapStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-status-warning-stroke) 20%, transparent)',
    color: 'var(--theme-status-warning-stroke)',
    borderRadius: '9999px',
};

const mergeCardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-status-warning-stroke) 30%, transparent)',
    background: 'color-mix(in srgb, var(--theme-status-warning-stroke) 5%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const matchCardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-status-info-stroke) 30%, transparent)',
    background: 'color-mix(in srgb, var(--theme-status-info-stroke) 5%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

function chipStyle(variant: 'success' | 'error' | 'neutral'): CSSProperties {
    if (variant === 'success') {
        return {
            background: 'var(--theme-status-success-fill)',
            color: 'var(--theme-status-success-content)',
            borderRadius: 'var(--theme-radius-badge)',
        };
    }
    if (variant === 'error') {
        return {
            background: 'var(--theme-status-error-fill)',
            color: 'var(--theme-status-error-content)',
            borderRadius: 'var(--theme-radius-badge)',
        };
    }
    return {
        background: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
        color: 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
        borderRadius: 'var(--theme-radius-badge)',
    };
}

const applyBtnStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.25rem 0.625rem',
    fontSize: '0.75rem',
    gap: '0.25rem',
};

export default function DedupModal({ open, onClose, projectId, blueprintSlug, onApplied }: DedupModalProps) {
    const t = useT();
    const [loading, setLoading] = useState(false);
    const [merges, setMerges] = useState<MergeProposal[]>([]);
    const [matches, setMatches] = useState<ExistingMatch[]>([]);
    const [applying, setApplying] = useState<number | null>(null);
    const [analyzed, setAnalyzed] = useState(false);

    const analyze = useCallback(async () => {
        setLoading(true);
        setAnalyzed(false);
        try {
            const res = await fetch(
                `/api/v1/projects/${projectId}/ai/dedup/${blueprintSlug}`,
                { headers: csrfHeaders() },
            );
            if (res.ok) {
                const data = await res.json();
                setMerges(data.merges ?? []);
                setMatches(data.existing_matches ?? []);
                setAnalyzed(true);
            }
        } finally {
            setLoading(false);
        }
    }, [projectId, blueprintSlug]);

    useEffect(() => {
        if (open) {
            void analyze();
        }
    }, [open, analyze]);

    const applyMerge = async (merge: MergeProposal) => {
        setApplying(merge.keep_command_id);
        await fetch(`/api/v1/projects/${projectId}/ai/dedup/merge`, {
            method: 'POST',
            headers: csrfHeaders(),
            body: JSON.stringify({
                keep_command_id: merge.keep_command_id,
                remove_command_ids: merge.remove_command_ids,
                merged_name: merge.merged_name,
                merged_summary: merge.merged_summary,
            }),
        });
        setMerges((prev) => prev.filter((m) => m.keep_command_id !== merge.keep_command_id));
        setApplying(null);
        onApplied();
    };

    const applyMatch = async (match: ExistingMatch) => {
        setApplying(match.command_id);
        await fetch(`/api/v1/projects/${projectId}/ai/dedup/match`, {
            method: 'POST',
            headers: csrfHeaders(),
            body: JSON.stringify({
                command_id: match.command_id,
                existing_entry_id: match.existing_entry_id,
            }),
        });
        setMatches((prev) => prev.filter((m) => m.command_id !== match.command_id));
        setApplying(null);
        onApplied();
    };

    const hasResults = merges.length > 0 || matches.length > 0;
    const blueprintLabel = blueprintSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
            <div className="p-5">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center" style={headerIconWrapStyle}>
                        <i className="fa-solid fa-code-merge" />
                    </div>
                    <div>
                        <h3 className="font-bold">{t('notes.dedup.title')}</h3>
                        <p className="text-xs" style={fadedText}>{blueprintLabel}</p>
                    </div>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <i className="fa-solid fa-circle-notch fa-spin text-2xl" style={subtleText} aria-hidden="true" />
                        <span className="ml-3 text-sm" style={subtleText}>
                            {t('notes.dedup.analyzing')}
                        </span>
                    </div>
                )}

                {analyzed && !hasResults && (
                    <div className="py-8 text-center">
                        <i
                            className="fa-solid fa-check-circle mb-2 text-2xl"
                            style={{ color: 'var(--theme-status-success-stroke)' }}
                        />
                        <p className="text-sm" style={muteText}>{t('notes.dedup.empty')}</p>
                    </div>
                )}

                {!loading && hasResults && (
                    <div className="max-h-[50vh] space-y-3 overflow-y-auto">
                        {merges.map((merge) => (
                            <div key={merge.keep_command_id} className="p-3" style={mergeCardStyle}>
                                <div className="mb-2 flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-medium">
                                            {t('notes.dedup.merge_label').split(':name')[0]}
                                            <span style={{ color: 'var(--theme-brand-primary-500)' }}>
                                                {merge.merged_name}
                                            </span>
                                        </p>
                                        <p className="mt-0.5 text-xs" style={subtleText}>{merge.reason}</p>
                                    </div>
                                    <button
                                        onClick={() => void applyMerge(merge)}
                                        disabled={applying === merge.keep_command_id}
                                        className="alex-btn alex-btn--primary flex-shrink-0"
                                        style={{
                                            ...applyBtnStyle,
                                            background: 'var(--theme-status-success-fill)',
                                            color: 'var(--theme-status-success-content)',
                                        }}
                                    >
                                        {applying === merge.keep_command_id
                                            ? <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                                            : t('notes.dedup.action.apply')}
                                    </button>
                                </div>
                                {merge.merged_summary && (
                                    <p className="text-xs italic" style={fadedText}>{merge.merged_summary}</p>
                                )}
                                <div className="mt-2 flex flex-wrap gap-1">
                                    <span className="px-1.5 py-1 text-[10px] font-medium" style={chipStyle('success')}>
                                        {t('notes.dedup.chip.keep').replace(':id', String(merge.keep_command_id))}
                                    </span>
                                    {merge.remove_command_ids.map((id) => (
                                        <span key={id} className="px-1.5 py-1 text-[10px] font-medium" style={chipStyle('error')}>
                                            {t('notes.dedup.chip.remove').replace(':id', String(id))}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {matches.map((match) => (
                            <div key={match.command_id} className="p-3" style={matchCardStyle}>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-medium">{t('notes.dedup.match_label')}</p>
                                        <p className="mt-0.5 text-xs" style={subtleText}>{match.reason}</p>
                                    </div>
                                    <button
                                        onClick={() => void applyMatch(match)}
                                        disabled={applying === match.command_id}
                                        className="alex-btn alex-btn--primary flex-shrink-0"
                                        style={{
                                            ...applyBtnStyle,
                                            background: 'var(--theme-status-success-fill)',
                                            color: 'var(--theme-status-success-content)',
                                        }}
                                    >
                                        {applying === match.command_id
                                            ? <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                                            : t('notes.dedup.action.remove')}
                                    </button>
                                </div>
                                <div className="mt-2 flex gap-1">
                                    <span className="px-1.5 py-1 text-[10px] font-medium" style={chipStyle('error')}>
                                        {t('notes.dedup.chip.remove').replace(':id', String(match.command_id))}
                                    </span>
                                    <span className="px-1.5 py-1 text-[10px] font-medium" style={chipStyle('neutral')}>
                                        {t('notes.dedup.chip.entry').replace(':id', String(match.existing_entry_id))}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}
