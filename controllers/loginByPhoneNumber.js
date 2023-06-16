const passportCustom = require("passport-custom");
const CustomStrategy = passportCustom.Strategy;
const randomstring = require("randomstring")
const { User } = require("../database.js");

exports.initializePassportByContact = (passport) => {
  passport.use(
    "createUserByContact",
    new CustomStrategy(async function (req, done) {
      
        const contact = await req.body.contact;

      if (contact !== undefined || contact === "") {
        try {
          const contactAsUsername = await User.findOne({ username: contact });
          const contactAsContact = await User.findOne({ contact: contact });

          if (contactAsUsername || contactAsContact) {
            const user = contactAsUsername
              ? contactAsUsername
              : contactAsContact;

            console.log("user already exist :", user);
            console.log(" login successful");
            
            return done(null, user);
          }

          if (!contactAsUsername || !contactAsContact) {
            const randomeString = await randomstring.generate(4)
            const newUser = await User.insertMany(
              {
                username: contact,
                contact: contact,
                password: randomeString,
              },
              {
                new: true
              }
            ).then((newUser) => {
              console.log("user added below: ", newUser);
              return done(null, newUser);
            });

            console.log("newUser: ", newUser);

          }
        } catch (error) {
          return done(error, false);
        }
      } else {
        console.log("contact cannot be empty or undefined");
      }
    })
  );

  passport.serializeUser(function (user, done) {
    console.log("inside serialize: ", user[0]._id)
    done(null, user[0].id);
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
