import {renamesIn} from './renames';

const arrival = (requestedName, landedName) => ({requestedName, landedName, path: '/sites/a/' + landedName});

describe('renamesIn', () => {
    it('should report a name the server changed', () => {
        expect(renamesIn([arrival('news', 'news-1')])).toEqual([{from: 'news', to: 'news-1'}]);
    });

    it('should say nothing when the name was kept', () => {
        expect(renamesIn([arrival('news', 'news')])).toEqual([]);
    });

    it('should report only the ones that changed', () => {
        expect(renamesIn([arrival('a', 'a'), arrival('b', 'b-1'), arrival('c', 'c')]))
            .toEqual([{from: 'b', to: 'b-1'}]);
    });

    it('should not invent a rename when a name is missing', () => {
        // A result without the fields is not evidence of anything
        expect(renamesIn([{path: '/sites/a/x'}])).toEqual([]);
        expect(renamesIn([{requestedName: 'x'}])).toEqual([]);
    });

    it('should cope with nothing at all', () => {
        expect(renamesIn()).toEqual([]);
        expect(renamesIn([])).toEqual([]);
    });

    it('should notice a rename that only differs in case', () => {
        expect(renamesIn([arrival('News', 'news')])).toEqual([{from: 'News', to: 'news'}]);
    });
});
