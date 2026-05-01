import { cn } from '../../lib/utils';

interface ToggleProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    name?: string;
    disabled?: boolean;
}

export default function Toggle({ label, description, checked, onChange, name, disabled }: ToggleProps) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
            <div>
                <span className="text-sm font-medium">{label}</span>
                {description && (
                    <p className="text-xs text-base-content/50">{description}</p>
                )}
            </div>
            <input
                type="checkbox"
                name={name}
                className={cn('toggle', checked && 'toggle-primary')}
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
            />
        </label>
    );
}
