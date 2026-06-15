import { useState, type CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';

import {
    moveQuickAction,
    nextQuickActionId,
    type RibbonQuickAction,
} from './quickActions';

interface QuickActionEditorProps {
    actions: RibbonQuickAction[];
    onChange: (next: RibbonQuickAction[]) => void;
    getActionLabel: (action: RibbonQuickAction) => string;
    getActionIcon: (action: RibbonQuickAction) => string;
}

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-page)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 14%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
};

const internalUrlPattern = /^\/(?!\/)/;

export default function QuickActionEditor({
    actions,
    onChange,
    getActionLabel,
    getActionIcon,
}: QuickActionEditorProps) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [label, setLabel] = useState('');
    const [url, setUrl] = useState('');
    const [icon, setIcon] = useState('fa-solid fa-bookmark');

    function addBookmark(): void {
        const trimmedLabel = label.trim();
        const trimmedUrl = url.trim();
        const trimmedIcon = icon.trim();

        if (!trimmedLabel || !internalUrlPattern.test(trimmedUrl)) {
            return;
        }

        onChange([
            ...actions,
            {
                id: nextQuickActionId('bookmark'),
                type: 'bookmark',
                label: trimmedLabel,
                url: trimmedUrl,
                icon: trimmedIcon || 'fa-solid fa-bookmark',
            },
        ]);
        setLabel('');
        setUrl('');
        setIcon('fa-solid fa-bookmark');
    }

    const panelStyle: CSSProperties = {
        background: 'var(--theme-base-surface)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
        boxShadow: '0 12px 32px color-mix(in srgb, var(--theme-base-content) 18%, transparent)',
    };

    return (
        <div className="relative">
            <button
                type="button"
                data-ribbon-qat-editor
                className="ribbon-qat-item alex-toolbar-btn"
                aria-label={t('ribbon.qat_edit')}
                onClick={() => setOpen((current) => !current)}
            >
                <i className="fa-solid fa-gear" aria-hidden="true" />
            </button>

            {open && (
                <div className="ribbon-qat-editor space-y-3" style={panelStyle}>
                    <div className="space-y-1">
                        {actions.length === 0 && (
                            <p className="px-1 text-xs" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)' }}>
                                {t('ribbon.qat_empty')}
                            </p>
                        )}
                        {actions.map((action, index) => (
                            <QuickActionEditorRow
                                key={action.id}
                                action={action}
                                label={getActionLabel(action)}
                                icon={getActionIcon(action)}
                                first={index === 0}
                                last={index === actions.length - 1}
                                onMoveUp={() => onChange(moveQuickAction(actions, action.id, -1))}
                                onMoveDown={() => onChange(moveQuickAction(actions, action.id, 1))}
                                onRemove={() => onChange(actions.filter((item) => item.id !== action.id))}
                            />
                        ))}
                    </div>

                    <div className="grid gap-2">
                        <input
                            name="qat_label"
                            value={label}
                            onChange={(event) => setLabel(event.target.value)}
                            placeholder={t('ribbon.qat_bookmark_label')}
                            className="h-8 px-2 text-xs outline-none"
                            style={inputStyle}
                        />
                        <input
                            name="qat_url"
                            value={url}
                            onChange={(event) => setUrl(event.target.value)}
                            placeholder={t('ribbon.qat_bookmark_url')}
                            className="h-8 px-2 text-xs outline-none"
                            style={inputStyle}
                        />
                        <input
                            name="qat_icon"
                            value={icon}
                            onChange={(event) => setIcon(event.target.value)}
                            placeholder={t('ribbon.qat_bookmark_icon')}
                            className="h-8 px-2 text-xs outline-none"
                            style={inputStyle}
                        />
                        <button
                            type="button"
                            className="alex-toolbar-btn inline-flex h-8 items-center justify-center gap-2 px-3 text-xs"
                            onClick={addBookmark}
                            disabled={!label.trim() || !internalUrlPattern.test(url.trim())}
                        >
                            <i className="fa-solid fa-plus" aria-hidden="true" />
                            {t('ribbon.qat_bookmark_add')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function QuickActionEditorRow({
    action,
    label,
    icon,
    first,
    last,
    onMoveUp,
    onMoveDown,
    onRemove,
}: {
    action: RibbonQuickAction;
    label: string;
    icon: string;
    first: boolean;
    last: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: () => void;
}) {
    const t = useT();

    return (
        <div className="flex items-center gap-2 rounded px-1 py-1 text-xs">
            <i className={`${icon} w-4 text-center`} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="sr-only">{action.type}</span>
            <button
                type="button"
                className="alex-toolbar-btn inline-flex h-6 w-6 items-center justify-center text-[10px]"
                aria-label={t('ribbon.qat_move_up')}
                disabled={first}
                onClick={onMoveUp}
            >
                <i className="fa-solid fa-chevron-up" aria-hidden="true" />
            </button>
            <button
                type="button"
                className="alex-toolbar-btn inline-flex h-6 w-6 items-center justify-center text-[10px]"
                aria-label={t('ribbon.qat_move_down')}
                disabled={last}
                onClick={onMoveDown}
            >
                <i className="fa-solid fa-chevron-down" aria-hidden="true" />
            </button>
            <button
                type="button"
                className="alex-toolbar-btn inline-flex h-6 w-6 items-center justify-center text-[10px]"
                aria-label={t('ribbon.qat_remove')}
                onClick={onRemove}
            >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
        </div>
    );
}
