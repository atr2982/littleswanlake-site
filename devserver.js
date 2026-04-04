require("dotenv").config();

const express = require("express");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs/promises");

const app = express();
const PORT = Number(process.env.PORT) || 5500;
const publicDir = path.join(__dirname, "public_html");
const docsDir = path.join(__dirname, "Docs");
const viewsDir = path.join(__dirname, "server", "views");
const isProduction = process.env.NODE_ENV === "production";

const requiredEnvVars = ["MONGODB_URI", "SESSION_SECRET", "ADMIN_EMAIL", "ADMIN_PASSWORD"];
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`);
  console.error("Copy .env.example to .env and fill in the values before starting the server.");
  process.exit(1);
}

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin"],
      default: "admin",
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function ensureAdminUser() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  const password = String(process.env.ADMIN_PASSWORD || "");

  const existingAdmin = await User.findOne({ email });
  if (existingAdmin) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    email,
    passwordHash,
    role: "admin",
  });

  console.log(`Created initial admin user for ${email}`);
}

function getSafeRedirectPath(rawValue, fallback = "/admin") {
  const value = String(rawValue || "").trim();
  if (!value.startsWith("/")) {
    return fallback;
  }
  if (value.startsWith("//")) {
    return fallback;
  }
  if (value.startsWith("/login")) {
    return fallback;
  }
  return value;
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  const returnTo = encodeURIComponent(req.originalUrl || "/admin");
  return res.redirect(`/login?next=${returnTo}`);
}

function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect("/admin");
  }
  return next();
}

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
  session({
    name: "lsl.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 60 * 60 * 24 * 14,
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24 * 14,
    },
  }),
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session ? req.session.user : null;
  next();
});

app.get("/login", redirectIfAuthenticated, (req, res) => {
  const nextPath = getSafeRedirectPath(req.query.next, "/admin");
  const error = req.query.error === "1";
  const signedOut = req.query.signedOut === "1";

  return res.sendFile(path.join(viewsDir, "login.html"), {
    headers: {
      "Cache-Control": "no-store",
      "X-Auth-Next": nextPath,
      "X-Auth-Error": error ? "1" : "0",
      "X-Auth-Signed-Out": signedOut ? "1" : "0",
    },
  });
});

app.post("/login", redirectIfAuthenticated, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const nextPath = getSafeRedirectPath(req.body.next, "/admin");

  if (!email || !password) {
    return res.redirect(`/login?error=1&next=${encodeURIComponent(nextPath)}`);
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.redirect(`/login?error=1&next=${encodeURIComponent(nextPath)}`);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return res.redirect(`/login?error=1&next=${encodeURIComponent(nextPath)}`);
  }

  req.session.user = {
    id: String(user._id),
    email: user.email,
    role: user.role,
  };

  return req.session.save(() => {
    res.redirect(nextPath);
  });
});

app.post("/logout", (req, res) => {
  if (!req.session) {
    return res.redirect("/login?signedOut=1");
  }

  req.session.destroy(() => {
    res.clearCookie("lsl.sid");
    res.redirect("/login?signedOut=1");
  });
});

app.get("/admin", requireAuth, (req, res) => {
  return fs
    .readFile(path.join(viewsDir, "admin.html"), "utf8")
    .then((template) => {
      const html = template.replaceAll("{{ADMIN_EMAIL}}", escapeHtml(req.session.user.email));
      res.set("Cache-Control", "no-store");
      res.type("html");
      res.send(html);
    });
});

// Serve website root from /public_html
app.use("/", express.static(publicDir));

// Serve /Docs from sibling folder
app.use("/Docs", express.static(docsDir));
app.use("/docs", express.static(docsDir));

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(500).send("Server error");
});

async function start() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  await ensureAdminUser();

  app.listen(PORT, () => {
    console.log(`Dev server running: http://127.0.0.1:${PORT}/`);
  });
}

start().catch((error) => {
  console.error("Failed to start server");
  console.error(error);
  process.exit(1);
});
