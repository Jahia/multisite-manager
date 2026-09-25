import {PANES, REDUX_KEY} from './MultisiteManager.constants';

/**
 * State for the two panes.
 *
 * Deliberately *not* `state.site`: that one is the application's current site, shared with
 * jahia-ui-root and jContent, and changing it would move the whole UI. A pane has to be able to
 * show a site without the rest of the product following it, so each keeps its own.
 *
 * The shape mirrors the slice jContent's own browser reads, because the components borrowed from it
 * expect exactly these fields - only the path into the store differs, and that is injected.
 */
const emptyPane = {
    site: '',
    mode: '',
    path: '',
    openPaths: [],
    selection: [],
    // Paths of rows just pasted into this pane, tinted briefly so the result of the action is
    // visible without having to hunt for it
    highlighted: [],
    // Bumped to make a pane re-read its folder after something has been pasted into it
    reloadCount: 0
};

export const MS_SET_SITE = 'MULTISITE_SET_SITE';
export const MS_SET_PATH = 'MULTISITE_SET_PATH';
export const MS_SET_MODE = 'MULTISITE_SET_MODE';
export const MS_OPEN_PATHS = 'MULTISITE_OPEN_PATHS';
export const MS_CLOSE_PATHS = 'MULTISITE_CLOSE_PATHS';
export const MS_SET_SELECTION = 'MULTISITE_SET_SELECTION';
export const MS_RELOAD = 'MULTISITE_RELOAD';
export const MS_CLIPBOARD = 'MULTISITE_CLIPBOARD';
export const MS_HIGHLIGHT = 'MULTISITE_HIGHLIGHT';

export const msSetSite = (pane, site) => ({type: MS_SET_SITE, pane, site});
export const msSetPath = (pane, path) => ({type: MS_SET_PATH, pane, path});
export const msSetMode = (pane, mode) => ({type: MS_SET_MODE, pane, mode});
export const msOpenPaths = (pane, paths) => ({type: MS_OPEN_PATHS, pane, paths});
export const msClosePaths = (pane, paths) => ({type: MS_CLOSE_PATHS, pane, paths});
export const msSetSelection = (pane, selection) => ({type: MS_SET_SELECTION, pane, selection});
export const msReload = pane => ({type: MS_RELOAD, pane});
export const msHighlight = (pane, paths) => ({type: MS_HIGHLIGHT, pane, paths});

/** The type is 'copy' or 'cut'; an empty nodes list means the clipboard is empty. */
export const msSetClipboard = (type, nodes) => ({type: MS_CLIPBOARD, clipboard: {type, nodes}});
export const msClearClipboard = () => ({type: MS_CLIPBOARD, clipboard: {type: 'copy', nodes: []}});

const paneReducer = (state, action) => {
    switch (action.type) {
        case MS_SET_SITE:
            // A pane that changes site cannot keep its path, open branches or selection: they all
            // belong to the site it is leaving. Mode survives, so you stay in Pages or Media.
            return {...state, site: action.site, path: '', openPaths: [], selection: [], highlighted: []};
        case MS_SET_PATH:
            // Moving to another folder drops the selection with it, so a later paste cannot act on
            // rows the reader can no longer see
            return {...state, path: action.path, selection: [], highlighted: []};
        case MS_SET_MODE:
            return {...state, mode: action.mode};
        case MS_OPEN_PATHS:
            return {...state, openPaths: [...new Set([...state.openPaths, ...action.paths])]};
        case MS_CLOSE_PATHS:
            return {...state, openPaths: state.openPaths.filter(p => !action.paths.includes(p))};
        case MS_SET_SELECTION:
            return {...state, selection: action.selection};
        case MS_RELOAD:
            return {...state, reloadCount: state.reloadCount + 1};
        case MS_HIGHLIGHT:
            return {...state, highlighted: action.paths};
        default:
            return state;
    }
};

const initialState = {
    ...PANES.reduce((acc, pane) => ({...acc, [pane]: {...emptyPane}}), {}),
    // One clipboard for the whole manager, not one per pane: copying in one side and pasting in the
    // other is the entire point, so a per-pane clipboard would have nothing to say
    clipboard: {type: 'copy', nodes: []}
};

export const multisiteManager = (state = initialState, action = {}) => {
    if (action.type === MS_CLIPBOARD) {
        return {...state, clipboard: action.clipboard};
    }

    if (!action.pane || !PANES.includes(action.pane)) {
        return state;
    }

    const next = paneReducer(state[action.pane] || emptyPane, action);
    return next === state[action.pane] ? state : {...state, [action.pane]: next};
};

export const registerReducer = registry => {
    registry.add('redux-reducer', REDUX_KEY, {targets: ['root'], reducer: multisiteManager});
};

/** Reads one pane in the shape the borrowed jContent components expect. */
export const paneSelector = pane => state => ({
    siteKey: state[REDUX_KEY][pane].site,
    lang: state.language,
    language: state.language,
    mode: state[REDUX_KEY][pane].mode,
    path: state[REDUX_KEY][pane].path,
    openPaths: state[REDUX_KEY][pane].openPaths
});
