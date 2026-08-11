/**
 * voice‑mcp
 *
 * An MCP server for AI voice synthesis with inline audio player.
 * Supports ElevenLabs TTS‑v3 API with custom cloned voice.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "agents/mcp";
import { z } from "zod";

export interface Env {
	ELEVEN_API_KEY: string;
	VOICE_ID: string;
	MODEL_ID?: string;
	BOT_NAME?: string;
}

// Audio Player HTML UI
const AUDIO_PLAYER_HTML = `
<div style="width:100%;max-width:420px;padding:14px;background:#18181b;border-radius:14px;font-family:-apple-system,system-ui">
  <div style="display:flex;align-items:center;gap:12px">
    <button onclick="let a=this.nextElementSibling;a.paused?a.play():a.pause()" style="width:42px;height:42px;border-radius:50%;border:none;background:#6366f1;color:white;font-size:18px;cursor:pointer">▶</button>
    <audio controls style="flex:1;height:36px">
  </div>
  <div id="transcript" style="margin-top:10px;font-size:13px;color:#a1a1aa;white-space:pre-wrap"></div>
</div>
`;

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const server = new McpServer({
			name: env.BOT_NAME ?? "Voice‑Speaker",
			version: "1.0.0",
		});

		server.tool(
			"speak",
			"生成语音朗读给定文本，返回可播放音频组件",
			{
				text: z.string().describe("需要转语音的文字内容"),
			},
			async ({ text }) => {
				const ttsRes = await fetch(
					`https://api.elevenlabs.io/v1/text-to-speech/${env.VOICE_ID}`,
					{
						method: "POST",
						headers: {
							"xi-api-key": env.ELEVEN_API_KEY,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							text: text,
							model_id: env.MODEL_ID ?? "eleven_v3",
							voice_settings: {
								stability: 0.72,
								similarity_boost: 0.78
							}
						}),
					}
				);

				if (!ttsRes.ok) {
					return {
						content: [
							{
								type: "text",
								text: `语音接口调用失败：${ttsRes.status}`,
							},
						],
					};
				}

				const audioBuf = await ttsRes.arrayBuffer();
				const base64 = btoa(
					String.fromCharCode(...new Uint8Array(audioBuf))
				);
				const dataUrl = `data:audio/mpeg;base64,${base64}`;

				let ui = AUDIO_PLAYER_HTML;
				ui = ui.replace(
					"<audio controls style",
					`<audio controls src="${dataUrl}" style`
				);
				ui = ui.replace(
					'id="transcript"',
					`id="transcript">${text}`
				);

				return {
					content: [
						{
							type: "text",
							text: `语音已生成\n原文：${text}`,
						},
						{
							type: "resource",
							resource: {
								uri: `data:text/html,${encodeURIComponent(ui)}`,
								mimeType: "text/html",
								text: ui,
							},
						},
					],
				};
			}
		);

		const handler = createMcpHandler(server);
		return handler(request, env, ctx);
	},
};
      gap: 2px;
      height: 24px;
    }
    .wave-bar {
      width: 3px;
      background: #d0d0d0;
      border-radius: 2px;
      transition: background 0.1s;
    }
    .wave-bar.active { background: #07c160; }
    .duration {
      font-size: 13px;
      color: #999;
      min-width: 36px;
      text-align: right;
    }
    .toggle-btn {
      background: none;
      border: none;
      color: #07c160;
      font-size: 12px;
      cursor: pointer;
      padding: 8px 0 4px 0;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .toggle-btn:hover { text-decoration: underline; }
    .toggle-btn .arrow { 
      display: inline-block;
      transition: transform 0.2s; 
      font-size: 10px;
    }
    .toggle-btn.expanded .arrow { transform: rotate(90deg); }
    .text-bubble {
      background: #f7f7f7;
      border-radius: 8px;
      padding: 10px 12px;
      margin-top: 8px;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      display: none;
    }
    .text-bubble.show { display: block; }
    .loading {
      text-align: center;
      color: #999;
      font-size: 13px;
      padding: 16px;
    }
    .error {
      color: #fa5151;
      background: #fff2f2;
      padding: 10px;
      border-radius: 8px;
      font-size: 13px;
    }
    @media (prefers-color-scheme: dark) {
      .container { background: #2c2c2c; }
      .play-btn { background: #3a3a3a; }
      .play-btn svg { fill: #e0e0e0; }
      .wave-bar { background: #555; }
      .wave-bar.active { background: #4cd964; }
      .duration { color: #888; }
      .text-bubble { background: #3a3a3a; color: #e0e0e0; }
      .toggle-btn { color: #4cd964; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div id="content">
      <div class="loading">Loading...</div>
    </div>
  </div>

  <script>
    const contentEl = document.getElementById('content');
    const BOT_NAME = '${botName}';
    let audio = null;
    let waveInterval = null;
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    function showError(msg) {
      contentEl.innerHTML = '<div class="error">' + escapeHtml(msg) + '</div>';
    }
    
    function formatTime(sec) {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return m + ':' + (s < 10 ? '0' : '') + s;
    }
    
    function createWaveform() {
      const heights = [40, 70, 55, 85, 45, 90, 60, 75, 50, 80, 65, 55, 70, 45, 85, 50];
      return heights.map(h => '<div class="wave-bar" style="height:' + h + '%"></div>').join('');
    }
    
    function renderPlayer(text, audioBase64) {
      const audioUrl = 'data:audio/mpeg;base64,' + audioBase64;
      
      contentEl.innerHTML = 
        '<div class="player">' +
          '<button class="play-btn" id="playBtn">' +
            '<svg viewBox="0 0 24 24"><path id="playIcon" d="M8 5v14l11-7z"/></svg>' +
          '</button>' +
          '<div class="waveform" id="waveform">' + createWaveform() + '</div>' +
          '<span class="duration" id="duration">0:00</span>' +
        '</div>' +
        '<button class="toggle-btn" id="toggleBtn">' +
          '<span class="arrow">▶</span> Show transcript' +
        '</button>' +
        '<div class="text-bubble" id="textBubble">' + escapeHtml(text) + '</div>' +
        '<audio id="audio" src="' + audioUrl + '" preload="metadata"></audio>';
      
      audio = document.getElementById('audio');
      const playBtn = document.getElementById('playBtn');
      const playIcon = document.getElementById('playIcon');
      const durationEl = document.getElementById('duration');
      const waveform = document.getElementById('waveform');
      const bars = waveform.querySelectorAll('.wave-bar');
      const toggleBtn = document.getElementById('toggleBtn');
      const textBubble = document.getElementById('textBubble');
      
      audio.addEventListener('loadedmetadata', function() {
        durationEl.textContent = formatTime(audio.duration);
      });
      
      playBtn.addEventListener('click', function() {
        if (audio.paused) {
          audio.play();
        } else {
          audio.pause();
        }
      });
      
      audio.addEventListener('play', function() {
        playBtn.classList.add('playing');
        playIcon.setAttribute('d', 'M6 19h4V5H6v14zm8-14v14h4V5h-4z');
        animateWave(bars, true);
      });
      
      audio.addEventListener('pause', function() {
        playBtn.classList.remove('playing');
        playIcon.setAttribute('d', 'M8 5v14l11-7z');
        animateWave(bars, false);
      });
      
      audio.addEventListener('ended', function() {
        playBtn.classList.remove('playing');
        playIcon.setAttribute('d', 'M8 5v14l11-7z');
        animateWave(bars, false);
        bars.forEach(b => b.classList.remove('active'));
      });
      
      audio.addEventListener('timeupdate', function() {
        const progress = audio.currentTime / audio.duration;
        const activeCount = Math.floor(progress * bars.length);
        bars.forEach((b, i) => b.classList.toggle('active', i < activeCount));
      });
      
      toggleBtn.addEventListener('click', function() {
        const isShow = textBubble.classList.toggle('show');
        toggleBtn.classList.toggle('expanded', isShow);
        toggleBtn.innerHTML = isShow 
          ? '<span class="arrow">▶</span> Hide transcript' 
          : '<span class="arrow">▶</span> Show transcript';
      });
    }
    
    function animateWave(bars, playing) {
      if (waveInterval) clearInterval(waveInterval);
      if (!playing) return;
      
      waveInterval = setInterval(function() {
        bars.forEach(bar => {
          if (!bar.classList.contains('active')) {
            bar.style.opacity = 0.5 + Math.random() * 0.5;
          }
        });
      }, 150);
    }
    
    function handleData(data) {
      if (data.error) { showError(data.error); return; }
      if (data.audio_base64 && data.text) {
        renderPlayer(data.text, data.audio_base64);
      }
    }
    
    function sendToHost(method, params, id) {
      const msg = { jsonrpc: '2.0', method: method, params: params || {} };
      if (id !== undefined) msg.id = id;
      window.parent.postMessage(msg, '*');
    }
    
    window.addEventListener('message', function(event) {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      
      if (msg.jsonrpc === '2.0') {
        if (msg.method === 'ui/notifications/tool-input') {
          contentEl.innerHTML = '<div class="loading">Generating voice...</div>';
        }
        if (msg.method === 'ui/notifications/tool-result') {
          const structured = msg.params?.structuredContent;
          if (structured) handleData(structured);
        }
      }
      if (msg.structuredContent) handleData(msg.structuredContent);
    });
    
    sendToHost('ui/initialize', { name: 'voice-mcp', version: '1.0.0' }, 1);
    setTimeout(function() { sendToHost('ui/notifications/initialized', {}); }, 50);
  </script>
</body>
</html>`;
}

// =============================================================================
// MiniMax API Helper
// =============================================================================

async function generateAudio(env: Env, text: string): Promise<{ success: boolean; audio_base64?: string; error?: string }> {
  try {
    const t2aUrl = `https://api.minimaxi.com/v1/t2a_v2?GroupId=${env.MINIMAX_GROUP_ID}`;
    
    const response = await fetch(t2aUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'speech-2.8-hd',
        text: text,
        stream: false,
        voice_setting: {
          voice_id: env.VOICE_ID,
          speed: 1.0,
          vol: 1.0,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: 32000,
          format: 'mp3',
        },
      }),
    });

    const data = await response.json() as T2AResponse;
    
    if (data.base_resp && data.base_resp.status_code !== 0) {
      return { success: false, error: data.base_resp.status_msg };
    }

    if (data.data?.audio) {
      const hexString = data.data.audio;
      const bytes = new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Audio = btoa(binary);
      
      return { success: true, audio_base64: base64Audio };
    }

    return { success: false, error: 'Failed to generate audio' };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// =============================================================================
// MCP Server Factory
// =============================================================================

function createVoiceServer(env: Env): McpServer {
  const botName = env.BOT_NAME || 'AI';
  const PLAYER_HTML = getPlayerHTML(botName);
  
  const server = new McpServer({
    name: "voice-mcp",
    version: "1.0.0",
  });

  server.server.registerCapabilities({
    extensions: {
      "io.modelcontextprotocol/ui": {},
    },
  });

  server.resource(
    VOICE_RESOURCE_URI,
    VOICE_RESOURCE_URI,
    { mimeType: EXT_APPS_MIME, description: "Voice Player" },
    async () => ({
      contents: [
        {
          uri: VOICE_RESOURCE_URI,
          mimeType: EXT_APPS_MIME,
          text: PLAYER_HTML,
        },
      ],
    }),
  );

  server.registerTool(
    "speak",
    {
      title: `${botName}'s Voice`,
      description: `Make ${botName} speak with a custom cloned voice. The audio will play in an inline player.`,
      inputSchema: z.object({
        text: z.string().describe("Text to speak"),
      }),
      _meta: {
        ui: { resourceUri: VOICE_RESOURCE_URI },
        "ui/resourceUri": VOICE_RESOURCE_URI,
      },
    },
    async ({ text }) => {
      const result = await generateAudio(env, text);
      
      if (result.success && result.audio_base64) {
        return {
          content: [
            { type: "text" as const, text: `🎙️ ${botName} says: "${text}"` },
          ],
          structuredContent: {
            text: text,
            audio_base64: result.audio_base64,
          },
        };
      }
      
      return {
        content: [
          { type: "text" as const, text: `Voice generation failed: ${result.error}` },
        ],
        structuredContent: {
          error: result.error || 'Unknown error',
        },
      };
    },
  );

  return server;
}

// =============================================================================
// Worker Handler
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // MCP Endpoint
    if (path === '/mcp' || path === '/mcp/' || path === '/sse') {
      const server = createVoiceServer(env);
      const handler = createMcpHandler(server, {
        route: null as unknown as string,
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      return handler(request, env, ctx);
    }

    // Status check
    if (path === '/status') {
      return Response.json({
        status: 'ok',
        service: 'voice-mcp',
        version: '1.0.0',
        voice_id: env.VOICE_ID ? 'configured' : 'not configured',
      }, { headers: corsHeaders });
    }

    // Direct audio API
    if (path === '/speak' && request.method === 'GET') {
      const text = url.searchParams.get('text');
      if (!text) {
        return Response.json({ error: 'Missing text parameter' }, { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      const result = await generateAudio(env, text);
      
      if (result.success && result.audio_base64) {
        const binaryString = atob(result.audio_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        return new Response(bytes, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': 'inline; filename="voice.mp3"',
          },
        });
      }

      return Response.json({ error: result.error }, { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Landing page
    if (path === '/' || path === '') {
      const botName = env.BOT_NAME || 'AI';
      return new Response(
        `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>voice-mcp</title>
<style>
  body { font-family: system-ui; max-width: 600px; margin: 40px auto; padding: 20px; color: #333; line-height: 1.6; }
  h1 { color: #07c160; }
  code { background: #f5f5f5; padding: 2px 8px; border-radius: 4px; font-size: 14px; }
  .section { margin: 24px 0; }
  .endpoint { margin: 8px 0; }
  a { color: #07c160; }
</style>
</head><body>
<h1>🎙️ voice-mcp</h1>
<p>An MCP server for AI voice synthesis with inline audio player.</p>

<div class="section">
<h3>MCP Server</h3>
<p>Add this URL to your Claude.ai Connectors:</p>
<code>${url.origin}/mcp</code>
</div>

<div class="section">
<h3>Direct API</h3>
<div class="endpoint">
  <code>GET /speak?text=Hello</code> — Get audio file directly
</div>
<div class="endpoint">
  <code>GET /status</code> — Health check
</div>
</div>

<div class="section">
<h3>Configuration</h3>
<p>Bot name: <strong>${botName}</strong></p>
</div>

<p style="margin-top: 32px; color: #666; font-size: 14px;">
  <a href="https://github.com/xxx/voice-mcp">GitHub</a> · MIT License
</p>
</body></html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      );
    }

    return new Response('Not Found', { status: 404 });
  },
};
