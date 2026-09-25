/**
 * Which of these arrivals were given a different name than they asked for.
 *
 * Both mutations paste with namingConflictResolution: RENAME, so a name already taken is resolved
 * by the server without a word - "news" quietly becomes "news-1". The tint shows where something
 * landed, never that it landed under another name, and someone who then goes looking for "news"
 * finds the one that was already there.
 *
 * Comparing what was asked for against what came back is the only way to know.
 */
export const renamesIn = (results = []) => results
    .filter(result => result.requestedName && result.landedName && result.landedName !== result.requestedName)
    .map(result => ({from: result.requestedName, to: result.landedName}));

export default renamesIn;
