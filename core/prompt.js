const inquirer = require('inquirer');

exports.editor = async (data, name) => {
    const isJson = data && (typeof data  === 'object');
    const {editorContent} = await inquirer.prompt([
        {
            type: "editor",
            name: "editorContent",
            default: (isJson ? JSON.stringify(data, null, 3) : data || ''),
            "message": "Edit content"
        }
    ]);
    return {[name]: isJson ? JSON.parse(editorContent) : editorContent};
};
exports.prompt = questions => inquirer.prompt(questions);
/**
 * 
 * @param {*} foJson 
 * @param {*} skipApp 
 * @param {*} fromCmd 
 * @returns 
 */
exports.orgAndAppQuest = (foJson, skipApp, cmdData) => {
    return new Promise(async(resolve, reject) => {
        const organisations = Object.keys(foJson);
        if (!organisations.length) {
            console.log(`No Organisation created please load existing  or create a new one`);
            process.exit(0);
        }
        // create a new entry of cmdData
        cmdData = cmdData || {};
        if(!organisations.includes(cmdData.organisation))  {
            const orgResponse = await this.prompt({
                type: "list",
                name: "organisation",
                default: "ONE-FE",
                "message": "Select organisation",
                choices: Object.keys(foJson)
            });

            Object.assign(cmdData, orgResponse);
        }
        
        if (!skipApp) {
            const apps = Object.keys(foJson[cmdData.organisation].apps);
            if (!apps.length) {
                console.log(`No apps created for the selected ${cmdData.organisation}, run focli app load ${cmdData.organisation}`);
                process.exit(0);
            }

            if (!apps.includes(cmdData.appName)){
                this.prompt({
                    type: "list",
                    name: "appName",
                    "message": "Select application",
                    default: "FO-SITE-BUILDER",
                    validate: function(input) {
                        const done = this.async();
                        if (!input) {
                            done('Please select one');
                            return;
                        }
    
                        done(null, true);
                    },
                    choices: apps
                }).then(value => {
                    Object.assign(cmdData, value);
                    resolve(cmdData);
                });
            } else {
                resolve(cmdData);
            }
        } else {
            resolve(cmdData);
        }
    });
}

exports.validate = {
    numbers: function(input) {
        const done = this.async();
        if (!/[0-9]/.test(input)) {
            return done('Only numbers are allowed')
        }

        done(null, true);
    }
}


exports.promptName = async (lists) => {
    const { name } = await this.prompt(!lists ? ({
        type: "input",
        name: "name",
        default: "Sample Name",
        "message": "Enter a name"
    }) : ({
        type: "list",
        name: "name",
        choices: lists,
        "message": "Please select from list"
    }));

    return name;
}