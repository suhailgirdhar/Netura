const mongoose = require("mongoose");

// ----------- CONNECT DATABASE -------------

exports.connectMongoose = () => {
  mongoose
    .connect("mongodb://localhost:27017/neturaDB")
    .then(() => console.log("Connected to NeturaDB"))
    .catch((err) => console.log("Not Connected to DB or " + err));
};

// --------- ORDER SCHEMA -----------

const orderSchema = mongoose.Schema({
  product: String,
  qty: Number,
  paymentId: String,
  amount: String,
  currency: String,
  createdAt: String,
  name: String,
  contact: Number,
  house: String,
  city: String,
  state: String,
  pincode: Number,
});

// --------- USER SCHEMA -----------

const userSchema = mongoose.Schema({
  fullname: String,
  username: {
    type: String,
    required: true
  },
  email: String,
  password: String,
  contact: Number,
  address: String,
  pincode: Number,
  token: {
    type: String,
    default: "",
  },
  orders: [orderSchema],
});

// --------- USER MODEL -----------

exports.User = mongoose.model("NeturaUser", userSchema);

// --------- ORDER MODEL -----------

exports.Order = mongoose.model("Order", orderSchema);
