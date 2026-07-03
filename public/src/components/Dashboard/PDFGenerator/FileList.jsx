import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useWebSocket } from '../WebSocketContext';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';

import { IoSave } from 'react-icons/io5';
import { VscNewFile, VscNewFolder } from 'react-icons/vsc';
import { TbTrashX } from 'react-icons/tb';
import { FaFolder, FaFolderOpen, FaRegFileAlt } from 'react-icons/fa';
import { MdChevronRight, MdExpandMore } from 'react-icons/md';
import { RiSave3Fill } from "react-icons/ri";
import { useSnackbar } from '../../Providers/Snackbar';
import { useAlertDialog } from '../../Providers/AlertProvider';
import InvoiceDownload from './InvoiceDownload';

const SERVER = import.meta.env.VITE_SERVERURL;

const deletedItemTemplate = {
    deleted: true,
    title: 'Item Title',
    price: '',
    qty: '1',
    disc: '0.00',
    vat: '0.00',
    vat_p: '0',
    amount: '',
    body: '',
};

// Collect every folder path in the tree (plus the root) for the folder pickers.
const collectFolders = (nodes, acc = []) => {
    for (const n of nodes) {
        if (n.type === 'folder') {
            acc.push(n.path);
            collectFolders(n.children || [], acc);
        }
    }
    return acc;
};

// Depth-first filter that keeps files matching the search term and any folder
// on the path to a match.
const filterTree = (nodes, term) => {
    if (!term) return nodes;
    const t = term.toLowerCase();
    const walk = (list) =>
        list.reduce((out, n) => {
            if (n.type === 'folder') {
                const children = walk(n.children || []);
                if (children.length || n.name.toLowerCase().includes(t)) {
                    out.push({ ...n, children });
                }
            } else if (n.name.toLowerCase().includes(t) ||
                (n.data?.project?.project_name || '').toLowerCase().includes(t)) {
                out.push(n);
            }
            return out;
        }, []);
    return walk(nodes);
};

const FileList = ({ onSelect, formData, initialFormData, loadingFlag }) => {
    const { showSnackbar } = useSnackbar();
    const { openDialog } = useAlertDialog();
    const { onEvent, sendRequest } = useWebSocket();
    const iconSize = 20;

    const [tree, setTree] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPath, setSelectedPath] = useState('');
    const [activeFolder, setActiveFolder] = useState(''); // folder targeted by New File/Folder/Save
    const [expanded, setExpanded] = useState(() => new Set());
    const [dragOver, setDragOver] = useState(null); // folder path currently hovered while dragging
    const [temp, setTemp] = useState(null);
    const [filename, setFileName] = useState(null);

    // Save / New-folder dialogs
    const [saveDialog, setSaveDialog] = useState({ open: false, name: '', folder: '' });
    const [folderDialog, setFolderDialog] = useState({ open: false, name: '', parent: '' });

    const dragPathRef = useRef(null);

    const folderOptions = useMemo(() => ['', ...collectFolders(tree)], [tree]);
    const visibleTree = useMemo(() => filterTree(tree, searchTerm), [tree, searchTerm]);

    const fetchTree = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${SERVER}/api/invoice-tree`, { credentials: 'include' });
            if (res.status === 401) return;
            if (res.ok) {
                const data = await res.json();
                setTree(data.tree || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTree(); }, [fetchTree]);

    useEffect(() => {
        const unsubscribe = onEvent('invoice:update', () => fetchTree());
        return unsubscribe;
    }, [onEvent, fetchTree]);

    // ── Selecting a file loads it into the form ──────────────────────────────
    const handleSelectFile = useCallback((node) => {
        setFileName(node?.name || null);
        setSelectedPath(node.path);
        const parent = node.path.includes('/') ? node.path.slice(0, node.path.lastIndexOf('/')) : '';
        setActiveFolder(parent);

        const k = node.data;
        if (!k) return;

        // Pad items to the previously selected file's count so the form keeps
        // its rows (preserves the original behaviour).
        if (temp) {
            const referenceLength = temp.items?.length ?? 0;
            const newItems = [...(k.items || [])];
            while (newItems.length < referenceLength) newItems.push({ ...deletedItemTemplate });
            const updated = { ...k, items: newItems };
            setTemp(updated);
            onSelect(updated);
        } else {
            setTemp(k);
            onSelect(k);
        }
    }, [temp, deletedItemTemplate, onSelect]);

    const toggleFolder = useCallback((path) => {
        setActiveFolder(path);
        setSelectedPath(path);
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(path) ? next.delete(path) : next.add(path);
            return next;
        });
    }, []);

    // ── Save (modal with a suggested file name) ──────────────────────────────
    const openSaveDialog = useCallback(() => {
        setSaveDialog({
            open: true,
            name: formData?.project?.project_name || 'invoice',
            folder: activeFolder,
        });
    }, [formData, activeFolder]);

    const doSave = useCallback(async () => {
        const { name, folder } = saveDialog;
        if (!name.trim()) return;
        try {
            const res = await fetch(`${SERVER}/api/invoice-save`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: formData, path: folder, fileName: name.trim() }),
            });
            const body = await res.json();
            if (!res.ok || !body.status) throw new Error(body.message || 'Save failed');
            showSnackbar(body.message || 'Saved', 'success');
            setSaveDialog((s) => ({ ...s, open: false }));
            if (folder) setExpanded((prev) => new Set(prev).add(folder));
            sendRequest('invoice');
            fetchTree();
        } catch (err) {
            console.error(err);
            showSnackbar(err.message || 'Save failed');
        }
    }, [saveDialog, formData, showSnackbar, sendRequest, fetchTree]);

    // ── Create folder ────────────────────────────────────────────────────────
    const openFolderDialog = useCallback(() => {
        setFolderDialog({ open: true, name: '', parent: activeFolder });
    }, [activeFolder]);

    const doCreateFolder = useCallback(async () => {
        const { name, parent } = folderDialog;
        if (!name.trim()) return;
        try {
            const res = await fetch(`${SERVER}/api/invoice-folder`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: parent, name: name.trim() }),
            });
            const body = await res.json();
            if (!res.ok || !body.status) throw new Error(body.message || 'Could not create folder');
            showSnackbar('Folder created', 'success');
            setFolderDialog((s) => ({ ...s, open: false }));
            if (parent) setExpanded((prev) => new Set(prev).add(parent));
            fetchTree();
        } catch (err) {
            console.error(err);
            showSnackbar(err.message || 'Could not create folder');
        }
    }, [folderDialog, showSnackbar, fetchTree]);

    // ── Move (drag-and-drop) ─────────────────────────────────────────────────
    const doMove = useCallback(async (from, to) => {
        if (from == null) return;
        const fromParent = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : '';
        if (from === to || fromParent === to) return; // no-op
        try {
            const res = await fetch(`${SERVER}/api/invoice-move`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from, to }),
            });
            const body = await res.json();
            if (!res.ok || !body.status) throw new Error(body.message || 'Move failed');
            if (to) setExpanded((prev) => new Set(prev).add(to));
            sendRequest('invoice');
            fetchTree();
        } catch (err) {
            console.error(err);
            showSnackbar(err.message || 'Move failed');
        }
    }, [showSnackbar, sendRequest, fetchTree]);

    // ── Delete ───────────────────────────────────────────────────────────────
    const confirmDelete = useCallback((node) => {
        const isFolder = node.type === 'folder';
        openDialog(
            <>
                Deleting <strong>{node.name}</strong>{isFolder ? ' and everything inside it' : ''} will{' '}
                <strong>permanently remove it.</strong> Are you sure?
            </>,
            'Delete',
            { text: 'Delete', color: 'error' },
            async () => {
                try {
                    const res = await fetch(`${SERVER}/api/invoice-delete`, {
                        method: 'DELETE',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: node.path }),
                    });
                    const body = await res.json();
                    if (!res.ok || !body.status) throw new Error(body.message || 'Delete failed');
                    showSnackbar('Deleted', 'success');
                    if (selectedPath === node.path) setSelectedPath('');
                    sendRequest('invoice');
                    fetchTree();
                } catch (err) {
                    console.error(err);
                    showSnackbar(err.message || 'Delete failed');
                }
            },
            () => { }
        );
    }, [openDialog, showSnackbar, selectedPath, setSelectedPath, sendRequest, fetchTree]);

    // ── Recursive tree renderer ──────────────────────────────────────────────
    const renderNode = useCallback((node, depth) => {
        const isFolder = node.type === 'folder';
        const isOpen = searchTerm ? true : expanded.has(node.path);
        const isSelected = selectedPath === node.path;
        const isDropTarget = isFolder && dragOver === node.path;

        return (
            <li key={node.path} className="list-unstyled">
                <div
                    className="d-flex justify-content-between align-items-center rounded hover-li"
                    draggable
                    onDragStart={(e) => {
                        e.stopPropagation();
                        dragPathRef.current = node.path;
                        e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={isFolder ? (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(node.path); } : undefined}
                    onDragLeave={isFolder ? (e) => { e.stopPropagation(); setDragOver((d) => (d === node.path ? null : d)); } : undefined}
                    onDrop={isFolder ? (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOver(null);
                        doMove(dragPathRef.current, node.path);
                        dragPathRef.current = null;
                    } : undefined}
                    onClick={() => (isFolder ? toggleFolder(node.path) : handleSelectFile(node))}
                    title={node.name}
                    style={{
                        cursor: 'pointer',
                        padding: '3px 6px',
                        marginBottom: 2,
                        paddingLeft: 6 + depth * 16,
                        backgroundColor: isDropTarget ? '#cfe2ff' : isSelected ? '#0d6efd' : 'transparent',
                        color: isSelected && !isDropTarget ? '#fff' : '#212529',
                        transition: 'background-color 0.15s',
                    }}
                >
                    <span className="d-flex align-items-center" style={{ minWidth: 0, gap: 4 }}>
                        {isFolder ? (
                            <>
                                {isOpen ? <MdExpandMore size={16} /> : <MdChevronRight size={16} />}
                                {isOpen ? <FaFolderOpen size={15} color={isSelected ? '#fff' : '#e0a800'} />
                                    : <FaFolder size={15} color={isSelected ? '#fff' : '#ffc107'} />}
                            </>
                        ) : (
                            <span style={{ paddingLeft: 16, display: 'inline-flex', alignItems: 'center' }}>
                                <FaRegFileAlt size={13} color={isSelected ? '#fff' : '#6c757d'} />
                            </span>
                        )}
                        <span style={{
                            fontSize: 12,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 300,
                        }}>
                            {node.name}
                        </span>
                    </span>
                    <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); confirmDelete(node); }}
                        sx={{ color: isSelected ? '#fff' : '#d32f2f', p: '2px', '&:hover': { backgroundColor: '#ffebee' } }}
                    >
                        <TbTrashX size={16} />
                    </IconButton>
                </div>

                {isFolder && isOpen && node.children?.length > 0 && (
                    <ul className="p-0 m-0">
                        {node.children.map((child) => renderNode(child, depth + 1))}
                    </ul>
                )}
            </li>
        );
    }, [searchTerm, expanded, selectedPath, dragOver, toggleFolder, handleSelectFile, confirmDelete, doMove]);

    return (
        <div>
            {/* Menu bar */}

            <div className="rounded border p-2">
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        px: 1,
                        mb: 1,
                        bgcolor: '#f5f5f7',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton title="Save" onClick={openSaveDialog}>
                            <RiSave3Fill color="#1976D2" size={iconSize} />
                        </IconButton>
                        <IconButton title="New Folder" onClick={openFolderDialog}>
                            <VscNewFolder color="orange" size={iconSize - 2} />
                        </IconButton>
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1 }} />
                        <Button
                            startIcon={<VscNewFile size={iconSize} />}
                            onClick={() => handleSelectFile({ path: '', data: initialFormData })}
                            sx={{ textTransform: 'none', padding: 0, color: '#717171' }}
                        >
                            <span style={{ fontSize: 12, wordBreak: 'keep-all' }}>
                                New File
                            </span>
                        </Button>
                    </Box>

                    <InvoiceDownload iconSize={iconSize} formData={formData} loadingFlag={loadingFlag} filename={filename} />
                </Box>
                <input
                    type="text"
                    className="form-control mb-1 shadow-sm w-100"
                    placeholder="Search files..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ transition: 'all 0.2s ease-in-out', maxWidth: '250px' }}
                />

                {/* Tree (root is a drop target that moves items to the top level) */}
                <div
                    style={{
                        overflow: 'auto',
                        height: 'calc(100vh - 235px)',
                        outline: dragOver === '' ? '2px dashed #0d6efd' : 'none',
                        borderRadius: 4,
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(''); }}
                    onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver((d) => (d === '' ? null : d)); }}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(null);
                        doMove(dragPathRef.current, '');
                        dragPathRef.current = null;
                    }}
                >
                    {loading ? (
                        <div className="d-flex align-items-center">
                            <CircularProgress size={20} />
                            <span className="ms-2">Loading files...</span>
                        </div>
                    ) : visibleTree.length > 0 ? (
                        <ul className="p-0 m-0">
                            {visibleTree.map((node) => renderNode(node, 0))}
                        </ul>
                    ) : (
                        <div className="text-muted fst-italic">No files to display</div>
                    )}
                </div>
            </div>

            {/* Save dialog */}
            <Dialog open={saveDialog.open} onClose={() => setSaveDialog((s) => ({ ...s, open: false }))} fullWidth maxWidth="xs" draggable={true}>
                <DialogTitle>Save file</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="File name"
                        fullWidth
                        value={saveDialog.name}
                        onChange={(e) => setSaveDialog((s) => ({ ...s, name: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') doSave(); }}
                        helperText="Suggested from the project name"
                    />
                    <TextField
                        select
                        margin="dense"
                        label="Folder"
                        fullWidth
                        value={saveDialog.folder}
                        onChange={(e) => setSaveDialog((s) => ({ ...s, folder: e.target.value }))}
                    >
                        {folderOptions.map((f) => (
                            <MenuItem key={f || 'root'} value={f}>{f === '' ? '/ (root)' : f}</MenuItem>
                        ))}
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSaveDialog((s) => ({ ...s, open: false }))} sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button variant="contained" onClick={doSave} disabled={!saveDialog.name.trim()} sx={{ textTransform: 'none' }}>Save</Button>
                </DialogActions>
            </Dialog>

            {/* New folder dialog */}
            <Dialog open={folderDialog.open} onClose={() => setFolderDialog((s) => ({ ...s, open: false }))} fullWidth maxWidth="xs">
                <DialogTitle>New folder</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Folder name"
                        fullWidth
                        value={folderDialog.name}
                        onChange={(e) => setFolderDialog((s) => ({ ...s, name: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') doCreateFolder(); }}
                    />
                    <TextField
                        select
                        margin="dense"
                        label="Parent folder"
                        fullWidth
                        value={folderDialog.parent}
                        onChange={(e) => setFolderDialog((s) => ({ ...s, parent: e.target.value }))}
                    >
                        {folderOptions.map((f) => (
                            <MenuItem key={f || 'root'} value={f}>{f === '' ? '/ (root)' : f}</MenuItem>
                        ))}
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFolderDialog((s) => ({ ...s, open: false }))} sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button variant="contained" onClick={doCreateFolder} disabled={!folderDialog.name.trim()} sx={{ textTransform: 'none' }}>Create</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default FileList;
