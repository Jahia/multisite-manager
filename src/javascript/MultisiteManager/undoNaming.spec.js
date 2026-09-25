import {nameToRestore} from './undoNaming';

describe('nameToRestore', () => {
    it('should put back the name a paste had to change', () => {
        // Undo that restores the place but not the name leaves "news-1" where "news" used to be
        expect(nameToRestore({requestedName: 'news', landedName: 'news-1'})).toBe('news');
    });

    it('should leave a name that was never changed alone', () => {
        expect(nameToRestore({requestedName: 'news', landedName: 'news'})).toBeNull();
    });

    it('should do nothing without both names to compare', () => {
        expect(nameToRestore({requestedName: 'news'})).toBeNull();
        expect(nameToRestore({landedName: 'news-1'})).toBeNull();
        expect(nameToRestore({})).toBeNull();
        expect(nameToRestore(undefined)).toBeNull();
    });

    it('should treat a difference in case as a change', () => {
        expect(nameToRestore({requestedName: 'News', landedName: 'news'})).toBe('News');
    });
});
