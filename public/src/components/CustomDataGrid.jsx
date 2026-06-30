import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Paper,
  Card,
  CardContent,
  IconButton,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Chip,
  Popover,
  Divider,
  Typography,
  Tooltip,
  CircularProgress,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';

// ─── Operator definitions ─────────────────────────────────────────────────────

const OPERATORS = {
  string: [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'equals' },
    { value: 'startsWith', label: 'starts with' },
    { value: 'endsWith', label: 'ends with' },
    { value: 'isEmpty', label: 'is empty', noValue: true },
    { value: 'isNotEmpty', label: 'is not empty', noValue: true },
  ],
  number: [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '!=' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '>=' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '<=' },
    { value: 'isEmpty', label: 'is empty', noValue: true },
    { value: 'isNotEmpty', label: 'is not empty', noValue: true },
  ],
};

function getOperators(column) {
  return OPERATORS[column.type || 'string'];
}

function applyOperator(cellValue, operator, filterValue) {
  const cell = String(cellValue ?? '').toLowerCase();
  const val = String(filterValue ?? '').toLowerCase();
  switch (operator) {
    case 'contains':    return cell.includes(val);
    case 'equals':      return cell === val;
    case 'startsWith':  return cell.startsWith(val);
    case 'endsWith':    return cell.endsWith(val);
    case 'isEmpty':     return cell === '';
    case 'isNotEmpty':  return cell !== '';
    case 'eq':          return Number(cellValue) === Number(filterValue);
    case 'neq':         return Number(cellValue) !== Number(filterValue);
    case 'gt':          return Number(cellValue) >   Number(filterValue);
    case 'gte':         return Number(cellValue) >=  Number(filterValue);
    case 'lt':          return Number(cellValue) <   Number(filterValue);
    case 'lte':         return Number(cellValue) <=  Number(filterValue);
    default:            return true;
  }
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

function FilterPanel({ columns, filters, onFiltersChange, onClose }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const filterableColumns = columns.filter((c) => c.filterable !== false);

  const addFilter = () => {
    const col = filterableColumns[0];
    if (!col) return;
    const ops = getOperators(col);
    onFiltersChange([
      ...filters,
      { id: Date.now(), field: col.field, operator: ops[0].value, value: '' },
    ]);
  };

  const updateFilter = (id, patch) =>
    onFiltersChange(
      filters.map((f) => {
        if (f.id !== id) return f;
        const updated = { ...f, ...patch };
        if (patch.field !== undefined && patch.field !== f.field) {
          const col = filterableColumns.find((c) => c.field === patch.field);
          const ops = col ? getOperators(col) : OPERATORS.string;
          updated.operator = ops[0].value;
        }
        return updated;
      })
    );

  const removeFilter = (id) => onFiltersChange(filters.filter((f) => f.id !== id));

  return (
    <Box
      sx={{
        p: 2,
        // On mobile: fill most of the viewport width; on desktop: fixed width
        width: isMobile ? 'calc(100vw - 32px)' : 480,
        maxWidth: isMobile ? '100%' : 600,
        boxSizing: 'border-box'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: 'text.secondary',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Filters
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {filters.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: 13 }}>
          No filters applied.
        </Typography>
      )}

      <Stack spacing={1.5}>
        {filters.map((filter, idx) => {
          const col =
            filterableColumns.find((c) => c.field === filter.field) || filterableColumns[0];
          const ops = col ? getOperators(col) : OPERATORS.string;
          const activeOp = ops.find((o) => o.value === filter.operator) || ops[0];

          return (
            <Box
              key={filter.id}
              sx={{
                bgcolor: 'action.hover',
                borderRadius: 1,
                px: 1.5,
                py: 1,
              }}
            >
              {/* WHERE / AND label + remove button on same row */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: isMobile ? 0.75 : 0 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                  {idx === 0 ? 'WHERE' : 'AND'}
                </Typography>
                <IconButton size="small" onClick={() => removeFilter(filter.id)} sx={{ color: 'text.secondary' }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* On mobile: stack selectors vertically; on desktop: keep horizontal */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'center',
                  gap: 1,
                }}
              >
                {/* Column selector */}
                <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 130 }}>
                  <Select
                    value={filter.field}
                    onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                    sx={{ fontSize: 13 }}
                    MenuProps={{ style: { zIndex: 1500 } }}
                  >
                    {filterableColumns.map((c) => (
                      <MenuItem key={c.field} value={c.field} sx={{ fontSize: 13 }}>
                        {c.headerName || c.field}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Operator selector */}
                <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 120 }}>
                  <Select
                    value={filter.operator}
                    onChange={(e) => updateFilter(filter.id, { operator: e.target.value })}
                    sx={{ fontSize: 13 }}
                    MenuProps={{ style: { zIndex: 1500 } }}
                  >
                    {ops.map((op) => (
                      <MenuItem key={op.value} value={op.value} sx={{ fontSize: 13 }}>
                        {op.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Value input */}
                {!activeOp.noValue && (
                  <TextField
                    size="small"
                    value={filter.value}
                    onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                    placeholder="Value"
                    sx={{ flex: 1, '& input': { fontSize: 13 } }}
                  />
                )}
              </Box>
            </Box>
          );
        })}
      </Stack>

      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={addFilter}
        sx={{ mt: 1.5, fontSize: 12, textTransform: 'none' }}
      >
        Add filter
      </Button>
    </Box>
  );
}

// ─── Column Visibility Panel ──────────────────────────────────────────────────

function ColumnVisibilityPanel({ columns, visibleFields, onVisibilityChange }) {
  return (
    <Box sx={{ p: 2, minWidth: 200 }}>
      <Typography
        variant="subtitle2"
        sx={{
          mb: 1,
          fontWeight: 600,
          color: 'text.secondary',
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        Columns
      </Typography>
      <Stack spacing={0.5}>
        {columns.map((col) => (
          <Box
            key={col.field}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              cursor: 'pointer',
              py: 0.25,
            }}
            onClick={() => {
              const next = new Set(visibleFields);
              if (next.has(col.field)) {
                if (next.size > 1) next.delete(col.field);
              } else {
                next.add(col.field);
              }
              onVisibilityChange(next);
            }}
          >
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              {col.headerName || col.field}
            </Typography>
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '3px',
                border: '1.5px solid',
                borderColor: visibleFields.has(col.field) ? 'primary.main' : 'divider',
                bgcolor: visibleFields.has(col.field) ? 'primary.main' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {visibleFields.has(col.field) && (
                <Box component="span" sx={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>
                  ✓
                </Box>
              )}
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function GridToolbar({ columns, filters, onFiltersChange, visibleFields, onVisibilityChange }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPos, setFilterPos] = useState({ top: 0, left: 0 });
  const filterAnchorRef = useRef(null);
  const [colAnchor, setColAnchor] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const openFilter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setFilterPos({ top: rect.bottom + 4, left: rect.left });
    filterAnchorRef.current = e.currentTarget;
    setFilterOpen(true);
  };

  // Keep panel anchored when user scrolls or resizes
  useEffect(() => {
    if (!filterOpen) return;
    const reposition = () => {
      const rect = filterAnchorRef.current?.getBoundingClientRect();
      if (rect) setFilterPos({ top: rect.bottom + 4, left: rect.left });
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [filterOpen]);

  // Close on Escape
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setFilterOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [filterOpen]);

  const activeCount = filters.filter(
    (f) => f.value !== '' || ['isEmpty', 'isNotEmpty'].includes(f.operator)
  ).length;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',          // allow chips to wrap onto a second line
        gap: 0.5,
        px: 1,
        py: 0.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        minHeight: 48,
      }}
    >
      {/* Filter button — icon-only on mobile */}
      <Tooltip title="Filters">
        {isMobile ? (
          <IconButton
            size="small"
            onClick={openFilter}
            color={activeCount > 0 ? 'primary' : 'default'}
          >
            <FilterListIcon fontSize="small" />
            {activeCount > 0 && (
              <Chip
                label={activeCount}
                size="small"
                color="primary"
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  height: 16,
                  fontSize: 10,
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            )}
          </IconButton>
        ) : (
          <Button
            size="small"
            startIcon={<FilterListIcon />}
            onClick={openFilter}
            sx={{
              textTransform: 'none',
              fontSize: 13,
              color: activeCount > 0 ? 'primary.main' : 'text.secondary',
            }}
          >
            Filters
            {activeCount > 0 && (
              <Chip
                label={activeCount}
                size="small"
                color="primary"
                sx={{ ml: 0.75, height: 18, fontSize: 11, '& .MuiChip-label': { px: 0.75 } }}
              />
            )}
          </Button>
        )}
      </Tooltip>

      {/* Column visibility button — icon-only on mobile */}
      <Tooltip title="Columns">
        {isMobile ? (
          <IconButton size="small" onClick={(e) => setColAnchor(e.currentTarget)}>
            <ViewColumnIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button
            size="small"
            startIcon={<ViewColumnIcon />}
            onClick={(e) => setColAnchor(e.currentTarget)}
            sx={{ textTransform: 'none', fontSize: 13, color: 'text.secondary' }}
          >
            Columns
          </Button>
        )}
      </Tooltip>

      {/* Active filter chips — wrap naturally, hidden on mobile to save space */}
      {activeCount > 0 && !isMobile && (
        <>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            {filters
              .filter((f) => f.value !== '' || ['isEmpty', 'isNotEmpty'].includes(f.operator))
              .map((f) => {
                const col = columns.find((c) => c.field === f.field);
                const ops = col ? getOperators(col) : OPERATORS.string;
                const op = ops.find((o) => o.value === f.operator);
                const label = `${col?.headerName || f.field} ${op?.label || f.operator}${
                  op?.noValue ? '' : ` "${f.value}"`
                }`;
                return (
                  <Chip
                    key={f.id}
                    label={label}
                    size="small"
                    onDelete={() => onFiltersChange(filters.filter((x) => x.id !== f.id))}
                    sx={{ fontSize: 12, height: 24, maxWidth: 220 }}
                  />
                );
              })}
            <Chip
              label="Clear all"
              size="small"
              onClick={() => onFiltersChange([])}
              sx={{ fontSize: 12, height: 24, cursor: 'pointer' }}
            />
          </Box>
        </>
      )}

      {/* On mobile, show a compact "N active" chip instead of full chips */}
      {activeCount > 0 && isMobile && (
        <Chip
          label={`${activeCount} active`}
          size="small"
          color="primary"
          onDelete={() => onFiltersChange([])}
          sx={{ fontSize: 11, height: 22 }}
        />
      )}

      {/* Filter panel — portal into document.body so no parent re-render closes it */}
      {filterOpen && createPortal(
        <Paper
          elevation={6}
          sx={{
            position: 'fixed',
            top: filterPos.top,
            left: filterPos.left,
            zIndex: 1400,
            borderRadius: 2,
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto',
          }}
        >
          <FilterPanel
            columns={columns}
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClose={() => setFilterOpen(false)}
          />
        </Paper>,
        document.body
      )}

      <Popover
        open={Boolean(colAnchor)}
        anchorEl={colAnchor}
        onClose={() => setColAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ elevation: 3, sx: { borderRadius: 2 } }}
      >
        <ColumnVisibilityPanel
          columns={columns}
          visibleFields={visibleFields}
          onVisibilityChange={onVisibilityChange}
        />
      </Popover>
    </Box>
  );
}

// ─── Mobile Card View ─────────────────────────────────────────────────────────

function MobileCardView({ rows, columns, loading, onRowClick, selectedRowId }) {
  if (loading) return null; // loading overlay is rendered by the parent

  if (rows.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
          No rows
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ p: 1.5 }}>
      {rows.map((row) => (
        <Card
          key={row.id}
          variant="outlined"
          onClick={() => onRowClick?.(row)}
          sx={{
            cursor: onRowClick ? 'pointer' : 'default',
            borderRadius: 2,
            boxShadow: 'none',
            transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
            '&:hover': {
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
              borderColor: 'primary.light',
            },
            ...(selectedRowId !== undefined && row.id === selectedRowId && {
              borderColor: 'primary.main',
              bgcolor: 'action.selected',
            }),
          }}
        >
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack spacing={1}>
              {columns.map((col, idx) => (
                <Box key={col.field}>
                  {idx > 0 && (
                    <Divider sx={{ mb: 1 }} />
                  )}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: 'text.secondary',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        flexShrink: 0,
                        minWidth: 90,
                        pt: '2px',
                      }}
                    >
                      {col.headerName || col.field}
                    </Typography>
                    <Box
                      sx={{
                        fontSize: 13,
                        color: 'text.primary',
                        textAlign: 'right',
                        flex: 1,
                        minWidth: 0,
                        wordBreak: 'break-word',
                      }}
                    >
                      {col.renderCell
                        ? col.renderCell({ row, value: row[col.field] })
                        : row[col.field] ?? '—'}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

// ─── Main CustomDataGrid ──────────────────────────────────────────────────────

/**
 * CustomDataGrid
 *
 * Props mirror MUI DataGrid where possible:
 *
 * @param {Array}    rows                  - Array of row objects (must have an `id` field)
 * @param {Array}    columns               - Column definitions (field, headerName, width, renderCell, filterable, sortable, type)
 * @param {boolean}  loading               - Show loading spinner
 * @param {boolean}  showToolbar           - Show filter/column toolbar (default: true)
 *
 * Server-side mode (pass all four):
 * @param {string}   filterMode            - "server" | "client"  (default: "client")
 * @param {string}   sortingMode           - "server" | "client"  (default: "client")
 * @param {string}   paginationMode        - "server" | "client"  (default: "client")
 * @param {number}   rowCount              - Total row count for server-side pagination
 * @param {object}   paginationModel       - { page, pageSize }
 * @param {function} onPaginationModelChange
 * @param {Array}    sortModel             - [{ field, sort: 'asc'|'desc' }]
 * @param {function} onSortModelChange
 * @param {Array}    filterItems           - [{ id, field, operator, value }]  (server-side filters)
 * @param {function} onFilterItemsChange   - called with updated filterItems array
 *
 * Client-side mode: no need to pass server-side props; component handles pagination/sort/filter internally.
 */
const CustomDataGrid = ({
  rows = [],
  columns = [],
  loading = false,
  showToolbar = true,

  // Modes
  filterMode = 'client',
  sortingMode = 'client',
  paginationMode = 'client',

  // Server-side
  rowCount,
  paginationModel: externalPaginationModel,
  onPaginationModelChange,
  sortModel: externalSortModel,
  onSortModelChange,
  filterItems: externalFilterItems,
  onFilterItemsChange,

  // Misc
  rowsPerPageOptions = [10, 25, 50, 100, 500],
  disableRowSelectionOnClick = true,
  getRowHeight,
  onRowClick,
  selectedRowId,
  sx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // ── Internal state (client-side mode) ──────────────────────────────────────
  const [internalPage, setInternalPage] = useState(0);
  const [internalPageSize, setInternalPageSize] = useState(rowsPerPageOptions[0] || 25);
  const [internalSortModel, setInternalSortModel] = useState([]);
  const [internalFilters, setInternalFilters] = useState([]);

  // Column visibility
  const [visibleFields, setVisibleFields] = useState(() => new Set(columns.map((c) => c.field)));

  // ── Resolve active state ───────────────────────────────────────────────────
  const isServerFilter = filterMode === 'server';
  const isServerSort   = sortingMode === 'server';
  const isServerPage   = paginationMode === 'server';

  const activePage     = isServerPage ? (externalPaginationModel?.page ?? 0) : internalPage;
  const activePageSize = isServerPage ? (externalPaginationModel?.pageSize ?? internalPageSize) : internalPageSize;
  const activeSortModel  = isServerSort  ? (externalSortModel  || []) : internalSortModel;
  const activeFilters    = isServerFilter ? (externalFilterItems || []) : internalFilters;
  const totalRows        = isServerPage ? (rowCount ?? rows.length) : undefined;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSortChange = useCallback((field) => {
    const current = activeSortModel[0];
    let next = [];
    if (current?.field === field) {
      if (current.sort === 'asc') next = [{ field, sort: 'desc' }];
      else next = [];
    } else {
      next = [{ field, sort: 'asc' }];
    }
    if (isServerSort) onSortModelChange?.(next);
    else setInternalSortModel(next);
    if (!isServerPage) setInternalPage(0);
  }, [activeSortModel, isServerSort, onSortModelChange, isServerPage]);

  const handleFiltersChange = useCallback((newFilters) => {
    if (isServerFilter) onFilterItemsChange?.(newFilters);
    else { setInternalFilters(newFilters); setInternalPage(0); }
  }, [isServerFilter, onFilterItemsChange]);

  const handlePageChange = useCallback((_, newPage) => {
    if (isServerPage) onPaginationModelChange?.({ page: newPage, pageSize: activePageSize });
    else setInternalPage(newPage);
  }, [isServerPage, onPaginationModelChange, activePageSize]);

  const handleRowsPerPageChange = useCallback((e) => {
    const ps = parseInt(e.target.value, 10);
    if (isServerPage) onPaginationModelChange?.({ page: 0, pageSize: ps });
    else { setInternalPageSize(ps); setInternalPage(0); }
  }, [isServerPage, onPaginationModelChange]);

  // ── Client-side data processing ───────────────────────────────────────────
  const processedRows = useMemo(() => {
    if (isServerFilter && isServerSort && isServerPage) return rows;

    let result = [...rows];

    if (!isServerFilter) {
      const activeF = activeFilters.filter(
        (f) => f.value !== '' || ['isEmpty', 'isNotEmpty'].includes(f.operator)
      );
      if (activeF.length > 0) {
        result = result.filter((row) =>
          activeF.every((f) => applyOperator(row[f.field], f.operator, f.value))
        );
      }
    }

    if (!isServerSort && activeSortModel.length > 0) {
      const { field, sort } = activeSortModel[0];
      result.sort((a, b) => {
        const av = a[field], bv = b[field];
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return sort === 'desc' ? -cmp : cmp;
      });
    }

    return result;
  }, [rows, isServerFilter, isServerSort, isServerPage, activeFilters, activeSortModel]);

  // Client-side pagination slice
  const pagedRows = useMemo(() => {
    if (isServerPage) return processedRows;
    const start = activePage * activePageSize;
    return processedRows.slice(start, start + activePageSize);
  }, [isServerPage, processedRows, activePage, activePageSize]);

  const effectiveTotal = isServerPage ? (totalRows ?? 0) : processedRows.length;

  // Visible columns — recomputed only when columns or their visibility change.
  const visibleColumns = useMemo(
    () => columns.filter((c) => visibleFields.has(c.field)),
    [columns, visibleFields]
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        borderRadius: 1,
        overflow: 'hidden',
        ...sx,
      }}
    >
      {showToolbar && (
        <GridToolbar
          columns={columns}
          filters={activeFilters}
          onFiltersChange={handleFiltersChange}
          visibleFields={visibleFields}
          onVisibilityChange={setVisibleFields}
        />
      )}

      {/* Table / Card area */}
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255,255,255,0.6)',
              zIndex: 10,
            }}
          >
            <CircularProgress size={32} />
          </Box>
        )}

        {isMobile ? (
          /* ── Mobile: card-per-row layout ── */
          <Box sx={{ height: '100%', overflowY: 'auto' }}>
            <MobileCardView
              rows={pagedRows}
              columns={visibleColumns}
              loading={loading}
              onRowClick={onRowClick}
              selectedRowId={selectedRowId}
            />
          </Box>
        ) : (
          /* ── Desktop: standard table layout ── */
          <TableContainer sx={{ height: '100%', overflowX: 'auto', overflowY: 'auto', isolation: 'isolate' }}>
            <Table
              stickyHeader
              size="small"
              sx={{ tableLayout: 'fixed' }}
            >
              <TableHead>
                <TableRow>
                  {visibleColumns.map((col) => (
                    <TableCell
                      key={col.field}
                      sx={{
                        width: col.width || 130,
                        minWidth: col.width || 130,
                        fontWeight: 600,
                        fontSize: 13,
                        bgcolor: 'background.paper',
                        whiteSpace: 'nowrap',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        py: 1,
                        px: 1.5,
                        userSelect: 'none',
                      }}
                    >
                      {col.sortable !== false ? (
                        <TableSortLabel
                          active={activeSortModel[0]?.field === col.field}
                          direction={
                            activeSortModel[0]?.field === col.field
                              ? activeSortModel[0].sort
                              : 'asc'
                          }
                          onClick={() => handleSortChange(col.field)}
                          sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}
                        >
                          {col.headerName || col.field}
                        </TableSortLabel>
                      ) : (
                        col.headerName || col.field
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedRows.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length}
                      align="center"
                      sx={{ py: 4, color: 'text.secondary', fontSize: 13 }}
                    >
                      No rows
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedRows.map((row) => {
                    const rowHeight = getRowHeight?.({ row }) ?? 52;
                    return (
                      <TableRow
                        key={row.id}
                        hover
                        onClick={() => onRowClick?.(row)}
                        sx={{
                          height: rowHeight,
                          cursor: onRowClick ? 'pointer' : 'default',
                          '& td': { borderBottom: '1px solid', borderColor: 'divider' },
                          ...(selectedRowId !== undefined && row.id === selectedRowId && {
                            bgcolor: 'action.selected',
                            '&:hover': { bgcolor: 'action.selected' },
                          }),
                        }}
                      >
                        {visibleColumns.map((col) => (
                          <TableCell
                            key={col.field}
                            sx={{
                              width: col.width || 130,
                              minWidth: col.width || 130,
                              fontSize: 13,
                              px: 1.5,
                              py: 0.5,
                              overflow: 'hidden',
                              textOverflow: col.renderCell ? 'unset' : 'ellipsis',
                              whiteSpace: col.renderCell ? 'normal' : 'nowrap',
                            }}
                          >
                            {col.renderCell
                              ? col.renderCell({ row, value: row[col.field] })
                              : row[col.field] ?? ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Pagination */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
        <TablePagination
          component="div"
          count={effectiveTotal}
          page={activePage}
          onPageChange={handlePageChange}
          rowsPerPage={activePageSize}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={rowsPerPageOptions}
          // Hide "Rows per page" label on mobile to prevent overflow
          labelRowsPerPage={isMobile ? '' : 'Rows per page:'}
          sx={{
            fontSize: 13,
            '& .MuiTablePagination-select': { fontSize: 13 },
            '& .MuiTablePagination-displayedRows': { fontSize: 13 },
            // On very small screens collapse the select as well
            '& .MuiTablePagination-selectLabel': {
              display: isMobile ? 'none' : 'block',
            },
            '& .MuiInputBase-root': {
              display: isMobile ? 'none' : 'flex',
            },
          }}
        />
      </Box>
    </Paper>
  );
};

export default CustomDataGrid;
