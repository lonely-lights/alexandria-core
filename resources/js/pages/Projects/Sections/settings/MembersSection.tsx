import { useState } from 'react';
import { router } from '@inertiajs/react';
import Modal, { ModalHeader, ModalFooter } from '@alexandria/components/ui/Modal';
import type { ProjectDetail, ProjectSettings } from '@alexandria/types/projects';

interface MembersSectionProps {
    project: ProjectDetail;
    settings: ProjectSettings;
}

export default function MembersSection({ project, settings }: MembersSectionProps) {
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
            <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
                <div className="flex items-center justify-between border-b border-base-300/50 px-4 py-3">
                    <h3 className="text-lg font-bold">Members</h3>
                    <button type="button" onClick={() => setShowInvite(true)} className="btn btn-primary btn-sm rounded-xl">
                        <i className="fa-solid fa-plus mr-1" /> Invite
                    </button>
                </div>

                <div className="divide-y divide-base-300/50">
                    {settings.members.map((member) => (
                        <div key={member.id} className="group flex items-center gap-3 px-4 py-3">
                            {member.has_avatar ? (
                                <img src={member.avatar_thumb_url} className="mask mask-squircle h-9 w-9 object-cover" alt="" />
                            ) : (
                                <div className="mask mask-squircle flex h-9 w-9 items-center justify-center bg-primary/20">
                                    <i className="fa-solid fa-user text-sm text-primary" />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{member.display_name ?? member.name}</p>
                                <p className="text-xs text-base-content/50">@{member.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {member.roles.map((r) => (
                                    <span key={r} className={`badge badge-sm ${r === 'Owner' ? 'badge-primary' : 'badge-ghost'}`}>{r}</span>
                                ))}
                                {!member.is_owner && (
                                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                            type="button"
                                            onClick={() => { setEditingMember(member.id); setEditRole(member.roles[0] ?? 'Viewer'); }}
                                            className="btn btn-ghost btn-xs"
                                        >
                                            <i className="fa-solid fa-pen text-xs" />
                                        </button>
                                        <button type="button" onClick={() => handleRemove(member.id)} className="btn btn-ghost btn-xs text-error">
                                            <i className="fa-solid fa-xmark text-xs" />
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
                <ModalHeader title="Invite Member" onClose={() => setShowInvite(false)} />
                <div className="space-y-4 p-6">
                    <div className="form-control">
                        <label className="label"><span className="label-text font-semibold">Email</span></label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input input-bordered rounded-xl focus:input-primary" placeholder="user@example.com" />
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text font-semibold">Role</span></label>
                        <select value={role} onChange={(e) => setRole(e.target.value)} className="select select-bordered rounded-xl focus:select-primary">
                            <option value="Viewer">Viewer</option>
                            <option value="Collaborator">Collaborator</option>
                            <option value="Editor">Editor</option>
                        </select>
                    </div>
                </div>
                <ModalFooter>
                    <button type="button" onClick={() => setShowInvite(false)} className="btn btn-ghost rounded-xl">Cancel</button>
                    <button type="button" onClick={handleInvite} className="btn btn-primary rounded-xl" disabled={!email}>Invite</button>
                </ModalFooter>
            </Modal>

            {/* Edit Role Modal */}
            <Modal open={!!editingMember} onClose={() => setEditingMember(null)}>
                <ModalHeader title="Change Role" onClose={() => setEditingMember(null)} />
                <div className="p-6">
                    <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="select select-bordered w-full rounded-xl focus:select-primary">
                        {settings.roles.map((r) => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                    </select>
                </div>
                <ModalFooter>
                    <button type="button" onClick={() => setEditingMember(null)} className="btn btn-ghost rounded-xl">Cancel</button>
                    <button type="button" onClick={() => editingMember && handleUpdateRole(editingMember)} className="btn btn-primary rounded-xl">Save</button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
