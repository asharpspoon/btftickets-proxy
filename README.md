# TMDb 免费代理（部署到 Vercel）

为「OCR 片名 → 查电影资料」提供中转：TMDb API 在国内大陆直连不稳定，部署到 Vercel 全球边缘节点后走你的域名即可稳定访问。同时转发了海报图床 `image.tmdb.org`（国内可能也连不上）。

## 目录

```
proxy/
└── api/
    └── proxy.js   # 唯一函数：kind 查询参数区分 search / movie / credits / img
```

## 接口（单级路径 + 查询参数，无动态路由）

* 搜片名：`GET <域名>/api/proxy?kind=search&query=星际穿越&language=zh-CN`
* 电影详情：`GET <域名>/api/proxy?kind=movie&id=157336&language=zh-CN`
* 演职员：`GET <域名>/api/proxy?kind=credits&id=157336`
* 海报图：`GET <域名>/api/proxy?kind=img&src=/spQm5....jpg&size=w342`

## 部署步骤（5 分钟，免费）

1. 准备 TMDB key：<https://www.themoviedb.org/settings/api> 免费申请（选 Developer / 个人用途）。
2. 本文件夹推到 GitHub，再到 <https://vercel.com/new> 导入该仓库（Framework 选 Other）。
3. Vercel 项目「Settings → Environment Variables」新增：`TMDB_API_KEY` = 你的 v3 key。
4. **关掉部署保护**：「Settings → Deployment Protection」改为 Disabled（默认的 Vercel Authentication 会要求登录，App 匿名请求会被登录墙挡住）。
5. 用 **Overview 页的生产域名**（形如 `<project>-<team>.vercel.app`，不带部署 ID）填进 App。

## 踩坑记录（为什么不是别的写法）

1. **多级路径 catch-all 失败**：`api/tmdb/[[...path]].js` 与根级 `api/[[...path]].js` 在 Vercel 上都只匹配单级路径（`/api/foo` 通，`/api/a/b` 404）。→ 改用单级 `api/proxy.js` + `?kind=` 查询参数。
2. **ESM 加载崩溃**：仓库无 `package.json`，`.js` 按 CommonJS 解析，`export default` 导致函数每次调用 500 FUNCTION_INVOCATION_FAILED。→ 必须用 `module.exports`。
3. **别测部署专属域名**：每次部署生成新 URL（含部署哈希，如 `-5tijkbr9z-`），旧 URL 永远指向旧部署。验证和 App 配置一律用生产域名。
4. **vercel.json 的 `copyright` 字段**会被 schema 校验拒绝（Invalid request）。

## 回到 App

生产域名填到 `TicketSpike/Services/MovieInfoService.swift` 的 `proxyBase`。

> 免费层配额参考：TMDb 约 40 req/10s 软限；Vercel Hobby 有函数次数限制，个人票夹使用足够。数据展示时按 TMDb 条款在页脚带一行「数据来源：TMDB」署名。
