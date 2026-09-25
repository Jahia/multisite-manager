import {canDropInto, isFolder, toDraggable} from './dragAndDrop';

describe('isFolder', () => {
    it('should accept the things that can hold content', () => {
        ['jnt:folder', 'jnt:contentFolder', 'jnt:page', 'jnt:contentList']
            .forEach(type => expect(isFolder({primaryNodeType: {name: type}})).toBe(true));
    });

    it('should refuse a leaf, and nothing at all', () => {
        expect(isFolder({primaryNodeType: {name: 'jnt:file'}})).toBe(false);
        expect(isFolder(undefined)).toBe(false);
    });
});

describe('canDropInto', () => {
    it('should treat a drag as a move', () => {
        // Dropping back where it already is would do nothing, so it is refused - the distinction
        // that only applies to moves
        expect(canDropInto([{path: '/sites/a/contents/x'}], '/sites/a/contents')).toBe(false);
        expect(canDropInto([{path: '/sites/a/contents/x'}], '/sites/b/contents')).toBe(true);
    });
});

describe('toDraggable', () => {
    it('should keep only what a transfer needs', () => {
        const node = {path: '/a/x', uuid: 'u1', name: 'x', displayName: 'X', subRows: [], hasSubRows: true};
        expect(toDraggable(node)).toEqual({path: '/a/x', uuid: 'u1', name: 'x', displayName: 'X'});
    });
});
