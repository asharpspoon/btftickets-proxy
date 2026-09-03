// Vercel 单函数代理：纯查询参数路由，规避动态路径与 ESM 陷阱。
//   /api/proxy?kind=search&query=...&language=zh-CN
//   /api/proxy?kind=movie&id=123&language=zh-CN
//   /api/proxy?kind=credits&id=123
//   /api/proxy?kind=img&src=/abc.jpg&size=w342
// 注意：无 package.json，必须用 CommonJS（module.exports），export default 会加载崩溃。
// TMDb key 只存在于服务端环境变量 TMDB_API_KEY。
"use strict";

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const kind = req.query.kind || "";
  const apiKey = process.env.TMDB_API_KEY || "";
  const q = (k) => (req.query[k] === undefined ? "" : String(req.query[k]));

  async function sendUpstream(upstream) {
    const textBody = await upstream.text();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(upstream.status);
    if ((upstream.headers.get("content-type") || "").includes("application/json")) {
      res.setHeader("content-type", "application/json; charset=utf-8");
    }
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.send(textBody);
  }

  try {
    if (kind === "search") {
      const lang = q("language") || "zh-CN";
      const qs = new URLSearchParams({
        api_key: apiKey,
        query: q("query"),
        language: lang,
        include_adult: q("include_adult") || "false",
      });
      const upstream = await fetch(`https://api.themoviedb.org/3/search/movie?${qs}`);
      if (!upstream.ok) return sendUpstream(upstream);
      const data = await upstream.json();
      // 为前 8 条并行补导演 + 前两名主演（language=zh-CN 时 TMDb 有人名翻译，中文优先天然满足）
      const top = (data.results || []).slice(0, 8);
      const credits = await Promise.all(top.map(async (m) => {
        try {
          const r = await fetch(`https://api.themoviedb.org/3/movie/${m.id}/credits?api_key=${apiKey}&language=${encodeURIComponent(lang)}`);
          if (!r.ok) return null;
          return await r.json();
        } catch (e) { return null; }
      }));
      top.forEach((m, i) => {
        const c = credits[i];
        if (c) {
          m.director = (c.crew || []).find((x) => x.job === "Director")?.name || "";
          m.cast_top2 = (c.cast || []).slice(0, 2).map((x) => x.name);
        }
      });
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.status(200);
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      return res.send(JSON.stringify(data));
    }
    if (kind === "movie" || kind === "credits") {
      const id = q("id");
      const seg = kind === "movie" ? "" : "/credits";
      const qs = `?api_key=${encodeURIComponent(apiKey)}&language=${encodeURIComponent(q("language") || "zh-CN")}`;
      return sendUpstream(await fetch(`https://api.themoviedb.org/3/movie/${id}${seg}${qs}`));
    }
    if (kind === "img") {
      const src = q("src");
      const size = q("size") || "w342";
      const upstream = await fetch(`https://image.tmdb.org/t/p/${size}${src}`, { redirect: "follow" });
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.status(upstream.status);
      res.setHeader("content-type", upstream.headers.get("content-type") || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");
      return res.send(buf);
    }
    return res.status(400).json({ error: "unknown kind", kind: kind });
  } catch (e) {
    return res.status(502).json({ error: "upstream failed", detail: String(e) });
  }
};
