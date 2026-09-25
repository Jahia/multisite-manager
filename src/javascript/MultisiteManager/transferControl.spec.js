import {beginTransfer, isCancelled, requestCancel} from './transferControl';

describe('transferControl', () => {
    beforeEach(() => beginTransfer());

    it('should start a transfer uncancelled', () => {
        expect(isCancelled()).toBe(false);
    });

    it('should report a cancellation once asked', () => {
        requestCancel();
        expect(isCancelled()).toBe(true);
    });

    it('should not carry a cancellation into the next transfer', () => {
        // Otherwise one stopped transfer would stop every one after it
        requestCancel();
        beginTransfer();
        expect(isCancelled()).toBe(false);
    });

    it('should stay cancelled until the next transfer begins', () => {
        requestCancel();
        expect(isCancelled()).toBe(true);
        expect(isCancelled()).toBe(true);
    });
});
