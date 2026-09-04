import type { ReactNode } from "react";
import Modal, { ModalHeader } from "@alexandria/components/ui/Modal";

/** One mounted companion instance: docked on desktop, deliberate overlay on mobile. */
export default function WritingCompanion({
    compact,
    open,
    title,
    onClose,
    children,
}: {
    compact: boolean;
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
}) {
    if (compact) {
        return (
            <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
                <ModalHeader title={title} onClose={onClose} />
                <div
                    className="flex min-h-0 flex-col"
                    style={{ height: "min(70dvh, 44rem)" }}
                >
                    {children}
                </div>
            </Modal>
        );
    }

    return (
        <aside
            className="flex min-h-0 w-80 shrink-0 flex-col border-l"
            style={{ borderColor: "var(--theme-base-400)" }}
        >
            {children}
        </aside>
    );
}
