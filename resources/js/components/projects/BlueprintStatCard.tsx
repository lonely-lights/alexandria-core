import EntryLink from '@alexandria/components/entries/EntryLink';
import { classificationLabel } from '@alexandria/config/classifications';
import type { DashboardBlueprintCard, RecentRelationshipItem } from '@alexandria/types/projects';

interface BlueprintStatCardProps {
    blueprint: DashboardBlueprintCard;
}

const CLASSIFICATION_BADGES: Record<string, string> = {
    standard: 'badge-primary',
    list: 'badge-ghost',
    structural: 'badge-secondary',
    relationship: 'badge-accent',
};

export default function BlueprintStatCard({ blueprint }: BlueprintStatCardProps) {
    const iconClass = blueprint.icon
        ? (blueprint.icon.includes(' ') ? blueprint.icon : `fa-solid ${blueprint.icon}`)
        : 'fa-solid fa-cube';

    const hasEntries = blueprint.entries_count > 0;
    const isRelationship = blueprint.classification === 'relationship';
    const relationships = blueprint.recent_relationships ?? [];
    const countNoun = isRelationship
        ? (blueprint.entries_count === 1 ? 'relationship' : 'relationships')
        : (blueprint.entries_count === 1 ? 'entry' : 'entries');

    return (
        <div className="paper-board flex flex-col rounded-2xl border border-base-300/50 transition-colors hover:border-base-content/20">
            <div className="flex flex-1 flex-col overflow-hidden bg-base-200" style={{ borderRadius: 'inherit' }}>
            {/* Header — a touch darker than the card frame (base-300 wash)
                so it reads as the "cap" above the lighter entry strip. */}
            <a href={blueprint.url} className="flex items-center gap-3 bg-base-300/40 p-4 transition-colors hover:bg-base-300/60">
                <div className="flex aspect-square w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <i className={`${iconClass} text-primary`} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold">{blueprint.name}</h3>
                        <span className={`badge text-xs py-1.5 px-2 ${CLASSIFICATION_BADGES[blueprint.classification] ?? 'badge-ghost'}`}>
                            {classificationLabel(blueprint.classification)}
                        </span>
                    </div>
                    <p className="text-xs text-base-content/50">
                        {blueprint.entries_count} {countNoun}
                    </p>
                </div>
                <i className="fa-solid fa-chevron-right text-xs text-base-content/30" />
            </a>

            {/* Preview rows — entries for standard/list/structural, or the
                source → target pairs for relationship blueprints. Rows sit
                a touch lighter than the page bg (.bg-row-tint) with base-
                200 hairlines that match the card frame. */}
            {isRelationship ? (
                relationships.length > 0 ? (
                    <div className="flex-1 divide-y divide-base-200 border-t border-base-200 bg-row-tint">
                        {/* Column header inside the body strip — labels the
                            two sides so the source/target structure is
                            explicit at a glance. Picks up a base-300 wash
                            so it reads as a sub-header against the
                            lighter row-tint below. */}
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-base-300/40 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-base-content/50">
                            <span>Source</span>
                            <span className="text-center" aria-hidden="true">→</span>
                            <span>Target</span>
                        </div>
                        {relationships.map((rel) => (
                            <RelationshipRow key={rel.id} rel={rel} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-1 items-center justify-center border-t border-base-200 bg-row-tint py-4">
                        <p className="text-xs italic text-base-content/30">No relationships yet</p>
                    </div>
                )
            ) : blueprint.recent_entries.length > 0 ? (
                <div className="flex-1 divide-y divide-base-200 border-t border-base-200 bg-row-tint">
                    {blueprint.recent_entries.map((entry) =>
                        entry.url ? (
                            <EntryLink
                                key={entry.id}
                                entryId={entry.id}
                                href={entry.url}
                                className="flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-base-300/60"
                            >
                                {entry.thumbnail_url ? (
                                    <img src={entry.thumbnail_url} alt="" className="aspect-square w-6 flex-shrink-0 rounded object-cover" />
                                ) : null}
                                <span className="truncate">{entry.name}</span>
                                {entry.updated_at && (
                                    <span className="ml-auto flex-shrink-0 text-xs text-base-content/40">{entry.updated_at}</span>
                                )}
                            </EntryLink>
                        ) : (
                            <div key={entry.id} className="flex items-center gap-2 px-4 py-2 text-sm text-base-content/50">
                                {entry.thumbnail_url ? (
                                    <img src={entry.thumbnail_url} alt="" className="aspect-square w-6 flex-shrink-0 rounded object-cover" />
                                ) : null}
                                <span className="truncate">{entry.name}</span>
                                {entry.updated_at && (
                                    <span className="ml-auto flex-shrink-0 text-xs text-base-content/40">{entry.updated_at}</span>
                                )}
                            </div>
                        )
                    )}
                </div>
            ) : (
                <div className="flex flex-1 items-center justify-center border-t border-base-200 bg-row-tint py-4">
                    <p className="text-xs italic text-base-content/30">No entries yet</p>
                </div>
            )}

            {/* View all footer (only when entries exist) — a lighter base-
                300 wash than the header, so the card reads heavy → light
                → subtle from top to bottom. */}
            {hasEntries && (
                <a
                    href={blueprint.url}
                    className="mt-auto flex items-center justify-center gap-1 border-t border-base-200 bg-base-300/20 py-2 text-xs text-primary transition-colors hover:bg-primary hover:text-primary-content"
                >
                    View all <i className="fa-solid fa-arrow-right text-[10px]" />
                </a>
            )}
            </div>
        </div>
    );
}

/* ── Relationship Row ── source → target pair, each endpoint linkable
   when the entry has a viewable page. Layout mirrors the body column
   header above so the arrow sits in its own fixed column. */
function RelationshipRow({ rel }: { rel: RecentRelationshipItem }) {
    return (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2 text-sm">
            <RelationshipEndpointCell endpoint={rel.parent} />
            <i className="fa-solid fa-arrow-right-long text-[10px] text-base-content/40" aria-hidden="true" />
            <RelationshipEndpointCell endpoint={rel.child} />
        </div>
    );
}

function RelationshipEndpointCell({ endpoint }: { endpoint: RecentRelationshipItem['parent'] }) {
    if (!endpoint) {
        return <span className="truncate italic text-base-content/30">Deleted</span>;
    }
    const typeIcon = endpoint.type_icon
        ? (endpoint.type_icon.includes(' ') ? endpoint.type_icon : `fa-solid ${endpoint.type_icon}`)
        : 'fa-solid fa-cube';
    const inner = (
        <>
            <i className={`${typeIcon} flex-shrink-0 text-xs text-base-content/40`} />
            <span className="min-w-0 truncate">{endpoint.name}</span>
        </>
    );
    return endpoint.url ? (
        <a href={endpoint.url} className="flex min-w-0 items-center gap-1.5 transition-colors hover:text-primary">
            {inner}
        </a>
    ) : (
        <span className="flex min-w-0 items-center gap-1.5 text-base-content/50">{inner}</span>
    );
}
