const env = require('./core/env');
const commandName = env.args._[2];
const actionName = env.args._[3];
const otherArgs = env.args._.slice(4);
const scriptPath = `./core/actions/${commandName}`;
try {
    const cmd = require(scriptPath);
    const isFn = typeof cmd == 'function';
    if (!isFn) {
        if (!cmd[actionName]) {
            console.error(`${actionName} does not exist please try the following options: ${Object.keys(cmd)}`);
            throw null;
        }
        cmd[actionName].apply(cmd, otherArgs);
    } else if (isFn) {
        cmd.call(null, actionName);
    } else {
        console.error(`please try the following options: ${Object.keys(cmd)}`);
    }
} catch (e) {
    const actionList = ['app', 'config', 'editor', 'fn', 'login', 'logs', 'org', 'serve', 'sites'];
    console.log(`command (${commandName}) fail to run \n list of available commands ${actionList.join('|')}`);
}