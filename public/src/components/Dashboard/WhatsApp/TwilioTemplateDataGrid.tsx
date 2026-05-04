
import React, { useState, useRef, useEffect } from "react";
import { Box, Typography, Paper, Button, IconButton, Tooltip, Chip } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams, GridRowParams } from "@mui/x-data-grid";
import { SiQuicklook } from "react-icons/si";
import { IoCloseOutline } from "react-icons/io5";
import { SiTwilio } from "react-icons/si";
import { IoIosCopy } from "react-icons/io";
import { MdDeleteOutline } from 'react-icons/md';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material';
import { MdQuickreply } from "react-icons/md";
import { RiEditLine } from "react-icons/ri";
import { TbTrashX } from "react-icons/tb";
// ─── Types ───────────────────────────────────────────────────────────────────

interface TwilioTemplateItem {
    sid: string;
    friendlyName: string;
    language: string;
    dateCreated: string;
    dateUpdated: string;
    url: string;
    types: Record<string, unknown>;
}

interface GroupedByTypeKey {
    [group: string]: Record<string, TwilioTemplateItem>;
}

interface FlatRow {
    id: string;
    group: string;
    friendlyName: string;
    language: string;
    sid: string;
    dateCreated: string;
    dateUpdated: string;
    url: string;
    _raw: TwilioTemplateItem;
}

interface MessageState {
    content: TwilioTemplateItem | null;
    inputValue: Record<string, unknown>;
}

interface TwilioTemplateDataGridProps {
    groupedByTypeKey: GroupedByTypeKey;
    messageState: MessageState;
    handleMessageStateChange: (key: keyof MessageState, value: unknown) => void;
}

// ─── Preview Renderer ─────────────────────────────────────────────────────────

function TemplatePreview({ content, viewTemplate, setViewTemplate }: { content: TwilioTemplateItem | null, viewTemplate: boolean, setViewTemplate: React.Dispatch<React.SetStateAction<boolean>> }) {
    if (!content?.types) {
        return (
            <Typography color="text.secondary" sx={{ mt: 4 }}>
                Select a template to preview
            </Typography>
        );
    }

    const CloseButton = (<IconButton onClick={() => setViewTemplate(false)}>
        <IoCloseOutline />
    </IconButton>);
    const typeKey = Object.keys(content.types)[0];
    const data = content.types[typeKey] as Record<string, unknown>;

    switch (typeKey) {
        case "whatsapp/authentication": {
            const { body, actions, add_security_recommendation } = data as {
                body: string;
                actions: Array<{ type: string; copy_code_text: string }>;
                add_security_recommendation: boolean;
            };
            return (
                <Paper sx={{ p: 2 }} elevation={5}>
                    {CloseButton}
                    <Typography variant="h6">{content.friendlyName}</Typography>
                    <Typography sx={{ my: 2 }}>{body.replace("{{1}}", "123456")}</Typography>
                    {actions?.map((action, i) =>
                        action.type === "COPY_CODE" ? (
                            <Button
                                key={i}
                                variant="contained"
                                color="primary"
                                sx={{ textTransform: "none" }}
                                onClick={() => navigator.clipboard.writeText("123456")}
                            >
                                {action.copy_code_text}
                            </Button>
                        ) : null
                    )}
                    {add_security_recommendation && (
                        <Typography color="error" sx={{ mt: 2 }}>
                            Please add security recommendations.
                        </Typography>
                    )}
                </Paper>
            );
        }

        case "twilio/list-picker": {
            const { body, button, items } = data as {
                body: string;
                button: string;
                items: Array<{ id: string; item: string; description: string }>;
            };
            return (
                <Paper sx={{ p: 2 }} elevation={5}>
                    {CloseButton}
                    <Typography variant="h6">{content.friendlyName}</Typography>
                    <Typography sx={{ my: 2 }}>
                        {body.replace("{{order_number}}", "12345").replace("{{date}}", "Jan 10")}
                    </Typography>
                    <ul style={{ listStyle: "none", padding: 0 }}>
                        {items.map(({ id, item, description }) => (
                            <li
                                key={id}
                                style={{
                                    marginBottom: 10,
                                    padding: 10,
                                    background: "#f0f0f0",
                                    borderRadius: 4,
                                }}
                            >
                                <strong>{item}</strong>
                                <div style={{ fontSize: 12, color: "#555" }}>{description}</div>
                            </li>
                        ))}
                    </ul>
                    <Button variant="contained" color="primary" sx={{ textTransform: "none" }}>
                        {button}
                    </Button>
                </Paper>
            );
        }

        case "twilio/text": {
            const { body } = data as { body: string };
            return (
                <Paper sx={{ p: 2 }} elevation={5}>
                    {CloseButton}
                    <Typography variant="h6">Twilio Text</Typography>
                    <Typography sx={{ my: 2 }}>{body.replace("{{1}}", "User")}</Typography>
                </Paper>
            );
        }

        case "twilio/media": {
            const { body, media } = data as { body: string; media: string[] };
            return (
                <Paper sx={{ p: 2 }} elevation={5}>
                    {CloseButton}
                    <Typography variant="h6">{content.friendlyName}</Typography>
                    <Typography sx={{ my: 2 }}>{body}</Typography>
                    {media?.map((url, idx) => (
                        <img
                            key={idx}
                            src={url}
                            alt={`media-${idx}`}
                            style={{ maxWidth: "100%", marginBottom: 10, borderRadius: 4 }}
                        />
                    ))}
                </Paper>
            );
        }

        case "twilio/card": {
            const { subtitle, body, media, actions, orientation } = data as {
                title: string;
                subtitle?: string;
                body?: string;
                media?: string[];
                actions?: Array<{ title?: string; label?: string }>;
                orientation?: string;
            };
            return (
                <Paper sx={{ p: 2, maxWidth: 400, border: "1px solid #ccc", borderRadius: 4 }}>
                    {CloseButton}
                    <Typography variant="h5">{content.friendlyName}</Typography>
                    {subtitle && (
                        <Typography variant="subtitle1" color="text.secondary">
                            {subtitle}
                        </Typography>
                    )}
                    {media && media.length > 0 && (
                        <img
                            src={media[0]}
                            alt="card media"
                            style={{
                                width: "100%",
                                height: orientation === "VERTICAL" ? 200 : 100,
                                objectFit: "cover",
                                borderRadius: 4,
                                marginTop: 8,
                                marginBottom: 8,
                            }}
                        />
                    )}
                    {body && <Typography sx={{ my: 1 }}>{body}</Typography>}
                    {actions && actions.length > 0 && (
                        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                            {actions.map((action, i) => (
                                <Button key={i} variant="contained" color="primary" sx={{ textTransform: "none" }}>
                                    {action.title || action.label || "Action"}
                                </Button>
                            ))}
                        </Box>
                    )}
                </Paper>
            );
        }

        case "twilio/quick-reply": {
            const { body, actions } = data as {
                body: string;
                actions: Array<{ id: string; title: string }>;
            };
            return (
                <Paper sx={{ p: 2 }} elevation={5}>
                    {CloseButton}
                    <Typography variant="h6">{content.friendlyName}</Typography>
                    <Typography sx={{ my: 2 }}>{body}</Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                        {actions?.map(({ id, title }) => (
                            <Button
                                key={id}
                                variant="contained"
                                color="primary"
                                sx={{ textTransform: "none" }}
                                onClick={() => alert(`You clicked: ${title}`)}
                            >
                                {title}
                            </Button>
                        ))}
                    </Box>
                </Paper>
            );
        }

        case "twilio/call-to-action": {
            const { body, actions } = data as {
                body: string;
                actions: Array<{ type: string; url?: string; title: string }>;
            };
            return (
                <Paper sx={{ p: 2 }} elevation={5}>
                    {CloseButton}
                    <Typography variant="h6">{content.friendlyName}</Typography>
                    <Typography sx={{ my: 2 }}>{body.replace("{{first_name}}", "John")}</Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                        {actions?.map((action, i) =>
                            action.type === "URL" && action.url ? (
                                <Button
                                    key={i}
                                    variant="contained"
                                    color="primary"
                                    sx={{ textTransform: "none" }}
                                    onClick={() => window.open(action.url, "_blank", "noopener noreferrer")}
                                >
                                    {action.title}
                                </Button>
                            ) : null
                        )}
                    </Box>
                </Paper>
            );
        }

        default:
            return <Typography>Unsupported template type: {typeKey}</Typography>;
    }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TwilioTemplateDataGrid({
    groupedByTypeKey,
    messageState,
    handleMessageStateChange,
}: TwilioTemplateDataGridProps) {

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const rows: FlatRow[] = Object.entries(groupedByTypeKey).flatMap(([group, items]) =>
        Object.values(items).map((item) => ({
            id: item.sid,
            group: group.charAt(0).toUpperCase() + group.slice(1),
            friendlyName: item.friendlyName,
            language: item.language,
            sid: item.sid,
            dateCreated: new Date(item.dateCreated).toLocaleString(),
            dateUpdated: new Date(item.dateUpdated).toLocaleString(),
            url: item.url,
            _raw: item,
        }))
    );

    const [copiedId, setCopiedId] = useState<string | null>(null);

    const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleCopy = (sid: string) => {
        setCopiedId(sid);
        navigator.clipboard.writeText(sid);


        // clear previous timeout if exists
        if (copiedTimeoutRef.current) {
            clearTimeout(copiedTimeoutRef.current);
        }

        // create new timeout
        copiedTimeoutRef.current = setTimeout(() => {
            setCopiedId(null);
        }, 1500);
    };

    useEffect(() => {
        return () => {
            if (copiedTimeoutRef.current) {
                clearTimeout(copiedTimeoutRef.current);
            }
        };
    }, []);

    const [viewTemplate, setViewTemplate] = useState<boolean>(false);

    const onDelete = (row: FlatRow) => { console.log(row) }
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [triggerPos, setTriggerPos] = useState({ top: 0, right: 0 });

    const columns: GridColDef<FlatRow>[] = [
        {
            field: "type",
            headerName: "Type",
            width: 150,
            renderCell: (params: GridRenderCellParams<FlatRow, string>) => (
                <div>
                    {(() => {
                        switch (params.row.group.toLowerCase()) {
                            case "whatsapp/authentication":
                                return <Chip label="Auth" size="small" sx={{ bgcolor: "#E8F5E9", color: "#2E7D32", fontWeight: 600 }} />;
                            case "twilio/list-picker":
                                return <Chip label="List Picker" size="small" sx={{ bgcolor: "#E3F2FD", color: "#1565C0", fontWeight: 600 }} />;
                            case "twilio/text":
                                return <Chip label="Text" size="small" sx={{ bgcolor: "#F3E5F5", color: "#6A1B9A", fontWeight: 600 }} />;
                            case "twilio/media":
                                return <Chip label="Media" size="small" sx={{ bgcolor: "#FFF3E0", color: "#E65100", fontWeight: 600 }} />;
                            case "twilio/card":
                                return <Chip label="Card" size="small" sx={{ bgcolor: "#E0F7FA", color: "#00695C", fontWeight: 600 }} />;
                            case "twilio/quick-reply":
                                return <Chip label="Quick Reply" size="small" sx={{ bgcolor: "#FCE4EC", color: "#880E4F", fontWeight: 600 }} />;
                            case "twilio/call-to-action":
                                return <Chip label="Call to Action" size="small" sx={{ bgcolor: "#FFF8E1", color: "#F57F17", fontWeight: 600 }} />;
                            default:
                                return <Chip label={params.row.group} size="small" sx={{ bgcolor: "#ECEFF1", color: "#37474F", fontWeight: 600 }} />;
                        }
                    })()}
                </div>
            ),
        },
        {
            field: "friendlyName",
            headerName: "Name",
            width: 300,
        },
        {
            field: "language",
            headerName: "Language",
            width: 100,
        },
        {
            field: "dateCreated",
            headerName: "Created",
            width: 180,
        },
        {
            field: "dateUpdated",
            headerName: "Updated",
            width: 180,
        },

        {
            field: "_",
            headerName: "Actions",
            width: 180,
            sortable: false,
            renderCell: (params: GridRenderCellParams<FlatRow, string>) => (
                <div>

                    <IconButton title='View Template' onClick={(e) => handleQuickView(params.row, e)} ref={triggerRef}>
                        <SiQuicklook size={22} color="#5C6BC0" />
                    </IconButton>



                    <IconButton title='View in Twilio' onClick={() => { window.open(params.row.url, "_blank", "noopener,noreferrer") }}>
                        <SiTwilio size={22} />
                    </IconButton>



                    <Tooltip
                        title="Template Sid Copied!"
                        open={params.row.sid === copiedId}
                        disableFocusListener
                        disableHoverListener
                        disableTouchListener
                    >
                        <IconButton
                            // title="Copy SID"
                            onClick={() => handleCopy(params.row.sid)}
                        >
                            <IoIosCopy size={22} color={params.row.sid === copiedId ? "#4CAF50" : "#78909C"} />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Delete Template">
                        <IconButton size="small" color="error" onClick={() => onDelete(params.row)} sx={{
                            color: "#d32f2f",
                            "&:hover": { backgroundColor: "#ffebee" },
                        }}>
                            <TbTrashX size={22} />
                        </IconButton>
                    </Tooltip>

                </div>
            ),
        },
    ];

    const handleRowClick = (params: GridRowParams<FlatRow>) => {
        handleMessageStateChange("inputValue", {});
        handleMessageStateChange("content", params.row._raw);
    };




    const handleQuickView = (row: FlatRow, e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();

        setTriggerPos({
            top: rect.y,
            right: window.innerWidth - rect.right,
        });

        setViewTemplate(true);
        handleMessageStateChange("inputValue", {});
        handleMessageStateChange("content", row._raw);
    };

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setViewTemplate(false);
            }
        };

        window.addEventListener("keydown", handleEsc);

        return () => {
            window.removeEventListener("keydown", handleEsc);
        };
    }, []);


    return (
        <div style={{ height: "calc(100vh - 155px)", overflow: "hidden", position: "relative" }}>
            <div className="row m-0" style={{ height: "calc(100vh - 185px)" }}>
                {/* Left: DataGrid */}
                <div className="col-12" style={{ height: "100%" }}>
                    {rows.length > 0 ? (
                        <DataGrid<FlatRow>
                            rows={rows}
                            columns={columns}
                            pageSizeOptions={[25, 50, 100]}
                            initialState={{
                                pagination: { paginationModel: { pageSize: 25 } },
                            }}
                            onRowClick={handleRowClick}

                            getRowId={(row) => row.sid}
                            sx={{
                                cursor: "pointer",
                                "& .MuiDataGrid-row:hover": {
                                    backgroundColor: "action.hover",
                                },
                                "& .MuiDataGrid-row.Mui-selected": {
                                    backgroundColor: "action.selected",
                                },
                            }}
                        />
                    ) : (
                        <Typography>No data available</Typography>
                    )}
                </div>

                {/* Right: Preview Panel */}
                <div
                    style={{
                        visibility: viewTemplate ? "visible" : "hidden",
                        position: "fixed",
                        right: isMobile ? 0 : 40,   // offset slightly left of the button
                        top: isMobile
                            ? "23%"
                            : triggerPos.top - 200,

                        width: isMobile ? "100vw" : "40vw",
                        maxWidth: isMobile ? "100vw" : "40vw",
                        left: isMobile ? 0 : "auto",

                        height: 400,
                        overflowY: "scroll",
                        paddingTop: 8,

                        transform: viewTemplate ? "translateY(0)" : "translateY(40px)",
                        opacity: viewTemplate ? 1 : 0,
                        transition: "all 0.3s ease",
                        pointerEvents: viewTemplate ? "auto" : "none",
                    }}
                >

                    <TemplatePreview content={messageState.content} viewTemplate={viewTemplate} setViewTemplate={setViewTemplate} />
                </div>
            </div>
        </div>
    );
}