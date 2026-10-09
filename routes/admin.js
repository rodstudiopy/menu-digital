const router = require("express").Router();
const db = require("../db");
const { requireLogin } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

// Configuración de subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../public/uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, "menu-" + Date.now() + ext);
  },
});
const upload = multer({ storage });

router.use(requireLogin);

// 1. Listado de empresas
router.get("/", (req, res) => {
  const empresas = db.prepare("SELECT * FROM empresas ORDER BY id DESC").all();
  res.render("admin-home", { empresas });
});

// 2. Crear empresa
router.post("/empresas", upload.single("menu_imagen"), (req, res) => {
  const { nombre, slug, direccion, telefono, logo_url, tema_color, idiomas, tipo_menu } = req.body;
  const slugLimpio = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const menu_imagen_url = req.file ? "/uploads/" + req.file.filename : null;

  try {
    db.prepare(`
      INSERT INTO empresas (nombre, slug, direccion, telefono, logo_url, tema_color, idiomas, tipo_menu, menu_imagen_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(nombre, slugLimpio, direccion, telefono, logo_url, tema_color || "#2563eb", idiomas || "es", tipo_menu || "escrito", menu_imagen_url);
    res.redirect("/admin");
  } catch (err) {
    res.status(400).send("Error: El enlace (slug) ya existe o es inválido. <a href='/admin'>Volver</a>");
  }
});

// 3. Detalle de empresa + Estadísticas
router.get("/empresas/:id", (req, res) => {
  const empresa = db.prepare("SELECT * FROM empresas WHERE id = ?").get(req.params.id);
  if (!empresa) return res.status(404).send("Empresa no encontrada");

  const totalVisitas = db.prepare("SELECT COUNT(*) AS total FROM visitas WHERE empresa_id = ?").get(empresa.id).total;
  const visitasSemana = db.prepare(`
    SELECT COUNT(*) AS total FROM visitas
    WHERE empresa_id = ? AND fecha >= datetime('now', '-7 days')
  `).get(empresa.id).total;

  res.render("empresa-detalle", { empresa, totalVisitas, visitasSemana, host: req.headers.host });
});

// 4. Actualizar datos de empresa (incluye cambiar tipo de menú e imagen)
router.post("/empresas/:id/editar", upload.single("menu_imagen"), (req, res) => {
  const { nombre, direccion, telefono, logo_url, tema_color, idiomas, tipo_menu } = req.body;

  if (req.file) {
    // Si subieron una imagen nueva, actualizamos también la imagen
    const menu_imagen_url = "/uploads/" + req.file.filename;
    db.prepare(`
      UPDATE empresas 
      SET nombre=?, direccion=?, telefono=?, logo_url=?, tema_color=?, idiomas=?, tipo_menu=?, menu_imagen_url=?
      WHERE id=?
    `).run(nombre, direccion, telefono, logo_url, tema_color, idiomas, tipo_menu, menu_imagen_url, req.params.id);
  } else {
    // Si no subieron imagen nueva, dejamos la que ya estaba
    db.prepare(`
      UPDATE empresas 
      SET nombre=?, direccion=?, telefono=?, logo_url=?, tema_color=?, idiomas=?, tipo_menu=?
      WHERE id=?
    `).run(nombre, direccion, telefono, logo_url, tema_color, idiomas, tipo_menu, req.params.id);
  }

  res.redirect(`/admin/empresas/${req.params.id}`);
});

// 5. Activar/desactivar empresa
router.post("/empresas/:id/toggle", (req, res) => {
  const emp = db.prepare("SELECT activo FROM empresas WHERE id=?").get(req.params.id);
  db.prepare("UPDATE empresas SET activo=? WHERE id=?").run(emp.activo ? 0 : 1, req.params.id);
  res.redirect(`/admin/empresas/${req.params.id}`);
});

// 6. Editor de Menú
router.get("/empresas/:id/menu", (req, res) => {
  const empresa = db.prepare("SELECT * FROM empresas WHERE id = ?").get(req.params.id);
  if (!empresa) return res.status(404).send("Empresa no encontrada");

  const categorias = db.prepare("SELECT * FROM categorias WHERE empresa_id = ? ORDER BY orden ASC, id ASC").all(empresa.id);
  const productos = db.prepare(`
    SELECT p.* FROM productos p
    JOIN categorias c ON c.id = p.categoria_id
    WHERE c.empresa_id = ?
    ORDER BY p.id ASC
  `).all(empresa.id);

  res.render("menu-editor", { empresa, categorias, productos });
});

// 7. Crear categoría
router.post("/empresas/:id/categorias", (req, res) => {
  const { nombre, nombre_en } = req.body;
  db.prepare("INSERT INTO categorias (empresa_id, nombre, nombre_en) VALUES (?, ?, ?)").run(req.params.id, nombre, nombre_en);
  res.redirect(`/admin/empresas/${req.params.id}/menu`);
});

// 7b. Editar categoría
router.post("/categorias/:catId/editar", (req, res) => {
  const { nombre, nombre_en } = req.body;
  const cat = db.prepare("SELECT empresa_id FROM categorias WHERE id=?").get(req.params.catId);
  db.prepare("UPDATE categorias SET nombre=?, nombre_en=? WHERE id=?").run(nombre, nombre_en, req.params.catId);
  res.redirect(`/admin/empresas/${cat.empresa_id}/menu`);
});

// 8. Eliminar categoría
router.post("/categorias/:catId/eliminar", (req, res) => {
  const cat = db.prepare("SELECT empresa_id FROM categorias WHERE id=?").get(req.params.catId);
  db.prepare("DELETE FROM categorias WHERE id=?").run(req.params.catId);
  res.redirect(`/admin/empresas/${cat.empresa_id}/menu`);
});

// 9. Crear producto
router.post("/categorias/:catId/productos", (req, res) => {
  const { nombre, nombre_en, descripcion, descripcion_en, precio, imagen_url } = req.body;
  const cat = db.prepare("SELECT empresa_id FROM categorias WHERE id=?").get(req.params.catId);

  db.prepare(`
    INSERT INTO productos (categoria_id, nombre, nombre_en, descripcion, descripcion_en, precio, imagen_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.catId, nombre, nombre_en, descripcion, descripcion_en, parseInt(precio) || 0, imagen_url);

  res.redirect(`/admin/empresas/${cat.empresa_id}/menu`);
});

// 9b. Editar producto
router.post("/productos/:prodId/editar", (req, res) => {
  const { nombre, nombre_en, descripcion, descripcion_en, precio, imagen_url } = req.body;
  const prod = db.prepare(`
    SELECT c.empresa_id FROM productos p
    JOIN categorias c ON c.id = p.categoria_id
    WHERE p.id = ?
  `).get(req.params.prodId);

  db.prepare(`
    UPDATE productos 
    SET nombre=?, nombre_en=?, descripcion=?, descripcion_en=?, precio=?, imagen_url=?
    WHERE id=?
    `).run(nombre, nombre_en, descripcion, descripcion_en, parseInt(precio) || 0, imagen_url, req.params.prodId);

  res.redirect(`/admin/empresas/${prod.empresa_id}/menu`);
});

// 10. Eliminar producto
router.post("/productos/:prodId/eliminar", (req, res) => {
  const prod = db.prepare(`
    SELECT c.empresa_id FROM productos p
    JOIN categorias c ON c.id = p.categoria_id
    WHERE p.id = ?
  `).get(req.params.prodId);

  db.prepare("DELETE FROM productos WHERE id=?").run(req.params.prodId);
  res.redirect(`/admin/empresas/${prod.empresa_id}/menu`);
});

module.exports = router;