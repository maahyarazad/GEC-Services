// UnsubscribeDataGrid.tsx
//
// Thin wrapper over CustomDataGrid in server-side mode, mirroring ContactBookDataGrid.

import { Box } from "@mui/material";
import React from 'react';
import _CustomDataGrid from '../../CustomDataGrid';
import { unsubscribeColumn } from './WhatsAppComponentConfig';

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

const UnsubscribeDataGrid = ({
    unsubscribeList,
    paginationModel,
    setPaginationModel,
    onDeleteUnsubscribe,
    rowCount = 0,
    sortModel = [],
    onSortModelChange,
    filterItems = [],
    onFilterItemsChange,
    loading = false,
}: {
    unsubscribeList: any[];
    paginationModel: PaginationModel;
    setPaginationModel: (m: PaginationModel) => void;
    onDeleteUnsubscribe: (row: any) => void;
    rowCount?: number;
    sortModel?: SortItem[];
    onSortModelChange?: (m: SortItem[]) => void;
    filterItems?: FilterItem[];
    onFilterItemsChange?: (items: FilterItem[]) => void;
    loading?: boolean;
}) => {
    return (
        <Box sx={{ width: '100%', height: { xs: 'calc(100vh - 170px)', md: 'calc(100vh - 150px)' } }}>
            <CustomDataGrid
                rows={unsubscribeList}
                columns={unsubscribeColumn({ onDeleteUnsubscribe })}
                filterMode="server"
                sortingMode="server"
                paginationMode="server"
                rowCount={rowCount}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                sortModel={sortModel}
                onSortModelChange={onSortModelChange}
                filterItems={filterItems}
                onFilterItemsChange={onFilterItemsChange}
                showToolbar
                rowsPerPageOptions={[25, 50, 100]}
                loading={loading}
            />
        </Box>
    );
};

export default UnsubscribeDataGrid;
