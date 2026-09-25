/**
 * A way to call off a transfer that is already running.
 *
 * Module-level rather than a hook's own state, because the loop doing the work and the button
 * asking it to stop are in different components - the toolbar starts a paste, the pane starts a
 * drop - and a cancel has to reach whichever one is running. Only one transfer runs at a time: the
 * controls are disabled while it does, which is what makes a single token honest.
 *
 * Checked between items, never in the middle of one. A paste that has been sent is finished;
 * cancelling stops the next one, it does not undo the last.
 */
let cancelled = false;

export const beginTransfer = () => {
    cancelled = false;
};

export const requestCancel = () => {
    cancelled = true;
};

export const isCancelled = () => cancelled;
