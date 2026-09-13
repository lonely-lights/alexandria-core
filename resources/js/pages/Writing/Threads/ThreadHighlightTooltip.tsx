import Tooltip from '@alexandria/components/ui/Tooltip';
import { threadHighlightsKey } from '@alexandria/editor/extensions/threadHighlights';
import type { Editor } from '@tiptap/core';
import { useEffect, useState } from 'react';

/** The editor owns the highlighted spans; React owns their shared tooltip. */
export default function ThreadHighlightTooltip({ editor }: { editor: Editor }) {
    const [target, setTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const dom = editor.view.dom;
        let timer: ReturnType<typeof setTimeout> | undefined;
        function hide() {
            clearTimeout(timer);
            setTarget(null);
        }
        function highlight(node: EventTarget | null) {
            return node instanceof Element
                ? node.closest<HTMLElement>('[data-thread-highlight]')
                : null;
        }
        function show(event: PointerEvent | FocusEvent) {
            if (
                'pointerType' in event &&
                (event.pointerType === 'touch' || event.buttons)
            ) {
                return;
            }

            const span = highlight(event.target);

            if (!span || !dom.contains(span) || !editor.state.selection.empty) {
                return;
            }

            clearTimeout(timer);

            if (event.type === 'focusin') {
                setTarget(span);
            } else {
                timer = setTimeout(() => setTarget(span), 200);
            }
        }
        function leave(event: PointerEvent | FocusEvent) {
            if (highlight(event.target) !== highlight(event.relatedTarget)) {
                hide();
            }
        }
        dom.addEventListener('pointerover', show);
        dom.addEventListener('pointerout', leave);
        dom.addEventListener('focusin', show);
        dom.addEventListener('focusout', leave);
        dom.addEventListener('pointerdown', hide);
        dom.addEventListener('keydown', hide, true);
        editor.on('transaction', hide);
        window.addEventListener('blur', hide);
        window.addEventListener('beforeprint', hide);

        return () => {
            clearTimeout(timer);
            dom.removeEventListener('pointerover', show);
            dom.removeEventListener('pointerout', leave);
            dom.removeEventListener('focusin', show);
            dom.removeEventListener('focusout', leave);
            dom.removeEventListener('pointerdown', hide);
            dom.removeEventListener('keydown', hide, true);
            editor.off('transaction', hide);
            window.removeEventListener('blur', hide);
            window.removeEventListener('beforeprint', hide);
        };
    }, [editor]);

    const markIds = new Set(
        target?.getAttribute('data-thread-marks')?.split(',').map(Number),
    );
    const marks = (threadHighlightsKey.getState(editor.state) ?? []).filter(
        (mark) => markIds.has(mark.id),
    );

    return (
        <Tooltip
            reference={target}
            open={target !== null}
            variant="secondary"
            content={
                <div className="space-y-3 py-0.5">
                    {marks.map((mark) => (
                        <div key={mark.id}>
                            <p className="m-0 leading-snug font-semibold">
                                {mark.title}
                            </p>
                            <ul className="m-0 mt-1.5 flex list-none flex-wrap gap-1 p-0">
                                {[mark.category, mark.role].map(
                                    (label, index) => (
                                        <li
                                            key={index}
                                            className="rounded px-1.5 py-0.5 text-[10px] leading-tight font-medium"
                                            style={{
                                                backgroundColor:
                                                    'color-mix(in srgb, currentColor 12%, transparent)',
                                            }}
                                        >
                                            {label}
                                        </li>
                                    ),
                                )}
                            </ul>
                        </div>
                    ))}
                </div>
            }
        />
    );
}
