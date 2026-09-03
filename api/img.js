// Vercel 图片代理：转发 TMDb 海报图床（image.tmdb.org），国内可稳定访问。
// 用法：GET <部署域名>.vercel.app/api/img?path=/t/p/w342/aBcD123.jpg&size=w342
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const path = req.query.path || "";
  const size = req.query.size || "w342";
  const target = `https://image.tmdb.org/t/p/${size}${path}`;

  try {
    const upstream = await fetch(target, { redirect: "follow" });
    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    res.setHeader("content-type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    return res.send(buf);
  } catch (e) {
    return res.status(502).end();
  }
}
