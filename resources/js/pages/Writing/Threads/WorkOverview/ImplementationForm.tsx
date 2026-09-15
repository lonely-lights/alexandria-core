import { useEffect, useState } from "react";
import Input from "@alexandria/components/form/Input";
import Textarea from "@alexandria/components/form/Textarea";
import Button from "@alexandria/components/ui/Button";
import Modal, {
    ModalFooter,
    ModalHeader,
} from "@alexandria/components/ui/Modal";
import useT from "@alexandria/hooks/useT";
import PatternCardModal from "../PatternCardModal";
import {
    createThread,
    updateThread,
    fetchCards,
    PATTERN_STANCES,
} from "../threadApi";
import type {
    PatternCard,
    PatternScopeType,
    PatternStance,
} from "../threadApi";
import DevicePicker from "./DevicePicker";
import PatternPicker from "./PatternPicker";
import type { WorkPatternSection, WorkPatternThread } from "./types";

export default function ImplementationForm({
    projectSlug,
    workId,
    sections,
    thread,
    initialCardId,
    onClose,
    onSaved,
}: {
    projectSlug: string;
    workId: number;
    sections: WorkPatternSection[];
    thread: WorkPatternThread | null;
    initialCardId?: number;
    onClose: () => void;
    onSaved: (id: number) => void;
}) {
    const t = useT();
    const [cards, setCards] = useState<PatternCard[] | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [creatingCard, setCreatingCard] = useState(false);
    const [cardId, setCardId] = useState(
        String(thread?.pattern_card_id ?? initialCardId ?? ""),
    );
    const [title, setTitle] = useState(thread?.title ?? "");
    const [notes, setNotes] = useState(thread?.notes ?? "");
    const [stance, setStance] = useState<PatternStance | "">(
        thread?.stance ?? "",
    );
    const [scope, setScope] = useState(
        thread ? `${thread.scope_type}:${thread.scope_id}` : `work:${workId}`,
    );
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);
    const selectedCard = cards?.find((card) => card.id === Number(cardId));
    const scopeOptions = [
        {
            value: `work:${workId}`,
            label: t("writing.threads.scope_this_work"),
        },
        ...sections.map((section) => ({
            value: `section:${section.id}`,
            label: `${"  ".repeat(section.depth)}${section.title}`,
        })),
    ];

    if (
        thread &&
        !scopeOptions.some(
            (option) =>
                option.value === `${thread.scope_type}:${thread.scope_id}`,
        )
    ) {
        scopeOptions.push({
            value: `${thread.scope_type}:${thread.scope_id}`,
            label:
                thread.scope_title ??
                t("writing.work_patterns.unavailable_scope"),
        });
    }

    async function loadCards() {
        setLoadError(false);
        const result = await fetchCards(projectSlug);
        setCards((current) =>
            result === null
                ? current
                : [
                      ...result,
                      ...(current ?? []).filter(
                          (card) => !result.some((item) => item.id === card.id),
                      ),
                  ],
        );
        setLoadError(result === null);
    }
    useEffect(() => {
        let active = true;
        void fetchCards(projectSlug).then((result) => {
            if (active) {
                setCards((current) =>
                    result === null
                        ? current
                        : [
                              ...result,
                              ...(current ?? []).filter(
                                  (card) =>
                                      !result.some(
                                          (item) => item.id === card.id,
                                      ),
                              ),
                          ],
                );
                setLoadError(result === null);
            }
        });

        return () => {
            active = false;
        };
    }, [projectSlug]);

    function close() {
        if (!busy) {
            onClose();
        }
    }
    async function save() {
        if (busy || !selectedCard || !title.trim()) {
            return;
        }

        setBusy(true);
        setError(false);
        const [scopeType, scopeId] = scope.split(":");
        const input = {
            pattern_card_id: selectedCard.id,
            title: title.trim(),
            notes: notes.trim() || null,
            stance: stance || null,
            scope_type: scopeType as PatternScopeType,
            scope_id: Number(scopeId),
            entry_id: thread?.entry_id ?? null,
        };
        const result = thread
            ? await updateThread(projectSlug, thread.id, input)
            : await createThread(projectSlug, input);
        setBusy(false);

        if (result === null) {
            setError(true);

            return;
        }

        onSaved(result.id);
    }

    return (
        <>
            <Modal
                open={!creatingCard}
                onClose={close}
                dismissible={!busy}
                maxWidth="max-w-xl"
            >
                <ModalHeader
                    title={t(
                        `writing.work_patterns.${thread ? "edit_implementation" : "new_implementation"}`,
                    )}
                    onClose={close}
                />
                <form
                    className="flex min-h-0 flex-col"
                    data-implementation-form
                    onSubmit={(event) => {
                        event.preventDefault();
                        void save();
                    }}
                >
                    <div className="min-h-0 space-y-5 overflow-y-auto px-6 py-5">
                        <DevicePicker
                            cards={cards}
                            cardId={cardId}
                            busy={busy}
                            failed={loadError}
                            archived={thread?.card.archived ?? false}
                            onChange={setCardId}
                            onRetry={() => void loadCards()}
                            onCreate={() => setCreatingCard(true)}
                        />
                        <Input
                            id="implementation-title"
                            label={t(
                                "writing.work_patterns.implementation_title",
                            )}
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            maxLength={160}
                            required
                            autoFocus
                            disabled={busy}
                            size="md"
                        />
                        <Textarea
                            id="implementation-notes"
                            label={t("writing.work_patterns.intent_notes")}
                            hint={t("writing.work_patterns.intent_hint")}
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            rows={4}
                            disabled={busy}
                            size="md"
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <PatternPicker
                                id="implementation-scope"
                                label={t("writing.threads.detail_scope_label")}
                                options={scopeOptions}
                                value={scope}
                                onChange={(value) => setScope(value)}
                                disabled={busy}
                            />
                            <PatternPicker
                                id="implementation-stance"
                                label={t("writing.threads.detail_stance_label")}
                                options={[
                                    {
                                        value: "",
                                        label: t("writing.threads.stance_none"),
                                    },
                                    ...PATTERN_STANCES.map((value) => ({
                                        value,
                                        label: t(
                                            `writing.threads.stance_${value}`,
                                        ),
                                    })),
                                ]}
                                value={stance}
                                onChange={(value) =>
                                    setStance(value as PatternStance | "")
                                }
                                disabled={busy}
                            />
                        </div>
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
                        <Button
                            type="submit"
                            loading={busy}
                            disabled={!selectedCard || !title.trim()}
                        >
                            {t(
                                `writing.work_patterns.${thread ? "save_implementation" : "create_implementation"}`,
                            )}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>
            {creatingCard && (
                <PatternCardModal
                    projectSlug={projectSlug}
                    card={null}
                    existingKinds={[
                        ...new Set((cards ?? []).map((card) => card.kind)),
                    ]}
                    onClose={() => setCreatingCard(false)}
                    onSaved={(card) => {
                        setCards((current) => [...(current ?? []), card]);
                        setCardId(String(card.id));
                        setLoadError(false);
                        setCreatingCard(false);
                    }}
                />
            )}
        </>
    );
}
