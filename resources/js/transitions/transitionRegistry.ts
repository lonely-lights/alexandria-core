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
    const key = normalizeKey(transition.key);

    registry.set(key, {
        ...transition,
        key,
    });
}

export function getTransition(key: string = DEFAULT_TRANSITION_KEY): PageTransitionStyle {
    return registry.get(normalizeKey(key))
        ?? registry.get(DEFAULT_TRANSITION_KEY)!;
}

export function resetTransitionRegistryForTests(): void {
    seedDefaults();
}
