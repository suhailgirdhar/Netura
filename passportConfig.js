const LocalStrategy = require("passport-local");
const { User } = require("./database.js");
const bcrypt = require("bcrypt");
const saltRounds = 10;

exports.initializePassport = (passport) => {
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await User.findOne({ username });

        if (!user) return done(null, false, { message: 'Incorrect username' });
        if (user) {
          const isMatch = await bcrypt.compare(password, user.password);

          if (!isMatch) return done(null, false, { message: 'Incorrect password' });
          if (isMatch) return done(null, user);
        }
      } catch (error) {
        return done(error, false);
      }
    })
  );

  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(async function (id, done) {
    try {
      const user = await User.findById(id);

      done(null, user);
    } catch (error) {
      done(error, false);
    }
  });
};

exports.isAuthenticated = function (req, res, next) {
  if (!req.user) res.redirect("/login");
  if (req.user) return next();
};
