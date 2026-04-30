// ActionCell.tsx

import { IconButton, Switch, Tooltip, Box } from "@mui/material";
import { RiEditLine } from "react-icons/ri";

import { MdDeleteOutline } from 'react-icons/md';
import EventSpeedDial from "./EventSpeedDial";
import { useAppSelector } from "../../../store/hooks";
import { getEvents } from "../../../features/eventSlice";
interface ActionCellProps {
    params: any;
    onModifyContact: (row: any) => void;
    onDeleteContact: (row: any) => void;
    onAddToGuestList: (row: any) => void;
    onSwitchBlacklist: (row: any, val: boolean) => void;
    viewEventSpeedDial: boolean
}

export default function ActionCell({
    params,
    onModifyContact,
    onDeleteContact,
    onAddToGuestList,
    onSwitchBlacklist,
    viewEventSpeedDial
}: ActionCellProps) {


    const events = useAppSelector(getEvents);
    
    return (
        <div>

            <Tooltip title="Edit Contact">
                <IconButton
                    //   size="small"
                    onClick={() => onModifyContact(params.row)}
                    sx={{
                        color: "#1976d2",
                        "&:hover": { backgroundColor: "#e3f2fd" },
                    }}
                >
                    <RiEditLine size={22} />
                </IconButton>
            </Tooltip>

            <Tooltip title="Delete Contact">
                <IconButton
                    //   size="small"
                    onClick={() => onDeleteContact(params.row)}
                    sx={{
                        color: "#d32f2f",
                        "&:hover": { backgroundColor: "#ffebee" },
                    }}
                >
                    <MdDeleteOutline size={22} />
                </IconButton>
            </Tooltip>

            {viewEventSpeedDial && <EventSpeedDial _events={events} params={params} />}




            <Tooltip title={params.row.blacklist ? "Remove from Blacklist" : "Add to Blacklist"}>
                <Switch
                    size="small"
                    checked={!!params.row.blacklist}
                    onChange={(e) => onSwitchBlacklist(params.row, e.target.checked)}
                    sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": {
                            color: "#d32f2f",
                        },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                            backgroundColor: "#d32f2f",
                        },
                    }}
                />
            </Tooltip>

        </div>
    );
}