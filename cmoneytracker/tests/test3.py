import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _common import ROOT, DIST, SP, OUT, serve
import json, datetime, subprocess, time
from playwright.sync_api import sync_playwright

srv=subprocess.Popen(['python3','-m','http.server','8767'],cwd=DIST,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
t=datetime.date.today(); d=lambda n:(t-datetime.timedelta(days=n)).isoformat()
old=dict(profile=dict(name='Charles',total=0),
 methodBalances={'Bank':2000000,'Cash':300000,'GoPay':50000,'Tabungan':0},
 expenses=[
  dict(id='1',date=d(20),type='daily',category='Makan & minum',method='Cash',note='nasi',amount=25000),
  dict(id='2',date=d(10),type='recurring',category='Kos',method='Bank',note='',amount=1000000),
  dict(id='3',date=d(5),type='recurring',category='Tabungan',method='Bank',note='Tabungan bulanan',amount=400000),
  dict(id='4',date=d(3),type='recurring',category='Tarik Tabungan',method='Tabungan',note='',amount=100000),
  dict(id='5',date=d(1),type='daily',category='Jajan',method='GoPay',note='boba',amount=20000),
  dict(id='6',date=d(2),type='daily',category='Tabungan',method='Cash',note='celengan pribadi',amount=5000)],
 incomes=[
  dict(id='7',date=d(15),source='Gaji',method='Bank',note='',amount=5000000),
  dict(id='8',date=d(5),source='Tabungan Bulanan',method='Tabungan',note='',amount=400000),
  dict(id='9',date=d(3),source='Tarik Tabungan',method='Cash',note='',amount=100000)],
 savingsTarget=400000,autoSaveSurplus=True,savingsSourceMethod='Bank',history=[],
 recurringTemplates=[dict(id='t1',category='Internet',amount=300000,method='Bank',dayOfMonth=28,note='')])
# old saldo (non-Tabungan): Bank 2000000-1000000-400000+5000000=5600000; Cash 300000-25000-5000+100000=370000; GoPay 50000-20000=30000 => 6000000
# tabungan: 0+400000-100000=300000 -> expected new total 6300000
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,service_workers='block')
    pg=ctx.new_page()
    pg.on('pageerror',lambda e: errors.append(str(e)))
    pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('http://localhost:8767/index.html')
    pg.evaluate("d=>{localStorage.clear();localStorage.setItem('kantong-bersama-v1',JSON.stringify(d));localStorage.setItem('cmoneytracker-tips-seen-v39','1');localStorage.setItem('cmoneytracker-whatsnew-v43','1')}",old)
    pg.reload(); pg.wait_for_timeout(900)
    print('saldo shown:',pg.inner_text('#saldoTersedia'),'(expect Rp6.300.000)')
    st=pg.evaluate("JSON.parse(localStorage.getItem('kantong-bersama-v1'))")
    print('balances',st['methodBalances'],'exp ids',[x['id'] for x in st['expenses']],'inc ids',[x['id'] for x in st['incomes']],'target',st['savingsTarget'],st['autoSaveSurplus'])
    print('backup kept:',bool(pg.evaluate("localStorage.getItem('cmoneytracker-backup-pre-v36')")))
    pg.reload(); pg.wait_for_timeout(500)
    print('after reload saldo:',pg.inner_text('#saldoTersedia'))
    pg.screenshot(path=OUT+'b-home.png'); pg.screenshot(path=OUT+'b-home-full.png',full_page=True)
    pg.fill('#smartQuickInput','kopi 15rb gopay'); pg.press('#smartQuickInput','Enter'); pg.wait_for_timeout(300)
    st=pg.evaluate("JSON.parse(localStorage.getItem('kantong-bersama-v1'))")
    print('smart:',st['expenses'][-1])
    pg.click('#fabAdd'); pg.wait_for_timeout(400); pg.screenshot(path=OUT+'b-sheet.png')
    pg.fill('#sheetAmount','50000'); pg.click('[data-sheet-cat="Parkir"]'); pg.click('#sheetSave'); pg.wait_for_timeout(300)
    print('sheet saved:',pg.evaluate("(()=>{let a=JSON.parse(localStorage.getItem('kantong-bersama-v1')).expenses;return a[a.length-1]})()"))
    print('saldo now:',pg.inner_text('#saldoTersedia'))
    pg.click('[data-nav="more"]'); pg.wait_for_timeout(300); pg.screenshot(path=OUT+'b-more.png')
    pg.click('#more [data-goto="wallets"]'); pg.wait_for_timeout(300)
    pg.fill('#balanceInput','1000000'); pg.click('#saveBalance'); pg.wait_for_timeout(300)
    print('after koreksi:',pg.inner_text('#balanceNow'),pg.inner_text('#saldoTersedia'))
    pg.screenshot(path=OUT+'b-koreksi.png')
    pg.click('#wallets [data-back]'); pg.click('#more [data-goto="bills"]'); pg.wait_for_timeout(300)
    pg.fill('#rtAmount','100000'); pg.fill('#rtDay','27'); pg.click('#addRecurringTemplate'); pg.wait_for_timeout(300)
    print('bill:',pg.evaluate("JSON.parse(localStorage.getItem('kantong-bersama-v1')).recurringTemplates.slice(-1)[0]"))
    pg.screenshot(path=OUT+'b-bills.png')
    pg.click('[data-nav="report"]'); pg.click('[data-rseg="category"]'); pg.wait_for_timeout(300); pg.screenshot(path=OUT+'b-report-cat.png',full_page=True)
    pg.click('[data-nav="tx"]'); pg.wait_for_timeout(300); pg.screenshot(path=OUT+'b-tx.png')
    pg.click('#healthPill') if pg.is_visible('#healthPill') else (pg.click('[data-nav="home"]'),pg.click('#healthPill'))
    pg.wait_for_timeout(400)
    pre=pg.eval_on_selector('#claudePreview','e=>e.textContent'); print(pre[pre.index('Posisi'):pre.index('Posisi')+200])
    # export csv header
    pg.click('#advice [data-back]'); pg.click('[data-nav="more"]'); pg.click('#more [data-goto="export"]')
    with pg.expect_download() as dl: pg.click('#exportCsvBtn')
    print('csv:',open(dl.value.path(),encoding='utf-8-sig').read().splitlines()[:2])
    # fresh user
    pg2=ctx.new_page(); pg2.on('pageerror',lambda e: errors.append('pg2 '+str(e)))
    pg2.goto('http://localhost:8767/index.html'); pg2.evaluate("localStorage.clear()"); pg2.reload(); pg2.wait_for_timeout(400)
    pg2.fill('#obName','Budi'); pg2.click('#obNext'); pg2.wait_for_timeout(200); pg2.click('#obSkip'); pg2.wait_for_timeout(2900)
    print('fresh storage:',pg2.evaluate("localStorage.getItem('kantong-bersama-v1')")[:200])
    pg2.screenshot(path=OUT+'b-fresh.png')
    pg2.click('#homeInsight .insight'); pg2.wait_for_timeout(300); print('fresh insight goes to wallets:',pg2.is_visible('#wallets'))
    b.close()
srv.terminate()
print('ERRORS:',errors)
