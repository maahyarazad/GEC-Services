

import { IconButton, Switch, Tooltip } from "@mui/material";
import 'react-json-pretty/themes/monikai.css'; // optional styling
import { IoMdOpen } from "react-icons/io";
import { RiEditLine } from "react-icons/ri";
import { TbTrashX } from "react-icons/tb";
import { FaStickyNote } from "react-icons/fa";
import { FaHistory } from "react-icons/fa";
import { TbClipboardCheck } from "react-icons/tb";
import ActionCell from './ActionCell';
import { BiSolidCheckCircle } from "react-icons/bi";
import { BsDashCircle } from "react-icons/bs";
import { VscDebugAlt } from "react-icons/vsc";

    const slotPropsStyle = {
        tooltip: {
            sx: {
                backgroundColor: "#1e1e1e",
                color: "#fff",
                fontSize: "12px",
                padding: "10px 14px",
                borderRadius: "12px",
                maxWidth: 350,
                lineHeight: 1.8,
                boxShadow: 3,
            },
        },
        arrow: {
            sx: {
                color: "#1e1e1e",
            },
        },
    }

const memberTooltip = (member) => (
    <>
        • ID: {member?.usrId ?? ''}  <br />
        • Issue Date: {member?.time ? new Date(member?.time).toLocaleString() : ''} <br />
        • Email: {member?.email ?? ''}<br />
        • Legacy System Phone Number: {member?.phone ?? ''}<br />
    </>
)


const noteTitle = (noteBody) => {
    if (!noteBody) return 'Notepad';
    const lines = noteBody.split('\n');
    const preview = lines.slice(0, 5).join('\n');
    return (
        <span style={{ whiteSpace: 'pre-line', display: 'block', maxWidth: 300, fontSize: '0.8rem', lineHeight: 1.5 }}>
            {preview}{lines.length > 5 ? '\n…' : ''}
        </span>
    );
};

// Tooltip body for the Guest List "History" column — lists the matched
// clubtime_guests records (past ClubTime / Business Breakfast appearances).
const historyTooltip = (records) => (
    <span style={{ whiteSpace: 'pre-line', display: 'block', maxWidth: 320, fontSize: '0.78rem', lineHeight: 1.6 }}>
        {records.slice(0, 8).map((r, i) => (
            <div key={i}>
                • {r.event_title}
                {r.name ? ` | ${r.name}` : ''}
                {r.remarks ? ` | ${r.remarks}` : ''}
            </div>
        ))}
        {records.length > 8 ? <div>…and {records.length - 8} more</div> : null}
    </span>
);

// Copy the matched history records to the clipboard as a tab/pipe-separated block.
const copyHistoryToClipboard = (records) => {
    const text = records
        .map((r) => [r.event_date, r.event_title, r.event_type, r.name, r.mobile || '', r.member_partner || '', r.remarks || '', r.note || ''].join(' | '))
        .join('\n');
    if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
};
export const columns = ({ onViewJson }) => [
    { field: 'id', headerName: 'ID', width: 70, hide: true },
    { field: 'metadata_createdAt', headerName: 'Created At', width: 160, filterable: true },
    { field: 'SmsStatus', headerName: 'Message Status', width: 120, filterable: true },

    { field: 'templateFriendlyName', headerName: 'Used Template Name', width: 200, filterable: true },
    {
        field: 'full_name', headerName: 'Full Name', width: 200, filterable: true
    },
    { field: 'phone', headerName: 'Phone Number', width: 160, filterable: true },


    //  {
    //         field: 'contentSid',
    //         headerName: 'Content Sid',
    //         width: 30,
    //         filterable: true,
    //         renderCell: (params) => {

    //             return (
    //                 <div>

    //                     <IconButton onClick={() => onViewJson(params.row.contentSid, 'log')}>
    //                         <IoMdOpen />
    //                     </IconButton>
    //                 </div>
    //             );
    //         },

    //     }




];


export const responseColumns = ({ onViewJson, onViewHistory, activeMemberPhones, onOpenNotepad, notes }) => [
    { field: 'id', headerName: 'ID', width: 70, hide: true },
    { field: 'received_at', headerName: 'Received at', width: 160, filterable: true },
    { field: 'type', headerName: 'Member Type', width: 160, filterable: true },
    { field: 'full_name', headerName: 'Full Name', width: 160, filterable: true },
    { field: 'WaId', headerName: 'From Number', width: 160, filterable: true },
    { field: 'ProfileName', headerName: 'Profile Name', width: 200, filterable: true },
    { field: 'MessageType', headerName: 'Type', width: 100, filterable: true },
    { field: 'Body', headerName: 'Body', width: 200, filterable: true },
    {
        field: 'active_member', headerName: 'Active Member', width: 120, filterable: false, sortable: false,
        renderCell: (params) => {
            const phone = params.row.WaId?.replace(/[+\-\s]/g, '') ?? '';
            const fullName = (params.row.full_name || params.row.ProfileName || '').trim();
            const member = activeMemberPhones?.get(phone) || activeMemberPhones?.get(fullName);
            if (!member) return null;
            return (
                <Tooltip title={memberTooltip(member)}  slotProps={slotPropsStyle} arrow>
                    <BiSolidCheckCircle size={22} color="green" />
                </Tooltip>
            );
        },
    },
    {
        field: '_',
        headerName: 'Actions',
        width: 130,
        filterable: false,
        renderCell: (params) => (
            <div>
                <Tooltip title="Open Instant Reply">
                    <IconButton onClick={() => onViewJson(JSON.parse(params.row.payload), 'instant_reply', params.row.full_name)}>
                        <IoMdOpen size={22} color="#5C6BC0" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Debug">
                    <IconButton onClick={() => onViewHistory(JSON.parse(params.row.payload), 'history')}>
                        <VscDebugAlt size={20} color="#EF5350" />
                    </IconButton>
                </Tooltip>
                <Tooltip title={noteTitle(notes?.get(params.row.WaId))} slotProps={slotPropsStyle} arrow>
                    <IconButton
                        onClick={() => onOpenNotepad?.(params.row.WaId, params.row.full_name || params.row.ProfileName)}
                        sx={{ color: notes?.get(params.row.WaId) ? "#e65100" : "#9e9e9e", "&:hover": { backgroundColor: "#fff8e1" } }}
                    >
                        <FaStickyNote size={18} />
                    </IconButton>
                </Tooltip>
            </div>
        ),
    },
];

export const corruptedContactBookColumn = ({ onModifyContact, onDeleteContact, onSwitchBlacklist }) => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'type', headerName: 'Type', width: 110, filterable: true },
    { field: 'title', headerName: 'Title', width: 70, filterable: true },
    { field: 'language', headerName: 'language', width: 80, filterable: true },
    { field: 'first_name', headerName: 'First Name', width: 160, filterable: true },
    { field: 'last_name', headerName: 'Last Name', width: 160, filterable: true },
    { field: 'phone', headerName: 'Phone Number', width: 160, filterable: true },
    { field: 'phone_invalid_reason', headerName: 'Reason', width: 160, filterable: true },
    { field: 'club_partner_name', headerName: 'Club Patner Name', width: 160, filterable: true },
    { field: 'gender', headerName: 'Gender', width: 90, filterable: true },
    {
        field: '_',
        headerName: 'Actions',
        width: 130,

        filterable: true,
        renderCell: (params) => {


            return (
                <div>

                    <IconButton onClick={() => onModifyContact(params.row)}>
                        <RiEditLine />
                    </IconButton>
                    <IconButton onClick={() => onDeleteContact(params.row)} sx={{
                        color: "#d32f2f",
                        "&:hover": { backgroundColor: "#ffebee" },
                    }}>
                        <TbTrashX size={20} />
                    </IconButton>

                    <Switch
                        size="small"
                        title="Move to Blacklist"
                        checked={params.row.blacklist}
                        onChange={(e) => onSwitchBlacklist(params.row, e.target.checked)}
                        color="primary"
                    />


                </div>
            );
        },

    }

];
export const contactBookColumn = ({ onModifyContact, onDeleteContact, onSwitchBlacklist, viewEventSpeedDial, activeMemberPhones, onOpenNotepad, notes }) => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'type', headerName: 'Type', width: 110, filterable: true },
    { field: 'title', headerName: 'Title', width: 70, filterable: true },
    { field: 'language', headerName: 'language', width: 80, filterable: true },
    { field: 'first_name', headerName: 'First Name', width: 160, filterable: true },
    { field: 'last_name', headerName: 'Last Name', width: 160, filterable: true },
    { field: 'phone', headerName: 'Phone Number', width: 160, filterable: true },
    { field: 'club_partner_name', headerName: 'Club Patner Name', width: 160, filterable: true },
    { field: 'gender', headerName: 'Gender', width: 90, filterable: true },
    {
        field: 'active_member', headerName: 'Active Member', width: 120, filterable: false, sortable: false,
        renderCell: (params) => {
            const phone = params.row.phone?.replace(/[+\-\s]/g, '') ?? '';
            const fullName = `${params.row.first_name?.trimEnd() ?? ''} ${params.row.last_name?.trimEnd()?? ''}`.trim();
            const member = activeMemberPhones?.get(phone) || activeMemberPhones?.get(fullName);
            if (!member) return null;
            return (
                <Tooltip title={memberTooltip(member)} slotProps={slotPropsStyle} arrow>
                    <BiSolidCheckCircle size={22} color="green" />
                </Tooltip>
            );
        },
    },
    {
        field: '_',
        headerName: 'Actions',
        width: 320,

        filterable: true,
        renderCell: (params) => {


            return (
                <div>
                    <ActionCell params={params} viewEventSpeedDial={viewEventSpeedDial}
                        onModifyContact={onModifyContact}
                        onDeleteContact={onDeleteContact}
                        onSwitchBlacklist={onSwitchBlacklist}
                        onOpenNotepad={onOpenNotepad}
                        noteContent={notes?.get(params.row.id)} />
                </div>
            );
        },
    }

];
export const guestListColumns = ({ onGuestAttend, onRemoveGuest, activeMemberPhones, clubtimeHistory, onOpenNotepad, notes }) => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'type', headerName: 'Type', width: 110, filterable: true },
    { field: 'title', headerName: 'Title', width: 70, filterable: true },
    { field: 'phone', headerName: 'Phone Number', width: 170, filterable: true },
    { field: 'language', headerName: 'language', width: 80, filterable: true },
    { field: 'first_name', headerName: 'First Name', width: 160, filterable: true },
    { field: 'last_name', headerName: 'Last Name', width: 160, filterable: true },
    { field: 'club_partner_name', headerName: 'Club Patner Name', width: 160, filterable: true },
    {
        field: 'active_member', headerName: 'Active Member', width: 120, filterable: false, sortable: false,
        renderCell: (params) => {
            const phone = params.row.phone?.replace(/[+\-\s]/g, '') ?? '';
            const fullName = `${params.row.first_name?.trimEnd() ?? ''} ${params.row.last_name?.trimEnd() ?? ''}`.trim();
            const member = activeMemberPhones?.get(phone) || activeMemberPhones?.get(fullName);
            if (!member) return null;
            return (
                <Tooltip title={memberTooltip(member)} slotProps={slotPropsStyle} arrow>
                    <BiSolidCheckCircle size={22} color="green" />
                </Tooltip>
            );
        },
    },
    {
        field: 'history', headerName: 'History', width: 110, filterable: false, sortable: false,
        renderCell: (params) => {
            const phoneKey = params.row.phone?.replace(/[+\-\s]/g, '') ?? '';
            const nameKey = `${params.row.first_name?.trim() ?? ''} ${params.row.last_name?.trim() ?? ''}`
                .trim().replace(/\s+/g, ' ').toLowerCase();

            const byPhone = (phoneKey && clubtimeHistory?.get(phoneKey)) || [];
            const byName = (nameKey && clubtimeHistory?.get(nameKey)) || [];
            const seen = new Set();
            const records = [...byPhone, ...byName].filter((r) => {
                if (seen.has(r.id)) return false;
                seen.add(r.id);
                return true;
            });
            if (records.length === 0) return null;

            // Orange warning by default; light gray if the guest is an active member.
            const activeFullName = `${params.row.first_name?.trimEnd() ?? ''} ${params.row.last_name?.trimEnd() ?? ''}`.trim();
            const isActiveMember = !!(activeMemberPhones?.get(phoneKey) || activeMemberPhones?.get(activeFullName));

            return (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Tooltip title={historyTooltip(records)} slotProps={slotPropsStyle} arrow>
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <FaHistory size={18} color={isActiveMember ? '#bdbdbd' : '#ed6c02'} />
                        </span>
                    </Tooltip>
                    <Tooltip title="Copy history to clipboard">
                        <IconButton size="small" onClick={() => copyHistoryToClipboard(records)}>
                            <TbClipboardCheck size={18} />
                        </IconButton>
                    </Tooltip>
                </div>
            );
        },
    },
    {
        field: '_',
        headerName: 'Actions',
        width: 340,
        filterable: true,
        renderCell: (params) => {
            return (
                <>
                    <Tooltip title="Complete Attendance">
                        <IconButton
                            onClick={() => onGuestAttend(params.row)}
                            sx={{
                                color: params.row.complete_attendance === 0 ? "" : "green",
                                "&:hover": { backgroundColor: "#e3f2fd" },
                            }}
                        >
                            {params.row.complete_attendance === 0 ? <BsDashCircle size={20} /> : <BiSolidCheckCircle size={24} />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={`Remove ${params.row.first_name} from guest list`}>
                        <IconButton
                            onClick={() => onRemoveGuest(params.row)}
                            sx={{ color: "#d32f2f", "&:hover": { backgroundColor: "#ffebee" } }}
                        >
                            <TbTrashX size={22} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={noteTitle(notes?.get(params.row.id))} slotProps={slotPropsStyle} arrow>
                        <IconButton
                            onClick={() => onOpenNotepad?.(params.row)}
                            sx={{ color: notes?.get(params.row.id) ? "#e65100" : "#9e9e9e", "&:hover": { backgroundColor: "#fff8e1" } }}
                        >
                            <FaStickyNote size={20} />
                        </IconButton>
                    </Tooltip>
                </>
            );
        },
    }

];



export const normalizePhone = (input) => {
    // Remove everything except digits and plus
    let val = input.replace(/[^0-9+]/g, '');
    // Allow '+' only at the start
    val = val.replace(/(?!^\+)\+/g, '');

    if (val.startsWith('0')) {
        val = '+' + val.slice(1);
    }

    if (!val.startsWith('+')) {
        val = '+' + val;
    }

    return val;
}

export const tabstyle = {
    backgroundColor: "#00000",      // background of the header
    color: "#fffff",                // text color
    "& .MuiAccordionSummary-expandIconWrapper": {
        color: "#fffff",             // icon color
    },
    '&.Mui-expanded': {
        bgcolor: '#037bfc',
        '& .MuiTypography-root': {
            color: '#fff',   // text color when expanded
        },
        '& .MuiSvgIcon-root': {
            color: '#fff',   // expand icon color when expanded
        },
    },

}
