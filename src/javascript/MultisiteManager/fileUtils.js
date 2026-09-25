/**
 * Recognising images, and finding a thumbnail for them.
 *
 * By extension rather than by mime type: the tree runs on jContent's base node fragment, which
 * does not fetch jcr:mimeType - only the files query handler does - and adding a fragment to every
 * row of every tree to preview a handful of them is a poor trade. jContent falls back to exactly
 * this list when a file's mime type is generic, so the set of extensions matches.
 */
const IMAGE_EXTENSIONS = new Set(['avif', 'png', 'jpeg', 'jpg', 'gif', 'svg', 'img', 'webp', 'bmp']);

export const isImage = node => {
    if (node?.primaryNodeType?.name !== 'jnt:file') {
        return false;
    }

    return IMAGE_EXTENSIONS.has(node.path.split('.').pop().toLowerCase());
};

/**
 * The thumbnail2 rendition of a file.
 *
 * lastModified is carried in the query string so a replaced image is not served from cache under
 * the path it kept.
 */
export const thumbnailUrl = node => {
    const encodedPath = node.path.replace(/[^/]/g, encodeURIComponent);
    const stamp = node.lastModified?.value ? `lastModified=${encodeURIComponent(node.lastModified.value)}&` : '';
    return `${window.contextJsParameters.contextPath}/files/default${encodedPath}?${stamp}t=thumbnail2`;
};
