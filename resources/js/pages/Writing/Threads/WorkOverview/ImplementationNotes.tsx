import Button from "@alexandria/components/ui/Button";
import useT from "@alexandria/hooks/useT";
import type { OverviewDialog } from "./OverviewDialogs";
import type { WorkPatternThread } from "./types";
export default function ImplementationNotes({
    thread,
    canManage,
    onDialog,
}: {
    thread: WorkPatternThread;
    canManage: boolean;
    onDialog: (dialog: OverviewDialog) => void;
}) {
    const t = useT();

    return (
        <div className="pattern-reference">
            <details>
                <summary>
                    <i
                        className="fa-regular fa-note-sticky"
                        aria-hidden="true"
                    />
                    {t("writing.work_patterns.intent_notes")}
                </summary>
                <div className="pattern-reference-body">
                    <p>
                        {thread.notes || t("writing.work_patterns.no_intent")}
                    </p>
                    {canManage && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                                onDialog({
                                    type: "implementation",
                                    thread,
                                })
                            }
                        >
                            {t("writing.work_patterns.edit_notes")}
                        </Button>
                    )}
                </div>
            </details>
            <details>
                <summary>
                    <i className="fa-regular fa-compass" aria-hidden="true" />
                    {t("writing.work_patterns.about_device")}
                </summary>
                <div className="pattern-reference-body">
                    <h4>{thread.card.name}</h4>
                    <p>{thread.card.definition}</p>
                    {thread.card.craft_guidance && (
                        <>
                            <h4>
                                {t("writing.threads.detail_craft_guidance")}
                            </h4>
                            <p>{thread.card.craft_guidance}</p>
                        </>
                    )}
                    {thread.card.pitfalls && (
                        <>
                            <h4>{t("writing.threads.detail_pitfalls")}</h4>
                            <p>{thread.card.pitfalls}</p>
                        </>
                    )}
                    {thread.card.archived ? (
                        <p>{t("writing.work_patterns.archived")}</p>
                    ) : (
                        canManage && (
                            <>
                                <p className="text-xs opacity-65">
                                    {t(
                                        "writing.work_patterns.definition_shared",
                                    )}
                                </p>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                        onDialog({
                                            type: "device",
                                            cardId: thread.card.id,
                                        })
                                    }
                                >
                                    {t("writing.work_patterns.edit_definition")}
                                </Button>
                            </>
                        )
                    )}
                </div>
            </details>
        </div>
    );
}
