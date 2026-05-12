import type { CSSProperties } from 'react';
import EntryLink from '@alexandria/components/entries/EntryLink';
import useT from '@alexandria/hooks/useT';
import { classificationLabel } from '@alexandria/config/classifications';
import type { DashboardBlueprintCard, RecentRelationshipItem } from '@alexandria/types/projects';

interface BlueprintStatCardProps {
    blueprint: DashboardBlueprintCard;
}

/* ── Theme styles ── */

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };

// Card surfaces use the --theme-base-* ramp directly instead of
// base-content overlays — matches legacy's bg-base-200 / bg-base-300/40
// pattern and reads correctly on the paper themes (where base-200 is
// a specific warm cream, not just "ink at low opacity"). The previous
// content-overlay approach produced a colder, ink-tinted wash that
// felt foreign against the paper backdrop.
//
// `paper-board` (tf themes only) draws a bottom-right tape shadow via
// ::before with `border-color: transparent !important` forcing the
// outer border invisible. We don't set our own border on the outer
// here — let paper-board own the visual edge treatment so we don't
// double up.
const cardOuterStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-card)',
    transition: 'border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

const cardInnerStyle: CSSProperties = {
    background: 'var(--theme-base-200)',
    borderRadius: 'inherit',
};

const cardHeaderStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-300) 40%, transparent)',
    transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

const iconWrapStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)',
    color: 'var(--theme-brand-primary-500)',
    borderRadius: 'var(--theme-radius-input)',
};

const rowBodyStyle: CSSProperties = {
    borderTop: '1px solid var(--theme-base-200)',
};

const rowDividerStyle: CSSProperties = {
    borderBottom: '1px solid var(--theme-base-200)',
};

const relationshipSubHeaderStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-300) 40%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const entryRowStyle: CSSProperties = {
    transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

const footerLinkStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-300) 20%, transparent)',
    color: 'var(--theme-brand-primary-500)',
    borderTop: '1px solid var(--theme-base-200)',
    transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

const CLASSIFICATION_BADGE: Record<string, CSSProperties> = {
    standard: {
        background: 'var(--theme-brand-primary-500)',
        color: 'var(--theme-brand-primary-content)',
        borderRadius: 'var(--theme-radius-badge)',
    },
    list: {
        background: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
        color: 'var(--theme-base-content)',
        borderRadius: 'var(--theme-radius-badge)',
    },
    structural: {
        background: 'var(--theme-brand-secondary-500)',
        color: 'var(--theme-brand-secondary-content)',
        borderRadius: 'var(--theme-radius-badge)',
    },
    relationship: {
        background: 'var(--theme-brand-secondary-700)',
        color: 'var(--theme-brand-secondary-content)',
        borderRadius: 'var(--theme-radius-badge)',
    },
};

const NEUTRAL_BADGE: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-badge)',
};

export default function BlueprintStatCard({ blueprint }: BlueprintStatCardProps) {
    const t = useT();
    const iconClass = blueprint.icon
        ? (blueprint.icon.includes(' ') ? blueprint.icon : `fa-solid ${blueprint.icon}`)
        : 'fa-solid fa-cube';

    const hasEntries = blueprint.entries_count > 0;
    const isRelationship = blueprint.classification === 'relationship';
    const relationships = blueprint.recent_relationships ?? [];
    const countNoun = isRelationship
        ? (blueprint.entries_count === 1
            ? t('projects.blueprint_card.count.relationship.singular')
            : t('projects.blueprint_card.count.relationship.plural'))
        : (blueprint.entries_count === 1
            ? t('projects.blueprint_card.count.entry.singular')
            : t('projects.blueprint_card.count.entry.plural'));

    const badgeStyle = CLASSIFICATION_BADGE[blueprint.classification] ?? NEUTRAL_BADGE;

    return (
        <div className="paper-board flex flex-col" style={cardOuterStyle}>
            <div className="flex flex-1 flex-col overflow-hidden" style={cardInnerStyle}>
                {/* Header */}
                <a href={blueprint.url} className="flex items-center gap-3 p-4" style={cardHeaderStyle}>
                    <div className="flex aspect-square w-10 flex-shrink-0 items-center justify-center" style={iconWrapStyle}>
                        <i className={iconClass} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="truncate font-semibold">{blueprint.name}</h3>
                            <span className="text-xs py-0.5 px-2" style={badgeStyle}>
                                {classificationLabel(blueprint.classification)}
                            </span>
                        </div>
                        <p className="text-xs" style={labelText}>
                            {blueprint.entries_count} {countNoun}
                        </p>
                    </div>
                    <i className="fa-solid fa-chevron-right text-xs" style={microText} aria-hidden="true" />
                </a>

                {/* Preview rows */}
                {isRelationship ? (
                    relationships.length > 0 ? (
                        <div className="flex-1 bg-row-tint" style={rowBodyStyle}>
                            <div
                                className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                                style={relationshipSubHeaderStyle}
                            >
                                <span>{t('projects.blueprint_card.relationship.source')}</span>
                                <span className="text-center" aria-hidden="true">→</span>
                                <span>{t('projects.blueprint_card.relationship.target')}</span>
                            </div>
                            {relationships.map((rel, i, arr) => (
                                <div key={rel.id} style={i === arr.length - 1 ? undefined : rowDividerStyle}>
                                    <RelationshipRow rel={rel} t={t} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-1 items-center justify-center bg-row-tint py-4" style={rowBodyStyle}>
                            <p className="text-xs italic" style={microText}>
                                {t('projects.blueprint_card.relationship.empty')}
                            </p>
                        </div>
                    )
                ) : blueprint.recent_entries.length > 0 ? (
                    <div className="flex-1 bg-row-tint" style={rowBodyStyle}>
                        {blueprint.recent_entries.map((entry, i, arr) => {
                            const divider = i === arr.length - 1 ? undefined : rowDividerStyle;
                            return entry.url ? (
                                <EntryLink
                                    key={entry.id}
                                    entryId={entry.id}
                                    href={entry.url}
                                    className="alex-notes-tag-row flex items-center gap-2 px-4 py-1.5 text-sm"
                                    style={{ ...entryRowStyle, ...(divider ?? {}) }}
                                >
                                    {entry.thumbnail_url ? (
                                        <img src={entry.thumbnail_url} alt="" className="aspect-square w-6 flex-shrink-0 rounded object-cover" />
                                    ) : null}
                                    <span className="truncate">{entry.name}</span>
                                    {entry.updated_at && (
                                        <span className="ml-auto flex-shrink-0 text-xs" style={fadedText}>{entry.updated_at}</span>
                                    )}
                                </EntryLink>
                            ) : (
                                <div
                                    key={entry.id}
                                    className="flex items-center gap-2 px-4 py-2 text-sm"
                                    style={{ ...labelText, ...(divider ?? {}) }}
                                >
                                    {entry.thumbnail_url ? (
                                        <img src={entry.thumbnail_url} alt="" className="aspect-square w-6 flex-shrink-0 rounded object-cover" />
                                    ) : null}
                                    <span className="truncate">{entry.name}</span>
                                    {entry.updated_at && (
                                        <span className="ml-auto flex-shrink-0 text-xs" style={fadedText}>{entry.updated_at}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-1 items-center justify-center bg-row-tint py-4" style={rowBodyStyle}>
                        <p className="text-xs italic" style={microText}>
                            {t('projects.blueprint_card.entries.empty')}
                        </p>
                    </div>
                )}

                {/* View all footer */}
                {hasEntries && (
                    <a
                        href={blueprint.url}
                        className="alex-notes-tag-row mt-auto flex items-center justify-center gap-1 py-2 text-xs"
                        style={footerLinkStyle}
                    >
                        {t('projects.blueprint_card.view_all')}{' '}
                        <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true" />
                    </a>
                )}
            </div>
        </div>
    );
}

/* ── Relationship Row ── */

function RelationshipRow({ rel, t }: { rel: RecentRelationshipItem; t: ReturnType<typeof useT> }) {
    return (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2 text-sm">
            <RelationshipEndpointCell endpoint={rel.parent} t={t} />
            <i className="fa-solid fa-arrow-right-long text-[10px]" style={fadedText} aria-hidden="true" />
            <RelationshipEndpointCell endpoint={rel.child} t={t} />
        </div>
    );
}

function RelationshipEndpointCell({ endpoint, t }: { endpoint: RecentRelationshipItem['parent']; t: ReturnType<typeof useT> }) {
    if (!endpoint) {
        return (
            <span className="truncate italic" style={microText}>
                {t('projects.blueprint_card.relationship.deleted')}
            </span>
        );
    }
    const typeIcon = endpoint.type_icon
        ? (endpoint.type_icon.includes(' ') ? endpoint.type_icon : `fa-solid ${endpoint.type_icon}`)
        : 'fa-solid fa-cube';
    const inner = (
        <>
            <i className={`${typeIcon} flex-shrink-0 text-xs`} style={fadedText} aria-hidden="true" />
            <span className="min-w-0 truncate">{endpoint.name}</span>
        </>
    );
    return endpoint.url ? (
        <a
            href={endpoint.url}
            className="flex min-w-0 items-center gap-1.5"
            style={{ transition: 'color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)' }}
        >
            {inner}
        </a>
    ) : (
        <span className="flex min-w-0 items-center gap-1.5" style={labelText}>{inner}</span>
    );
}
