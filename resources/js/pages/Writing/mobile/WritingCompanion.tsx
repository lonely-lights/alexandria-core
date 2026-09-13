import type { ReactNode } from "react";
import Modal, { ModalHeader } from "@alexandria/components/ui/Modal";
import useCollapsePresence from "@alexandria/hooks/useCollapsePresence";

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
    const present = useCollapsePresence(open);

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
            className="writing-companion-collapse"
            data-open={open}
            inert={!open}
            aria-hidden={!open}
        >
            <div className="writing-companion-content flex min-h-0 w-80 shrink-0 flex-col border-l" style={{ borderColor: "var(--theme-base-400)" }}>
                {present && children}
            </div>
        </aside>
    );
}
