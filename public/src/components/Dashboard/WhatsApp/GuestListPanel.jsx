import { DataGrid } from '@mui/x-data-grid';
import { guestListColumns } from './WhatsAppComponentConfig';
import EventSearch from './EventSearch';
import { Box } from '@mui/material';
import { getSelectedGuestList } from '../../../features/eventSlice';
import { useAppSelector } from '../../../store/hooks';

export default function GuestListPanel({ onGuestAttend, onRemoveGuest, paginationModel, setPaginationModel }) {
    const selectedGuestList = useAppSelector(getSelectedGuestList);

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'flex-start',
            gap: 2,
            width: '100%',
            height: '100%',
            p: 1,
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
}
