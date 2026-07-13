/**
 * Keep the keyboard cursor's card in the upper band of its scroll pane.
 *
 * `scrollIntoView({block: 'nearest'})` lets the cursor ride the bottom
 * edge while arrowing down, so long lists demand a manual scroll every
 * few keypresses. Instead, once the card's top passes `band` (default
 * 40%) of the pane height, scroll the pane so the card sits AT the band
 * line — the next cards are always visible below it. Moving up, a card
 * above the visible top snaps to the top edge; cards already inside the
 * band never trigger a scroll, so there's no jitter.
 *
 * Pass as a ref callback on the cursor card: instant (non-smooth)
 * scrolling so rapid keypresses never queue animations.
 */
export function keepCursorInBand(el: HTMLElement | null, band = 0.4): void {
    if (!el) return;

    let pane = el.parentElement;
    while (pane) {
        const overflowY = getComputedStyle(pane).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') break;
        pane = pane.parentElement;
    }
    if (!pane) {
        el.scrollIntoView({ block: 'nearest' });
        return;
    }

    const paneRect = pane.getBoundingClientRect();
    const cardTop = el.getBoundingClientRect().top - paneRect.top;
    const bandLine = paneRect.height * band;

    if (cardTop > bandLine) {
        pane.scrollTop += cardTop - bandLine;
    } else if (cardTop < 0) {
        pane.scrollTop += cardTop;
    }
}
