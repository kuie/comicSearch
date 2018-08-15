//漫画列表日志解析
const path = require('path');
const fs = require('fs');
const util = require('util');
let chineseConv = require('chinese-conv');
const filePath = path.resolve('..', 'log', 'comicList.log');
let logData = '';
const read = fs.createReadStream(filePath);
read.on('data', data => {
    logData += data.toString();
});
read.on('end', () => {
    let list = logData.split(';\n');
    list = list.splice(0, list.length - 1).map(val => JSON.parse(val)).sort((a, b) => a.index - b.index);
    list.map(val => {
        val.name = chineseConv.sify(val.name);
        val.description = chineseConv.sify(val.description);
        val.label = val.label.map(v => chineseConv.sify(v));
        return val;
    });
    fs.appendFile(path.resolve('.', 'public', 'json', 'comicList.json'), JSON.stringify({list}), err => {
        if (err) {
            process.send({code: 0});
            fs.appendFile(path.resolve('..', 'log', 'fetchListError.log'), `${new Date()}-->列表解析失败-->${err.code};\n`, (err) => {
                if (err) throw err;
            });
            throw err;
        } else {
            process.send({code: 200});
        }
    });
});