import { useState, useMemo, useEffect } from "react";
import { DataGrid } from '@mui/x-data-grid';
import { contactBookColumn, corruptedContactBookColumn } from './WhatsAppComponentConfig';
import EventSearch from './EventSearch';
import { Box } from "@mui/material";

const ContactBookDataGrid = ({
    contactList,
    viewMode,
    paginationModel,
    setPaginationModel,
    onModifyContact,
    onDeleteContact,
    onSwitchBlacklist,
}) => {
    const [_contactList, setContactList] = useState(contactList);

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


    useEffect(() => {

    }, [_contactList])

    switch (viewMode) {
        case "blacklist":
            return <DataGrid {...commonProps} rows={contactList} columns={contactBookColumn(columnProps)} />;
        case "corrupted":
            return <DataGrid {...commonProps} rows={contactList} columns={corruptedContactBookColumn(columnProps)} />;
        case "guest_list":
            return (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box sx={{ flexShrink: 0, width: 280 }}>
                        <EventSearch setContactList={setContactList} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0, height: '85dvh' }}>  {/* minWidth: 0 prevents flex overflow */}
                        <DataGrid
                            {...commonProps}
                            rows={_contactList}
                            columns={contactBookColumn(contactBookColumnProps)}
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