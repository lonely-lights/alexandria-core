import { useEffect, useRef, useState, type CSSProperties } from "react";
import Toggle from "@alexandria/components/form/Toggle";
import ActionButton from "@alexandria/components/ui/ActionButton";
import Tooltip from "@alexandria/components/ui/Tooltip";
import { csrfHeaders } from "@alexandria/lib/csrfHeaders";
import useT from "@alexandria/hooks/useT";
import type { AiInstruction } from "@alexandria/types/projects";

interface AiHelpersSectionProps {
    projectId: number;
    instructions: AiInstruction[];
    onInstructionsChange: (instructions: AiInstruction[]) => void;
}

/* ── Theme styles ── */

const fadedText: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};
const microText: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};
const labelText: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};
const bodyText: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
};

const cardStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)",
    background: "var(--theme-base-100)",
    borderRadius: "var(--theme-radius-card)",
    padding: "1.5rem",
};

const inputStyle: CSSProperties = {
    background: "var(--theme-base-surface)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
    borderRadius: "var(--theme-radius-input)",
    color: "var(--theme-base-content)",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
};

const promptTextareaStyle: CSSProperties = {
    ...inputStyle,
    fontFamily: "monospace",
    fontSize: "0.75rem",
    lineHeight: "1.6",
    resize: "vertical",
};

const styleTextareaStyle: CSSProperties = {
    ...inputStyle,
    resize: "vertical",
};

const lockedSectionStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
    background: "color-mix(in srgb, var(--theme-base-content) 4%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    padding: "1rem",
};

const ghostBtnStyle: CSSProperties = {
    background: "transparent",
    color: "var(--theme-base-content)",
    borderRadius: "var(--theme-radius-button)",
    padding: "0.375rem 0.75rem",
    fontSize: "0.875rem",
};

const primaryBtnStyle: CSSProperties = {
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
    borderRadius: "var(--theme-radius-button)",
    padding: "0.375rem 0.75rem",
    fontSize: "0.875rem",
    gap: "0.375rem",
};

const secondaryBtnStyle: CSSProperties = {
    background: "var(--theme-brand-secondary-500)",
    color: "var(--theme-brand-secondary-content)",
    borderRadius: "var(--theme-radius-button)",
    padding: "0.375rem 0.75rem",
    fontSize: "0.875rem",
    gap: "0.375rem",
};

const ghostPrimaryLinkStyle: CSSProperties = {
    background: "transparent",
    color: "var(--theme-brand-primary-500)",
    borderRadius: "var(--theme-radius-button)",
    padding: "0.375rem 0.75rem",
    fontSize: "0.875rem",
    gap: "0.375rem",
};

const iconBtnGhostStyle: CSSProperties = {
    background: "transparent",
    color: "var(--theme-base-content)",
    borderRadius: "var(--theme-radius-button)",
    padding: "0.25rem 0.5rem",
    fontSize: "0.75rem",
};

const promptItemStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)",
    background: "var(--theme-base-100)",
    borderRadius: "var(--theme-radius-card)",
    padding: "1rem 1.25rem",
};

const instructionItemStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)",
    background: "color-mix(in srgb, var(--theme-base-content) 3%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    padding: "1rem",
    transition:
        "border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

const sortingDefaultBadgeStyle: CSSProperties = {
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
    borderRadius: "var(--theme-radius-badge)",
    padding: "0.125rem 0.5rem",
    fontSize: "0.6875rem",
    fontWeight: 600,
};

const styleDefaultBadgeStyle: CSSProperties = {
    background: "var(--theme-brand-secondary-500)",
    color: "var(--theme-brand-secondary-content)",
    borderRadius: "var(--theme-radius-badge)",
    padding: "0.125rem 0.5rem",
    fontSize: "0.6875rem",
    fontWeight: 600,
};

const dashedEmptyStyle: CSSProperties = {
    border: "2px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

const editFormCardStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-brand-secondary-500) 20%, transparent)",
    background:
        "color-mix(in srgb, var(--theme-brand-secondary-500) 5%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    padding: "1.25rem",
};

const addCtaStyle: CSSProperties = {
    border: "2px dashed color-mix(in srgb, var(--theme-base-content) 12%, transparent)",
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    padding: "0.75rem",
    gap: "0.5rem",
    transition:
        "border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

export default function AiHelpersSection({
    projectId,
    instructions,
    onInstructionsChange,
}: AiHelpersSectionProps) {
    return (
        <div className="space-y-8">
            <OptimizedSortCard projectId={projectId} />
            <SortingPromptsCard projectId={projectId} />
            <WritingStyleCard
                projectId={projectId}
                instructions={instructions}
                onChange={onInstructionsChange}
            />
        </div>
    );
}

/* ── Optimized Sort toggle (Stage 8g.5) ── */

/**
 * Per-project opt-in for the Stage 8g.5 minimal-tier classifier.
 * When OFF (default), AI sort routes through the proven heavy path
 * (BlueprintClassifierAgent). When ON, sort flows through the
 * MinimalClassifierAgent — ships only blueprint slug + name +
 * description (~500 tokens vs. ~1,680 in the legacy path).
 *
 * Reads + writes go through the existing aiSettings endpoints.
 * `sometimes` validation on the backend lets us PUT just this one
 * field without re-submitting the entire ai-settings form.
 */
const DEFAULT_ESCALATION_THRESHOLD = 0.75;
const THRESHOLD_MIN = 0.5;
const THRESHOLD_MAX = 0.95;
const THRESHOLD_STEP = 0.05;
// 400ms debounce balances responsive drag UX against per-frame save spam.
// Revisit during P6 measurement if telemetry shows users drag-snipe and
// expect immediate persistence.
const THRESHOLD_SAVE_DEBOUNCE_MS = 400;

function OptimizedSortCard({ projectId }: { projectId: number }) {
    const t = useT();
    const [enabled, setEnabled] = useState(false);
    const [threshold, setThreshold] = useState(DEFAULT_ESCALATION_THRESHOLD);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [thresholdSaving, setThresholdSaving] = useState(false);
    const [thresholdJustSaved, setThresholdJustSaved] = useState(false);
    // Ref instead of state so the threshold-save effect doesn't re-run when
    // the load flag flips. The initial fetch sets this to true, and only
    // user-driven threshold changes after that trigger the debounced save.
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        fetch(`/api/v1/projects/${projectId}/ai-settings`, {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                setEnabled(Boolean(data?.use_optimized_ai_sort));
                const loaded = Number(
                    data?.optimized_ai_sort_confidence_threshold,
                );
                if (Number.isFinite(loaded)) {
                    setThreshold(loaded);
                }
                setLoading(false);
                hasLoadedRef.current = true;
            })
            .catch(() => setLoading(false));
    }, [projectId]);

    // Debounced threshold save. Skips until the initial fetch lands so the
    // server's stored value doesn't immediately echo back as a "save."
    useEffect(() => {
        if (!hasLoadedRef.current) return;

        const timer = setTimeout(() => {
            void saveThreshold(threshold);
        }, THRESHOLD_SAVE_DEBOUNCE_MS);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threshold]);

    async function toggle(next: boolean) {
        if (saving) return;
        const previous = enabled;
        setEnabled(next);
        setSaving(true);

        const res = await fetch(
            `/api/v1/projects/${projectId}/ai/dashboard-settings`,
            {
                method: "PUT",
                headers: {
                    ...csrfHeaders(),
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
                body: JSON.stringify({ use_optimized_ai_sort: next }),
            },
        );

        if (!res.ok) {
            // Revert on failure so the UI matches the backend.
            setEnabled(previous);
        }
        setSaving(false);
    }

    async function saveThreshold(value: number) {
        setThresholdSaving(true);
        setThresholdJustSaved(false);

        const res = await fetch(
            `/api/v1/projects/${projectId}/ai/dashboard-settings`,
            {
                method: "PUT",
                headers: {
                    ...csrfHeaders(),
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    optimized_ai_sort_confidence_threshold: value,
                }),
            },
        );

        setThresholdSaving(false);
        if (res.ok) {
            setThresholdJustSaved(true);
            // Auto-clear the "Saved" pill after a beat so it doesn't linger.
            setTimeout(() => setThresholdJustSaved(false), 1800);
        }
    }

    const sliderDisabled = loading || !enabled;

    return (
        <div style={cardStyle}>
            <div className="mb-3">
                <h3
                    className="text-base font-semibold"
                    style={{ color: "var(--theme-base-content)" }}
                >
                    {t("projects.ai_helpers.optimized_sort.title")}
                </h3>
                <p className="mt-1 text-sm" style={bodyText}>
                    {t("projects.ai_helpers.optimized_sort.description")}
                </p>
            </div>
            <Toggle
                label={t("projects.ai_helpers.optimized_sort.toggle_label")}
                description={t(
                    "projects.ai_helpers.optimized_sort.toggle_description",
                )}
                checked={enabled}
                onChange={toggle}
                disabled={loading || saving}
            />

            <div
                className="mt-5 border-t pt-4"
                style={{
                    borderColor:
                        "color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
                    opacity: sliderDisabled ? 0.55 : 1,
                    transition:
                        "opacity var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
                }}
            >
                <div className="flex items-baseline justify-between">
                    <label
                        htmlFor="optimized-sort-threshold"
                        className="text-sm font-semibold"
                        style={{ color: "var(--theme-base-content)" }}
                    >
                        {t(
                            "projects.ai_helpers.optimized_sort.threshold_label",
                        )}
                    </label>
                    <div className="flex items-center gap-2">
                        {thresholdSaving && (
                            <span className="text-xs" style={microText}>
                                {t(
                                    "projects.ai_helpers.optimized_sort.threshold_saving",
                                )}
                            </span>
                        )}
                        {thresholdJustSaved && !thresholdSaving && (
                            <span className="text-xs" style={microText}>
                                <i
                                    className="fa-solid fa-check mr-1 text-[0.625rem]"
                                    aria-hidden="true"
                                />
                                {t(
                                    "projects.ai_helpers.optimized_sort.threshold_saved",
                                )}
                            </span>
                        )}
                        <span
                            className="font-mono text-sm font-semibold tabular-nums"
                            style={{ color: "var(--theme-base-content)" }}
                        >
                            {threshold.toFixed(2)}
                        </span>
                    </div>
                </div>
                <p className="mt-1 text-xs" style={bodyText}>
                    {t(
                        "projects.ai_helpers.optimized_sort.threshold_description",
                    )}
                </p>
                <input
                    id="optimized-sort-threshold"
                    type="range"
                    min={THRESHOLD_MIN}
                    max={THRESHOLD_MAX}
                    step={THRESHOLD_STEP}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    disabled={sliderDisabled}
                    className="mt-3 w-full accent-current"
                    style={{
                        accentColor: "var(--theme-brand-primary-500)",
                        cursor: sliderDisabled ? "not-allowed" : "pointer",
                    }}
                />
                <div className="mt-1 flex justify-between text-[0.6875rem]" style={microText}>
                    <span>
                        {THRESHOLD_MIN.toFixed(2)} ·{" "}
                        {t(
                            "projects.ai_helpers.optimized_sort.threshold_lower_hint",
                        )}
                    </span>
                    <span>
                        {t(
                            "projects.ai_helpers.optimized_sort.threshold_higher_hint",
                        )}{" "}
                        · {THRESHOLD_MAX.toFixed(2)}
                    </span>
                </div>
                {!enabled && !loading && (
                    <p className="mt-2 text-xs italic" style={microText}>
                        {t(
                            "projects.ai_helpers.optimized_sort.threshold_disabled_hint",
                        )}
                    </p>
                )}
            </div>
        </div>
    );
}

/* ── Sorting Prompts card ── */

interface SortingPrompt {
    id: number;
    name: string;
    instructions: string;
    is_default: boolean;
}

/**
 * Default AI prompt content the user sees as a starting point when
 * creating a new sorting prompt. NOT translated — this is AI-prompt
 * content where precise wording drives model behavior; localizing it
 * needs a deeper redesign than swapping strings.
 */
const DEFAULT_INSTRUCTIONS = `You are an AI assistant for Alexandria, a worldbuilding application.

Your task is to analyze a note and determine which blueprint(s) it should be categorized under.

## Instructions

1. Read the note content carefully from the DATA CONTEXT below
2. Examine the available blueprints in the project
3. Determine which blueprint(s) best match the note's content
4. Return your analysis as structured JSON`;

/**
 * The system-appended portion shown to the user as a locked preview.
 * Also intentionally English-only for the same AI-prompt-fidelity reason.
 */
const LOCKED_PREAMBLE = `## Response Format

Return ONLY valid JSON in this exact format:
{
  "analysis": { "summary": "...", "detected_entities": [...] },
  "categorizations": [{ "blueprint_slug": "...", "confidence": 0.95, "reasoning": "..." }]
}

## Rules
- Confidence must be between 0.0 and 1.0
- Only suggest blueprints that exist in the DATA CONTEXT
- If no blueprint matches well (confidence < 0.5), return an empty categorizations array
- A note can match multiple blueprints if it contains different entity types`;

function SortingPromptsCard({ projectId }: { projectId: number }) {
    const t = useT();
    const [prompts, setPrompts] = useState<SortingPrompt[]>([]);
    const [editing, setEditing] = useState<SortingPrompt | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [saving, setSaving] = useState(false);
    // Track the initial fetch so the empty-state copy doesn't flash on
    // mount before the request resolves.
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/v1/projects/${projectId}/sorting-prompts`, {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        })
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => {
                setPrompts(data);
                setLoading(false);
            })
            .catch(() => {
                setPrompts([]);
                setLoading(false);
            });
    }, [projectId]);

    function startNew() {
        setEditing({
            id: 0,
            name: "",
            instructions: DEFAULT_INSTRUCTIONS,
            is_default: prompts.length === 0,
        });
        setIsNew(true);
    }

    function startEdit(prompt: SortingPrompt) {
        setEditing({ ...prompt });
        setIsNew(false);
    }

    async function save() {
        if (!editing) return;
        setSaving(true);
        const res = await fetch(
            `/api/v1/projects/${projectId}/sorting-prompts`,
            {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    id: isNew ? null : editing.id,
                    name: editing.name,
                    instructions: editing.instructions,
                    is_default: editing.is_default,
                }),
            },
        );
        if (res.ok) {
            const saved = await res.json();
            if (isNew) {
                setPrompts((prev) =>
                    saved.is_default
                        ? [
                              ...prev.map((p: SortingPrompt) => ({
                                  ...p,
                                  is_default: false,
                              })),
                              saved,
                          ]
                        : [...prev, saved],
                );
            } else {
                setPrompts((prev) =>
                    prev.map((p) =>
                        p.id === saved.id
                            ? saved
                            : saved.is_default
                              ? { ...p, is_default: false }
                              : p,
                    ),
                );
            }
            setEditing(null);
        }
        setSaving(false);
    }

    async function deletePrompt(id: number) {
        await fetch(`/api/v1/projects/${projectId}/sorting-prompts/${id}`, {
            method: "DELETE",
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        });
        setPrompts((prev) => prev.filter((p) => p.id !== id));
        if (editing?.id === id) setEditing(null);
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-bold">
                    {t("projects.settings_tab.ai_sorting.title")}
                </h3>
                <p className="mt-1 text-sm" style={labelText}>
                    {t("projects.settings_tab.ai_sorting.subtitle")}
                </p>
            </div>

            {editing ? (
                <div className="space-y-4" style={cardStyle}>
                    <div>
                        <label
                            className="text-xs font-semibold"
                            style={bodyText}
                        >
                            {t("projects.settings_tab.ai_sorting.name_label")}
                        </label>
                        <input
                            type="text"
                            value={editing.name}
                            onChange={(e) =>
                                setEditing({ ...editing, name: e.target.value })
                            }
                            placeholder={t(
                                "projects.settings_tab.ai_sorting.name_placeholder",
                            )}
                            className="mt-1 w-full"
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label
                            className="text-xs font-semibold"
                            style={bodyText}
                        >
                            {t(
                                "projects.settings_tab.ai_sorting.instructions_label",
                            )}
                        </label>
                        <p className="mt-0.5 text-xs" style={microText}>
                            {t(
                                "projects.settings_tab.ai_sorting.instructions_hint",
                            )}
                        </p>
                        <textarea
                            value={editing.instructions}
                            onChange={(e) =>
                                setEditing({
                                    ...editing,
                                    instructions: e.target.value,
                                })
                            }
                            rows={12}
                            className="mt-2 w-full"
                            style={promptTextareaStyle}
                        />
                    </div>

                    <div style={lockedSectionStyle}>
                        <div
                            className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
                            style={microText}
                        >
                            <i
                                className="fa-solid fa-lock text-[0.625rem]"
                                aria-hidden="true"
                            />
                            {t(
                                "projects.settings_tab.ai_sorting.locked_header",
                            )}
                        </div>
                        <pre
                            className="whitespace-pre-wrap font-mono text-xs leading-relaxed"
                            style={microText}
                        >
                            {LOCKED_PREAMBLE}
                        </pre>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={editing.is_default}
                            onChange={(e) =>
                                setEditing({
                                    ...editing,
                                    is_default: e.target.checked,
                                })
                            }
                            className="alex-checkbox"
                        />
                        <span className="text-sm" style={bodyText}>
                            {t(
                                "projects.settings_tab.ai_sorting.set_default_label",
                            )}
                        </span>
                    </label>

                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="alex-btn"
                            style={ghostBtnStyle}
                        >
                            {t("projects.settings_tab.ai_sorting.cancel")}
                        </button>
                        <ActionButton
                            icon="fa-solid fa-save"
                            label={
                                isNew
                                    ? t(
                                          "projects.settings_tab.ai_sorting.create_prompt",
                                      )
                                    : t(
                                          "projects.settings_tab.ai_sorting.save_changes",
                                      )
                            }
                            onClick={() => void save()}
                            loading={saving}
                            disabled={
                                !editing.name.trim() ||
                                !editing.instructions.trim()
                            }
                        />
                    </div>
                </div>
            ) : loading ? (
                <div
                    className="flex items-center justify-center py-12"
                    style={dashedEmptyStyle}
                >
                    <i
                        className="fa-solid fa-circle-notch fa-spin text-base"
                        style={microText}
                        aria-hidden="true"
                    />
                </div>
            ) : (
                <>
                    {prompts.length === 0 ? (
                        <div
                            className="py-12 text-center"
                            style={dashedEmptyStyle}
                        >
                            <i
                                className="fa-solid fa-wand-magic-sparkles mb-3 text-3xl"
                                style={{
                                    color: "color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
                                }}
                                aria-hidden="true"
                            />
                            <p className="text-sm" style={microText}>
                                {t(
                                    "projects.settings_tab.ai_sorting.empty.title",
                                )}
                            </p>
                            <p
                                className="mt-1 text-xs"
                                style={{
                                    color: "color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
                                }}
                            >
                                {t(
                                    "projects.settings_tab.ai_sorting.empty.subtitle",
                                )}
                            </p>
                            <button
                                type="button"
                                onClick={startNew}
                                className="alex-btn mt-4 inline-flex items-center"
                                style={primaryBtnStyle}
                            >
                                <i
                                    className="fa-solid fa-plus text-xs"
                                    aria-hidden="true"
                                />
                                {t(
                                    "projects.settings_tab.ai_sorting.empty.button",
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {prompts.map((prompt) => (
                                <div
                                    key={prompt.id}
                                    className="group flex items-center gap-4"
                                    style={promptItemStyle}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold">
                                                {prompt.name}
                                            </span>
                                            {prompt.is_default && (
                                                <span
                                                    style={
                                                        sortingDefaultBadgeStyle
                                                    }
                                                >
                                                    {t(
                                                        "projects.settings_tab.ai_sorting.default_badge",
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                        <p
                                            className="mt-1 truncate text-xs"
                                            style={fadedText}
                                        >
                                            {prompt.instructions.slice(0, 120)}
                                            ...
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                            type="button"
                                            onClick={() => startEdit(prompt)}
                                            className="alex-btn"
                                            style={iconBtnGhostStyle}
                                            title={t(
                                                "projects.settings_tab.ai_sorting.tooltip.edit",
                                            )}
                                            aria-label={t(
                                                "projects.settings_tab.ai_sorting.tooltip.edit",
                                            )}
                                        >
                                            <i
                                                className="fa-solid fa-pencil text-xs"
                                                style={fadedText}
                                                aria-hidden="true"
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                void deletePrompt(prompt.id)
                                            }
                                            className="alex-btn"
                                            style={iconBtnGhostStyle}
                                            title={t(
                                                "projects.settings_tab.ai_sorting.tooltip.delete",
                                            )}
                                            aria-label={t(
                                                "projects.settings_tab.ai_sorting.tooltip.delete",
                                            )}
                                        >
                                            <i
                                                className="fa-solid fa-trash text-xs"
                                                style={{
                                                    color: "color-mix(in srgb, var(--theme-status-error-stroke) 30%, transparent)",
                                                }}
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={startNew}
                                className="alex-btn inline-flex items-center"
                                style={ghostPrimaryLinkStyle}
                            >
                                <i
                                    className="fa-solid fa-plus text-xs"
                                    aria-hidden="true"
                                />
                                {t(
                                    "projects.settings_tab.ai_sorting.add_another",
                                )}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/* ── Writing Style card (per-project AI drafting style guides) ── */

function WritingStyleCard({
    projectId,
    instructions,
    onChange,
}: {
    projectId: number;
    instructions: AiInstruction[];
    onChange: (instructions: AiInstruction[]) => void;
}) {
    const t = useT();
    const [showAdd, setShowAdd] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [label, setLabel] = useState("");
    const [text, setText] = useState("");
    const [saving, setSaving] = useState(false);

    function resetForm() {
        setLabel("");
        setText("");
        setEditId(null);
        setShowAdd(false);
    }

    function startEdit(inst: AiInstruction) {
        setEditId(inst.id);
        setLabel(inst.label);
        setText(inst.instructions);
        setShowAdd(true);
    }

    function handleSave() {
        if (!label.trim() || !text.trim()) return;
        setSaving(true);

        if (editId) {
            fetch(`/api/v1/ai-instructions/${editId}`, {
                method: "PUT",
                headers: csrfHeaders(),
                credentials: "same-origin",
                body: JSON.stringify({ label, instructions: text }),
            })
                .then((r) => r.json())
                .then((updated) => {
                    onChange(
                        instructions.map((i) =>
                            i.id === editId ? { ...i, ...updated } : i,
                        ),
                    );
                    resetForm();
                })
                .finally(() => setSaving(false));
        } else {
            fetch(`/api/v1/projects/${projectId}/ai-instructions`, {
                method: "POST",
                headers: csrfHeaders(),
                credentials: "same-origin",
                body: JSON.stringify({
                    label,
                    instructions: text,
                    is_default: instructions.length === 0,
                }),
            })
                .then((r) => r.json())
                .then((created) => {
                    onChange([...instructions, created]);
                    resetForm();
                })
                .finally(() => setSaving(false));
        }
    }

    function handleDelete(id: number) {
        fetch(`/api/v1/ai-instructions/${id}`, {
            method: "DELETE",
            headers: csrfHeaders(),
            credentials: "same-origin",
        }).then(() => {
            const remaining = instructions.filter((i) => i.id !== id);
            // Backend promotes the first remaining instruction when the
            // default gets deleted; mirror that here so UI stays in sync.
            if (remaining.length > 0 && !remaining.some((i) => i.is_default)) {
                remaining[0].is_default = true;
            }
            onChange(remaining);
            if (editId === id) resetForm();
        });
    }

    function handleSetDefault(id: number) {
        fetch(`/api/v1/ai-instructions/${id}/default`, {
            method: "PUT",
            headers: csrfHeaders(),
            credentials: "same-origin",
        }).then(() => {
            onChange(
                instructions.map((i) => ({ ...i, is_default: i.id === id })),
            );
        });
    }

    return (
        <div style={cardStyle}>
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold">
                        <i
                            className="fa-solid fa-scroll mr-2"
                            style={{
                                color: "color-mix(in srgb, var(--theme-brand-secondary-500) 70%, transparent)",
                            }}
                            aria-hidden="true"
                        />
                        {t("projects.settings_tab.ai_writing_style.title")}
                    </h3>
                    <p className="mt-1 text-xs" style={fadedText}>
                        {t("projects.settings_tab.ai_writing_style.subtitle")}
                    </p>
                </div>
            </div>

            {instructions.length > 0 && (
                <div className="mt-4 space-y-2">
                    {instructions.map((inst) => (
                        <div
                            key={inst.id}
                            className="group flex items-start gap-3"
                            style={instructionItemStyle}
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                        {inst.label}
                                    </span>
                                    {inst.is_default && (
                                        <span style={styleDefaultBadgeStyle}>
                                            {t(
                                                "projects.settings_tab.ai_writing_style.default_badge",
                                            )}
                                        </span>
                                    )}
                                </div>
                                <p
                                    className="mt-1 text-xs line-clamp-2"
                                    style={labelText}
                                >
                                    {inst.instructions}
                                </p>
                            </div>
                            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                {!inst.is_default && (
                                    <Tooltip
                                        content={t(
                                            "projects.settings_tab.ai_writing_style.tooltip.set_default",
                                        )}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleSetDefault(inst.id)
                                            }
                                            className="alex-btn"
                                            style={iconBtnGhostStyle}
                                            aria-label={t(
                                                "projects.settings_tab.ai_writing_style.tooltip.set_default",
                                            )}
                                        >
                                            <i
                                                className="fa-solid fa-star text-xs"
                                                style={{
                                                    color: "var(--theme-status-warning-stroke)",
                                                }}
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </Tooltip>
                                )}
                                <Tooltip
                                    content={t(
                                        "projects.settings_tab.ai_writing_style.tooltip.edit",
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() => startEdit(inst)}
                                        className="alex-btn"
                                        style={iconBtnGhostStyle}
                                        aria-label={t(
                                            "projects.settings_tab.ai_writing_style.tooltip.edit",
                                        )}
                                    >
                                        <i
                                            className="fa-solid fa-pen text-xs"
                                            style={{
                                                color: "var(--theme-status-info-stroke)",
                                            }}
                                            aria-hidden="true"
                                        />
                                    </button>
                                </Tooltip>
                                <Tooltip
                                    content={t(
                                        "projects.settings_tab.ai_writing_style.tooltip.delete",
                                    )}
                                    variant="error"
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(inst.id)}
                                        className="alex-btn"
                                        style={iconBtnGhostStyle}
                                        aria-label={t(
                                            "projects.settings_tab.ai_writing_style.tooltip.delete",
                                        )}
                                    >
                                        <i
                                            className="fa-solid fa-trash text-xs"
                                            style={{
                                                color: "var(--theme-status-error-stroke)",
                                            }}
                                            aria-hidden="true"
                                        />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAdd ? (
                <div className="mt-4 space-y-3" style={editFormCardStyle}>
                    <h4 className="text-sm font-semibold">
                        {editId
                            ? t(
                                  "projects.settings_tab.ai_writing_style.form.edit_title",
                              )
                            : t(
                                  "projects.settings_tab.ai_writing_style.form.new_title",
                              )}
                    </h4>
                    <div className="flex flex-col">
                        <label className="mb-1 text-sm">
                            {t(
                                "projects.settings_tab.ai_writing_style.form.label",
                            )}
                        </label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            style={inputStyle}
                            placeholder={t(
                                "projects.settings_tab.ai_writing_style.form.label_placeholder",
                            )}
                            maxLength={100}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="mb-1 flex items-center justify-between text-sm">
                            <span>
                                {t(
                                    "projects.settings_tab.ai_writing_style.form.instructions",
                                )}
                            </span>
                            <span className="text-xs" style={fadedText}>
                                {text.length}/2000
                            </span>
                        </label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            style={styleTextareaStyle}
                            placeholder={t(
                                "projects.settings_tab.ai_writing_style.form.instructions_placeholder",
                            )}
                            rows={3}
                            maxLength={2000}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="alex-btn"
                            style={ghostBtnStyle}
                        >
                            {t(
                                "projects.settings_tab.ai_writing_style.form.cancel",
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!label.trim() || !text.trim() || saving}
                            className="alex-btn inline-flex items-center"
                            style={{
                                ...secondaryBtnStyle,
                                opacity:
                                    !label.trim() || !text.trim() || saving
                                        ? 0.5
                                        : 1,
                            }}
                        >
                            {saving && (
                                <i
                                    className="fa-solid fa-circle-notch fa-spin text-xs"
                                    aria-hidden="true"
                                />
                            )}
                            {saving
                                ? t(
                                      "projects.settings_tab.ai_writing_style.form.saving",
                                  )
                                : editId
                                  ? t(
                                        "projects.settings_tab.ai_writing_style.form.update",
                                    )
                                  : t(
                                        "projects.settings_tab.ai_writing_style.form.add",
                                    )}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setShowAdd(true)}
                    className="alex-btn mt-4 w-full inline-flex items-center justify-center"
                    style={addCtaStyle}
                >
                    <i className="fa-solid fa-plus" aria-hidden="true" />
                    {t("projects.settings_tab.ai_writing_style.add_button")}
                </button>
            )}
        </div>
    );
}
