const { User } = require("../database.js");

const findUserByContact = (res, contact) => {
    try {
        User.findOne({contact}).then((user) => {
            // res.status(400).send({success: true, msg:"user found", data: user})
            console.log("user :", user)
        }).catch((err) => {
            // res.status(400).send({success: true, msg:"user not found"})
        })
    } catch (error) {
        // res.status(200).send({success: false, msg:"try atch error"})
    }
}
    
    
module.exports = {findUserByContact}