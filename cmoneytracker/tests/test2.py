import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _common import ROOT, DIST, SP, OUT, serve
import json, random, datetime, subprocess, time
from playwright.sync_api import sync_playwright

srv=subprocess.Popen(['python3','-m','http.server','8766'],cwd=DIST,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
random.seed(3)
today=datetime.date.today()
def mk(extra_daily=1.0, salary=4500000):
    exp=[];inc=[];i=0
    daily=[('Makan & minum',25000),('Parkir',5000),('Jajan',18000)]
    for back in range(0,200):
        d=today-datetime.timedelta(days=back)
        for _ in range(random.randint(0,int(3*extra_daily))):
            c,a=random.choice(daily);i+=1
            exp.append(dict(id=str(1700000000000+i),date=d.isoformat(),type='daily',category=c,method=random.choice(['Cash','GoPay']),note='',amount=a))
        if d.day==1 and salary:
            i+=1;inc.append(dict(id=str(1700000000000+i),date=d.isoformat(),source='Gaji',method='Bank',note='',amount=salary))
            i+=1;exp.append(dict(id=str(1700000000000+i),date=d.isoformat(),type='recurring',category='Kos',method='Bank',note='',amount=1500000))
    return dict(profile=dict(name='Charles',total=0),expenses=exp,incomes=inc,history=[],methodBalances={'Bank':500000,'Cash':800000,'GoPay':600000},categoryBudgets={'Jajan':200000},savingsTarget=0,recurringTemplates=[dict(id='t1',category='Internet',amount=300000,method='Bank',dayOfMonth=20,note='')])
scenarios={'normal':mk(),'boros':mk(extra_daily=3,salary=3000000),'noincome':mk(salary=0)}
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,service_workers='block')
    ctx.grant_permissions(['clipboard-read','clipboard-write'])
    for name,db in scenarios.items():
        pg=ctx.new_page()
        pg.on('pageerror',lambda e: errors.append(name+': '+str(e)))
        pg.on('console',lambda m: errors.append(name+' console: '+m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
        pg.goto('http://localhost:8766/index.html')
        pg.evaluate("d=>{localStorage.clear();localStorage.setItem('kantong-bersama-v1',JSON.stringify(d));localStorage.setItem('cmoneytracker-tips-seen-v39','1');localStorage.setItem('cmoneytracker-whatsnew-v43','1')}",db)
        pg.reload(); pg.wait_for_timeout(700)
        print(name,'pill:',pg.inner_text('#healthPill'),'| insight:',pg.inner_text('#homeInsight').replace('\n',' / ')[:140])
        pg.screenshot(path=OUT+f'a-{name}-home.png')
        pg.click('#healthPill'); pg.wait_for_timeout(500)
        pg.screenshot(path=OUT+f'a-{name}-advice.png',full_page=True)
        titles=pg.locator('#adviceList .advice-card div > b').all_inner_texts()
        print('  findings:',titles)
        print('  parts:',pg.inner_text('#scoreParts').replace('\n',' | ')[:300])
        if name=='normal':
            pg.click('[data-claude-tpl="1"]'); pg.wait_for_timeout(200)
            pre=pg.eval_on_selector('#claudePreview','e=>e.textContent')
            print('  preview len',len(pre),'has name?', 'Charles' in pre)
            pass
            pg.fill('#claudeQuestion','Evaluasi keuangan saya'); 
            with pg.expect_popup() as pop:
                pg.click('#askClaudeBtn')
            popup=pop.value
            popup.wait_for_timeout(800)
            print('  popup url start:',popup.url[:80],'len',len(popup.url))
            clip=pg.evaluate("navigator.clipboard.readText()")
            print('  clipboard ok:',clip.startswith('Bertindaklah'))
            popup.close()
            # budgets class toggle
            pg.click('#advice [data-back]'); pg.click('[data-nav="more"]'); pg.click('#more [data-goto="budgets"]'); pg.wait_for_timeout(300)
            pg.screenshot(path=OUT+'a-budgets.png',full_page=True)
            pg.click('[data-class-toggle="Makan & minum"]'); pg.click('#saveCategoryBudgets'); pg.wait_for_timeout(300)
            print('  class saved:',pg.evaluate("JSON.parse(localStorage.getItem('kantong-bersama-v1')).categoryClass"))
            # menu to claude card
            pg.click('#budgets [data-back]'); pg.click('#more [data-scroll="claudeCard"]'); pg.wait_for_timeout(800)
            pg.screenshot(path=OUT+'a-claudecard.png')
            pg.click('#topbar') if pg.is_visible('#topbar') else None
            pg.set_viewport_size({'width':390,'height':844})
            pg.evaluate("document.documentElement.setAttribute('data-theme','light')")
            pg.screenshot(path=OUT+'a-claudecard-light.png')
        pg.close()
    # empty user
    pg=ctx.new_page(); pg.on('pageerror',lambda e: errors.append('empty: '+str(e)))
    pg.goto('http://localhost:8766/index.html'); pg.evaluate("localStorage.clear();localStorage.setItem('kantong-bersama-v1',JSON.stringify({profile:{name:'Budi',total:0}}));localStorage.setItem('cmoneytracker-tips-seen-v39','1');localStorage.setItem('cmoneytracker-whatsnew-v43','1')"); pg.reload(); pg.wait_for_timeout(500)
    print('empty pill:',pg.inner_text('#healthPill'))
    pg.click('#healthPill'); pg.wait_for_timeout(300); pg.screenshot(path=OUT+'a-empty-advice.png',full_page=True)
    b.close()
srv.terminate()
print('ERRORS:',errors)
