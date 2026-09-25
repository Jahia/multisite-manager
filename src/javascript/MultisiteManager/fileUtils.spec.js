import {isImage, thumbnailUrl} from './fileUtils';

const file = path => ({path, primaryNodeType: {name: 'jnt:file'}, lastModified: {value: '2026-01-01T00:00:00.000Z'}});

describe('isImage', () => {
    it('should recognise the usual image extensions', () => {
        ['a.jpg', 'a.jpeg', 'a.png', 'a.gif', 'a.webp', 'a.svg', 'a.avif', 'a.bmp']
            .forEach(name => expect(isImage(file('/f/' + name))).toBe(true));
    });

    it('should ignore the case of the extension', () => {
        expect(isImage(file('/f/PHOTO.JPG'))).toBe(true);
    });

    it('should not claim other files are images', () => {
        expect(isImage(file('/f/report.pdf'))).toBe(false);
        expect(isImage(file('/f/noextension'))).toBe(false);
    });

    it('should only consider files', () => {
        // A folder called "pictures.png" is still a folder
        expect(isImage({path: '/f/pictures.png', primaryNodeType: {name: 'jnt:folder'}})).toBe(false);
        expect(isImage(undefined)).toBe(false);
    });
});

describe('thumbnailUrl', () => {
    beforeEach(() => {
        window.contextJsParameters = {contextPath: ''};
    });

    it('should ask for the thumbnail2 rendition', () => {
        expect(thumbnailUrl(file('/sites/a/files/x.jpg'))).toContain('t=thumbnail2');
    });

    it('should carry lastModified so a replaced image is not served from cache', () => {
        expect(thumbnailUrl(file('/sites/a/files/x.jpg'))).toContain('lastModified=');
    });

    it('should cope with a file that has no lastModified', () => {
        const url = thumbnailUrl({path: '/sites/a/files/x.jpg', primaryNodeType: {name: 'jnt:file'}});
        expect(url).toContain('t=thumbnail2');
        expect(url).not.toContain('lastModified=');
    });

    it('should encode the path but keep its slashes', () => {
        const url = thumbnailUrl(file('/sites/a/files/my photo.jpg'));
        expect(url).toContain('/sites/a/files/');
        expect(url).toContain('my%20photo.jpg');
    });

    it('should honour a context path', () => {
        window.contextJsParameters = {contextPath: '/jahia'};
        expect(thumbnailUrl(file('/sites/a/x.jpg')).startsWith('/jahia/files/default/')).toBe(true);
    });
});
