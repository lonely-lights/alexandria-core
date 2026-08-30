import { useEffect, useState, type CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';

import type { CurrentSection, SectionNode } from '../Workspace';
import ThreadDetailModal from './ThreadDetailModal';
import { roleChips } from './patternChips';
import { fetchThreads, type PatternThread } from './threadApi';

/**
 * Threads sidebar mode — Devices & Tropes Task 6 (design doc
 * 2026-08-29-devices-tropes-design.md Surface #3), the sixth built-in
 * right-rail mode alongside Linked items/Notes/Comments/Outline/History.
 *
 * Two groups for the current section: "In this scene" (threads with a
 * mark pinned here — `threads.index?section_id=…`, so `thread.marks`
 * is real and role chips reflect actual pinned moments) and "Open
 * promises in this work" (`threads.index?work_id=…&status=open`,
 * de-duplicated against the first group). Any row opens
 * ThreadDetailModal. Load/refetch pattern mirrors HistoryPanel: fetch
 * on mount, refetch on section change or `refreshSignal` bump (the
 * latter fires after a mark is added via Workspace's shared
 * MarkThreadModal, locked to whichever thread was being edited).
 */

export interface ThreadsPanelProps {
    projectSlug: string;
    workId: number;
    sections: SectionNode[];
    currentSection: CurrentSection | null;
    canUpdate: boolean;
    refreshSignal: number;
    onRequestAddMark: (thread: PatternThread) => void;
}

const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 0.75rem 0.375rem',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    flexShrink: 0,
};

const titleStyle: CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
};

const hintStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 35%, transparent)',
};

const groupHeadingStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    fontSize: '0.625rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
};

const countChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.375rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    lineHeight: 1.6,
    whiteSpace: 'nowrap',
};

const rowClass = 'alex-row flex w-full flex-col items-start gap-1 px-3 py-2 text-left text-sm';
const rowStyle: CSSProperties = { borderRadius: 'var(--theme-radius-button)' };

const rowSubtitleStyle: CSSProperties = {
    fontSize: '0.6875rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
};

const roleChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.3125rem',
    fontSize: '0.5625rem',
    fontWeight: 700,
    lineHeight: 1.5,
};

function statusDotStyle(status: 'open' | 'kept'): CSSProperties {
    return {
        display: 'inline-block',
        width: '0.5rem',
        height: '0.5rem',
        borderRadius: '999px',
        flexShrink: 0,
        background:
            status === 'kept'
                ? 'var(--theme-status-success-fill)'
                : 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
    };
}

function GroupHeading({ label, count }: { label: string; count: number }) {
    return (
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1">
            <span className="min-w-0 truncate" style={groupHeadingStyle}>{label}</span>
            <span style={countChipStyle}>{count}</span>
        </div>
    );
}

function ThreadRow({
    thread,
    roles,
    onOpen,
}: {
    thread: PatternThread;
    roles: string[];
    onOpen: () => void;
}) {
    return (
        <button type="button" className={rowClass} style={rowStyle} onClick={onOpen}>
            <span className="flex w-full items-center gap-2">
                <span style={statusDotStyle(thread.status)} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-medium">{thread.title}</span>
                {roles.map((initial, index) => (
                    // Role initials are not unique across marks of the same
                    // role — index is stable here since the list is derived
                    // fresh from thread.marks on every render, never reordered.
                    // eslint-disable-next-line react/no-array-index-key
                    <span key={`${initial}-${index}`} style={roleChipStyle}>
                        {initial}
                    </span>
                ))}
            </span>
            <span className="w-full truncate" style={rowSubtitleStyle}>{thread.card_name}</span>
        </button>
    );
}

export default function ThreadsPanel({
    projectSlug,
    workId,
    sections,
    currentSection,
    canUpdate,
    refreshSignal,
    onRequestAddMark,
}: ThreadsPanelProps) {
    const t = useT();
    const sectionId = currentSection?.id ?? null;

    const [sceneThreads, setSceneThreads] = useState<PatternThread[] | null>(null);
    const [sceneFailed, setSceneFailed] = useState(false);
    const [openThreads, setOpenThreads] = useState<PatternThread[] | null>(null);
    const [openFailed, setOpenFailed] = useState(false);
    const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
    const [localRefresh, setLocalRefresh] = useState(0);

    useEffect(() => {
        let cancelled = false;

        if (sectionId === null) {
            setSceneThreads(null);
            setSceneFailed(false);
        } else {
            fetchThreads(projectSlug, { sectionId }).then((result) => {
                if (cancelled) {
                    return;
                }

                if (result === null) {
                    setSceneFailed(true);
                    return;
                }

                setSceneFailed(false);
                setSceneThreads(result);
            });
        }

        fetchThreads(projectSlug, { workId, status: 'open' }).then((result) => {
            if (cancelled) {
                return;
            }

            if (result === null) {
                setOpenFailed(true);
                return;
            }

            setOpenFailed(false);
            setOpenThreads(result);
        });

        return () => {
            cancelled = true;
        };
    }, [projectSlug, workId, sectionId, refreshSignal, localRefresh]);

    function handleChanged() {
        setLocalRefresh((n) => n + 1);
    }

    // "Open promises in this work" excludes anything already surfaced
    // in "In this scene" — a scene-scoped open thread would otherwise
    // double-list.
    const sceneIds = new Set((sceneThreads ?? []).map((thread) => thread.id));
    const otherOpenThreads = (openThreads ?? []).filter((thread) => !sceneIds.has(thread.id));

    return (
        <div data-threads-panel="" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <div style={headerStyle}>
                <span style={titleStyle}>{t('writing.threads.sidebar_label')}</span>
            </div>

            <div className="writing-workspace-scroll min-h-0 flex-1 overflow-y-auto px-1 py-2">
                <GroupHeading label={t('writing.threads.group_in_scene')} count={sceneThreads?.length ?? 0} />

                {sectionId === null && (
                    <p className="px-4 py-2 text-xs" style={hintStyle}>{t('writing.threads.no_section')}</p>
                )}
                {sectionId !== null && sceneFailed && (
                    <p className="px-4 py-2 text-xs" style={{ color: 'var(--theme-status-error-stroke)' }}>
                        {t('writing.threads.load_error')}
                    </p>
                )}
                {sectionId !== null && !sceneFailed && sceneThreads === null && (
                    <p className="px-4 py-2 text-xs" style={hintStyle}>{t('writing.threads.loading_threads')}</p>
                )}
                {sectionId !== null && sceneThreads !== null && sceneThreads.length === 0 && (
                    <p className="px-4 py-2 text-xs" style={hintStyle}>{t('writing.threads.scene_empty')}</p>
                )}
                {sceneThreads?.map((thread) => (
                    <ThreadRow
                        key={thread.id}
                        thread={thread}
                        roles={roleChips((thread.marks ?? []).map((mark) => mark.role))}
                        onOpen={() => setSelectedThreadId(thread.id)}
                    />
                ))}

                <GroupHeading label={t('writing.threads.group_open_promises')} count={otherOpenThreads.length} />

                {openFailed && (
                    <p className="px-4 py-2 text-xs" style={{ color: 'var(--theme-status-error-stroke)' }}>
                        {t('writing.threads.load_error')}
                    </p>
                )}
                {!openFailed && openThreads === null && (
                    <p className="px-4 py-2 text-xs" style={hintStyle}>{t('writing.threads.loading_threads')}</p>
                )}
                {openThreads !== null && otherOpenThreads.length === 0 && (
                    <p className="px-4 py-2 text-xs" style={hintStyle}>{t('writing.threads.open_empty')}</p>
                )}
                {otherOpenThreads.map((thread) => (
                    <ThreadRow
                        key={thread.id}
                        thread={thread}
                        roles={[]}
                        onOpen={() => setSelectedThreadId(thread.id)}
                    />
                ))}
            </div>

            {selectedThreadId !== null && (
                <ThreadDetailModal
                    projectSlug={projectSlug}
                    workId={workId}
                    sections={sections}
                    threadId={selectedThreadId}
                    canUpdate={canUpdate}
                    refreshSignal={refreshSignal}
                    onRequestAddMark={onRequestAddMark}
                    onClose={() => setSelectedThreadId(null)}
                    onChanged={handleChanged}
                />
            )}
        </div>
    );
}
