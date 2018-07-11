const chalk = require('chalk');
const ora = require('ora')
const clear = require('clear-console');
const log = console.log;

const fs = require('fs');
const util = require('util');

const mergeJSON = require("merge-json") ;
const axios = require('axios');

// Promisify file read event
fs.readFileAsync = function(filename) {
    return new Promise(function(resolve, reject) {
        fs.readFile(filename, {encoding: 'utf-8'}, function(err, data) {
            err ? reject(err) : resolve({filename: filename, data: data});
        });
    });
};

const promiseResolver = (obj) => {
    return Promise.resolve(obj);
}

const main = (paths) => {
    const spinner = ora("Processing ").start();
    let promises = [];
    if (paths instanceof Array) {
        paths.forEach(path => {
            promises.push(fs.readFileAsync(path));
        })
        Promise.all(promises).then(responses => {
            let processes = [];
            fs.truncate('result.csv', '', function(){
                log(chalk.magenta('file cleaning'));
            });
            var allKeys = [];
            responses.forEach(response => {
                //log('data of '+ response.filename);
                let json = JSON.parse(response.data);
                let dependencies = mergeJSON.merge(json.dependencies, json.devDependencies);
                let dependenciesKeys = Object.keys(dependencies);
                allKeys = allKeys.concat(dependenciesKeys);
            })
            log('Distinct dependencies in '+ chalk.magenta(paths.length) +' projects :', chalk.green(allKeys.length));
            let Keyset = new Set(allKeys);
            log('Total unique dependenencies :', chalk.green(Keyset.size));
            processDependencies(Keyset).then(result => {
                // let unique = getUniqueResults(result);
                let csvObject = convertJSON2CSV(result);
                return writeCSV(csvObject);
            }).then(() => {
                spinner.stopAndPersist({text: "All process completed"});
            }).catch(e => {
                spinner.stopAndPersist({text: "All process completed ==== " + e.stack});
            });
        }).catch(e => {
            spinner.stopAndPersist({text: "All process completed " + e.stack});
        })
    } else {
        log(chalk.magentaBright('All path should be part of an array of objects'));
    }
}

const processDependencies = (Keyset) => {
    return new Promise((resolve, reject) => {
        let promises = [];
        Keyset.forEach(element => {
            let axiosCall = axios.get("https://registry.npmjs.org/" + element);
            promises.push(axiosCall);
        });
        axios.all(promises).then(responses => {
            let jsonResult =[];
            for(let i=0; i<responses.length; i++) {
                let responseData = responses[i].data;
                jsonResult.push({
                    name: responseData._id,
                    license: responseData.license,
                    description: responseData.description.replace(/,/g, " "),
                    gitUrl: responseData.homepage
                })
            }
            resolve(jsonResult);
        }).catch(e => {
            reject(e);
        })
    })
}

const writeCSV = (csvObject) => {
    return new Promise((resolve, reject) => {
        fs.appendFile('result.csv', csvObject, function (err) {
            if (err) reject(err);
            log(chalk.green('File ')+ chalk.yellow('result.csv')+ chalk.green(' Saved!'));
            resolve(true);
        });
    })
}

const getUniqueResults = (result) =>{
    return result.reduce((x, y) => x.findIndex(e=>e.name==y.name)<0 ? [...x, y]: x, [])
}

const convertJSON2CSV = (objArray) => {
    var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    var str = '';
    for (var i = 0; i < array.length; i++) {
        if (i === 0) {
            let header = Object.keys(array[i]).join(',');
            str += header+'\n';
        }
        var line = '';
        for (var index in array[i]) {
            if (line != '') line += ','
            line += array[i][index];
        }
        str += line;
        if (i !== array.length -1 ) {
            str += '\n';
        }
    }
    return str;
}

exports.main = main;