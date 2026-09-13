/** Omit a trailing type label only where the adjacent badge supplies it. */
export function workHeaderTitle(title: string, type: string, typeLabel: string): string {
    const suffix = title.match(/\s+\(([^()]*)\)\s*$/u);

    if (!suffix) {
        return title;
    }

    const normalize = (value: string) => value.trim().replaceAll('_', ' ').toLocaleLowerCase();
    const matchesBadge = [type, typeLabel].some((label) => normalize(label) === normalize(suffix[1]));
    const shortened = title.slice(0, suffix.index).trimEnd();

    return matchesBadge && shortened ? shortened : title;
}
