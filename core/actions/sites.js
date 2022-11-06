const fs = require('fs');
const httpClient = require('../http');
const siteDistPath = './dist.zip';
const utils = require('../utils');
const foJson = utils.foJson.get();
const { prompt, orgAndAppQuest } = require('../prompt');


const questions = [{
        type: "input",
        name: "siteName",
        default: "fo-site-builder",
        "message": "Enter site name"
    },
    {
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

exports.upload = async() => {
    const answers = await prompt(questions);
    const orgAndApp = await orgAndAppQuest(foJson);
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
            site: answers.siteName,
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
    const sites = Object.keys(foJson[orgAndApp.organisation].apps[orgAndApp.appName].sites || {});
    if (!sites.length) {
        console.log('No sites created..');
        return
    }

    const { name } = await prompt({
        type: "list",
        name: "name",
        choices: sites,
        "message": "Select site"
    });

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