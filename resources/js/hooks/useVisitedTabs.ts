import { useEffect, useState } from 'react';

/**
 * Tracks the set of tab keys a user has visited within a tabbed surface.
 * Used by the keep-mounted-tabs pattern: lazy-mount each tab on first
 * visit, then keep it mounted (with `hidden`) on subsequent switches
 * so its fetched data, scroll position, and local filter state survive.
 *
 *     const visited = useVisitedTabs(activeTab);
 *     return (
 *         <>
 *             {visited.has('dashboard') && <div hidden={activeTab !== 'dashboard'}><DashboardTab /></div>}
 *             {visited.has('notes')     && <div hidden={activeTab !== 'notes'}><NotesTab /></div>}
 *         </>
 *     );
 *
 * Replaces the same pattern duplicated across AiDashboard,
 * NotesDashboard, and Blueprints/Show (Phase 2.H H-EFFECT-DERIVED-2).
 */
export function useVisitedTabs<T extends string>(active: T): Set<T> {
    const [visited, setVisited] = useState<Set<T>>(() => new Set([active]));

    useEffect(() => {
        if (visited.has(active)) return;
        setVisited((prev) => {
            const next = new Set(prev);
            next.add(active);
            return next;
        });
    }, [active, visited]);

    return visited;
}
