//下载漫画 根据index值
const { exec } = require('child_process');
let http = require('http');
const fs = require('fs');
const path = require('path');
const util = require('util');
let domain = 'http://www.cartoonmad.com';
let comicNumber = process.argv[2];
let url = `${domain}/comic/${comicNumber}.html`;
let imgUrlArray = [];
const comicName = process.argv[3] || process.argv[2];
const maxNum = 6;
let num = 0, len;
// 下载图片
const downloadImage = (index) => {
	const url = imgUrlArray[index];
	num++;
	http.get(url, img => {
		const nameArr = url.split('/');
		img.setEncoding('binary');//二进制（binary）
		let image = '';
		img.on('data', (imgFlag) => {
			image += imgFlag;
		});
		img.on('end', () => {
			image = image.toString();
			let filePath = path.resolve('.', comicName, `${nameArr[5]}-${nameArr[6]}`);
			fs.writeFile(filePath, image, 'binary', (err) => {
				if (err) {
					throw err;
				}
				util.log(`${filePath}存储成功`);
				num--;
				index += maxNum;
				index < len ? downloadImage(index) : (() => {

				})();
			});
		});
	}).on('error', (err) => {
		util.log('getImg', url, err.code);
		num--;
		downloadImage(index);
	});
};
//补0
const toFixed3 = n => {
	return n < 10 ?
		`00${n}` :
		n < 100 ?
			`0${n}` :
			`${n}`;
};
//抓取每一集第一页
const getPage = (url, max) => {
	http.get(url, res => {
		let data = '';
		res.on('data', chunk => {
			data += chunk.toString();
		});
		res.on('end', () => {
			let reg = new RegExp(`img src="[\\w\\/:.]+${comicNumber}[\\w\\/:.]+"`);
			let arr = data.match(reg);
			if (arr) {
				imgUrl = arr[0].replace(/.*"(.*)"/, '$1');
				let iarr = [];
				for (let i = 1; i <= max; i++) {
					iarr[i - 1] = imgUrl.replace(/\d{3}\.jpg$/, `${toFixed3(i)}.jpg`);
				}
				imgUrlArray = imgUrlArray.concat(iarr);
			} else {
				util.log(`无效${url}`);
			}
		});
	}).on('error', (err) => {
		util.log('getPage', url, err.code);
		getPage(url, max);
	});
};
//获取整部漫画所有集
const getList = url => {
	http.get(url, sres => {
		let data = '';
		sres.on('data', chunk => {
			data += chunk.toString();
		});
		sres.on('end', () => {
			const reg = new RegExp(`\/comic\/${comicNumber}[0-9]+\.html`, 'g');
			let pages = data.match(/\(\d+..\)/g).map(page => page.replace(/^\((\d+)..\)$/, '$1'));
			let comicUrlArray = data.trim().replace(/.*<body>(.*)<\/body>.*/, '$1').match(reg);
			let index = 0;
			let t = setInterval(() => {
				if (comicUrlArray[index]) {
					getPage(`${domain}${comicUrlArray[index]}`, pages[index + 1]);
					index++;
				} else {
					fs.access(path.resolve('.', comicName), fs.constants.F_OK, (err) => {
						err && fs.mkdirSync(path.resolve('.', comicName));
					});
					clearInterval(t);
					len = imgUrlArray.length;
					util.log(`目录加载完毕共${index}集，共${len}页`);
					/*启动下载器*/
					for (let i = 0; i < maxNum; i++) {
						i < len && downloadImage(i);
					}
				}
			}, 500);
		});
	}).on('error', (err) => {
		util.log('getList', err);
	});
};
getList(url);
