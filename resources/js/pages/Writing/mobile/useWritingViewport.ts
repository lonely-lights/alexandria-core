import { useEffect, useState } from "react";

export interface WritingViewport {
    compact: boolean;
    height: number;
    top: number;
    keyboard: boolean;
    editing: boolean;
}

/** Visual viewport changes are not necessarily a keyboard: preserve pinch zoom. */
export function measureWritingViewport(): WritingViewport {
    const viewport = window.visualViewport;
    const active = document.activeElement;
    const editing = active instanceof HTMLElement && active.isContentEditable;
    const input =
        editing ||
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement;

    return {
        compact: window.matchMedia("(max-width: 1023px)").matches,
        height: viewport?.height ?? window.innerHeight,
        top: viewport?.offsetTop ?? 0,
        keyboard:
            input &&
            Math.abs((viewport?.scale ?? 1) - 1) < 0.05 &&
            window.innerHeight - (viewport?.height ?? window.innerHeight) > 120,
        editing,
    };
}

export default function useWritingViewport() {
    const [viewport, setViewport] = useState<WritingViewport>(() =>
        typeof window === "undefined"
            ? {
                  compact: false,
                  height: 0,
                  top: 0,
                  keyboard: false,
                  editing: false,
              }
            : measureWritingViewport(),
    );
    useEffect(() => {
        let frame = 0;
        const measure = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() =>
                setViewport(measureWritingViewport()),
            );
        };
        window.addEventListener("resize", measure);
        window.visualViewport?.addEventListener("resize", measure);
        window.visualViewport?.addEventListener("scroll", measure);
        document.addEventListener("focusin", measure);
        document.addEventListener("focusout", measure);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("resize", measure);
            window.visualViewport?.removeEventListener("resize", measure);
            window.visualViewport?.removeEventListener("scroll", measure);
            document.removeEventListener("focusin", measure);
            document.removeEventListener("focusout", measure);
        };
    }, []);

    return viewport;
}
