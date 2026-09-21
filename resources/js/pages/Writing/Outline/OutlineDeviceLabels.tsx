import useT from '@alexandria/hooks/useT';
import type { OutlineDeviceMark } from './useOutlineThreads';
export default function OutlineDeviceLabels({
    marks,
    selectedThreadId,
    onOpen,
    onFollow,
}: {
    marks: OutlineDeviceMark[];
    selectedThreadId: number | null;
    onOpen: (id: number) => void;
    onFollow: (id: number) => void;
}) {
    const t = useT();

    if (!marks.length) {
        return null;
    }

    return (
        <div className="mb-2 flex flex-wrap gap-2" data-outline-devices>
            {marks.map(({ thread, mark }) => (
                <div
                    key={mark.id}
                    className="border-current/20 flex max-w-full items-center rounded border text-xs"
                    style={{
                        background:
                            thread.id === selectedThreadId
                                ? 'color-mix(in srgb, var(--theme-brand-primary-500) 18%, transparent)'
                                : undefined,
                    }}
                >
                    <button
                        type="button"
                        className="min-w-0 px-2 py-1 text-left"
                        data-device-thread={thread.id}
                        onClick={() => onOpen(thread.id)}
                    >
                        <span className="font-semibold">{thread.title}</span>
                        <span className="opacity-70">
                            {' '}
                            · {thread.card_name} ·{' '}
                            {t('writing.threads.role_' + mark.role)}
                        </span>
                    </button>
                    <button
                        type="button"
                        className="border-current/20 self-stretch border-l px-2"
                        aria-pressed={thread.id === selectedThreadId}
                        aria-label={
                            t('writing.threads.follow_outline') +
                            ' — ' +
                            thread.title
                        }
                        title={t('writing.threads.follow_outline')}
                        onClick={() => onFollow(thread.id)}
                    >
                        <i className="fa-solid fa-route" aria-hidden="true" />
                    </button>
                </div>
            ))}
        </div>
    );
}
