importScripts('/javascripts/DB/dexie.js');
let db = new Dexie('comic_book_db');
db.version(1).stores({comic: '++id,index,name'});
// const openDB = (fun, db) => {
//     new Promise((resolve, reject) => {
//         db.isOpen()
//     });
// };
onmessage = res => {
    switch (res.data[1]) {
        /*更新数据*/
        case 'update':
            db
                .open()
                .then(() => db.comic.bulkPut(res.data[2]))
                .then(lastId => postMessage({code: 200, msg: `新增数据：${lastId}条`, type: res.data[1]}))
                .catch(e => console.log(e));
            break;
        /*删除部分数据*/
        case 'delAll':
            db.comic
                .clear()
                .then(() => postMessage({code: 200, msg: '数据已清除', type: res.data[1]}))
                .catch(e => console.log(e));
            break;
        case 'del':
            db
                .open()
                .then(db => db.comic
                    .where('index').equals(res.data[2])
                    .delete()
                    .catch(e => {
                        console.log(e);
                        postMessage({code: 0, msg: '打开数据库失败2', list: [], type: res.data[1]});
                    })
                )
                .catch(e => {
                    console.log(e);
                    postMessage({code: 0, msg: '打开数据库失败', list: [], type: res.data[1]});
                });
            break;
        case 'search':
            db
                .open()
                .then(db => {
                    db.comic
                        .filter(comic => new RegExp(`${res.data[2]}`, 'i').test(comic.name))
                        .toArray(list => postMessage({
                            code: 200,
                            msg: `搜索到：${count.length}条`,
                            type: res.data[1],
                            list
                        }))
                        .catch(e => {
                            console.log(e);
                            postMessage({code: 0, msg: '数据库搜索错误', list: [], type: res.data[1]});
                        });
                })
                .catch(e => console.log(e));

            break;
        case 'pageList':
            let page = res.data[2], size = res.data[3],
                start = 1 + (page - 1) * size, end = 1 + page * size;
            db
                .open()
                .then(db => db.comic
                    .where('id')
                    .between(start, 1100000, true, false).limit(size)
                    .toArray(list => postMessage({code: 200, type: res.data[1], list}))
                    .catch(e => {
                        console.log(e);
                        postMessage({code: 0, msg: '打开数据库失败2', list: [], type: res.data[1]});
                    })
                )
                .catch(e => {
                    console.log(e);
                    postMessage({code: 0, msg: '打开数据库失败', list: [], type: res.data[1]});
                });
    }
};