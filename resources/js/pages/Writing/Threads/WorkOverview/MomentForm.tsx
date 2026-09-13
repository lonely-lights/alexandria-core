import { useState } from "react";
import Select from "@alexandria/components/form/Select";
import Textarea from "@alexandria/components/form/Textarea";
import Button from "@alexandria/components/ui/Button";
import Modal, {
    ModalFooter,
    ModalHeader,
} from "@alexandria/components/ui/Modal";
import useT from "@alexandria/hooks/useT";
import { createMark, updateMark } from "../threadApi";
import type { PatternMarkRole } from "../threadApi";
import { MOMENT_ROLES } from "./types";
import type {
    WorkPatternMoment,
    WorkPatternSection,
    WorkPatternThread,
} from "./types";

export default function MomentForm({
    projectSlug,
    thread,
    sections,
    moment,
    initialRole = "setup",
    onClose,
    onSaved,
}: {
    projectSlug: string;
    thread: WorkPatternThread;
    sections: WorkPatternSection[];
    moment: WorkPatternMoment | null;
    initialRole?: PatternMarkRole;
    onClose: () => void;
    onSaved: () => void;
}) {
    const t = useT();
    const [role, setRole] = useState<PatternMarkRole>(
        moment?.role ?? initialRole,
    );
    const [sectionId, setSectionId] = useState(
        String(moment?.work_section_id ?? ""),
    );
    const [quote, setQuote] = useState(moment?.anchor_text ?? "");
    const [note, setNote] = useState(moment?.note ?? "");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);
    function close() {
        if (!busy) {
            onClose();
        }
    }
    async function save() {
        if (busy || !sectionId) {
            return;
        }

        setBusy(true);
        setError(false);
        const anchorText = quote.trim() ? quote : null;
        const input = {
            role,
            work_section_id: Number(sectionId),
            anchor_text: anchorText,
            note: note.trim() || null,
            anchor_offset_hint:
                moment &&
                moment.work_section_id === Number(sectionId) &&
                moment.anchor_text === anchorText
                    ? moment.anchor_offset_hint
                    : null,
        };
        const result = moment
            ? await updateMark(projectSlug, moment.id, input)
            : await createMark(projectSlug, thread.id, input);
        setBusy(false);

        if (result === null) {
            setError(true);

            return;
        }

        onSaved();
    }

    return (
        <Modal open onClose={close} dismissible={!busy} maxWidth="max-w-xl">
            <ModalHeader
                title={t(
                    `writing.work_patterns.${moment ? "edit_moment" : "add_moment"}`,
                )}
                onClose={close}
            />
            <form
                className="flex min-h-0 flex-col"
                data-moment-form
                onSubmit={(event) => {
                    event.preventDefault();
                    void save();
                }}
            >
                <div className="min-h-0 space-y-5 overflow-y-auto px-6 py-5">
                    <p className="font-serif text-lg">{thread.title}</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Select
                            id="moment-role"
                            label={t("writing.threads.role_label")}
                            options={MOMENT_ROLES.map((value) => ({
                                value,
                                label: t(`writing.work_patterns.role_${value}`),
                            }))}
                            value={role}
                            onChange={(event) =>
                                setRole(event.target.value as PatternMarkRole)
                            }
                            disabled={busy}
                            size="md"
                        />
                        <Select
                            id="moment-section"
                            label={t("writing.work_patterns.scene_chapter")}
                            options={sections.map((section) => ({
                                value: section.id,
                                label: `${"  ".repeat(section.depth)}${section.title}`,
                            }))}
                            placeholder={t(
                                "writing.work_patterns.choose_section",
                            )}
                            value={sectionId}
                            onChange={(event) =>
                                setSectionId(event.target.value)
                            }
                            disabled={busy}
                            required
                            size="md"
                        />
                    </div>
                    <Textarea
                        id="moment-quote"
                        label={t("writing.work_patterns.passage")}
                        hint={t("writing.work_patterns.passage_hint")}
                        rows={4}
                        value={quote}
                        onChange={(event) => setQuote(event.target.value)}
                        disabled={busy}
                        size="md"
                    />
                    <Textarea
                        id="moment-note"
                        label={t("writing.work_patterns.moment_note")}
                        rows={3}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        disabled={busy}
                        size="md"
                    />
                    {error && (
                        <p role="alert" className="pattern-error">
                            {t("writing.work_patterns.save_error")}
                        </p>
                    )}
                </div>
                <ModalFooter>
                    <Button
                        variant="ghost"
                        type="button"
                        disabled={busy}
                        onClick={close}
                    >
                        {t("writing.form.cancel")}
                    </Button>
                    <Button type="submit" loading={busy} disabled={!sectionId}>
                        {t("writing.work_patterns.save_moment")}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
