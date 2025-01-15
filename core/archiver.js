const fs = require('fs');
const archiver = require('archiver');

module.exports = (config) => {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(config.filePath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });
        const sourceDir = config.dirPath || 'dist';
        const destPath = config.destPath || 'dist';
        
        if (!fs.existsSync(sourceDir)){
            throw new Error(`Source doesn't exists ${sourceDir}`);
        }

        // check if file will be written into same dest
        if (config.filePath.includes(sourceDir)){
            return reject(`Cannot write into destination folder, please change file path`);
        }

        output.on('close', function() {
            console.log(archive.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has closed.');
            resolve(true);
        });
        
        archive.on('warning', function(err) {
            if (err.code === 'ENOENT') {
                // log warning
                console.warn(err);
            } else {
                // throw error
                reject(err);
            }
        });

        archive.pipe(output);
        archive.on('error', reject);
        // append all in dist folder
        archive.directory(sourceDir, destPath);
        archive.finalize();
    })
}