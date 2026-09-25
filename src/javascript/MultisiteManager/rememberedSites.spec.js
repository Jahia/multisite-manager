import {readRememberedSites, rememberSite} from './rememberedSites';

describe('rememberedSites', () => {
    beforeEach(() => window.localStorage.clear());

    it('should remember a site per pane', () => {
        rememberSite('left', 'alpha');
        rememberSite('right', 'beta');
        expect(readRememberedSites()).toEqual({left: 'alpha', right: 'beta'});
    });

    it('should return nothing when there is nothing remembered', () => {
        expect(readRememberedSites()).toEqual({});
    });

    it('should ignore an empty site rather than remembering a blank', () => {
        rememberSite('left', '');
        expect(readRememberedSites()).toEqual({});
    });

    it('should survive rubbish in storage', () => {
        window.localStorage.setItem('multisite-manager-sites', 'not json');
        expect(readRememberedSites()).toEqual({});
    });

    it('should survive storage that throws', () => {
        // A private window, blocked site data or a full quota all throw; remembering is a nicety
        // and must never be the reason something fails
        const getItem = jest.spyOn(window.Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('denied');
        });
        const setItem = jest.spyOn(window.Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('denied');
        });

        expect(readRememberedSites()).toEqual({});
        expect(() => rememberSite('left', 'alpha')).not.toThrow();

        getItem.mockRestore();
        setItem.mockRestore();
    });
});
