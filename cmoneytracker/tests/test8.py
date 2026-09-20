import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _common import ROOT, DIST, SP, OUT, serve
import json, datetime, subprocess, time
from playwright.sync_api import sync_playwright

srv=serve(8774)
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
def last(pg): return pg.evaluate("(()=>{const d=JSON.parse(localStorage.getItem('kantong-bersama-v1'));return d.expenses[d.expenses.length-1]})()")
def smart(pg,t):
    pg.fill('#smartQuickInput',t); pg.press('#smartQuickInput','Enter'); pg.wait_for_timeout(300)
    return last(pg), pg.inner_text('#undoToastMsg')
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,service_workers='block')
    pg=ctx.new_page(); pg.on('pageerror',lambda e: errors.append(str(e)))
    pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('http://localhost:8774/index.html')
    pg.evaluate("d=>{localStorage.clear();localStorage.setItem('kantong-bersama-v1',JSON.stringify(d));localStorage.setItem('cmoneytracker-tips-seen-v39','1');localStorage.setItem('cmoneytracker-whatsnew-v43','1')}",db)
    pg.reload(); pg.wait_for_timeout(1500)
    print('nudges:',pg.inner_text('#smartNudges').replace('\n',' | '))
    print('tiles:',pg.inner_text('#tileRunway'),pg.get_attribute('#tileRunway','title'),'avg',pg.inner_text('#tileAvg'))
    pg.eval_on_selector('#smartNudges','e=>e.scrollIntoView({block:"center"})'); pg.screenshot(path=OUT+'h-home.png')
    x,tm=smart(pg,'kopi 20rb'); print('learned kopi ->',x['category'],'|',tm)
    x,tm=smart(pg,'kopi 20rb'); print('dup ->',tm)
    x,tm=smart(pg,'parkir 2'); print('parkir 2 ->',x['amount'],x['category'])
    x,tm=smart(pg,'jajan 5'); print('jajan 5 ->',x['amount'])
    x,tm=smart(pg,'makan 400rb'); print('unusual ->',tm)
    # sheet
    pg.click('#fabAdd'); pg.wait_for_timeout(400)
    pg.fill('#sheetNote','kopi susu'); pg.wait_for_timeout(200)
    print('auto cat:',pg.inner_text('#sheetCats .chip.on'),'|',pg.inner_text('#sheetError'))
    print('freq chips:',pg.inner_text('#sheetAmtHelp').replace('\n',' '))
    pg.fill('#sheetAmount','5'); pg.dispatch_event('#sheetAmount','input'); pg.wait_for_timeout(150)
    print('small chip:',pg.inner_text('#sheetAmtHelp'))
    pg.click('#sheetAmtHelp [data-amt-fill]'); print('filled:',pg.input_value('#sheetAmount'))
    pg.fill('#sheetAmount','400000'); pg.dispatch_event('#sheetAmount','input'); pg.wait_for_timeout(150)
    print('hint:',pg.inner_text('#sheetHint'))
    pg.screenshot(path=OUT+'h-sheet.png')
    pg.fill('#sheetAmount','20000'); pg.dispatch_event('#sheetAmount','input')
    pg.click('#sheetSave'); pg.wait_for_timeout(200)
    print('dup warn:',pg.inner_text('#sheetError'),'|',pg.inner_text('#sheetSave'))
    pg.click('#sheetSave'); pg.wait_for_timeout(300)
    print('saved after confirm:',pg.is_hidden('#txSheet'),last(pg)['note'])
    # nudges action: payday
    pg.wait_for_timeout(2600)
    btn=pg.query_selector('[data-nudge^="payday"]')
    if btn: btn.click(); pg.wait_for_timeout(300); print('payday set:',pg.evaluate("JSON.parse(localStorage.getItem('kantong-bersama-v1')).payday"))
    # bills suggestions
    pg.evaluate("document.querySelector('[data-goto=bills]').click()"); pg.wait_for_timeout(300)
    print('bill sug:',pg.inner_text('#billSugList').replace('\n',' | '))
    pg.screenshot(path=OUT+'h-bills.png',full_page=True)
    pg.click('#billSugList [data-rec-apply]'); pg.wait_for_timeout(300)
    st=pg.evaluate("(()=>{const d=JSON.parse(localStorage.getItem('kantong-bersama-v1'));return {t:d.recurringTemplates,linked:d.expenses.filter(x=>x.templateId).length}})()")
    print('templates:',st)
    pg.evaluate("history.back()"); pg.wait_for_timeout(300)
    # budgets
    pg.evaluate("document.querySelector('[data-goto=budgets]').click()"); pg.wait_for_timeout(300)
    print('auto budget:',pg.inner_text('#autoBudgetCard')[:500].replace('\n',' | '))
    pg.click('#applyAutoBudget'); pg.wait_for_timeout(200)
    print('filled budget:',pg.input_value('#monthlyBudgetInput'), pg.input_value('[data-cat-budget="Jajan"]'))
    pg.screenshot(path=OUT+'h-budget.png',full_page=True)
    pg.evaluate("history.back()"); pg.wait_for_timeout(300)
    pg.click('[data-nav="report"]'); pg.wait_for_timeout(400)
    print('habits:',pg.inner_text('#habitCard').replace('\n',' | '))
    print('runway:',pg.inner_text('#sumRunway'))
    pg.eval_on_selector('#habitCard','e=>e.scrollIntoView()')
    pg.screenshot(path=OUT+'h-habit.png')
    pg.click('#healthPill') if pg.is_visible('#healthPill') else None
    pg.click('[data-nav="home"]'); pg.click('#healthPill'); pg.wait_for_timeout(300)
    print('findings:',pg.eval_on_selector_all('#adviceList .advice-card','els=>els.map(e=>e.querySelector("div > b").textContent)'))
    b.close()
srv.terminate()
print('ERRORS:',errors)
