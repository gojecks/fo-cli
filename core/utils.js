const fs = require('fs');
const path = require('path');
const jeliFolderPath = './node_modules/.focliCache/';
const foJsonPath = path.join(jeliFolderPath, 'fo.json');
exports.foJson = {
    get: () => {
        try {
            const data = fs.readFileSync(foJsonPath, 'utf-8');
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {}
        return {};
    },
    set: (value) => {
        if (value) {
            fs.writeFileSync(foJsonPath, JSON.stringify(value, null, 3));
        }
    }
}

exports.getPath = (...args) => path.join.apply(path, [jeliFolderPath].concat(args));

exports.getFile = (filePath, toJSON = false) => {
    return this.readFile(this.getPath(filePath), toJSON);
};

exports.readFile = (filePath, toJSON = false) => {
    try {
        const file = fs.readFileSync(filePath, 'utf-8');
        return (toJSON ? JSON.parse(file) : file);
    } catch (e) {
        return null;
    }
}

exports.writeFile = (filePath, content, toJSON = false) => {
    fs.writeFileSync(this.getPath(filePath), (toJSON ? JSON.stringify(content, null, 3) : content));
}