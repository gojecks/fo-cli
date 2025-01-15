const env = require('./core/env');
const commandName = env.args._[2];
let otherArgs = env.args._.splice(3);
const scriptPath = `./core/actions/${commandName}`;

try {
    const cmd = require(scriptPath);
    const isFn = typeof cmd == 'function';
    if (!isFn) {
        let fn = otherArgs.length ? cmd : null;
        const len = otherArgs.length;
        for(let i=0; i<len; i++) {
            const arg = otherArgs[i];
            fn = fn && fn[arg];
            if (typeof fn == 'function'){ 
                otherArgs = otherArgs.slice(i+1);
                break;
            }
        }

        if (typeof fn != 'function') {
            console.error('Missing action or action does not exist.');
            console.log(`Please try command with any of the following options:\n${Object.keys(fn || cmd).join('\n')}`);
            return;
        }

        fn.apply(cmd, otherArgs);
    } else if (isFn) {
        cmd.apply(cmd, otherArgs);
    } else {
        console.error(`please try the following options: ${Object.keys(cmd)}`);
    }
} catch (e) {
    const actionList = ['app', 'config', 'editor', 'fn', 'login', 'logs', 'org', 'serve', 'sites', 'db'];
    console.log(`failed to run command (${commandName})  \n list of available commands \n${actionList.join('\n')}`);
}