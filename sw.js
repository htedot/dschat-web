/* DeepSeek 聊天 网页版 —— 应用外壳缓存。
   只缓存本站静态文件；api.deepseek.com 的请求一律走网络（缓存对话没有意义，还会串号）。 */
var CACHE = "dschat-shell-v25";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-180.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch(err){ return; }
  if(url.origin !== self.location.origin) return;   // 只接管同源

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res && res.status === 200 && res.type === "basic"){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); }).catch(function(){});
        }
        return res;
      }).catch(function(){
        // 离线且没缓存：导航请求回退到外壳，其余交给浏览器报错
        if(req.mode === "navigate") return caches.match("./index.html");
        throw new Error("offline");
      });
    })
  );
});