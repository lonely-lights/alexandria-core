# Ribbon Plan 3 - Transition Repository + Progress Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the core transition repository and app-level SPA polish from `docs/superpowers/specs/2026-06-12-ribbon-transitions-design.md` section 5: named page transitions (`fade`, `slide`), per-anchor `data-transition` attribution, a custom theme-token progress bar, Inertia NProgress disabled, and the old GSAP `PageTransition` system removed without stranding callers.

**Architecture:** `alexandria-core/resources/js/transitions/` owns the registry, transition wrapper, router-event wiring, and CSS. The app mounts `<PageTransitions>` once inside `resources/js/app.tsx`, wrapping the Inertia page component returned by `<App>`. `PageTransitions` listens to Inertia v3 `before`, `start`, `progress`, `finish`, and `navigate` events, with a capture-phase `click` listener for per-anchor `data-transition` attribution because Inertia emits global events from `document`. It skips partial visits (`only`, `except`, or `reset`) so preserved-state reloads (writing section switches, settings reloads, two-factor refreshes) do not animate and do not flicker the bar. Existing `components/ui/PageTransition.tsx` is superseded and deleted; sorting-history links become normal transition-attributed buttons.

**Tech Stack:** React 19 + TypeScript in core, Inertia v3 router events (`router.on(...)`), CSS animations with theme tokens only, Vitest tests in app through the `@alexandria` alias, Pest browser smoke in app. No new dependencies; no GSAP transition carry-forward.

**Branches:** `feat/ribbon-transitions` exists in both repos. Verification commands run from `C:\Websites\alexandria\alexandria-app`. Core and app commits are separate after implementation is approved.

**House facts verified at plan time:**
- App has one current `createInertiaApp` call: `alexandria-app/resources/js/app.tsx`; no `resources/js/ssr.tsx` exists. Still grep again during implementation before changing progress config.
- Inertia v3 local types expose `before/start/progress/finish/navigate`; event detail includes `visit.only` on `before/start/finish`, and `navigate` detail includes `page.component`.
- Inertia v3 dispatches global events through `document.dispatchEvent(new CustomEvent(...))`; `event.target` is `document`, not the clicked link. Per-anchor attribution therefore needs a capture-phase `click` listener that records the closest `[data-transition]` before Inertia emits `before`.
- Current `AppLayout.tsx` mounts `components/ui/PageTransition.tsx` solely so `triggerPageTransition()` promises resolve.
- `triggerPageTransition()` call sites are only `components/notes/modals/SortingHistoryModal.tsx` blueprint/entry buttons.
- Existing app CSS already imports core `ribbon.css`; `transitions.css` will be imported by `PageTransitions.tsx` from the module so no app CSS import is needed.
- Browser tests use self-contained helpers and stable data hooks (`data-ribbon-control`); transition smoke will follow that pattern.

---

## File Structure

```
alexandria-core/resources/js/transitions/
|-- transitionRegistry.ts       # Task 1 - named styles + default fallback
|-- PageTransitions.tsx         # Task 2 - router events + wrapper + progress bar
`-- transitions.css             # Task 2 - keyframes/classes/theme-token bar

alexandria-core/resources/js/components/ui/PageTransition.tsx       # DELETE in Task 3
alexandria-core/resources/js/layouts/AppLayout.tsx                  # MODIFY remove old import/mount/comment
alexandria-core/resources/js/components/notes/modals/SortingHistoryModal.tsx
                                                                  # MODIFY remove helper; add data-transition

alexandria-app/resources/js/app.tsx                                # MODIFY mount PageTransitions; progress: false
alexandria-app/resources/js/transitions/tests/transition-registry.test.ts
                                                                  # CREATE
alexandria-app/tests/Browser/Transitions/PageTransitionsTest.php    # CREATE
```

---

### Task 1: Transition registry (TDD)

**Files:**
- Create: `alexandria-core/resources/js/transitions/transitionRegistry.ts`
- Test: `alexandria-app/resources/js/transitions/tests/transition-registry.test.ts`

- [ ] **Step 1: Write the failing test**

`alexandria-app/resources/js/transitions/tests/transition-registry.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';

import {
    DEFAULT_TRANSITION_KEY,
    getTransition,
    registerTransition,
    resetTransitionRegistryForTests,
} from '@alexandria/transitions/transitionRegistry';

beforeEach(() => {
    resetTransitionRegistryForTests();
});

describe('transitionRegistry', () => {
    it('ships fade as the default transition', () => {
        const transition = getTransition();

        expect(DEFAULT_TRANSITION_KEY).toBe('fade');
        expect(transition).toMatchObject({
            key: 'fade',
            enterClass: 'alex-page-transition-enter-fade',
            exitClass: 'alex-page-transition-exit-fade',
            durationMs: 150,
        });
    });

    it('ships slide as the attribution test transition', () => {
        expect(getTransition('slide')).toMatchObject({
            key: 'slide',
            enterClass: 'alex-page-transition-enter-slide',
            exitClass: 'alex-page-transition-exit-slide',
            durationMs: 250,
        });
    });

    it('falls back to fade for unknown or empty keys', () => {
        expect(getTransition('missing').key).toBe('fade');
        expect(getTransition('').key).toBe('fade');
    });

    it('registers custom transitions without mutating shipped defaults', () => {
        registerTransition({
            key: 'zoom',
            enterClass: 'enter-zoom',
            exitClass: 'exit-zoom',
            durationMs: 300,
        });

        expect(getTransition('zoom')).toMatchObject({
            key: 'zoom',
            enterClass: 'enter-zoom',
            exitClass: 'exit-zoom',
            durationMs: 300,
        });
        expect(getTransition('fade').durationMs).toBe(150);
    });

    it('normalizes keys before lookup and registration', () => {
        registerTransition({
            key: '  Slide Slow  ',
            enterClass: 'enter-slow',
            exitClass: 'exit-slow',
            durationMs: 400,
        });

        expect(getTransition('slide slow').enterClass).toBe('enter-slow');
        expect(getTransition('  SLIDE SLOW  ').exitClass).toBe('exit-slow');
    });
});
```

- [ ] **Step 2: Run it to verify failure**

Run from app: `npx vitest run resources/js/transitions/tests/transition-registry.test.ts`

Expected: fail because `@alexandria/transitions/transitionRegistry` does not exist.

- [ ] **Step 3: Implement the registry**

`alexandria-core/resources/js/transitions/transitionRegistry.ts`:

```ts
export interface PageTransitionStyle {
    key: string;
    enterClass: string;
    exitClass: string;
    durationMs: number;
}

export const DEFAULT_TRANSITION_KEY = 'fade';

const shippedTransitions: PageTransitionStyle[] = [
    {
        key: 'fade',
        enterClass: 'alex-page-transition-enter-fade',
        exitClass: 'alex-page-transition-exit-fade',
        durationMs: 150,
    },
    {
        key: 'slide',
        enterClass: 'alex-page-transition-enter-slide',
        exitClass: 'alex-page-transition-exit-slide',
        durationMs: 250,
    },
];

const registry = new Map<string, PageTransitionStyle>();

function normalizeKey(key: string | undefined): string {
    return (key ?? DEFAULT_TRANSITION_KEY).trim().toLowerCase();
}

function seedDefaults(): void {
    registry.clear();

    for (const transition of shippedTransitions) {
        registry.set(normalizeKey(transition.key), transition);
    }
}

seedDefaults();

export function registerTransition(transition: PageTransitionStyle): void {
    registry.set(normalizeKey(transition.key), {
        ...transition,
        key: normalizeKey(transition.key),
    });
}

export function getTransition(key: string = DEFAULT_TRANSITION_KEY): PageTransitionStyle {
    return registry.get(normalizeKey(key))
        ?? registry.get(DEFAULT_TRANSITION_KEY)!;
}

export function resetTransitionRegistryForTests(): void {
    seedDefaults();
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run resources/js/transitions/tests/transition-registry.test.ts`

Expected: pass. Then run `npm run types:check`.

- [ ] **Step 5: Commit after approval-time implementation**

Core commit contains `transitionRegistry.ts`; app commit contains the Vitest file. Do not commit during the plan gate.

---

### Task 2: PageTransitions wrapper, router events, and themed progress bar

**Files:**
- Create: `alexandria-core/resources/js/transitions/PageTransitions.tsx`
- Create: `alexandria-core/resources/js/transitions/transitions.css`
- Modify: `alexandria-app/resources/js/app.tsx`

**Design decisions:**
- Mount in `app.tsx`, not a layout, so auth/dev/full-bleed pages get one consistent transition surface.
- Use a keyed `<div data-page-transition-shell data-page-transition-component={component}>` around the page component. `usePage().component` tells the wrapper which page component is currently mounted.
- Document capture `click`: record the nearest `[data-transition]` from the originating element. Inertia's `before` event itself cannot provide this because it is dispatched on `document`.
- `before`: consume the recorded transition key and store the active transition; skip if `visit.only.length > 0`, `visit.except.length > 0`, or `visit.reset.length > 0`.
- `start`: for full visits only, apply the selected exit class to the currently mounted shell.
- `navigate`: compare previous component with `event.detail.page.component`; only apply enter class when the component changes. Same-component full visits can still show progress but should not animate the page shell.
- `finish`: clear visit/progress timers and keep the bar visible for a minimum display window only if it actually appeared.
- `prefers-reduced-motion: reduce`: progress bar can still show; enter/exit classes are no-op.

- [ ] **Step 1: Implement `PageTransitions.tsx`**

`alexandria-core/resources/js/transitions/PageTransitions.tsx`:

```tsx
import { router, usePage } from '@inertiajs/react';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
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

function isPartialVisit(visit: { only?: string[]; except?: string[]; reset?: string[] } | undefined): boolean {
    return (
        (visit?.only?.length ?? 0) > 0
        || (visit?.except?.length ?? 0) > 0
        || (visit?.reset?.length ?? 0) > 0
    );
}

export default function PageTransitions({ children }: PageTransitionsProps) {
    const page = usePage();
    const componentName = page.component;
    const shellRef = useRef<HTMLDivElement>(null);
    const currentComponentRef = useRef(componentName);
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
        currentComponentRef.current = componentName;
    }, [componentName]);

    useEffect(() => {
        function clearTimer(ref: React.MutableRefObject<number | null>): void {
            if (ref.current !== null) {
                window.clearTimeout(ref.current);
                ref.current = null;
            }
        }

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
                return;
            }

            fullVisitRef.current = true;
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
            if (!fullVisitRef.current) {
                currentComponentRef.current = event.detail.page.component;
                return;
            }

            const previousComponent = currentComponentRef.current;
            const nextComponent = event.detail.page.component;
            currentComponentRef.current = nextComponent;

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
            if (!fullVisitRef.current || isPartialVisit(event.detail.visit)) {
                fullVisitRef.current = false;
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
```

Implementation note: if `React.MutableRefObject` import is noisy in this file, lift `clearTimer` outside the effect with a local `type TimerRef = { current: number | null }`. Keep the behavior unchanged.

- [ ] **Step 2: Implement `transitions.css`**

`alexandria-core/resources/js/transitions/transitions.css`:

```css
.alex-page-progress {
    position: fixed;
    inset: 0 0 auto;
    z-index: 2147483646;
    height: 2px;
    pointer-events: none;
    opacity: 0;
    background: transparent;
    transition: opacity var(--theme-motion-duration-fast) var(--theme-motion-easing-standard);
}

.alex-page-progress--visible {
    opacity: 1;
}

.alex-page-progress__bar {
    width: 100%;
    height: 100%;
    transform: scaleX(0);
    transform-origin: left center;
    background: var(--theme-brand-primary-500);
    transition: transform var(--theme-motion-duration-fast) var(--theme-motion-easing-standard);
}

[data-page-transition-shell] {
    will-change: opacity, transform;
}

.alex-page-transition-exit-fade {
    animation: alex-page-exit-fade 150ms var(--theme-motion-easing-standard) both;
}

.alex-page-transition-enter-fade {
    animation: alex-page-enter-fade 150ms var(--theme-motion-easing-standard) both;
}

.alex-page-transition-exit-slide {
    animation: alex-page-exit-slide 250ms var(--theme-motion-easing-standard) both;
}

.alex-page-transition-enter-slide {
    animation: alex-page-enter-slide 250ms var(--theme-motion-easing-standard) both;
}

@keyframes alex-page-exit-fade {
    from {
        opacity: 1;
        transform: translateY(0);
    }

    to {
        opacity: 0.92;
        transform: translateY(2px);
    }
}

@keyframes alex-page-enter-fade {
    from {
        opacity: 0.92;
        transform: translateY(2px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes alex-page-exit-slide {
    from {
        opacity: 1;
        transform: translateX(0);
    }

    to {
        opacity: 0.9;
        transform: translateX(-0.75rem);
    }
}

@keyframes alex-page-enter-slide {
    from {
        opacity: 0.9;
        transform: translateX(0.75rem);
    }

    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@media (prefers-reduced-motion: reduce) {
    .alex-page-transition-exit-fade,
    .alex-page-transition-enter-fade,
    .alex-page-transition-exit-slide,
    .alex-page-transition-enter-slide {
        animation: none;
    }

    .alex-page-progress,
    .alex-page-progress__bar {
        transition: none;
    }
}
```

- [ ] **Step 3: Wire app boot and disable Inertia NProgress**

First grep again:

`rg -n "createInertiaApp\\(|progress\\s*:" resources/js`

Then modify `alexandria-app/resources/js/app.tsx`:

```tsx
import PageTransitions from '@alexandria/transitions/PageTransitions';
```

Change:

```ts
progress: {
    color: '#4B5563',
},
```

to:

```ts
progress: false,
```

Wrap the page component:

```tsx
<LegacyThemeProvider>
    <ThemingBridge>
        <EasterEggBridge />
        <PageTransitions>
            <Component key={key} {...pageProps} />
        </PageTransitions>
    </ThemingBridge>
</LegacyThemeProvider>
```

If grep finds a second app/SSR entry at implementation time, apply `progress: false` there too. Current plan-time state found only the client entry.

- [ ] **Step 4: Verify compile**

Run:

`npm run build`

`npm run types:check`

Expected: both green before moving to reconciliation. If `Page['component']` typing differs under app augmentation, read `@inertiajs/core` types and adjust via `usePage().component`.

---

### Task 3: Reconcile and remove the old GSAP PageTransition system

**Files:**
- Delete: `alexandria-core/resources/js/components/ui/PageTransition.tsx`
- Modify: `alexandria-core/resources/js/layouts/AppLayout.tsx`
- Modify: `alexandria-core/resources/js/components/notes/modals/SortingHistoryModal.tsx`

**Decision:** Supersede the old component. Do not absorb the curtain animation into the registry in this plan. The spec asked for `fade` and `slide`, and the old implementation is full-screen GSAP/portal/sessionStorage machinery with hard-coded legacy token names (`--p`, `--b2`, `--b3`). Keeping it would leave two parallel transition systems.

- [ ] **Step 1: Remove old mount from `AppLayout.tsx`**

Delete:

```tsx
import PageTransition from '../components/ui/PageTransition';
```

Delete the old JSX block:

```tsx
{/* PageTransition listens for ... */}
<PageTransition />
```

No replacement goes in `AppLayout`; app-level wrapping now lives in `app.tsx`.

- [ ] **Step 2: Migrate sorting-history callers**

In `alexandria-core/resources/js/components/notes/modals/SortingHistoryModal.tsx`, delete:

```tsx
import { triggerPageTransition } from '@alexandria/components/ui/PageTransition';
```

Change both destination buttons from:

```tsx
onClick={async () => {
    sessionStorage.setItem('alexandria:open_note', String(record.note_id));
    await triggerPageTransition();
    onClose();
    router.visit(`/p/${projectSlug}/${bp.slug}`);
}}
```

to:

```tsx
data-transition="slide"
onClick={() => {
    sessionStorage.setItem('alexandria:open_note', String(record.note_id));
    onClose();
    router.visit(`/p/${projectSlug}/${bp.slug}`);
}}
```

Apply the same pattern for entry links:

```tsx
data-transition="slide"
onClick={() => {
    sessionStorage.setItem('alexandria:open_note', String(record.note_id));
    onClose();
    router.visit(`/p/${projectSlug}/${blueprintSlug}/${entry.slug}`);
}}
```

Why `slide`: these are contextual jumps from a modal list into an adjacent destination. The style is also the required test style for per-anchor attribution.

- [ ] **Step 3: Delete old file and confirm no dangling references**

Run:

`rg -n "PageTransition|triggerPageTransition|alexandria:transition-close|alexandria:page_transition|transition_style" resources/js`

Expected: no results except possibly this plan/spec docs. Delete `PageTransition.tsx` only after the call sites compile without it.

- [ ] **Step 4: Verify compile**

Run:

`npm run build`

`npm run types:check`

---

### Task 4: Browser smoke for progress, fade, slide, and partial-reload quiet

**Files:**
- Create: `alexandria-app/tests/Browser/Transitions/PageTransitionsTest.php`

**Testing approach:**
- Use normal app pages, not a fake route, to prove the real wrapper works under the built bundle.
- Seed a user/project/work like the writing browser tests.
- Use Playwright route interception from Pest browser `script()` where possible to slow one Inertia response long enough for the 250ms progress threshold. If the Pest browser API cannot expose request routing cleanly, use a test-only browser route in `routes/web.php` only as a last resort and keep it behind `app()->environment('testing')`; avoid that unless needed.
- Assert classes on `[data-page-transition-shell]` because transition CSS classes are the behavioral contract.
- Assert partial reloads stay quiet by clicking a writing section, which uses `router.visit(..., { only: ['currentSection'], preserveState: true })`.

- [ ] **Step 1: Create browser helpers**

`alexandria-app/tests/Browser/Transitions/PageTransitionsTest.php`:

```php
<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;

uses()->group('transitions', 'browser');

beforeEach(function () {
    Log::spy();
    Gate::before(fn () => true);

    $this->user = User::factory()->create();
    $this->project = Project::factory()->create(['owner_id' => $this->user->id]);
    $this->actingAs($this->user);
});

function transitionsDomCount(mixed $page, string $selector): int
{
    $selectorJson = json_encode($selector);

    return (int) $page->script("document.querySelectorAll({$selectorJson}).length");
}

function transitionsWaitForCount(mixed $page, string $selector, int $count, float $timeoutSeconds = 10.0): void
{
    $remaining = $timeoutSeconds;

    while (true) {
        if (transitionsDomCount($page, $selector) === $count) {
            return;
        }

        if ($remaining <= 0) {
            break;
        }

        $page->wait(0.25);
        $remaining -= 0.25;
    }

    expect(transitionsDomCount($page, $selector))->toBe($count, "Timed out waiting for {$selector}");
}

function transitionsSeedWork(): Work
{
    $work = Work::factory()
        ->forProject(test()->project)
        ->create(['user_id' => test()->user->id]);

    WorkSection::factory()->create([
        'work_id' => $work->id,
        'title' => 'Chapter 1',
        'slug' => 'chapter-1',
    ]);

    WorkSection::factory()->create([
        'work_id' => $work->id,
        'title' => 'Chapter 2',
        'slug' => 'chapter-2',
    ]);

    return $work;
}
```

- [ ] **Step 2: Smoke progress + fade on a full navigation**

```php
it('shows the custom progress bar and plays fade on slow full navigation', function () {
    $work = transitionsSeedWork();
    $page = visit("/works/{$this->project->slug}/{$work->slug}")
        ->resize(1600, 1000);

    transitionsWaitForCount($page, '[data-page-transition-shell]', 1);

    $page->script(<<<'JS'
        window.__alexandriaHoldVisits = true;
        const originalFetch = window.fetch.bind(window);
        window.fetch = (input, init) => {
            const url = typeof input === 'string' ? input : input.url;
            if (window.__alexandriaHoldVisits && String(url).includes('/writing')) {
                return new Promise((resolve, reject) => {
                    setTimeout(() => originalFetch(input, init).then(resolve, reject), 450);
                });
            }
            return originalFetch(input, init);
        };
    JS);

    $page->click('text=Work');
    $page->click('[data-ribbon-control="writing-home"]');
    transitionsWaitForCount($page, '.alex-page-progress--visible', 1);
    transitionsWaitForCount($page, '.alex-page-transition-exit-fade', 1);
    transitionsWaitForCount($page, '.alex-page-transition-enter-fade', 1);
});
```

Implementation note: If fetch interception does not affect Inertia's XHR client in v3, switch to intercepting `XMLHttpRequest.prototype.send` with a delayed call for `/writing`.

- [ ] **Step 3: Smoke slide attribution**

```php
it('uses data-transition slide attribution for the originating element', function () {
    $work = transitionsSeedWork();
    $page = visit("/works/{$this->project->slug}/{$work->slug}")
        ->resize(1600, 1000);

    transitionsWaitForCount($page, '[data-page-transition-shell]', 1);

    $page->click('text=Work');
    $page->script(<<<'JS'
        document
            .querySelector('[data-ribbon-control="writing-home"]')
            ?.setAttribute('data-transition', 'slide');
    JS);

    $page->click('[data-ribbon-control="writing-home"]');
    transitionsWaitForCount($page, '.alex-page-transition-exit-slide', 1);
    transitionsWaitForCount($page, '.alex-page-transition-enter-slide', 1);
});
```

Implementation note: If the Work tab starts collapsed in a reused browser context, first clear `localStorage.removeItem('alexandria.ribbon.mode')` by script or click the pin control before selecting the Work tab. The assertion target stays the same.

- [ ] **Step 4: Smoke partial reload quiet**

```php
it('does not animate or show progress for preserved partial reload section switches', function () {
    $work = transitionsSeedWork();
    $page = visit("/works/{$this->project->slug}/{$work->slug}/chapter-1")
        ->resize(1600, 1000);

    transitionsWaitForCount($page, '[data-page-transition-shell]', 1);

    $page->click('text=Chapter 2');
    $page->wait(0.6);

    expect(transitionsDomCount($page, '.alex-page-progress--visible'))->toBe(0)
        ->and(transitionsDomCount($page, '.alex-page-transition-exit-fade'))->toBe(0)
        ->and(transitionsDomCount($page, '.alex-page-transition-enter-fade'))->toBe(0)
        ->and(transitionsDomCount($page, '.alex-page-transition-exit-slide'))->toBe(0)
        ->and(transitionsDomCount($page, '.alex-page-transition-enter-slide'))->toBe(0);
});
```

Expected browser command:

`php artisan test --compact tests/Browser/Transitions/PageTransitionsTest.php`

If the temporary browser scripting needs adjustment, keep the tests' user-visible assertions the same: progress appears only after a slow full visit, fade and slide classes both play, and `only: [...]` section switches stay quiet.

---

### Task 5: Token usage sync, verification, and commits

- [ ] **Step 1: Required verification from app**

Run from `C:\Websites\alexandria\alexandria-app`:

```powershell
npm run build
npm run types:check
npx vitest run resources/js/transitions
php artisan test --compact tests/Browser/Transitions/PageTransitionsTest.php
```

- [ ] **Step 2: Token usage doc sync**

Because `alexandria-core/resources/js/transitions/transitions.css` uses theme tokens, run:

```powershell
$env:UPDATE_USAGE='1'
npx vitest run resources/js/theming/tests/styles/token-usage.test.ts
Remove-Item Env:\UPDATE_USAGE
```

Review the diff. It should only add the new transition CSS token usages.

- [ ] **Step 3: Full sweep before each commit**

Run again before each repo commit:

```powershell
npm run build
npm run types:check
npx vitest run resources/js/transitions
php artisan test --compact tests/Browser/Transitions/PageTransitionsTest.php
```

No PHP production files should change. If browser-test helper code is the only PHP change, Pint is usually not required, but run `vendor/bin/pint --dirty --format agent` if any PHP file changed.

- [ ] **Step 4: Commit split**

Core commit:

```powershell
git -C C:\Websites\alexandria\alexandria-core status --short
git -C C:\Websites\alexandria\alexandria-core add resources/js/transitions resources/js/layouts/AppLayout.tsx resources/js/components/notes/modals/SortingHistoryModal.tsx resources/js/components/ui/PageTransition.tsx docs/superpowers/plans/2026-06-13-ribbon-plan-3-transitions.md
git -C C:\Websites\alexandria\alexandria-core commit -m "feat(transitions): add page transition registry"
```

App commit:

```powershell
git -C C:\Websites\alexandria\alexandria-app status --short
git -C C:\Websites\alexandria\alexandria-app add resources/js/app.tsx resources/js/transitions/tests/transition-registry.test.ts tests/Browser/Transitions/PageTransitionsTest.php
git -C C:\Websites\alexandria\alexandria-app commit -m "test(transitions): cover custom page transitions"
```

After the app commit, inspect pre-commit output and `git status --short` for unexpected delete mode lines or unrelated churn.

---

## Self-Review (applied)

- Spec section 5 coverage: registry with `fade`/`slide`, `PageTransitions` router-event wiring, per-anchor `data-transition`, custom progress bar, NProgress disabled, old `PageTransition` reconciled, partial reloads skipped.
- Inertia v3 gotchas: uses current event names and `router.cancelAll()` is not needed; no `future` config; SSR is not assumed as a separate node server.
- Core remains generic: no SaaS routes, no business logic, no new dependencies, theme-token CSS only.
- Test coverage scales to risk: pure registry Vitest, browser smokes for progress/classes/partial reload quiet, existing build/types gates.
- Open implementation risk: Pest browser request interception may need adapting to Inertia v3's XHR client. The plan includes the fallback path while preserving the behavioral assertions.
