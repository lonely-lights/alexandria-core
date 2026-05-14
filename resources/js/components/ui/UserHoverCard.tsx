import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import AvatarWithRing, { type RingSettings } from '@alexandria/components/ui/AvatarWithRing';
import { computeHoverPosition } from '@alexandria/lib/hoverPosition';
import { useHoverCard } from '@alexandria/hooks/useHoverCard';

interface UserPreview {
    id: number;
    name: string;
    display_name: string | null;
    avatar_url: string;
    avatar_thumb_url: string;
    has_avatar: boolean;
    pronouns: string | null;
    tagline: string | null;
    location: string | null;
    avatar_ring_slug: string;
    avatar_ring_settings: RingSettings | null;
}

// Module-level cache — one fetch per user per page session
const userCache = new Map<number, UserPreview | 'loading' | 'error'>();

const cardShellStyle: CSSProperties = {
    position: 'fixed',
    zIndex: 10000,
    borderRadius: 'var(--theme-radius-card)',
    border: '1px solid var(--theme-base-300)',
    background: 'var(--theme-base-200)',
    padding: '1rem',
    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
};

const loadingTextStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const usernameStyle: CSSProperties = {
    fontSize: '0.75rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const pronounsStyle: CSSProperties = {
    marginTop: '0.5rem',
    fontSize: '0.75rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const taglineStyle: CSSProperties = {
    marginTop: '0.5rem',
    fontSize: '0.875rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
};

const locationStyle: CSSProperties = {
    marginTop: '0.25rem',
    fontSize: '0.75rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const viewProfileStyle: CSSProperties = {
    marginTop: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.75rem',
    color: 'var(--theme-brand-primary-500)',
};

/* ── UserLink: wraps any element and triggers hover card ── */

interface UserLinkProps {
    userId: number;
    href?: string;
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
}

export default function UserLink({ userId, href, children, className, style }: UserLinkProps) {
    const { showCard, triggerRect, triggerRef, handleMouseEnter, scheduleClose, cancelClose } = useHoverCard();

    return (
        <>
            <a
                ref={triggerRef}
                href={href}
                className={className}
                style={style}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={scheduleClose}
            >
                {children}
            </a>
            {showCard && triggerRect && (
                <UserHoverCardPortal
                    userId={userId}
                    triggerRect={triggerRect}
                    onEnter={cancelClose}
                    onClose={scheduleClose}
                />
            )}
        </>
    );
}

/* ── The hover card portal ── */

function UserHoverCardPortal({ userId, triggerRect, onEnter, onClose }: {
    userId: number;
    triggerRect: DOMRect;
    onEnter: () => void;
    onClose: () => void;
}) {
    const [user, setUser] = useState<UserPreview | null>(null);
    const [loading, setLoading] = useState(true);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const cached = userCache.get(userId);

        if (cached && cached !== 'loading' && cached !== 'error') {
            setUser(cached);
            setLoading(false);
            return;
        }

        if (cached === 'loading') return;

        userCache.set(userId, 'loading');

        fetch(`/api/v1/users/${userId}`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((resp) => {
                // API wraps in { data: {...} }
                const data = resp.data ?? resp;
                const preview: UserPreview = {
                    id: data.id,
                    name: data.username ?? data.name,
                    display_name: data.display_name,
                    avatar_url: data.avatar_url ?? data.avatar_thumb_url,
                    avatar_thumb_url: data.avatar_thumb_url,
                    has_avatar: !!data.avatar_thumb_url,
                    pronouns: data.pronouns ?? null,
                    tagline: data.tagline ?? null,
                    location: data.location ?? null,
                    avatar_ring_slug: data.avatar_ring_slug ?? 'none',
                    avatar_ring_settings: data.avatar_ring_settings ?? null,
                };
                userCache.set(userId, preview);
                setUser(preview);
                setLoading(false);
            })
            .catch(() => {
                userCache.set(userId, 'error');
                setLoading(false);
            });
    }, [userId]);

    // Animate in
    useEffect(() => {
        if (cardRef.current && !loading) {
            gsap.fromTo(cardRef.current,
                { opacity: 0, y: 4, scale: 0.97 },
                { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
            );
        }
    }, [loading]);

    const cardWidth = 280;
    const positionStyle = { ...computeHoverPosition(triggerRect, cardWidth), width: cardWidth };

    if (loading) {
        return createPortal(
            <div style={{ ...cardShellStyle, ...positionStyle }}>
                <div style={loadingTextStyle}>
                    <i className="fa-solid fa-circle-notch fa-spin" />
                    Loading...
                </div>
            </div>,
            document.body,
        );
    }

    if (!user) return null;

    return createPortal(
        <div
            ref={cardRef}
            style={{ ...cardShellStyle, ...positionStyle }}
            onMouseEnter={onEnter}
            onMouseLeave={onClose}
        >
            {/* Avatar + Name */}
            <div className="flex items-center gap-4">
                <AvatarWithRing
                    src={user.has_avatar ? (user.avatar_url ?? user.avatar_thumb_url) : null}
                    alt={user.display_name ?? user.name}
                    initials={(user.display_name ?? user.name).charAt(0).toUpperCase()}
                    size={56}
                    ring={user.avatar_ring_slug}
                    ringSettings={user.avatar_ring_settings}
                    ringThickness={4}
                />
                <div className="min-w-0">
                    <h4 className="truncate font-bold">{user.display_name ?? user.name}</h4>
                    <p style={usernameStyle}>@{user.name}</p>
                </div>
            </div>

            {/* Pronouns */}
            {user.pronouns && (
                <p style={pronounsStyle}>{user.pronouns}</p>
            )}

            {/* Tagline */}
            {user.tagline && (
                <p className="line-clamp-2" style={taglineStyle}>{user.tagline}</p>
            )}

            {/* Location */}
            {user.location && (
                <p style={locationStyle}>
                    <i className="fa-solid fa-location-dot mr-1" />{user.location}
                </p>
            )}

            {/* View profile */}
            <a
                href={`/u/${user.name.toLowerCase()}`}
                className="hover:underline"
                style={viewProfileStyle}
            >
                View profile <i className="fa-solid fa-arrow-right text-[10px]" />
            </a>
        </div>,
        document.body,
    );
}
