# 离线单词练习

保留原完整学习前端：词卡、间隔复习、错题/收藏/笔记、选择/拼写测验、输入练习、进度统计、XP徽章、情景对照、主题、IndexedDB备份导入导出及PWA缓存。

全部12词与对话为新写的合成示例；不附原教材、题库、286张图片/录音、用户进度或个人身份。插画使用依赖库Lucide图标。语音仅允许系统离线英语声音，默认不自动播放；当前无语音设备时请使用文字练习。本轮无声音/UI权限操作。

需要Node22.12+及npm：

```bash
npm ci
npm test
npm run build
PORT=4173 npm start
```

浏览器打开本机对应端口。服务监听地址可由Vite参数配置，端口由PORT读取。学习记录仅保存在当前浏览器；导入备份会更新当前练习数据。替换词库请按src/types.ts的Word结构编辑src/data/words.json；情景同样使用显式JSON。无公司API或原文件路径依赖。源码采用 MIT 许可证，见 LICENSE；第三方依赖仍适用各自上游许可。

保留原界面与核心算法，不代表原教材/所有音频/真机PWA安装已验收。安装依赖需要包源，页面运行和功能测试使用本地合成数据。

## 静态服务与可选容器

`npm ci --ignore-scripts && npm test && npm run build` 后运行 `HOST=127.0.0.1 PORT=4173 npm start`。仅服务 dist 与 `/healthz`，学习记录仍由浏览器 IndexedDB 保存，服务端不接收或记录题库/学习数据。局域网部署显式设 `HOST=0.0.0.0`。复制 `.env.example` 为 `.env` 后，可用 `bash deploy.sh deploy|start|restart|stop|status|logs` 管理独立容器；主机和容器端口分别配置，`NODE_IMAGE` 可指定组织认可的镜像源。脚本不会改系统 Docker 配置。本轮验证为本机隔离构建及浏览器，未运行 Docker 或公司部署。

离线语音依赖设备已安装的本地语音；没有本地 voice 时不调用云端语音。单词卡与打字反馈默认不自动朗读，可在设置中启用。合成示例仅有12词，分类由实际词条计算。

Docker默认只向 `127.0.0.1` 发布端口；扩大监听需在显式环境中设置 `BIND_ADDRESS`，并按真实入口设置 `PUBLIC_ORIGIN` 和访问保护。脚本不自动提供认证。
