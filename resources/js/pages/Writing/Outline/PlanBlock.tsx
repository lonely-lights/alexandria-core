import { FocusTrap } from "@headlessui/react";
import { router } from "@inertiajs/react";
import { useEffect, useId, useRef, useState } from "react";
import Button from "@alexandria/components/ui/Button";
import Modal, {
    ModalFooter,
    ModalHeader,
} from "@alexandria/components/ui/Modal";
import useT from "@alexandria/hooks/useT";
import { worksBase } from "@alexandria/lib/urls";
import PlanBeats from "./PlanBeats";
import type { OutlineBeat } from "./outlineTypes";

export { planCollapsed } from "./PlanBeats";

export interface PlanBlockSection {
    id: number;
    title: string;
    synopsis: string | null;
    beats: OutlineBeat[];
}
export interface PlanBlockProps {
    section: PlanBlockSection;
    projectSlug: string;
    workSlug: string;
    canUpdate: boolean;
    onSynopsisEdit?: (value: string) => void;
}

/** Section-title note icon. Selecting the plan never starts an edit. */
export default function PlanBlock(props: PlanBlockProps) {
    return <SectionPlan key={props.section.id} {...props} />;
}

function SectionPlan({
    section,
    projectSlug,
    workSlug,
    canUpdate,
    onSynopsisEdit,
}: PlanBlockProps) {
    const t = useT();
    const titleId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [synopsis, setSynopsis] = useState(section.synopsis ?? "");
    const [beats, setBeats] = useState(section.beats);
    const [draft, setDraft] = useState("");
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Refresh the reading copy without replacing an in-progress draft.
    useEffect(() => {
        setSynopsis(section.synopsis ?? "");
    }, [section.synopsis]);
    useEffect(() => {
        setBeats(section.beats);
    }, [section.beats]);

    function close() {
        if (saving) return;
        setOpen(false);
        setEditing(false);
        setError("");
    }

    function startEditing() {
        setDraft(synopsis);
        setError("");
        setEditing(true);
    }

    function save() {
        if (!canUpdate || saving) return;
        if (draft === synopsis) {
            setEditing(false);
            return;
        }
        setError("");
        if (onSynopsisEdit) {
            onSynopsisEdit(draft);
            setSynopsis(draft);
            setEditing(false);
            return;
        }
        setSaving(true);
        let saved = false;
        // The outline endpoint replaces the entire tree; use the single-section route.
        router.put(
            `${worksBase(projectSlug, workSlug)}/sections/${section.id}`,
            { title: section.title, synopsis: draft === "" ? null : draft },
            {
                preserveScroll: true,
                preserveState: true,
                only: ["currentSection", "sections"],
                onSuccess: () => {
                    saved = true;
                    setSynopsis(draft);
                    setEditing(false);
                },
                onError: (errors) =>
                    setError(errors.synopsis ?? t("writing.plan.save_failed")),
                onFinish: () => {
                    setSaving(false);
                    if (!saved)
                        setError(
                            (previous) =>
                                previous || t("writing.plan.save_failed"),
                        );
                },
            },
        );
    }

    if (!open && synopsis.trim() === "" && beats.length === 0) return null;

    return (
        <>
            <button
                type="button"
                data-plan-trigger={section.id}
                className="alex-toolbar-btn inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm"
                aria-label={t("writing.plan.open")}
                title={t("writing.plan.open")}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen(true)}
            >
                <i className="fa-regular fa-note-sticky" aria-hidden="true" />
            </button>
            <Modal
                open={open}
                onClose={close}
                dismissible={!saving}
                maxWidth="max-w-3xl"
            >
                <FocusTrap
                    ref={dialogRef}
                    initialFocus={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    tabIndex={-1}
                    className="flex min-h-0 flex-col"
                    data-plan-block=""
                >
                    <ModalHeader
                        title={
                            <span id={titleId}>
                                {t("writing.plan.title")} · {section.title}
                            </span>
                        }
                        onClose={close}
                    />
                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 text-left text-sm font-normal tracking-normal">
                        {editing ? (
                            <textarea
                                autoFocus
                                aria-label={t("writing.plan.synopsis_label")}
                                value={draft}
                                disabled={saving}
                                onChange={(event) =>
                                    setDraft(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (
                                        event.key === "Enter" &&
                                        (event.ctrlKey || event.metaKey)
                                    ) {
                                        event.preventDefault();
                                        save();
                                    }
                                }}
                                className="w-full resize-y rounded-md border p-3"
                                style={{
                                    minHeight: "18rem",
                                    background: "var(--theme-base-surface)",
                                    color: "var(--theme-base-content)",
                                    borderColor: "var(--theme-base-400)",
                                    lineHeight: 1.65,
                                }}
                            />
                        ) : (
                            <div
                                data-plan-synopsis=""
                                style={{
                                    whiteSpace: "pre-wrap",
                                    overflowWrap: "anywhere",
                                    userSelect: "text",
                                    lineHeight: 1.65,
                                }}
                            >
                                {synopsis ||
                                    t("writing.plan.synopsis_placeholder")}
                            </div>
                        )}
                        {error && (
                            <p
                                role="alert"
                                className="mt-3"
                                style={{
                                    color: "var(--theme-status-error-stroke)",
                                }}
                            >
                                {error}
                            </p>
                        )}
                        <PlanBeats
                            section={{ id: section.id, beats }}
                            onChange={setBeats}
                            projectSlug={projectSlug}
                            workSlug={workSlug}
                            canUpdate={canUpdate}
                        />
                    </div>
                    <ModalFooter>
                        {editing ? (
                            <>
                                <Button
                                    variant="ghost"
                                    disabled={saving}
                                    onClick={() => {
                                        setEditing(false);
                                        setError("");
                                    }}
                                >
                                    {t("writing.form.cancel")}
                                </Button>
                                <Button loading={saving} onClick={save}>
                                    {t("writing.settings.save")}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="ghost" onClick={close}>
                                    {t("writing.plan.close")}
                                </Button>
                                {canUpdate && (
                                    <Button
                                        onClick={startEditing}
                                        icon="fa-solid fa-pen"
                                        iconPosition="before"
                                    >
                                        {t("writing.plan.edit")}
                                    </Button>
                                )}
                            </>
                        )}
                    </ModalFooter>
                </FocusTrap>
            </Modal>
        </>
    );
}
