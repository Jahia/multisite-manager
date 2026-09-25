import {isStructurallyAllowed, referenceTypeFor} from './transferRules';

const node = path => ({path});

describe('isStructurallyAllowed', () => {
    it('should allow an ordinary move to another folder', () => {
        expect(isStructurallyAllowed([node('/sites/a/contents/x')], '/sites/b/contents', 'cut')).toBe(true);
    });

    it('should refuse dropping something onto itself', () => {
        expect(isStructurallyAllowed([node('/sites/a/contents')], '/sites/a/contents', 'cut')).toBe(false);
    });

    it('should refuse moving a folder inside its own subtree', () => {
        // Asking the server to reparent a folder under its own child is incoherent whichever way
        expect(isStructurallyAllowed([node('/sites/a/contents')], '/sites/a/contents/deep/inner', 'cut')).toBe(false);
        expect(isStructurallyAllowed([node('/sites/a/contents')], '/sites/a/contents/deep/inner', 'copy')).toBe(false);
    });

    it('should refuse a move back into the folder it already sits in', () => {
        expect(isStructurallyAllowed([node('/sites/a/contents/x')], '/sites/a/contents', 'cut')).toBe(false);
    });

    it('should allow a copy into the folder it already sits in', () => {
        // Duplicating in place is ordinary; this was blocked until the copy and move rules were
        // told apart, and is the case most likely to regress if they are merged again
        expect(isStructurallyAllowed([node('/sites/a/contents/x')], '/sites/a/contents', 'copy')).toBe(true);
    });

    it('should refuse when any one of several nodes is refused', () => {
        const nodes = [node('/sites/a/contents/x'), node('/sites/a/contents')];
        expect(isStructurallyAllowed(nodes, '/sites/a/contents/deep', 'cut')).toBe(false);
    });

    it('should refuse without a destination or without nodes', () => {
        expect(isStructurallyAllowed([node('/sites/a/x')], '', 'cut')).toBe(false);
        expect(isStructurallyAllowed([], '/sites/a', 'cut')).toBe(false);
        expect(isStructurallyAllowed(null, '/sites/a', 'cut')).toBe(false);
    });

    it('should not mistake a sibling whose path is a prefix', () => {
        // /contents-archive starts with /contents but is not inside it
        expect(isStructurallyAllowed([node('/sites/a/contents')], '/sites/a/contents-archive', 'cut')).toBe(true);
    });
});

describe('referenceTypeFor', () => {
    it('should reference a file as a file reference', () => {
        expect(referenceTypeFor({isFile: true})).toBe('jnt:fileReference');
    });

    it('should reference a content folder as a content folder reference', () => {
        expect(referenceTypeFor({isContentFolder: true})).toBe('jnt:contentFolderReference');
    });

    it('should reference droppable content as a content reference', () => {
        expect(referenceTypeFor({isDroppable: true})).toBe('jnt:contentReference');
    });

    it('should prefer the specific type when a node is both', () => {
        // A file is droppable content too; the file reference says more, and the destination may
        // accept one and not the other
        expect(referenceTypeFor({isFile: true, isDroppable: true})).toBe('jnt:fileReference');
        expect(referenceTypeFor({isContentFolder: true, isDroppable: true})).toBe('jnt:contentFolderReference');
    });

    it('should report that nothing can reference a page', () => {
        expect(referenceTypeFor({isFile: false, isContentFolder: false, isDroppable: false})).toBeNull();
    });
});
