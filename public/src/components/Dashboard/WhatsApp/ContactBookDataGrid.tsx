import { useState, useMemo, useEffect } from "react";
import { DataGrid } from '@mui/x-data-grid';
import { contactBookColumn, corruptedContactBookColumn, guestListColumns } from './WhatsAppComponentConfig';
import EventSearch from './EventSearch';
import { Box } from "@mui/material";
import { getSelectedGuestList} from "../../../features/eventSlice";
import { useAppSelector } from '../../../store/hooks';

const ContactBookDataGrid = ({
    contactList,
    viewMode,
    paginationModel,
    setPaginationModel,
    onModifyContact,
    onDeleteContact,
    onSwitchBlacklist,
    onGuestAttend
}) => {
    

    const commonProps = {
        paginationModel: paginationModel,
        onPaginationModelChange: setPaginationModel,
        pageSizeOptions: [25, 50, 100],
        pagination: true,
        disableRowSelectionOnClick: true,
        disableSelectionOnClick: true,
        showToolbar: true,
    };

    const columnProps = { onModifyContact, onDeleteContact, onSwitchBlacklist, viewEventSpeedDial: false };
    const contactBookColumnProps = { onModifyContact, onDeleteContact, onSwitchBlacklist, viewEventSpeedDial: true };
    const _contactList = useAppSelector(getSelectedGuestList);



    switch (viewMode) {
        case "blacklist":
            return <DataGrid {...commonProps} rows={contactList} columns={contactBookColumn(columnProps)} />;
        case "corrupted":
            return <DataGrid {...commonProps} rows={contactList} columns={corruptedContactBookColumn(columnProps)} />;
        case "guest_list":
            return (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box sx={{ flexShrink: 0, width: 280 }}>
                        <EventSearch />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0, height: '85dvh' }}>
                        <DataGrid
                            {...commonProps}
                            rows={_contactList}
                            columns={guestListColumns({ onGuestAttend: onGuestAttend })} 
                        />
                    </Box>
                </Box>
            );
        case "default":
            return <DataGrid {...commonProps} rows={contactList} columns={contactBookColumn(contactBookColumnProps)} />;
        default:
            return null;
    }
};

export default ContactBookDataGrid;