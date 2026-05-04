/* ── AiStatusFooter ── */

import { useState, useEffect } from 'react';
import type { Note } from '@alexandria/types/notes-dashboard';

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

export default function AiStatusFooter({
    note,
    onCategorize,
    onApproveRouting,
    onRejectRouting,
    onReviewCommands,
    onRetry,
}: AiStatusFooterProps) {
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

    return (
        <div className="flex-shrink-0 rounded-xl border border-base-content/10 bg-base-200/80 px-4 py-2.5">
            {state === 'idle' && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-success" />
                        <span className="text-xs font-medium">AI Ready</span>
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={onCategorize}
                    >
                        ⚡ Categorize
                    </button>
                </div>
            )}

            {state === 'processing' && (
                <div className="flex items-center gap-2">
                    <span className="loading loading-spinner loading-xs text-info" />
                    <span className="text-xs font-medium">Classifying note...</span>
                    <span className="text-xs opacity-50">This may take a few seconds</span>
                </div>
            )}

            {state === 'routed' && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="flex-shrink-0 text-xs text-base-content/50">Sort into:</span>
                        <div className="flex flex-1 flex-wrap items-center gap-1.5">
                            {routedBlueprints.map((slug) => {
                                const isSelected = selectedSlugs.includes(slug);
                                return (
                                    <button
                                        key={slug}
                                        type="button"
                                        onClick={() => toggleSlug(slug)}
                                        className={`badge border-0 py-1.5 transition-colors cursor-pointer ${
                                            isSelected
                                                ? 'badge-secondary'
                                                : 'badge-neutral hover:brightness-125'
                                        }`}
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
                                className="btn btn-outline btn-error btn-xs"
                                onClick={onRejectRouting}
                            >
                                Reject All
                            </button>
                            <button
                                type="button"
                                className={`btn btn-success btn-xs ${selectedSlugs.length === 0 ? 'btn-disabled' : ''}`}
                                onClick={() => selectedSlugs.length > 0 && onApproveRouting(selectedSlugs)}
                            >
                                ✓ Process ({selectedSlugs.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {state === 'commands_ready' && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-warning" />
                        <span className="text-xs font-medium">
                            {typeof ai?.command_count === 'number' ? ai.command_count : '?'}{' '}
                            commands pending review
                        </span>
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={onReviewCommands}
                    >
                        Review Commands →
                    </button>
                </div>
            )}

            {state === 'completed' && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-success" />
                        <span className="text-xs font-medium">Auto-Sorted</span>
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={onCategorize}
                    >
                        <i className="fa-solid fa-bolt text-[10px]" /> Sort within Blueprint
                    </button>
                </div>
            )}

            {state === 'error' && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-error" />
                        <span className="text-xs font-medium text-error">
                            {typeof ai?.last_error === 'string'
                                ? ai.last_error
                                : 'An error occurred'}
                        </span>
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={onRetry}
                    >
                        ⚡ Retry
                    </button>
                </div>
            )}
        </div>
    );
}
