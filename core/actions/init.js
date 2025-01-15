const utils = require('../utils');
module.exports = async(pathName) => {
    if (pathName){
        utils.createFolder(pathName, true);
        utils.writeFile('node_modules/.focli-path', pathName);
    }
}