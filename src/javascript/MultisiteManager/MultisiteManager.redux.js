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
    openPaths: []
};

export const MS_SET_SITE = 'MULTISITE_SET_SITE';
export const MS_SET_PATH = 'MULTISITE_SET_PATH';
export const MS_SET_MODE = 'MULTISITE_SET_MODE';
export const MS_OPEN_PATHS = 'MULTISITE_OPEN_PATHS';
export const MS_CLOSE_PATHS = 'MULTISITE_CLOSE_PATHS';

export const msSetSite = (pane, site) => ({type: MS_SET_SITE, pane, site});
export const msSetPath = (pane, path) => ({type: MS_SET_PATH, pane, path});
export const msSetMode = (pane, mode) => ({type: MS_SET_MODE, pane, mode});
export const msOpenPaths = (pane, paths) => ({type: MS_OPEN_PATHS, pane, paths});
export const msClosePaths = (pane, paths) => ({type: MS_CLOSE_PATHS, pane, paths});

const paneReducer = (state, action) => {
    switch (action.type) {
        case MS_SET_SITE:
            // A pane that changes site cannot keep its path or open branches: they belong to the
            // site it is leaving. Mode survives, so switching sites keeps you in Pages or Media.
            return {...state, site: action.site, path: '', openPaths: []};
        case MS_SET_PATH:
            return {...state, path: action.path};
        case MS_SET_MODE:
            return {...state, mode: action.mode};
        case MS_OPEN_PATHS:
            return {...state, openPaths: [...new Set([...state.openPaths, ...action.paths])]};
        case MS_CLOSE_PATHS:
            return {...state, openPaths: state.openPaths.filter(p => !action.paths.includes(p))};
        default:
            return state;
    }
};

const initialState = PANES.reduce((acc, pane) => ({...acc, [pane]: {...emptyPane}}), {});

export const multisiteManager = (state = initialState, action = {}) => {
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
