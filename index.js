const env = require('./core/env');
const commandName = env.args._[2];
const actionName = env.args._[3];
const scriptPath = `./core/actions/${commandName}`;
try {
    const cmd = require(scriptPath);
    if (actionName) {
        if (!cmd[actionName]) {
            console.error(`${actionName} does not exist please try the following options: ${Object.keys(cmd)}`);
            throw null;
        }
        cmd[actionName]();
    } else if (typeof cmd == 'function') {
        cmd();
    } else {
        console.error(`please try the following options: ${Object.keys(cmd)}`);
    }
} catch (e) {
    console.log(`command (${commandName}) fail to run`);
}