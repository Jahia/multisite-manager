/**
 * Moving keyboard focus from one pane to the other.
 *
 * A module-level register rather than context, for the same reason the cancellation token is: the
 * panes are two fixed singletons, and the code that wants to hand focus over is inside one of them.
 */
const elements = {};

export const registerPaneElement = (pane, element) => {
    elements[pane] = element;
};

/**
 * Says whether it landed. A pane showing a placeholder - empty, still loading - has no grid to
 * register, and a tab that goes nowhere while the key is swallowed would trap the reader; the
 * caller lets the browser have the key back instead.
 */
export const focusPane = pane => {
    const element = elements[pane];
    if (!element) {
        return false;
    }

    element.focus();
    return true;
};

export const OTHER = {left: 'right', right: 'left'};
