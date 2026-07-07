/**
 * Cloudflare Pages Function
 * 代理 /api/chat 请求到 HiAgent 平台，返回 SSE 流式响应
 *
 * 环境变量（在 Cloudflare Dashboard → Pages → 项目 → Settings → Environment Variables 中设置）：
 *   API_BASE_URL - HiAgent API 基础地址（如 https://agent.hit.edu.cn/api/proxy/api/v1）
 *   API_KEY      - HiAgent API 密钥
 */

export async function onRequest(context) {
  const { request, env } = context;

  // 只允许 POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Allow': 'POST' },
    });
  }

  const API_BASE = env.API_BASE_URL;
  const API_KEY = env.API_KEY;

  // 解析请求体
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { query, platform } = body;

  if (!query || typeof query !== 'string') {
    return new Response(JSON.stringify({ error: 'query is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = 'web_user_' + Math.random().toString(36).substring(2, 10);

  // Step 1: 创建会话
  let conversationId;
  try {
    const convResp = await fetch(`${API_BASE}/create_conversation`, {
      method: 'POST',
      headers: {
        Apikey: API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ UserID: userId }),
    });

    if (!convResp.ok) {
      const errText = await convResp.text();
      return new Response(
        JSON.stringify({ error: `Failed to create conversation: ${convResp.status} ${errText}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const convData = await convResp.json();
    conversationId = convData?.Conversation?.AppConversationID;

    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: 'Failed to get conversation ID from HiAgent' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Network error while creating conversation: ${err.message}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 构建完整查询
  const fullQuery = platform
    ? `【目标发布平台：${platform}】\n\n${query}`
    : query;

  // Step 2: 发起流式对话请求
  let chatResp;
  try {
    chatResp = await fetch(`${API_BASE}/chat_query_v2`, {
      method: 'POST',
      headers: {
        Apikey: API_KEY,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        AppConversationID: conversationId,
        Query: fullQuery,
        ResponseMode: 'streaming',
        UserID: userId,
      }),
    });

    if (!chatResp.ok) {
      const errText = await chatResp.text();
      return new Response(
        JSON.stringify({ error: `Chat API error: ${chatResp.status} ${errText}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Network error while calling chat API: ${err.message}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Step 3: 转换 SSE 流（将 HiAgent 的 SSE 格式转为前端需要的格式）
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // 在后台异步处理上游 SSE 流
  (async () => {
    try {
      const reader = chatResp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);

              if (data.event === 'message' && data.answer) {
                // 转发内容块给前端
                writer.write(
                  encoder.encode(`data: ${JSON.stringify({ content: data.answer })}\n\n`)
                );
              } else if (data.event === 'message_failed') {
                writer.write(
                  encoder.encode(`data: ${JSON.stringify({ error: '审查请求处理失败' })}\n\n`)
                );
              }
              // message_start / message_end / agent_thought / knowledge_retrieve 忽略，前端不需要
            } catch {
              // 跳过无法解析的行
            }
          }
        }
      }

      // 流结束标记
      writer.write(encoder.encode('data: [DONE]\n\n'));
    } catch (err) {
      writer.write(
        encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      );
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
