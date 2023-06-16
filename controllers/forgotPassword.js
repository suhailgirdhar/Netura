const randomstring = require("randomstring")
const { User } = require("../database.js");
const {sendMail} = require("./sendMail.js")


const forgotPassword = async (req, res, next) => {

    try {
        const email = await req.body.email
        const foundUser = await User.findOne({email})

        if (foundUser) {
            const token = randomstring.generate()
            const data = await User.updateOne({email}, {$set: {token}})

            let query = "reset-password";
            let html = "<p>Hello " + foundUser.fullname + ", <a href='http://localhost:3000/" + query + "?token=" + token + "'>click on this link</a> to reset your password</p>"
            sendMail(foundUser.fullname, email, "Reset Password Link", html)
            
            return next()
            
            res.status(200).send({success: true, msg:"api hit successfully"})
        } else {
            res.status(200).send({success: true, msg:"user not found"})
        }
        
    } catch (error) {
        res.status(400).send({success: false, msg:"something went wrong"})  
    }
}


module.exports = {forgotPassword}