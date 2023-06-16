require("dotenv").config();
var request = require("request");

const sendMessage = (otp, contact) => {
  var headers = {
    authorization: process.env.FAST2SMS_API_KEY,
    "content-type": "application/x-www-form-urlencoded",
  };

  var dataString = `variables_values=${otp}&route=otp&numbers=${contact}`;

  var options = {
    url: "https://www.fast2sms.com/dev/bulkV2",
    method: "POST",
    headers: headers,
    body: dataString,
  };

  function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body);
    } else if (error) {
      console.log(error);
    }
  }

  return request(options, callback);
};

//const sendMessage = fast2sms.sendMessage({
//     authorization: process.env.FAST2SMS_API_KEY,
//     message:
//       "Hello User, your Guest Login OTP is: " +
//       generated_otp +
//       ". Validity of this otp is 1 minute. Don't share thos code with anyone",
//     numbers: [contact],
//   })
//   .then((response) => {
//     console.log(response);
//     console.log("inside response");
//   })
//   .catch((err) => {
//     console.log(err);
//   });

module.exports = sendMessage;
