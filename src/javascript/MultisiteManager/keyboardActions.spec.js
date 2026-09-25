import {keyboardActions} from './keyboardActions';
import {MS_ANCHOR, MS_CLOSE_PATHS, MS_FOCUS, MS_OPEN_PATHS, MS_SET_PATH, MS_SET_SELECTION} from './MultisiteManager.redux';

const row = (name, depth, hasChildren = false) => ({
    node: {path: '/sites/a/' + name, name, uuid: 'u-' + name},
    depth,
    hasChildren
});

// A site holding an open 'home' with one child, and a closed 'files' beside it
const rows = [row('site', 0, true), row('home', 1, true), row('child', 2), row('files', 1)];

const press = (key, context = {}, modifiers = {}) => keyboardActions(
    {key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...modifiers},
    {pane: 'left', rows, focusIndex: 0, openPaths: ['/sites/a/home'], selection: [], ...context}
);

describe('keyboardActions', () => {
    it('should do nothing when there are no rows', () => {
        expect(press('ArrowDown', {rows: []})).toMatchObject({handled: false, actions: []});
    });

    it('should move down and up through the rows', () => {
        expect(press('ArrowDown').actions[0]).toMatchObject({type: MS_FOCUS, focusIndex: 1});
        expect(press('ArrowUp', {focusIndex: 2}).actions[0]).toMatchObject({type: MS_FOCUS, focusIndex: 1});
    });

    it('should not move past either end', () => {
        expect(press('ArrowUp', {focusIndex: 0}).actions[0]).toMatchObject({focusIndex: 0});
        expect(press('ArrowDown', {focusIndex: 3}).actions[0]).toMatchObject({focusIndex: 3});
    });

    it('should open a closed branch with the right arrow', () => {
        expect(press('ArrowRight', {focusIndex: 0}).actions[0]).toMatchObject({type: MS_OPEN_PATHS});
    });

    it('should do nothing with the right arrow on a leaf or an open branch', () => {
        expect(press('ArrowRight', {focusIndex: 2}).handled).toBe(false);
        expect(press('ArrowRight', {focusIndex: 1}).handled).toBe(false);
    });

    it('should close an open branch with the left arrow', () => {
        expect(press('ArrowLeft', {focusIndex: 1}).actions[0]).toMatchObject({type: MS_CLOSE_PATHS});
    });

    it('should step out to the parent when the left arrow finds a closed row', () => {
        // On 'child' (depth 2), the nearest shallower row above is 'home' at index 1
        expect(press('ArrowLeft', {focusIndex: 2}).actions[0]).toMatchObject({type: MS_FOCUS, focusIndex: 1});
    });

    it('should do nothing stepping out from the top row', () => {
        expect(press('ArrowLeft', {focusIndex: 0, openPaths: []}).handled).toBe(false);
    });

    it('should add the focused row to the selection with space', () => {
        const {actions} = press(' ', {focusIndex: 1});
        expect(actions[0]).toMatchObject({type: MS_SET_SELECTION});
        expect(actions[0].selection.map(n => n.path)).toEqual(['/sites/a/home']);
    });

    it('should remove it again with space', () => {
        const selection = [{path: '/sites/a/home'}];
        expect(press(' ', {focusIndex: 1, selection}).actions[0].selection).toEqual([]);
    });

    it('should make the focused row the destination with enter', () => {
        expect(press('Enter', {focusIndex: 1}).actions[0]).toMatchObject({type: MS_SET_PATH, path: '/sites/a/home'});
    });

    it('should clear the selection with escape', () => {
        expect(press('Escape', {selection: [{path: '/a'}]}).actions[0].selection).toEqual([]);
    });

    it('should report the clipboard shortcuts as intents, not actions', () => {
        // The pane owns the clipboard operations; this only says which was asked for
        expect(press('c', {}, {ctrlKey: true})).toMatchObject({handled: true, intent: 'copy', actions: []});
        expect(press('x', {}, {ctrlKey: true})).toMatchObject({intent: 'cut'});
        expect(press('v', {}, {ctrlKey: true})).toMatchObject({intent: 'paste'});
        expect(press('v', {}, {metaKey: true})).toMatchObject({intent: 'paste'});
    });

    it('should not read a bare letter as a clipboard shortcut', () => {
        expect(press('c').handled).toBe(false);
    });

    it('should leave ctrl combinations with other modifiers alone', () => {
        // Ctrl+Shift+C is the browser's, not ours
        expect(press('c', {}, {ctrlKey: true, shiftKey: true}).handled).toBe(false);
    });

    it('should ignore keys it has no meaning for', () => {
        expect(press('F7')).toMatchObject({handled: false, actions: [], intent: null});
    });

    describe('moving between the panes', () => {
        it('should hand over to the other pane with tab', () => {
            expect(press('Tab')).toMatchObject({handled: true, focusPane: 'right', actions: []});
        });

        it('should hand back from the other side', () => {
            const result = keyboardActions(
                {key: 'Tab', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false},
                {pane: 'right', rows, focusIndex: 0, openPaths: [], selection: []}
            );
            expect(result.focusPane).toBe('left');
        });

        it('should leave shift+tab alone, so there is a way out of the trees', () => {
            expect(press('Tab', {}, {shiftKey: true}).handled).toBe(false);
        });
    });

    describe('selecting a range', () => {
        it('should extend the selection with shift and an arrow', () => {
            const {actions} = press('ArrowDown', {focusIndex: 0}, {shiftKey: true});
            const selection = actions.find(a => a.selection)?.selection;
            expect(selection.map(n => n.name)).toEqual(['site', 'home']);
        });

        it('should extend from where the range began, not from the cursor', () => {
            // Anchored at 0 and now at 2, pressing shift+down must cover 0..3 rather than 2..3
            const {actions} = press('ArrowDown', {focusIndex: 2, selectionAnchor: 0}, {shiftKey: true});
            const selection = actions.find(a => a.selection)?.selection;
            expect(selection.map(n => n.name)).toEqual(['site', 'home', 'child', 'files']);
        });

        it('should shrink again when the direction reverses', () => {
            const {actions} = press('ArrowUp', {focusIndex: 3, selectionAnchor: 1}, {shiftKey: true});
            const selection = actions.find(a => a.selection)?.selection;
            expect(selection.map(n => n.name)).toEqual(['home', 'child']);
        });

        it('should still move the cursor while extending', () => {
            const {actions} = press('ArrowDown', {focusIndex: 0}, {shiftKey: true});
            expect(actions.find(a => a.type === MS_FOCUS)).toMatchObject({focusIndex: 1});
        });

        it('should select every row with ctrl+a', () => {
            const {actions} = press('a', {}, {ctrlKey: true});
            const selection = actions.find(a => a.selection)?.selection;
            expect(selection).toHaveLength(rows.length);
        });

        it('should remember where a range started when space selects a row', () => {
            const {actions} = press(' ', {focusIndex: 2});
            expect(actions.find(a => a.type === MS_ANCHOR)).toMatchObject({selectionAnchor: 2});
        });
    });
});
