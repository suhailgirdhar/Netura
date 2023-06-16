require("dotenv").config();
const nodemailer = require("nodemailer");

const sendMail = async (receiverName, to, subject, html ) => {

    try {
        let transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
              user: process.env.EMAIL, // generated ethereal user
              pass: process.env.GMAILPASSCODE, // generated ethereal password
            },
          });

          console.log("transporter : " , transporter)

          // let finalHTML = "<p>Hello " + receiverName + ", <a href='http://localhost:3000/" + reason + "?token=" + token + "'>click on this link</a> to "+ reason + "</p>"
          // console.log("finalHTML: ", finalHTML)

          let info = await transporter.sendMail({
            from: `"Netura" <${process.env.EMAIL}>`, // sender address
            to, // list of receivers
            subject, // Subject line
            html
          });

          console.log("info : ", info)

          transporter.sendMail(info, function (error, info)  {
            if (!error) console.log("email sent successfully ")
            else console.log("Inside transporter.sendmail, email not sent : " , info.response)
        })
    } catch (error) {
        console.log("email not sent : ", error)
    }
     
}

module.exports = {sendMail}