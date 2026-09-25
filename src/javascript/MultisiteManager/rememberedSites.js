/**
 * The pair of sites a reader was last looking at.
 *
 * People who use this screen tend to work between the same two sites for a while, and opening on
 * "the current site, twice" makes them redo the same choice every time.
 *
 * Kept in localStorage rather than in the repository: it is a convenience of this browser, not a
 * preference worth storing against the user, and it must never be the reason something fails.
 * Every access is guarded - a private window, blocked site data or a full quota all throw.
 */
const KEY = 'multisite-manager-sites';

export const readRememberedSites = () => {
    try {
        const raw = window.localStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (_) {
        return {};
    }
};

export const rememberSite = (pane, site) => {
    if (!site) {
        return;
    }

    try {
        window.localStorage.setItem(KEY, JSON.stringify({...readRememberedSites(), [pane]: site}));
    } catch (_) {
        // Remembering is a nicety; failing to remember is not worth telling anyone about
    }
};
