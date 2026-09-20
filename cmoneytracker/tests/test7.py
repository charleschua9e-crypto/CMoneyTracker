import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _common import ROOT, DIST, SP, OUT, serve
import json, datetime, subprocess, time
from playwright.sync_api import sync_playwright

srv=serve(8773)
t=datetime.date.today()
def d(y,m,dd): return datetime.date(y,m,dd).isoformat()
exp=[];inc=[];i=0
def E(date,cat,amt,typ,note=''):
    global i;i+=1;exp.append(dict(id=str(1700000000000+i),date=date,type=typ,category=cat,note=note,amount=amt))
# 3 bulan riwayat + bulan ini
months=[]
for k in range(3,-1,-1):
    y=t.year; m=t.month-k
    while m<=0: m+=12;y-=1
    months.append((y,m))
for (y,m) in months:
    last=(datetime.date(y+(m==12),(m%12)+1,1)-datetime.timedelta(days=1)).day
    upto=t.day if (y,m)==(t.year,t.month) else last
    i+=1;inc.append(dict(id=str(1700000000000+i),date=d(y,m,1),source='Gaji',note='',amount=6000000))
    E(d(y,m,1),'Kos',1500000,'recurring')          # sekali sebulan
    for dd in (3,10,17,24):
        if dd<=upto:E(d(y,m,dd),'Bensin',50000,'recurring')   # mingguan -> harian
    for dd in range(1,upto+1):
        E(d(y,m,dd),'Makan & minum',40000,'daily','makan')
        if dd%2==0:E(d(y,m,dd),'Jajan',25000 if (y,m)!=(t.year,t.month) else 45000,'daily','kopi')
    if (y,m)!=(t.year,t.month) and m%2==0: E(d(y,m,12),'Servis kendaraan',300000,'recurring')
    if (y,m)!=(t.year,t.month): E(d(y,m,20),'Internet',300000,'recurring')
db=dict(profile=dict(name='Charles',total=0),expenses=exp,incomes=inc,methodBalances={'Utama':2000000},
        categoryBudgets={'Kos':1500000,'Jajan':300000,'Makan & minum':1300000,'Internet':250000})
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,service_workers='block')
    pg=ctx.new_page(); pg.on('pageerror',lambda e: errors.append(str(e)))
    pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('http://localhost:8773/index.html')
    pg.evaluate("d=>{localStorage.clear();localStorage.setItem('kantong-bersama-v1',JSON.stringify(d));localStorage.setItem('cmoneytracker-tips-seen-v39','1');localStorage.setItem('cmoneytracker-whatsnew-v43','1')}",db)
    pg.reload(); pg.wait_for_timeout(1500)
    pg.click('#healthPill'); pg.wait_for_timeout(400)
    titles=pg.eval_on_selector_all('#adviceList .advice-card','els=>els.map(e=>e.querySelector("div > b").textContent)')
    print('findings:',titles)
    pg.click('#advice [data-back]'); pg.click('[data-nav="report"]'); pg.wait_for_timeout(500)
    print('proj table:\n  '+pg.inner_text('#projTable').replace('\n',' | ').replace(' | Rp','  Rp')[:900])
    print('proj total:',pg.inner_text('#projTotal').replace('\n',' '))
    pg.screenshot(path=OUT+'g-report.png',full_page=True)
    pg.click('#projTable [data-cat-detail="Kos"]'); pg.wait_for_timeout(400)
    print('Kos detail:',pg.inner_text('#catChips'),'|',pg.inner_text('#catCapText'),'|',pg.inner_text('#catProjNote'))
    pg.screenshot(path=OUT+'g-kos.png',full_page=True)
    pg.click('#catSheet [data-close]')
    pg.click('#projTable [data-cat-detail="Jajan"]'); pg.wait_for_timeout(400)
    print('Jajan detail:',pg.inner_text('#catChips'),'|',pg.inner_text('#catCapText'),'|',pg.inner_text('#catInsight')[:200])
    pg.screenshot(path=OUT+'g-jajan.png')
    pg.click('#catSheet [data-close]')
    pg.click('#projTable [data-cat-detail="Bensin"]'); pg.wait_for_timeout(400)
    print('Bensin pattern:',pg.inner_text('#catChips'))
    # toggle pattern override
    pg.click('#catChips [data-pattern-toggle]'); pg.wait_for_timeout(400)
    print('after toggle:',pg.inner_text('#catChips'),st:=pg.evaluate("JSON.parse(localStorage.getItem('kantong-bersama-v1')).categoryPattern"))
    pg.fill('#catCapInput','250000'); pg.click('#catCapSave'); pg.wait_for_timeout(300)
    print('cap saved:',pg.evaluate("JSON.parse(localStorage.getItem('kantong-bersama-v1')).categoryBudgets.Bensin"))
    pg.click('#catSheet [data-close]')
    pg.click('[data-nav="more"]'); pg.click('#more [data-goto="budgets"]'); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+'g-budgets.png',full_page=True)
    pg.click('[data-nav="tx"]'); pg.click('[data-txtype="income"]'); pg.wait_for_timeout(300)
    print('income filter rows:',pg.locator('#monthlyList .tx').count(),pg.inner_text('#monthlyList .tx >> nth=0').split('\n')[0])
    pg.click('[data-nav="home"]'); pg.wait_for_timeout(300); print('safe:',pg.inner_text('#safeMeta1'),'|',pg.inner_text('#safeHint')[:140])
    b.close()
srv.terminate()
print('ERRORS:',errors)
