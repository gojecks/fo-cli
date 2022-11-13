const fs = require('fs');
const httpClient = require('../http');
const siteDistPath = './dist.zip';
const utils = require('../utils');
const foJson = utils.foJson.get();
const { prompt, orgAndAppQuest } = require('../prompt');


const questions = [{
        type: "confirm",
        name: "cleanWorkSpace",
        default: true,
        "message": "Clean work space before upload (Y/N)"
    },
    {
        type: "input",
        name: "filePath",
        default: siteDistPath,
        "message": "Enter file path"
    },
    {
        type: "confirm",
        name: "compress",
        default: true,
        "message": "Compress before upload (Y/N)"
    }
];

const promptSiteName = async(orgAndApp) => {
    const sites = Object.keys(foJson[orgAndApp.organisation].apps[orgAndApp.appName].sites || {});
    if (!sites.length) {
        console.log('No sites created..');
        process.exit(0);
    }

    const { name } = await prompt({
        type: "list",
        name: "name",
        choices: sites,
        "message": "Select site"
    });

    return name;
}

exports.upload = async() => {

    const orgAndApp = await orgAndAppQuest(foJson);
    const name = await promptSiteName(orgAndApp);
    const answers = await prompt(questions);

    if (answers.compress) {
        const archiver = require('../archiver');
        console.log(`compressing dist output -> ${answers.filePath}`)
        await archiver({
            filePath: answers.filePath
        });
    }

    if (!fs.existsSync(answers.filePath)) {
        console.log("file doesn't exists");
        return null;
    }
    const payLoad = {
        formData: {
            'files[]': fs.createReadStream(answers.filePath),
            site: name,
            path: "/",
            cleanWorkSpace: JSON.stringify(answers.cleanWorkSpace)
        }
    };

    httpClient('POST', '/sites/file/upload', payLoad, orgAndApp).then(console.log, console.log);
}

exports.new = async() => {
    const orgAndApp = await orgAndAppQuest(foJson);
    const { name } = await prompt({
        type: "input",
        name: "name",
        default: orgAndApp.appName,
        "message": "Enter site name"
    });

    const response = await httpClient('PUT', '/sites/create', { postData: { name } }, orgAndApp)
        .catch(err => console.log(err));

    if (response) {
        updateSiteInfo(orgAndApp, name)
    }
}

exports.rm = async() => {
    const orgAndApp = await orgAndAppQuest(foJson);
    const name = await promptSiteName(orgAndApp);

    const response = await httpClient('DELETE', '/sites/remove', { postData: { name } }, orgAndApp)
        .catch(err => console.log(err))
    if (response) {
        updateSiteInfo(orgAndApp, name, true);
    }
}

exports.load = async() => {
    const orgAndApp = await orgAndAppQuest(foJson);
    const response = await httpClient('GET', '/sites/list', null, orgAndApp)
        .catch(err => console.log(err))
    if (response) {
        response.forEach(site => updateSiteInfo(orgAndApp, site.name))
    }
}

exports.rename = async(request) => {
    const orgAndApp = await orgAndAppQuest(foJson);
    const name = await promptSiteName(orgAndApp);
    const sitesObject = foJson[orgAndApp.organisation].apps[orgAndApp.appName].sites;
    if (request.newName && sitesObject) {
        if (sitesObject[request.newName]) {
            return console.log(`Sitename already exists, please enter a different name`);
        }

        const response = await httpClient('PUT', '/sites/rename', {
            postData: {
                current: name,
                new: request.newName
            }
        }, orgAndApp).catch(console.log);

        if (response) {
            sitesObject[request.newName] = sitesObject[name];
            sitesObject[request.newName].oldName = name;
            delete sitesObject[name];
            utils.foJson.set(foJson);
            console.log(`Site ${name} renamed`);
        }
    }
}

exports.list = async() => {
    const orgAndApp = await orgAndAppQuest(foJson);
    const sitesObject = foJson[orgAndApp.organisation].apps[orgAndApp.appName].sites || {};
    const sites = Object.keys(sitesObject).map(site => `${site} . ${sitesObject[site].active ? 'on':'off'}line`);
    console.log(sites.join('\n'));
}

/**
 * 
 * @param {*} orgAndApp 
 * @param {*} name 
 * @param {*} remove 
 */
function updateSiteInfo(orgAndApp, name, remove) {
    const appData = foJson[orgAndApp.organisation].apps[orgAndApp.appName];
    if (appData && !appData.sites) {
        appData.sites = {};
    }
    if (!remove) {
        appData.sites[name] = {...orgAndApp, name, active: true };
    } else {
        delete appData.sites[name]
    }

    utils.foJson.set(foJson);
}