import CompactUserMenu from "@alexandria/components/navigation/CompactUserMenu";
import useT from "@alexandria/hooks/useT";

export default function MobileWritingHeader({
    title,
    reading,
    onDesk,
    onTools,
    onReading,
}: {
    title: string;
    reading: boolean;
    onDesk: () => void;
    onTools: () => void;
    onReading: () => void;
}) {
    const t = useT();

    return (
        <div
            className="flex min-w-0 items-center gap-1 px-2 py-1"
            data-writing-mobile-header
        >
            <button
                type="button"
                className="writing-touch-button"
                onClick={onDesk}
                aria-label={t("writing.tools.desk")}
            >
                <i className="fa-solid fa-feather-pointed" aria-hidden="true" />
            </button>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {title}
            </span>
            <button
                type="button"
                className="writing-touch-button"
                onClick={onReading}
                aria-pressed={reading}
                aria-label={t(
                    reading ? "writing.tools.edit" : "writing.tools.read",
                )}
            >
                <i
                    className={`fa-solid ${reading ? "fa-pen" : "fa-book-open"}`}
                    aria-hidden="true"
                />
            </button>
            <button
                type="button"
                className="writing-touch-button"
                onClick={onTools}
                aria-label={t("writing.tools.search")}
            >
                <i
                    className="fa-solid fa-magnifying-glass"
                    aria-hidden="true"
                />
            </button>
            <CompactUserMenu size={36} ariaLabel={t("ribbon.account")} />
        </div>
    );
}
