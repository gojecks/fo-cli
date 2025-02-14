const fs = require('fs');
const utils = require('../utils');
const foJson = utils.foJson.get();
const session = require('../session');
const push = require('../apis/push');
const { prompt } = require('../prompt');
const fetch = require('../apis/fetch');

function getOrgByEnv(){
    const orgs = Object.keys(foJson);
    const sessionData = session.get(true);
    const userId = sessionData.userId;
    return orgs.filter(org  => foJson[org].UID == userId);
}

exports.new = async() => {
    const numRows = require('../apis/num_rows');
    const answers = await prompt([{
        type: "input",
        name: "organisation",
        "message": "Enter organisation"
    }]);

    if (answers.organisation) {
        const msg = `Organisation ${answers.organisation} already exists please enter a new name`;
        if (foJson && foJson.hasOwnProperty(answers.organisation)) {
            console.error(msg);
        } else {
            const isExists = await numRows({
                name: answers.organisation
            }, { tableName: 'organisation' });
            if (!isExists) {
                const sessionData = session.get();
                var postData = [{
                    name: answers.organisation,
                    created: +new Date,
                    UID: sessionData.userId,
                    pending: false,
                    members: []
                }];

                const response = await push(postData, 'insert', {
                    tableName: 'organisation'
                });

                if (response.result) {
                    postData.id = response.uuids[0];
                    addToStorage(answers.organisation, postData);
                    console.log(`created ${answers.organisation}`)
                }
            } else {
                console.error(msg);
            }
        }
    }
}

exports.rm = async() => {
    const orgByEnv = getOrgByEnv();
    const answers = await prompt([{
        type: "list",
        name: "organisation",
        choices: orgByEnv,
        "message": "Select organisation to delete"
    }]);

    if (answers.organisation) {
        var data = foJson[answers.organisation];
        const sessionData = session.get();
        if (sessionData.userId !== data.uid) {
            console.log(`Unable to remove organisation ${answers.organisation}`);
            return;
        }

        const response = await push(data.id, 'delete', {
            tableName: 'organisation'
        });

        if (response.result) {
            const appIds = Object.reduce(data.apps).map(app => data.apps[app].appId);
            rmFromStorage(answers.organisation);
            if (appIds.length) {
                console.log('remove all apps...');
                await push(appIds, 'delete', {
                    tableName: 'user_db'
                });
            }
        } else {
            console.log(`Unable to remove organisation ${answers.organisation}`);
        }
    }
}

exports.load = async() => {
    const sessionData = session.get(true);
    if (!sessionData) return console.log(`Session does not exists, please login to continue "focli login"`);
    const UID = sessionData.userId;
    const email = sessionData.userInfo.email;

    const orgs = await fetch([
        { UID  },
        { email },
        {
            members: {
                type: '$find',
                expressions: [{ UID }, { email }]
            }
        }], { tableName: "organisation" })
        .catch(console.log);
    if (orgs) {
        orgs.forEach(org => addToStorage(org.name, org));
        console.log('Organisation updated');
    }
}

exports.list = async()  => {
    const orgByEnv = getOrgByEnv();
    console.log(`List of Organisations:\n${orgByEnv.map(i => `> ${i}`).join('\n')}`)
}

exports.sync = async() => {
    const orgByEnv = getOrgByEnv();
    const answers = await prompt([{
        type: "list",
        name: "organisation",
        choices: orgByEnv,
        "message": "Select organisation to sync up"
    }]);
}

function addToStorage(orgName, data) {
    if (!foJson[orgName]) {
        foJson[orgName] = {
            created: +new Date,
            teams: [],
            apps: {},
            ...data
        };
        fs.mkdirSync(utils.getPath(orgName), { recursive: true });
    } else {
        Object.assign(foJson[orgName], data);
    }

    utils.foJson.set(foJson);
}

function rmFromStorage(orgName) {
    delete foJson[orgName];
    fs.rmSync(utils.getPath(orgName), { recursive: true })
    utils.foJson.set(foJson);
}