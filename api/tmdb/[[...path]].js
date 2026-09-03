// Vercel Serverless 代理：转发 TMDb v3 请求，隐藏私钥。
// 用法：GET <部署域名>.vercel.app/api/tmdb/<tmdb路径>?<参数>
// 例  : <部署域名>.vercel.app/api/tmdb/search/movie?query=星际穿越&language=zh-CN
// 私钥从部署环境变量 TMDB_API_KEY 读取，客户端永远拿不到。
export default async function handler(req, res) {
  const apiKey = process.env.TMDB_API_KEY || "";
  // 处理 CORS 预检
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

  const { path = [], ...rest } = req.query; // path = URLs 里 /api/tmdb/ 之后的段
  const qs = new URLSearchParams(rest);
  qs.set("api_key", apiKey);
  const target = `https://api.themoviedb.org/3/${path.join("/")}?${qs.toString()}`;

  try {
    const upstream = await fetch(target, { redirect: "follow" });
    const contentType = upstream.headers.get("content-type") || "";
    const body =
      typeof upstream.body !== "undefined"
        ? await upstream.text()
        : "";

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(upstream.status);
    if (contentType.includes("application/json")) {
      res.setHeader("content-type", "application/json; charset=utf-8");
    } else {
      res.setHeader("content-type", contentType || "text/plain");
    }
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.send(body);
  } catch (e) {
    return res
      .status(502)
      .json({ error: "upstream fetch failed", path: path.join("/"), detail: String(e) });
  }
}
