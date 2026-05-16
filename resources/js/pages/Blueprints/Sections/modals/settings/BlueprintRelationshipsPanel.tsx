import { useState } from "react";

import useT from "@alexandria/hooks/useT";
import type {
    BlueprintDetail,
    SiblingBlueprint,
} from "@alexandria/types/blueprints";

import {
    addFieldBtnStyle,
    badgeGhostStyle,
    badgeSuccessStyle,
    fadedIconStyle,
    helperFainterStyle,
    helperSoftStyle,
    helperStyle,
    relCardActiveStyle,
    relCardIconWrapIdleStyle,
    relCardIconWrapStyle,
    relCardIdleStyle,
} from "./settingsPanelStyles";

/**
 * Relationships panel — surfaces which relationship blueprints currently
 * connect to this blueprint, plus a collapsible list of unused ones the
 * user could wire up next.
 */
export default function BlueprintRelationshipsPanel({
    blueprint,
    relationshipBlueprints,
    referencingRelationshipBlueprints,
}: {
    blueprint: BlueprintDetail;
    relationshipBlueprints: SiblingBlueprint[];
    referencingRelationshipBlueprints: SiblingBlueprint[];
}) {
    const t = useT();
    const [showUnused, setShowUnused] = useState(false);

    const connected = referencingRelationshipBlueprints;
    const connectedIds = new Set(connected.map((r) => r.id));
    const unused = relationshipBlueprints.filter(
        (r) => !connectedIds.has(r.id),
    );

    // Derive project slug from the current URL.
    // typeof check guards SSR — `window` doesn't exist in Node.js
    // when Inertia renders the page server-side. The slug is only
    // used to build link hrefs (rendered as plain anchors); empty
    // is harmless during SSR since no one clicks links in the
    // server-rendered HTML.
    const projectSlug =
        typeof window !== "undefined"
            ? (window.location.pathname.split("/")[2] ?? "")
            : "";

    function RelCard({
        rb,
        isActive,
    }: {
        rb: SiblingBlueprint;
        isActive: boolean;
    }) {
        const icon = rb.icon
            ? rb.icon.includes(" ")
                ? rb.icon
                : `fa-solid ${rb.icon}`
            : "fa-solid fa-diagram-project";
        return (
            <div
                className="flex items-center gap-3 px-4 py-3"
                style={isActive ? relCardActiveStyle : relCardIdleStyle}
            >
                <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center"
                    style={
                        isActive
                            ? relCardIconWrapStyle
                            : relCardIconWrapIdleStyle
                    }
                >
                    <i
                        className={`${icon} text-sm`}
                        style={
                            isActive ? { color: "#f43f5e" } : helperSoftStyle
                        }
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <a
                        href={`/p/${projectSlug}/${rb.slug}`}
                        className="text-sm font-medium hover:underline"
                        style={isActive ? undefined : helperStyle}
                    >
                        {rb.name}
                    </a>
                </div>
                {isActive ? (
                    <span style={badgeSuccessStyle}>
                        {t("blueprints.bp_settings.relationships.active")}
                    </span>
                ) : (
                    <span style={badgeGhostStyle}>
                        {t("blueprints.bp_settings.relationships.unused")}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="p-5">
            <p className="mb-4 text-xs" style={helperStyle}>
                {t("blueprints.bp_settings.relationships.intro").replace(
                    ":blueprint",
                    blueprint.name,
                )}
            </p>

            {connected.length === 0 && unused.length === 0 ? (
                <div className="py-8 text-center">
                    <i
                        className="fa-solid fa-diagram-project mb-3 text-3xl"
                        style={fadedIconStyle}
                    />
                    <p className="font-medium" style={helperStyle}>
                        {t("blueprints.bp_settings.relationships.empty.title")}
                    </p>
                    <p className="mt-1 text-sm" style={helperSoftStyle}>
                        {t("blueprints.bp_settings.relationships.empty.hint")}
                    </p>
                </div>
            ) : (
                <>
                    {/* Active relationships */}
                    {connected.length > 0 ? (
                        <div className="space-y-2">
                            {connected.map((rb) => (
                                <RelCard key={rb.id} rb={rb} isActive />
                            ))}
                        </div>
                    ) : (
                        <p
                            className="py-3 text-center text-sm italic"
                            style={helperSoftStyle}
                        >
                            {t(
                                "blueprints.bp_settings.relationships.empty.active",
                            ).replace(":blueprint", blueprint.name)}
                        </p>
                    )}

                    {/* Unused relationships (collapsed) */}
                    {unused.length > 0 && (
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={() => setShowUnused(!showUnused)}
                                className="flex items-center gap-2 text-xs transition-colors"
                                style={helperFainterStyle}
                            >
                                <i
                                    className={`fa-solid fa-chevron-right text-[10px] transition-transform ${showUnused ? "rotate-90" : ""}`}
                                />
                                {t(
                                    unused.length === 1
                                        ? "blueprints.bp_settings.relationships.unused_count.singular"
                                        : "blueprints.bp_settings.relationships.unused_count.plural",
                                ).replace(":count", String(unused.length))}
                            </button>
                            {showUnused && (
                                <div className="mt-2 space-y-2">
                                    {unused.map((rb) => (
                                        <RelCard
                                            key={rb.id}
                                            rb={rb}
                                            isActive={false}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Create new */}
            <button
                type="button"
                className="alex-row mt-4 flex w-full items-center justify-center gap-2 py-2.5 text-xs"
                style={addFieldBtnStyle}
                onClick={() => {
                    /* TODO: create relationship blueprint */
                }}
            >
                <i className="fa-solid fa-plus" />{" "}
                {t("blueprints.bp_settings.relationships.create")}
            </button>
        </div>
    );
}
