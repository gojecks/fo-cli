const fs = require('fs');
const path = require('path');
let jeliFolderPath = '';
const sizes = ['B','KB', 'MB', 'GB', 'TB'];

try {
    jeliFolderPath = fs.readFileSync('node_modules/.focli-path').toString('utf-8');
} catch(e) {}

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
    try {
        fs.writeFileSync(this.getPath(filePath), (toJSON ? JSON.stringify(content, null, 3) : content));
    } catch (e){
        console.log(`Unable to write content ${content}`);
    } 
}

exports.createFolder = (folderPath, recursive) => {
    fs.mkdirSync(folderPath, {recursive});
}

exports.saveRawData = (fileName, data, append = true) => {
    const filePath = this.getPath(fileName);
    try {
        if (append) {
            fs.appendFileSync(filePath, data + "\n");
        } else {
           fs.writeFileSync(filePath, data); 
        }
    } catch (e){
        console.log(`Unable to write to file reasons: ${e.message}`)
    }
}

exports.sizeConversion = (size, c = 0) => {
    if (size > 1024)
        return this.sizeConversion(size / 1024, ++c);

    return `${(size || 0).toFixed(2)} ${sizes[c]}`;
};