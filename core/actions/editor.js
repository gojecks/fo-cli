const httpClient = require('../http');
const fs = require('fs');
const { prompt } = require('../prompt');
const utils = require('../utils');
const foJson = utils.foJson.get();
const folderEntry = '.focli/';


class Editor {
    static withInstance = {
        skip: ['createFolder'],
        action: {
            load: false
        }
    };

    static async load(orgAndApp){
        const directoryPath = `${folderEntry}${orgAndApp.organisation}/${orgAndApp.appName}`;
        fs.mkdirSync(directoryPath, { recursive: true });
        httpClient('GET', '/cms/directory', null, orgAndApp)
            .then(res => {
                writeDir(res, directoryPath);
            }, console.log);
    
        /**
         * 
         * @param {*} dirs 
         * @param {*} path 
         */
        function writeDir(dirs, path) {
            for (const file of dirs) {
                if (file.isDir) {
                    path = `${path}/${file.name}`;
                    if (!fs.existsSync(path)) {
                        console.log(`creating dir:${file.name} ...`);
                        fs.mkdirSync(path);
                    }
    
                    if (file.children) {
                        writeDir(file.children, path);
                    }
                } else {
                    fs.writeFileSync(`${path}/${file.name}`, '');
                }
            }
        }
    }
    
    static async createFolder(){
        const answers = await prompt(questions.concat({
            type: "choices",
            name: "parentFolder",
            message: "Select folder",
            choices: ['files', 'functions/controller', 'functions/hook', 'templates', 'schema']
        }, {
            name: "folderName",
            type: "input",
            message: "Please enter folder name"
        }));
    
        if (answers.folderName) {
            const directoryPath = `${folderEntry}${answers.organisation}/${answers.appName}/${answers.parentFolder}/${answers.folderName}`;
            fs.mkdirSync(directoryPath, { recursive: true });
        }
    }
}

module.exports = Editor;