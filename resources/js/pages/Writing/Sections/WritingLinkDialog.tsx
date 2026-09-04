import type { Editor } from '@tiptap/core';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import Input from '@alexandria/components/form/Input';
import Button from '@alexandria/components/ui/Button';
import { applyWritingLink } from '@alexandria/editor/writingTextCommands';
import type {
    WritingLinkSelection,
    WritingLinkResult,
} from '@alexandria/editor/writingTextCommands';
import useT from '@alexandria/hooks/useT';
import WritingToolDialog from '../mobile/WritingToolDialog';

export default function WritingLinkDialog({
    editor,
    selection,
    onClose,
}: {
    editor: Editor;
    selection: WritingLinkSelection;
    onClose: () => void;
}) {
    const t = useT();
    const [href, setHref] = useState(selection.href);
    const [label, setLabel] = useState(selection.text);
    const [error, setError] = useState<WritingLinkResult | null>(null);

    function apply(remove = false) {
        const result = applyWritingLink(
            editor,
            selection,
            remove ? null : href,
            label,
        );

        if (result !== 'applied') {
            setError(result);

            return;
        }

        flushSync(onClose);
        editor.commands.focus();
    }

    return (
        <WritingToolDialog title={t('writing.link.title')} onClose={onClose}>
            <form
                className="min-h-0 space-y-4 overflow-y-auto p-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    apply();
                }}
            >
                <Input
                    id="writing-link-url"
                    label={t('writing.link.url')}
                    type="url"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={href}
                    onChange={(event) => {
                        setHref(event.target.value);
                        setError(null);
                    }}
                    placeholder="https://example.com"
                    required
                />
                <Input
                    id="writing-link-label"
                    label={t('writing.link.text')}
                    hint={t('writing.link.hint')}
                    value={label}
                    onChange={(event) => {
                        setLabel(event.target.value);
                        setError(null);
                    }}
                />
                {error && (
                    <p
                        role="alert"
                        className="text-sm"
                        style={{ color: 'var(--theme-status-error-stroke)' }}
                    >
                        {t(`writing.link.error_${error}`)}
                    </p>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                    {selection.href && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => apply(true)}
                        >
                            {t('writing.link.remove')}
                        </Button>
                    )}
                    <Button type="button" variant="ghost" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        variant="secondary"
                        disabled={!href.trim()}
                    >
                        {t('writing.link.apply')}
                    </Button>
                </div>
            </form>
        </WritingToolDialog>
    );
}
