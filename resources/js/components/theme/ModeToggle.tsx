import type { CSSProperties } from 'react';
import { useTheme } from '../../hooks/useTheme';

interface ModeToggleProps {
    ariaLabel?: string;
}

const buttonStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    border: 'none',
    background: 'transparent',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
    borderRadius: '9999px',
    cursor: 'pointer',
};

export default function ModeToggle({ ariaLabel = 'Toggle light or dark mode' }: ModeToggleProps) {
    const theme = useTheme();
    if (!theme) return null;

    const { mode, toggleMode } = theme;

    return (
        <button
            type="button"
            onClick={toggleMode}
            className="alex-mode-toggle-btn"
            style={buttonStyle}
            aria-label={ariaLabel}
        >
            <span aria-hidden="true">{mode === 'dark' ? '☾' : '☀'}</span>
        </button>
    );
}
