const envVar = require('../env');
/**
 * variable --env.default=prod|local
 * variable --env.local.apiHosts=""
 */
class Config {
    static async set(){
        if (envVar.args.env) {
            const userDefined = envVar.getConfig();
            Object.keys(envVar.args.env).forEach(key => {
                if (typeof envVar.args.env[key] === 'object') {
                    userDefined[key] = Object.assign(userDefined[key] || {}, envVar.args.env[key]);
                } else {
                    userDefined[key] = envVar.args.env[key];
                }
            });
    
            envVar.setConfig(userDefined);
        }
    }
    
    static async list(current){
        const userDefined = current ? envVar.config : envVar.getConfig();
        const flatten = [];
        Object.keys(userDefined).forEach(key => {
            if (typeof userDefined[key] === 'object') {
                Object.keys(userDefined[key]).forEach(ckey => {
                    flatten.push(`env.${key}.${ckey} = ${userDefined[key][ckey]}`)
                })
            } else {
                flatten.push(`env.${key} = ${userDefined[key]}`)
            }
        });
    
        console.log(flatten.join('\n'));
    }
    
    static async unset(){
        const userDefined = envVar.getConfig();
        if (envVar.args.env && userDefined[envVar.args.env]) {
            delete userDefined[envVar.args.env];
            envVar.setConfig(userDefined);
        }
    }
}

module.exports = Config;
