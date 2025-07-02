import { GridToolbarContainer } from '@mui/x-data-grid';
import { TextField, Box } from '@mui/material';

export const GridToolbar = ({ filters, onFilterChange }) => {
    return (
        <GridToolbarContainer>
            <Box sx={{ display: 'flex', gap: 2, p: 1, flexWrap: 'wrap' }}>
                {Object.keys(filters).map((field) => (
                    <TextField
                        key={field}
                        label={field}
                        size="small"
                        value={filters[field]?.value || ''}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            onFilterChange(field, newValue);
                        }}
                    />
                ))}
            </Box>
        </GridToolbarContainer>
    );
};
