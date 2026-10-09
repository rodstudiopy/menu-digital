const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "../public/uploads");
const DATA_FILE = path.join(__dirname, "../data/menu-images.json");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(path.dirname(DATA_FILE))) fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

function readList() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}
function writeList(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, "menu-" + Date.now() + "-" + Math.round(Math.random() * 1e6) + ext);
  },
});
const upload = multer({ storage });

router.post("/upload", upload.array("images", 20), (req, res) => {
  const list = readList();
  const nuevos = req.files.map((f) => ({
    filename: f.filename,
    url: "/uploads/" + f.filename,
  }));
  const actualizada = [...list, ...nuevos];
  writeList(actualizada);
  res.json({ ok: true, images: actualizada });
});

router.get("/images", (req, res) => {
  res.json(readList());
});

router.delete("/images/:filename", (req, res) => {
  const { filename } = req.params;
  let list = readList();
  const existe = list.find((img) => img.filename === filename);
  if (!existe) return res.status(404).json({ ok: false, error: "No encontrada" });

  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  list = list.filter((img) => img.filename !== filename);
  writeList(list);
  res.json({ ok: true, images: list });
});

router.put("/images/order", (req, res) => {
  const { order } = req.body;
  const list = readList();
  const porNombre = Object.fromEntries(list.map((img) => [img.filename, img]));
  const reordenada = order.map((filename) => porNombre[filename]).filter(Boolean);
  writeList(reordenada);
  res.json({ ok: true, images: reordenada });
});

module.exports = router;