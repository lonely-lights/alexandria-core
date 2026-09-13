import Select from "@alexandria/components/form/Select";
import Button from "@alexandria/components/ui/Button";
import useT from "@alexandria/hooks/useT";
import type { PatternCard } from "../threadApi";
export default function DevicePicker({
    cards,
    cardId,
    busy,
    failed,
    archived,
    onChange,
    onRetry,
    onCreate,
}: {
    cards: PatternCard[] | null;
    cardId: string;
    busy: boolean;
    failed: boolean;
    archived: boolean;
    onChange: (value: string) => void;
    onRetry: () => void;
    onCreate: () => void;
}) {
    const t = useT();
    const selectedCard = cards?.find((card) => card.id === Number(cardId));

    return (
        <div className="space-y-2">
            <Select
                id="implementation-card"
                label={t("writing.work_patterns.device_label")}
                value={cardId}
                onChange={(event) => onChange(event.target.value)}
                required
                disabled={busy || cards === null}
                size="md"
                placeholder={t("writing.work_patterns.choose_device")}
                options={(cards ?? []).map((card) => ({
                    value: card.id,
                    label: card.name,
                }))}
            />
            {failed && (
                <div role="alert">
                    <p>{t("writing.work_patterns.library_error")}</p>
                    <Button
                        variant="ghost"
                        type="button"
                        onClick={() => onRetry()}
                    >
                        {t("writing.work_patterns.retry")}
                    </Button>
                </div>
            )}
            {cards === null && !failed && (
                <p role="status" className="text-xs opacity-70">
                    {t("writing.work_patterns.loading_library")}
                </p>
            )}
            {archived && !selectedCard && (
                <p className="text-xs opacity-70">
                    {t("writing.work_patterns.archived_hint")}
                </p>
            )}
            {selectedCard && (
                <p className="text-xs leading-relaxed opacity-70">
                    {selectedCard.definition}
                </p>
            )}
            <Button
                variant="ghost"
                size="sm"
                type="button"
                disabled={busy}
                onClick={() => onCreate()}
                icon="fa-solid fa-plus"
            >
                {t("writing.work_patterns.new_device")}
            </Button>
        </div>
    );
}
