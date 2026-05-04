import { useState, useEffect, useCallback } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';

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

export default function DedupModal({ open, onClose, projectId, blueprintSlug, onApplied }: DedupModalProps) {
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

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
            <div className="p-5">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-warning/20">
                        <i className="fa-solid fa-code-merge text-warning" />
                    </div>
                    <div>
                        <h3 className="font-bold">Check Duplicates</h3>
                        <p className="text-xs text-base-content/40">
                            {blueprintSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </p>
                    </div>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <span className="loading loading-spinner loading-md" />
                        <span className="ml-3 text-sm text-base-content/50">Analyzing for duplicates...</span>
                    </div>
                )}

                {analyzed && !hasResults && (
                    <div className="py-8 text-center">
                        <i className="fa-solid fa-check-circle mb-2 text-2xl text-success" />
                        <p className="text-sm text-base-content/60">No duplicates found</p>
                    </div>
                )}

                {!loading && hasResults && (
                    <div className="max-h-[50vh] space-y-3 overflow-y-auto">
                        {merges.map((merge) => (
                            <div key={merge.keep_command_id} className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                                <div className="mb-2 flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-medium">
                                            Merge → <span className="text-primary">{merge.merged_name}</span>
                                        </p>
                                        <p className="mt-0.5 text-xs text-base-content/50">{merge.reason}</p>
                                    </div>
                                    <button
                                        onClick={() => void applyMerge(merge)}
                                        disabled={applying === merge.keep_command_id}
                                        className="btn btn-success btn-xs flex-shrink-0"
                                    >
                                        {applying === merge.keep_command_id
                                            ? <span className="loading loading-spinner loading-xs" />
                                            : 'Apply'}
                                    </button>
                                </div>
                                {merge.merged_summary && (
                                    <p className="text-xs text-base-content/40 italic">{merge.merged_summary}</p>
                                )}
                                <div className="mt-2 flex flex-wrap gap-1">
                                    <span className="badge badge-xs badge-success py-1">Keep #{merge.keep_command_id}</span>
                                    {merge.remove_command_ids.map((id) => (
                                        <span key={id} className="badge badge-xs badge-error py-1">Remove #{id}</span>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {matches.map((match) => (
                            <div key={match.command_id} className="rounded-lg border border-info/30 bg-info/5 p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-medium">Duplicates existing entry</p>
                                        <p className="mt-0.5 text-xs text-base-content/50">{match.reason}</p>
                                    </div>
                                    <button
                                        onClick={() => void applyMatch(match)}
                                        disabled={applying === match.command_id}
                                        className="btn btn-success btn-xs flex-shrink-0"
                                    >
                                        {applying === match.command_id
                                            ? <span className="loading loading-spinner loading-xs" />
                                            : 'Remove'}
                                    </button>
                                </div>
                                <div className="mt-2 flex gap-1">
                                    <span className="badge badge-xs badge-error py-1">Remove #{match.command_id}</span>
                                    <span className="badge badge-xs badge-neutral py-1">→ Entry #{match.existing_entry_id}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}
