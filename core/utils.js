const fs = require('fs');
const path = require('path');
const jeliFolderPath = './.focli/';
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