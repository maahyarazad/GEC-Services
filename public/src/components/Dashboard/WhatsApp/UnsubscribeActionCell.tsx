// UnsubscribeActionCell.tsx
//
// Delete-only action cell for the Unsubscribed Contacts grid.
//
// This deliberately does NOT reuse ActionCell: that component hard-requires
// onModifyContact, onSwitchBlacklist, notepad and EventSpeedDial props, none of
// which mean anything for an unsubscribe record.

import { IconButton, Tooltip } from "@mui/material";
import { TbTrashX } from "react-icons/tb";

interface UnsubscribeActionCellProps {
    params: any;
    onDeleteUnsubscribe: (row: any) => void;
}

export default function UnsubscribeActionCell({
    params,
    onDeleteUnsubscribe,
}: UnsubscribeActionCellProps) {
    return (
        <div>
            <Tooltip title="Remove from Unsubscribe List">
                <IconButton
                    onClick={() => onDeleteUnsubscribe(params.row)}
                    sx={{ color: "#d32f2f", "&:hover": { backgroundColor: "#ffebee" } }}
                >
                    <TbTrashX size={22} />
                </IconButton>
            </Tooltip>
        </div>
    );
}
