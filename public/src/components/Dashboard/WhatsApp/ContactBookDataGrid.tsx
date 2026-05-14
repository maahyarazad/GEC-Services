import { DataGrid } from '@mui/x-data-grid';
import { contactBookColumn, corruptedContactBookColumn, guestListColumns } from './WhatsAppComponentConfig';
import EventSearch from './EventSearch';
import { Box } from "@mui/material";
import { getSelectedGuestList } from "../../../features/eventSlice";
import { useAppSelector } from '../../../store/hooks';
import _CustomDataGrid from '../../CustomDataGrid';
import React from 'react';
const CustomDataGrid = _CustomDataGrid as React.ComponentType<Record<string, any>>;

interface PaginationModel {
    page: number;
    pageSize: number;
}

interface SortItem {
    field: string;
    sort: 'asc' | 'desc';
}

interface FilterItem {
    id: number;
    field: string;
    operator: string;
    value: string;
}

const ContactBookDataGrid = ({
    contactList,
    viewMode,
    paginationModel,
    setPaginationModel,
    onModifyContact,
    onDeleteContact,
    onSwitchBlacklist,
    onGuestAttend,
    onRemoveGuest,
    // Server-side props (default / blacklist modes)
    rowCount = 0,
    sortModel = [],
    onSortModelChange,
    filterItems = [],
    onFilterItemsChange,
}: {
    contactList: any[];
    viewMode: string;
    paginationModel: PaginationModel;
    setPaginationModel: (m: PaginationModel) => void;
    onModifyContact: (row: any) => void;
    onDeleteContact: (row: any) => void;
    onSwitchBlacklist: (row: any, val: boolean) => void;
    onGuestAttend: (row: any) => void;
    onRemoveGuest: (row: any) => void;
    rowCount?: number;
    sortModel?: SortItem[];
    onSortModelChange?: (m: SortItem[]) => void;
    filterItems?: FilterItem[];
    onFilterItemsChange?: (items: FilterItem[]) => void;
}) => {
    const selectedGuestList = useAppSelector(getSelectedGuestList);

    const columnProps = { onModifyContact, onDeleteContact, onSwitchBlacklist, viewEventSpeedDial: false };
    const contactBookColumnProps = { onModifyContact, onDeleteContact, onSwitchBlacklist, viewEventSpeedDial: true };

    const serverSideProps = {
        filterMode: 'server' as const,
        sortingMode: 'server' as const,
        paginationMode: 'server' as const,
        rowCount,
        paginationModel,
        onPaginationModelChange: setPaginationModel,
        sortModel,
        onSortModelChange,
        filterItems,
        onFilterItemsChange,
        showToolbar: true,
        rowsPerPageOptions: [25, 50, 100],
    };

    switch (viewMode) {
        case "blacklist":
            return (
                <Box sx={{ width: '100%', height: 'calc(100vh - 175px)' }}>
                    <CustomDataGrid
                        rows={contactList}
                        columns={contactBookColumn(columnProps)}
                        {...serverSideProps}
                    />
                </Box>
            );

        case "corrupted":
            return (
                <DataGrid
                    rows={contactList}
                    columns={corruptedContactBookColumn(columnProps)}
                    paginationModel={paginationModel}
                    onPaginationModelChange={setPaginationModel}
                    pageSizeOptions={[25, 50, 100]}
                    pagination
                    disableRowSelectionOnClick
                    showToolbar
                />
            );

        case "guest_list":
            return (
                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: 'flex-start',
                    gap: 2
                }}>
                    <Box sx={{ flexShrink: 0, width: { xs: '100%', md: 280 } }}>
                        <EventSearch />
                    </Box>
                    <Box sx={{
                        flex: 1,
                        minWidth: 0,
                        height: { xs: '60dvh', md: '85dvh' },
                        width: { xs: '100%', md: 'auto' },
                    }}>
                        <DataGrid
                            rows={selectedGuestList}
                            columns={guestListColumns({ onGuestAttend, onRemoveGuest })}
                            paginationModel={paginationModel}
                            onPaginationModelChange={setPaginationModel}
                            pageSizeOptions={[25, 50, 100]}
                            pagination
                            disableRowSelectionOnClick
                            showToolbar
                        />
                    </Box>
                </Box>
            );

        case "default":
        default:
            return (
                <Box sx={{ width: '100%', height: 'calc(100vh - 175px)' }}>
                    <CustomDataGrid
                        rows={contactList}
                        columns={contactBookColumn(contactBookColumnProps)}
                        {...serverSideProps}
                    />
                </Box>
            );
    }
};

export default ContactBookDataGrid;
