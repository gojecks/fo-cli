const fs = require('fs');
const httpClient = require('../http');
const utils = require('../utils');
const foJson = utils.foJson.get();
const { editor, promptName, orgAndAppQuest } = require('../prompt');
const { v4: uuidv4 } = require('uuid');
const envVar = require('../env');

const getDbObj = (orgAndApp, type) => {
    let app = foJson[orgAndApp.organisation].apps[orgAndApp.appName];
    if (!app.db) {
        app.db  = {
            tables: {},
            queries:{}
        };
    }
    if (!app.db[type]) {
        app.db[type] =  {}; 
    }

    return app.db[type];
};


const queryEditor = async (organisation, appName, isNew) => {
    const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
    const queries = getDbObj(orgAndApp, 'queries');
    const name = await promptName(!isNew ? Object.keys(queries) : null);
    if (!name || (isNew && queries[name])) {
        return console.log(`${name} already exists or invalid name!`);
    }
    const mock = {tablemName:'', fields:'*', limit:'JDB_SINGLE', where:[]};
    const editorValue = await editor(isNew ? mock : queries[name], name);
    Object.assign(queries, editorValue);
    utils.foJson.set(foJson);
    console.log(`${name} query ${isNew ? 'added': 'editted'}, run query push to save queries to server`);
}

const tableEditor = async(organisation, appName, isNew) => {
    const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
    const tables = getDbObj(orgAndApp, 'tables');
    const name = await promptName(isNew ? null : Object.keys(tables));
    if (isNew && tables[name]) {
        return console.log(`table ${name} already exist please try again`);
    }

    const  curTime = +new Date;
    const tableData =  {
        columns: [{}],
        DB_NAME: orgAndApp.appName,
        TBL_NAME: name,
        primaryKey: null,
        foreignKey: null,
        lastInsertId: 0,
        allowedMode: { readwrite: 1, readonly: 1 },
        proc: null,
        index: {},
        created: curTime,
        lastModified: curTime,
        _hash: uuidv4(),
        _previousHash: ""
    };

    const editorValue = await editor(isNew ? tableData : tables[name], name);
    const resources = getDbObj(orgAndApp, 'refs');
    resources.resourceManager = resources.resourceManager || {}
    // add a new resource data
    if (isNew) {
        resources.resourceManager[name] = {
            _hash: tableData._hash,
            lastModified: tableData.lastModified,
            created: tableData.created
        };
    } else {
        resources.resourceManager[name].lastModified = curTime;
    }

    Object.assign(tables, editorValue);
    utils.foJson.set(foJson);
    console.log(`table ${name} ${isNew? 'created':'editted'}, please run schema sync command to sync table to server`);
}

/**
 * 
 * @param {*} tableSchema 
 * @param {*} orgAndApp 
 * @returns 
 */
async function syncTable(tableSchema, orgAndApp){
    const response = await httpClient('PUT', '/database/sync', tableSchema, orgAndApp)
        .catch(console.log);
    if (response){
        console.log(`Table ${tableSchema.TBL_NAME} ${response.ok ? 'done': 'failed'}.`);
        return response.ok;
    }

    return  false;
}

const listHooks = orgAndApp => {
    const resource = getDbObj(orgAndApp, 'refs');
    return ['app', 'users'].concat(Object.keys(resource.resourceManager));
};

const pushHook  = async (orgAndApp, hookName) => {
    const filePath  = `functions/hooks/${hookName}.hook.php`;
    const hookFilePath = `${orgAndApp.organisation}/${orgAndApp.appName}/${filePath}`;
    const template = utils.readFile(hookFilePath);
    if (template != null) {
        const response  =  await httpClient('PUT', '/cms/file/update', { template, filePath }, orgAndApp);
        if (response){
            console.log(`Hook ${hookName} saved`);
        } else {
            console.log(`Unable to save hook ${hookName}`);
        }
    } else {
        console.log('Nothing to push');
    }
}

exports.hook = {
    load: async(organisation, appName) =>  {
        const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
        const  hooks  =  listHooks(orgAndApp)

        for(const hook of hooks) {
            try {
                const filePath  = `functions/hooks/${hook}.hook.php`;
                const {content} =  await httpClient('GET', '/cms/file', { filePath }, orgAndApp);
                if (content) {
                    console.log(`contents loaded for ${hook} hook`);
                    const hookFilePath = `${orgAndApp.organisation}/${orgAndApp.appName}/${filePath}`;
                    utils.writeFile(hookFilePath, content);
                }
            } catch (e) {
                console.log(`Failed to load ${hook} content`)
            }
        }
    },
    push: async(organisation, appName) =>  {
        const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
        const hooks  =  listHooks(orgAndApp)
        const hookName = await promptName(hooks);
        await pushHook(orgAndApp, hookName);
    },
    push_all: async(organisation, appName) =>  {
        const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
        const  hooks  =  listHooks(orgAndApp)
        for(const hook of hooks) {
            await pushHook(orgAndApp, hook);
        }
    }
};

exports.query = {
    list: async(organisation, appName) => {
        const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
        const queries = getDbObj(orgAndApp, 'queries');
        console.log(Object.keys(queries).join('\n'));
    },
    add: async(organisation, appName)  => {
        queryEditor(organisation, appName, true);
    },
    edit: async(organisation, appName)  => {
        queryEditor(organisation, appName);
    },
    rm: async(organisation, appName)  => {
        const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
        const queries = getDbObj(orgAndApp, 'queries');
        const name = await promptName(Object.keys(queries));
        delete queries[name];
        utils.foJson.set(foJson);
        console.log(`${name} query removed, run query push to save changes to server`)
    },
    rename: async(organisation, appName)  => {
        const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
        const queries = getDbObj(orgAndApp, 'queries');
        const oldName = await promptName(Object.keys(queries));
        const newName = await promptName(null)
        queries[newName] = queries[oldName];
        delete queries[oldName];
        utils.foJson.set(foJson);
        console.log(`${oldName} query rename -> ${newName}, run query push to save changes to server`);
    },
    push: async(organisation, appName) => {
        const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
        const queries = getDbObj(orgAndApp, 'queries');
        const response = await httpClient('PUT', '/database/queries', queries, orgAndApp)
        .catch(console.log);

        if (response)  {
            console.log(`Queries saved!`);
        }
    },
    load: async(organisation, appName) =>  {
        const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
        const queries = getDbObj(orgAndApp, 'queries');
        const response = await httpClient('GET', '/database/queries', null, orgAndApp)
        .catch(console.log);

        if(response) {
            const added = [];
            for(var queryId in response) {
                if (!queries[queryId]) {
                    queries[queryId] = response[queryId];
                    added.push(queryId);
                } else {
                    Object.assign(queries[queryId], response[queryId]);
                }
            }
            utils.foJson.set(foJson);
            console.log(`Local queries updated, added: ${added.join('|')} queries`);
        }
    },
    /**
     * 
     * @param {*} organisation 
     * @param {*} appName 
     * @param {*} id 
     * @param {*} values
     */
    tryitout: async(organisation, appName, id) =>  {
        const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
        const queries = getDbObj(orgAndApp, 'queries');
        if (!id)
            id = await promptName(Object.keys(queries));
        values = envVar.args.values || {};

        const response = await httpClient('POST', '/database/query', {id, values}, orgAndApp)
            .catch(console.log);

        if (response)
            console.log(response);
    }
}

exports.schema =  {
    load:  async(organisation, appName) =>  {
        const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
        const resource = getDbObj(orgAndApp, 'refs');
        if (!resource.lastSyncedDate) {
            console.log(`Nothing to load, please first sync resource from server `);
            return;
        }
        const tables = Object.keys(resource.resourceManager);
        orgAndApp.tableName = JSON.stringify(tables);
        const response = await httpClient('GET', '/database/schema', null, orgAndApp)
        .catch(console.log);

        if (response && !Array.isArray(response.schemas)){
            const tables = getDbObj(orgAndApp, 'tables');
            Object.assign(tables, response.schemas);
            utils.foJson.set(foJson);
            console.log(`Schema loaded and saved!`);
        }
    },
    load_refs: async(organisation, appName) =>  {
        const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
        const resource = getDbObj(orgAndApp, 'refs');
        const response = await httpClient('GET', '/database/resource', null, orgAndApp)
        .catch(console.log);

        if (response){
            Object.assign(resource, response.resource);
            utils.foJson.set(foJson);
            console.log('Resources loaded!');
        }
    },
    sync: async(organisation, appName, table) =>  {
        const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
        const resource = getDbObj(orgAndApp, 'refs');
        const tables = getDbObj(orgAndApp, 'tables');
        console.log('Sync state inProgress..');
        if(resource.resourceManager){
            if (!resource.lastSyncedDate)  {
                console.log(`Creating DB..`);
                const response = await httpClient('PUT', '/database/resource', resource, orgAndApp)
                .catch(console.log);
                if (!response.state){
                    return console.log(`Failed to create DB, please try again later..`);
                }
            }

            for(const tableName in resource.resourceManager){
                if (table && tableName !==  table) continue;
                const done = await syncTable(tables[tableName], orgAndApp);
                if (done){
                    resource.resourceManager[tableName].lastSyncedDate = +new Date;
                }
            }

            resource.lastSyncedDate = +new Date;
            utils.foJson.set(foJson);
            console.log('All done please check logs');
        } else {
            console.log('Nothing to Sync!');
        }
    }
}

exports.table = {
    list: async(organisation, appName) =>  {
        const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
        const resource = getDbObj(orgAndApp, 'refs');
        if (!resource.resourceManager) return console.log(`No tables created!`)
        for (var ref in resource.resourceManager) {
            console.log(`${ref} - LastModified ${new Date(resource.resourceManager[ref].lastModified).toLocaleDateString()}`);
        }
    },
    drop: async(organisation, appName) =>  {
        const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
        const resource = getDbObj(orgAndApp, 'refs');
        if (!resource.resourceManager) return console.log(`No tables created!`)
        const tableName = await promptName(Object.keys(resource.resourceManager));
        const response = await httpClient('DELETE', '/database/table/drop', {
            remove:  [tableName]
        }, orgAndApp)
        .catch(console.log);

        if (response){
            if (response.removed[tableName]) {
                const tables = getDbObj(orgAndApp, 'tables');
                // remove from  local
                delete resource.resourceManager[tableName];
                delete tables[tableName];
                utils.foJson.set(foJson);
                console.log(`table ${tableName} removed from server`);
            } else {
                console.log(`unable to drop table ${tableName} from server`);
            }
        }
    },
    rename: async(organisation, appName) =>  {
        const orgAndApp = await orgAndAppQuest(foJson, false, {organisation, appName});
        const resource = getDbObj(orgAndApp, 'refs');
        if (!resource.resourceManager) return console.log(`No tables created!`)
        const oldName = await promptName(Object.keys(resource.resourceManager));
        const newName = await promptName(null);
        if (resource.resourceManager[newName]) {
            return console.log(`table ${newName} already exists, please try again`);
        }

        const postData = {renamed:  {[oldName]: newName}};
        const response = await httpClient('DELETE', '/database/table/rename', postData, orgAndApp)
        .catch(console.log);

        if (response) {
            if (Array.isArray(response.renamed[oldName])) {
                console.log(`rename failed with reasons: ${response.renamed[oldName].reasons}`)
            } else {
                resource.resourceManager[newName] = resource.resourceManager[oldName];
                delete resource.resourceManager[oldName];
                const tables = getDbObj(orgAndApp, 'tables');
                tables[newName] = tables[oldName];
                delete tables[oldName];
                utils.foJson.set(foJson);
                console.log(`table renamed from ${oldName} -> ${newName}`);
            }
        }
    },
    add: async(organisation, appName) =>  {
        tableEditor(organisation, appName, true);
    },
    edit: async(organisation, appName) =>  {
        tableEditor(organisation, appName, false);
    }
}