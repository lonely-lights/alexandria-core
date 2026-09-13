import { useState } from "react";
import Button from "@alexandria/components/ui/Button";
import useT from "@alexandria/hooks/useT";
import type { PatternMarkRole } from "../threadApi";
import ImplementationNotes from "./ImplementationNotes";
import MomentTimeline from "./MomentTimeline";
import type { OverviewDialog } from "./OverviewDialogs";
import { MOMENT_ROLES, roleCount } from "./types";
import type { WorkPatternThread } from "./types";

export default function Implementation({
    thread,
    projectSlug,
    workSlug,
    canManage,
    hasSections,
    onDialog,
}: {
    thread: WorkPatternThread;
    projectSlug: string;
    workSlug: string;
    canManage: boolean;
    hasSections: boolean;
    onDialog: (dialog: OverviewDialog) => void;
}) {
    const t = useT();
    const [role, setRole] = useState<PatternMarkRole | null>(null);
    const moments = role
        ? thread.marks.filter((moment) => moment.role === role)
        : thread.marks;

    return (
        <article
            className="pattern-detail"
            id="pattern-detail"
            data-work-pattern-thread={thread.id}
        >
            <header className="pattern-detail-heading">
                <div className="pattern-detail-category">
                    <span>
                        {thread.card.name ??
                            t("writing.work_patterns.removed_card")}
                    </span>
                    {thread.card.kind && (
                        <span className="pattern-kind">{thread.card.kind}</span>
                    )}
                </div>
                <h2 id="pattern-detail-title" tabIndex={-1}>
                    {thread.title}
                </h2>
                <div className="pattern-detail-meta">
                    <span
                        className="pattern-status"
                        data-kept={thread.status === "kept"}
                    >
                        {t("writing.work_patterns.status_" + thread.status)}
                    </span>
                    {thread.unplanted && (
                        <span>
                            {t("writing.work_patterns.status_unplanted")}
                        </span>
                    )}
                    {thread.stance && (
                        <span>
                            {t("writing.threads.stance_" + thread.stance)}
                        </span>
                    )}
                </div>
                {canManage && (
                    <div className="pattern-detail-actions">
                        <Button
                            size="sm"
                            variant="outline"
                            icon="fa-solid fa-pen"
                            onClick={() =>
                                onDialog({ type: "implementation", thread })
                            }
                        >
                            {t("writing.work_patterns.edit_implementation")}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            icon="fa-solid fa-plus"
                            onClick={() =>
                                onDialog({
                                    type: "implementation",
                                    thread: null,
                                    cardId: thread.card.id,
                                })
                            }
                        >
                            {t("writing.work_patterns.same_device")}
                        </Button>
                    </div>
                )}
            </header>
            <div className="pattern-detail-body">
                <div
                    className="pattern-progression"
                    aria-label={t("writing.work_patterns.progression")}
                >
                    {MOMENT_ROLES.map((value) => (
                        <button
                            type="button"
                            key={value}
                            data-role={value}
                            data-present={roleCount(thread, value) > 0}
                            aria-pressed={role === value}
                            onClick={() =>
                                setRole(role === value ? null : value)
                            }
                        >
                            <span className="pattern-progression-label">
                                {t("writing.work_patterns.role_" + value)}
                            </span>
                            <strong>{roleCount(thread, value)}</strong>
                            <span className="pattern-progression-hint">
                                {t(
                                    "writing.work_patterns." +
                                        (roleCount(thread, value)
                                            ? "moments_short"
                                            : "not_marked"),
                                )}
                            </span>
                        </button>
                    ))}
                </div>
                <section className="pattern-moments-section">
                    <div className="pattern-section-heading">
                        <h3>
                            {role
                                ? t("writing.work_patterns.role_" + role)
                                : t(
                                      "writing.work_patterns.marked_moments",
                                  )}{" "}
                            <span>{moments.length}</span>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {role && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setRole(null)}
                                >
                                    {t(
                                        "writing.work_patterns.show_all_moments",
                                    )}
                                </Button>
                            )}
                            {canManage && hasSections && (
                                <Button
                                    size="sm"
                                    icon="fa-solid fa-plus"
                                    onClick={() =>
                                        onDialog({
                                            type: "moment",
                                            thread,
                                            moment: null,
                                            role: role ?? "setup",
                                        })
                                    }
                                >
                                    {t("writing.work_patterns.add_moment")}
                                </Button>
                            )}
                        </div>
                    </div>
                    {moments.length ? (
                        <MomentTimeline
                            moments={moments}
                            projectSlug={projectSlug}
                            workSlug={workSlug}
                            canManage={canManage}
                            onEdit={(moment) =>
                                onDialog({ type: "moment", thread, moment })
                            }
                            onRemove={(moment) =>
                                onDialog({
                                    type: "delete-moment",
                                    thread,
                                    moment,
                                })
                            }
                        />
                    ) : (
                        <div className="pattern-moments-empty">
                            <i
                                className="fa-solid fa-feather-pointed"
                                aria-hidden="true"
                            />
                            <p>
                                {t(
                                    "writing.work_patterns." +
                                        (role
                                            ? "no_role_moments"
                                            : "no_moments"),
                                )}
                            </p>
                            <p className="text-sm opacity-65">
                                {t(
                                    "writing.work_patterns." +
                                        (hasSections
                                            ? "first_moment_hint"
                                            : "needs_section"),
                                )}
                            </p>
                        </div>
                    )}
                </section>
                <ImplementationNotes
                    thread={thread}
                    canManage={canManage}
                    onDialog={onDialog}
                />
                <footer className="pattern-detail-footer">
                    <div>
                        <p>
                            {t("writing.threads.detail_scope_label")}:{" "}
                            {thread.scope_title ??
                                t("writing.work_patterns.unavailable_scope")}
                        </p>
                        {thread.other_work_marks > 0 && (
                            <p>
                                {t("writing.work_patterns.shared_hint").replace(
                                    ":count",
                                    String(thread.other_work_marks),
                                )}
                            </p>
                        )}
                    </div>
                    {canManage && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                                onDialog({ type: "delete-thread", thread })
                            }
                        >
                            {t("writing.work_patterns.remove_implementation")}
                        </Button>
                    )}
                </footer>
            </div>
        </article>
    );
}
