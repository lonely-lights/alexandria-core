import { useEffect, useState } from "react";
import Button from "@alexandria/components/ui/Button";
import Modal, { ModalHeader } from "@alexandria/components/ui/Modal";
import useT from "@alexandria/hooks/useT";
import PatternCardModal from "../PatternCardModal";
import { fetchCards } from "../threadApi";
import type { PatternCard } from "../threadApi";

export default function DeviceForm({
    projectSlug,
    cardId,
    onClose,
    onSaved,
}: {
    projectSlug: string;
    cardId: number;
    onClose: () => void;
    onSaved: () => void;
}) {
    const t = useT();
    const [cards, setCards] = useState<PatternCard[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        void fetchCards(projectSlug).then((result) => {
            if (active) {
                setCards(result);
                setFailed(
                    result === null ||
                        !result.some((card) => card.id === cardId),
                );
            }
        });

        return () => {
            active = false;
        };
    }, [projectSlug, cardId, attempt]);
    const card = cards?.find((item) => item.id === cardId);

    if (card) {
        return (
            <PatternCardModal
                projectSlug={projectSlug}
                card={card}
                existingKinds={[
                    ...new Set((cards ?? []).map((item) => item.kind)),
                ]}
                onClose={onClose}
                onSaved={onSaved}
            />
        );
    }

    return (
        <Modal open onClose={onClose}>
            <ModalHeader
                title={t("writing.work_patterns.edit_definition")}
                onClose={onClose}
            />
            <div className="space-y-3 p-6">
                <p role={failed ? "alert" : "status"}>
                    {t(
                        `writing.work_patterns.${failed ? "library_error" : "loading_library"}`,
                    )}
                </p>
                {failed && (
                    <Button
                        onClick={() => {
                            setFailed(false);
                            setAttempt((value) => value + 1);
                        }}
                    >
                        {t("writing.work_patterns.retry")}
                    </Button>
                )}
            </div>
        </Modal>
    );
}
