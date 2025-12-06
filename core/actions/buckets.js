const fs = require('fs');
const httpClient = require('../http');
const httpRequest = require('../http.request');
const utils = require('../utils');
const foJson = utils.foJson.get();
const { prompt, orgAndAppQuest } = require('../prompt');
const FormData = require('form-data');
const { args } = require('../env');

const regionsObj = {
    ams3: 'Amsterdam, Netherlands - DataCenter 3',
    Blr1: 'Bangalore, India- DataCenter 1',
    fra1: 'Frankfurt, Germany - DataCenter 1',
    nyc3: 'New York, United States - DataCenter 3',
    sfo2: 'San Francisco, United States - DataCenter 2',
    sfo3: 'San Francisco, United States - DataCenter 3',
    sgp1: 'Singapore - DataCenter 1',
    syd1: 'Sydney, Australia - DataCenter 1'
};

/**
 * 
 * @param {*} orgAndApp 
 * @param {*} skipSave 
 */
function updateBucketData(orgAndApp, data, skipSave = false) {
    const appData = foJson[orgAndApp.organisation];
    if (appData && !appData.bucketData) {
        appData.bucketData = {};
    }
    // update bucket data
    Object.assign(appData.bucketData, data);

    if (!skipSave)
        utils.foJson.set(foJson);
}

const getBucketInfo = (orgAndApp, fallback = null, name) => {
    let bucketObject = foJson[orgAndApp.organisation].bucketData;
    if (bucketObject && name) {
        bucketObject = bucketObject[name];
    }

    return (bucketObject || fallback);
}

const callCommand = (orgAndApp, operationName, payload, responseMapper) => {
    const connector = getBucketInfo(orgAndApp, {}, 'connector');
    return httpClient('POST', '/v2/buckets', Object.assign({
        payload,
        operationName,
        responseMapper
    }, connector), orgAndApp).catch(err => {
        console.error(err.message || `Unabled to perform operation: ${operationName}`)
    });
}

const _pushFilteredObject = (key, size, lastModified, context) => {
    context.size += parseInt(size);
    var paths = key.split('/');
    var last = paths.pop();
    var curr = paths.reduce((accum, ckey) => {
        if (!accum[ckey]) accum[ckey] = {};
        return accum[ckey];
    }, context.contents);

    if (last) {
        curr[last] = {
            key,
            lastModified,
            size
        };
    }
}

const generatePresignedUrl = (payload, orgAndApp) => {
    const connector = getBucketInfo(orgAndApp, {}, 'connector');
    httpClient('POST', '/v2/buckets/object/download', Object.assign(payload, connector)).then(res => {
        this.selectedFile.download = res.result;
    });
}

const selectBucket = async (bucketData) => {
    const bucketNames = Object.keys(bucketData);
    if (bucketNames.length) {
        const { bucket } = await prompt({
            type: "list",
            name: "bucket",
            choices: Object.values(bucketNames),
            "message": "Select bucket"
        });
        return bucket;
    } else {
        console.log(`No buckets to display, run 'load buckets' to fetch all bucketList.`);
    }

    return null;
}

const uploadFiles = async (presignedAttr, filesFormUpload) => {
    const uploadFile = formData => {
        for (var key in presignedAttr.formData) {
            if (key !== 'key') {
                formData.append(key, presignedAttr.formData[key]);
            }
        }

        // console.log(`Uploading file: ${formData.get('key')}`);
        return httpRequest.httpClient({
            url: presignedAttr.attrs.action,
            method: presignedAttr.attrs.method,
            data: formData,
            headers: {
                ...formData.getHeaders()
            }
        });
    };

    await new Promise((resolve, reject) => {
        const handleError = err => {
            console.error(err)
            console.log(`Error uploading files, try again later`);
        };
        let inc = 0;
        const next = () => {
            if (!inc && filesFormUpload.length ) {
                inc++;
                uploadFile(filesFormUpload.shift())
                    .then(next, handleError)
                    .catch(handleError);
            } else {
                resolve({ message: `Files uploaded successfully!` })
            }
        }

        next();
    })
}

class Buckets {
    static getPath(name){
        var paths = this.currentPath;
        if (name) paths = paths.concat([name, '']);
        return paths.join('/');
    }
    
    static getObjectContext(name){
        var context = deepContext(this.currentPath.join('.'), this.listObjects);
        if (context && name) context = context[name];
        return context;
    }
    
    
    /**
     * @param {*} name
     * @param {*} list
     * @returns
     */
    static getKeys(name, list){
        var context = this.getObjectContext(name);
        var size = 0;
        var callback = (typeof list == 'function' ? list : Key => list.push({ Key }));
        var recursiveMapper = (c, paths) => {
            for (var cname in c) {
                var obj = c[cname];
                if (!obj.lastModified) {
                    paths = paths.concat(cname);
                    callback(this.currentPath.concat(paths).join('/'));
                    recursiveMapper(obj, paths);
                } else {
                    callback(obj.key);
                    size += obj.size;
                }
            }
        };
    
        recursiveMapper(context, [name]);
        return size;
    }
    
    static openPath(file, fromBreadCrumb){
        if (file && file.size || (fromBreadCrumb && this.currentPath[this.currentPath.length - 1] == file)) return;
        var path = (fromBreadCrumb ? file : (file && file.name));
        this.currentSelectedPath = [];
        var context = null;
        if (!path) {
            context = this.listObjects;
        } else {
            if (fromBreadCrumb) {
                this.currentPath.splice(this.currentPath.indexOf(path) + 1);
            } else {
                this.currentPath.push(path);
            }
    
            context = this.getObjectContext();
        }
    
        this._constructFileContents(context);
    }
    /**
     *
     * @param {*} context
     */
    static _constructFileContents(context){
        for (var name in context) {
            var ret = { name };
            if (context[name].lastModified) {
                Object.assign(ret, context[name]);
            }
    
            this.currentSelectedPath.push(ret);
        }
    }
    
    static loadCDNs(){
        this.db.api({
            path: '/v2/services/dgo', method: 'GET', data: {
                api: ['/cdn/endpoints', '/certificates']
            }, cache: true
        }).then(res => {
            this.endpoints = res.result[0].endpoints;
            this.certificates = res.result[1].certificates;
            this.changeDetector.onlySelf();
        });
    }
    
    static removeObject(file, totalDeleted, fileSize){
        var context = this.getObjectContext();
        if (context) {
            // remove the object
            delete context[file.name];
        }
    
        this.currentSelectedStats.items -= totalDeleted;
        this.currentSelectedStats.size -= fileSize;
        // remove the entry
        this.currentSelectedPath.splice(this.currentSelectedPath.indexOf(file), 1);
    }
    
    static addObject(name, Key, size){
        var context = this.getObjectContext();
        if (context) {
            context[name] = {};
            this.currentSelectedPath.push({ name, Key, size });
        }
    }
    
    static getObjectAcl(file){
        if (file.acl) return;
        var context = this.getObjectContext(file.name);
        this.callCommand('getObjectAcl', {
            Bucket: this.currentSelectedBucket,
            Key: file.key
        }, ['Grants']).then(res => {
            var isPublic = res.result.Grants.some(grant => (grant.Grantee.Type == 'Group' && grant.Permission == 'READ'));
            context.acl = isPublic ? 'public-read' : 'private';
            this.selectedFile.acl = context.acl;
            this.changeDetector.onlySelf();
        });
    }
    
    
    static getObjectMeta(file){
        if (file.headers) return;
        var context = this.getObjectContext(file.name);
        this.callCommand('headObject', {
            Bucket: this.currentSelectedBucket,
            Key: file.key
        }, [
            'ContentDisposition',
            'ContentEncoding',
            'ContentLanguage',
            'ContentType',
            'Metadata',
            'CacheControl'
        ]).then(res => {
            file.headers = res.result;
            if (!Array.isArray(file.headers.Metadata))
                file.headers.Metadata = Object.keys(file.headers.MetaData).map(key => ({ key, value: file.headers.Metadata[key] }));
    
            context.headers = file.headers;
            this.changeDetector.onlySelf();
        });
    }
    
    static updateMetadata(){
        var payload = {
            Bucket: this.currentSelectedBucket,
            Key: this.selectedFile.Key,
            CopySource: [this.currentSelectedBucket, this.selectedFile.Key].join('/'),
            MetadataDirective: 'REPLACE'
        };
    
        for (var metaAttr in this.selectedFile.headers) {
            if (Array.isArray(this.selectedFile.headers[metaAttr])) {
                payload[metaAttr] = this.selectedFile.headers[metaAttr].reduce((accum, meta) => {
                    if (meta.key.startsWith('x-amz-meta-') && meta.value)
                        accum[meta.key] = meta.value;
                    return accum;
                }, {});
            } else {
                payload[metaAttr] = this.selectedFile.headers[metaAttr];
            }
        }
    
        return this.callCommand('copyObject', payload);
    }
    
    static saveInputValue(target, metadata){
        metadata[target.id.split('_')[0]] = target.value;
    }
    
    
    static async upload(organisation, appName){
        const orgAndApp = await orgAndAppQuest(foJson, false, { organisation, appName });
        const bucketData = getBucketInfo(orgAndApp, null, 'buckets');
        const bucket = await selectBucket(bucketData);
        if (bucket) {
            const { acl, dirPath, replaceIfExists } = await prompt([
                {
                    type: "list",
                    name: "acl",
                    choices: ['public-read', 'private'],
                    default: "private",
                    "message": "Select ACL"
                },
                {
                    type: "input",
                    name: "dirPath",
                    default: "dist",
                    "message": "Enter Source path"
                },
                {
                    type: "confirm",
                    name: "replaceIfExists",
                    default: true,
                    "message": "Replace contents if already exists (Default: YES)"
                }
            ])
    
            if (!fs.existsSync(dirPath)) {
                return console.error(`Source doesn't exists ${dirPath}`);
            }
    
            const prefix = dirPath.split('/').filter(i => !!i).pop();
            const fileForUploads = [];
            const recursiveDirMapper = (dPath, filePath) => {
                fs.readdirSync(dPath).forEach(item => {
                    const cpath = `${filePath}${item}`;
                    const rfPath = `${dPath}${item}`;
                    if (!item.includes('.')) {
                        // consider as folder
                        recursiveDirMapper(`${rfPath}/`, `${cpath}/`);
                    } else if (!item.startsWith('.')) {
                        const formData = new FormData();
                        formData.append('key', cpath);
                        formData.append('file', fs.createReadStream(rfPath), item)
                        fileForUploads.push(formData);
                    }
                })
            };
            // generate files for upload
            recursiveDirMapper(dirPath, `${prefix}/`);
            const connector = getBucketInfo(orgAndApp, {}, 'connector');
            console.log(`Total Files to upload: ${fileForUploads.length}`);
            httpClient('POST', '/v2/buckets/upload', Object.assign({
                startsWith: `${prefix}/`,
                bucket,
                acl,
                filesCount: fileForUploads.length
            }, connector), orgAndApp)
                .then(preAsignedAttrs => uploadFiles(preAsignedAttrs, fileForUploads))
        }
    }
    
    static async view(organisation, appName){
        const orgAndApp = await orgAndAppQuest(foJson, false, { organisation, appName });
        const bucketData = getBucketInfo(orgAndApp, null, 'buckets');
        const bucket = await selectBucket(bucketData);
        if (bucket) {
            const log = [`${bucket} Bucket Items`, ''];
            const selectedBucket = bucketData[bucket];
            if (!Object.keys(selectedBucket.contents).length) {
                await callCommand(orgAndApp, 'listObjects', {
                    Bucket: bucket
                }, ['Contents']).then(res => {
                    selectedBucket.totalFiles = res.Contents.length;
                    if (res.Contents) {
                        selectedBucket.contents = res.Contents.reduce((accum, content) => {
                            selectedBucket.size += parseInt(content.Size);
                            const splt = content.Key.split('/');
                            const key = splt.shift();
                            if (!accum[key]) {
                                accum[key] = {
                                    files: [],
                                    sizes: 0
                                }
                            }
    
                            // push contents
    
                            accum[key].files.push(content);
                            accum[key].sizes += parseInt(content.Size);
                            return accum;
                        }, {});
                    }
    
                    updateBucketData(orgAndApp, { buckets: bucketData }, false);
                });
            }
    
            Object.keys(selectedBucket.contents).forEach(key => {
                log.push(`|-- ${key} . Size ${utils.sizeConversion(selectedBucket.contents[key].sizes)}`);
                selectedBucket.contents[key].files.forEach(item => {
                    log.push(`|------ ${item.Key} . ${utils.sizeConversion(parseInt(item.Size))}`);
                })
                log.push('|')
            });
            console.log(log.join('\n'));
        }
    }
    
    static async list (organisation, appName){
        const orgAndApp = await orgAndAppQuest(foJson, false, { organisation, appName });
        const bucketData = getBucketInfo(orgAndApp, null, 'buckets');
        if (bucketData) {
            console.log(Object.keys(bucketData).map(name => `+ ${name} - ${bucketData[name].totalFiles || 0} items`).join('\n'))
        } else {
            console.log(`No data found`);
        }
    }
    
    static async load(organisation, appName){
        const orgAndApp = await orgAndAppQuest(foJson, false, { organisation, appName });
        const bucketInfo = getBucketInfo(orgAndApp, { connector: null, buckets: null });
        if (!bucketInfo.connector) {
            const regions = Object.values(regionsObj);
            const { region, endPoint } = await prompt([{
                type: "list",
                name: "region",
                choices: Object.values(regions),
                "message": "Select region"
            }, {
                type: "input",
                name: "endPoint",
                default: '',
                "message": "Endpoint"
            }]);
    
    
            // extend connector
            bucketInfo.connector = ({
                region: Object.keys(regionsObj)[regions.indexOf(region)],
                pathStyle: false,
                endPoint,
                useCredentials: true
            });
    
            // save the bucketData
            updateBucketData(orgAndApp, bucketInfo);
        }
    
        if (!bucketInfo.connector.region) {
            return console.error('No region defined, please try again.');
        }
    
        callCommand(orgAndApp, 'listBuckets', null, ['Buckets']).then(res => {
            bucketInfo.buckets = res.Buckets.reduce((accum, bucket) => {
                accum[bucket.Name] = {
                    contents: {},
                    size: 0,
                    totalFiles: 0,
                    created: bucket.CreationDate
                }
    
                return accum;
            }, {});
            updateBucketData(orgAndApp, bucketInfo);
            console.log(res.Buckets.map(bucket => `+ ${bucket.Name} - ${bucket.CreationDate}`).join('\n'))
        });
    }
}

module.exports = Buckets;