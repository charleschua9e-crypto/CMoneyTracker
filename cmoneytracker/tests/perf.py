import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _common import ROOT, DIST, SP, OUT, serve
import subprocess,time,datetime,random,json
from playwright.sync_api import sync_playwright
srv=serve(8784)
random.seed(1);t=datetime.date.today();exp=[];inc=[];i=0
cats=[('Makan & minum','daily',(20000,60000),2),('Parkir','daily',(2000,5000),1),('Jajan','recurring',(15000,50000),.5),('Bensin','recurring',(30000,60000),.3),('Belanja kebutuhan pribadi','recurring',(20000,150000),.15),('Hiburan','recurring',(35000,100000),.05)]
d=t-datetime.timedelta(days=365*3)
while d<=t:
    for c,ty,(a,b),p in cats:
        n=int(p)+(1 if random.random()<p%1 else 0)
        for _ in range(n):
            i+=1;exp.append(dict(id=str(1600000000000+i),date=d.isoformat(),type=ty,category=c,note=random.choice(['','kopi','makan siang','warteg','boba']),amount=random.randint(a//1000,b//1000)*1000))
    if d.day==1:
        i+=1;exp.append(dict(id=str(1600000000000+i),date=d.isoformat(),type='recurring',category='Kos',note='',amount=1500000))
        i+=1;inc.append(dict(id=str(1600000000000+i),date=d.isoformat(),source='Gaji',note='',amount=7000000))
    if d.day==20:
        i+=1;exp.append(dict(id=str(1600000000000+i),date=d.isoformat(),type='recurring',category='Internet',note='',amount=300000))
    d+=datetime.timedelta(days=1)
db=dict(profile=dict(name='Tes',total=0,planAt='2026-01-01',incomeMonthly=7000000,goal={'type':'darurat','months':3}),expenses=exp,incomes=inc,methodBalances={'Utama':2000000},categoryBudgets={'Jajan':400000,'Makan & minum':1500000},monthlyBudget=5000000,payday=1)
print('transaksi:',len(exp)+len(inc),'| ukuran JSON KB:',len(json.dumps(db))//1024)
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':390,'height':844},service_workers='block');pg=ctx.new_page()
    cdp=ctx.new_cdp_session(pg);cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
    pg.goto('http://localhost:8784/index.html')
    pg.evaluate("d=>{localStorage.clear();localStorage.setItem('kantong-bersama-v1',JSON.stringify(d));localStorage.setItem('cmoneytracker-tips-seen-v39','1');localStorage.setItem('cmoneytracker-whatsnew-v43','1');localStorage.setItem('cmoneytracker-persist-asked','2026-09-17')}",db)
    t0=time.time();pg.reload();pg.wait_for_selector('#splash.gone',timeout=60000,state='attached');print('buka aplikasi (s):',round(time.time()-t0,2))
    pg.wait_for_timeout(1000)
    ms=[]
    for k in range(3):
        ms.append(pg.evaluate("()=>{const i=document.querySelector('#smartQuickInput');i.value='kopi 1'+Math.random().toString().slice(2,4)+'rb';const t=performance.now();document.querySelector('#smartForm').requestSubmit();return performance.now()-t}"))
    print('simpan cepat + render (ms, CPU 4x lebih lambat):',[round(x) for x in ms])
    pg.click('[data-nav="report"]');t1=time.time();pg.wait_for_timeout(50)
    x=pg.evaluate("()=>{const t=performance.now();document.querySelector('[data-rseg=\"category\"]').click();return performance.now()-t}")
    pg.click('#fabAdd');pg.wait_for_timeout(300)
    x2=pg.evaluate("()=>{const i=document.querySelector('#sheetNote');i.value='kopi susu';const t=performance.now();i.dispatchEvent(new Event('input',{bubbles:true}));return performance.now()-t}")
    print('ketik catatan di form (ms):',round(x2))
    b.close()
srv.terminate()
