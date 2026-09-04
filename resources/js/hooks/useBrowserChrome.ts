import { useLayoutEffect, useRef } from "react";

/** Keep browser tint in sync with the active header, including scoped themes. */
export function useBrowserChrome<T extends HTMLElement>() {
    const ref = useRef<T>(null);

    useLayoutEffect(() => {
        const header = ref.current;
        const meta = document.querySelector<HTMLMetaElement>(
            'meta[name="theme-color"]',
        );
        if (!header || !meta) return;

        const previous = meta.content;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;

        let frame = 0;
        const update = () => {
            // Canvas converts computed color-mix/OKLCH to an opaque sRGB hex,
            // which browser chrome accepts even on older Safari versions.
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = getComputedStyle(document.body).backgroundColor;
            context.fillRect(0, 0, 1, 1);
            context.fillStyle = getComputedStyle(header).backgroundColor;
            context.fillRect(0, 0, 1, 1);
            const pixel = context.getImageData(0, 0, 1, 1).data;
            meta.content =
                "#" +
                Array.from(pixel.slice(0, 3), (value) =>
                    value.toString(16).padStart(2, "0"),
                ).join("");
        };
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(update);
        };
        const observer = new MutationObserver(schedule);
        // ThemeProvider writes scoped tokens on body/main, not just html.
        for (
            let node: HTMLElement | null = header;
            node;
            node = node.parentElement
        ) {
            observer.observe(node, {
                attributes: true,
                attributeFilter: ["style", "class", "data-theme"],
            });
        }
        window.addEventListener("resize", schedule);
        header.addEventListener("transitionend", schedule);
        update();

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener("resize", schedule);
            header.removeEventListener("transitionend", schedule);
            meta.content = previous;
        };
    }, []);

    return ref;
}
