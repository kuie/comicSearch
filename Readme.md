# ComicSearch 漫画爬虫

## 项目目标

爬取一次后解析出关于网站全部可搜索到漫画列表

使用web交互构建可视化页面（50%）

网页点击重新获取列表将可以重新爬去漫画列表（后台功能已支持）

支持漫画名称模糊搜索（完成）

数据存储在浏览器本地数据库中

d

整体项目结构有待调整

项目使用本地存储进行流量优化

### 后台系统添加增量更新模式

主要通过对每条数据添加md5摘要值判断是否为相同数据

每次更新数据后更新版本号

浏览器每次请求时发送浏览器本地版本号获取增量更新

如版本号错误则放弃原数据重新加在新数据
