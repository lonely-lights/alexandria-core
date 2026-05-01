import { type CSSProperties } from 'react';

export interface RingSettings {
    type?: string;
    color?: string;
    opacity?: number;
    gradient?: string;
    animation_duration?: number;
}

export interface AvatarRingOption {
    slug: string;
    label: string;
    description: string | null;
    is_animated: boolean;
    settings: RingSettings | null;
}

interface AvatarWithRingProps {
    src?: string | null;
    alt?: string;
    initials?: string;
    size?: number;
    ring?: string;
    ringSettings?: RingSettings | null;
    /** Total ring + gap thickness per side in pixels (default 6) */
    ringThickness?: number;
}

export default function AvatarWithRing({
    src,
    alt = 'Avatar',
    initials = '?',
    size = 128,
    ring = 'none',
    ringSettings,
    ringThickness = 6,
}: AvatarWithRingProps) {
    const avatarSize = size;
    const gapSize = size + ringThickness;
    const ringSize = size + ringThickness * 2;

    const isAnimated = ring === 'animated' || ring === 'rainbow';
    const gradient = ringSettings?.gradient;

    const outerSize = ring !== 'none' ? ringSize : avatarSize;

    return (
        <div className="relative inline-flex flex-shrink-0 items-center justify-center" style={{ width: outerSize, height: outerSize, minWidth: outerSize, minHeight: outerSize }}>
            {/* Ring animation keyframes */}
            {isAnimated && (
                <style>{`
                    @keyframes avatar-ring-spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            )}

            {ring !== 'none' && (
                <>
                    {/* Outer ring container (static mask) */}
                    <div
                        className="absolute mask mask-squircle overflow-hidden"
                        style={{ width: ringSize, height: ringSize }}
                    >
                        {ring === 'solid' ? (
                            <div
                                className="h-full w-full"
                                style={{
                                    backgroundColor: `oklch(var(--${ringSettings?.color ?? 'p'}) / ${(ringSettings?.opacity ?? 50) / 100})`,
                                }}
                            />
                        ) : (
                            <div
                                className="absolute inset-[-50%] h-[200%] w-[200%]"
                                style={{
                                    background: gradient ?? 'conic-gradient(from 0deg, oklch(var(--p)), oklch(var(--s)), oklch(var(--a)), oklch(var(--p)))',
                                    ...(isAnimated ? {
                                        animation: `avatar-ring-spin ${ringSettings?.animation_duration ?? 3}s linear infinite`,
                                    } : {}),
                                } as CSSProperties}
                            />
                        )}
                    </div>

                    {/* Gap layer */}
                    <div
                        className="absolute mask mask-squircle bg-base-200"
                        style={{ width: gapSize, height: gapSize }}
                    />
                </>
            )}

            {/* Avatar */}
            <div
                className="relative mask mask-squircle overflow-hidden bg-base-300 shadow-xl"
                style={{ width: avatarSize, height: avatarSize }}
            >
                {src ? (
                    <img src={src} alt={alt} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 to-secondary/30">
                        <span
                            className="select-none font-bold text-primary/50"
                            style={{ fontSize: avatarSize * 0.4 }}
                        >
                            {initials}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
