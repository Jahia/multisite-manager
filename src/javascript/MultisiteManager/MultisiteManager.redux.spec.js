import {
    msClosePaths, msFocus, msHighlight, msOpenPaths, msReload, msSetClipboard, msSetPath,
    msSetSelection, msSetSite, msSetUndo, multisiteManager
} from './MultisiteManager.redux';

const reduce = (actions, from) => actions.reduce((state, action) => multisiteManager(state, action), from);
const initial = multisiteManager(undefined, {type: '@@INIT'});

describe('multisiteManager reducer', () => {
    it('should start with two empty panes and nothing on the clipboard', () => {
        expect(initial.left.site).toBe('');
        expect(initial.right.site).toBe('');
        expect(initial.clipboard.nodes).toEqual([]);
        expect(initial.undo).toBeNull();
    });

    it('should keep the panes independent', () => {
        const state = reduce([msSetSite('left', 'a'), msSetSite('right', 'b')], initial);
        expect(state.left.site).toBe('a');
        expect(state.right.site).toBe('b');
    });

    it('should drop path, open branches and selection when a pane changes site', () => {
        // They all describe the site being left; carrying them over would point at nothing
        const state = reduce([
            msSetSite('left', 'a'),
            msOpenPaths('left', ['/sites/a/contents']),
            msSetPath('left', '/sites/a/contents'),
            msSetSelection('left', [{path: '/sites/a/contents/x'}]),
            msSetSite('left', 'b')
        ], initial);
        expect(state.left).toMatchObject({site: 'b', path: '', openPaths: [], selection: []});
    });

    it('should keep the selection when only the destination changes', () => {
        // Choosing where to paste must not discard what was chosen to move
        const state = reduce([
            msSetSelection('left', [{path: '/sites/a/x'}]),
            msSetPath('left', '/sites/a/contents')
        ], initial);
        expect(state.left.selection).toEqual([{path: '/sites/a/x'}]);
        expect(state.left.path).toBe('/sites/a/contents');
    });

    it('should not open the same branch twice', () => {
        const state = reduce([
            msOpenPaths('left', ['/a']),
            msOpenPaths('left', ['/a', '/b'])
        ], initial);
        expect(state.left.openPaths).toEqual(['/a', '/b']);
    });

    it('should close only what was asked for', () => {
        const state = reduce([msOpenPaths('left', ['/a', '/b']), msClosePaths('left', ['/a'])], initial);
        expect(state.left.openPaths).toEqual(['/b']);
    });

    it('should share one clipboard between the panes', () => {
        const state = multisiteManager(initial, msSetClipboard('cut', [{path: '/a'}]));
        expect(state.clipboard).toEqual({type: 'cut', nodes: [{path: '/a'}]});
    });

    it('should bump the reload counter so a pane re-reads itself', () => {
        const state = reduce([msReload('left'), msReload('left')], initial);
        expect(state.left.reloadCount).toBe(2);
        expect(state.right.reloadCount).toBe(0);
    });

    it('should ignore an action aimed at no pane, or at one that does not exist', () => {
        expect(multisiteManager(initial, {type: 'MULTISITE_RELOAD'})).toBe(initial);
        expect(multisiteManager(initial, {type: 'MULTISITE_RELOAD', pane: 'middle'})).toBe(initial);
    });

    it('should record and clear an undo snapshot', () => {
        const snapshot = {kind: 'move', pane: 'right', entries: [{uuid: 'u1'}]};
        const state = multisiteManager(initial, msSetUndo(snapshot));
        expect(state.undo).toBe(snapshot);
        expect(multisiteManager(state, msSetUndo(null)).undo).toBeNull();
    });

    it('should drop a highlight when the pane moves elsewhere', () => {
        const state = reduce([
            msHighlight('left', ['/a/x']),
            msSetPath('left', '/a/other')
        ], initial);
        expect(state.left.highlighted).toEqual([]);
    });

    it('should remember where the keyboard is, per pane', () => {
        const state = reduce([msFocus('left', 4)], initial);
        expect(state.left.focusIndex).toBe(4);
        expect(state.right.focusIndex).toBe(0);
    });
});
