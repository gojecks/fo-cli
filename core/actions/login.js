const authenticator = require("../apis/authenticator")

module.exports = async(force) => {
    const response = await authenticator(!!force)
        .catch(console.log);
    console.log(response);
}