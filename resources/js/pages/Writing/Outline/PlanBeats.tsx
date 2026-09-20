import { useEffect, useState, type CSSProperties } from "react";
import useT from "@alexandria/hooks/useT";
import { worksBase } from "@alexandria/lib/urls";
import type { OutlineBeat } from "./outlineTypes";

export function planCollapsed(beats: OutlineBeat[]): boolean {
    return beats.length > 0 && beats.every((beat) => beat.done);
}

function csrfToken(): string {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? ""
    );
}

function apiHeaders(withBody = false): HeadersInit {
    const headers: Record<string, string> = {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-TOKEN": csrfToken(),
    };

    if (withBody) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}

const beatsWrapStyle: CSSProperties = {
    marginTop: "0.625rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
};

const beatRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
};

function beatCheckStyle(done: boolean, canUpdate: boolean): CSSProperties {
    return {
        width: "0.8125rem",
        height: "0.8125rem",
        borderRadius: "999px",
        border: `1.5px solid ${done ? "var(--theme-brand-primary-500)" : "color-mix(in srgb, var(--theme-base-content) 35%, transparent)"}`,
        background: done ? "var(--theme-brand-primary-500)" : "transparent",
        cursor: canUpdate ? "pointer" : "default",
        flexShrink: 0,
        padding: 0,
    };
}

function beatTextStyle(done: boolean): CSSProperties {
    return {
        fontSize: "0.8125rem",
        color: done
            ? "color-mix(in srgb, var(--theme-base-content) 40%, transparent)"
            : "color-mix(in srgb, var(--theme-base-content) 80%, transparent)",
        textDecoration: done ? "line-through" : "none",
        flex: 1,
    };
}

const collapsedLineStyle: CSSProperties = {
    marginTop: "0.625rem",
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
    border: "none",
    background: "none",
    padding: 0,
    cursor: "pointer",
    color: "color-mix(in srgb, var(--theme-base-content) 45%, transparent)",
    fontSize: "0.8125rem",
};

export default function PlanBeats({
    section,
    projectSlug,
    workSlug,
    canUpdate,
    onChange,
}: {
    section: { id: number; beats: OutlineBeat[] };
    projectSlug: string;
    workSlug: string;
    canUpdate: boolean;
    onChange: (beats: OutlineBeat[]) => void;
}) {
    const t = useT();
    const [beats, setBeats] = useState(section.beats);
    const [expanded, setExpanded] = useState(false);
    useEffect(() => {
        setBeats(section.beats);
    }, [section.beats]);
    async function toggleBeat(beat: OutlineBeat) {
        if (!canUpdate) {
            return;
        }

        const previous = beats;

        setBeats((prev) =>
            prev.map((b) => (b.id === beat.id ? { ...b, done: !b.done } : b)),
        );

        try {
            const response = await fetch(
                `${worksBase(projectSlug, workSlug)}/sections/${section.id}/beats/${beat.id}`,
                {
                    method: "PATCH",
                    credentials: "same-origin",
                    headers: apiHeaders(true),
                    body: JSON.stringify({ done: !beat.done }),
                },
            );

            if (!response.ok) {
                setBeats(previous);

                return;
            }

            const body = (await response.json()) as { beats: OutlineBeat[] };
            setBeats(body.beats);
            onChange(body.beats);
        } catch {
            setBeats(previous);
        }
    }

    const collapsed = planCollapsed(beats) && !expanded;
    return (
        <div>
            {beats.length > 0 &&
                (collapsed ? (
                    <button
                        type="button"
                        data-plan-collapsed=""
                        onClick={() => setExpanded(true)}
                        style={collapsedLineStyle}
                    >
                        <i
                            className="fa-solid fa-circle-check"
                            aria-hidden="true"
                        />
                        {t("writing.plan.done_line").replace(
                            ":count",
                            String(beats.length),
                        )}
                    </button>
                ) : (
                    <div style={beatsWrapStyle}>
                        {beats.map((beat) => (
                            <div key={beat.id} style={beatRowStyle}>
                                <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={beat.done}
                                    aria-label={beat.text}
                                    disabled={!canUpdate}
                                    style={beatCheckStyle(beat.done, canUpdate)}
                                    onClick={() => toggleBeat(beat)}
                                />
                                <span style={beatTextStyle(beat.done)}>
                                    {beat.text}
                                </span>
                            </div>
                        ))}
                    </div>
                ))}
        </div>
    );
}
