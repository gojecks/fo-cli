const utils = require('../utils');
module.exports = async(pathName) => {
    pathName = pathName || '.focli';
    utils.createFolder(pathName, true);
    utils.writeFile('node_modules/.focli-path', pathName);
   // utils.saveRawData('./.gitignore', `${pathName}`);
}