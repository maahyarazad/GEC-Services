// ActionCell.tsx

import { IconButton, Switch, Tooltip, Box } from "@mui/material";
import { RiEditLine } from "react-icons/ri";
import { TbClipboardCheck } from "react-icons/tb";
import { MdDeleteOutline } from 'react-icons/md';
interface ActionCellProps {
  params: any;
  onModifyContact: (row: any) => void;
  onDeleteContact: (row: any) => void;
  onAddToGuestList: (row: any) => void;
  onSwitchBlacklist: (row: any, val: boolean) => void;
}

export default function ActionCell({
  params,
  onModifyContact,
  onDeleteContact,
  onAddToGuestList,
  onSwitchBlacklist,
}: ActionCellProps) {
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

      <Tooltip title="Add to Guest List">
        <IconButton
        //   size="small"
          onClick={() => onAddToGuestList(params.row)}
          sx={{
            color: "#ed6c02",
            "&:hover": { backgroundColor: "#fff3e0" },
          }}
        >
          <TbClipboardCheck size={22} />
        </IconButton>
      </Tooltip>

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