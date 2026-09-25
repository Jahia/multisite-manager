import {focusPane, OTHER, registerPaneElement} from './paneFocus';

describe('paneFocus', () => {
    afterEach(() => {
        registerPaneElement('left', null);
        registerPaneElement('right', null);
    });

    it('should focus the element a pane registered', () => {
        const element = {focus: jest.fn()};
        registerPaneElement('right', element);

        expect(focusPane('right')).toBe(true);
        expect(element.focus).toHaveBeenCalled();
    });

    it('should report that it could not focus a pane with nothing registered', () => {
        expect(focusPane('left')).toBe(false);
    });

    it('should report failure once a pane has unmounted', () => {
        registerPaneElement('left', {focus: jest.fn()});
        registerPaneElement('left', null);

        expect(focusPane('left')).toBe(false);
    });

    it('should point each pane at the other one', () => {
        expect(OTHER.left).toBe('right');
        expect(OTHER.right).toBe('left');
    });
});
