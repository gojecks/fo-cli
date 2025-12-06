#!/usr/bin/env node
const env = require('./core/env');
const { orgAndAppQuest } = require('./core/prompt');
const commandName = env.args._[2];
let otherArgs = env.args._.splice(3);
const scriptPath = `./core/actions/${commandName}`;

const main = async () => {
    try {
        if(!commandName) throw new Error(`Invalid command`);
        const cmd = require(scriptPath);
        let fn = otherArgs.length ? cmd : null;
        const len = otherArgs.length;
        let methodName = '';
        for (let i = 0; i < len; i++) {
            methodName = otherArgs[i];
            fn = fn && fn[methodName];
            if (typeof fn == 'function') {
                otherArgs = otherArgs.slice(i + 1);
                break;
            }
        }

        if (typeof fn != 'function') {
            const options = Object.keys(cmd?.withInstance.action || {});
            if (methodName)
                console.error(`Missing action or action does not exist <${methodName}>.`);
            console.log(`Please try command with any of the following options:\n${options.map(c => `focli ${commandName} ${c}`).join('\n')}`);
            return;
        }

        // trigger instance
        let orgAndApp = null;
        if (cmd.withInstance) {
            console.log(`select env instance`);
            if (!cmd.withInstance.skip.includes(methodName)) {
                orgAndApp = await orgAndAppQuest(cmd.withInstance.action[methodName], { organisation: otherArgs.shift(), appName: otherArgs.shift() });
                otherArgs.unshift(orgAndApp);
            }
        }

        fn.apply(cmd, otherArgs);
    } catch (e) {
        console.log(e.message)
        const actionList = ['app', 'config', 'editor', 'fn', 'login', 'logs', 'org', 'serve', 'sites', 'db'];
        console.log(`failed to run command (${commandName})  \n list of available commands \n > ${actionList.map(t => `focli ${t}`).join('\n> ')}`);
    }
};

main();
