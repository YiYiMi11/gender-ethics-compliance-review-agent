require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE = process.env.API_BASE_URL;
const API_KEY = process.env.API_KEY;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function ts() {
  return new Date().toISOString();
}

function logPhase(reqId, phase, detail) {
  console.log(`[${ts()}] [${reqId}] ${phase}${detail ? ' | ' + detail : ''}`);
}

async function hiagentRequest(endpoint, body, reqId) {
  const url = `${API_BASE}${endpoint}`;
  logPhase(reqId, 'REQUEST_START', `${endpoint} body=${JSON.stringify(body).substring(0, 200)}`);
  const startMs = Date.now();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Apikey': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const elapsed = Date.now() - startMs;

  if (!response.ok) {
    const text = await response.text();
    logPhase(reqId, 'REQUEST_FAILED', `${endpoint} status=${response.status} elapsed=${elapsed}ms body=${text.substring(0, 300)}`);
    throw new Error(`HiAgent API error ${response.status}: ${text}`);
  }

  logPhase(reqId, 'REQUEST_OK', `${endpoint} status=${response.status} elapsed=${elapsed}ms`);
  return response;
}

let reqCounter = 0;

app.post('/api/chat', async (req, res) => {
  const reqId = 'REQ-' + String(++reqCounter).padStart(4, '0');
  const totalStartMs = Date.now();

  try {
    const { query, platform } = req.body;

    logPhase(reqId, 'INCOMING', `query="${(query || '').substring(0, 80)}" platform="${platform || ''}"`);

    if (!query || typeof query !== 'string') {
      logPhase(reqId, 'VALIDATION_FAIL', 'query is empty or not a string');
      return res.status(400).json({ error: 'query is required' });
    }

    const userId = 'web_user_' + Math.random().toString(36).substring(2, 10);
    logPhase(reqId, 'USER_ID', userId);

    // Step 1: create conversation
    const convStartMs = Date.now();
    const convResp = await hiagentRequest('/create_conversation', { UserID: userId }, reqId);
    const convData = await convResp.json();
    const conversationId = convData?.Conversation?.AppConversationID;
    logPhase(reqId, 'CONVERSATION_CREATED', `id=${conversationId} elapsed=${Date.now() - convStartMs}ms`);

    if (!conversationId) {
      logPhase(reqId, 'CONVERSATION_FAIL', `response=${JSON.stringify(convData).substring(0, 300)}`);
      throw new Error('Failed to create conversation: ' + JSON.stringify(convData));
    }

    // Step 2: build query
    const fullQuery = platform
      ? `【目标发布平台：${platform}】\n\n${query}`
      : query;
    logPhase(reqId, 'QUERY_BUILT', `fullQuery length=${fullQuery.length}`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Step 3: chat query v2 (streaming)
    const chatStartMs = Date.now();
    logPhase(reqId, 'CHAT_START', `calling chat_query_v2`);

    const chatResp = await fetch(`${API_BASE}/chat_query_v2`, {
      method: 'POST',
      headers: {
        'Apikey': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        AppConversationID: conversationId,
        Query: fullQuery,
        ResponseMode: 'streaming',
        UserID: userId,
      }),
    });

    logPhase(reqId, 'CHAT_RESPONSE_RECEIVED', `status=${chatResp.status} elapsed=${Date.now() - chatStartMs}ms`);

    if (!chatResp.ok) {
      const errText = await chatResp.text();
      logPhase(reqId, 'CHAT_FAILED', `status=${chatResp.status} body=${errText.substring(0, 300)}`);
      throw new Error(`chat_query_v2 error ${chatResp.status}: ${errText}`);
    }

    // Step 4: stream SSE data
    const streamStartMs = Date.now();
    const reader = chatResp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;
    let contentCharCount = 0;

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
              chunkCount++;
              contentCharCount += data.answer.length;
              res.write(`data: ${JSON.stringify({ content: data.answer })}\n\n`);
            } else if (data.event === 'message_end') {
              logPhase(reqId, 'CHAT_MESSAGE_END', `task_id=${data.task_id || ''} id=${data.id || ''}`);
              res.write(`data: ${JSON.stringify({ content: '' })}\n\n`);
            } else if (data.event === 'message_start') {
              logPhase(reqId, 'CHAT_MESSAGE_START', `task_id=${data.task_id || ''}`);
            } else if (data.event === 'message_failed') {
              logPhase(reqId, 'CHAT_MESSAGE_FAILED', `task_id=${data.task_id || ''}`);
              res.write(`data: ${JSON.stringify({ error: '审查请求处理失败' })}\n\n`);
            } else if (data.event === 'agent_thought') {
              logPhase(reqId, 'CHAT_AGENT_THOUGHT', `thought=${(data.answer || '').substring(0, 100)}`);
            } else if (data.event === 'knowledge_retrieve') {
              logPhase(reqId, 'CHAT_KNOWLEDGE_RETRIEVE', '');
            }
          } catch (e) {
            logPhase(reqId, 'CHAT_PARSE_WARN', `unparseable: ${trimmed.substring(0, 100)}`);
          }
        }
      }
    }

    const streamElapsed = Date.now() - streamStartMs;
    logPhase(reqId, 'STREAM_DONE', `chunks=${chunkCount} chars=${contentCharCount} elapsed=${streamElapsed}ms`);

    res.write('data: [DONE]\n\n');
    res.end();

    logPhase(reqId, 'REQUEST_COMPLETE', `total_elapsed=${Date.now() - totalStartMs}ms`);
  } catch (error) {
    logPhase(reqId, 'REQUEST_ERROR', `error="${error.message}" total_elapsed=${Date.now() - totalStartMs}ms`);
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to get response from API: ' + error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`[${ts()}] Server running at http://localhost:${PORT}`);
  console.log(`[${ts()}] API_BASE=${API_BASE}`);
  console.log(`[${ts()}] API_KEY=${API_KEY.substring(0, 6)}...`);
});
