const fs = require('fs');
const httpClient = require('../http');
const siteDistPath = './dist.zip';
const utils = require('../utils');
const foJson = utils.foJson.get();
const { prompt, orgAndAppQuest } = require('../prompt');
const { args } = require('../env');

const getSitesInfo = (orgAndApp, fallback = null, name) => {
    const siteObject = foJson[orgAndApp.organisation].apps[orgAndApp.appName].sites;
    if (siteObject) {
        return (name ? siteObject[name] : siteObject)
    }
    return fallback;
};

const uploadQuestions = async (currentVersion) => prompt([{
    type: "confirm",
    name: "cleanWorkSpace",
    default: true,
    "message": "Clean work space before upload (Default: YES)"
},
{
    type: "input",
    name: "filePath",
    default: siteDistPath,
    "message": "Enter file path"
},
{
    type: "input",
    name: "version",
    default: currentVersion,
    "message": "Version (files will be written to this folder)"
},
{
    type: "input",
    name: "changeLog",
    default: "Initial commits...",
    "message": "Enter changeLog for this upload"
},
{
    type: "confirm",
    name: "useAsRoot",
    default: true,
    "message": "Use current version as root (default: YES)"
},
{
    type: "confirm",
    name: "compress",
    default: true,
    "message": "Compress before upload (default: YES)"
}
]);

const compressionDetailsQuestions = [
    {
        type: "input",
        name: "dirPath",
        default: "dist",
        "message": "Enter Source path"
    }
];

const promptSiteName = async (orgAndApp, blankInput) => {
    const sites = Object.keys(getSitesInfo(orgAndApp, {}));
    if (!blankInput && !sites.length) {
        console.log('No sites created..');
        process.exit(0);
    }

    const { name } = await prompt(blankInput ? ({
        type: "input",
        name: "name",
        default: orgAndApp.appName,
        "message": "Enter site name"
    }) : ({
        type: "list",
        name: "name",
        choices: sites,
        "message": "Select site"
    }));

    return name;
}

/**
 * 
 * @param {*} organisation 
 * @param {*} appName 
 * @returns 
 */
exports.deploy = async (organisation, appName) => {
    const orgAndApp = await orgAndAppQuest(foJson, false, { organisation, appName });
    const name = await promptSiteName(orgAndApp);
    const siteObject = getSitesInfo(orgAndApp, null, name);
    const answers = await uploadQuestions(siteObject.version);
    const upload = () => {
        if (!fs.existsSync(answers.filePath)) {
            console.log("file doesn't exists");
            return null;
        }
    
        console.log('deploying artefact....');
        const payLoad = {
            formData: {
                'files[]': fs.createReadStream(answers.filePath),
                site: name,
                type: 'fileUpload',
                version: answers.version,
                changeLog: answers.changeLog,
                cleanWorkSpace: String(answers.cleanWorkSpace),
                useAsDefault: String(answers.useAsRoot)
            }
        };
    
        httpClient('POST', '/sites/file/upload', payLoad, orgAndApp).then(
            () => console.log(`Site artefact uploaded successfully!`),
            console.log
        );
    }

    if (answers.compress) {
        const compressionDetails = await prompt(compressionDetailsQuestions);
        const archiver = require('../archiver');
        console.log(`> compressing dist from ${compressionDetails.dirPath} -> ${answers.filePath}`)
        archiver({
            filePath: answers.filePath,
            destPath: answers.version,
            ...compressionDetails
        }).then(upload,  err => {
            console.error(`Error compressing file: ${err}`);
        });
    } else {
        upload();
    }
}

/**
 * 
 * @param {*} organisation 
 * @param {*} appName 
 */
exports.new = async (organisation, appName) => {
    const orgAndApp = await orgAndAppQuest(foJson, false, { organisation, appName });
    const name = await promptSiteName(orgAndApp, true);
    const response = await httpClient('PUT', '/sites/create', { name }, orgAndApp)
        .catch(err => console.log(err));

    if (response) {
        updateSiteInfo(orgAndApp, name, false, response);
        console.log(`${name} site created successfully!`);
    }
}

/**
 * 
 * @param {*} organisation 
 * @param {*} appName 
 */
exports.rm = async (organisation, appName) => {
    const orgAndApp = await orgAndAppQuest(foJson, false, { organisation, appName });
    const name = await promptSiteName(orgAndApp);

    const response = await httpClient('DELETE', '/sites/remove', { name }, orgAndApp)
        .catch(err => console.log(err))
    if (response) {
        updateSiteInfo(orgAndApp, name, true);
        console.log(`${name} site deleted successfully!`);
    }
}

exports.load = async (organisation, appName) => {
    const orgAndApp = await orgAndAppQuest(foJson, false, { organisation, appName });
    const response = await httpClient('GET', '/sites/list', null, orgAndApp)
        .catch(err => console.log(err))
    if (response) {
        const sitesObject = getSitesInfo(orgAndApp);
        const siteNames = Object.keys(sitesObject);
        const loaded = [];
        response.forEach(site => {
            updateSiteInfo(orgAndApp, site.name, false, site);
            loaded.push(site.name);
        });

        // remove the sites from configuration
        siteNames.forEach(name => {
            if (!loaded.includes(name)) {
                delete sitesObject[name];
                console.log(`Removing ${name} site`);
            }
        });
        utils.foJson.set(foJson);
        console.log('Site repository updated successfully!');
    }
}

exports.rename = async (organisation, appName, newName) => {
    const orgAndApp = await orgAndAppQuest(foJson, false, { organisation, appName });
    const name = await promptSiteName(orgAndApp);
    const sitesObject = getSitesInfo(orgAndApp);
    if (newName && sitesObject) {
        if (sitesObject[newName]) {
            return console.log(`Sitename already exists, please enter a different name`);
        }

        const response = await httpClient('PUT', '/sites/rename', {
            current: name,
            new: newName
        }, orgAndApp).catch(console.log);

        if (response) {
            sitesObject[newName] = sitesObject[name];
            delete sitesObject[name];
            utils.foJson.set(foJson);
            return console.log(`Site ${name} renamed -> ${newName}`);
        }
    }
}

exports.list = async (organisation, appName) => {
    const orgAndApp = await orgAndAppQuest(foJson, false, { organisation, appName });
    const sitesObject = getSitesInfo(orgAndApp, {});
    const sites = Object.keys(sitesObject).map(site => `+ ${site} . ${sitesObject[site].active ? 'on' : 'off'}line`);
    console.log(sites.join('\n'));
}

/**
 * use --configPath=FILE_PATH to upload config from a file
 * @param {*} organisation 
 * @param {*} appName 
 */
exports.push_config = async (organisation, appName) => {
    const orgAndApp = await orgAndAppQuest(foJson, false, { organisation, appName });
    const name = await promptSiteName(orgAndApp);
    const sitesObject = getSitesInfo(orgAndApp);
    const postData = sitesObject[name];
    if (args.configPath) {
        const configMap = utils.readFile(args.configPath, true);
        if (configMap) {
            Object.assign(postData, { configMap });
        }
    }

    const response = await httpClient('PUT', '/sites/update', { name, configMap: postData.configMap, configOnly: true }, orgAndApp)
        .catch(console.log);
    if (response && response.update) {
        console.log(`Site config updated`);
        utils.foJson.set(foJson);
        return;
    }

    console.log(`Failed to update site config, please try again`);
}

exports.drop_artefact = async (organisation, appName) => {
    const orgAndApp = await orgAndAppQuest(foJson, false, { organisation, appName });
    const site = await promptSiteName(orgAndApp);
    const siteObject = getSitesInfo(orgAndApp, null, site);
    if (siteObject) {
        const versions = siteObject._versions;
        const { version } = await prompt([{
            type: "list",
            name: "version",
            default: "1.0.0",
            "message": "Select version to remove",
            choices: Object.keys(versions)
        }]);

        const response = await httpClient('DELETE', '/sites/remove/version', { site, version }, orgAndApp)
            .catch(console.log);
        if (response) {
            delete siteObject._versions[version];
            // remove the site from version list
            console.log(`Site artefact removed`);
            utils.foJson.set(foJson);
            return;
        }
    }
}

/**
 * 
 * @param {*} orgAndApp 
 * @param {*} name 
 * @param {*} remove 
 * @param {*} config 
 * @param {*} skipSave 
 */
function updateSiteInfo(orgAndApp, name, remove, config, skipSave = false) {
    const appData = foJson[orgAndApp.organisation].apps[orgAndApp.appName];
    if (appData && !appData.sites) {
        appData.sites = {};
    }

    if (!remove) {
        appData.sites[name] = { ...orgAndApp, ...config };
    } else {
        delete appData.sites[name]
    }

    if (!skipSave)
        utils.foJson.set(foJson);
}