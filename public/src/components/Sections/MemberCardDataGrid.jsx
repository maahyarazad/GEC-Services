import { useEffect, useState, useCallback } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { useAlertDialog } from '../Providers/AlertProvider';
import { useSnackbar } from '../Providers/Snackbar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import DashboardCards from '../Dashboard/Dashboard/DashboardCards';
import { MdWorkspacePremium } from "react-icons/md";
import { BsFiletypeCsv } from "react-icons/bs";
import FilterParams from '../Dashboard/FilterParams';
import { GrVirtualMachine } from "react-icons/gr";
import Modal from '../Modal';
import { IconButton } from '@mui/material';
import { FaUsersViewfinder } from "react-icons/fa6";



const paidBlue = '#0f0faf';
const nonpaidBlue = '#55729e';
const red = '#cc0000';;
import { SiMinutemailer } from "react-icons/si";

const columns = ({ onResendPasswordReset, loadingRowId, onSendInvitationEmail }) => [
    { field: 'id', headerName: 'ID', width: 70 },
    {
        field: 'type',
        headerName: 'Type',
        width: 100,
        filterable: true,
        renderCell: (params) => {
            const virtualCard = params.row.serial_number
                ?
                <Tooltip title={`Virtual Pass Serial Number: ${params.row.serial_number}`}><GrVirtualMachine size={20} style={{ marginRight: 6 }} /> </Tooltip>
                : <div style={{ width: 20, height: 20, marginRight: 6 }} />;

            const containerStyle = {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                height: '100%',
            };

            switch (params.row.type) {
                case 7:
                    return (
                        <div style={containerStyle}>
                            {virtualCard}
                            <MdWorkspacePremium color={red} size={22} />
                        </div>
                    );

                case 5:
                    return (
                        <div style={containerStyle}>
                            {virtualCard}
                            <MdWorkspacePremium color={nonpaidBlue} size={22} />
                        </div>
                    );

                default:
                    return (
                        <div style={containerStyle}>
                            {virtualCard}
                            <MdWorkspacePremium color={paidBlue} size={22} />
                        </div>
                    );
            }
        },
    },

    {
        field: '',
        headerName: 'Actions',
        width: 100,
        filterable: false,
        renderCell: (params) => {

            const containerStyle = {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                height: '100%',
            };

            return (
                <div style={containerStyle}>
                    <Tooltip title={`Send invitation email to ${params.row.email}`}>
                        <IconButton onClick={() => onSendInvitationEmail(params.row)}>
                            <SiMinutemailer color={'gray'} size={22} />
                        </IconButton>
                    </Tooltip>

                </div>
            );

        }
    },

    { field: 'card_number', headerName: 'Card Number', width: 100, filterable: true },
    { field: 'partner', headerName: 'Partner', width: 150, filterable: true },
    { field: 'firstname', headerName: 'First Name', width: 150, filterable: true },
    { field: 'lastname', headerName: 'Last Name', width: 150, filterable: true },
    { field: 'card_expiry_date', headerName: 'Card Expiry Date', width: 200, filterable: true },
    { field: 'mobile_number', headerName: 'Mobile Number', width: 180, filterable: true },
    { field: 'email', headerName: 'Email', width: 220, filterable: true },

    { field: 'memberId', headerName: 'Member ID', width: 150, filterable: true },
    { field: 'username', headerName: 'Username', width: 200, filterable: true },
    { field: 'title', headerName: 'Title', width: 120, filterable: true },
    { field: 'gender', headerName: 'Gender', width: 120, filterable: true },
    { field: 'last_login', headerName: 'Last Login', width: 200, filterable: true },
];


const MemberCardDataGrid = () => {
    const defaultSortModel = [{ field: 'id', sort: 'desc' }];
    const [loadingRowId, setLoadingRowId] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewStatus, setViewStatus] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [rowCount, setRowCount] = useState(0);
    const [sortModel, setSortModel] = useState(defaultSortModel);
    const [filterModel, setFilterModel] = useState({
        items: [],
    });
    const [applyFilterTrigger, setApplyFilterTrigger] = useState(0);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
    const { openDialog } = useAlertDialog();
    const { showSnackbar } = useSnackbar();


    const confirmSendInvitationEmail = (member_data) => {
        openDialog(
            <>
                Are you sure you want to send an invitation email to <strong>{member_data?.email || "this member"}</strong>?
            </>,
            'Send Invitation Email', {
            text: 'Send',
            color: 'primary'
        },
            () => {
                handleSendInvitationEmail(member_data)
            },
            () => {
                // Cancelled: do nothing
            }
        );
    }


    const handleSendInvitationEmail = async (member_data) => {

        try {
            setLoadingRowId(member_data.id);
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/send-invitation-email`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ data: member_data }),
            });

            const data = await response.json();

            if (!response.ok) {

                showSnackbar(data.message);
                throw new Error(response.message);
            }

            showSnackbar(data.message);
        } catch (error) {
            console.error("Error:", error);


        } finally {
            setLoadingRowId(null);
        }
    };

    const handleResetPassword = async (row) => {
        try {
            setLoadingRowId(row.id);
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/gic-user/send-reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ email: row.email }),
            });

            const data = await response.json();

        } catch (error) {
            console.error("Error resetting password:", error);
        } finally {
            setLoadingRowId(null);
        }
    };



    const fetchData = useCallback(
        async (paginationModel, sortModel = [], filterModel = { items: [] }) => {
            setLoading(true);
            try {
                const sort = Array.isArray(sortModel) && sortModel.length > 0 ? sortModel[0] : {};
                const sortField = sort.field || '';
                const sortOrder = sort.sort || '';

                // Parse filters from filterModel.items
                const filterParams = FilterParams(filterModel);

                const queryParams = [
                    `page=${paginationModel.page + 1}`,
                    `pageSize=${paginationModel.pageSize}`,
                    sortField ? `sortField=${sortField}` : '',
                    sortOrder ? `sortOrder=${sortOrder}` : '',
                    filterParams,
                ].filter(Boolean).join('&');

                const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/member_card?${queryParams}`, { credentials: "include" });

                const data = await response.json();

                setMembers(data.data || []);
                setRowCount(data.total || 0);
            } catch (err) {
                console.error('Failed to fetch:', err);
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchData(paginationModel, sortModel, filterModel);

    }, [paginationModel, sortModel, applyFilterTrigger]);


    const handsendEmail = async (type) => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/send-party-invitation/?type=${encodeURIComponent(type)}`,
                { credentials: "include" }
            );

            // optional: handle response
            const data = await response.json();
            console.log("Response:", data);

        } catch (error) {
            console.error("Error sending email:", error);
        } finally {
            // optional: cleanup or loading state
        }
    };


    const handleExport = async () => {
        try {
            setIsDownloading(true);

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/member-card-csv-data`, { credentials: "include" });

            if (!response.ok) {
                throw new Error('Failed to fetch CSV file');
            }

            const contentDisposition = response.headers.get("Content-Disposition");

            let fileName = "download.csv"; // fallback
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match) {
                    fileName = match[1];
                }
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName); // Set desired file name
            document.body.appendChild(link);
            link.click();

            // Cleanup
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

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>



                <Button

                    variant="outlined"
                    startIcon={<BsFiletypeCsv size={20} />}
                    onClick={handleExport}
                    sx={{ fontSize: 13, color: 'primary.main', textTransform: 'none', wordBreak: 'break-all' }}
                >
                    {isDownloading ? (
                        <CircularProgress size={20} color="inherit" />
                    ) : (
                        "Download (All Records) CSV"
                    )}

                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setApplyFilterTrigger((prev) => prev + 1)}
                    sx={{ fontSize: 13, textTransform: 'none' }}
                >
                    Apply Filters
                </Button>

                <IconButton title='View MemberShip Status' onClick={() => setViewStatus(true)} style={{padding: 0 , margin:0}}>
                    <FaUsersViewfinder size={30}/>
                </IconButton>

                {/* <div className='mt-2'>

                        <Button
                            variant="contained"
                            color="primary"
                            onClick={()=> handsendEmail(5)}
                            sx={{ fontSize: 13, textTransform: 'none' }}
                        >
                            Send Email to Red
                        </Button>
                       </div> */}
            </Box>




            <Box sx={{ flex: 1, minWidth: 0 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ width: '100%', height: { xs: '60vh', md: 'calc(100vh - 175px)' } }}>
                        <DataGrid
                            rows={members}
                            columns={columns({ onResendPasswordReset: handleResetPassword, loadingRowId: loadingRowId, onSendInvitationEmail: confirmSendInvitationEmail })}
                            rowCount={rowCount}
                            rowsPerPageOptions={[25, 50, 100]}
                            paginationMode="server"
                            sortingMode="server"
                            filterMode="server"
                            paginationModel={paginationModel}
                            sortModel={sortModel}
                            onPaginationModelChange={setPaginationModel}
                            onSortModelChange={setSortModel}
                            filterModel={filterModel}              // ✅ Pass full model
                            onFilterModelChange={(newModel) => {
                                setFilterModel(newModel); // use the raw model now
                            }}
                            // ✅ Accept full model
                            disableRowSelectionOnClick
                            disableSelectionOnClick
                            showToolbar
                        />
                    </Box>
                )}
            </Box>
            <Modal isOpen={viewStatus}
                onRequestClose={() => { setViewStatus(false); }}
                title={`MemberShip Status`}>



                <DashboardCards />

            </Modal>
        </Box>
    );
};


export default MemberCardDataGrid;
