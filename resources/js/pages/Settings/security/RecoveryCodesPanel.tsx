import { useState } from 'react';
import Button from '@alexandria/components/ui/Button';
import { useToastContext } from '@alexandria/components/ui/ToastProvider';
import type { Translator } from '@alexandria/hooks/useT';

interface RecoveryCodesPanelProps {
    t: Translator;
    codes: string[];
    /**
     * The user must check the "saved somewhere safe" acknowledgment
     * before Done is enabled — encourages real storage instead of
     * mindless dismissal.
     */
    acknowledged: boolean;
    onAcknowledgeChange: (v: boolean) => void;
    onDone: () => void;
    /** Done-button label (varies between enable + regenerate flows). */
    doneLabel?: string;
}

/**
 * Final step of the enable + regenerate wizards — shows the freshly
 * generated recovery codes ONCE, with a copy-all action and an
 * acknowledgment gate before the user can dismiss.
 *
 * The codes never appear anywhere else in the UI — closing the panel
 * without copying means the user has to regenerate to see them again,
 * which is the right tradeoff for credentials that bypass 2FA entirely.
 */
export default function RecoveryCodesPanel({
    t,
    codes,
    acknowledged,
    onAcknowledgeChange,
    onDone,
    doneLabel,
}: RecoveryCodesPanelProps) {
    const toast = useToastContext();
    const [copied, setCopied] = useState(false);

    async function handleCopyAll() {
        try {
            await navigator.clipboard.writeText(codes.join('\n'));
            setCopied(true);
            toast.show(t('security.recovery_codes.copied'), { type: 'success' });
            setTimeout(() => setCopied(false), 2200);
        } catch {
            toast.show(t('security.error.generic'), { type: 'danger' });
        }
    }

    const fadedTextStyle = {
        color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)',
    };
    const warningBannerStyle = {
        background: 'var(--theme-status-warning-subtle)',
        color: 'var(--theme-base-content)',
        border: '1px solid color-mix(in srgb, var(--theme-status-warning-fill) 35%, transparent)',
        borderInlineStartWidth: '4px',
        borderInlineStartColor: 'var(--theme-status-warning-fill)',
        borderRadius: 'var(--theme-radius-card)',
    };
    const codeChipStyle = {
        background: 'color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
        borderRadius: 'var(--theme-radius-input)',
    };
    const ackBoxStyle = {
        background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
    };

    return (
        <div className="space-y-5 p-6">
            <div className="space-y-2">
                <p className="text-sm" style={fadedTextStyle}>
                    {t('security.recovery_codes.intro')}
                </p>
                <div className="flex items-start gap-2 px-3 py-2 text-sm" style={warningBannerStyle}>
                    <i
                        className="fa-solid fa-triangle-exclamation mt-0.5 flex-shrink-0"
                        style={{ color: 'var(--theme-status-warning-fill)' }}
                        aria-hidden="true"
                    />
                    <span>{t('security.recovery_codes.warning')}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {codes.map((c) => (
                    <code
                        key={c}
                        className="px-3 py-2 font-mono text-sm tracking-wide"
                        style={codeChipStyle}
                    >
                        {c}
                    </code>
                ))}
            </div>

            <div className="flex justify-end">
                <Button
                    variant="ghost"
                    onClick={handleCopyAll}
                    icon={copied ? 'fa-solid fa-check' : 'fa-solid fa-copy'}
                    iconPosition="before"
                >
                    {copied ? t('security.recovery_codes.copied_button') : t('security.recovery_codes.copy_all_button')}
                </Button>
            </div>

            <label
                className="flex cursor-pointer items-center gap-3 px-3 py-3 text-sm"
                style={ackBoxStyle}
            >
                <input
                    type="checkbox"
                    className="alex-checkbox flex-shrink-0"
                    checked={acknowledged}
                    onChange={(e) => onAcknowledgeChange(e.target.checked)}
                />
                <span>{t('security.recovery_codes.acknowledge')}</span>
            </label>

            <div className="flex justify-end pt-2">
                <Button variant="primary" onClick={onDone} disabled={!acknowledged}>
                    {doneLabel ?? t('security.recovery_codes.done_button')}
                </Button>
            </div>
        </div>
    );
}
