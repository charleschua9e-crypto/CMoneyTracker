import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _common import ROOT, DIST, SP, OUT, serve
import json, random, datetime, subprocess, time, sys
from playwright.sync_api import sync_playwright

srv=subprocess.Popen(['python3','-m','http.server','8765'],cwd=DIST,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
random.seed(3)
today=datetime.date.today()
exp=[];inc=[];i=0
daily=[('Makan & minum',25000),('Parkir',5000),('Jajan',18000)]
for back in range(0,100):
    d=today-datetime.timedelta(days=back)
    for _ in range(random.randint(0,3)):
        c,a=random.choice(daily);i+=1
        exp.append(dict(id=str(1700000000000+i),date=d.isoformat(),type='daily',category=c,method=random.choice(['Cash','GoPay']),note=random.choice(['','kopi','makan siang']),amount=a))
    if d.day==1:
        i+=1;inc.append(dict(id=str(1700000000000+i),date=d.isoformat(),source='Gaji',method='Bank',note='',amount=4500000))
        i+=1;exp.append(dict(id=str(1700000000000+i),date=d.isoformat(),type='recurring',category='Kos',method='Bank',note='',amount=1200000))
    if d.day==5:
        i+=1;exp.append(dict(id=str(1700000000000+i),date=d.isoformat(),type='recurring',category='Bensin',method='Cash',note='',amount=150000))
db=dict(profile=dict(name='Charles',total=0),expenses=exp,incomes=inc,history=[],methodBalances={'Bank':2000000,'Cash':300000},categoryBudgets={'Jajan':200000,'Makan & minum':500000},savingsTarget=500000,recurringTemplates=[dict(id='t1',category='Internet',amount=300000,method='Bank',dayOfMonth=10,note='Indihome')])
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,service_workers='block')
    pg=ctx.new_page()
    pg.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
    pg.on('pageerror',lambda e: errors.append(str(e)))
    pg.goto('http://localhost:8765/index.html')
    pg.evaluate("d=>{localStorage.setItem('kantong-bersama-v1',JSON.stringify(d))}",db)
    pg.reload(); pg.wait_for_timeout(1200)
    pg.screenshot(path=OUT+'01-tips.png')
    pg.click('#closeTips'); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+'02-home.png')
    pg.screenshot(path=OUT+'02b-home-full.png',full_page=True)
    def last(kind):
        return pg.evaluate("k=>{let d=JSON.parse(localStorage.getItem('kantong-bersama-v1'));let a=d[k];return a[a.length-1]}",kind)
    pg.fill('#smartQuickInput','kopi 15rb gopay'); pg.press('#smartQuickInput','Enter'); pg.wait_for_timeout(300)
    print('smart1',last('expenses'))
    pg.screenshot(path=OUT+'03-toast.png')
    pg.fill('#smartQuickInput','+gaji 5jt bank'); pg.press('#smartQuickInput','Enter'); pg.wait_for_timeout(300)
    print('smart2',last('incomes'))
    pg.fill('#smartQuickInput','parkir 2.000'); pg.press('#smartQuickInput','Enter'); pg.wait_for_timeout(300)
    print('smart3',last('expenses'))
    pg.fill('#smartQuickInput','buku 50.000 dana'); pg.press('#smartQuickInput','Enter'); pg.wait_for_timeout(500)
    print('sheet open for unknown:',pg.is_visible('#txSheet'),pg.input_value('#sheetAmount'),pg.inner_text('#sheetError'))
    pg.screenshot(path=OUT+'04-sheet-pick.png')
    pg.click('#sheetSave'); pg.wait_for_timeout(200)
    print('err when no cat:',pg.inner_text('#sheetError'))
    pg.click('[data-sheet-newcat]'); pg.wait_for_timeout(200)
    pg.fill('#quickInputField','Buku'); pg.click('#quickInputSave'); pg.wait_for_timeout(200)
    pg.click('#sheetSave'); pg.wait_for_timeout(400)
    print('smart4',last('expenses'))
    # FAB flow
    pg.click('#fabAdd'); pg.wait_for_timeout(400)
    pg.click('#kindSeg [data-kind="recurring"]')
    pg.fill('#sheetAmount','75000')
    print('formatted amount:',pg.input_value('#sheetAmount'))
    pg.click('[data-sheet-cat="Bensin"]'); pg.click('#dateYesterday')
    pg.fill('#sheetNote','full tank')
    pg.screenshot(path=OUT+'05-sheet.png')
    pg.click('#sheetSave'); pg.wait_for_timeout(400)
    print('fab',last('expenses'))
    # edit via recent list
    pg.click('#recentList .tx >> nth=0'); pg.wait_for_timeout(400)
    print('edit title',pg.inner_text('#sheetTitle'),pg.input_value('#sheetAmount'))
    pg.screenshot(path=OUT+'06-edit.png')
    pg.fill('#sheetAmount','20000'); pg.click('#sheetSave'); pg.wait_for_timeout(300)
    n_before=pg.evaluate("JSON.parse(localStorage.getItem('kantong-bersama-v1')).expenses.length+JSON.parse(localStorage.getItem('kantong-bersama-v1')).incomes.length")
    pg.click('#recentList .tx >> nth=0'); pg.wait_for_timeout(300)
    pg.click('#sheetDelete'); pg.wait_for_timeout(300)
    n_after=pg.evaluate("JSON.parse(localStorage.getItem('kantong-bersama-v1')).expenses.length+JSON.parse(localStorage.getItem('kantong-bersama-v1')).incomes.length")
    pg.click('#undoBtn'); pg.wait_for_timeout(300)
    n_undo=pg.evaluate("JSON.parse(localStorage.getItem('kantong-bersama-v1')).expenses.length+JSON.parse(localStorage.getItem('kantong-bersama-v1')).incomes.length")
    print('delete/undo counts',n_before,n_after,n_undo)
    pg.wait_for_timeout(5200)
    for nav,name in [('tx','07-tx'),('report','08-report'),('more','11-more')]:
        pg.click(f'[data-nav="{nav}"]'); pg.wait_for_timeout(500)
        pg.screenshot(path=OUT+name+'.png')
        if nav=='report':
            pg.screenshot(path=OUT+name+'-full.png',full_page=True)
            pg.click('[data-rseg="category"]'); pg.wait_for_timeout(400); pg.screenshot(path=OUT+'09-report-cat.png',full_page=True)
            pg.click('[data-rseg="history"]'); pg.wait_for_timeout(400); pg.screenshot(path=OUT+'10-report-hist.png')
    for sub in ['advice','bills','wallets','budgets','security','export']:
        pg.click(f'#more [data-goto="{sub}"]'); pg.wait_for_timeout(400)
        pg.screenshot(path=OUT+f'12-{sub}.png',full_page=True)
        pg.click(f'#{sub} [data-back]'); pg.wait_for_timeout(300)
        assert pg.is_visible('#more'), sub
    # search
    pg.click('[data-nav="tx"]'); pg.fill('#searchInput','bensin'); pg.wait_for_timeout(500)
    print('search rows',pg.locator('#monthlyList .tx').count())
    pg.click('#prevMonthBtn'); pg.wait_for_timeout(300); print('month',pg.inner_text('#monthLabel'))
    # theme
    pg.click('[data-nav="more"]'); pg.click('label[for="themeSwitch"]'); pg.wait_for_timeout(300)
    pg.click('[data-nav="home"]'); pg.wait_for_timeout(400)
    pg.screenshot(path=OUT+'13-home-light.png')
    pg.click('#fabAdd'); pg.wait_for_timeout(400); pg.screenshot(path=OUT+'14-sheet-light.png'); pg.click('#sheetClose')
    pg.click('[data-nav="report"]'); pg.wait_for_timeout(400); pg.screenshot(path=OUT+'15-report-light.png')
    pg.click('#toggleHide') if pg.is_visible('#toggleHide') else None
    # privacy
    pg.click('[data-nav="home"]'); pg.click('#toggleHide'); pg.wait_for_timeout(200); pg.screenshot(path=OUT+'16-privacy.png')
    # desktop
    pg.set_viewport_size({'width':1280,'height':800}); pg.click('#toggleHide'); pg.wait_for_timeout(300); pg.screenshot(path=OUT+'17-desktop.png')
    # fresh user (no profile)
    pg2=ctx.new_page(); pg2.on('pageerror',lambda e: errors.append('pg2 '+str(e)))
    pg2.goto('http://localhost:8765/index.html'); pg2.evaluate("localStorage.clear()"); pg2.reload(); pg2.wait_for_timeout(500)
    pg2.screenshot(path=OUT+'18-onboard.png')
    pg2.fill('#obName','Budi'); pg2.click('#obNext'); pg2.wait_for_timeout(200); pg2.click('#obSkip'); pg2.wait_for_timeout(2900)
    pg2.screenshot(path=OUT+'19-empty-home.png')
    b.close()
srv.terminate()
print('ERRORS:',errors)
