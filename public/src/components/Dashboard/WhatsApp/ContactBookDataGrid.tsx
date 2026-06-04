import { DataGrid } from '@mui/x-data-grid';
import { contactBookColumn, corruptedContactBookColumn } from './WhatsAppComponentConfig';
import { Box } from "@mui/material";
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
    // Server-side props (default / blacklist modes)
    rowCount = 0,
    sortModel = [],
    onSortModelChange,
    filterItems = [],
    onFilterItemsChange,
    loading = false,
    activeMemberPhones = new Map(),
    onOpenNotepad,
    notes,
}: {
    contactList: any[];
    viewMode: string;
    paginationModel: PaginationModel;
    setPaginationModel: (m: PaginationModel) => void;
    onModifyContact: (row: any) => void;
    onDeleteContact: (row: any) => void;
    onSwitchBlacklist: (row: any, val: boolean) => void;
    rowCount?: number;
    sortModel?: SortItem[];
    onSortModelChange?: (m: SortItem[]) => void;
    filterItems?: FilterItem[];
    onFilterItemsChange?: (items: FilterItem[]) => void;
    loading?: boolean;
    activeMemberPhones?: Map<string, any>;
    onOpenNotepad?: (row: any) => void;
    notes?: Map<number, string>;
}) => {
    const columnProps = { onModifyContact, onDeleteContact, onSwitchBlacklist, viewEventSpeedDial: true, activeMemberPhones, onOpenNotepad, notes };
    const contactBookColumnProps = { onModifyContact, onDeleteContact, onSwitchBlacklist, viewEventSpeedDial: true, activeMemberPhones, onOpenNotepad, notes };

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
        loading,
    };

    switch (viewMode) {
        case "blacklist":
            return (
                <Box sx={{ width: '100%', height: { xs: 'calc(100vh - 170px)', md: 'calc(100vh - 150px)' } }}>
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

        case "default":
        default:
            return (
                <Box sx={{ width: '100%', height: { xs: 'calc(100vh - 170px)', md: 'calc(100vh - 150px)' } }}>
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
