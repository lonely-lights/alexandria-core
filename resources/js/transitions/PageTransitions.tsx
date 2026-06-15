import { router, usePage } from '@inertiajs/react';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type MutableRefObject,
    type ReactNode,
} from 'react';

import {
    DEFAULT_TRANSITION_KEY,
    getTransition,
    type PageTransitionStyle,
} from './transitionRegistry';
import './transitions.css';

const PROGRESS_DELAY_MS = 250;
const PROGRESS_MIN_VISIBLE_MS = 250;

type ProgressState = {
    visible: boolean;
    percent: number;
};

type PartialVisitShape = {
    only?: string[];
    except?: string[];
    reset?: string[];
};

interface PageTransitionsProps {
    children: ReactNode;
}

function transitionKeyFromEventTarget(target: EventTarget | null): string {
    if (!(target instanceof Element)) {
        return DEFAULT_TRANSITION_KEY;
    }

    return target.closest('[data-transition]')?.getAttribute('data-transition')
        ?? DEFAULT_TRANSITION_KEY;
}

function isPartialVisit(visit: PartialVisitShape | undefined): boolean {
    return (
        (visit?.only?.length ?? 0) > 0
        || (visit?.except?.length ?? 0) > 0
        || (visit?.reset?.length ?? 0) > 0
    );
}

function clearTimer(ref: MutableRefObject<number | null>): void {
    if (ref.current !== null) {
        window.clearTimeout(ref.current);
        ref.current = null;
    }
}

export default function PageTransitions({ children }: PageTransitionsProps) {
    const page = usePage();
    const componentName = page.component;
    const shellRef = useRef<HTMLDivElement>(null);
    const currentComponentRef = useRef(componentName);
    const departingComponentRef = useRef<string | null>(null);
    const activeTransitionRef = useRef<PageTransitionStyle>(getTransition());
    const fullVisitRef = useRef(false);
    const progressTimerRef = useRef<number | null>(null);
    const hideTimerRef = useRef<number | null>(null);
    const visibleSinceRef = useRef<number | null>(null);
    const pendingTransitionKeyRef = useRef(DEFAULT_TRANSITION_KEY);
    const [progress, setProgress] = useState<ProgressState>({
        visible: false,
        percent: 0,
    });

    useEffect(() => {
        function showProgress(percent = 8): void {
            visibleSinceRef.current ??= performance.now();
            setProgress({ visible: true, percent });
        }

        function scheduleProgress(): void {
            clearTimer(progressTimerRef);
            progressTimerRef.current = window.setTimeout(() => {
                showProgress();
            }, PROGRESS_DELAY_MS);
        }

        function hideProgress(): void {
            clearTimer(progressTimerRef);
            clearTimer(hideTimerRef);

            if (!visibleSinceRef.current) {
                setProgress({ visible: false, percent: 0 });
                return;
            }

            const elapsed = performance.now() - visibleSinceRef.current;
            const remaining = Math.max(0, PROGRESS_MIN_VISIBLE_MS - elapsed);

            hideTimerRef.current = window.setTimeout(() => {
                visibleSinceRef.current = null;
                setProgress({ visible: false, percent: 0 });
            }, remaining);
        }

        function captureTransitionAttribution(event: MouseEvent): void {
            pendingTransitionKeyRef.current = transitionKeyFromEventTarget(event.target);
        }

        document.addEventListener('click', captureTransitionAttribution, true);

        const offBefore = router.on('before', (event) => {
            const visit = event.detail.visit;
            fullVisitRef.current = !isPartialVisit(visit);

            if (!fullVisitRef.current) {
                pendingTransitionKeyRef.current = DEFAULT_TRANSITION_KEY;
                return;
            }

            activeTransitionRef.current = getTransition(
                pendingTransitionKeyRef.current,
            );
            pendingTransitionKeyRef.current = DEFAULT_TRANSITION_KEY;
        });

        const offStart = router.on('start', (event) => {
            if (isPartialVisit(event.detail.visit)) {
                fullVisitRef.current = false;
                departingComponentRef.current = null;
                return;
            }

            fullVisitRef.current = true;
            departingComponentRef.current = currentComponentRef.current;
            scheduleProgress();

            const shell = shellRef.current;
            if (!shell) {
                return;
            }

            shell.classList.remove(
                activeTransitionRef.current.enterClass,
                activeTransitionRef.current.exitClass,
            );
            shell.classList.add(activeTransitionRef.current.exitClass);
        });

        const offProgress = router.on('progress', (event) => {
            if (!fullVisitRef.current) {
                return;
            }

            const percent = event.detail.progress?.percentage ?? 35;
            showProgress(Math.max(8, Math.min(99, percent)));
        });

        const offNavigate = router.on('navigate', (event) => {
            const nextComponent = event.detail.page.component;

            if (!fullVisitRef.current) {
                currentComponentRef.current = nextComponent;
                departingComponentRef.current = null;
                return;
            }

            const previousComponent = departingComponentRef.current
                ?? currentComponentRef.current;
            currentComponentRef.current = nextComponent;
            departingComponentRef.current = null;

            const shell = shellRef.current;
            if (!shell) {
                return;
            }

            shell.classList.remove(activeTransitionRef.current.exitClass);

            if (previousComponent !== nextComponent) {
                shell.classList.add(activeTransitionRef.current.enterClass);
                window.setTimeout(() => {
                    shell.classList.remove(activeTransitionRef.current.enterClass);
                }, activeTransitionRef.current.durationMs);
            }
        });

        const offFinish = router.on('finish', (event) => {
            const shell = shellRef.current;

            if (shell) {
                shell.classList.remove(activeTransitionRef.current.exitClass);
            }

            if (!fullVisitRef.current || isPartialVisit(event.detail.visit)) {
                fullVisitRef.current = false;
                departingComponentRef.current = null;
                hideProgress();
                return;
            }

            setProgress((current) => ({
                visible: current.visible,
                percent: current.visible ? 100 : current.percent,
            }));
            hideProgress();
            fullVisitRef.current = false;
        });

        return () => {
            offBefore();
            offStart();
            offProgress();
            offNavigate();
            offFinish();
            document.removeEventListener('click', captureTransitionAttribution, true);
            clearTimer(progressTimerRef);
            clearTimer(hideTimerRef);
        };
    }, []);

    const progressStyle = useMemo(
        () => ({ transform: `scaleX(${progress.percent / 100})` }),
        [progress.percent],
    );

    return (
        <>
            <div
                className={`alex-page-progress ${progress.visible ? 'alex-page-progress--visible' : ''}`}
                aria-hidden="true"
            >
                <div className="alex-page-progress__bar" style={progressStyle} />
            </div>
            <div
                ref={shellRef}
                data-page-transition-shell
                data-page-transition-component={componentName}
            >
                {children}
            </div>
        </>
    );
}
