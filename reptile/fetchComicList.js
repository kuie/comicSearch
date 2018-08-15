//获取漫画列表数据
const http = require('http');
const path = require('path');
const fs = require('fs');
const util = require('util');
const iconv = require('iconv-lite');
const BufferHelper = require('bufferhelper');
const {fork} = require('child_process');
/*固定主域*/
const domain = 'http://www.cartoonmad.com';
/*最大遍历数量*/
const maxIndex = 10000;
/*起始点*/
let index = process.argv[2] - 0 || 1;
/*线程控制及最大线程数量*/
let threadNum = 0, maxThreadNum = process.argv[3] - 0 || 10;
/*超时重复次数*/
const maxTimeoutTimes = 5;
/*超时数组*/
const timeOutArray = [];
const errorHandle = (index, log) => {
    fs.appendFile(path.resolve('..', 'log', 'fetchListError.log'), `${new Date()}-->${log}-->${index};\n`, (err) => {
        if (err) throw err;
    });
    threadNum--;
    getUrl(index + maxThreadNum);
};
/*获取指定编码列表*/
const getUrl = (index) => {
    if (index >= maxIndex) {
        if (threadNum === 0) {
            util.log(`列表获取完毕`);
            let parse = fork('comicListParse.js');
            parse.on('message', m => {
                if (m.code === 200) {
                    util.log('comicList解析成功');
                } else {
                    util.log('comicList解析失败请手动解析');
                }
                process.exit(0);
            });
        }
        return false;
    }
    threadNum++;
    let i = index > 999 ? `${index}` : index > 99 ? `0${index}` : index > 9 ? `00${index}` : `000${index}`;
    /*请求页面文档*/
    http.get(`${domain}/comic/${i}.html`, res => {
        let bufferhelper = new BufferHelper();
        res.on('data', chunk => {
            bufferhelper.concat(chunk);
        });
        res.on('end', () => {
            const doc = iconv.decode(bufferhelper.toBuffer(), 'Big5');
            /*判断文档是否有效*/
            if (/meta/.test(doc)) {
                let testArr = doc.match(/\(\d+頁\)/g);
                if (testArr) {
                    const pageRegAll = new RegExp('<a href="?\/comic\/' + i + '\\d{8}001\\.html"?[ \\w="_]+>[第 ]+(\\d+)[ 話卷]+<\/a>&nbsp; ?<font[\\ #\\w="-:;]+>\\([&nbsp;]*?(\\d+)[頁页]\\)+<\/font>', 'g');
                    const pageReg = new RegExp('<a href="?\/comic\/' + i + '\\d{8}001\\.html"?[ \\w="_]+>[第 ]+(\\d+)[ 話卷]+<\/a>&nbsp; ?<font[\\ #\\w="-:;]+>\\([&nbsp;]*?(\\d+)[頁页]\\)+<\/font>');
                    let ar = doc.match(pageRegAll);
                    let pages = [];
                    if (ar) {
                        pages = ar.map((str) => {
                            const result = pageReg.exec(str);
                            return {
                                max: result[2],
                                label: result[1]
                            };
                        });
                    } else {
                        errorHandle(index, 'page匹配错误');
                    }
                    const linkReg = new RegExp(`\/comic\/${i}[0-9]+\.html`, 'g');
                    const comicUrlArray = doc.trim().replace(/.*<body>(.*)<\/body>.*/, '$1').match(linkReg);
                    const getHash = (url) => {
                        http.get(url, res => {
                            let data = '';
                            res.on('data', chunk => {
                                data += chunk.toString();
                            });
                            res.on('end', () => {
                                const reg = new RegExp(`img src="[\\w\\/:.]+${i}[\\w\\/:.]+"`);
                                let arr = data.match(reg);
                                if (arr) {
                                    const nameReg = new RegExp(`<a href=\/comic\/${i}\.html>(.+)<\\/a>`, 'g');
                                    const logoReg = new RegExp(`\/cartoonimg\/ctimg\/${i}\.jpg`, 'g');
                                    const desReg = new RegExp(`<meta name="description" content="(.*)">`, 'ig');
                                    const labelReg = /<a href=\/tag\.asp\?cm=[\u4e00-\u9fa5\w]+>([\u4e00-\u9fa5\w]+)<\/a>/g;
                                    const hash = arr[0].match(/\/\w+\/[0-9]{4}\//g)[0].replace(/\/(\w+)\/[0-9]{4}\//, '$1');
                                    const domainReg = new RegExp(`http:\/\/(.*)\/${hash}`);
                                    fs.appendFile(path.resolve('..', 'log', 'comicList.log'), `${JSON.stringify({
                                        index: i,
                                        logo: doc.match(logoReg) ? doc.match(logoReg)[0] : '',
                                        name: doc.match(nameReg) ? doc.match(nameReg)[0].replace(nameReg, '$1') : '',
                                        description: doc.match(desReg) ? doc.match(desReg)[0].replace(desReg, '$1') : '',
                                        label: doc.match(labelReg) ? doc.match(labelReg).map(val => val.replace(labelReg, '$1')) : [],
                                        hash,
                                        domain: data.match(domainReg)[0].replace(domainReg, '$1'),
                                        pages
                                    })};\n`, err => {
                                        if (err) throw err;
                                    });
                                    threadNum--;
                                    getUrl(index + maxThreadNum);
                                } else {
                                    util.log(`无效${url}`);
                                }
                            });
                        }).on('error', (err) => {
                            util.log('getHash', url, err.code);
                            getHash(url);
                        });
                    };
                    if (comicUrlArray[0]) {
                        getHash(`${domain}${comicUrlArray[0]}`);
                    } else {
                        util.log('comicUrlArray没有获取到', i);
                        return false;
                    }
                } else {
                    return errorHandle(index, '无版权');
                }
            } else {
                return errorHandle(index, '无数据');
            }
        });
    }).on('error', (err) => {
        threadNum--;
        if (err.code === 'ETIMEDOUT') {
            let matchArr = timeOutArray.join().match(new RegExp(`\b${index}\b`, 'g'));
            if (matchArr && matchArr.length === maxTimeoutTimes) {
                errorHandle(index, `${maxTimeoutTimes}次超时`);
                getUrl(index + maxThreadNum);
            } else {
                getUrl(index);
                timeOutArray.push(index);
            }
        } else {
            errorHandle(index, `${err.code}错误`);
            getUrl(index + maxThreadNum);
        }
    });
};
/*线程分发器*/
for (let i = 0; i < maxThreadNum; i++) {
    getUrl(index + i);
}
// getUrl(index);//单线程测试