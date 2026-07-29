import { Link } from "@inertiajs/react";
import type { CSSProperties } from "react";

import type { Translator } from "@alexandria/hooks/useT";

import type { WorkLengthPlan } from "./WorkSettingsModal";

/**
 * WorkCard — a single work row shared by the project works index
 * (Writing/Index) and the global writing dashboard (Writing/Dashboard).
 * Extracted from Index.tsx in Plan 3 Task 5 with zero visual change.
 *
 * Surface, border, radius, and hover shadow come from the shared
 * `.alex-dash-row` class (components/dashboard.css) — :hover can't be
 * expressed inline, and the class keeps the treatment consistent with
 * the dashboard's project rows.
 */

export interface WorkRow {
    id: number;
    title: string;
    slug: string;
    type: string;
    status: string;
    logline: string | null;
    word_count: number;
    /** Optional — the global Dashboard payload doesn't carry these. */
    line_count?: number;
    length_plan?: WorkLengthPlan | null;
    target_words: number | null;
    sections_count: number;
    updated_at: string | null;
    /** Franchise breadcrumb (root-first ancestor names joined with ' › '), null for standalone works. */
    group?: string | null;
    /** Optional — the global Dashboard payload doesn't carry these. */
    entry_id?: number | null;
    linked_entry?: {
        id: number;
        name: string;
        /** Present on project-dashboard rows for active-structure scoping. */
        blueprint_id?: number;
        /** Archived entries leave the tree — their works count as unplaced. */
        archived?: boolean;
    } | null;
}

/* ── Theme styles ── */

const mutedText: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
};

const metaText: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

const workCardStyle: CSSProperties = {
    display: "block",
    color: "var(--theme-base-content)",
    padding: "1.25rem",
    textDecoration: "none",
};

const statusChipStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
    borderRadius: "var(--theme-radius-badge)",
    padding: "0.125rem 0.5rem",
    fontSize: "0.6875rem",
    fontWeight: 600,
    lineHeight: 1.5,
    whiteSpace: "nowrap",
};

const typeLabelStyle: CSSProperties = {
    color: "var(--theme-brand-primary-500)",
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
};

const placementChipStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-accent-500) 11%, transparent)",
    color: "var(--theme-brand-accent-500)",
    border: "1px solid color-mix(in srgb, var(--theme-brand-accent-500) 20%, transparent)",
    borderRadius: "var(--theme-radius-badge)",
};

const emptyPlacementChipStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
    color: "color-mix(in srgb, var(--theme-base-content) 58%, transparent)",
    border: "1px dashed color-mix(in srgb, var(--theme-base-content) 22%, transparent)",
    borderRadius: "var(--theme-radius-badge)",
};

export default function WorkCard({
    work,
    projectSlug,
    t,
    onSettings,
    compact = false,
}: {
    work: WorkRow;
    projectSlug: string;
    t: Translator;
    /** Opens work settings from the gear and compact placement control. */
    onSettings?: () => void;
    /** Condensed treatment for the project writing dashboard's narrow works rail. */
    compact?: boolean;
}) {
    const wordCount =
        work.target_words !== null
            ? `${t("writing.index.words").replace(":count", work.word_count.toLocaleString())} ${t("writing.workspace.of_target").replace(":target", work.target_words.toLocaleString())}`
            : t("writing.index.words").replace(
                  ":count",
                  work.word_count.toLocaleString(),
              );

    return (
        <Link
            href={`/works/${projectSlug}/${work.slug}`}
            className="alex-dash-row group relative"
            style={{
                ...workCardStyle,
                padding: compact
                    ? "0.875rem 2.5rem 0.875rem 1rem"
                    : workCardStyle.padding,
            }}
            data-compact={compact ? "true" : undefined}
        >
            {onSettings && (
                <button
                    type="button"
                    className={`absolute flex items-center justify-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 ${
                        compact
                            ? "right-2.5 top-2.5 h-6 w-6"
                            : "right-3 top-3 h-7 w-7"
                    }`}
                    style={{
                        color: "color-mix(in srgb, var(--theme-base-content) 55%, transparent)",
                        borderRadius: "var(--theme-radius-button)",
                    }}
                    title={t("writing.settings.title")}
                    aria-label={t("writing.settings.title")}
                    onClick={(e) => {
                        // The whole card is a Link — keep the gear from
                        // navigating into the workspace.
                        e.preventDefault();
                        e.stopPropagation();
                        onSettings();
                    }}
                >
                    <i
                        className="fa-solid fa-gear text-xs"
                        aria-hidden="true"
                    />
                </button>
            )}
            <div
                className={`flex flex-wrap items-center gap-y-1 ${compact ? "gap-x-2" : "gap-x-3"}`}
            >
                <span style={typeLabelStyle}>
                    {t(`writing.types.${work.type}`, work.type)}
                </span>
                <span style={statusChipStyle}>
                    {t(`writing.statuses.${work.status}`, work.status)}
                </span>
            </div>
            <h2
                className={`alex-dash-row-title mt-1.5 font-bold ${compact ? "truncate text-base" : "text-lg"}`}
            >
                {work.title}
            </h2>
            {compact &&
                (onSettings ? (
                    <button
                        type="button"
                        className="mt-2 flex max-w-full items-center gap-1.5 px-2 py-1 text-[0.6875rem] font-semibold leading-none transition-opacity hover:opacity-80"
                        style={
                            work.linked_entry
                                ? placementChipStyle
                                : emptyPlacementChipStyle
                        }
                        title={t("writing.settings.edit_placement")}
                        aria-label={`${t("writing.settings.edit_placement")}: ${
                            work.linked_entry?.name ??
                            t("writing.settings.place_in_structure")
                        }`}
                        data-writing-placement
                        data-linked={work.linked_entry ? "true" : "false"}
                        onClick={(e) => {
                            // The whole card is a Link — open placement
                            // settings without entering the workspace.
                            e.preventDefault();
                            e.stopPropagation();
                            onSettings();
                        }}
                    >
                        <i
                            className={`fa-solid ${
                                work.linked_entry ? "fa-sitemap" : "fa-plus"
                            } text-[9px]`}
                            aria-hidden="true"
                        />
                        <span className="truncate">
                            {work.linked_entry?.name ??
                                t("writing.settings.place_in_structure")}
                        </span>
                        <i
                            className="fa-solid fa-pen ml-0.5 text-[8px] opacity-60"
                            aria-hidden="true"
                        />
                    </button>
                ) : work.linked_entry ? (
                    <span
                        className="mt-2 flex w-fit max-w-full items-center gap-1.5 px-2 py-1 text-[0.6875rem] font-semibold leading-none"
                        style={placementChipStyle}
                        data-writing-placement
                        data-linked="true"
                    >
                        <i
                            className="fa-solid fa-sitemap text-[9px]"
                            aria-hidden="true"
                        />
                        <span className="truncate">
                            {work.linked_entry.name}
                        </span>
                    </span>
                ) : null)}
            {work.logline && (
                <p
                    className={`mt-1 text-sm ${compact ? "line-clamp-2 leading-5" : ""}`}
                    style={mutedText}
                >
                    {work.logline}
                </p>
            )}
            <div
                className={`flex flex-wrap items-center gap-x-2 text-xs ${compact ? "mt-2" : "mt-3"}`}
                style={metaText}
            >
                <span>{wordCount}</span>
                <span aria-hidden="true">·</span>
                <span>
                    {t("writing.index.sections").replace(
                        ":count",
                        work.sections_count.toLocaleString(),
                    )}
                </span>
                {work.updated_at && !compact && (
                    <>
                        <span aria-hidden="true">·</span>
                        <span>
                            {t("writing.index.updated").replace(
                                ":date",
                                new Date(work.updated_at).toLocaleDateString(),
                            )}
                        </span>
                    </>
                )}
            </div>
        </Link>
    );
}
