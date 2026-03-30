// 你自己设置的密码（给朋友用的 KEY）
const YOUR_SECRET_KEY = "sk-abcdefg123456789";
// 官方模型的密钥（去 Google AI Studio 拿）
const GEMINI_API_KEY = "AIzaSy..."; // 这里填你自己的 Gemini 密钥
export default async function handler(req, res) {
  try {
    // 验证密码
    const auth = req.headers.authorization?.replace("Bearer ", "");
    if (!auth || auth !== YOUR_SECRET_KEY) {
      return res.status(401).json({
        error: "请输入正确的密钥（你自己设的密码）"
      });
    }

    const { model, messages, stream } = req.body;
    if (!model) return res.status(400).send("缺少 model");

    // ======================
    // 全官方直线路由（良心版）
    // ======================
    let targetUrl = "";
    let headers = { ...req.headers };

    // Claude 官方直连
    if (model.startsWith("claude")) {
      targetUrl = "https://api.anthropic.com" + req.url;
    }
    // Grok 官方直连
    else if (model.startsWith("grok")) {
      targetUrl = "https://api.x.ai" + req.url;
    }
    // Gemini 官方直连
    else if (model.startsWith("gemini")) {
      targetUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:streamGenerateContent?key=${GEMINI_API_KEY}`;

    }
    // 不支持的模型
    else {
      return res.status(400).send("仅支持 claude / grok / gemini");
    }

    // 流式传输（一字一字蹦）
    if (stream) {
      headers["Content-Type"] = "text/event-stream; charset=utf-8";
      headers["Cache-Control"] = "no-cache";
      headers["Connection"] = "keep-alive";
    }

    // 转发请求（官方直连，满血，不截短，不掺水）
    const proxyResponse = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method === "POST" ? JSON.stringify(req.body) : undefined
    });

    // 抗截断 + 流式透传
    if (stream && proxyResponse.body) {
      res.writeHead(proxyResponse.status, headers);
      proxyResponse.body.pipe(res);
      return;
    }

    // 普通返回
    const data = await proxyResponse.json();
    res.status(proxyResponse.status).json(data);

  } catch (err) {
    res.status(500).send("服务错误：" + err.message);
  }
}
