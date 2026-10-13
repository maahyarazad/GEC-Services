// Do-Not-Reply Mail Box section (009-do-not-reply-mailbox).
//
// A live view of a system mailbox, fetched server-side via ImapFlow over IMAPS.
// Account selector (do-not-reply default ⇄ support) + folder tabs (Inbox/Sent)
// + paged, filterable message list; click a message to read it. The browser
// sends only an account/folder key + uid — never a credential.
//
// Layout: the whole section is bounded to the viewport height (minus whatever
// sits above it) and never grows the page — only the message list body and the
// opened-message body scroll internally. HTML bodies render in a sandboxed,
// scriptless iframe (no new sanitiser dependency); plain text is the default.

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import { MdArrowBack, MdMarkEmailRead, MdInbox, MdSend, MdClose } from "react-icons/md";
import { IoSearchOutline } from "react-icons/io5";

const SERVER = import.meta.env.VITE_SERVERURL;
const PAGE_SIZE = 50;
const BOTTOM_GUTTER = 16; // breathing room below the section
const MIN_HEIGHT = 320; // never collapse smaller than this

function fmtDate(ts) {
  if (!ts) return "—";
  try {
    return new Date(Number(ts)).toLocaleString([], {
      year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch { return String(ts); }
}

function fmtSize(bytes) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function getJson(url) {
  const res = await fetch(url, { credentials: "include" });
  if (res.status === 401 || res.status === 403) throw new Error("Not authorised. Please log in again.");
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.status === false) {
    throw new Error((data && data.message) || `Request failed (${res.status})`);
  }
  return data;
}

export default function MailBox() {
  const [accounts, setAccounts] = useState([]);
  const [account, setAccount] = useState("do-not-reply");
  const [folder, setFolder] = useState("Inbox");

  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const [openMsg, setOpenMsg] = useState(null); // detail object
  const [msgLoading, setMsgLoading] = useState(false);
  const [bodyView, setBodyView] = useState("text"); // 'text' | 'html'

  const [error, setError] = useState("");

  // ── Bound the section to the viewport (minus whatever sits above it) ───────
  const rootRef = useRef(null);
  const [sectionHeight, setSectionHeight] = useState("80vh");
  useEffect(() => {
    const recalc = () => {
      const el = rootRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const h = Math.max(MIN_HEIGHT, window.innerHeight - top - BOTTOM_GUTTER);
      setSectionHeight(`${Math.round(h)}px`);
    };
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, []);

  // ── Load accounts once ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await getJson(`${SERVER}/api/mailbox/accounts`);
        setAccounts(data.accounts || []);
        const def = (data.accounts || []).find((a) => a.default) || (data.accounts || [])[0];
        if (def) setAccount(def.key);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  // ── Load the message list ───────────────────────────────────────────────
  const loadList = useCallback(async () => {
    setListLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        account, folder, page: String(page + 1), pageSize: String(PAGE_SIZE),
      });
      const data = await getJson(`${SERVER}/api/mailbox/messages?${params.toString()}`);
      setMessages(data.messages || []);
      setTotal(data.total || 0);
    } catch (e) {
      setMessages([]);
      setTotal(0);
      setError(e.message);
    } finally {
      setListLoading(false);
    }
  }, [account, folder, page]);

  useEffect(() => {
    if (!openMsg) loadList();
  }, [loadList, openMsg]);

  const changeAccount = (key) => {
    setOpenMsg(null);
    setFolder("Inbox");
    setPage(0);
    setFilter("");
    setAccount(key);
  };

  const changeFolder = (key) => {
    setOpenMsg(null);
    setPage(0);
    setFilter("");
    setFolder(key);
  };

  const openMessage = async (uid) => {
    setMsgLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ account, folder, uid: String(uid) });
      const data = await getJson(`${SERVER}/api/mailbox/message?${params.toString()}`);
      setOpenMsg(data.message);
      setBodyView(data.message && data.message.text ? "text" : "html");
    } catch (e) {
      setError(e.message);
    } finally {
      setMsgLoading(false);
    }
  };

  const counterpartLabel = folder === "Sent" ? "To" : "From";
  const counterpart = (row) => (folder === "Sent" ? row.to : row.from) || "—";

  // Client-side filter over the currently loaded page (sender/recipient/subject).
  const visibleMessages = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) =>
      [(m.from || ""), (m.to || ""), (m.subject || "")]
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [messages, filter]);

  return (
    <Box
      ref={rootRef}
      sx={{
        p: 2,
        maxWidth: 1100,
        mx: "auto",
        height: sectionHeight,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Fixed header row */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap", flexShrink: 0 }}>
        <MdMarkEmailRead size={22} />
        <Typography variant="h6" sx={{ fontWeight: 500, flexGrow: 1 }}>
          Do-Not-Reply Mail Box
        </Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="mailbox-account-label">Account</InputLabel>
          <Select
            labelId="mailbox-account-label"
            label="Account"
            value={account}
            onChange={(e) => changeAccount(e.target.value)}
          >
            {accounts.map((a) => (
              <MenuItem key={a.key} value={a.key} disabled={!a.available}>
                {a.label}{a.address ? ` — ${a.address}` : ""}{a.available ? "" : " (unavailable)"}
              </MenuItem>
            ))}
            {accounts.length === 0 && <MenuItem value="do-not-reply">Do-Not-Reply</MenuItem>}
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1, flexShrink: 0 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* LIST MODE */}
      {!openMsg && (
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {/* Fixed: tabs + filter */}
          <Box sx={{ flexShrink: 0 }}>
            <Tabs value={folder} onChange={(e, v) => changeFolder(v)} sx={{ mb: 1, minHeight: 44 }}>
              <Tab icon={<MdInbox />} iconPosition="start" label="Inbox" value="Inbox" sx={{ textTransform: "none", minHeight: 44 }} />
              <Tab icon={<MdSend />} iconPosition="start" label="Sent" value="Sent" sx={{ textTransform: "none", minHeight: 44 }} />
            </Tabs>
            <TextField
              fullWidth
              size="small"
              placeholder="Filter this page by sender, recipient or subject…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              sx={{ mb: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><IoSearchOutline /></InputAdornment>
                ),
                endAdornment: filter ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setFilter("")} aria-label="Clear filter"><MdClose /></IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </Box>

          {/* Scrollable: the list fills the rest and scrolls internally */}
          {listLoading ? (
            <Box sx={{ flex: 1, minHeight: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <CircularProgress />
            </Box>
          ) : messages.length === 0 ? (
            <Paper variant="outlined" sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "text.secondary", p: 4 }}>
              No messages in this folder.
            </Paper>
          ) : visibleMessages.length === 0 ? (
            <Paper variant="outlined" sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "text.secondary", p: 4 }}>
              No messages on this page match “{filter}”.
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <TableContainer sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: "background.paper" }}>Date</TableCell>
                      <TableCell sx={{ bgcolor: "background.paper" }}>{counterpartLabel}</TableCell>
                      <TableCell sx={{ bgcolor: "background.paper" }}>Subject</TableCell>
                      <TableCell align="right" sx={{ bgcolor: "background.paper" }}>Size</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleMessages.map((row) => (
                      <TableRow
                        key={row.uid}
                        hover
                        sx={{ cursor: "pointer", fontWeight: row.seen ? 400 : 600 }}
                        onClick={() => openMessage(row.uid)}
                      >
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(row.date)}</TableCell>
                        <TableCell>{counterpart(row)}</TableCell>
                        <TableCell>
                          {!row.seen && <Chip label="new" size="small" color="primary" sx={{ mr: 1, height: 18 }} />}
                          {row.subject || "(no subject)"}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{fmtSize(row.size)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(e, p) => setPage(p)}
                rowsPerPage={PAGE_SIZE}
                rowsPerPageOptions={[PAGE_SIZE]}
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}–${to} of ${count}${filter ? ` · filtered to ${visibleMessages.length} on this page` : ""}`
                }
                sx={{ flexShrink: 0, borderTop: 1, borderColor: "divider" }}
              />
            </Paper>
          )}
        </Box>
      )}

      {/* MESSAGE VIEWER */}
      {openMsg && (
        <Paper variant="outlined" sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", p: 2 }}>
          <Box sx={{ flexShrink: 0 }}>
            <Button size="small" startIcon={<MdArrowBack />} onClick={() => setOpenMsg(null)} sx={{ textTransform: "none", mb: 1 }}>
              Back to list
            </Button>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{openMsg.subject || "(no subject)"}</Typography>
            <Typography variant="body2" color="text.secondary">From: {openMsg.from || "—"}</Typography>
            <Typography variant="body2" color="text.secondary">To: {openMsg.to || "—"}</Typography>
            {openMsg.cc ? <Typography variant="body2" color="text.secondary">Cc: {openMsg.cc}</Typography> : null}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Date: {fmtDate(openMsg.date)}</Typography>

            {openMsg.attachments && openMsg.attachments.length > 0 && (
              <Box sx={{ mb: 1 }}>
                {openMsg.attachments.map((a, i) => (
                  <Chip key={i} label={`${a.filename} (${fmtSize(a.size)})`} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                ))}
              </Box>
            )}

            {openMsg.text && openMsg.html && (
              <ToggleButtonGroup
                size="small"
                exclusive
                value={bodyView}
                onChange={(e, v) => v && setBodyView(v)}
                sx={{ mb: 1 }}
              >
                <ToggleButton value="text" sx={{ textTransform: "none" }}>Text</ToggleButton>
                <ToggleButton value="html" sx={{ textTransform: "none" }}>HTML</ToggleButton>
              </ToggleButtonGroup>
            )}
          </Box>

          {/* Scrollable body */}
          <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1, bgcolor: "#fff" }}>
            {bodyView === "html" && openMsg.html ? (
              <iframe
                title="Message body"
                sandbox=""
                srcDoc={openMsg.html}
                style={{ width: "100%", height: "100%", border: "none", background: "#fff" }}
              />
            ) : (
              <Box component="pre" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", m: 0, p: 1.5 }}>
                {openMsg.text || (openMsg.html ? "(HTML-only message — switch to HTML view)" : "(empty message)")}
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {msgLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2, flexShrink: 0 }}><CircularProgress size={24} /></Box>
      )}
    </Box>
  );
}
