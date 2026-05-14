import { useState, type CSSProperties } from 'react';
import { router } from '@inertiajs/react';
import Modal, { ModalHeader, ModalFooter } from '@alexandria/components/ui/Modal';
import useT, { type Translator } from '@alexandria/hooks/useT';
import type { ProjectDetail, ProjectSettings } from '@alexandria/types/projects';

interface MembersSectionProps {
    project: ProjectDetail;
    settings: ProjectSettings;
}

/* ── Theme styles ── */

const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };

const cardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    background: 'var(--theme-base-100)',
    borderRadius: 'var(--theme-radius-card)',
    overflow: 'hidden',
};

const cardHeaderStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
};

const rowDividerStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
};

const avatarFallbackStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)',
    color: 'var(--theme-brand-primary-500)',
};

const inviteBtnStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
};

const ghostBtnStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.5rem 0.875rem',
    fontSize: '0.875rem',
};

const primaryBtnStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.5rem 0.875rem',
    fontSize: '0.875rem',
};

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
};

const selectStyle: CSSProperties = {
    ...inputStyle,
    paddingRight: '2rem',
};

const iconBtnGhostStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.25rem',
    fontSize: '0.75rem',
};

const iconBtnDangerStyle: CSSProperties = {
    ...iconBtnGhostStyle,
    color: 'var(--theme-status-error-stroke)',
};

const ownerBadgeStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-badge)',
};

const neutralBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-badge)',
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

export default function MembersSection({ project, settings }: MembersSectionProps) {
    const t = useT();
    const [showInvite, setShowInvite] = useState(false);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('Viewer');
    const [editingMember, setEditingMember] = useState<number | null>(null);
    const [editRole, setEditRole] = useState('');

    function handleInvite() {
        router.post(`/p/${project.slug}/members`, { email, role }, {
            onSuccess: () => { setShowInvite(false); setEmail(''); setRole('Viewer'); },
        });
    }

    function handleRemove(userId: number) {
        router.delete(`/p/${project.slug}/members/${userId}`);
    }

    function handleUpdateRole(userId: number) {
        router.put(`/p/${project.slug}/members/${userId}/roles`, { role: editRole }, {
            onSuccess: () => setEditingMember(null),
        });
    }

    return (
        <div className="space-y-4">
            <div style={cardStyle}>
                <div className="flex items-center justify-between px-4 py-3" style={cardHeaderStyle}>
                    <h3 className="text-lg font-bold">{t('projects.members.title')}</h3>
                    <button
                        type="button"
                        onClick={() => setShowInvite(true)}
                        className="alex-btn inline-flex items-center"
                        style={inviteBtnStyle}
                    >
                        <i className="fa-solid fa-plus mr-1" aria-hidden="true" />
                        {t('projects.members.invite')}
                    </button>
                </div>

                <div>
                    {settings.members.map((member, i, arr) => (
                        <div
                            key={member.id}
                            className="group flex items-center gap-3 px-4 py-3"
                            style={i === arr.length - 1 ? undefined : rowDividerStyle}
                        >
                            {member.has_avatar ? (
                                <img src={member.avatar_thumb_url} className="alex-mask-squircle h-9 w-9 object-cover" alt="" />
                            ) : (
                                <div className="alex-mask-squircle flex h-9 w-9 items-center justify-center" style={avatarFallbackStyle}>
                                    <i className="fa-solid fa-user text-sm" aria-hidden="true" />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{member.display_name ?? member.name}</p>
                                <p className="text-xs" style={labelText}>@{member.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {member.roles.map((r) => (
                                    <span
                                        key={r}
                                        className="px-2 py-0.5 text-xs"
                                        style={r === 'Owner' ? ownerBadgeStyle : neutralBadgeStyle}
                                    >
                                        {roleLabel(t, r)}
                                    </span>
                                ))}
                                {!member.is_owner && (
                                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                            type="button"
                                            onClick={() => { setEditingMember(member.id); setEditRole(member.roles[0] ?? 'Viewer'); }}
                                            className="alex-btn"
                                            style={iconBtnGhostStyle}
                                            aria-label="Edit role"
                                        >
                                            <i className="fa-solid fa-pen text-xs" aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemove(member.id)}
                                            className="alex-btn"
                                            style={iconBtnDangerStyle}
                                            aria-label="Remove member"
                                        >
                                            <i className="fa-solid fa-xmark text-xs" aria-hidden="true" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Invite Modal */}
            <Modal open={showInvite} onClose={() => setShowInvite(false)}>
                <ModalHeader title={t('projects.members.invite_modal.title')} onClose={() => setShowInvite(false)} />
                <div className="space-y-4 p-6">
                    <div className="flex flex-col">
                        <label className="mb-1 text-sm font-semibold">
                            {t('projects.members.invite_modal.email_label')}
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full"
                            style={inputStyle}
                            placeholder={t('projects.members.invite_modal.email_placeholder')}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="mb-1 text-sm font-semibold">
                            {t('projects.members.invite_modal.role_label')}
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full"
                            style={selectStyle}
                        >
                            <option value="Viewer">{t('projects.members.role.viewer')}</option>
                            <option value="Collaborator">{t('projects.members.role.collaborator')}</option>
                            <option value="Editor">{t('projects.members.role.editor')}</option>
                        </select>
                    </div>
                </div>
                <ModalFooter>
                    <button
                        type="button"
                        onClick={() => setShowInvite(false)}
                        className="alex-btn"
                        style={ghostBtnStyle}
                    >
                        {t('projects.members.invite_modal.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleInvite}
                        disabled={!email}
                        className="alex-btn"
                        style={{ ...primaryBtnStyle, opacity: !email ? 0.5 : 1 }}
                    >
                        {t('projects.members.invite_modal.submit')}
                    </button>
                </ModalFooter>
            </Modal>

            {/* Edit Role Modal */}
            <Modal open={!!editingMember} onClose={() => setEditingMember(null)}>
                <ModalHeader title={t('projects.members.edit_modal.title')} onClose={() => setEditingMember(null)} />
                <div className="p-6">
                    <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full"
                        style={selectStyle}
                    >
                        {settings.roles.map((r) => (
                            <option key={r.id} value={r.name}>{roleLabel(t, r.name)}</option>
                        ))}
                    </select>
                </div>
                <ModalFooter>
                    <button
                        type="button"
                        onClick={() => setEditingMember(null)}
                        className="alex-btn"
                        style={ghostBtnStyle}
                    >
                        {t('projects.members.edit_modal.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={() => editingMember && handleUpdateRole(editingMember)}
                        className="alex-btn"
                        style={primaryBtnStyle}
                    >
                        {t('projects.members.edit_modal.submit')}
                    </button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
