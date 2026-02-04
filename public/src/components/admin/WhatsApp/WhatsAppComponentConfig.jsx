

import { IconButton, Switch } from "@mui/material";
import 'react-json-pretty/themes/monikai.css'; // optional styling
import { IoMdOpen } from "react-icons/io";
import { RiEditLine } from "react-icons/ri";
import { IoTrashOutline } from "react-icons/io5";
import { FaHistory } from "react-icons/fa";
export const columns = ({ onViewJson }) => [
    { field: 'id', headerName: 'ID', width: 70, hide: true },
    { field: 'metadata_createdAt', headerName: 'Created At', width: 160, filterable: true },
    {field: 'SmsStatus', headerName: 'Message Status', width: 120, filterable: true },
    
    { field: 'templateFriendlyName', headerName: 'Used Template Name', width: 200, filterable: true },
    {
        field: 'full_name', headerName: 'Full Name', width: 200, filterable: true},
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
  { field: 'received_at', headerName: 'Received ar', width: 160, filterable: true },
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
                    
                    <IconButton onClick={() => onViewJson(JSON.parse(params.row.payload), 'instant_reply')} title="Open Instant Resopne">
                        <IoMdOpen />
                    </IconButton>

                     <IconButton onClick={() => onViewHistory(JSON.parse(params.row.payload), 'history')}>
                        <FaHistory />
                    </IconButton>

                </div>
            );
        },

    },
  
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

