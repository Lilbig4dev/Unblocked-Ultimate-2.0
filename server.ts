import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // SharedArrayBuffer support for emulators and Godot
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless'); // credentialless is safer than require-corp for mixed content
    next();
  });

  const httpsAgent = new https.Agent({  
    rejectUnauthorized: false
  });

  // Real-time server-side Proxy (Relay)
  app.all("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    const isStealth = req.query.stealth === 'true';
    
    if (!targetUrl) {
      return res.status(400).send("URL parameter is required");
    }

    const abortController = new AbortController();
    req.on('close', () => abortController.abort());

    try {
      const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
      ];
      const ua = isStealth ? userAgents[Math.floor(Math.random() * userAgents.length)] : userAgents[0];

      // Prepare request headers
      const proxyHeaders = {
        'User-Agent': ua,
        'Accept': req.headers['accept'] || '*/*',
        'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
        ...Object.fromEntries(
          Object.entries(req.headers).filter(([k]) => 
            !['host', 'origin', 'referer', 'content-length', 'x-forwarded-for', 'cf-ray', 'cf-connecting-ip', 'cf-visitor', 'x-real-ip'].includes(k.toLowerCase())
          )
        )
      };

      // Set referer and origin correctly for the target
      try {
        const targetOrigin = new URL(targetUrl).origin;
        proxyHeaders['Referer'] = targetUrl;
        proxyHeaders['Origin'] = targetOrigin;
        proxyHeaders['Host'] = new URL(targetUrl).host;
      } catch(e) {}

      if (req.headers['range']) {
        proxyHeaders['range'] = req.headers['range'];
      }

      const response = await axios({
        method: req.method,
        url: targetUrl,
        data: ['GET', 'HEAD'].includes(req.method.toUpperCase()) ? undefined : req.body,
        responseType: 'stream',
        decompress: false, 
        httpsAgent,
        headers: proxyHeaders,
        timeout: 0, // No timeout for massive game files
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        signal: abortController.signal,
        maxRedirects: 20,
        validateStatus: () => true,
      });

      console.log(`[SCRAMJET] Relay Handshake: ${req.method} ${targetUrl} -> ${response.status}`);

      const finalTargetUrl = response.request.res.responseUrl || targetUrl;
      const urlObj = new URL(finalTargetUrl);

      // CORS & Security Headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');

      // Header Stripping
      const headersToStrip = [
        'x-frame-options',
        'content-security-policy',
        'content-security-policy-report-only',
        'x-content-type-options',
        'x-xss-protection',
        'content-encoding',
        'transfer-encoding',
        'strict-transport-security',
        'cross-origin-opener-policy',
        'cross-origin-embedder-policy',
        'cross-origin-resource-policy',
        'referrer-policy',
        'permissions-policy',
        'report-to'
      ];

      Object.entries(response.headers).forEach(([key, value]) => {
        if (!headersToStrip.includes(key.toLowerCase())) {
          if (key.toLowerCase() === 'set-cookie' && Array.isArray(value)) {
            res.setHeader(key, value.map(c => 
              c.replace(/Domain=[^;]+;?/gi, '')
               .replace(/Secure;?/gi, '')
               .replace(/SameSite=[^;]+;?/gi, '') + '; SameSite=None; Secure'
            ));
          } else if (value) {
            res.setHeader(key, value as any);
          }
        }
      });

      const contentType = (response.headers['content-type'] || '').toString().toLowerCase();
      
      const isText = contentType.includes('text/html') || contentType.includes('javascript') || contentType.includes('css') || contentType.includes('json');

      if (isText) {
        const chunks: any[] = [];
        for await (const chunk of response.data) {
          chunks.push(chunk);
        }
        let content = Buffer.concat(chunks).toString('utf-8');
        const proxyPrefix = "/api/proxy?url=";
        const stealthParam = `&stealth=${isStealth}`;

        const wrap = (url: string) => {
          if (!url || typeof url !== 'string' || url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('#') || url.startsWith('blob:')) return url;
          try {
            // Handle protocol-relative URLs
            let target = url;
            if (url.startsWith('//')) target = 'https:' + url;
            
            const absolute = new URL(target, finalTargetUrl).href;
            if (absolute.includes(proxyPrefix)) return url;
            
            // Check if it's already a full AIS proxy URL
            if (absolute.includes('ais-dev-') || absolute.includes('ais-pre-')) return url;

            // Don't proxy if it's already the same domain as the current request
            const absObj = new URL(absolute);
            if (absObj.host === urlObj.host) return url;

            return `${proxyPrefix}${encodeURIComponent(absolute)}${stealthParam}`;
          } catch { return url; }
        };

        if (contentType.includes('text/html')) {
          // Hyper-aggressive V7.1
          content = content.replace(/(href|src|action|poster|data-src|data-href|srcset|data-srcset|data-url|data-thumb|data-original)=(['"]?)([^'"\s<>]+)\2/gi, (match, attr, q, val) => {
             if (attr.toLowerCase().includes('srcset')) {
               return `${attr}=${q}${val.split(',').map(s => {
                 const part = s.trim().split(/\s+/);
                 if (part.length === 0) return s;
                 const u = part[0];
                 const size = part.slice(1).join(' ');
                 return u ? `${wrap(u)}${size ? ' ' + size : ''}` : s;
               }).join(', ')}${q}`;
             }
             return `${attr}=${q}${wrap(val)}${q}`;
          });
          content = content.replace(/\s+(integrity|crossorigin)=(['"]?)([^'"]*)\2/gi, '');
          content = content.replace(/url\((['"]?)([^'")]*)\1\)/gi, (match, q, val) => `url(${q}${wrap(val)}${q})`);

          const scriptInjections = `
            <base href="${urlObj.origin}${urlObj.pathname}${urlObj.search}">
            <script>
              (function() {
                const targetOrigin = "${urlObj.origin}";
                const proxyPrefix = "/api/proxy?url=";
                const stealthParam = "${stealthParam}";

                const wrapUrl = (url) => {
                  if (!url || typeof url !== 'string' || url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('#') || url.startsWith('blob:') || url.startsWith('ws:') || url.startsWith('wss:')) return url;
                  
                  try {
                    const resolvedAbsolute = new URL(url, window.location.href).href;
                    
                    // If it's already a proxy URL, don't wrap it again
                    if (resolvedAbsolute.includes(proxyPrefix) || resolvedAbsolute.includes('ais-dev-') || resolvedAbsolute.includes('ais-pre-')) return url;
                    
                    // Check if it's external (doesn't point to our local proxy host)
                    const uObj = new URL(resolvedAbsolute);
                    if (uObj.host !== window.location.host) {
                       return proxyPrefix + encodeURIComponent(resolvedAbsolute) + stealthParam;
                    }
                    
                    // If it's local but doesn't have the proxy prefix, it's likely a relative path from the original site
                    // that the browser resolved against our proxy origin. We need to re-wrap it against the target origin.
                    if (!resolvedAbsolute.includes(proxyPrefix)) {
                       const targetRel = new URL(url, targetOrigin).href;
                       return proxyPrefix + encodeURIComponent(targetRel) + stealthParam;
                    }
                    
                    return url;
                  } catch(e) { return url; }
                };

                // WebSocket Bypass (Fix crash, handle events better)
                const OriginalWebSocket = window.WebSocket;
                window.WebSocket = function(url, protocols) {
                   try {
                     return new OriginalWebSocket(url, protocols);
                   } catch(e) {
                     console.error("[SCRAMJET] WebSocket refused:", e);
                     const mockWs = { 
                       send: () => {}, 
                       close: () => {}, 
                       addEventListener: (type, cb) => {
                         if (type === 'close') setTimeout(() => cb({ code: 1006, reason: "Proxy bypass", wasClean: false }), 100);
                       },
                       removeEventListener: () => {},
                       readyState: 3,
                       url: url,
                       onopen: null, onclose: null, onmessage: null, onerror: null
                     };
                     return mockWs;
                   }
                };
                window.WebSocket.prototype = OriginalWebSocket.prototype;
                window.WebSocket.CONNECTING = 0; window.WebSocket.OPEN = 1; window.WebSocket.CLOSING = 2; window.WebSocket.CLOSED = 3;

                // Network Interception
                const originalFetch = window.fetch;
                window.fetch = function(input, init) {
                  if (typeof input === 'string') input = wrapUrl(input);
                  else if (input instanceof Request) {
                    try {
                      Object.defineProperty(input, 'url', { value: wrapUrl(input.url), configurable: true });
                    } catch(e) {}
                  }
                  return originalFetch.call(this, input, init);
                };

                const originalOpen = XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open = function(method, url) {
                  return originalOpen.apply(this, [method, wrapUrl(url), ...Array.prototype.slice.call(arguments, 2)]);
                };

                // Security & Frame Bypass
                try {
                  window.onbeforeunload = null;
                  Object.defineProperty(window, 'top', { get: () => window.self, configurable: true });
                  Object.defineProperty(window, 'parent', { get: () => window.self, configurable: true });
                  
                  // Neutralize Service Workers
                  if (navigator.serviceWorker) {
                    Object.defineProperty(navigator, 'serviceWorker', {
                      get: () => ({
                        register: () => new Promise((resolve) => resolve({ active: true })),
                        getRegistration: () => new Promise((resolve) => resolve(null)),
                        getRegistrations: () => new Promise((resolve) => resolve([])),
                        addEventListener: () => {},
                        removeEventListener: () => {},
                      }),
                      configurable: true
                    });
                  }

                  // Proxy location
                  const locationProxy = new Proxy(window.location, {
                    get: (t, p) => {
                       if (p === 'host') return targetOrigin.replace(/^https?:\\/\\//, '');
                       if (p === 'hostname') return targetOrigin.replace(/^https?:\\/\\//, '').split(':')[0];
                       if (p === 'origin') return targetOrigin;
                       if (p === 'href') return targetOrigin + t.pathname + t.search;
                       const val = t[p];
                       return typeof val === 'function' ? val.bind(t) : val;
                    }
                  });
                  try {
                    Object.defineProperty(window, 'location', { get: () => locationProxy, configurable: true });
                    Object.defineProperty(document, 'location', { get: () => locationProxy, configurable: true });
                  } catch(e) {}
                } catch(e) {}

                // Global Object Interception
                const originalCreateElement = document.createElement;
                document.createElement = function(tag, opts) {
                  const el = originalCreateElement.call(this, tag, opts);
                  const T = tag.toUpperCase();
                  if (['IFRAME', 'SCRIPT', 'IMG', 'LINK', 'FORM', 'SOURCE', 'VIDEO', 'AUDIO', 'A'].includes(T)) {
                    const attr = T === 'FORM' ? 'action' : (['LINK', 'A'].includes(T) ? 'href' : 'src');
                    const descriptor = Object.getOwnPropertyDescriptor(el.constructor.prototype, attr);
                    if (descriptor && descriptor.set) {
                      const originalSetter = descriptor.set;
                      Object.defineProperty(el, attr, {
                        set: function(v) { originalSetter.call(this, wrapUrl(v)); },
                        get: function() { return el.getAttribute(attr); },
                        configurable: true
                      });
                    }
                  }
                  return el;
                };

                // Navigation Interception
                const originalPush = history.pushState;
                const originalReplace = history.replaceState;
                history.pushState = function(state, title, url) {
                   return originalPush.apply(this, [state, title, url ? wrapUrl(url) : url]);
                };
                history.replaceState = function(state, title, url) {
                   return originalReplace.apply(this, [state, title, url ? wrapUrl(url) : url]);
                };

                // Mutation Observer
                const rewriteNode = (node) => {
                  if (node.nodeType !== 1) return;
                  const tags = { 'A': 'href', 'IMG': 'src', 'IFRAME': 'src', 'SCRIPT': 'src', 'LINK': 'href', 'FORM': 'action', 'SOURCE': 'src', 'VIDEO': 'src', 'AUDIO': 'src' };
                  const attr = tags[node.tagName];
                  if (attr && node.getAttribute(attr)) {
                    const val = node.getAttribute(attr);
                    if (val && !val.includes(window.location.host) && !val.startsWith('data:') && !val.startsWith('blob:')) {
                      node.setAttribute(attr, wrapUrl(val));
                    }
                  }
                };
                const observer = new MutationObserver((m) => m.forEach(r => r.addedNodes.forEach(rewriteNode)));
                observer.observe(document.documentElement, { childList: true, subtree: true });
              })();
            </script>
          `;
          
          if (content.includes('<head>')) {
            content = content.replace('<head>', `<head>${scriptInjections}`);
          } else {
            content = `${scriptInjections}${content}`;
          }
        } else if (contentType.includes('javascript')) {
          content = content.replace(/window\.top/g, 'window.self').replace(/window\.parent/g, 'window.self');
        } else if (contentType.includes('css')) {
          content = content.replace(/url\((['"]?)([^'")]*)\1\)/gi, (match, q, val) => `url(${q}${wrap(val)}${q})`);
        } else if (contentType.includes('json')) {
           // Rewrite URLs in JSON values
           content = content.replace(/https?:\\\/\\\/[a-zA-Z0-9\-\.\/%\?#&_=]+/g, (match) => {
              const url = match.replace(/\\\\\\//g, '/');
              return wrap(url).replace(/\//g, '\\\\/');
           });
        }
        
        return res.status(response.status).send(content);
      }

      // Generic data forward (streaming)
      response.data.pipe(res);

    } catch (error: any) {
      console.error("[SCRAMJET] Relay Error:", error.message);
      
      // Handle redirects explicitly if axios didn't
      if (error.response && error.response.status >= 300 && error.response.status < 400) {
        const location = error.response.headers.location;
        if (location) {
          const absoluteLocation = new URL(location, targetUrl).href;
          return res.redirect(`/api/proxy?url=${encodeURIComponent(absoluteLocation)}&stealth=${isStealth}`);
        }
      }

      // Scramjet Refusal Screen
      res.status(500).send(`
        <div style="font-family: 'JetBrains Mono', monospace; padding: 40px; background: #050505; color: #ef4444; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
          <div style="font-size: 64px; margin-bottom: 24px; filter: drop-shadow(0 0 20px #ef4444);">⚠️</div>
          <h1 style="font-size: 32px; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase; margin-bottom: 8px; color: white;">NODE_RELAY_REFUSED</h1>
          <p style="color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3em; margin-bottom: 32px; font-weight: bold;">[ SCRAMJET / SYSTEM_ERROR_404 ]</p>
          
          <div style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); padding: 24px; border-radius: 16px; width: 100%; max-width: 600px; text-align: left; backdrop-blur: 10px;">
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
              <div style="width: 8px; h: 8px; border-radius: 50%; background: #ef4444;"></div>
              <div style="width: 8px; h: 8px; border-radius: 50%; background: rgba(239, 68, 68, 0.3);"></div>
              <div style="width: 8px; h: 8px; border-radius: 50%; background: rgba(239, 68, 68, 0.1);"></div>
            </div>
            <div style="font-size: 10px; color: rgba(239, 68, 68, 0.5); margin-bottom: 4px; font-weight: 900;">CRITICAL_LOG:</div>
            <div style="font-size: 13px; color: #eee; margin-bottom: 16px; background: #000; padding: 12px; border-radius: 8px;">${error.message}</div>
            <div style="font-size: 10px; color: rgba(239, 68, 68, 0.5); margin-bottom: 4px; font-weight: 900;">TARGET_HANDSHAKE:</div>
            <div style="font-size: 11px; color: #444; word-break: break-all; opacity: 0.8;">${targetUrl}</div>
          </div>

          <div style="margin-top: 40px; display: flex; gap: 16px;">
            <button onclick="window.history.back()" style="background: #111; color: white; border: 1px solid #222; padding: 14px 32px; border-radius: 12px; font-family: inherit; font-size: 11px; font-weight: 900; text-transform: uppercase; cursor: pointer; transition: all 0.2s;">Go Back</button>
            <button onclick="window.location.reload()" style="background: #ef4444; color: white; border: none; padding: 14px 32px; border-radius: 12px; font-family: inherit; font-size: 11px; font-weight: 900; text-transform: uppercase; cursor: pointer; box-shadow: 0 10px 20px -10px #ef4444;">Retry Protocol</button>
          </div>
        </div>
      `);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SCRAMJET-NODE] Protocol active on port ${PORT}`);
  });
}

startServer();
