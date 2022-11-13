const inquirer = require('inquirer');

exports.prompt = questions => inquirer.prompt(questions);
exports.orgAndAppQuest = (foJson, skipApp) => {
    return new Promise(async(resolve, reject) => {
        const organisations = Object.keys(foJson);
        if (!organisations.length) {
            console.log(`No Organisation created please load existing  or create a new one`);
            process.exit(0);
        }
        const { organisation } = await this.prompt({
            type: "list",
            name: "organisation",
            default: "ONE-FE",
            "message": "Select organisation",
            choices: Object.keys(foJson)
        });

        let appName = "";
        if (!skipApp) {
            const apps = Object.keys(foJson[organisation].apps);
            if (!apps.length) {
                console.log(`No apps created for the selected ${organisation}`);
                process.exit(0);
            }

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
                resolve({
                    organisation,
                    ...value
                });
            });
        } else {
            resolve({
                organisation
            });
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