// Do-not-reply email log section (feature 008-email-log-dashboard).
//
// Top-level: a search bar + a list of email categories with counts (US1).
// Click a category → a paged table of that category's entries showing the sent
// date-time and recipient (US2). Typing in the search bar filters by recipient
// across every category, server-side (US3).
//
// All data comes from the admin-guarded endpoints in routes/email_log.js; see
// specs/008-email-log-dashboard/contracts/email-log-api.md.

import { useEffect, useState, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Chip from "@mui/material/Chip";
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
import Alert from "@mui/material/Alert";
import { IoSearchOutline } from "react-icons/io5";
import { MdArrowBack, MdClose, MdEmail } from "react-icons/md";

const SERVER = import.meta.env.VITE_SERVERURL;
const PAGE_SIZE = 50;

function formatTs(ts) {
  if (!ts) return "—";
  try {
    return new Date(Number(ts)).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(ts);
  }
}

async function getJson(url) {
  const res = await fetch(url, { credentials: "include" });
  if (res.status === 401 || res.status === 403) {
    throw new Error("Not authorised. Please log in again.");
  }
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const data = await res.json();
  if (!data || data.status === false) {
    throw new Error((data && data.message) || "Request failed");
  }
  return data;
}

export default function EmailLogs() {
  // Category summary (US1)
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);

  // Drill-down / search (US2, US3)
  const [selectedCategory, setSelectedCategory] = useState(null); // { key, label } | null
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // debounced
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(0); // 0-based for TablePagination
  const [total, setTotal] = useState(0);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const [error, setError] = useState("");

  // A search spans the whole log; otherwise we're either on the category list
  // or drilled into one category.
  const inEntriesView = Boolean(searchTerm) || Boolean(selectedCategory);

  // ── Load category summary ────────────────────────────────────────────────
  const loadCategories = useCallback(async () => {
    setCatLoading(true);
    setError("");
    try {
      const data = await getJson(`${SERVER}/api/email-log/categories`);
      setCategories(data.categories || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setCatLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ── Debounce the search input ──────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  // ── Load entries when drilled in or searching ──────────────────────────────
  useEffect(() => {
    if (!inEntriesView) {
      setEntries([]);
      setTotal(0);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setEntriesLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        // A search spans all categories; drill-down scopes to one.
        if (!searchTerm && selectedCategory) {
          params.set("category", selectedCategory.key);
        }
        if (searchTerm) params.set("search", searchTerm);
        params.set("page", String(page + 1)); // API is 1-based
        params.set("pageSize", String(PAGE_SIZE));
        const data = await getJson(
          `${SERVER}/api/email-log/entries?${params.toString()}`
        );
        if (cancelled) return;
        setEntries(data.entries || []);
        setTotal(data.total || 0);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setEntriesLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [inEntriesView, selectedCategory, searchTerm, page]);

  const openCategory = (cat) => {
    setSelectedCategory({ key: cat.key, label: cat.label });
    setPage(0);
  };

  const backToCategories = () => {
    setSelectedCategory(null);
    setPage(0);
    loadCategories();
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchTerm("");
    setPage(0);
  };

  const heading = searchTerm
    ? `Search results for “${searchTerm}”`
    : selectedCategory
    ? selectedCategory.label
    : "Email Categories";

  return (
    <Box sx={{ p: 2, maxWidth: 1100, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1}}>
        <MdEmail size={22} />
         <pre style={{padding: 0, margin: 0}}>do-not-replay</pre> 
        <Typography variant="h6" sx={{ fontWeight: 500, flexDirection: 'row' }}>
             Email Log
        </Typography>
      </Box>

      {/* Search bar on top (US3) */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search by recipient email…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <IoSearchOutline />
            </InputAdornment>
          ),
          endAdornment: searchInput ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={clearSearch} aria-label="Clear search">
                <MdClose />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        {selectedCategory && !searchTerm && (
          <Button
            size="small"
            startIcon={<MdArrowBack />}
            onClick={backToCategories}
            sx={{ textTransform: "none" }}
          >
            All categories
          </Button>
        )}
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          {heading}
        </Typography>
      </Box>

      {/* ── Category list (US1) ── */}
      {!inEntriesView &&
        (catLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : categories.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
            No emails have been logged yet. Entries appear here as do-not-reply
            emails are sent.
          </Paper>
        ) : (
          <Paper variant="outlined">
            <List disablePadding>
              {categories.map((cat) => (
                <ListItemButton
                  key={cat.key}
                  divider
                  onClick={() => openCategory(cat)}
                >
                  <ListItemText
                    primary={cat.label}
                    secondary={`Last sent: ${formatTs(cat.lastSent)}`}
                  />
                  <Chip label={cat.count} size="small" color="primary" variant="outlined" />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        ))}

      {/* ── Entries table (US2 / US3) ── */}
      {inEntriesView &&
        (entriesLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : entries.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
            No matching emails.
          </Paper>
        ) : (
          <Paper
            variant="outlined"
            sx={{ maxHeight: "70vh", display: "flex", flexDirection: "column" }}
          >
            {/* Only the rows scroll; the sticky header and the pager below stay
                in view so the Paper never grows past 70vh. */}
            <TableContainer sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Sent</TableCell>
                    <TableCell>Recipient</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{formatTs(row.createdAt)}</TableCell>
                      <TableCell>{row.recipient}</TableCell>
                      <TableCell>{row.label}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.status}
                          size="small"
                          color={row.status === "failed" ? "error" : "success"}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={PAGE_SIZE}
              rowsPerPageOptions={[PAGE_SIZE]}
              sx={{ flexShrink: 0, borderTop: 1, borderColor: "divider" }}
            />
          </Paper>
        ))}
    </Box>
  );
}
