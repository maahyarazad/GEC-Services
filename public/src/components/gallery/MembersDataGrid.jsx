import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, CircularProgress, Tooltip, Button } from '@mui/material';
import { BsFiletypeCsv } from "react-icons/bs";
import MemberRequestForm  from "../../components/admin/Member/MemberRequestForm";
import { MdFormatListBulletedAdd } from "react-icons/md";
import Modal from "../../components/Modal";

const columns = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'firstName', headerName: 'First Name', width: 130, filterable: true },
  { field: 'lastName', headerName: 'Last Name', width: 130, filterable: true },
  { field: 'phoneNumber', headerName: 'Phone Number', width: 150, filterable: true },
  { field: 'whatsapp', headerName: 'WhatsApp', width: 150, filterable: true },
  { field: 'language', headerName: 'Language', width: 100, filterable: true },
  { field: 'uniqueIdentifier', headerName: 'Unique ID', width: 160, filterable: true },
  { field: 'createdAt', headerName: 'Created At', width: 160, filterable: true },
  { field: 'modifiedAt', headerName: 'Modified At', width: 160, filterable: true },
];

export const MemberDataGrid = () => {
    const [newReg, setNewReg] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [sortModel, setSortModel] = useState([]);
  const [filterModel, setFilterModel] = useState({});
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  const fetchData = async (paginationModel, sortModel = [], filterModel = {}) => {
    setLoading(true);
    try {
      const sort = Array.isArray(sortModel) && sortModel.length > 0 ? sortModel[0] : {};
      const sortField = sort.field || '';
      const sortOrder = sort.sort || '';
      const filterParams = Object.entries(filterModel)
        .map(([field, { value }]) => `filter_${field}=${encodeURIComponent(value)}`)
        .join('&');

      const queryParams = [
        `page=${paginationModel.page + 1}`,
        `pageSize=${paginationModel.pageSize}`,
        sortField ? `sortField=${sortField}` : '',
        sortOrder ? `sortOrder=${sortOrder}` : '',
        filterParams,
      ].filter(Boolean).join('&');

      const response = await fetch(`${import.meta.env.VITE_SERVERURL}/member?${queryParams}`);
      const data = await response.json();

      setMembers(data.data || []);
      setRowCount(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(paginationModel, sortModel, filterModel);
  }, [paginationModel, sortModel, filterModel]);

  const handleExport = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(`${import.meta.env.VITE_SERVERURL}/member-csv-data`);
      if (!response.ok) throw new Error('Failed to fetch CSV');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'members.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Box sx={{ padding: 1 }}>



      <div className="d-flex justify-content-start mb-1">
        <div className="">
           <Button
  variant="outlined"
  startIcon={<MdFormatListBulletedAdd size={24} />}
  onClick={() => setNewReg(true)}
sx={{ fontSize: 14, textTransform: 'none', marginRight: 1 }}
>
  Add Member
</Button>
        </div>
        <Tooltip title="Download CSV data" componentsProps={{ tooltip: { sx: { fontSize: 14 } } }}>
                    </Tooltip>
          {isDownloading ? (
            <div className='d-flex'>
              <span className='me-2'>Downloading</span>
              <CircularProgress size={20} color="inherit" />
            </div>
          ) : (
            <Button
  variant="outlined"
  startIcon={<BsFiletypeCsv size={20} />}
  onClick={handleExport}
  sx={{ fontSize: 14, color: 'primary.main' , textTransform: 'none'}}
>
  Download CSV
</Button>
          )}

      </div>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <div style={{ width: '100%', height: '82dvh' }}>
          <DataGrid
            rows={members}
            columns={columns}
            rowsPerPageOptions={[25, 50, 100]}
            paginationMode="server"
            sortingMode="server"
            filterMode="server"
            rowCount={rowCount}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            onSortModelChange={setSortModel}
            filterModel={{
              items: Object.entries(filterModel).map(([field, { value }]) => ({
                field,
                value,
                operator: 'contains',
              })),
            }}
            onFilterModelChange={(newModel) => {
              const filters = {};
              newModel.items.forEach(item => {
                if (item.value && item.field) {
                  filters[item.field] = { value: item.value };
                }
              });
              setFilterModel(filters);
            }}
            sortModel={sortModel}
            disableSelectionOnClick
            pagination
          />
        </div>
      )}

      <Modal isOpen={newReg}
                onRequestClose={() => setNewReg(false)}
                title={"New Member"}>
                <MemberRequestForm 
                    initialData={null}
                    modalSwitch={() => {
                        setNewReg(false);
                        fetchData();

                    }} />
            </Modal>
    </Box>
  );
};
