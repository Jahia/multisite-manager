import {useDispatch, useSelector} from 'react-redux';
import {msClearClipboard, msSetClipboard, msSetSelection} from './MultisiteManager.redux';
import {OTHER_PANE, REDUX_KEY} from './MultisiteManager.constants';
import {useTransferCheck} from './transferRules';
import {useTransfer} from './useTransfer';

/**
 * Copy, cut and paste for one pane, wherever they are asked for.
 *
 * Shared by the toolbar and the keyboard so the two cannot drift: a shortcut that pasted where the
 * button refused would be worse than having no shortcut.
 *
 * The check runs cache-first, so asking for it in both places costs one query rather than two.
 */
export const usePaneClipboard = pane => {
    const dispatch = useDispatch();
    const {transfer, isPasting} = useTransfer();

    const {selection, path, clipboard} = useSelector(state => ({
        selection: state[REDUX_KEY][pane].selection,
        path: state[REDUX_KEY][pane].path,
        clipboard: state[REDUX_KEY].clipboard
    }));

    const {loading: isChecking, canPaste: typesAllowPaste, canReference, typeByPath,
        isReadOnly, missingLanguages} = useTransferCheck(path, clipboard);

    const hasSelection = selection.length > 0;
    const hasClipboard = clipboard.nodes.length > 0;
    const ready = hasClipboard && Boolean(path) && !isPasting && !isChecking;

    const copyCut = type => {
        if (!hasSelection) {
            return;
        }

        dispatch(msSetClipboard(type, selection));
        dispatch(msSetSelection(pane, []));
    };

    const paste = async () => {
        if (!ready || !typesAllowPaste) {
            return;
        }

        const {failures} = await transfer({
            clipboard,
            toPane: pane,
            fromPane: OTHER_PANE[pane],
            destination: path
        });

        // A cut is spent once pasted; a copy stays, so the same item can be put in several places
        if (clipboard.type === 'cut' && failures.length === 0) {
            dispatch(msClearClipboard());
        }
    };

    const pasteAsReference = async () => {
        if (!ready || !canReference || clipboard.type === 'cut') {
            return;
        }

        await transfer({clipboard, toPane: pane, destination: path, asReferenceTypes: typeByPath});
    };

    return {
        selection, path, clipboard, hasSelection, hasClipboard,
        isChecking, isPasting, isReadOnly, missingLanguages,
        canPaste: ready && typesAllowPaste,
        canPasteReference: ready && canReference && clipboard.type !== 'cut',
        copy: () => copyCut('copy'),
        cut: () => copyCut('cut'),
        paste,
        pasteAsReference
    };
};

export default usePaneClipboard;
