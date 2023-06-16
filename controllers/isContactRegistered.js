const { User } = require("../database.js");

const isContactRegistered = async function (req, res, next) {
  let isContactAlreadyRegistered = false;

  const otherUsers = await User.find({ _id: { $ne: req.user._id } });
  const reqNum = Number(req.session.contact);

  for (let i = 0; i < otherUsers.length; i++) {
    if (reqNum === await otherUsers[i].contact) {
      console.log("contact already registered with other user");
      isContactAlreadyRegistered = true;
    }
  }

  if (isContactAlreadyRegistered === true) {
    console.log("isContactAlreadyRegistered");
    req.session.isContactAlreadyRegistered = true
    return next()
  } else {
    req.session.isContactAlreadyRegistered = false
    return next();
  }
};

module.exports = { isContactRegistered };
