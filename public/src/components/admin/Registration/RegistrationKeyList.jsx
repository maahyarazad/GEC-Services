import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { DataGrid } from '@mui/x-data-grid';


const columns = [
  // { field: 'id', headerName: 'ID', width: 70 },
  // { field: 'registration_config_id', headerName: 'Config ID', width: 110 },
  { field: 'key', headerName: 'Key', minWidth: 10, width: 200 },
  { field: 'tokenCount', headerName: 'Used Token Count', width: 150 },
  // { field: 'memberId', headerName: 'Member ID', width: 110 },
  { field: 'createdAt', headerName: 'Created At', width: 200 },
];

const RegistrationKeyList = ({ data }) => {

  return (
   
      <Box sx={{ height: 500, width: '100%', overflow: 'auto' }}>
        <DataGrid
          rows={data}
          columns={columns}
          disableRowSelectionOnClick
          getRowId={(row) => row.id}
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
          }}
          pageSizeOptions={[10, 25, 50]}
        />
      </Box>
  )
}

export default RegistrationKeyList;
