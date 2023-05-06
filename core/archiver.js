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

        output.on('close', function() {
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

        archive.on('error', function(err) {
            reject(err);
        });

        archive.pipe(output);
        // append all in dist folder
        archive.directory(sourceDir, destPath);
        archive.finalize();
    })
}