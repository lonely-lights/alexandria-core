import { router } from '@inertiajs/react';
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';

import useT, { type Translator } from '@alexandria/hooks/useT';
import Input from '@alexandria/components/form/Input';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import Tooltip from '@alexandria/components/ui/Tooltip';
import type { ScreenplaySceneLink } from '@alexandria/editor/screenplay/sceneLinks';

import type { CurrentSection } from '../Workspace';
import { getWritingPanels, subscribeWritingPanels } from '../writingPanelRegistry';
import EntryPickerModal, {
    blueprintIconClass,
    searchEntries,
    type EntrySearchRow,
} from './EntryPickerModal';

/**
 * Workspace reference rail — Stage 8g.1 (Plan 3 Task 4).
 *
 * Right-hand panel with three built-in tabs — Browse (project-wide
 * entry search), Pins (per-work shortlist), Section (POV / Setting /
 * detected mentions for the open section) — plus any extra tabs
 * registered through the writingPanelRegistry (the 8g.2 craft suite
 * is the first customer). Section data is fetched lazily as JSON and
 * re-fetched whenever the section switches or an autosave lands
 * (saveSignal), so detected mentions track the manuscript.
 */

export interface EntryCard {
    id: number;
    name: string;
    slug: string;
    blueprint_slug: string | null;
    blueprint_name: string | null;
    blueprint_icon: string | null;
    url: string;
}

interface MentionCard extends EntryCard {
    mention_count: number;
}

interface SectionMentionsPayload {
    pov: EntryCard | null;
    setting: EntryCard | null;
    mentions: MentionCard[];
}

interface ReferencePanelProps {
    project: { id: number; name: string; slug: string };
    work: { id: number; title: string; slug: string; format?: string };
    currentSection: CurrentSection | null;
    pins: EntryCard[];
    canUpdate: boolean;
    /** Bumped by the Workspace after each confirmed autosave. */
    saveSignal: number;
    sceneLinks?: ScreenplaySceneLink[];
    sceneLinksFocusSignal?: number;
    activeTab?: string;
    onActiveTabChange?: (tab: string) => void;
    /** Navigate to a section by slug — passed from Workspace.selectSection. */
    onSelect?: (slug: string) => void;
}

/* ── Theme styles ── */

const tabStripStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const tabActiveStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-secondary-500) 18%, transparent)',
    color: 'var(--theme-brand-secondary-500)',
    borderRadius: 'var(--theme-radius-button)',
};

const tabIdleStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
};

const mutedStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const hintStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 35%, transparent)',
};

const rowIconStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const rowSubStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
};

const rowActionStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const peekStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const peekLinkStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-500)',
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
    fontSize: '0.6875rem',
    fontWeight: 600,
    lineHeight: 1.6,
    whiteSpace: 'nowrap',
};

const chooseBtnStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-500)',
};

const errorTextStyle: CSSProperties = {
    color: 'var(--theme-status-error-stroke)',
};

/* ── Shared entry row ── */

function EntryRow({
    card,
    projectSlug,
    action,
    t,
}: {
    card: EntryCard;
    projectSlug: string;
    action?: ReactNode;
    t: Translator;
}) {
    const [peek, setPeek] = useState(false);
    const url = card.url || `/p/${projectSlug}/${card.blueprint_slug}/${card.slug}`;

    return (
        <div>
            <div
                className="alex-row group flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm"
                style={{ borderRadius: 'var(--theme-radius-button)' }}
                onClick={() => setPeek((prev) => !prev)}
            >
                <i
                    className={`${blueprintIconClass(card.blueprint_icon)} w-4 shrink-0 text-center text-xs`}
                    style={rowIconStyle}
                    aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate font-medium">{card.name}</span>
                {card.blueprint_name && (
                    <span className="shrink-0 text-[11px]" style={rowSubStyle}>
                        {card.blueprint_name}
                    </span>
                )}
                {action}
            </div>
            {peek && (
                <div className="mx-3 mb-1.5 flex items-center justify-between gap-2 px-3 py-2 text-xs" style={peekStyle}>
                    <span style={mutedStyle}>{card.blueprint_name ?? ''}</span>
                    <a
                        href={url}
                        className="shrink-0 font-medium hover:underline"
                        style={peekLinkStyle}
                    >
                        {t('writing.panel.open_entry')}
                        <i className="fa-solid fa-arrow-up-right-from-square ml-1 text-[9px]" aria-hidden="true" />
                    </a>
                </div>
            )}
        </div>
    );
}

/* ── Browse tab ── */

function BrowseTab({
    project,
    work,
    canUpdate,
    t,
}: {
    project: { id: number; slug: string };
    work: { slug: string };
    canUpdate: boolean;
    t: Translator;
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<EntrySearchRow[]>([]);
    const [searched, setSearched] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clear a pending search on unmount (tab switch) so the stale
    // timer never fires into the dead instance.
    useEffect(() => {
        return () => {
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    function handleQueryChange(value: string) {
        setQuery(value);

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        if (!value.trim()) {
            setResults([]);
            setSearched(false);
            return;
        }

        timerRef.current = setTimeout(() => {
            searchEntries(project.id, value.trim())
                .then((rows) => {
                    setResults(rows);
                    setSearched(true);
                })
                .catch(() => {
                    setResults([]);
                    setSearched(true);
                });
        }, 300);
    }

    function pin(entryId: number) {
        router.post(
            `/works/${project.slug}/${work.slug}/pins`,
            { entry_id: entryId },
            { preserveScroll: true },
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 px-3 pt-3 pb-2">
                <Input
                    type="text"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    placeholder={t('writing.panel.search_placeholder')}
                    icon="fa-solid fa-magnifying-glass"
                    size="sm"
                />
            </div>
            <div className="writing-workspace-scroll min-h-0 flex-1 overflow-y-auto px-1 pb-2">
                {!query.trim() ? (
                    <p className="px-4 py-6 text-center text-xs" style={hintStyle}>
                        {t('writing.panel.search_hint')}
                    </p>
                ) : results.length === 0 && searched ? (
                    <p className="px-4 py-6 text-center text-xs" style={hintStyle}>
                        {t('writing.panel.no_results')}
                    </p>
                ) : (
                    results.map((row) => (
                        <EntryRow
                            key={row.id}
                            card={{ ...row, url: `/p/${project.slug}/${row.blueprint_slug}/${row.slug}` }}
                            projectSlug={project.slug}
                            t={t}
                            action={
                                canUpdate ? (
                                    <button
                                        type="button"
                                        className="flex h-6 w-6 shrink-0 items-center justify-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                                        style={rowActionStyle}
                                        title={t('writing.panel.pin')}
                                        aria-label={t('writing.panel.pin')}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            pin(row.id);
                                        }}
                                    >
                                        <i className="fa-solid fa-thumbtack text-[11px]" />
                                    </button>
                                ) : undefined
                            }
                        />
                    ))
                )}
            </div>
        </div>
    );
}

/* ── Pins tab ── */

function PinsTab({
    project,
    work,
    pins,
    canUpdate,
    t,
}: {
    project: { slug: string };
    work: { slug: string };
    pins: EntryCard[];
    canUpdate: boolean;
    t: Translator;
}) {
    function unpin(entryId: number) {
        router.delete(`/works/${project.slug}/${work.slug}/pins/${entryId}`, {
            preserveScroll: true,
        });
    }

    return (
        <div className="writing-workspace-scroll min-h-0 flex-1 overflow-y-auto px-1 py-2">
            {pins.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs" style={hintStyle}>
                    {t('writing.panel.no_pins')}
                </p>
            ) : (
                pins.map((card) => (
                    <EntryRow
                        key={card.id}
                        card={card}
                        projectSlug={project.slug}
                        t={t}
                        action={
                            canUpdate ? (
                                <button
                                    type="button"
                                    className="flex h-6 w-6 shrink-0 items-center justify-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                                    style={rowActionStyle}
                                    title={t('writing.panel.unpin')}
                                    aria-label={t('writing.panel.unpin')}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        unpin(card.id);
                                    }}
                                >
                                    <i className="fa-solid fa-thumbtack-slash text-[11px]" />
                                </button>
                            ) : undefined
                        }
                    />
                ))
            )}
        </div>
    );
}

/* ── Section tab ── */

type PickTarget = 'pov_entry_id' | 'setting_entry_id';

function SectionTab({
    project,
    work,
    currentSection,
    canUpdate,
    saveSignal,
    t,
}: {
    project: { id: number; slug: string };
    work: { slug: string };
    currentSection: CurrentSection | null;
    canUpdate: boolean;
    saveSignal: number;
    t: Translator;
}) {
    const [data, setData] = useState<SectionMentionsPayload | null>(null);
    const [failed, setFailed] = useState(false);
    // Bumped after a POV/Setting save so the panel re-fetches the
    // server-side mention sync result.
    const [refreshTick, setRefreshTick] = useState(0);
    const [pickTarget, setPickTarget] = useState<PickTarget | null>(null);

    const sectionId = currentSection?.id ?? null;

    // Same ref pattern as useSectionAutosave: saveReference can run
    // from callbacks created under an older render (the picker modal's
    // onPick), so it reads the CURRENT section through this ref rather
    // than its creation-time closure.
    const currentSectionRef = useRef(currentSection);
    currentSectionRef.current = currentSection;

    useEffect(() => {
        if (sectionId === null) {
            setData(null);
            return;
        }

        let cancelled = false;

        fetch(`/works/${project.slug}/${work.slug}/panel/mentions/${sectionId}`, {
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Mentions fetch failed: ${response.status}`);
                }
                return response.json() as Promise<SectionMentionsPayload>;
            })
            .then((payload) => {
                if (!cancelled) {
                    setData(payload);
                    setFailed(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setFailed(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [project.slug, work.slug, sectionId, saveSignal, refreshTick]);

    function saveReference(field: PickTarget, value: number | null) {
        const section = currentSectionRef.current;

        if (section === null) {
            return;
        }

        // WorkSectionController::update validates `title` as required
        // and only touches keys present in the request, so sending the
        // current title plus the one reference field leaves every other
        // section attribute untouched.
        router.put(
            `/works/${project.slug}/${work.slug}/sections/${section.id}`,
            { title: section.title, [field]: value },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['currentSection', 'sections'],
                onSuccess: () => setRefreshTick((prev) => prev + 1),
            },
        );
    }

    if (currentSection === null) {
        return (
            <p className="px-4 py-6 text-center text-xs" style={hintStyle}>
                {t('writing.panel.no_section')}
            </p>
        );
    }

    return (
        <div className="writing-workspace-scroll min-h-0 flex-1 overflow-y-auto px-1 py-2">
            {failed && (
                <p className="px-3 py-2 text-xs" style={errorTextStyle}>
                    {t('writing.panel.no_results')}
                </p>
            )}

            <ReferenceSlot
                heading={t('writing.panel.pov')}
                card={data?.pov ?? null}
                projectSlug={project.slug}
                canUpdate={canUpdate}
                onChoose={() => setPickTarget('pov_entry_id')}
                onClear={() => saveReference('pov_entry_id', null)}
                t={t}
            />
            <ReferenceSlot
                heading={t('writing.panel.setting')}
                card={data?.setting ?? null}
                projectSlug={project.slug}
                canUpdate={canUpdate}
                onChoose={() => setPickTarget('setting_entry_id')}
                onClear={() => saveReference('setting_entry_id', null)}
                t={t}
            />

            <p className="px-3 pt-3 pb-1" style={groupHeadingStyle}>
                {t('writing.panel.mentions')}
            </p>
            {!data || data.mentions.length === 0 ? (
                <p className="px-4 py-4 text-center text-xs" style={hintStyle}>
                    {t('writing.panel.no_results')}
                </p>
            ) : (
                data.mentions.map((card) => (
                    <EntryRow
                        key={card.id}
                        card={card}
                        projectSlug={project.slug}
                        t={t}
                        action={
                            card.mention_count > 1 ? (
                                <span className="shrink-0" style={countChipStyle}>
                                    ×{card.mention_count}
                                </span>
                            ) : undefined
                        }
                    />
                ))
            )}

            <p className="px-3 pt-3 pb-1" style={groupHeadingStyle}>
                {t('writing.panel.target_words')}
            </p>
            <div className="px-3 pb-2">
                <SectionTargetInput
                    key={currentSection.id}
                    project={project}
                    work={work}
                    currentSection={currentSection}
                    canUpdate={canUpdate}
                />
            </div>

            <EntryPickerModal
                open={pickTarget !== null}
                onClose={() => setPickTarget(null)}
                title={pickTarget === 'pov_entry_id' ? t('writing.panel.pov') : t('writing.panel.setting')}
                projectId={project.id}
                onPick={(row) => {
                    if (pickTarget !== null) {
                        saveReference(pickTarget, row.id);
                    }
                    setPickTarget(null);
                }}
            />
        </div>
    );
}

/**
 * Per-section word target — commits on blur. Keyed by section id from
 * the parent so the local draft reseeds on section switch.
 */
function SectionTargetInput({
    project,
    work,
    currentSection,
    canUpdate,
}: {
    project: { slug: string };
    work: { slug: string };
    currentSection: CurrentSection;
    canUpdate: boolean;
}) {
    const [value, setValue] = useState(currentSection.target_words?.toString() ?? '');

    function commit() {
        const parsed = Number.parseInt(value.trim(), 10);
        const next = Number.isFinite(parsed) && parsed >= 0 ? parsed : null;

        if (next === (currentSection.target_words ?? null)) {
            return;
        }

        // WorkSectionController::update validates `title` as required
        // and only touches keys present in the request.
        router.put(
            `/works/${project.slug}/${work.slug}/sections/${currentSection.id}`,
            { title: currentSection.title, target_words: next },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['currentSection', 'sections'],
            },
        );
    }

    return (
        <Input
            type="number"
            min={0}
            size="sm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            disabled={!canUpdate}
        />
    );
}

function ReferenceSlot({
    heading,
    card,
    projectSlug,
    canUpdate,
    onChoose,
    onClear,
    t,
}: {
    heading: string;
    card: EntryCard | null;
    projectSlug: string;
    canUpdate: boolean;
    onChoose: () => void;
    onClear: () => void;
    t: Translator;
}) {
    return (
        <div>
            <p className="px-3 pt-2 pb-1" style={groupHeadingStyle}>
                {heading}
            </p>
            {card !== null ? (
                <EntryRow
                    card={card}
                    projectSlug={projectSlug}
                    t={t}
                    action={
                        canUpdate ? (
                            <button
                                type="button"
                                className="flex h-6 w-6 shrink-0 items-center justify-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                                style={rowActionStyle}
                                title={t('writing.panel.clear')}
                                aria-label={t('writing.panel.clear')}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClear();
                                }}
                            >
                                <i className="fa-solid fa-xmark text-[11px]" />
                            </button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                    <span className="italic" style={mutedStyle}>
                        {t('writing.panel.none_set')}
                    </span>
                    {canUpdate && (
                        <button
                            type="button"
                            className="shrink-0 font-medium hover:underline"
                            style={chooseBtnStyle}
                            onClick={onChoose}
                        >
                            {t('writing.panel.choose')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Panel shell ── */

interface SectionAppearance {
    id: number;
    slug: string;
    title: string;
    label: string | null;
    mentions: number;
}

/**
 * Per-section drilldown modal — Stage 11 Slice 3 Task 4. Fetches
 * section appearances for one canonical scene link and lets the user
 * jump straight to any section that contains it. characterCues and
 * dialogueWords are editor-only and not available server-side, so only
 * the mention count is shown (acceptable middle path per spec).
 */
function SceneLinkDrilldownModal({
    open,
    onClose,
    project,
    work,
    link,
    onSelect,
    t,
}: {
    open: boolean;
    onClose: () => void;
    project: { slug: string };
    work: { slug: string };
    link: ScreenplaySceneLink | null;
    onSelect?: (slug: string) => void;
    t: Translator;
}) {
    const [loading, setLoading] = useState(false);
    const [sections, setSections] = useState<SectionAppearance[]>([]);

    useEffect(() => {
        if (!open || link === null || !link.slug) {
            setSections([]);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        fetch(`/works/${project.slug}/${work.slug}/panel/scene-link/${link.slug}`, {
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Scene-link drilldown fetch failed: ${response.status}`);
                }

                return response.json() as Promise<{ sections: SectionAppearance[] }>;
            })
            .then((payload) => {
                if (!cancelled) {
                    setSections(payload.sections);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSections([]);
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [open, link?.slug, project.slug, work.slug]);

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
            <ModalHeader title={link?.name ?? ''} onClose={onClose} />
            <div className="min-h-[6rem] px-1 py-2">
                {loading && (
                    <p className="px-4 py-6 text-center text-xs" style={hintStyle}>
                        {t('writing.panel.scene_link_loading')}
                    </p>
                )}
                {!loading && sections.length === 0 && (
                    <p className="px-4 py-6 text-center text-xs" style={hintStyle}>
                        {t('writing.panel.scene_link_empty')}
                    </p>
                )}
                {!loading &&
                    sections.map((section) => (
                        <button
                            key={section.id}
                            type="button"
                            className="alex-row flex w-full items-center gap-2.5 px-3 py-2 text-sm"
                            style={{ borderRadius: 'var(--theme-radius-button)' }}
                            onClick={() => {
                                onSelect?.(section.slug);
                                onClose();
                            }}
                        >
                            <span className="min-w-0 flex-1 truncate text-left font-medium">{section.title}</span>
                            {section.label !== null && (
                                <span className="shrink-0 text-[11px]" style={rowSubStyle}>
                                    {section.label}
                                </span>
                            )}
                            <span style={countChipStyle}>
                                {t('writing.panel.scene_mentions').replace(':count', section.mentions.toLocaleString())}
                            </span>
                        </button>
                    ))}
            </div>
        </Modal>
    );
}

function SceneLinksTab({
    project,
    work,
    links,
    onSelect,
    t,
}: {
    project: { slug: string };
    work: { slug: string };
    links: ScreenplaySceneLink[];
    onSelect?: (slug: string) => void;
    t: Translator;
}) {
    const [drilldownLink, setDrilldownLink] = useState<ScreenplaySceneLink | null>(null);

    if (links.length === 0) {
        return (
            <p className="px-4 py-6 text-center text-xs" style={hintStyle}>
                {t('writing.panel.no_scene_links')}
            </p>
        );
    }

    return (
        <>
            <div className="writing-workspace-scroll min-h-0 flex-1 overflow-y-auto px-1 py-2">
                {links.map((link) => {
                    const url =
                        link.slug && link.blueprintSlug
                            ? `/p/${project.slug}/${link.blueprintSlug}/${link.slug}`
                            : null;
                    const canDrill = link.slug !== null && link.slug !== '';

                    return (
                        <div key={link.key}>
                            <div
                                className="alex-row group flex w-full items-center gap-2.5 px-3 py-2 text-sm"
                                style={{ borderRadius: 'var(--theme-radius-button)' }}
                            >
                                <i
                                    className="fa-solid fa-link w-4 shrink-0 text-center text-xs"
                                    style={rowIconStyle}
                                    aria-hidden="true"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-medium">{link.name}</div>
                                    {link.variants.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {link.variants.map((variant) => (
                                                <span
                                                    key={variant.text}
                                                    className="max-w-full truncate px-1.5 py-0.5 text-[11px] font-medium"
                                                    style={countChipStyle}
                                                >
                                                    {variant.text}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {url !== null && (
                                    <a
                                        href={url}
                                        className="flex h-6 w-6 shrink-0 items-center justify-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                                        style={rowActionStyle}
                                        title={t('writing.panel.open_entry')}
                                        aria-label={t('writing.panel.open_entry')}
                                    >
                                        <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                                    </a>
                                )}
                            </div>
                            {canDrill ? (
                                <button
                                    type="button"
                                    className="mx-3 mb-1.5 flex flex-wrap gap-1.5 px-3 pb-2 hover:opacity-80"
                                    onClick={() => setDrilldownLink(link)}
                                    title={link.name}
                                >
                                    <span style={countChipStyle}>
                                        {t('writing.panel.scene_mentions').replace(
                                            ':count',
                                            link.mentions.toLocaleString(),
                                        )}
                                    </span>
                                    {link.characterCues > 0 && (
                                        <span style={countChipStyle}>
                                            {t('writing.panel.scene_cues').replace(
                                                ':count',
                                                link.characterCues.toLocaleString(),
                                            )}
                                        </span>
                                    )}
                                    {link.dialogueWords > 0 && (
                                        <span style={countChipStyle}>
                                            {t('writing.panel.scene_dialogue_words').replace(
                                                ':count',
                                                link.dialogueWords.toLocaleString(),
                                            )}
                                        </span>
                                    )}
                                </button>
                            ) : (
                                <div className="mx-3 mb-1.5 flex flex-wrap gap-1.5 px-3 pb-2">
                                    <span style={countChipStyle}>
                                        {t('writing.panel.scene_mentions').replace(
                                            ':count',
                                            link.mentions.toLocaleString(),
                                        )}
                                    </span>
                                    {link.characterCues > 0 && (
                                        <span style={countChipStyle}>
                                            {t('writing.panel.scene_cues').replace(
                                                ':count',
                                                link.characterCues.toLocaleString(),
                                            )}
                                        </span>
                                    )}
                                    {link.dialogueWords > 0 && (
                                        <span style={countChipStyle}>
                                            {t('writing.panel.scene_dialogue_words').replace(
                                                ':count',
                                                link.dialogueWords.toLocaleString(),
                                            )}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <SceneLinkDrilldownModal
                open={drilldownLink !== null}
                onClose={() => setDrilldownLink(null)}
                project={project}
                work={work}
                link={drilldownLink}
                onSelect={onSelect}
                t={t}
            />
        </>
    );
}

interface BuiltInTab {
    id: string;
    label: string;
    icon: string;
}

export default function ReferencePanel({
    project,
    work,
    currentSection,
    pins,
    canUpdate,
    saveSignal,
    sceneLinks = [],
    sceneLinksFocusSignal = 0,
    activeTab,
    onActiveTabChange,
    onSelect,
}: ReferencePanelProps) {
    const t = useT();
    const [internalActiveTab, setInternalActiveTab] = useState(
        (currentSection?.format ?? work.format) === 'screenplay' ? 'scene-links' : 'browse',
    );
    const lastSceneLinksFocusSignal = useRef(sceneLinksFocusSignal);
    const extraPanels = useSyncExternalStore(subscribeWritingPanels, getWritingPanels);
    const showSceneLinks = (currentSection?.format ?? work.format) === 'screenplay';
    const currentTab = activeTab ?? internalActiveTab;

    function setCurrentTab(tab: string) {
        if (activeTab === undefined) {
            setInternalActiveTab(tab);
        }

        onActiveTabChange?.(tab);
    }

    useEffect(() => {
        if (sceneLinksFocusSignal !== lastSceneLinksFocusSignal.current) {
            lastSceneLinksFocusSignal.current = sceneLinksFocusSignal;

            if (sceneLinksFocusSignal > 0) {
                setCurrentTab('scene-links');
            }
        }
        // setCurrentTab is intentionally local to this render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sceneLinksFocusSignal]);

    useEffect(() => {
        if (!showSceneLinks && currentTab === 'scene-links') {
            setCurrentTab('section');
        }
        // setCurrentTab is intentionally local to this render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTab, showSceneLinks]);

    useEffect(() => {
        if (showSceneLinks && currentTab === 'browse' && sceneLinks.length > 0) {
            setCurrentTab('scene-links');
        }
        // setCurrentTab is intentionally local to this render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTab, sceneLinks.length, showSceneLinks]);

    const builtIns: BuiltInTab[] = [
        { id: 'browse', label: t('writing.panel.browse'), icon: 'fa-solid fa-magnifying-glass' },
        { id: 'pins', label: t('writing.panel.pins'), icon: 'fa-solid fa-thumbtack' },
        { id: 'section', label: t('writing.panel.section'), icon: 'fa-solid fa-paragraph' },
        ...(showSceneLinks
            ? [{ id: 'scene-links', label: t('writing.panel.scene_links'), icon: 'fa-solid fa-link' }]
            : []),
    ];

    const tabs: BuiltInTab[] = [
        ...builtIns,
        ...extraPanels.map((panel) => ({ id: panel.id, label: t(panel.labelKey), icon: panel.icon })),
    ];

    const activeExtra = extraPanels.find((panel) => panel.id === currentTab);
    const panelContext = {
        project,
        work,
        currentSection: currentSection === null
            ? null
            : { id: currentSection.id, title: currentSection.title, slug: currentSection.slug },
    };

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* Tab strip */}
            <div className="flex shrink-0 items-center gap-1 px-2 py-1.5" style={tabStripStyle}>
                {tabs.map((tab) => {
                    const isActive = tab.id === currentTab;

                    return (
                        <Tooltip key={tab.id} content={tab.label}>
                            <button
                                type="button"
                                onClick={() => setCurrentTab(tab.id)}
                                aria-label={tab.label}
                                aria-pressed={isActive}
                                className={`alex-toolbar-btn inline-flex h-8 w-8 items-center justify-center text-sm transition-colors ${isActive ? 'alex-toolbar-btn--active' : ''}`}
                                style={isActive ? tabActiveStyle : tabIdleStyle}
                            >
                                <i className={tab.icon} aria-hidden="true" />
                            </button>
                        </Tooltip>
                    );
                })}
            </div>

            {/* Tab content */}
            {currentTab === 'browse' && (
                <BrowseTab project={project} work={work} canUpdate={canUpdate} t={t} />
            )}
            {currentTab === 'pins' && (
                <PinsTab project={project} work={work} pins={pins} canUpdate={canUpdate} t={t} />
            )}
            {currentTab === 'section' && (
                <SectionTab
                    project={project}
                    work={work}
                    currentSection={currentSection}
                    canUpdate={canUpdate}
                    saveSignal={saveSignal}
                    t={t}
                />
            )}
            {currentTab === 'scene-links' && (
                <SceneLinksTab project={project} work={work} links={sceneLinks} onSelect={onSelect} t={t} />
            )}
            {activeExtra !== undefined && (
                <div className="writing-workspace-scroll min-h-0 flex-1 overflow-y-auto">
                    <activeExtra.component {...panelContext} />
                </div>
            )}
        </div>
    );
}
