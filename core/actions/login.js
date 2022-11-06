const authenticator = require("../apis/authenticator")

module.exports = async() => {
    const response = await authenticator()
        .catch(console.log);
    console.log(response);
}