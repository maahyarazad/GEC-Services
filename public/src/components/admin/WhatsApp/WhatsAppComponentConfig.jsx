

import { IconButton, Switch } from "@mui/material";
import 'react-json-pretty/themes/monikai.css'; // optional styling
import { IoMdOpen } from "react-icons/io";
import { RiEditLine } from "react-icons/ri";
import { IoTrashOutline } from "react-icons/io5";
export const columns = ({ onViewJson }) => [
    // { field: 'id', headerName: 'ID', width: 70, hide: true },
    { field: 'metadata_createdAt', headerName: 'Created At', width: 160, filterable: true },
    {
        field: 'MessageStatus', headerName: 'Message Status', width: 120, renderCell: (params) => {
            let status = '—';

            try {
                const response =
                    typeof params.row.response === 'string'
                        ? JSON.parse(params.row.response)
                        : params.row.response;

                status = response?.MessageStatus ?? '—';
            } catch (e) {
                // silently fail – do NOT break UI
            }

            return <div>{status}</div>;
        },
    },
    { field: 'templateFriendlyName', headerName: 'Used Template Name', width: 200, filterable: true },
    {
        field: 'first_name', headerName: 'Full Name', width: 200, filterable: true, renderCell: (params) => {

            return (
                <div>

                    {params.row.first_name} {params.row.last_name}
                </div>
            );
        }
    },
    { field: 'phone', headerName: 'Phone Number', width: 160, filterable: true },

    {
        field: 'response',
        headerName: 'Log',
        width: 30,

        filterable: true,
        renderCell: (params) => {
            let json;

            try {

                json =
                    typeof params.row.response === 'string'
                        ? JSON.parse(params.row.response)
                        : params.row.response;
            } catch (e) {
                // Fallback if invalid JSON
                json = { raw: params.row.response };
            }

            return (
                <div>

                    <IconButton onClick={() => onViewJson(params.row.response, 'log')}>
                        <IoMdOpen />
                    </IconButton>
                </div>
            );
        },

    }




];


export const responseColumns = ({ onViewJson }) => [
  { field: 'id', headerName: 'ID', width: 70, hide: true },
  { field: 'received_at', headerName: 'received_at', width: 160, filterable: true },
  { field: 'payload_WaId', headerName: 'From Number', width: 160, filterable: true },
  { field: 'payload_ProfileName', headerName: 'ProfileName', width: 200, filterable: true },
  { field: 'payload_Body', headerName: 'Body', width: 200, filterable: true },
  { field: 'payload_MessageType', headerName: 'Type', width: 100, filterable: true },
   {
        field: '_',
        headerName: 'View Body',
        width: 90,

        filterable: false,
        renderCell: (params) => {
  

            return (
                <div>
                    
                    <IconButton onClick={() => onViewJson(params.row, 'response')}>
                        <IoMdOpen />
                    </IconButton>
                </div>
            );
        },

    }
];

export const contactBookColumn = ({ onModifyContact, onDeleteContact, onSwitchBlacklist }) => [
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
                    <IconButton onClick={() => onDeleteContact(params.row)}>
                        <IoTrashOutline color="red" />
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

