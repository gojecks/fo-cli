const inquirer = require('inquirer');

exports.prompt = questions => inquirer.prompt(questions);
exports.orgAndAppQuest = async(foJson, skipApp) => {
    const { organisation } = await this.prompt({
        type: "list",
        name: "organisation",
        "message": "Select organisation",
        choices: Object.keys(foJson)
    });

    let appName = "";
    if (!skipApp) {
        const apps = Object.keys(foJson[organisation].apps);
        if (!apps.length) {
            console.log(`No apps created for the selected ${organisation}`);
            return;
        }

        appName = await this.prompt({
            type: "list",
            name: "appName",
            "message": "Select application",
            validate: function(input) {
                const done = this.async();
                if (!input) {
                    done('Please select one');
                    return;
                }

                done(null, true);
            },
            choices: apps
        })[appName];
    }


    return Object.assign({
        organisation,
        appName
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