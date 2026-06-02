// ActionCell.tsx

// ActionCell.tsx

import { IconButton, Switch, Tooltip } from "@mui/material";
import { RiEditLine } from "react-icons/ri";
import { TbTrashX } from "react-icons/tb";
import { FaStickyNote } from "react-icons/fa";
import EventSpeedDial from "./EventSpeedDial";
import { useAppSelector } from "../../../store/hooks";
import { getEvents } from "../../../features/eventSlice";

interface ActionCellProps {
    params: any;
    onModifyContact: (row: any) => void;
    onDeleteContact: (row: any) => void;
    onAddToGuestList?: (row: any) => void;
    onSwitchBlacklist: (row: any, val: boolean) => void;
    viewEventSpeedDial: boolean;
    onOpenNotepad?: (row: any) => void;
    noteContent?: string;
}

export default function ActionCell({
    params,
    onModifyContact,
    onDeleteContact,
    onSwitchBlacklist,
    viewEventSpeedDial,
    onOpenNotepad,
    noteContent,
}: ActionCellProps) {

    const events = useAppSelector(getEvents);

    return (
        <div>
            <Tooltip title="Edit Contact">
                <IconButton
                    onClick={() => onModifyContact(params.row)}
                    sx={{ color: "#1976d2", "&:hover": { backgroundColor: "#e3f2fd" } }}
                >
                    <RiEditLine size={22} />
                </IconButton>
            </Tooltip>

            <Tooltip title="Delete Contact">
                <IconButton
                    onClick={() => onDeleteContact(params.row)}
                    sx={{ color: "#d32f2f", "&:hover": { backgroundColor: "#ffebee" } }}
                >
                    <TbTrashX size={22} />
                </IconButton>
            </Tooltip>

            <Tooltip title={(() => {
                if (!noteContent) return 'Notepad';
                const lines = noteContent.split('\n');
                return (
                    <span style={{ whiteSpace: 'pre-line', display: 'block', maxWidth: 300, fontSize: '0.8rem', lineHeight: 1.5 }}>
                        {lines.slice(0, 5).join('\n')}{lines.length > 5 ? '\n…' : ''}
                    </span>
                );
            })()}>
                <IconButton
                    onClick={() => onOpenNotepad?.(params.row)}
                    sx={{ color: noteContent ? "#e65100" : "#9e9e9e", "&:hover": { backgroundColor: "#fff8e1" } }}
                >
                    <FaStickyNote size={20} />
                </IconButton>
            </Tooltip>

            {viewEventSpeedDial && <EventSpeedDial _events={events} params={params} />}

            <Tooltip title={params.row.blacklist ? "Remove from Blacklist" : "Add to Blacklist"}>
                <Switch
                    size="small"
                    checked={!!params.row.blacklist}
                    onChange={(e) => onSwitchBlacklist(params.row, e.target.checked)}
                    sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: "#d32f2f" },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#d32f2f" },
                    }}
                />
            </Tooltip>
        </div>
    );
}