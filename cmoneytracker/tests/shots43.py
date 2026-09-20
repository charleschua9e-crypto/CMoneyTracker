import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _common import ROOT, DIST, SP, OUT, serve
import sys
tag=sys.argv[1] if len(sys.argv)>1 else 'before'
exec(open('test8.py').read().split("errors=[]")[0].replace('8774','8781'))
db['profile']['incomeMonthly']=6000000; db['profile']['planAt']='2026-09-01'; db['profile']['goal']={'type':'darurat','months':3,'since':'2026-09-01'}
db['payday']=25; db['monthlyBudget']=4500000
db['recurringTemplates']=[{'id':'t1','category':'Internet','amount':300000,'dayOfMonth':20,'note':''},{'id':'t2','kind':'sub','name':'Spotify','emoji':'🎵','category':'Langganan','amount':55000,'dayOfMonth':5,'cycle':'monthly'}]
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(); 
    for theme in ['dark','light']:
        ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,service_workers='block')
        pg=ctx.new_page(); pg.on('pageerror',lambda e: errors.append(str(e)))
        pg.goto('http://localhost:8781/index.html')
        pg.evaluate("([d,th])=>{localStorage.clear();localStorage.setItem('kantong-bersama-v1',JSON.stringify(d));localStorage.setItem('cmoneytracker-tips-seen-v39','1');localStorage.setItem('cmoneytracker-whatsnew-v43','1');localStorage.setItem('cmoneytracker-persist-asked','2026-09-17');localStorage.setItem('kantong-theme',th)}",[db,theme])
        pg.reload(); pg.wait_for_timeout(1800)
        pre=OUT+tag+'-'+theme+'-'
        pg.screenshot(path=pre+'home.png'); pg.screenshot(path=pre+'homefull.png',full_page=True)
        if theme=='light': b2=None; ctx.close(); continue
        pg.click('[data-nav="tx"]'); pg.wait_for_timeout(300); pg.screenshot(path=pre+'tx.png')
        pg.click('[data-nav="report"]'); pg.wait_for_timeout(600); pg.screenshot(path=pre+'report.png')
        pg.click('[data-rseg="category"]'); pg.wait_for_timeout(400); pg.screenshot(path=pre+'cat.png')
        pg.click('[data-nav="more"]'); pg.wait_for_timeout(300); pg.screenshot(path=pre+'more.png')
        pg.click('#more [data-goto="advice"]'); pg.wait_for_timeout(300); pg.screenshot(path=pre+'advice.png')
        pg.evaluate("history.back()"); pg.wait_for_timeout(200)
        pg.click('#fabAdd'); pg.wait_for_timeout(400); pg.screenshot(path=pre+'sheet.png')
        ctx.close()
    b.close()
srv.terminate()
print('ERRORS:',errors)
