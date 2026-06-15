import { useState, type CSSProperties, type ReactNode } from 'react';
import useT from '@alexandria/hooks/useT';
import EntryLink from '@alexandria/components/entries/EntryLink';
import MentionAwareContent from '@alexandria/components/ui/MentionAwareContent';
import type {
    InfoboxBlock,
    InfoboxHierarchyBlock,
    InfoboxHierarchyEntry,
    InfoboxItem,
    InfoboxRelationshipItem,
    InfoboxRelationshipsBlock,
} from '@alexandria/types/entries';

interface InfoboxProps {
    blocks: InfoboxBlock[];
    entryName: string;
}

/* ── Theme tokens ──
   The infobox panel paints against the secondary brand color — the entry's
   identity panel relative to base chrome. Children tint the content color at
   varying strengths via color-mix. Section pills invert (content as fill,
   brand-secondary as text). */

const PANEL_BG = 'var(--theme-brand-secondary-500)';
const CONTENT = 'var(--theme-brand-secondary-content)';
const tintContent = (pct: number) =>
    `color-mix(in srgb, ${CONTENT} ${pct}%, transparent)`;

const PILL_STYLE: CSSProperties = {
    background: tintContent(90),
    color: PANEL_BG,
};

/* ── Component ── */

export default function Infobox({ blocks, entryName }: InfoboxProps) {
    if (blocks.length === 0) {
        return null;
    }

    // Tint the paper-board drop-shadow with a darker secondary so the
    // infobox shadow relates to its own fill color.
    const wrapperStyle = {
        '--paper-board-shadow-color': `color-mix(in srgb, ${PANEL_BG} 55%, #000 45%)`,
        borderRadius: 'var(--theme-radius-card)',
    } as CSSProperties;

    const panelStyle: CSSProperties = {
        background: PANEL_BG,
        color: CONTENT,
        borderRadius: 'inherit',
    };

    const headerStyle: CSSProperties = {
        borderBottom: `1px solid ${tintContent(15)}`,
    };

    return (
        <div className="paper-board" style={wrapperStyle}>
            <div className="overflow-hidden" style={panelStyle}>
                {/* Entry name */}
                <div className="px-4 py-4 text-center" style={headerStyle}>
                    <h2 className="text-lg font-bold tracking-tight">{entryName}</h2>
                </div>

                {/* Blocks */}
                <div className="space-y-2 p-4">
                    {blocks.map((block, i) => (
                        <InfoboxBlockRenderer key={i} block={block} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function InfoboxBlockRenderer({ block }: { block: InfoboxBlock }) {
    switch (block.type) {
        case 'header':
            return <SectionPill text={block.data.text} />;
        case 'attribute':
            return <LabeledItemsBlock data={block.data} />;
        case 'relationships':
            return <RelationshipsBlock data={block.data} />;
        case 'hierarchy':
            return <HierarchyBlock data={block.data} />;
        case 'mentioned_in':
            return <LabeledItemsBlock data={block.data} />;
    }
}

/* ── Section Pill (shared header style) ── */

function SectionPill({ text }: { text: string }) {
    return (
        <div className="pt-2">
            <h3
                className="mx-3 rounded-full py-1.5 text-center text-xs font-semibold uppercase"
                style={PILL_STYLE}
            >
                {text}
            </h3>
        </div>
    );
}

/* ── Show More Button (shared expand/collapse) ──
   Idle/hover color lives in ui-polish.css (.alex-infobox-expander) so the
   :hover transition between the two states can animate via CSS. */

function ShowMoreButton({ hiddenCount, expanded, onToggle }: { hiddenCount: number; expanded: boolean; onToggle: () => void }) {
    const t = useT();
    return (
        <div className="mb-4 mt-2">
            <button
                onClick={onToggle}
                className="group alex-infobox-expander flex w-full items-center gap-2"
            >
                <div className="h-px flex-grow bg-current" />
                <div
                    className="rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wider transition-transform group-hover:scale-105"
                    style={PILL_STYLE}
                >
                    {expanded
                        ? t('entries.infobox.show_less')
                        : t('entries.infobox.show_more').replace(':count', String(hiddenCount))}
                </div>
                <div className="h-px flex-grow bg-current" />
            </button>
        </div>
    );
}

/* ── Collapse wrapper (shared) ───────────────────────────────────────
   Uses the grid-template-rows 0fr → 1fr trick so the wrapper can animate
   to the natural height of its children without needing to know that
   height up front. The inner div owns overflow:hidden so content gets
   clipped cleanly while the row is mid-animation. */

function CollapseWrap({ open, children }: { open: boolean; children: ReactNode }) {
    return (
        <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
        >
            <div className="min-h-0 overflow-hidden">{children}</div>
        </div>
    );
}

/* ── Labeled Items Block (shared by Attribute and Mentioned In) ── */

function LabeledItemsBlock({ data }: { data: { label: string; items: InfoboxItem[]; limit_enabled: boolean; visible_limit: number } }) {
    const [expanded, setExpanded] = useState(false);
    const { items, limit_enabled, visible_limit, label } = data;

    const hiddenCount = items.length - visible_limit;
    const showExpander = limit_enabled && hiddenCount > 0;
    const visibleItems = limit_enabled ? items.slice(0, visible_limit) : items;
    const hiddenItems = limit_enabled ? items.slice(visible_limit) : [];

    return (
        <div>
            <div className="flex gap-x-4">
                <div
                    className="w-[38.2%] flex-shrink-0 text-sm leading-5 font-medium"
                    style={{ color: tintContent(70) }}
                >
                    {label}
                </div>
                <div className="w-[61.8%] text-sm leading-5">
                    {visibleItems.map((item, j) => (
                        <div key={j}>
                            <InfoboxEntryLink item={item} />
                        </div>
                    ))}
                    {hiddenItems.length > 0 && (
                        <CollapseWrap open={expanded}>
                            {hiddenItems.map((item, j) => (
                                <div key={j}>
                                    <InfoboxEntryLink item={item} />
                                </div>
                            ))}
                        </CollapseWrap>
                    )}
                </div>
            </div>

            {showExpander && (
                <ShowMoreButton hiddenCount={hiddenCount} expanded={expanded} onToggle={() => setExpanded(!expanded)} />
            )}
        </div>
    );
}

/* ── Relationships ── */

function RelationshipsBlock({ data }: { data: InfoboxRelationshipsBlock['data'] }) {
    const [expanded, setExpanded] = useState(false);
    const { items, limit_enabled, visible_limit, header } = data;

    const hiddenCount = items.length - visible_limit;
    const showExpander = limit_enabled && hiddenCount > 0;
    const visibleItems = limit_enabled ? items.slice(0, visible_limit) : items;
    const hiddenItems = limit_enabled ? items.slice(visible_limit) : [];

    return (
        <div>
            <SectionPill text={header} />

            <div className="mt-1">
                {visibleItems.map((item, j) => (
                    <RelationshipRow key={j} item={item} />
                ))}
                {hiddenItems.length > 0 && (
                    <CollapseWrap open={expanded}>
                        {hiddenItems.map((item, j) => (
                            <RelationshipRow key={j} item={item} />
                        ))}
                    </CollapseWrap>
                )}
            </div>

            {showExpander && (
                <div className="mt-4">
                    <ShowMoreButton hiddenCount={hiddenCount} expanded={expanded} onToggle={() => setExpanded(!expanded)} />
                </div>
            )}
        </div>
    );
}

function RelationshipRow({ item }: { item: InfoboxRelationshipItem }) {
    // `.alex-infobox-row` + child `.alex-infobox-subtitle` together drive
    // the parent-hover brighten effect (see ui-polish.css). Inline styles
    // can't express group-hover, so the colors live in the stylesheet.
    return (
        <div className="alex-infobox-row mt-2 flex gap-x-4">
            <div
                className="w-[38.2%] flex-shrink-0 text-sm leading-5 font-medium"
                style={{ color: tintContent(70) }}
            >
                {item.show_label && item.label}
            </div>
            <div className="w-[61.8%] text-sm leading-5">
                {item.entry.url ? (
                    <EntryLink
                        entryId={item.entry.id}
                        href={item.entry.url}
                        className="font-medium transition hover:underline"
                        style={{ color: CONTENT }}
                    >
                        {item.entry.name}
                    </EntryLink>
                ) : (
                    <span className="font-medium">{item.entry.name}</span>
                )}
                {item.subtitle_html && (
                    <MentionAwareContent
                        html={item.subtitle_html}
                        className="alex-infobox-subtitle text-[10px]"
                    />
                )}
            </div>
        </div>
    );
}

/* ── Hierarchy ── */

function HierarchyBlock({ data }: { data: InfoboxHierarchyBlock['data'] }) {
    const t = useT();
    const [expanded, setExpanded] = useState(false);
    const { parent, children, children_total, limit_enabled, visible_limit } = data;

    const hiddenCount = children_total - visible_limit;
    const showExpander = limit_enabled && hiddenCount > 0;
    const visibleChildren = limit_enabled ? children.slice(0, visible_limit) : children;
    const hiddenChildren = limit_enabled ? children.slice(visible_limit) : [];

    const labelStyle: CSSProperties = { color: tintContent(70) };

    return (
        <div>
            <SectionPill text={t('entries.infobox.hierarchy')} />

            <div className="mt-1">
                {/* Parent */}
                {parent && (
                    <div className="mt-2 flex gap-x-4">
                        <div
                            className="w-[38.2%] flex-shrink-0 text-sm leading-5 font-medium"
                            style={labelStyle}
                        >
                            {t('entries.infobox.parent')}
                        </div>
                        <div className="w-[61.8%] text-sm leading-5">
                            <InfoboxHierarchyLink entry={parent} />
                        </div>
                    </div>
                )}

                {/* Children */}
                {children.length > 0 && (
                    <div className="mt-2 flex gap-x-4">
                        <div
                            className="w-[38.2%] flex-shrink-0 text-sm leading-5 font-medium"
                            style={labelStyle}
                        >
                            {t(children_total === 1 ? 'entries.infobox.child.singular' : 'entries.infobox.child.plural')}
                        </div>
                        <div className="w-[61.8%] space-y-1 text-sm leading-5">
                            {visibleChildren.map((child, j) => (
                                <div key={j}>
                                    <InfoboxHierarchyLink entry={child} />
                                </div>
                            ))}
                            {hiddenChildren.length > 0 && (
                                <CollapseWrap open={expanded}>
                                    <div className="space-y-1">
                                        {hiddenChildren.map((child, j) => (
                                            <div key={j}>
                                                <InfoboxHierarchyLink entry={child} />
                                            </div>
                                        ))}
                                    </div>
                                </CollapseWrap>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showExpander && (
                <div className="mt-4">
                    <ShowMoreButton hiddenCount={hiddenCount} expanded={expanded} onToggle={() => setExpanded(!expanded)} />
                </div>
            )}
        </div>
    );
}

/* ── Shared link components ── */

function InfoboxEntryLink({ item }: { item: InfoboxItem }) {
    if (item.url && item.entry_id) {
        return (
            <EntryLink
                entryId={item.entry_id}
                href={item.url}
                className="text-sm leading-5 transition hover:underline"
                style={{ color: CONTENT }}
            >
                {item.text}
            </EntryLink>
        );
    }
    if (item.url) {
        return (
            <a
                href={item.url}
                className="text-sm leading-5 transition hover:underline"
                style={{ color: CONTENT }}
            >
                {item.text}
            </a>
        );
    }
    return <span className="text-sm leading-5">{item.text}</span>;
}

function InfoboxHierarchyLink({ entry }: { entry: InfoboxHierarchyEntry }) {
    return (
        <span>
            {entry.url ? (
                <EntryLink
                    entryId={entry.id}
                    href={entry.url}
                    className="text-sm leading-5 font-medium transition hover:underline"
                    style={{ color: CONTENT }}
                >
                    {entry.name}
                </EntryLink>
            ) : (
                <span className="text-sm leading-5 font-medium">{entry.name}</span>
            )}
            {entry.type_name && (
                <span className="ml-1 text-[10px]" style={{ color: tintContent(60) }}>
                    ({entry.type_name})
                </span>
            )}
        </span>
    );
}
