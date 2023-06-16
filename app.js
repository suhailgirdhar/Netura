require("dotenv").config();
const express = require("express");
const expressSession = require("express-session");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const passport = require("passport");
const flash = require('connect-flash');

// --------- CONFIGURED MODULES -------------

const { connectMongoose, User, Order } = require("./database.js");
const sendMessage = require("./controllers/fast2sms");
const { forgotPassword } = require("./controllers/forgotPassword.js");
const { resetPassword } = require("./controllers/resetPassword.js");
const { sendMail } = require("./controllers/sendMail.js");
const { isContactRegistered } = require("./controllers/isContactRegistered");
const {
  initializePassportByContact,
} = require("./controllers/loginByPhoneNumber.js");
const { initializePassport, isAuthenticated } = require("./passportConfig.js");

// -------- IMPORT RAZORPAY ---------

const Razorpay = require("razorpay");

// -------- IMPORT BCRYPT ----------

const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// ----------- CREATE SESSION ---------

app.use(
  expressSession({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
  );
  
app.use(flash());
app.use((req, res, next) =>  {
  res.locals.messages = req.flash();
  next();
})


//---------- USE PASSPORT ------------

initializePassport(passport);
initializePassportByContact(passport);
app.use(passport.initialize());
app.use(passport.session());

// --------- CONNECT MONGOOSE ---------

connectMongoose();

//-------------- login OTP --------------

let generated_otp;

// --------- VARIABLES ------------

let orderQty;
let itemPrice = 1499;

//-----------HOME PAGE ------------

app

  .get("/", async function (req, res) {
    if (!req.user) {
      res.render("index", { username: "Log in", signup: "Sign up" });
    }
    if (req.user) {
      const loggedInUser = await User.findById(req.user);
      res.render("index", {
        username: "Hi, " + loggedInUser.username,
        signup: "Logout",
      });
    }
  })

  .post("/", function (req, res) {
    let orderValue = req.body.rzpButton;

    let instance = new Razorpay({
      key_id: process.env.RZP_KEY_ID,
      key_secret: process.env.RZP_KEY_SECRET,
    });

    let options = {
      amount: orderValue * 100, // amount in the smallest currency unit
      currency: "INR",
    };

    instance.orders.create(options, function (err, order) {
      if (err) return res.send({ code: 500, message: "Server Err" });
      else {
        return res.send({ code: 200, mesage: "order created", data: order });
      }
    });
  });

// ------------ REGISTER PAGE -----------------

app
  .get("/register", function (req, res) {
    if (req.user) {
      req.logout((err) => {
        if (err) {
          console.log(err);
          res.send("Something went Wrong");
        } else {
          res.render("login", {
            username: "Log in",
            signup: "Sign up",
            loggedOutStatement: "Logged out successfully",
          });
        }
      });
    } else res.render("register", { username: "Log in", signup: "Sign up" });
  })
  .post("/register", async function (req, res) {
    let newUser = await User.findOne({ username: req.body.username });

    if (newUser) {

      console.log("newuser", newUser.username);

      res.render("login", {
        username: "Log in",
        signup: "Sign up",
        loggedOutStatement: "User already exists",
      });

    } else {
      bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
        if (!err) {
          User.insertMany({
            fullname: req.body.fullname,
            username: req.body.username,
            password: hash,
          });
          res.render("login", {
            username: "Log in",
            signup: "Sign up",
            loggedOutStatement: "user added successfully",
          });
        }
      });
    }
  });

// -----------LOGIN PAGE--------------

app

  .get("/login", async function (req, res) {
    if (!req.user) {
      res.render("login", {
        username: "Log in",
        signup: "Sign up",
        loggedOutStatement: "",
      });
    }
    if (req.user) {
      res.redirect("/profile");
    }
  })

  .post(
    "/login",
    passport.authenticate("local", {
      successRedirect: "/profile",
      failureRedirect: "/login",
    })
  );

// ----------- PROFILE --------------

app.get("/profile", isAuthenticated, async function (req, res) {
  const loggedInUser = await User.findById(req.user);
  const userOrders = await loggedInUser.orders;

  res.render("profile", {
    username: loggedInUser.username,
    signup: "Logout",
    orders: userOrders,
  });
});

// ----------- DELETE ORDER FROM PROFILE --------------

app.post("/profile/delete-order", isAuthenticated, async function (req, res) {
  const loggedInUser = await User.findById(req.user);
  const orderDeleteBtn = req.body.orderDeleteBtn;

  User.findOneAndUpdate(
    { _id: loggedInUser._id },
    { $pull: { orders: { _id: orderDeleteBtn } } }
  ).then((data) => console.log("Entry deleted"));

  res.redirect("/profile");
});

// ----------- SETTINGS --------------

app

  .get("/settings", isAuthenticated, async function (req, res) {
    const loggedInUser = await User.findById(req.user);
    const { fullname, username, email, contact, address, pincode } =
      loggedInUser;
    res.render("settings", {
      signup: "Logout",
      username,
      fullname,
      email,
      contact,
      address,
      pincode,
    });
  })

  .post(
    "/settings",
    
    isAuthenticated,

    async function (req, res, next) {
      // console.log("req.user ", req.user)
      const loggedInUser = await User.findById(req.user);
      const { fullname, email, contact, address, pincode } = await req.body;

      req.session.loggedInUser = loggedInUser;
      req.session.fullname = fullname;
      req.session.contact = contact;
      req.session.address = address;
      req.session.pincode = pincode;
      req.session.email = email;

      next()
    },

    isContactRegistered,

    (req, res) => {
      const {loggedInUser, fullname, email, contact, address, pincode, isContactAlreadyRegistered } =  req.session

      console.log("isContactAlreadyRegistered: ", isContactAlreadyRegistered)

      if (isContactAlreadyRegistered === false) {
        User.findOneAndUpdate(
          { _id: loggedInUser._id },
          {
            $set: { fullname, email, contact, address, pincode },
          }
        ).then(() => {
          console.log("updated");
        });
      }

      res.redirect("/settings");
    }
  );

// -----------LOGOUT PAGE--------------

app.get("/logout", async function (req, res) {
  req.logout((err) => {
    if (err) console.log(err);
  });
  res.redirect("login");
});

// ------------ PRODUCT DESCRIPTION PAGE -------

app.get("/product-description", async function (req, res) {
  let username, signup;

  if (!req.user) {
    username = "login";
    signup = "signup";
  } else {
    const loggedInUser = await User.findById(req.user);
    username = loggedInUser.username;
    signup = "logout";
  }

  res.render("productdescription", { username, signup });
});

// ------------ PRODUCT PAGE -----------------

app
  .get("/product", async function (req, res) {
    if (!req.user) {
      res.render("product", {
        username: "Log in",
        signup: "Sign up",
        pincodeAvail: "Enter pincode to check delivery at your doorstep",
      });
    }
    if (req.user) {
      const loggedInUser = await User.findById(req.user);

      res.render("product", {
        username: "Hi, " + loggedInUser.username,
        signup: "Logout",
        pincodeAvail: "",
      });
    }
  })
  .post("/product", function (req, res) {
    orderQty = Number(req.body.qty);
    orderAmount = orderQty * itemPrice;
    console.log("orderQty : ", orderQty, "orderAmount : ", orderAmount);
    res.redirect("/sendotp");
  });

// ----------- CONFIRM PINCODE -------------

app.get("/pincodeAvailability", async function (req, res) {
  if (!req.user) {
    res.render("product", {
      username: "Log in",
      signup: "Sign up",
      pincodeAvail: "Delivery available",
    });
  }
  if (req.user) {
    const loggedInUser = await User.findById(req.user);
    // console.log(loggedInUser.username);
    res.render("product", {
      username: "Hi, " + loggedInUser.username,
      signup: "Logout",
      pincodeAvail: "Delivery available",
    });
  }
});

app.post("/pincodeAvailability", function (req, res) {
  res.redirect("/pincodeAvailability");
});

//-------------   ORDER AS GUEST ------------

app
  .get("/sendotp", async function (req, res) {
    if (!req.user) {
      res.render("sendotp", {
        username: "Log in",
        signup: "Sign up",
        qty: orderQty,
        amount: orderQty * itemPrice,
      });
    }
    if (req.user) {
      const loggedInUser = await User.findById(req.user);
      res.render("sendotp", {
        username: "Hi, " + loggedInUser.username,
        signup: "Logout",
        qty: orderQty,
        amount: orderQty * itemPrice,
      });
    }
  })

  .post("/sendotp", async function (req, res) {
    generated_otp = await Math.round(Math.random() * 8999 + 1000);
    const contact = await Number(req.body.contactNumber);
    // generated_otp = 1000;

    console.log("generated_otp : ", generated_otp);
    console.log("contact : ", contact);

    setTimeout(() => {
      generated_otp = undefined;
      console.log("otp reset");
    }, 60000);

    // findUserByContact(res, contact);

    sendMessage(generated_otp, contact);

    res.redirect("/verify?phone=" + contact);
  });

// ------------- VERIFY OTP --------------

app
  .get("/verify", async (req, res) => {
    req.session.contact = req.query.phone;
    const contact = req.session.contact;

    if (!req.user) {
      res.render("verifyAndPay", {
        username: "Log in",
        signup: "Sign up",
        status: "",
        verifyText: "OTP sent on " + contact,
        amount: "",
      });
    }
    if (req.user) {
      const loggedInUser = await User.findById(req.user);
      res.render("verifyAndPay", {
        username: "Hi, " + loggedInUser.username,
        signup: "Logout",
        status: "",
        verifyText: "OTP sent on " + contact,
        amount: "",
      });
    }
  })

  .post(
    "/verify",
    async (req, res, next) => {
      // const contact = req.session.contact
      // console.log("inside .post /verify, contact: ", contact)

      let verifyText, username, signup, status;
      const enteredOTP = Number(req.body.enteredOTP);

      if (enteredOTP !== generated_otp) {
        console.log("OTP Invalid");
        username = "Log in";
        signup = "Sign up";
        status = "Not Verified";
        verifyText = "Invalid OTP, Please try again";
        res.render("verifyAndPay", {
          username,
          signup,
          status: status,
          verifyText,
          amount: "",
        });
      } else {
        req.body.contact = req.session.contact;
        next();
      }
    },

    passport.authenticate("createUserByContact"),

    async (req, res, next) => {
      let verifyText, username, signup, status;

      console.log("OTP valid");
      console.log("inside .post /verify second: ", req.user);

      signup = "Logout";
      status = "verified";
      verifyText =
        "OTP verified Successfully, Please click on 'PAY' to proceed";

      const loggedInUser = await User.findById(req.user);
      username = loggedInUser.username;

      res.render("verifyAndPay", {
        username,
        signup,
        status,
        verifyText,
        amount: "",
      });
    }
  );

// ---------- PAY ---------------

app.post("/pay", (req, res) => {
  const orderValue = orderQty * itemPrice * 100;
  console.log(orderQty);
  console.log(itemPrice);

  let instance = new Razorpay({
    key_id: process.env.RZP_KEY_ID,
    key_secret: process.env.RZP_KEY_SECRET,
  });

  let options = {
    amount: orderValue,
    currency: "INR",
  };

  instance.orders.create(options, function (err, order) {
    if (err) {
      console.log("order not created");
      return res.send({ code: 500, message: "Server Err" });
    } else {
      console.log(order);
      return res.send({ code: 200, mesage: "order created", data: order });
      // res.render("verifyAndPay", { status: "verified", amount: order.amount });
    }
  });
});

//------------ SUCCESS PAGE --------------

app.get("/success/:paymentId", async function (req, res) {
  var currentdate = new Date();
  var datetime =
    currentdate.getDate() +
    "/" +
    (currentdate.getMonth() + 1) +
    "/" +
    currentdate.getFullYear() +
    " @ " +
    currentdate.getHours() +
    ":" +
    currentdate.getMinutes() +
    ":" +
    currentdate.getSeconds();

  await Order.insertMany({
    product: "Netura",
    qty: orderQty,
    amount: orderQty * itemPrice,
    currency: "INR",
    createdAt: datetime,
    paymentId: req.params.paymentId,
  });

  const newOrder = await Order.findOne({ paymentId: req.params.paymentId });
  console.log("newOrder: ", newOrder);

  if (req.user) {
    const loggedInUser = await User.findById(req.user);
    console.log("loggedInUser._id: ", loggedInUser._id);

    User.findOneAndUpdate(
      { _id: loggedInUser._id },
      {
        $push: { orders: newOrder },
      }
    )
      .then(() => {
        console.log("updated");
        res.render("deliveryAddress", {
          username: loggedInUser.username,
          signup: "Logout",
          id: req.params.paymentId,
        });
      })
      .catch(() => console.log("Order not added to user's order list"));
  } else {
    res.render("deliveryAddress", {
      username: "Login",
      signup: "Sign up",
      id: req.params.paymentId,
    });
  }
});

// ----------- DELIVERY ADDRESS PAGE -----------

app.get("/orderplaced", async function (req, res) {
  if (!req.user) {
    res.render("success", { username: "Log in", signup: "Sign up" });
  }
  if (req.user) {
    const loggedInUser = await User.findById(req.user);
    res.render("success", {
      username: "Hi, " + loggedInUser.username,
      signup: "Logout",
    });
  }
});

app.post("/orderplaced", async function (req, res) {
  const loggedInUser = await User.findById(req.user);
  const paymentId = await req.body.paymentId;
  console.log("paymentId: ", paymentId);
  console.log("loggedInUser: ", loggedInUser);

  const { name, contact, house, city, state, pincode } = req.body;

  Order.findOne({ paymentId: paymentId }).then((d) =>
    console.log("found order : ", d)
  );

  Order.findOneAndUpdate(
    { paymentId: paymentId },
    { name, contact, house, city, state, pincode },
    { new: true }
  )
    .then((order) => {
      console.log("inside .post /orderPlaced user.email:", loggedInUser.email);
      console.log(
        "inside .post /orderPlaced user.username:",
        loggedInUser.username
      );
      console.log(
        "inside .post /orderPlaced user.fullname:",
        loggedInUser.fullname
      );

      if (loggedInUser.email && loggedInUser.username) {
        const receiverName = loggedInUser.fullname
          ? loggedInUser.fullname
          : loggedInUser.username;
        const to = loggedInUser.email;
        const subject =
          "Netura - Order placed successfully, Order Id: " + order._id;
        const html =
          "<p>Hello " +
          receiverName +
          ", your order has been placed successfully.</p></br><p><strong>Your order details are:</strong></p></br>" +
          "<p>Item: " +
          order.product +
          "</p></br><p> Quantity: " +
          order.qty +
          "</p></br><p> Amount: " +
          order.amount +
          "</p></br><p> Currency: " +
          order.currency +
          "</p></br><p> Payment Id: " +
          order.paymentId +
          "</p></br><p> Order Id: " +
          order._id +
          "</p>" +
          "</br></br></br><p><strong>Your delivery details are:</strong></p></br><p> Name: " +
          name +
          "</p></br><p> Contact: " +
          contact +
          "</p></br><p> House/Flat No.: " +
          house +
          "</p></br><p> City: " +
          city +
          "</p></br><p> State: " +
          state +
          "</p></br><p> Pincode: " +
          pincode +
          "</p></br>";

        sendMail(receiverName, to, subject, html);
      }
      console.log("address updated for order :", order);
    })
    .catch((e) => console.log("address not updated for order", e));

  Order.findOne({ paymentId: paymentId }).then((d) =>
    console.log("updated order : ", d)
  );

  res.redirect("/orderplaced");
});

// ---------- ADMIN PAGE ----------------

app.get("/admin", async function (req, res) {
  const ordersList = await Order.find({});

  res.render("admin", { ordersList: ordersList });
});

// ---------- FORGOT PASSWORD ----------------
app
  .get("/forgot-password", (req, res) => {
    res.render("forgotPassword", {
      username: "Log in",
      signup: "Sign up",
    });
  })
  .post("/forgot-password", forgotPassword, (req, res) => {
    res.send("email sent successfully");
  });

// ---------- RESET PASSWORD ----------------

app
  .get("/reset-password", (req, res) => {
    res.render("resetPassword", {
      username: "Log in",
      signup: "Sign up",
    });
  })
  .post("/reset-password", resetPassword, (req, res) => {
    res.render("login", {
      username: "Log in",
      signup: "Sign up",
    });
  });

// --------- VERIFY BY PHONE ------------

app.get("/verify-by-contact", (req, res) => {
  res.render("verifyByContact");
});

// ---------- START SERVER ---------------

app.listen(3000, (req, res) => {
  console.log("Server is running on port 3000");
});


