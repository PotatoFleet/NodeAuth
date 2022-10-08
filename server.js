const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const express = require("express");
const app = express();
const session = require("express-session");
const User = require("./User");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

require("dotenv").config();

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.DB_URL || "mongodb://localhost/authdb");

console.log(process.env.DB_URL);

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

passport.use(
  new LocalStrategy(function (username, password, done) {
    User.findOne({ username: username })
      .then((user) => {
        return done(
          null,
          !user || !user.validatePassword(password) ? false : user
        );
      })
      .catch((err) => {
        done(err);
      });
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    if (err) return done(err);
    done(null, user);
  });
});

app.use(passport.initialize());
app.use(passport.session());

app.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/fail" }),
  (_req, res) => {
    res.redirect("/success");
  }
);

app.get("/fail", (_req, res) => {
  res.send("Failed");
});

app.get("/success", (req, res) => {
  res.send(req.session);
});

app.post("/register", async (req, res) => {
  const usernameFound = await User.findOne({ username: req.body.username });

  if (usernameFound !== null) {
    res.send({
      successful: false,
      message: `User with username "${req.body.username}" already exists`,
    });
    return;
  }

  try {
    new User({
      username: req.body.username,
      password: req.body.password,
    }).save();
  } catch (e) {
    res.send({
      successful: false,
      message: "Failed to create user",
    });
  }

  res.send({
    successful: true,
    message: "Successfully registered",
  });
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
