/**
 * What undoing a transfer has to do about the name.
 *
 * A move that arrived under a different name - because the destination already had one - keeps that
 * name when it goes back. The node itself is returned to where it came from, but called something
 * it was never called there, so the undo restores the place and not the thing. Anyone comparing
 * before and after finds "news-1" sitting where "news" used to be.
 *
 * So the name has to be put back too, and only when it was actually changed.
 */
export const nameToRestore = entry => {
    if (!entry?.requestedName || !entry?.landedName) {
        return null;
    }

    return entry.landedName === entry.requestedName ? null : entry.requestedName;
};

export default nameToRestore;
