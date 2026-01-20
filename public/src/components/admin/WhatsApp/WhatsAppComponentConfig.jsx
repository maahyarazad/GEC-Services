

import { IconButton } from "@mui/material";
import 'react-json-pretty/themes/monikai.css'; // optional styling
import { IoMdOpen } from "react-icons/io";
import { RiEditLine } from "react-icons/ri";
import { IoTrashOutline } from "react-icons/io5";
export const columns = ({ onViewJson }) => [
    { field: 'id', headerName: 'ID', width: 70, hide: true },
    { field: 'metadata_createdAt', headerName: 'Created At', width: 160, filterable: true },
    {
        field: 'To',
        headerName: 'To',
        width: 150,
        filterable: false,
        sortable: false,
        renderCell: (params) => {
            const log = JSON.parse(params.row.response);

            return (
                <>{log.To.replace("whatsapp:", "")}</>
            );
        },

    },
    {
        field: 'MessageStatus',
        headerName: 'MessageStatus',
        width: 150,
        filterable: false,
        sortable: false,
        renderCell: (params) => {
            const log = JSON.parse(params.row.response);

            return (
                <>{log.MessageStatus}</>
            );
        },

    },

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

                    <IconButton onClick={() => onViewJson(params.row.response)}>
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
    {
        field: '___',
        headerName: 'MessageType',
        width: 100,
        filterable: false,
        renderCell: (params) => {
            let json;
            try {

                json =
                    typeof params.row.payload === 'string'
                        ? JSON.parse(params.row.payload)
                        : params.row.payload;
            } catch (e) {
                // Fallback if invalid JSON
                json = { raw: params.row.payload };
            }

            return (
                <div >
                    {json['MessageType']}
                </div>
            );
        },

    },
    // { field: 'event_type', headerName: 'event_type', width: 160, filterable: true },

    {
        field: '_',
        headerName: 'Body',
        width: 200,
        filterable: false,
        renderCell: (params) => {
            let json;
            try {

                json =
                    typeof params.row.payload === 'string'
                        ? JSON.parse(params.row.payload)
                        : params.row.payload;
            } catch (e) {
                // Fallback if invalid JSON
                json = { raw: params.row.payload };
            }

            return (
                <div >
                    {json['Body']}
                </div>
            );
        },

    },

    {
        field: '__',
        headerName: 'ProfileName',
        width: 200,
        filterable: false,
        renderCell: (params) => {
            let json;
            try {

                json =
                    typeof params.row.payload === 'string'
                        ? JSON.parse(params.row.payload)
                        : params.row.payload;
            } catch (e) {
                // Fallback if invalid JSON
                json = { raw: params.row.payload };
            }

            return (
                <div >
                    {json['ProfileName']}
                </div>
            );
        },

    },

    {
        field: '____',
        headerName: 'Sender Phone Number',
        width: 200,
        filterable: false,
        renderCell: (params) => {
            let json;
            try {

                json =
                    typeof params.row.payload === 'string'
                        ? JSON.parse(params.row.payload)
                        : params.row.payload;
            } catch (e) {
                // Fallback if invalid JSON
                json = { raw: params.row.payload };
            }

            return (
                <div >
                    {json['WaId']}
                </div>
            );
        },

    },

    {
        field: 'payload',
        headerName: 'Response',
        width: 90,

        filterable: true,
        renderCell: (params) => {
            let json;

            try {

                json =
                    typeof params.row.payload === 'string'
                        ? JSON.parse(params.row.payload)
                        : params.row.payload;
            } catch (e) {
                // Fallback if invalid JSON
                json = { raw: params.row.payload };
            }

            return (
                <div>
                    {/*  */}
                    <IconButton onClick={() => onViewJson(params.row.payload)}>
                        <IoMdOpen />
                    </IconButton>
                </div>
            );
        },

    }

];

export const contactBookColumn = ({onModifyContact, onDeleteContact}) => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'type', headerName: 'type', width: 160, filterable: true },
    { field: 'title', headerName: 'title', width: 160, filterable: true },
    { field: 'first_name', headerName: 'first_name', width: 160, filterable: true },
    { field: 'last_name', headerName: 'last_name', width: 160, filterable: true },
    { field: 'phone', headerName: 'phone', width: 160, filterable: true },
    { field: 'club_partner_name', headerName: 'club_partner_name', width: 160, filterable: true },
    { field: 'gender', headerName: 'gender', width: 160, filterable: true },
     {
        field: '_',
        headerName: 'Actions',
        width: 90,

        filterable: true,
        renderCell: (params) => {
            

            return (
                <div>
                    {/*  */}
                    <IconButton onClick={() => onModifyContact(params.row)}>
                        <RiEditLine />
                    </IconButton>
                    <IconButton onClick={() => onDeleteContact(params.row)}>
                        <IoTrashOutline color="red"/>
                    </IconButton>
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
    return val;
}

