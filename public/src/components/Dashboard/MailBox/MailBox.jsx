// Do-Not-Reply Mail Box section (009-do-not-reply-mailbox).
//
// A live view of a system mailbox, fetched server-side with curl over IMAPS.
// Account selector (do-not-reply default ⇄ support) + folder tabs (Inbox/Sent)
// + paged message list; click a message to read it. The browser sends only an
// account/folder key + uid — never a credential.
//
// HTML bodies are rendered in a sandboxed, scriptless iframe (no new sanitiser
// dependency); plain text is the default view. See specs/009-do-not-reply-mailbox.

import { useEffect, useState, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
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
import { MdArrowBack, MdMarkEmailRead, MdInbox, MdSend } from "react-icons/md";

const SERVER = import.meta.env.VITE_SERVERURL;
const PAGE_SIZE = 50;

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

  const [openMsg, setOpenMsg] = useState(null); // detail object
  const [msgLoading, setMsgLoading] = useState(false);
  const [bodyView, setBodyView] = useState("text"); // 'text' | 'html'

  const [error, setError] = useState("");

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
    setAccount(key);
  };

  const changeFolder = (key) => {
    setOpenMsg(null);
    setPage(0);
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

  return (
    <Box sx={{ p: 2, maxWidth: 1100, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
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
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {!openMsg && (
        <>
          <Tabs value={folder} onChange={(e, v) => changeFolder(v)} sx={{ mb: 1 }}>
            <Tab icon={<MdInbox />} iconPosition="start" label="Inbox" value="Inbox" sx={{ textTransform: "none", minHeight: 44 }} />
            <Tab icon={<MdSend />} iconPosition="start" label="Sent" value="Sent" sx={{ textTransform: "none", minHeight: 44 }} />
          </Tabs>

          {listLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
          ) : messages.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
              No messages in this folder.
            </Paper>
          ) : (
            <Paper variant="outlined">
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>{counterpartLabel}</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell align="right">Size</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {messages.map((row) => (
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
              />
            </Paper>
          )}
        </>
      )}

      {/* Message viewer */}
      {openMsg && (
        <Paper variant="outlined" sx={{ p: 2 }}>
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

          {bodyView === "html" && openMsg.html ? (
            <iframe
              title="Message body"
              sandbox=""
              srcDoc={openMsg.html}
              style={{ width: "100%", minHeight: 400, border: "1px solid #e0e0e0", borderRadius: 4, background: "#fff" }}
            />
          ) : (
            <Box component="pre" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", m: 0 }}>
              {openMsg.text || (openMsg.html ? "(HTML-only message — switch to HTML view)" : "(empty message)")}
            </Box>
          )}
        </Paper>
      )}

      {msgLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={24} /></Box>
      )}
    </Box>
  );
}
