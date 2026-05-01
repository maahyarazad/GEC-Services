import { useState, useMemo, useEffect, useLayoutEffect } from "react";
import { DataGrid } from '@mui/x-data-grid';
import { contactBookColumn, corruptedContactBookColumn, guestListColumns } from './WhatsAppComponentConfig';
import EventSearch from './EventSearch';
import { Box } from "@mui/material";
import { getSelectedGuestList, getSelectedEvent } from "../../../features/eventSlice";
import { useAppSelector } from '../../../store/hooks';

const ContactBookDataGrid = ({
    contactList,
    viewMode,
    paginationModel,
    setPaginationModel,
    onModifyContact,
    onDeleteContact,
    onSwitchBlacklist,
    onGuestAttend,
    onRemoveGuest
}) => {

    const selectedGuestList = useAppSelector(getSelectedGuestList);


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



    switch (viewMode) {
        case "blacklist":
            return <DataGrid {...commonProps} rows={contactList} columns={contactBookColumn(columnProps)} />;
        case "corrupted":
            return <DataGrid {...commonProps} rows={contactList} columns={corruptedContactBookColumn(columnProps)} />;
        case "guest_list":
            return (
                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },  // 👈 stack on mobile, side by side on desktop
                    alignItems: 'flex-start',
                    gap: 2
                }}>
                    <Box sx={{
                        flexShrink: 0,
                        
                        width: { xs: '100%', md: 280 },  // 👈 full width on mobile
                    }}>
                        <EventSearch />
                    </Box>
                    <Box sx={{
                        flex: 1,
                        minWidth: 0,
                        height: { xs: '60dvh', md: '85dvh' },  // 👈 shorter on mobile
                        width: { xs: '100%', md: 'auto' },      // 👈 full width on mobile
                    }}>
                        <DataGrid
                            {...commonProps}
                            rows={selectedGuestList}
                            columns={guestListColumns({ onGuestAttend: onGuestAttend, onRemoveGuest:onRemoveGuest  })}
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