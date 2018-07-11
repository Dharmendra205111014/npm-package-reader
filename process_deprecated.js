const fs = require('fs');
const path = require('path');

const chalk = require('chalk');
const ora = require('ora')
const clear = require('clear-console');
const log = console.log;

const mergeJSON = require("merge-json") ;
const axios = require('axios');
const spinner = ora("Process start ");

var jsonResult = [];
//var filePath = './package.json' // your absolute path
//var filePath = '/Users/dharmendra.s/Documents/repos/zwe-single-sign-on/package.json'

const readFileAndProcess = (filePath) => {
    // const spinner = ora();
    // spinner.start('Updating for ' +filePath);
    fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
        if (!err) {
            let json = JSON.parse(data);
            let dependencies = mergeJSON.merge(json.dependencies, json.devDependencies);
            let dependenciesKey = Object.keys(dependencies);
            let index =0;
            var csvObject = '\n';
            getcompleteNpmData(dependenciesKey,spinner);
        } else {
            console.log(err);
        }
    });
}

const getcompleteNpmData = (npmKeys,spinner) => {
    let promises = [];
    var csvObject = 'name,license,description,gitUrl\n';
    npmKeys.forEach(element => {
        let axiosCall = axios.get("https://registry.npmjs.org/"+element);
        promises.push(axiosCall);
    });
    axios.all(promises).then(responses => {
        for(let i=0; i<responses.length; i++) {
            let responseData = responses[i].data;
            let id = responseData._id;
            let license = responseData.license;
            let description = responseData.description.replace(/,/g, " ");
            let gitUrl = responseData.homepage;
            //csvObject += id +','+license+','+description+','+gitUrl+'\n';
            jsonResult.push({
                name:id,
                license:license,
                description:description,
                gitUrl:gitUrl
            })
        }
        fs.truncate('result.csv', '', function(){
            //log(chalk.red('file cleaning'))
        });
        jsonResult = getUniqueResults(jsonResult);
        console.log("Total dependency => ", jsonResult.length);
        writeCSV(csvObject);
    }).catch(e => {
        //console.log(e);
    })
}

const writeCSV = () => {
    let unique = getUniqueResults(jsonResult);
    let csvObject = convertJSON2CSV(unique);
    fs.appendFile('result.csv', csvObject, function (err) {
        if (err) throw err;
        log(' => '+chalk.green('Saved!'));
        // spinner.stop();
    });
}


const convertCSV2JSON = (csvString) => {
    //log(chalk.green('converting CSV to json'));
    let lines = csvString.split('\n'), result = [], header=[];
    lines.forEach((line, index) => {
        if (index === 0) {
            header = line.split(',');
        } else {
            let obj = {}, currentLine = line.split(',');
            header.forEach((head, index) => {
                obj[head] = currentLine[index];
            });
            result.push(obj);
        }
    });
    //log(chalk.green('CSV to json converted'));
    return result;
};

const convertJSON2CSV = (objArray) => {
    //log(chalk.blue('converting JSON to CSV'));
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
    //log(chalk.blue('JSON to CSV converted'));
    return str;
}

const getUniqueResults = (result) =>{
    return result.reduce((x, y) => x.findIndex(e=>e.name==y.name)<0 ? [...x, y]: x, [])
}

exports.readFileAndProcess = readFileAndProcess;
exports.convertJSON2CSV = convertJSON2CSV;
exports.convertCSV2JSON = convertCSV2JSON;
exports.init = () => {
    clear();
    fs.truncate('result.csv', '', function(){log(chalk.yellow('file cleaned'))})
}
exports.write = () => {
    console.log(jsonResult);
}