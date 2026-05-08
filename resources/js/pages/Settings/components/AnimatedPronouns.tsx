import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

/**
 * Inline pronoun chip with enter/exit + crossfade animation. Lives in
 * the profile-card preview block under the avatar — animates in when
 * the user enables pronouns, out when they clear them, and crossfades
 * when the pronoun list itself changes.
 */
export default function AnimatedPronouns({
    pronouns,
    labels,
}: {
    pronouns: string[];
    labels: Record<string, string>;
}) {
    const containerRef = useRef<HTMLSpanElement>(null);
    const [displayed, setDisplayed] = useState(pronouns);
    const [visible, setVisible] = useState(pronouns.length > 0);

    function formatPronouns(keys: string[]): string {
        return keys.map((k) => labels[k] ?? k).join(', ');
    }

    useEffect(() => {
        const container = containerRef.current;

        if (pronouns.length > 0 && !visible) {
            setDisplayed(pronouns);
            setVisible(true);
            if (container) {
                gsap.fromTo(container, { opacity: 0, x: -8, scale: 0.95 }, { opacity: 1, x: 0, scale: 1, duration: 0.3, ease: 'back.out(1.4)' });
            }
        } else if (pronouns.length === 0 && visible) {
            if (container) {
                gsap.to(container, {
                    opacity: 0, x: -8, scale: 0.95, duration: 0.2, ease: 'power2.in',
                    onComplete: () => { setVisible(false); setDisplayed([]); },
                });
            } else {
                setVisible(false);
                setDisplayed([]);
            }
        } else if (pronouns.length > 0 && visible) {
            setDisplayed(pronouns);
            if (container) {
                gsap.fromTo(container, { opacity: 0.4 }, { opacity: 1, duration: 0.25, ease: 'power1.out' });
            }
        }
    }, [pronouns]);

    if (!visible) return null;

    return (
        <span ref={containerRef} className="inline-block">
            <span className="mx-1 text-base-content/30">·</span>
            <span>{formatPronouns(displayed)}</span>
        </span>
    );
}
