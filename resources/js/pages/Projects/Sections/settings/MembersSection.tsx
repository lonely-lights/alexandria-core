import { useEffect, useRef, useState, type CSSProperties } from "react";
import { router, usePage } from "@inertiajs/react";

import type { SharedProps } from "@alexandria/types";
import ActionButton from "@alexandria/components/ui/ActionButton";
import Button from "@alexandria/components/ui/Button";
import ConfirmModal from "@alexandria/components/ui/ConfirmModal";
import Modal, {
    ModalFooter,
    ModalHeader,
} from "@alexandria/components/ui/Modal";
import Select from "@alexandria/components/ui/Select";
import useT, { type Translator } from "@alexandria/hooks/useT";
import type {
    ProjectDetail,
    ProjectSettings,
} from "@alexandria/types/projects";

interface MembersSectionProps {
    project: ProjectDetail;
    settings: ProjectSettings;
}

interface UserSearchResult {
    id: number;
    username: string;
    display_name: string;
    avatar_thumb_url: string | null;
    tagline: string | null;
}

/* ── Theme styles ── */

const labelText: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

const microText: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 35%, transparent)",
};

const cardStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)",
    background: "var(--theme-base-100)",
    borderRadius: "var(--theme-radius-card)",
    overflow: "hidden",
};

const cardHeaderStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
};

const rowDividerStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
};

const avatarFallbackStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)",
    color: "var(--theme-brand-primary-500)",
};

const inputStyle: CSSProperties = {
    background: "var(--theme-base-surface)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
    borderRadius: "var(--theme-radius-input)",
    color: "var(--theme-base-content)",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
};

const dropdownStyle: CSSProperties = {
    background: "var(--theme-base-100)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    maxHeight: "16rem",
    overflowY: "auto",
    boxShadow: "0 8px 20px color-mix(in srgb, black 18%, transparent)",
};

const dropdownItemStyle: CSSProperties = {
    background: "transparent",
    transition:
        "background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

const selectedChipStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)",
    border: "1px solid color-mix(in srgb, var(--theme-brand-primary-500) 30%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    padding: "0.625rem 0.75rem",
};

const iconBtnGhostStyle: CSSProperties = {
    background: "transparent",
    color: "var(--theme-base-content)",
    borderRadius: "var(--theme-radius-button)",
    padding: "0.25rem",
    fontSize: "0.75rem",
};

const iconBtnDangerStyle: CSSProperties = {
    ...iconBtnGhostStyle,
    color: "var(--theme-status-error-stroke)",
};

const ownerBadgeStyle: CSSProperties = {
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
    borderRadius: "var(--theme-radius-badge)",
};

const neutralBadgeStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-base-content) 12%, transparent)",
    color: "var(--theme-base-content)",
    borderRadius: "var(--theme-radius-badge)",
};

/**
 * Translate a role label, falling back to the server-supplied string
 * when no lang key exists. Server roles are stored as 'Owner', 'Editor',
 * etc. — keep those as identifiers for option values + comparisons.
 */
function roleLabel(t: Translator, role: string): string {
    const key = `projects.members.role.${role.toLowerCase()}`;
    return t(key, role);
}

export default function MembersSection({
    project,
    settings,
}: MembersSectionProps) {
    const t = useT();
    const page = usePage<SharedProps>();
    const isAdmin = page.props.auth?.is_admin === true;

    const [showInvite, setShowInvite] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
        null,
    );
    const [role, setRole] = useState("Viewer");
    const [editingMember, setEditingMember] = useState<number | null>(null);
    const [editRole, setEditRole] = useState("");
    const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);

    // Admin-only: invite-to-list multi-select. Loaded lazily when
    // the modal opens so non-admins (and admins who never open
    // the invite flow) don't pay the fetch cost.
    const [instanceLists, setInstanceLists] = useState<
        { id: number; name: string; slug: string }[]
    >([]);
    const [selectedListIds, setSelectedListIds] = useState<number[]>([]);

    useEffect(() => {
        if (!showInvite || !isAdmin || instanceLists.length > 0) return;
        let cancelled = false;
        fetch("/admin/lists-instance-options", {
            headers: { Accept: "application/json" },
        })
            .then((r) => (r.ok ? r.json() : { lists: [] }))
            .then((data) => {
                if (!cancelled) setInstanceLists(data.lists ?? []);
            })
            .catch(() => {
                /* silently degrade — admin sees an empty picker */
            });
        return () => {
            cancelled = true;
        };
    }, [showInvite, isAdmin, instanceLists.length]);

    function resetInviteForm() {
        setSelectedUser(null);
        setRole("Viewer");
        setSelectedListIds([]);
    }

    function handleInvite() {
        if (!selectedUser) return;
        const payload: Record<string, string | number | number[]> = {
            user_id: selectedUser.id,
            role,
        };
        if (isAdmin && selectedListIds.length > 0) {
            payload.list_ids = selectedListIds;
        }
        router.post(`/p/${project.slug}/members`, payload, {
            onSuccess: () => {
                setShowInvite(false);
                resetInviteForm();
            },
        });
    }

    function toggleListId(id: number) {
        setSelectedListIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    }

    function handleRemove(userId: number) {
        router.delete(`/p/${project.slug}/members/${userId}`);
    }

    function handleUpdateRole(userId: number) {
        router.put(
            `/p/${project.slug}/members/${userId}/roles`,
            { role: editRole },
            { onSuccess: () => setEditingMember(null) },
        );
    }

    const existingMemberIds = new Set(settings.members.map((m) => m.id));

    return (
        <div className="space-y-4">
            <div style={cardStyle}>
                <div
                    className="flex items-center justify-between px-4 py-3"
                    style={cardHeaderStyle}
                >
                    <h3 className="text-lg font-bold">
                        {t("projects.members.title")}
                    </h3>
                    <ActionButton
                        icon="fa-solid fa-plus"
                        label={t("projects.members.invite")}
                        size="sm"
                        variant="primary"
                        onClick={() => setShowInvite(true)}
                    />
                </div>

                <div>
                    {settings.members.map((member, i, arr) => (
                        <div
                            key={member.id}
                            className="group flex items-center gap-3 px-4 py-3"
                            style={
                                i === arr.length - 1
                                    ? undefined
                                    : rowDividerStyle
                            }
                        >
                            {member.has_avatar ? (
                                <img
                                    src={member.avatar_thumb_url}
                                    className="alex-mask-squircle h-9 w-9 object-cover"
                                    alt=""
                                />
                            ) : (
                                <div
                                    className="alex-mask-squircle flex h-9 w-9 items-center justify-center"
                                    style={avatarFallbackStyle}
                                >
                                    <i
                                        className="fa-solid fa-user text-sm"
                                        aria-hidden="true"
                                    />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                    {member.display_name ?? member.name}
                                </p>
                                <p className="text-xs" style={labelText}>
                                    @{member.name}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {member.roles.map((r) => (
                                    <span
                                        key={r}
                                        className="px-2 py-0.5 text-xs"
                                        style={
                                            r === "Owner"
                                                ? ownerBadgeStyle
                                                : neutralBadgeStyle
                                        }
                                    >
                                        {roleLabel(t, r)}
                                    </span>
                                ))}
                                {!member.is_owner && (
                                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingMember(member.id);
                                                setEditRole(
                                                    member.roles[0] ?? "Viewer",
                                                );
                                            }}
                                            className="alex-btn"
                                            style={iconBtnGhostStyle}
                                            aria-label={t(
                                                "projects.members.edit_role_aria",
                                            )}
                                        >
                                            <i
                                                className="fa-solid fa-pen text-xs"
                                                aria-hidden="true"
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPendingRemoveId(member.id)
                                            }
                                            className="alex-btn"
                                            style={iconBtnDangerStyle}
                                            aria-label={t(
                                                "projects.members.remove_aria",
                                            )}
                                        >
                                            <i
                                                className="fa-solid fa-xmark text-xs"
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Invite Modal */}
            <Modal
                open={showInvite}
                onClose={() => {
                    setShowInvite(false);
                    resetInviteForm();
                }}
            >
                <ModalHeader
                    title={t("projects.members.invite_modal.title")}
                    onClose={() => {
                        setShowInvite(false);
                        resetInviteForm();
                    }}
                />
                <div className="space-y-4 p-6">
                    <div className="flex flex-col">
                        <label className="mb-1 text-sm font-semibold">
                            {t("projects.members.invite_modal.user_label")}
                        </label>
                        {selectedUser ? (
                            <SelectedUserChip
                                user={selectedUser}
                                onClear={() => setSelectedUser(null)}
                                clearLabel={t(
                                    "projects.members.invite_modal.change_user",
                                )}
                            />
                        ) : (
                            <UserSearchField
                                excludeIds={existingMemberIds}
                                onPick={setSelectedUser}
                            />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <label className="mb-1 text-sm font-semibold">
                            {t("projects.members.invite_modal.role_label")}
                        </label>
                        <Select<string>
                            value={role}
                            options={[
                                {
                                    value: "Viewer",
                                    label: t("projects.members.role.viewer"),
                                },
                                {
                                    value: "Collaborator",
                                    label: t(
                                        "projects.members.role.collaborator",
                                    ),
                                },
                                {
                                    value: "Editor",
                                    label: t("projects.members.role.editor"),
                                },
                            ]}
                            onChange={setRole}
                            ariaLabel={t(
                                "projects.members.invite_modal.role_label",
                            )}
                        />
                    </div>

                    {isAdmin && instanceLists.length > 0 && (
                        <div className="flex flex-col">
                            <label className="mb-1 text-sm font-semibold">
                                {t("projects.members.invite_modal.lists_label")}
                            </label>
                            <p className="mb-2 text-xs" style={microText}>
                                {t("projects.members.invite_modal.lists_hint")}
                            </p>
                            <div
                                className="max-h-48 overflow-y-auto"
                                style={dropdownStyle}
                            >
                                {instanceLists.map((list) => (
                                    <label
                                        key={list.id}
                                        className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm"
                                        style={dropdownItemStyle}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedListIds.includes(list.id)}
                                            onChange={() => toggleListId(list.id)}
                                        />
                                        <span>{list.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setShowInvite(false);
                            resetInviteForm();
                        }}
                    >
                        {t("projects.members.invite_modal.cancel")}
                    </Button>
                    <Button
                        variant="primary"
                        disabled={!selectedUser}
                        onClick={handleInvite}
                    >
                        {t("projects.members.invite_modal.submit")}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Edit Role Modal */}
            <Modal
                open={!!editingMember}
                onClose={() => setEditingMember(null)}
            >
                <ModalHeader
                    title={t("projects.members.edit_modal.title")}
                    onClose={() => setEditingMember(null)}
                />
                <div className="p-6">
                    <Select<string>
                        value={editRole}
                        options={settings.roles.map((r) => ({
                            value: r.name,
                            label: roleLabel(t, r.name),
                        }))}
                        onChange={setEditRole}
                        ariaLabel={t("projects.members.edit_modal.title")}
                        fullWidth
                    />
                </div>
                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => setEditingMember(null)}
                    >
                        {t("projects.members.edit_modal.cancel")}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() =>
                            editingMember && handleUpdateRole(editingMember)
                        }
                    >
                        {t("projects.members.edit_modal.submit")}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Remove confirmation */}
            <ConfirmModal
                open={pendingRemoveId !== null}
                onClose={() => setPendingRemoveId(null)}
                onConfirm={() => {
                    if (pendingRemoveId !== null) {
                        handleRemove(pendingRemoveId);
                        setPendingRemoveId(null);
                    }
                }}
                title={t("projects.members.remove_modal.title")}
                message={t("projects.members.remove_modal.message")
                    .replace(
                        ":name",
                        pendingRemoveName(settings.members, pendingRemoveId),
                    )
                    .replace(":project", project.name)}
                confirmLabel={t("projects.members.remove_modal.confirm")}
                cancelLabel={t("projects.members.remove_modal.cancel")}
                variant="danger"
            />
        </div>
    );
}

/** Resolve the display name for the row currently staged for removal. */
function pendingRemoveName(
    members: ProjectSettings["members"],
    pendingId: number | null,
): string {
    if (pendingId === null) return "";
    const m = members.find((row) => row.id === pendingId);
    if (!m) return "";
    return m.display_name ?? m.name;
}

/* ── User search typeahead ── */

function UserSearchField({
    excludeIds,
    onPick,
}: {
    excludeIds: Set<number>;
    onPick: (user: UserSearchResult) => void;
}) {
    const t = useT();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<UserSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const timer = setTimeout(() => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            fetch(
                `/api/v1/users/search?q=${encodeURIComponent(trimmed)}&limit=10`,
                {
                    signal: controller.signal,
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    credentials: "same-origin",
                },
            )
                .then((r) => (r.ok ? r.json() : { data: [] }))
                .then((body: { data: UserSearchResult[] }) => {
                    setResults(body.data.filter((u) => !excludeIds.has(u.id)));
                    setLoading(false);
                })
                .catch((err: unknown) => {
                    if (
                        err instanceof DOMException &&
                        err.name === "AbortError"
                    ) {
                        return;
                    }
                    setResults([]);
                    setLoading(false);
                });
        }, 200);

        return () => clearTimeout(timer);
    }, [query, excludeIds]);

    const trimmed = query.trim();
    const showHint = trimmed.length > 0 && trimmed.length < 2;
    const showEmpty = trimmed.length >= 2 && !loading && results.length === 0;

    return (
        <div className="relative">
            <input
                type="text"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => {
                    // Defer so click on a result registers before we hide.
                    setTimeout(() => setOpen(false), 150);
                }}
                className="w-full"
                style={inputStyle}
                placeholder={t(
                    "projects.members.invite_modal.user_placeholder",
                )}
                autoComplete="off"
            />
            {open &&
                (showHint || loading || showEmpty || results.length > 0) && (
                    <div
                        className="absolute z-10 mt-1 w-full"
                        style={dropdownStyle}
                    >
                        {showHint && (
                            <p className="px-3 py-2 text-xs" style={microText}>
                                {t(
                                    "projects.members.invite_modal.user_min_chars",
                                )}
                            </p>
                        )}
                        {loading && (
                            <p
                                className="flex items-center gap-2 px-3 py-2 text-xs"
                                style={microText}
                            >
                                <i
                                    className="fa-solid fa-circle-notch fa-spin"
                                    aria-hidden="true"
                                />
                                {t(
                                    "projects.members.invite_modal.user_searching",
                                )}
                            </p>
                        )}
                        {showEmpty && (
                            <p className="px-3 py-2 text-xs" style={microText}>
                                {t(
                                    "projects.members.invite_modal.user_no_results",
                                )}
                            </p>
                        )}
                        {!loading &&
                            results.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        onPick(user);
                                        setQuery("");
                                        setResults([]);
                                        setOpen(false);
                                    }}
                                    className="alex-row flex w-full items-center gap-3 px-3 py-2 text-left"
                                    style={dropdownItemStyle}
                                >
                                    <UserAvatar user={user} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">
                                            {user.display_name}
                                        </p>
                                        <p
                                            className="truncate text-xs"
                                            style={labelText}
                                        >
                                            @{user.username}
                                        </p>
                                    </div>
                                </button>
                            ))}
                    </div>
                )}
        </div>
    );
}

function SelectedUserChip({
    user,
    onClear,
    clearLabel,
}: {
    user: UserSearchResult;
    onClear: () => void;
    clearLabel: string;
}) {
    return (
        <div className="flex items-center gap-3" style={selectedChipStyle}>
            <UserAvatar user={user} />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                    {user.display_name}
                </p>
                <p className="truncate text-xs" style={labelText}>
                    @{user.username}
                </p>
            </div>
            <Button
                variant="ghost"
                size="sm"
                icon="fa-solid fa-xmark"
                iconPosition="before"
                onClick={onClear}
            >
                {clearLabel}
            </Button>
        </div>
    );
}

function UserAvatar({ user }: { user: UserSearchResult }) {
    if (user.avatar_thumb_url) {
        return (
            <img
                src={user.avatar_thumb_url}
                className="alex-mask-squircle h-8 w-8 object-cover"
                alt=""
            />
        );
    }
    return (
        <div
            className="alex-mask-squircle flex h-8 w-8 items-center justify-center"
            style={avatarFallbackStyle}
        >
            <i className="fa-solid fa-user text-xs" aria-hidden="true" />
        </div>
    );
}
