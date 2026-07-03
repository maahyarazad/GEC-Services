
const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

const STORAGE_ROOT = path.join(__dirname, "..", "invoice_json_storage");

const slugify = (text) =>
    String(text || "").toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

// Resolve a client-supplied relative path safely inside STORAGE_ROOT, rejecting
// any path-traversal attempts. Accepts POSIX-style paths from the client.
const safePath = (rel = "") => {
    const clean = path
        .normalize(String(rel || "").replace(/\\/g, "/"))
        .replace(/^(\.\.(\/|\\|$))+/, "")
        .replace(/^\/+/, "");
    const full = path.join(STORAGE_ROOT, clean);
    if (full !== STORAGE_ROOT && !full.startsWith(STORAGE_ROOT + path.sep)) {
        throw new Error("Invalid path");
    }
    return full;
};

const ensureRoot = () => {
    if (!fs.existsSync(STORAGE_ROOT)) fs.mkdirSync(STORAGE_ROOT, { recursive: true });
};

// Recursively build a folder/file tree from a directory.
const buildTree = (dirRel = "") => {
    const abs = safePath(dirRel);
    if (!fs.existsSync(abs)) return [];

    const entries = fs.readdirSync(abs, { withFileTypes: true });
    const nodes = [];

    for (const entry of entries) {
        const rel = dirRel ? `${dirRel}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
            nodes.push({
                type: "folder",
                name: entry.name,
                path: rel,
                children: buildTree(rel),
            });
        } else if (entry.name.endsWith(".json")) {
            let data = null;
            try {
                data = JSON.parse(fs.readFileSync(safePath(rel), "utf8"));
            } catch (err) {
                console.warn(`Failed to parse ${rel}:`, err.message);
            }
            nodes.push({
                type: "file",
                name: entry.name.replace(/\.json$/, ""),
                path: rel,
                data,
            });
        }
    }

    // Folders first, then files, each alphabetical.
    nodes.sort((a, b) =>
        a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1
    );
    return nodes;
};

// Pick a non-colliding file/folder name inside `parentAbs` by appending " (n)".
const uniqueName = (parentAbs, baseName, ext = "") => {
    let candidate = `${baseName}${ext}`;
    let i = 1;
    while (fs.existsSync(path.join(parentAbs, candidate))) {
        candidate = `${baseName} (${i})${ext}`;
        i += 1;
    }
    return candidate;
};

// ── Save an invoice JSON (optionally into a folder, with a chosen file name) ──
router.post("/api/invoice-save", async (req, res) => {
    try {
        ensureRoot();

        if (!req.body || !req.body.data) {
            return res.status(400).json({ status: false, message: "Missing invoice data" });
        }

        const { data, path: folderRel = "", fileName } = req.body;

        // Default the file name to the project name (backward compatible).
        const baseName = slugify(fileName || data?.project?.project_name || "invoice") || "invoice";

        const folderAbs = safePath(folderRel);
        if (!fs.existsSync(folderAbs)) fs.mkdirSync(folderAbs, { recursive: true });

        const jsonData = typeof data === "string" ? data : JSON.stringify(data, null, 2);
        const targetAbs = path.join(folderAbs, `${baseName}.json`);
        fs.writeFileSync(targetAbs, jsonData, "utf8");

        const savedRel = path.relative(STORAGE_ROOT, targetAbs).split(path.sep).join("/");
        return res.json({ status: true, message: "Successfully Saved", path: savedRel });
    } catch (error) {
        console.error(`${Date.now()} - Error in /api/invoice-save:`, error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// ── Hierarchical tree of folders + files ─────────────────────────────────────
router.get("/api/invoice-tree", (req, res) => {
    try {
        ensureRoot();
        return res.json({ status: true, tree: buildTree("") });
    } catch (error) {
        console.error(`${Date.now()} - Error in /api/invoice-tree:`, error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// ── Create a folder ──────────────────────────────────────────────────────────
router.post("/api/invoice-folder", (req, res) => {
    try {
        ensureRoot();
        const { path: parentRel = "", name } = req.body || {};
        if (!name || !String(name).trim()) {
            return res.status(400).json({ status: false, message: "Folder name is required" });
        }

        const parentAbs = safePath(parentRel);
        if (!fs.existsSync(parentAbs)) fs.mkdirSync(parentAbs, { recursive: true });

        const folderName = uniqueName(parentAbs, String(name).trim());
        const folderAbs = path.join(parentAbs, folderName);
        fs.mkdirSync(folderAbs, { recursive: true });

        const rel = path.relative(STORAGE_ROOT, folderAbs).split(path.sep).join("/");
        return res.json({ status: true, message: "Folder created", path: rel });
    } catch (error) {
        console.error(`${Date.now()} - Error in /api/invoice-folder:`, error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// ── Move a file or folder into another folder (drag-and-drop) ─────────────────
router.post("/api/invoice-move", (req, res) => {
    try {
        const { from, to = "" } = req.body || {};
        if (!from) {
            return res.status(400).json({ status: false, message: "'from' path is required" });
        }

        const fromAbs = safePath(from);
        const destDirAbs = safePath(to);

        if (!fs.existsSync(fromAbs)) {
            return res.status(404).json({ status: false, message: "Source not found" });
        }
        if (!fs.existsSync(destDirAbs) || !fs.statSync(destDirAbs).isDirectory()) {
            return res.status(400).json({ status: false, message: "Destination folder not found" });
        }

        // Prevent moving a folder into itself or a descendant.
        if (fromAbs === destDirAbs || (destDirAbs + path.sep).startsWith(fromAbs + path.sep)) {
            return res.status(400).json({ status: false, message: "Cannot move a folder into itself" });
        }

        const isDir = fs.statSync(fromAbs).isDirectory();
        const ext = isDir ? "" : path.extname(fromAbs);
        const base = isDir ? path.basename(fromAbs) : path.basename(fromAbs, ext);
        const finalName = uniqueName(destDirAbs, base, ext);
        const targetAbs = path.join(destDirAbs, finalName);

        fs.renameSync(fromAbs, targetAbs);

        const rel = path.relative(STORAGE_ROOT, targetAbs).split(path.sep).join("/");
        return res.json({ status: true, message: "Moved", path: rel });
    } catch (error) {
        console.error(`${Date.now()} - Error in /api/invoice-move:`, error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// ── Delete a file or folder by path ──────────────────────────────────────────
router.delete("/api/invoice-delete", (req, res) => {
    try {
        const rel = req.body?.path ?? req.query?.path;
        if (!rel) {
            return res.status(400).json({ status: false, message: "path is required" });
        }

        const abs = safePath(rel);
        if (abs === STORAGE_ROOT) {
            return res.status(400).json({ status: false, message: "Cannot delete the root" });
        }
        if (!fs.existsSync(abs)) {
            return res.status(404).json({ status: false, message: "Not found" });
        }

        fs.rmSync(abs, { recursive: true, force: true });
        return res.json({ status: true, message: "Deleted" });
    } catch (error) {
        console.error(`${Date.now()} - Error in /api/invoice-delete:`, error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// ── Legacy endpoints (kept for backward compatibility) ───────────────────────
router.get("/api/invoice-list", (req, res) => {
    try {
        ensureRoot();
        // Flatten the tree to the previous shape: an array of parsed invoice data.
        const flatten = (nodes) =>
            nodes.flatMap((n) =>
                n.type === "folder" ? flatten(n.children) : n.data ? [n.data] : []
            );
        return res.json({ status: true, data: flatten(buildTree("")) });
    } catch (error) {
        console.error(`${Date.now()} - Error in /api/invoice-list:`, error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

router.get("/api/invoice-list-delete", (req, res) => {
    try {
        const { projectName } = req.query;
        if (!projectName) {
            return res.status(400).json({
                status: false,
                message: "Missing required query parameter: projectName",
            });
        }

        const filePath = path.join(STORAGE_ROOT, `${slugify(projectName)}.json`);
        if (fs.existsSync(filePath)) {
            fs.rmSync(filePath);
            return res.status(200).json({
                status: true,
                message: `Invoice list for project '${projectName}' deleted successfully.`,
                data: [],
            });
        }

        return res.status(404).json({
            status: false,
            message: `Invoice file for project '${projectName}' not found.`,
        });
    } catch (error) {
        console.error(`${Date.now()} - Error in /api/invoice-list-delete:`, error);
        res.status(500).json({
            status: false,
            message: "An unexpected server error occurred while deleting the invoice list.",
            error: error.message,
        });
    }
});

module.exports = router;
