import { Link } from "@inertiajs/react";
import Tooltip from "@alexandria/components/ui/Tooltip";
import useT from "@alexandria/hooks/useT";
import { workUrl } from "@alexandria/lib/urls";
import type { WorkPatternMoment } from "./types";

export default function MomentTimeline({
    moments,
    projectSlug,
    workSlug,
    canManage,
    onEdit,
    onRemove,
}: {
    moments: WorkPatternMoment[];
    projectSlug: string;
    workSlug: string;
    canManage: boolean;
    onEdit: (moment: WorkPatternMoment) => void;
    onRemove: (moment: WorkPatternMoment) => void;
}) {
    const t = useT();

    return (
        <ol className="pattern-timeline">
            {moments.map((moment) => (
                <li
                    key={moment.id}
                    className="pattern-moment"
                    data-role={moment.role}
                >
                    <span className="pattern-moment-dot" aria-hidden="true" />
                    <div className="pattern-moment-top">
                        <span
                            className="pattern-role-badge"
                            data-role={moment.role}
                        >
                            {t(`writing.work_patterns.role_${moment.role}`)}
                        </span>
                        {canManage && (
                            <div className="pattern-moment-actions">
                                <Tooltip
                                    content={t(
                                        "writing.work_patterns.edit_moment",
                                    )}
                                    variant="secondary"
                                >
                                    <button
                                        type="button"
                                        aria-label={t(
                                            "writing.work_patterns.edit_moment",
                                        )}
                                        onClick={() => onEdit(moment)}
                                    >
                                        <i
                                            className="fa-solid fa-pen"
                                            aria-hidden="true"
                                        />
                                    </button>
                                </Tooltip>
                                <Tooltip
                                    content={t(
                                        "writing.work_patterns.remove_moment",
                                    )}
                                    variant="secondary"
                                >
                                    <button
                                        type="button"
                                        aria-label={t(
                                            "writing.work_patterns.remove_moment",
                                        )}
                                        onClick={() => onRemove(moment)}
                                    >
                                        <i
                                            className="fa-solid fa-trash-can"
                                            aria-hidden="true"
                                        />
                                    </button>
                                </Tooltip>
                            </div>
                        )}
                    </div>
                    {moment.anchor_text ? (
                        <blockquote>{moment.anchor_text}</blockquote>
                    ) : (
                        <p className="pattern-unanchored">
                            {t("writing.work_patterns.section_mark")}
                        </p>
                    )}
                    {moment.note && (
                        <p className="pattern-moment-note">{moment.note}</p>
                    )}
                    <Link
                        className="pattern-location"
                        href={workUrl(
                            projectSlug,
                            workSlug,
                            moment.section_slug,
                        )}
                        data-work-pattern-mark
                    >
                        <i
                            className="fa-solid fa-align-left"
                            aria-hidden="true"
                        />
                        <span>{moment.section_path.join(" / ")}</span>
                        <i
                            className="fa-solid fa-arrow-up-right-from-square"
                            aria-hidden="true"
                        />
                    </Link>
                </li>
            ))}
        </ol>
    );
}
