import { router } from '@inertiajs/react';

import useT from '@alexandria/hooks/useT';

import QuickActionEditor from './QuickActionEditor';
import { resolveGate } from './ribbonGates';
import {
    findControlById,
    normalizeQuickActions,
    replaceVisibleQuickActions,
    type RibbonQuickAction,
} from './quickActions';
import type { RibbonGates, RibbonTab } from './types';

interface QuickActionBarProps<Ctx> {
    setKey: string;
    tabs: RibbonTab<Ctx>[];
    context: Ctx;
    /** Gate state from the parent Ribbon — controls with requires are
     *  filtered (hidden) or locked (disabled + lock icon) in the QAT too. */
    gates?: RibbonGates;
    actions: RibbonQuickAction[];
    onChange: (next: RibbonQuickAction[]) => void;
}

export default function QuickActionBar<Ctx>({
    setKey,
    tabs,
    context,
    gates,
    actions,
    onChange,
}: QuickActionBarProps<Ctx>) {
    const t = useT();
    const allActions = normalizeQuickActions(actions);
    const visibleActions = allActions.filter((item) => item.type === 'bookmark' || item.setKey === setKey);

    function updateVisibleActions(nextVisibleActions: RibbonQuickAction[]): void {
        onChange(replaceVisibleQuickActions(allActions, visibleActions, nextVisibleActions));
    }

    function getActionLabel(action: RibbonQuickAction): string {
        if (action.type === 'bookmark') {
            return action.label;
        }

        const control = findControlById(tabs, action.controlId);

        return control ? t(control.labelKey) : action.controlId;
    }

    function getActionIcon(action: RibbonQuickAction): string {
        if (action.type === 'bookmark') {
            return action.icon;
        }

        return findControlById(tabs, action.controlId)?.icon ?? 'fa-solid fa-bolt';
    }

    return (
        <div className="ribbon-qat" aria-label={t('ribbon.qat_label')}>
            <span className="ribbon-qat-label">{t('ribbon.qat_label')}</span>
            {visibleActions.map((item) => {
                if (item.type === 'bookmark') {
                    return (
                        <button
                            key={item.id}
                            type="button"
                            data-ribbon-quick-bookmark={item.url}
                            className="ribbon-qat-item alex-toolbar-btn"
                            title={item.label}
                            aria-label={item.label}
                            onClick={() => router.visit(item.url)}
                        >
                            <i className={item.icon} aria-hidden="true" />
                        </button>
                    );
                }

                const control = findControlById(tabs, item.controlId);
                if (!control || control.visible?.(context) === false) {
                    return null;
                }

                const verdict = resolveGate(control.requires, gates);

                if (verdict === 'hidden') {
                    return null;
                }

                const label = t(control.labelKey);

                if (verdict === 'locked') {
                    return (
                        <span key={item.id} className="relative inline-flex" title={t('writing.ribbon.locked_hint')}>
                            <button
                                type="button"
                                data-ribbon-quick-action={control.id}
                                className="ribbon-qat-item alex-toolbar-btn"
                                aria-label={label}
                                disabled
                            >
                                <i className={control.icon} aria-hidden="true" />
                            </button>
                            <i
                                className="fa-solid fa-lock ribbon-ctl-lock pointer-events-none absolute bottom-0 right-0 text-[8px]"
                                aria-hidden="true"
                            />
                        </span>
                    );
                }

                const disabled = control.disabled?.(context) ?? false;
                const active = control.active?.(context) ?? false;

                return (
                    <button
                        key={item.id}
                        type="button"
                        data-ribbon-quick-action={control.id}
                        className={`ribbon-qat-item alex-toolbar-btn ${active ? 'alex-toolbar-btn--active' : ''}`}
                        title={label}
                        aria-label={label}
                        aria-pressed={control.type === 'toggle' ? active : undefined}
                        disabled={disabled}
                        onClick={() => control.onAction(context)}
                    >
                        <i className={control.icon} aria-hidden="true" />
                    </button>
                );
            })}

            <QuickActionEditor
                actions={visibleActions}
                onChange={updateVisibleActions}
                getActionLabel={getActionLabel}
                getActionIcon={getActionIcon}
            />
        </div>
    );
}
