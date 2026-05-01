import { useTheme } from '../../hooks/useTheme';

interface ModeToggleProps {
    ariaLabel?: string;
}

export default function ModeToggle({ ariaLabel = 'Toggle light or dark mode' }: ModeToggleProps) {
    const theme = useTheme();
    if (!theme) return null;

    const { mode, toggleMode } = theme;

    return (
        <button
            type="button"
            onClick={toggleMode}
            className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-base-content"
            aria-label={ariaLabel}
        >
            <span aria-hidden="true">{mode === 'dark' ? '☾' : '☀'}</span>
        </button>
    );
}
