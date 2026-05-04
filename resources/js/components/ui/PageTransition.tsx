import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';

/**
 * Cinematic page transitions for Alexandria.
 *
 * Usage:
 *   import { triggerPageTransition } from '@alexandria/components/ui/PageTransition';
 *   await triggerPageTransition();
 *   router.visit('/target');
 *
 * Add new transitions by implementing TransitionStyle and pushing to TRANSITIONS.
 */

const TRANSITION_KEY = 'alexandria:page_transition';
const STYLE_KEY = 'alexandria:transition_style';

/* ── Transition Style Interface ── */

interface TransitionStyle {
    name: string;
    createPanels: (container: HTMLDivElement) => void;
    close: (container: HTMLDivElement, onComplete: () => void) => void;
    open: (container: HTMLDivElement, onComplete: () => void) => void;
}

/* ── Helper ── */

function el(tag: string, className: string, dataset?: Record<string, string>): HTMLElement {
    const node = document.createElement(tag);
    node.className = className;
    if (dataset) Object.entries(dataset).forEach(([k, v]) => { node.dataset[k] = v; });
    return node;
}

function clearContainer(container: HTMLDivElement) {
    while (container.firstChild) container.removeChild(container.firstChild);
}

/* ══════════════════════════════════════════════════════════════
 *  TRANSITION: Alexandria Curtain
 *  Two panels close from left/right. Once sealed, a constellation
 *  of particles drifts across, a glowing seam pulses at the center,
 *  and geometric rings orbit outward. On reveal, the seam splits
 *  and the panels part with the particles scattering.
 * ══════════════════════════════════════════════════════════════ */

const PARTICLE_COUNT = 24;

const alexandriaCurtain: TransitionStyle = {
    name: 'alexandria',
    createPanels(container) {
        clearContainer(container);

        // Left panel
        const left = el('div', 'absolute inset-y-0 left-0 w-1/2', { panel: 'left' });
        left.style.background = 'linear-gradient(90deg, oklch(var(--b3)), oklch(var(--b2)))';
        container.appendChild(left);

        // Right panel
        const right = el('div', 'absolute inset-y-0 right-0 w-1/2', { panel: 'right' });
        right.style.background = 'linear-gradient(270deg, oklch(var(--b3)), oklch(var(--b2)))';
        container.appendChild(right);

        // Center seam glow
        const seam = el('div', 'absolute', { panel: 'seam' });
        Object.assign(seam.style, {
            top: '0', left: '50%', transform: 'translateX(-50%)',
            width: '4px', height: '100%', opacity: '0',
            background: 'linear-gradient(180deg, oklch(var(--p) / 0.1), oklch(var(--p) / 0.8), oklch(var(--p) / 0.1))',
            boxShadow: '0 0 20px 6px oklch(var(--p) / 0.3)',
        });
        container.appendChild(seam);

        // Geometric rings
        for (let i = 0; i < 3; i++) {
            const ring = el('div', 'absolute rounded-full', { panel: `ring-${i}` });
            const size = 80 + i * 60;
            Object.assign(ring.style, {
                top: '50%', left: '50%', width: `${size}px`, height: `${size}px`,
                transform: 'translate(-50%, -50%) scale(0)',
                border: `1px solid oklch(var(--p) / ${0.3 - i * 0.08})`,
                opacity: '0',
            });
            container.appendChild(ring);
        }

        // Floating particles
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const particle = el('div', 'absolute rounded-full', { panel: `particle-${i}` });
            const size = 2 + Math.random() * 3;
            Object.assign(particle.style, {
                width: `${size}px`, height: `${size}px`,
                top: `${10 + Math.random() * 80}%`,
                left: `${10 + Math.random() * 80}%`,
                background: `oklch(var(--p) / ${0.3 + Math.random() * 0.5})`,
                boxShadow: `0 0 ${4 + Math.random() * 6}px oklch(var(--p) / 0.3)`,
                opacity: '0',
            });
            container.appendChild(particle);
        }

        // Subtle horizontal scan line
        const scanline = el('div', 'absolute left-0 w-full', { panel: 'scanline' });
        Object.assign(scanline.style, {
            top: '-2px', height: '2px', opacity: '0',
            background: 'linear-gradient(90deg, transparent, oklch(var(--p) / 0.6), transparent)',
        });
        container.appendChild(scanline);
    },

    close(container, onComplete) {
        const left = container.querySelector('[data-panel="left"]') as HTMLElement;
        const right = container.querySelector('[data-panel="right"]') as HTMLElement;
        const seam = container.querySelector('[data-panel="seam"]') as HTMLElement;
        const rings = container.querySelectorAll<HTMLElement>('[data-panel^="ring-"]');
        const particles = container.querySelectorAll<HTMLElement>('[data-panel^="particle-"]');
        const scanline = container.querySelector('[data-panel="scanline"]') as HTMLElement;

        // Main timeline — fires onComplete when curtains are sealed
        const tl = gsap.timeline({ onComplete });

        // 1. Curtains slide in
        tl.fromTo(left, { x: '-100%' }, { x: '0%', duration: 0.4, ease: 'power3.inOut' }, 0)
            .fromTo(right, { x: '100%' }, { x: '0%', duration: 0.4, ease: 'power3.inOut' }, 0);

        // 2. Seam ignites where they meet
        tl.to(seam, { opacity: 1, duration: 0.2, ease: 'power2.out' }, 0.35)
            .to(seam, {
                boxShadow: '0 0 40px 12px oklch(var(--p) / 0.5)',
                duration: 0.3, ease: 'power2.out',
            }, 0.4);

        // 3. Scan line sweeps down
        tl.to(scanline, { opacity: 0.8, top: '100%', duration: 0.6, ease: 'power1.inOut' }, 0.3);

        // Ambient effects — separate from the main timeline so they don't block onComplete

        // 4. Rings pulse outward from center
        rings.forEach((ring, i) => {
            gsap.to(ring, {
                opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out', delay: 0.4 + i * 0.08,
            });
            gsap.to(ring, {
                scale: 1.5, opacity: 0, duration: 0.6, ease: 'power1.out', delay: 0.7 + i * 0.08,
            });
        });

        // 5. Particles fade in and drift gently
        particles.forEach((p) => {
            const driftX = -30 + Math.random() * 60;
            const driftY = -20 + Math.random() * 40;
            gsap.to(p, { opacity: 1, duration: 0.3, delay: 0.45 + Math.random() * 0.2 });
            gsap.to(p, {
                x: driftX, y: driftY, duration: 1.5 + Math.random(),
                ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 0.45,
            });
        });
    },

    open(container, onComplete) {
        const left = container.querySelector('[data-panel="left"]') as HTMLElement;
        const right = container.querySelector('[data-panel="right"]') as HTMLElement;
        const seam = container.querySelector('[data-panel="seam"]') as HTMLElement;
        const particles = container.querySelectorAll<HTMLElement>('[data-panel^="particle-"]');
        const scanline = container.querySelector('[data-panel="scanline"]') as HTMLElement;

        const tl = gsap.timeline({ onComplete });

        // Kill any looping tweens on particles
        particles.forEach((p) => gsap.killTweensOf(p));

        // 1. Seam flares bright
        tl.to(seam, {
            boxShadow: '0 0 60px 20px oklch(var(--p) / 0.7)',
            width: '8px', duration: 0.15, ease: 'power2.in',
        }, 0);

        // 2. Particles scatter outward from center
        particles.forEach((p) => {
            const rect = p.getBoundingClientRect();
            const cx = window.innerWidth / 2;
            const dx = rect.left - cx;
            const scatterX = dx * 3;
            const scatterY = (Math.random() - 0.5) * 400;
            tl.to(p, {
                x: scatterX, y: scatterY, opacity: 0,
                duration: 0.4, ease: 'power2.in',
            }, 0.1);
        });

        // 3. Scan line zips back up
        tl.to(scanline, { opacity: 0, top: '-2px', duration: 0.3, ease: 'power2.in' }, 0);

        // 4. Seam fades and curtains part
        tl.to(seam, { opacity: 0, width: '2px', duration: 0.2 }, 0.2)
            .to(left, { x: '-100%', duration: 0.45, ease: 'power3.out' }, 0.25)
            .to(right, { x: '100%', duration: 0.45, ease: 'power3.out' }, 0.25);
    },
};

/* ══════════════════════════════════════════════════════════════
 *  REGISTRY — Add more TransitionStyle objects here
 * ══════════════════════════════════════════════════════════════ */

const TRANSITIONS: TransitionStyle[] = [alexandriaCurtain];

function getTransitionByName(name: string): TransitionStyle {
    return TRANSITIONS.find((t) => t.name === name) ?? TRANSITIONS[0];
}

function getRandomTransition(): TransitionStyle {
    return TRANSITIONS[Math.floor(Math.random() * TRANSITIONS.length)];
}

/* ── Public API ── */

export function triggerPageTransition(): Promise<void> {
    return new Promise((resolve) => {
        const style = getRandomTransition();
        sessionStorage.setItem(TRANSITION_KEY, '1');
        sessionStorage.setItem(STYLE_KEY, style.name);
        window.dispatchEvent(
            new CustomEvent('alexandria:transition-close', {
                detail: { styleName: style.name, onComplete: resolve },
            }),
        );
    });
}

/* ── Component ── */

export default function PageTransition() {
    const containerRef = useRef<HTMLDivElement>(null);

    const show = useCallback(() => {
        if (containerRef.current) containerRef.current.style.display = 'block';
    }, []);

    const hide = useCallback(() => {
        if (!containerRef.current) return;
        containerRef.current.style.display = 'none';
        gsap.killTweensOf(containerRef.current.querySelectorAll('*'));
        clearContainer(containerRef.current);
    }, []);

    // Listen for close trigger (before navigation)
    useEffect(() => {
        function handleClose(e: Event) {
            const { styleName, onComplete } = (e as CustomEvent).detail ?? {};
            const style = getTransitionByName(styleName);
            if (!containerRef.current) {
                onComplete?.();
                return;
            }
            show();
            style.createPanels(containerRef.current);
            style.close(containerRef.current, () => onComplete?.());
        }

        window.addEventListener('alexandria:transition-close', handleClose);
        return () => window.removeEventListener('alexandria:transition-close', handleClose);
    }, [show]);

    // On mount: if transition flag set, play the reveal
    useEffect(() => {
        const shouldReveal = sessionStorage.getItem(TRANSITION_KEY);
        const styleName = sessionStorage.getItem(STYLE_KEY) ?? '';
        if (!shouldReveal || !containerRef.current) return;

        sessionStorage.removeItem(TRANSITION_KEY);
        sessionStorage.removeItem(STYLE_KEY);

        const style = getTransitionByName(styleName);
        show();
        style.createPanels(containerRef.current);

        // Position panels as "closed"
        const left = containerRef.current.querySelector('[data-panel="left"]') as HTMLElement | null;
        const right = containerRef.current.querySelector('[data-panel="right"]') as HTMLElement | null;
        const seam = containerRef.current.querySelector('[data-panel="seam"]') as HTMLElement | null;
        if (left) gsap.set(left, { x: '0%' });
        if (right) gsap.set(right, { x: '0%' });
        if (seam) gsap.set(seam, { opacity: 1 });

        // Brief hold, then reveal
        setTimeout(() => {
            if (containerRef.current) {
                style.open(containerRef.current, hide);
            }
        }, 300);
    }, [show, hide]);

    return createPortal(
        <div
            ref={containerRef}
            className="pointer-events-none fixed inset-0 z-[2147483647]"
            style={{ display: 'none' }}
        />,
        document.body,
    );
}
