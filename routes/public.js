const router = require("express").Router();
const db = require("../db");

router.get("/:slug", (req, res) => {
  const empresa = db.prepare("SELECT * FROM empresas WHERE slug = ?").get(req.params.slug);

  if (!empresa) return res.status(404).send("Menú no encontrado.");
  if (!empresa.activo) return res.render("menu-no-disponible", { empresa });

  if (!req.query.lang) {
  db.prepare("INSERT INTO visitas (empresa_id) VALUES (?)").run(empresa.id);
  }

  const idiomasDisponibles = empresa.idiomas.split(",").map((s) => s.trim());
  const lang = idiomasDisponibles.includes(req.query.lang) ? req.query.lang : "es";

  const categorias = db.prepare("SELECT * FROM categorias WHERE empresa_id = ? ORDER BY orden ASC, id ASC").all(empresa.id);
  const productos = db.prepare(`
    SELECT p.* FROM productos p
    JOIN categorias c ON c.id = p.categoria_id
    WHERE c.empresa_id = ? AND p.disponible = 1
  `).all(empresa.id);

  const t = (item, campo) => {
    if (lang === "en" && item[`${campo}_en`]) return item[`${campo}_en`];
    return item[campo];
  };

  res.render("menu-publico", { empresa, categorias, productos, lang, idiomasDisponibles, t });
});

module.exports = router;