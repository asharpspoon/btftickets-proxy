# TMDb 免费代理（部署到 Vercel）

为「OCR 片名 → 查电影资料」提供中转：TMDb API 在国内大陆直连不稳定，部署到 Vercel 全球边缘节点后走你的域名即可稳定访问。同时转发了海报图床 `image.tmdb.org`（国内可能也连不上）。

## 目录

```
proxy/
├── api/
│   ├── tmdb/[[...path]].js   # TMDb API 转发，隐藏私钥
│   └── img.js                # 海报图片转发
└── vercel.json
```

## 部署步骤（5 分钟，免费）

1. 准备 TMDB key：到 https://www.themoviedb.org/settings/api 免费申请（选 Developer）。
2. 用 Vercel 部署此文件夹。
3. 在 Vercel 项目「Settings → Environment Variables」新增 `TMDB_API_KEY`（你的 v3 API key）。
4. 部署完成后得到域名，例如 `https://mytickets-xxxx.vercel.app`。

## 使用

- 查电影（客户端拿不到 key）：`GET <域名>/api/tmdb/search/movie?query=星际穿越&language=zh-CN`
- 拿演职员：`GET <域名>/api/tmdb/movie/{id}/credits`
- 拿海报：`GET <域名>/api/img?path=/t/p/w342/xxxx.jpg&size=w342`

> 免费层配额参考：TMDb 约 40 req/10s 软限；展示数据时按 TMDb 条款在页脚带一行「数据来源：TMDB」署名。
