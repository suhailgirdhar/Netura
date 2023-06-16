const { User } = require("../database.js");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const resetPassword = async (req, res, next) => {
  try {
    const token = await req.query.token;
    const foundUser = await User.findOne({ token });

    if (foundUser) {
      const id = foundUser._id;

      if (req.body.password !== undefined) {
        bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
          if (err) {
            console.log("err:", err);
          } else {
            console.log("oldpassword:", foundUser.password);
            console.log("hash:", hash);
            User.findByIdAndUpdate(
              id,
              { $set: { password: hash, token: "" } },
              { new: true }
            ).then((user) => {
            return next()
              res.status(200).send({
                success: true,
                msg: "Password reset successfully",
                data: user,
              });
            });
          }
        });
      }
    } else {
      res.status(400).send({ success: true, msg: "Invalid or expired token" });
    }
  } catch (error) {
    res.status(400).send({ success: false, msg: "Password reset failed" });
  }
};

module.exports = { resetPassword };
