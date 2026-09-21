import { useEffect, useMemo, useState } from 'react';
import { fetchThreads } from '../Threads/threadApi';
import type { PatternThread, PatternMark } from '../Threads/threadApi';
import { THREAD_HIGHLIGHTS_CHANGED } from '../Threads/threadHighlightEvents';
export interface OutlineDeviceMark {
    thread: PatternThread;
    mark: PatternMark;
}
export default function useOutlineThreads(
    projectSlug: string,
    workId: number,
    refreshSignal: number,
) {
    const [threads, setThreads] = useState<PatternThread[]>([]);
    const [failed, setFailed] = useState(false);
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        const refresh = (event: Event) => {
            if (
                (event as CustomEvent<{ projectSlug: string }>).detail
                    .projectSlug === projectSlug
            ) {
                setRevision((v) => v + 1);
            }
        };
        window.addEventListener(THREAD_HIGHLIGHTS_CHANGED, refresh);

        return () =>
            window.removeEventListener(THREAD_HIGHLIGHTS_CHANGED, refresh);
    }, [projectSlug]);
    useEffect(() => {
        let cancelled = false;
        void fetchThreads(projectSlug, { workId, includeMarks: true }).then(
            (result) => {
                if (cancelled) {
                    return;
                }

                setFailed(result === null);

                if (result !== null) {
                    setThreads(result);
                }
            },
        );

        return () => {
            cancelled = true;
        };
    }, [projectSlug, workId, refreshSignal, revision]);
    const bySection = useMemo(() => {
        const grouped = new Map<number, OutlineDeviceMark[]>();

        for (const thread of threads) {
            for (const mark of thread.marks ?? []) {
                const list = grouped.get(mark.work_section_id) ?? [];
                list.push({ thread, mark });
                grouped.set(mark.work_section_id, list);
            }
        }

        return grouped;
    }, [threads]);

    return {
        threads,
        bySection,
        failed,
        retry: () => setRevision((v) => v + 1),
    };
}
