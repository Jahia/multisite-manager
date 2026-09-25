import {flattenTree, orderTopLevel} from './treeRows';

const node = (name, type, subRows) => ({
    name,
    path: '/sites/a/' + name,
    primaryNodeType: {name: type},
    hasSubRows: Boolean(subRows?.length),
    subRows
});

describe('orderTopLevel', () => {
    it('should put pages, then content folders, then media', () => {
        const ordered = orderTopLevel([
            node('files', 'jnt:folder'),
            node('contents', 'jnt:contentFolder'),
            node('home', 'jnt:page')
        ]);
        expect(ordered.map(n => n.name)).toEqual(['home', 'contents', 'files']);
    });

    it('should sort alphabetically within a group', () => {
        const ordered = orderTopLevel([node('zebra', 'jnt:page'), node('alpha', 'jnt:page')]);
        expect(ordered.map(n => n.name)).toEqual(['alpha', 'zebra']);
    });

    it('should put anything jContent has no accordion for after the three it does', () => {
        const ordered = orderTopLevel([node('other', 'jnt:something'), node('files', 'jnt:folder')]);
        expect(ordered.map(n => n.name)).toEqual(['files', 'other']);
    });

    it('should not modify the array it was given', () => {
        const input = [node('files', 'jnt:folder'), node('home', 'jnt:page')];
        orderTopLevel(input);
        expect(input.map(n => n.name)).toEqual(['files', 'home']);
    });
});

describe('flattenTree', () => {
    it('should record how deep each node sits', () => {
        const rows = flattenTree([node('site', 'jnt:virtualsite', [node('home', 'jnt:page', [node('child', 'jnt:page')])])]);
        expect(rows.map(r => [r.node.name, r.depth])).toEqual([['site', 0], ['home', 1], ['child', 2]]);
    });

    it('should order the site’s own children, and only those', () => {
        // Deeper branches keep the query's alphabetical sort, which is what makes them findable
        const deep = node('home', 'jnt:page', [node('zebra', 'jnt:page'), node('alpha', 'jnt:page')]);
        const rows = flattenTree([node('site', 'jnt:virtualsite', [node('files', 'jnt:folder'), deep])]);
        expect(rows.map(r => r.node.name)).toEqual(['site', 'home', 'zebra', 'alpha', 'files']);
    });

    it('should mark which rows can be opened', () => {
        const rows = flattenTree([node('site', 'jnt:virtualsite', [node('leaf', 'jnt:page')])]);
        expect(rows.map(r => r.hasChildren)).toEqual([true, false]);
    });

    it('should cope with nothing', () => {
        expect(flattenTree(null)).toEqual([]);
        expect(flattenTree([])).toEqual([]);
    });
});
