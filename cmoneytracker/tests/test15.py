import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _common import ROOT, DIST, SP, OUT, serve
exec(open('shots43.py').read().split('errors=[]\nwith')[0].replace('8781','8786'))
errors=[]
INIT="""
window.Capacitor={isNativePlatform:()=>true,Plugins:{
  Filesystem:{writeFile:async a=>{window.__saved=a;return {uri:'file:///storage/Documents/'+a.path}}},
  Share:{share:async a=>{window.__shared=a}},
  App:{addListener:(n,f)=>{window.__back=f},exitApp:()=>{window.__exit=1}},
  Browser:{open:async a=>{window.__url=a.url}}
}};
"""
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,service_workers='block')
    ctx.add_init_script(INIT)
    pg=ctx.new_page(); pg.on('pageerror',lambda e: errors.append(str(e)))
    pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('http://localhost:8786/index.html')
    pg.evaluate("d=>{localStorage.clear();localStorage.setItem('kantong-bersama-v1',JSON.stringify(d));localStorage.setItem('cmoneytracker-tips-seen-v39','1');localStorage.setItem('cmoneytracker-whatsnew-v43','1')}",db)
    pg.reload(); pg.wait_for_timeout(1800)
    print('native class:',pg.eval_on_selector('html','e=>e.classList.contains("is-native")'))
    pg.click('[data-nav="more"]'); pg.click('#more [data-goto="export"]'); pg.wait_for_timeout(400)
    print('persist card:',pg.inner_text('#persistCard').replace('\n',' | ')[:220])
    print('install btn hidden:',pg.is_hidden('#installBtn'),'| menu meta:',pg.inner_text('#menuExportMeta'))
    pg.click('#exportBtn'); pg.wait_for_timeout(600)
    saved=pg.evaluate("window.__saved||null"); shared=pg.evaluate("window.__shared||null")
    import base64,json
    data=json.loads(base64.b64decode(saved['data']))
    print('file:',saved['path'],saved['directory'],'| transaksi di backup:',len(data['expenses'])+len(data['incomes']),'| dibagikan:',bool(shared))
    print('toast:',pg.inner_text('#undoToastMsg'))
    print('backup tercatat:',pg.evaluate("localStorage.getItem('cmoneytracker-last-backup')"))
    # tombol kembali Android
    pg.click('[data-nav="home"]'); pg.click('#fabAdd'); pg.wait_for_timeout(300)
    pg.evaluate("window.__back()"); pg.wait_for_timeout(300); print('back tutup sheet:',pg.is_hidden('#txSheet'))
    pg.click('[data-nav="more"]'); pg.click('#more [data-goto="help"]'); pg.wait_for_timeout(300)
    pg.evaluate("window.__back()"); pg.wait_for_timeout(400); print('back dari sub-halaman:',pg.is_visible('#more'))
    pg.evaluate("window.__back()"); pg.wait_for_timeout(300); print('back ke beranda:',pg.is_visible('#home'))
    pg.evaluate("window.__back()"); pg.wait_for_timeout(200); print('back di beranda -> keluar:',pg.evaluate("window.__exit===1"))
    # tautan keluar
    pg.click('[data-nav="more"]'); pg.click('#more [data-goto="advice"]'); pg.wait_for_timeout(400)
    pg.click('#askClaudeBtn'); pg.wait_for_timeout(600)
    print('buka Claude lewat aplikasi:',str(pg.evaluate("window.__url"))[:60])
    pg.screenshot(path=OUT+'n-export.png')
    b.close()
srv.terminate()
print('ERRORS:',errors)
