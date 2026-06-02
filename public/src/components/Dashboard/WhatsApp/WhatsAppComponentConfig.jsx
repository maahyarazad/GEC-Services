

import { IconButton, Switch, Tooltip } from "@mui/material";
import 'react-json-pretty/themes/monikai.css'; // optional styling
import { IoMdOpen } from "react-icons/io";
import { RiEditLine } from "react-icons/ri";
import { TbTrashX } from "react-icons/tb";
import { FaHistory } from "react-icons/fa";
import { TbClipboardCheck } from "react-icons/tb";
import ActionCell from './ActionCell';
import { BiSolidCheckCircle } from "react-icons/bi";
import { BsDashCircle } from "react-icons/bs";
import { VscDebugAlt } from "react-icons/vsc";
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


export const responseColumns = ({ onViewJson, onViewHistory }) => [
    { field: 'id', headerName: 'ID', width: 70, hide: true },
    { field: 'received_at', headerName: 'Received at', width: 160, filterable: true },
    { field: 'type', headerName: 'Member Type', width: 160, filterable: true },
    { field: 'full_name', headerName: 'Full Name', width: 160, filterable: true },
    { field: 'WaId', headerName: 'From Number', width: 160, filterable: true },
    { field: 'ProfileName', headerName: 'Profile Name', width: 200, filterable: true },
    { field: 'MessageType', headerName: 'Type', width: 100, filterable: true },
    { field: 'Body', headerName: 'Body', width: 200, filterable: true },
    {
        field: '_',
        headerName: 'Actions',
        width: 90,

        filterable: false,
        renderCell: (params) => {


            return (
                <div>

                    <IconButton onClick={() => onViewJson(JSON.parse(params.row.payload), 'instant_reply', params.row.full_name)} title="Open Instant Resopne">
                        <IoMdOpen size={22} color="#5C6BC0" />
                    </IconButton>

                    <IconButton onClick={() => onViewHistory(JSON.parse(params.row.payload), 'history')}>
                        <VscDebugAlt size={20} color="#EF5350"/>
                    </IconButton>

                </div>
            );
        },

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
export const contactBookColumn = ({ onModifyContact, onDeleteContact, onSwitchBlacklist, viewEventSpeedDial, activeMemberPhones }) => [
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
            const member = activeMemberPhones?.get(params.row.phone?.replace(/[+\-\s]/g, '') ?? '');
            if (!member) return null;
            return (
                <Tooltip title={`ID: ${member.usrId ?? ''} | ${member.time ? new Date(member.time).toLocaleString() : ''} | ${member.email ?? ''}`} arrow>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                        <BiSolidCheckCircle size={22} color="green" />
                    </span>
                </Tooltip>
            );
        },
    },
    {
        field: '_',
        headerName: 'Actions',
        width: 300,

        filterable: true,
        renderCell: (params) => {


            return (
                <div>
                    <ActionCell params={params} viewEventSpeedDial={viewEventSpeedDial}
                        onModifyContact={onModifyContact}
                        onDeleteContact={onDeleteContact}
                        onSwitchBlacklist={onSwitchBlacklist} />
                </div>
            );
        },
    }

];
export const guestListColumns = ({ onGuestAttend, onRemoveGuest, activeMemberPhones }) => [
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
            const member = activeMemberPhones?.get(params.row.phone?.replace(/[+\-\s]/g, '') ?? '');
            if (!member) return null;
           
            return (
                    <Tooltip title={`ID: ${member.usrId ?? ''} \n\n Issue Date:${member.time ? new Date(member.time).toLocaleString() : ''} \n\n Email: ${member.email ?? ''}`} arrow>
                    <span>
                         <BiSolidCheckCircle size={22} color="green" />
                    </span>
                </Tooltip>
            );
        },
    },
    {
        field: '_',
        headerName: 'Actions',
        width: 300,

        filterable: true,
        renderCell: (params) => {
            return (
                <>
                    <Tooltip title="Complete Attendance">
                        <IconButton
                            //   size="small"
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
                            //   size="small"
                            onClick={() => onRemoveGuest(params.row)}
                            sx={{
                                color: "#d32f2f",
                                "&:hover": { backgroundColor: "#ffebee" },
                            }}
                        >
                            <TbTrashX size={22} />
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
