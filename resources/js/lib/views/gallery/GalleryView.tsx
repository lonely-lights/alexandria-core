import { useEffect, useMemo, useState } from 'react';
import GalleryTile, { type GalleryEntry } from './GalleryTile';
import type { GalleryConfig } from './types';

interface GalleryViewProps {
    projectId: number;
    blueprintId: number;
    config: GalleryConfig;
}

export default function GalleryView({ projectId, blueprintId, config }: GalleryViewProps) {
    const [entries, setEntries] = useState<GalleryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({ per_page: '100' });
                const res = await fetch(
                    `/api/v1/projects/${projectId}/blueprints/${blueprintId}/entries?${params}`,
                    {
                        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                        credentials: 'same-origin',
                    },
                );
                if (!res.ok) {
                    if (!cancelled) setError(`HTTP ${res.status}`);
                    return;
                }
                const json = (await res.json()) as { data: GalleryEntry[] };
                if (!cancelled) setEntries(json.data);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load entries');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, [projectId, blueprintId]);

    const sorted = useMemo(() => {
        const copy = [...entries];
        switch (config.sort) {
            case 'updated_at':
                return copy.sort((a, b) => (b.updated_at_iso ?? '').localeCompare(a.updated_at_iso ?? ''));
            case 'created_at':
                return copy.sort((a, b) => (b.created_at_iso ?? '').localeCompare(a.created_at_iso ?? ''));
            case 'name':
            default:
                return copy.sort((a, b) => a.name.localeCompare(b.name));
        }
    }, [entries, config.sort]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <span className="loading loading-spinner loading-md" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">
                Could not load gallery entries: {error}
            </div>
        );
    }

    if (sorted.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-base-content/15 py-16 text-center">
                <i className="fa-solid fa-images mb-3 text-3xl text-base-content/15" />
                <p className="text-sm text-base-content/40">No entries to display.</p>
                <p className="mt-1 text-xs text-base-content/30">Create one to see it in the gallery.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(160px,1fr))]">
            {sorted.map((entry) => (
                <GalleryTile key={entry.id} entry={entry} />
            ))}
        </div>
    );
}
