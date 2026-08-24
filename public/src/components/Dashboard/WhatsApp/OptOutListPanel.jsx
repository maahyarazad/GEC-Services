import { useState, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import _CustomDataGrid from '../../CustomDataGrid';

// Spec 003-twilio-optout-webhook, User Story 4.
// Server-side paginated / filtered / sorted read-only view of the
// `whatsapp_opt_outs` table, rendered inside the WhatsApp "Opt-Out List"
// slider. Modeled directly on EventLogsPanel.jsx.

const PAGE_SIZE = 25;

const buildFilterParams = (filterItems = []) => {
    const active = filterItems.filter(
        (f) => f.value !== '' || ['isEmpty', 'isNotEmpty'].includes(f.operator)
    );
    if (active.length === 0) return '';
    return active
        .map((f) =>
            `filterField[]=${encodeURIComponent(f.field)}` +
            `&filterOperator[]=${encodeURIComponent(f.operator)}` +
            `&filterValue[]=${encodeURIComponent(f.value ?? '')}`
        )
        .join('&');
};

export default function OptOutListPanel({ active }) {
    const [rows, setRows] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: PAGE_SIZE });
    const [sortModel, setSortModel] = useState([{ field: 'opted_out_at', sort: 'desc' }]);
    const [filterItems, setFilterItems] = useState([]);
    const [debouncedFilterItems, setDebouncedFilterItems] = useState([]);

    // Debounce filter changes so we don't hammer the server on every keystroke
    useEffect(() => {
        const t = setTimeout(() => setDebouncedFilterItems(filterItems), 400);
        return () => clearTimeout(t);
    }, [filterItems]);

    const fetchData = useCallback(async (pagination, sort, filters) => {
        try {
            setLoading(true);
            const { field: sortField = '', sort: sortOrder = '' } = (sort ?? [])[0] ?? {};
            const filterParams = buildFilterParams(filters ?? []);

            const queryParams = [
                `page=${(pagination?.page ?? 0) + 1}`,
                `pageSize=${pagination?.pageSize ?? PAGE_SIZE}`,
                sortField ? `sortField=${sortField}` : '',
                sortOrder ? `sortOrder=${sortOrder}` : '',
                filterParams,
            ].filter(Boolean).join('&');

            const res = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/whatsapp/optout-list?${queryParams}`,
                { credentials: 'include' }
            );
            if (res.status === 200) {
                const data = await res.json();
                setRows(data.data ?? []);
                if (data.total !== undefined) setRowCount(data.total);
            }
        } catch (err) {
            console.error('Failed to fetch opt-out list:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Only fetch while the panel is open
    useEffect(() => {
        if (!active) return;
        fetchData(paginationModel, sortModel, debouncedFilterItems);
    }, [active, fetchData, paginationModel, sortModel, debouncedFilterItems]);

    const columns = [
        { field: 'phone', headerName: 'Phone', width: 170 },
        { field: 'keyword', headerName: 'Keyword', width: 140 },
        // Not filterable: the raw column is an epoch-ms integer, so a typed
        // date string can never match it via the server's LIKE-based filter.
        // Sorting still works correctly since it orders the raw integer.
        { field: 'opted_out_at', headerName: 'Opted Out At', width: 200, filterable: false },
    ];

    return (
        <Box sx={{ width: '100%', height: 'calc(100vh - 125px)' }}>
            <_CustomDataGrid
                rows={rows}
                columns={columns}
                loading={loading}

                filterMode="server"
                sortingMode="server"
                paginationMode="server"

                rowCount={rowCount}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                rowsPerPageOptions={[25, 50, 100]}

                sortModel={sortModel}
                onSortModelChange={setSortModel}

                filterItems={filterItems}
                onFilterItemsChange={setFilterItems}

                disableRowSelectionOnClick
            />
        </Box>
    );
}
