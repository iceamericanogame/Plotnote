/* 플롯노트 오프라인 저장 (서비스 워커)
   - 페이지: 인터넷이 되면 새로 받아 최신 버전을 쓰고 저장본도 바꿔 둔다. 안 되거나 4초 넘게 느리면 저장본을 연다.
   - 아이콘 등 같은 사이트 파일: 저장본 우선.
   - 글꼴: 한 번 받은 건 저장해 두고 오프라인에서도 쓴다.
   - 구글 로그인·드라이브 요청은 건드리지 않는다(항상 인터넷으로). */
var VERSION='69482eaa0c';
var CORE='plotnote-core-'+VERSION, FONTS='plotnote-fonts-v1';
var CORE_FILES=['./','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CORE).then(function(c){return c.addAll(CORE_FILES);}).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k.indexOf('plotnote-core-')===0&&k!==CORE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
function isFont(u){return /^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)$/.test(u.hostname);}
self.addEventListener('fetch',function(e){
  var r=e.request; if(r.method!=='GET') return;
  var u=new URL(r.url);
  if(r.mode==='navigate'&&u.origin===location.origin){ e.respondWith(pageFirstNet(r)); return; }
  if(u.origin===location.origin){
    e.respondWith(caches.match(r,{ignoreSearch:true}).then(function(m){
      return m||fetch(r).then(function(res){ if(res.ok){var cp=res.clone(); caches.open(CORE).then(function(c){c.put(r,cp);});} return res; });
    }));
    return;
  }
  if(isFont(u)){
    e.respondWith(caches.open(FONTS).then(function(c){
      return c.match(r).then(function(m){
        var net=fetch(r).then(function(res){ if(res.ok||res.type==='opaque') c.put(r,res.clone()); return res; }).catch(function(){return m;});
        return m||net;
      });
    }));
  }
});
function pageFirstNet(r){
  return new Promise(function(resolve){
    var done=false;
    function fromCache(){ return caches.match('./').then(function(m){ return m||caches.match(r,{ignoreSearch:true}); }); }
    var t=setTimeout(function(){ fromCache().then(function(m){ if(m&&!done){done=true;resolve(m);} }); },4000);
    fetch(r).then(function(res){
      if(res.ok){ var cp=res.clone(); caches.open(CORE).then(function(c){c.put('./',cp);}); }
      if(!done){done=true;clearTimeout(t);resolve(res);}
    }).catch(function(){
      fromCache().then(function(m){ if(!done){done=true;clearTimeout(t);resolve(m||Response.error());} });
    });
  });
}
