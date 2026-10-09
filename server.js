require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();

// Función para formatear números con separador de miles (estilo guaraní)
app.locals.formatGs = function (num) {
  const entero = Math.round(Number(num) || 0);
  return entero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secreto_default",
    resave: false,
    saveUninitialized: false,
  })
);

app.get("/login", (req, res) => {
  if (req.session.isAdmin) return res.redirect("/admin");
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const { usuario, clave } = req.body;
  if (usuario === process.env.ADMIN_USER && clave === process.env.ADMIN_PASS) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }
  res.render("login", { error: "Usuario o contraseña inválidos." });
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

app.get("/", (req, res) => res.redirect("/admin"));

app.use("/admin", require("./routes/admin"));
app.use("/menu", require("./routes/public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en: http://localhost:${PORT}`);
});