import PropTypes from "prop-types";
import { Menu, MenuItem, ListItemText } from "@mui/material";

/**
 * Destination picker for a topic that has sub-topics (FR-018).
 *
 * The parent topic's own destination is listed FIRST and is never dropped, so an
 * administrator who wants the section overview rather than one specific view can
 * still ask for it.
 *
 * Topics without sub-topics never reach this component — their jump control
 * navigates immediately, with no intermediate choice.
 */
const JumpMenu = ({ anchorEl, destinations, open, onClose, onSelect }) => (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
        {destinations.map((destination, index) => (
            <MenuItem
                key={destination.topicId}
                onClick={() => onSelect(destination)}
                dense
            >
                <ListItemText
                    primary={destination.label}
                    slotProps={{
                        primary: { fontSize: 13, fontWeight: index === 0 ? 600 : 400 },
                    }}
                />
            </MenuItem>
        ))}
    </Menu>
);

JumpMenu.propTypes = {
    anchorEl: PropTypes.any,
    destinations: PropTypes.arrayOf(
        PropTypes.shape({
            topicId: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
        })
    ).isRequired,
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
};

export default JumpMenu;
