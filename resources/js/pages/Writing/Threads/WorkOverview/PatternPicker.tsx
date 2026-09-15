import PickerDropdown from "@alexandria/components/ui/PickerDropdown";

/** Form labels and consistent field sizing for the overview's shared pickers. */
export default function PatternPicker({
    id,
    label,
    ariaLabel,
    value,
    options,
    placeholder,
    disabled,
    onChange,
}: {
    id?: string;
    label?: string;
    ariaLabel?: string;
    value: string;
    options: { value: string | number; label: string }[];
    placeholder?: string;
    disabled?: boolean;
    onChange: (value: string) => void;
}) {
    const choices = options.map((option) => ({
        ...option,
        value: String(option.value),
    }));

    return (
        <div className="w-full">
            {label && (
                <label className="mb-1.5 block text-xs opacity-50" htmlFor={id}>
                    {label}
                </label>
            )}
            <PickerDropdown
                id={id}
                ariaLabel={ariaLabel ?? label}
                value={value}
                options={
                    placeholder
                        ? [{ value: "", label: placeholder }, ...choices]
                        : choices
                }
                onChange={onChange}
                disabled={disabled}
                fullWidth
                className="h-11"
                style={{ fontSize: "1rem" }}
            />
        </div>
    );
}
