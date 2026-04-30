import { DataGrid } from '@mui/x-data-grid';
import { contactBookColumn, corruptedContactBookColumn } from './WhatsAppComponentConfig'
const ContactBookDataGrid = ({
    contactList,
    viewMode,
    paginationModel,
    setPaginationModel,
    onModifyContact,
    onDeleteContact,
    onSwitchBlacklist,
}) => {
    const commonProps = {
        rows: contactList,
        paginationModel: paginationModel,
        onPaginationModelChange: setPaginationModel,
        pageSizeOptions: [25, 50, 100],
        pagination: true,
        disableRowSelectionOnClick: true,
        disableSelectionOnClick: true,
        showToolbar: true,
        
    };

    const columnProps = { onModifyContact, onDeleteContact, onSwitchBlacklist, viewEventSpeedDial: false };
    const contactBookColumnProps = { onModifyContact, onDeleteContact, onSwitchBlacklist, viewEventSpeedDial: true };

   switch (viewMode) {
        case "blacklist":
            //@ts-ignore
            return <DataGrid {...commonProps} columns={contactBookColumn(columnProps)} />;
        case "corrupted":
            //@ts-ignore
            return <DataGrid {...commonProps} columns={corruptedContactBookColumn(columnProps)} />;
        case "guest_list":
            //@ts-ignore
            return <DataGrid {...commonProps} columns={contactBookColumn(columnProps)} />;
        case "default":
            //@ts-ignore
            return <DataGrid {...commonProps} columns={contactBookColumn(contactBookColumnProps)} />;
            default:
                //@ts-ignore
                return null;
    }
};

export default ContactBookDataGrid;