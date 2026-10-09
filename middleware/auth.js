function requireLogin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect("/login");
}

module.exports = { requireLogin };