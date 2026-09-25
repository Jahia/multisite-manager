import {useCallback} from 'react';
import {useDispatch} from 'react-redux';
import {keyboardActions} from './keyboardActions';
import {focusPane} from './paneFocus';

/**
 * Driving a pane from the keyboard.
 *
 * A transfer tool is used heavily by a few people, and those people do not want to point at every
 * row. The gestures follow what a file manager does, because that is what this resembles:
 *
 *   up / down      move through the rows
 *   right / left   open a branch, or close it - left on a closed row steps out to its parent
 *   space          add or remove the focused row from the selection
 *   enter          make the focused folder the destination
 *   ctrl+c / x     copy or cut the selection
 *   ctrl+v         paste into this pane
 *   escape         clear the selection
 *   shift+arrow    extend the selection from where the range began
 *   ctrl+a         select everything in this pane
 *   tab            hand over to the other pane
 *
 * The deciding is in keyboardActions, which is pure and tested; this only carries it out.
 */
export const useKeyboard = ({pane, rows, focusIndex, selectionAnchor, openPaths, selection, onCopy, onCut, onPaste}) => {
    const dispatch = useDispatch();

    return useCallback(event => {
        const {handled, actions, intent, focusPane: handOverTo} = keyboardActions(
            event, {pane, rows, focusIndex, selectionAnchor, openPaths, selection}
        );

        // The key is only swallowed if the other pane could actually take focus, so tabbing at an
        // empty pane falls through to the browser rather than going nowhere
        const handedOver = handOverTo ? focusPane(handOverTo) : false;

        if (handled && (!handOverTo || handedOver)) {
            event.preventDefault();
        }

        actions.forEach(action => dispatch(action));

        if (intent === 'copy') {
            onCopy();
        } else if (intent === 'cut') {
            onCut();
        } else if (intent === 'paste') {
            onPaste();
        }
    }, [dispatch, pane, rows, focusIndex, selectionAnchor, openPaths, selection, onCopy, onCut, onPaste]);
};

export default useKeyboard;
