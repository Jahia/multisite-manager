export const MULTISITE_ROUTE = '/multisite-manager';

// The two panes are ordinary, symmetrical instances of the same browser. Nothing distinguishes
// "source" from "destination": either side can be copied from and pasted into, which is what makes
// the view usable in both directions without a mode switch.
export const PANES = ['left', 'right'];

// One accordion target per pane, so each pane's tree can be bound to its own slice of state
export const paneTarget = pane => `multisite-${pane}`;

export const REDUX_KEY = 'multisiteManager';

/** The pane a transfer came from, given the one it is going to. */
export const OTHER_PANE = {left: 'right', right: 'left'};
