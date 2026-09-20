export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface SectionSaveCounts {
    word_count: number;
    work_word_count: number;
    page_estimate: number | null;
}

export interface SectionSaveSnapshot {
    status: SaveStatus;
    wordCount: number;
    pageEstimate: number | null;
}

type SendContent = (
    content: string,
    keepalive: boolean,
) => Promise<SectionSaveCounts>;

/** A single section's in-memory save queue; no local-storage copies of manuscripts. */
export class SectionSaveQueue {
    private confirmed: string;
    private latest: string;
    private inFlight: Promise<boolean> | null = null;
    private idleTimer: ReturnType<typeof setTimeout> | null = null;
    private maxTimer: ReturnType<typeof setTimeout> | null = null;
    private failed = false;
    private saved = false;
    private readonly listeners = new Set<() => void>();
    private snapshot: SectionSaveSnapshot;
    private onCounts: (counts: SectionSaveCounts) => void = () => {};

    constructor(
        readonly id: number,
        public title: string,
        initialContent: string,
        wordCount: number,
        private readonly send: SendContent,
        private readonly onChange: () => void = () => {},
    ) {
        this.latest = this.confirmed = initialContent;
        this.snapshot = { status: 'idle', wordCount, pageEstimate: null };
    }

    get content(): string {
        return this.latest;
    }
    get hasUnsaved(): boolean {
        return this.inFlight !== null || this.latest !== this.confirmed;
    }
    updateMetadata(
        title: string,
        onCounts: (counts: SectionSaveCounts) => void,
    ): void {
        this.title = title;
        this.onCounts = onCounts;
    }
    getSnapshot = (): SectionSaveSnapshot => this.snapshot;
    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);

        return () => {
            this.listeners.delete(listener);
        };
    };

    noteChange = (content: string): void => {
        if (content === this.latest) {
            return;
        }

        this.latest = content;

        if (this.idleTimer !== null) {
            clearTimeout(this.idleTimer);
        }

        if (!this.hasUnsaved) {
            this.clearTimers();
            this.failed = false;
        } else {
            this.idleTimer = setTimeout(() => {
                void this.flush();
            }, 3000);
            this.maxTimer ??= setTimeout(() => {
                void this.flush();
            }, 20000);
        }

        this.publish();
    };

    /** Coalesce edits while a request is running. Never send older text after newer text. */
    flush = (keepalive = false): Promise<boolean> => {
        this.clearTimers();

        if (this.inFlight) {
            return this.inFlight;
        }

        if (this.latest === this.confirmed) {
            return Promise.resolve(true);
        }

        const sent = this.latest;
        this.failed = false;
        this.inFlight = Promise.resolve()
            .then(() => this.send(sent, keepalive))
            .then((counts) => {
                this.confirmed = sent;
                this.saved = true;
                this.snapshot = {
                    ...this.snapshot,
                    wordCount: counts.word_count,
                    pageEstimate: counts.page_estimate,
                };
                this.onCounts(counts);

                return true;
            })
            .catch(() => {
                this.failed = true;
                this.clearTimers();

                return false;
            })
            .then((success) => {
                this.inFlight = null;

                if (success && this.latest !== this.confirmed) {
                    return this.flush(keepalive);
                }

                this.publish();

                return success;
            });
        this.publish();

        return this.inFlight;
    };

    private clearTimers(): void {
        if (this.idleTimer !== null) {
            clearTimeout(this.idleTimer);
        }

        if (this.maxTimer !== null) {
            clearTimeout(this.maxTimer);
        }

        this.idleTimer = this.maxTimer = null;
    }

    private publish(): void {
        const status: SaveStatus = this.inFlight
            ? 'saving'
            : this.failed
              ? 'error'
              : this.latest !== this.confirmed
                ? 'dirty'
                : this.saved
                  ? 'saved'
                  : 'idle';
        this.snapshot = { ...this.snapshot, status };
        this.listeners.forEach((listener) => listener());
        this.onChange();
    }
}

/** Lives for one mounted workspace; preserves failed drafts across section/view switches. */
export interface WritingSaveParticipant {
    readonly hasUnsaved: boolean;
    flush(keepalive?: boolean): Promise<boolean>;
}
export class WritingSaveCoordinator {
    private readonly participants = new Set<WritingSaveParticipant>();
    register(participant: WritingSaveParticipant): () => void {
        this.participants.add(participant);
        return () => {
            this.participants.delete(participant);
        };
    }
    get hasPendingStructure(): boolean {
        return [...this.participants].some((p) => p.hasUnsaved);
    }
    private readonly sessions = new Map<number, SectionSaveQueue>();
    private readonly listeners = new Set<() => void>();
    private snapshot: readonly SectionSaveQueue[] = [];

    get(
        id: number,
        create: (notify: () => void) => SectionSaveQueue,
    ): SectionSaveQueue {
        let session = this.sessions.get(id);

        if (!session) {
            session = create(this.publish);
            this.sessions.set(id, session);
        }

        return session;
    }

    get hasUnsaved(): boolean {
        return (
            this.hasPendingStructure ||
            [...this.sessions.values()].some((session) => session.hasUnsaved)
        );
    }
    getSnapshot = (): readonly SectionSaveQueue[] => this.snapshot;
    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);

        return () => {
            this.listeners.delete(listener);
        };
    };
    flush = (keepalive = false): Promise<boolean[]> =>
        Promise.all(
            [...this.sessions.values(), ...this.participants].map((session) =>
                session.flush(keepalive),
            ),
        );
    private publish = (): void => {
        this.snapshot = [...this.sessions.values()];
        this.listeners.forEach((listener) => listener());
    };
}
