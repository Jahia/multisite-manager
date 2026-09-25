import {msAnchor, msClosePaths, msFocus, msOpenPaths, msSetPath, msSetSelection} from './MultisiteManager.redux';
import {toDraggable} from './dragAndDrop';
import {OTHER} from './paneFocus';

/**
 * What a key press means, as a decision rather than an effect.
 *
 * Separated from the hook so it can be tested without a React tree: the left-arrow behaviour alone -
 * close this branch, or step out to the parent if it is already closed - has more edge cases than
 * is comfortable to leave unguarded.
 *
 * Returns a list of redux actions, an empty list when the key means nothing here, and never
 * dispatches anything itself. `handled` says whether the browser default should be prevented.
 */
export const CLIPBOARD_INTENTS = {c: 'copy', x: 'cut', v: 'paste'};

export const keyboardActions = ({key, ctrlKey, metaKey, shiftKey, altKey}, {pane, rows, focusIndex, openPaths, selection, selectionAnchor}) => {
    const none = {handled: false, actions: [], intent: null, focusPane: null};

    if (rows.length === 0) {
        return none;
    }

    const index = Math.min(Math.max(focusIndex, 0), rows.length - 1);
    const row = rows[index];
    const isOpen = openPaths.includes(row?.node?.path);
    const clamp = to => Math.min(Math.max(to, 0), rows.length - 1);
    const focusOn = to => ({handled: true, intent: null, focusPane: null, actions: [msFocus(pane, clamp(to))]});

    // Shift and an arrow extends from where the range began, not from wherever the cursor is now -
    // otherwise reversing direction would shrink the selection from the wrong end
    const extendTo = to => {
        const target = clamp(to);
        const anchor = selectionAnchor === null || selectionAnchor === undefined ? index : selectionAnchor;
        const from = Math.min(anchor, target);
        const until = Math.max(anchor, target);
        return {
            handled: true,
            intent: null,
            focusPane: null,
            actions: [
                msAnchor(pane, anchor),
                msSetSelection(pane, rows.slice(from, until + 1).map(r => toDraggable(r.node))),
                msFocus(pane, target)
            ]
        };
    };

    // The shortcuts people already have in their fingers. Checked first: ctrl+c must not also be
    // read as a bare "c".
    if ((ctrlKey || metaKey) && !shiftKey && !altKey) {
        if (key === 'a') {
            return {
                handled: true,
                intent: null,
                focusPane: null,
                actions: [msAnchor(pane, 0), msSetSelection(pane, rows.map(r => toDraggable(r.node)))]
            };
        }

        const intent = CLIPBOARD_INTENTS[key];
        return intent ? {handled: true, actions: [], intent, focusPane: null} : none;
    }

    // The two-pane convention: Tab hands over to the other side. Shift+Tab is deliberately left
    // alone, so there is still a way out of the trees to the rest of the page.
    if (key === 'Tab' && !shiftKey && !ctrlKey && !altKey && !metaKey) {
        return {handled: true, intent: null, actions: [], focusPane: OTHER[pane]};
    }

    if (key === 'ArrowDown') {
        return shiftKey ? extendTo(index + 1) : focusOn(index + 1);
    }

    if (key === 'ArrowUp') {
        return shiftKey ? extendTo(index - 1) : focusOn(index - 1);
    }

    if (key === 'ArrowRight') {
        return (row?.hasChildren && !isOpen) ?
            {handled: true, intent: null, actions: [msOpenPaths(pane, [row.node.path])]} :
            none;
    }

    if (key === 'ArrowLeft') {
        if (row?.hasChildren && isOpen) {
            return {handled: true, intent: null, focusPane: null, actions: [msClosePaths(pane, [row.node.path])]};
        }

        // Already closed, so step out: the nearest row above at a shallower depth is the parent
        const stepsBack = rows.slice(0, index).reverse().findIndex(candidate => candidate.depth < row.depth);
        return stepsBack === -1 ? none : focusOn(index - stepsBack - 1);
    }

    if (key === ' ') {
        const isSelected = selection.some(node => node.path === row.node.path);
        return {
            handled: true,
            intent: null,
            focusPane: null,
            actions: [
                msSetSelection(pane, isSelected ?
                    selection.filter(node => node.path !== row.node.path) :
                    [...selection, toDraggable(row.node)]),
                // Wherever a selection last started is where a later shift+arrow extends from
                msAnchor(pane, index)
            ]
        };
    }

    if (key === 'Enter') {
        return {handled: true, intent: null, focusPane: null, actions: [msSetPath(pane, row.node.path)]};
    }

    if (key === 'Escape') {
        return {handled: true, intent: null, focusPane: null, actions: [msSetSelection(pane, [])]};
    }

    return none;
};

export default keyboardActions;
