import React, {useState} from 'react';
import {createPortal} from 'react-dom';
import PropTypes from 'prop-types';
import {thumbnailUrl} from './fileUtils';
import styles from './MultisiteManager.scss';

// Far enough from the pointer not to sit under it, close enough to read as belonging to the row
const OFFSET_PX = 16;
const PREVIEW_PX = 180;

/**
 * A thumbnail that follows the pointer while it is over an image row.
 *
 * Rendered into the body through a portal: its place in the tree is a row, and a div inside a <tr>
 * is not valid markup. Fixed rather than absolute, because the tree scrolls and anything positioned
 * inside it would be clipped at the edge of the panel.
 *
 * Jahia generates renditions lazily, so thumbnail2 may not exist yet for a freshly uploaded image.
 * Rather than show a broken image, the preview removes itself when the load fails.
 */
export const ThumbnailPreview = ({node, at}) => {
    const [hasFailed, setHasFailed] = useState(false);

    if (hasFailed || !at) {
        return null;
    }

    // Flip to the left of the pointer when there is not enough room on the right
    const overflowsRight = at.x + OFFSET_PX + PREVIEW_PX > window.innerWidth;
    const left = overflowsRight ? at.x - OFFSET_PX - PREVIEW_PX : at.x + OFFSET_PX;
    const overflowsBottom = at.y + OFFSET_PX + PREVIEW_PX > window.innerHeight;
    const top = overflowsBottom ? at.y - OFFSET_PX - PREVIEW_PX : at.y + OFFSET_PX;

    return createPortal(
        <div className={styles.thumbnailPreview} style={{top, left}} data-sel-role="multisite-thumbnail">
            <img src={thumbnailUrl(node)}
                 alt=""
                 onError={() => setHasFailed(true)}
            />
        </div>,
        document.body
    );
};

ThumbnailPreview.propTypes = {
    node: PropTypes.object.isRequired,
    at: PropTypes.shape({x: PropTypes.number, y: PropTypes.number})
};

export default ThumbnailPreview;
