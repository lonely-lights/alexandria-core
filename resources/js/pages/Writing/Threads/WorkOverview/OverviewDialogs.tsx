import { useState } from "react";
import ConfirmModal from "@alexandria/components/ui/ConfirmModal";
import useT from "@alexandria/hooks/useT";
import { deleteMark, deleteThread } from "../threadApi";
import type { PatternMarkRole } from "../threadApi";
import DeviceForm from "./DeviceForm";
import ImplementationForm from "./ImplementationForm";
import MomentForm from "./MomentForm";
import type {
    WorkPatternMoment,
    WorkPatternSection,
    WorkPatternThread,
} from "./types";

export type OverviewDialog =
    | {
          type: "implementation";
          thread: WorkPatternThread | null;
          cardId?: number;
      }
    | {
          type: "moment";
          thread: WorkPatternThread;
          moment: WorkPatternMoment | null;
          role?: PatternMarkRole;
      }
    | { type: "device"; cardId: number }
    | { type: "delete-thread"; thread: WorkPatternThread }
    | {
          type: "delete-moment";
          thread: WorkPatternThread;
          moment: WorkPatternMoment;
      };

export default function OverviewDialogs({
    dialog,
    projectSlug,
    workId,
    sections,
    onClose,
    onSaved,
}: {
    dialog: OverviewDialog;
    projectSlug: string;
    workId: number;
    sections: WorkPatternSection[];
    onClose: () => void;
    onSaved: (threadId?: number) => void;
}) {
    const t = useT();
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);

    if (dialog.type === "implementation") {
        return (
            <ImplementationForm
                projectSlug={projectSlug}
                workId={workId}
                sections={sections}
                thread={dialog.thread}
                initialCardId={dialog.cardId}
                onClose={onClose}
                onSaved={onSaved}
            />
        );
    }

    if (dialog.type === "moment") {
        return (
            <MomentForm
                projectSlug={projectSlug}
                thread={dialog.thread}
                sections={sections}
                moment={dialog.moment}
                initialRole={dialog.role}
                onClose={onClose}
                onSaved={() => onSaved(dialog.thread.id)}
            />
        );
    }

    if (dialog.type === "device") {
        return (
            <DeviceForm
                projectSlug={projectSlug}
                cardId={dialog.cardId}
                onClose={onClose}
                onSaved={() => onSaved()}
            />
        );
    }

    const deletingThread = dialog.type === "delete-thread";
    async function remove() {
        if (busy) {
            return;
        }

        setBusy(true);
        setFailed(false);
        const ok =
            dialog.type === "delete-thread"
                ? await deleteThread(projectSlug, dialog.thread.id)
                : dialog.type === "delete-moment" &&
                  (await deleteMark(projectSlug, dialog.moment.id));
        setBusy(false);

        if (!ok) {
            setFailed(true);

            return;
        }

        onSaved(dialog.type === "delete-moment" ? dialog.thread.id : undefined);
    }

    return (
        <ConfirmModal
            open
            onClose={onClose}
            onConfirm={() => void remove()}
            loading={busy}
            variant="danger"
            title={t(
                `writing.work_patterns.${deletingThread ? "remove_implementation_title" : "remove_moment_title"}`,
            )}
            confirmLabel={t(
                `writing.work_patterns.${deletingThread ? "remove_implementation" : "remove_moment"}`,
            )}
            message={
                <>
                    <p>
                        {t(
                            `writing.work_patterns.${deletingThread ? "remove_implementation_hint" : "remove_moment_hint"}`,
                        )}
                    </p>
                    {failed && (
                        <p role="alert" className="pattern-error">
                            {t("writing.work_patterns.save_error")}
                        </p>
                    )}
                </>
            }
        />
    );
}
