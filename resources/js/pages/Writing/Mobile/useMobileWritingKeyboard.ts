import { useEffect, useRef, useState } from "react";

const KEYBOARD_HEIGHT_THRESHOLD = 120;

export interface MobileWritingKeyboardState {
    visible: boolean;
    bottomOffset: number;
}

function isWritingEditorTarget(target: EventTarget | null): boolean {
    if (
        !(target instanceof HTMLElement) ||
        target.closest(".writing-workspace-shell") === null
    ) {
        return false;
    }

    return (
        target.matches("textarea") ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]') !== null
    );
}

/**
 * Detect the software keyboard only while a writing editor owns focus.
 * VisualViewport is available on current iOS/Android browsers and lets the
 * strip sit above the obscured part of the layout viewport without treating
 * ordinary inputs elsewhere in the workspace as writing mode.
 */
export default function useMobileWritingKeyboard(): MobileWritingKeyboardState {
    const [state, setState] = useState<MobileWritingKeyboardState>({
        visible: false,
        bottomOffset: 0,
    });
    const baselineHeightRef = useRef(0);

    useEffect(() => {
        const viewport = window.visualViewport;
        const currentHeight = viewport?.height ?? window.innerHeight;
        baselineHeightRef.current = Math.max(window.innerHeight, currentHeight);
        const timers = new Set<ReturnType<typeof setTimeout>>();

        const update = () => {
            const mobile = window.matchMedia("(max-width: 1023px)").matches;
            const editorFocused = isWritingEditorTarget(document.activeElement);
            const visualHeight = viewport?.height ?? window.innerHeight;

            if (!mobile || !editorFocused) {
                baselineHeightRef.current = Math.max(
                    window.innerHeight,
                    visualHeight,
                );
                setState((current) =>
                    current.visible || current.bottomOffset !== 0
                        ? { visible: false, bottomOffset: 0 }
                        : current,
                );
                return;
            }

            const visualBottom = (viewport?.offsetTop ?? 0) + visualHeight;
            // iOS may shrink window.innerHeight alongside visualViewport.
            // Positioning against that already-shrunken value produces a
            // zero offset and leaves the fixed strip behind the keyboard.
            // The pre-focus baseline is the layout viewport we need to clear.
            const obscuredLayout = Math.max(
                0,
                baselineHeightRef.current - visualBottom,
            );
            const heightReduction = Math.max(
                0,
                baselineHeightRef.current - visualHeight,
            );
            const visible =
                viewport !== undefined &&
                Math.max(obscuredLayout, heightReduction) >=
                    KEYBOARD_HEIGHT_THRESHOLD;

            setState({
                visible,
                bottomOffset: visible ? obscuredLayout : 0,
            });
        };

        const scheduleUpdate = () => {
            window.requestAnimationFrame(update);
            for (const delay of [80, 280]) {
                const timer = setTimeout(() => {
                    timers.delete(timer);
                    update();
                }, delay);
                timers.add(timer);
            }
        };

        document.addEventListener("focusin", scheduleUpdate);
        document.addEventListener("focusout", scheduleUpdate);
        window.addEventListener("resize", update);
        viewport?.addEventListener("resize", update);
        viewport?.addEventListener("scroll", update);

        return () => {
            document.removeEventListener("focusin", scheduleUpdate);
            document.removeEventListener("focusout", scheduleUpdate);
            window.removeEventListener("resize", update);
            viewport?.removeEventListener("resize", update);
            viewport?.removeEventListener("scroll", update);
            for (const timer of timers) {
                clearTimeout(timer);
            }
        };
    }, []);

    return state;
}
