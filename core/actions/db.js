const fs = require('fs');
const httpClient = require('../http');
const utils = require('../utils');
const foJson = utils.foJson.get();
const { editor, promptName  } = require('../prompt');
const { v4: uuidv4 } = require('uuid');
const envVar = require('../env');

const getDbObj = (orgAndApp, type) => {
    let app = foJson[orgAndApp.organisation].apps[orgAndApp.appName];
    if (!app.db) {
        app.db = {
            tables: {},
            queries: {}
        };
    }
    if (!app.db[type]) {
        app.db[type] = {};
    }

    return app.db[type];
};


const queryEditor = async (orgAndApp, isNew) => {
    const queries = getDbObj(orgAndApp, 'queries');
    const name = await promptName(!isNew ? Object.keys(queries) : null);
    if (!name || (isNew && queries[name])) {
        return console.log(`${name} already exists or invalid name!`);
    }
    const mock = { tablemName: '', fields: '*', limit: 'JDB_SINGLE', where: [] };
    const editorValue = await editor(isNew ? mock : queries[name], name);
    Object.assign(queries, editorValue);
    utils.foJson.set(foJson);
    console.log(`${name} query ${isNew ? 'added' : 'editted'}, run query push to save queries to server`);
}

const tableEditor = async (orgAndApp, isNew) => {
    const tables = getDbObj(orgAndApp, 'tables');
    const name = await promptName(isNew ? null : Object.keys(tables));
    if (isNew && tables[name]) {
        return console.log(`table ${name} already exist please try again`);
    }

    const curTime = +new Date;
    const tableData = {
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
    console.log(`table ${name} ${isNew ? 'created' : 'editted'}, please run schema sync command to sync table to server`);
}

/**
 * 
 * @param {*} tableSchema 
 * @param {*} orgAndApp 
 * @returns 
 */
async function syncTable(tableSchema, orgAndApp) {
    const response = await httpClient('PUT', '/database/sync', tableSchema, orgAndApp)
        .catch(console.log);
    if (response) {
        console.log(`Table ${tableSchema.TBL_NAME} ${response.ok ? 'done' : 'failed'}.`);
        return response.ok;
    }

    return false;
}

const listHooks = orgAndApp => {
    const resource = getDbObj(orgAndApp, 'refs');
    return ['app', 'users'].concat(Object.keys(resource.resourceManager));
};

const pushHook = async (orgAndApp, hookName) => {
    const filePath = `functions/hooks/${hookName}.hook.php`;
    const hookFilePath = `${orgAndApp.organisation}/${orgAndApp.appName}/${filePath}`;
    const template = utils.readFile(hookFilePath);
    if (template != null) {
        const response = await httpClient('PUT', '/cms/file/update', { template, filePath }, orgAndApp);
        if (response) {
            console.log(`Hook ${hookName} saved`);
        } else {
            console.log(`Unable to save hook ${hookName}`);
        }
    } else {
        console.log('Nothing to push');
    }
}

class Hook {
    static async load(orgAndApp){
        const hooks = listHooks(orgAndApp)

        for (const hook of hooks) {
            try {
                const filePath = `functions/hooks/${hook}.hook.php`;
                const { content } = await httpClient('GET', '/database/hooks/implementation', { name: hook }, orgAndApp);
                if (content) {
                    console.log(`contents loaded for ${hook} hook`);
                    const hookFilePath = `${orgAndApp.organisation}/${orgAndApp.appName}/${filePath}`;
                    utils.writeFile(hookFilePath, content);
                }
            } catch (e) {
                console.log(`Failed to load ${hook} content`)
            }
        }
    }

    static async push(orgAndApp){
        const hooks = listHooks(orgAndApp)
        const hookName = await promptName(hooks);
        await pushHook(orgAndApp, hookName);
    }

    static async push_all(orgAndApp){
        const hooks = listHooks(orgAndApp)
        for (const hook of hooks) {
            await pushHook(orgAndApp, hook);
        }
    }
}

class Query {
    static async list(orgAndApp){
        const queries = getDbObj(orgAndApp, 'queries');
        console.log(Object.keys(queries).map(q => `> ${q} | Type<${(queries[q].type || 'Read').toUpperCase()}> | Table#${queries[q].tableName || ''}`).join('\n'));
    }

    static async add(orgAndApp){
        queryEditor(orgAndApp, true);
    }

    static async edit(orgAndApp){
        queryEditor(orgAndApp);
    }

    static async rm(orgAndApp){
        const queries = getDbObj(orgAndApp, 'queries');
        const name = await promptName(Object.keys(queries));
        delete queries[name];
        utils.foJson.set(foJson);
        console.log(`${name} query removed, run query push to save changes to server`)
    }

    static async rename(orgAndApp){
        const queries = getDbObj(orgAndApp, 'queries');
        const oldName = await promptName(Object.keys(queries));
        const newName = await promptName(null)
        queries[newName] = queries[oldName];
        delete queries[oldName];
        utils.foJson.set(foJson);
        console.log(`${oldName} query rename -> ${newName}, run query push to save changes to server`);
    }

    static async push(orgAndApp){
        const queries = getDbObj(orgAndApp, 'queries');
        const response = await httpClient('PUT', '/database/queries', queries, orgAndApp)
            .catch(console.log);

        if (response) {
            console.log(`Queries saved!`);
        }
    }

    static async load(orgAndApp){
        const queries = getDbObj(orgAndApp, 'queries');
        const response = await httpClient('GET', '/database/queries', null, orgAndApp)
            .catch(console.log);

        if (response) {
            const added = [];
            for (var queryId in response) {
                if (!queries[queryId]) {
                    queries[queryId] = response[queryId];
                    added.push(`# ${queryId}`);
                } else {
                    Object.assign(queries[queryId], response[queryId]);
                }
            }
            utils.foJson.set(foJson);
            console.log(`Local queries updated, added: \n${added.join('\n')} queries`);
        }
    }

    /**
     * 
     * @param {*} organisation 
     * @param {*} appName 
     * @param {*} id 
     * @param {*} values
     */
    static async tryitout(orgAndApp, id){
        const queries = getDbObj(orgAndApp, 'queries');
        if (!id)
            id = await promptName(Object.keys(queries));
        values = envVar.args.values || {};

        const response = await httpClient('POST', '/database/query', { id, values }, orgAndApp)
            .catch(console.log);

        if (response) console.log(response);
    }
}

class Schema {
    static async load(orgAndApp){
        const resource = getDbObj(orgAndApp, 'refs');
        if (!resource.lastSyncedDate) {
            console.log(`Nothing to load, please first sync resource from server `);
            return;
        }
        const tables = Object.keys(resource.resourceManager);
        orgAndApp.tableName = JSON.stringify(tables);
        const response = await httpClient('GET', '/database/schema', null, orgAndApp)
            .catch(console.log);

        if (response && !Array.isArray(response.schemas)) {
            const tables = getDbObj(orgAndApp, 'tables');
            Object.assign(tables, response.schemas);
            utils.foJson.set(foJson);
            console.log(`Schema loaded and saved!`);
        }
    }

    static async load_refs(orgAndApp){
        const resource = getDbObj(orgAndApp, 'refs');
        const response = await httpClient('GET', '/database/resource', null, orgAndApp)
            .catch(console.log);

        if (response) {
            Object.assign(resource, response.resource);
            utils.foJson.set(foJson);
            console.log('Resources loaded!');
        }
    }

    static async sync(orgAndApp, table){
        const resource = getDbObj(orgAndApp, 'refs');
        const tables = getDbObj(orgAndApp, 'tables');
        console.log('Sync state inProgress..');
        if (resource.resourceManager) {
            if (!resource.lastSyncedDate) {
                console.log(`Creating DB..`);
                const response = await httpClient('PUT', '/database/resource', resource, orgAndApp)
                    .catch(console.log);
                if (!response.state) {
                    return console.log(`Failed to create DB, please try again later..`);
                }
            }

            for (const tableName in resource.resourceManager) {
                if (table && tableName !== table) continue;
                const done = await syncTable(tables[tableName], orgAndApp);
                if (done) {
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

class Table {
    static async list(orgAndApp){
        const resource = getDbObj(orgAndApp, 'refs');
        if (!resource.resourceManager) return console.log(`No tables created!`)
        const data = Object.keys(resource.resourceManager).map(k => {
            return `+ ${k}`
        });
        console.log(data.join('\n'));
    }

    static async drop(orgAndApp){
        const resource = getDbObj(orgAndApp, 'refs');
        if (!resource.resourceManager) return console.log(`No tables created!`)
        const tableName = await promptName(Object.keys(resource.resourceManager));
        const response = await httpClient('DELETE', '/database/table/drop', {
            remove: [tableName]
        }, orgAndApp)
            .catch(console.log);

        if (response) {
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
    }

    static async rename(orgAndApp){
        const resource = getDbObj(orgAndApp, 'refs');
        if (!resource.resourceManager) return console.log(`No tables created!`)
        const oldName = await promptName(Object.keys(resource.resourceManager));
        const newName = await promptName(null);
        if (resource.resourceManager[newName]) {
            return console.log(`table ${newName} already exists, please try again`);
        }

        const postData = { renamed: { [oldName]: newName } };
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
    }

    static async add(orgAndApp){
        tableEditor(orgAndApp, true);
    }

    static async edit(orgAndApp){
        tableEditor(orgAndApp, false);
    }
}

class DB {
    static withInstance = {
        skip: [],
        action: {
            push: false,
            push_all: false,
            rename: false,
            edit: false,
            add: false,
            rm: false,
            list: false,
            drop: false,
            rename: false,
            load_refs: false,
            load: false,
            tryitout: false,
            sync: false
        }
    };

    static async load(orgAndApp) {
        const orders = ['schema.load_refs', 'schema.load', 'query.load', 'hook.load'];
        orders.forEach(async (order) => {
            const splt = order.split('.');
            const action = this[splt.shift()];
            if (action) {
                await action[splt.pop()](orgAndApp.organisation, orgAndApp.appName);
            }
        });
    }
    
    static hook = Hook;
    static query = Query;
    static schema = Schema;
    static table = Table;
}

module.exports = DB;