import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _common import ROOT, DIST, SP, OUT, serve
import json, random, datetime, subprocess, time
from playwright.sync_api import sync_playwright


srv=serve(8769)
src=open('test2.py').read(); ns={}
random.seed(3); today=datetime.date.today()
exec(src[src.index('def mk'):src.index('scenarios=')],{'random':random,'datetime':datetime,'today':today},ns)
db=ns['mk'](); db['monthlyBudget']=3000000
FAKE="""
window.webkitSpeechRecognition=class{constructor(){this.lang='';}
 start(){setTimeout(()=>{this.onresult&&this.onresult({results:[Object.assign([{transcript:window.__say||'kopi lima belas ribu'}],{isFinal:true})]});setTimeout(()=>this.onend&&this.onend(),50)},100)}
 stop(){this.onend&&this.onend()}};
window.SpeechRecognition=window.webkitSpeechRecognition;
"""
errors=[]
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('kantong-bersama-v1'))")
def saldo(pg):
    pg.wait_for_timeout(700); return pg.inner_text('#saldoTersedia')
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,service_workers='block')
    ctx.add_init_script(FAKE)
    pg=ctx.new_page()
    pg.on('pageerror',lambda e: errors.append(str(e)))
    pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    pg.goto('http://localhost:8769/index.html')
    pg.evaluate("d=>{localStorage.clear();localStorage.setItem('kantong-bersama-v1',JSON.stringify(d));localStorage.setItem('cmoneytracker-tips-seen-v39','1');localStorage.setItem('cmoneytracker-whatsnew-v43','1')}",db)
    pg.reload(); pg.wait_for_timeout(1300)
    print('safe:',pg.inner_text('#safeCard').replace('\n',' | '))
    print('tileBudget:',pg.inner_text('#tileBudget'),'| streaks:',pg.inner_text('#streakRow'))
    pg.screenshot(path=OUT+'d-home.png')
    # voice
    pg.click('#micBtn'); pg.wait_for_timeout(900)
    e=st(pg)['expenses'][-1]; print('voice expense:',e['category'],e['amount'],e['note'])
    pg.evaluate("window.__say='pemasukan bonus dua juta'"); pg.click('#micBtn'); pg.wait_for_timeout(900)
    i=st(pg)['incomes'][-1]; print('voice income:',i['source'],i['amount'])
    print('safe after:',pg.inner_text('#safeMeta1'))
    # debts
    s0=saldo(pg)
    pg.click('[data-nav="more"]'); pg.click('#more [data-goto="debts"]'); pg.wait_for_timeout(300)
    pg.click('#addDebtBtn'); pg.wait_for_timeout(300)
    pg.fill('#debtAmount','100000'); pg.fill('#debtPerson','Andi'); pg.fill('#debtNote','uang makan')
    y=(today-datetime.timedelta(days=5)).isoformat(); pg.fill('#debtDate',y); pg.fill('#debtDue',(today-datetime.timedelta(days=1)).isoformat())
    pg.screenshot(path=OUT+'d-debtform.png')
    pg.click('#saveDebtBtn'); pg.wait_for_timeout(300)
    pg.click('#addDebtBtn'); pg.click('[data-dir="borrow"]'); pg.fill('#debtAmount','250000'); pg.fill('#debtPerson','Kakak'); pg.fill('#debtDate',(today-datetime.timedelta(days=10)).isoformat()); pg.fill('#debtDue',(today-datetime.timedelta(days=2)).isoformat()); pg.click('#saveDebtBtn'); pg.wait_for_timeout(300)
    pg.click('#addDebtBtn'); pg.click('[data-dir="borrow"]'); pg.fill('#debtAmount','50000'); pg.fill('#debtPerson','Rudi'); pg.uncheck('#debtMoves'); pg.click('#saveDebtBtn'); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+'d-debts.png')
    print('debt summary:',pg.inner_text('#debtOwedToMe'),pg.inner_text('#debtIOwe'),'menu',pg.inner_text('#menuDebtsMeta'))
    pg.click('[data-debt] >> text=Andi'); pg.wait_for_timeout(300)
    pg.fill('#payAmount','40000'); pg.click('#payBtn'); pg.wait_for_timeout(300)
    print('after pay left:',pg.inner_text('#debtDetailLeft'))
    pg.screenshot(path=OUT+'d-debtdetail.png')
    with pg.expect_popup() as pop: pg.click('#waRemindBtn')
    print('wa:',pop.value.url[:120]); pop.value.close()
    pg.click('#settleBtn'); pg.wait_for_timeout(300); print('after settle:',pg.inner_text('#debtDetailLeft'))
    pg.click('#debtClose')
    d=st(pg)['debts']; print('debts:',[(x['person'],x['dir'],x['amount'],sum(q['amount'] for q in x['payments']),x['moves']) for x in d])
    # split
    pg.click('#splitBillBtn'); pg.wait_for_timeout(300)
    pg.fill('#splitTotal','125000'); pg.fill('#splitNames','Andi, Budi'); pg.fill('#splitNote','Makan malam'); pg.wait_for_timeout(100)
    print('split result:',pg.inner_text('#splitResult').replace('\n',' | '))
    pg.screenshot(path=OUT+'d-split.png')
    before=json.dumps(st(pg))
    pg.click('#saveSplitBtn'); pg.wait_for_timeout(300)
    s=st(pg); print('split exp:',s['expenses'][-1]['amount'],s['expenses'][-1]['note'],'new debts:',[(x['person'],x['amount']) for x in s['debts'][-2:]])
    pg.click('#debts [data-back]'); pg.click('[data-nav="home"]')
    print('saldo before debts',s0,'after all',saldo(pg))
    # expected: -100000 +40000 +60000(settle) +250000 (borrow moves) + 0 (Rudi no move) -125000 (split) = +125000
    pg.click('#healthPill'); pg.wait_for_timeout(400)
    print('findings:',pg.locator('#adviceList .advice-card > div > b').all_inner_texts()[:6])
    pre=pg.eval_on_selector('#claudePreview','e=>e.textContent'); print('claude has utang:', 'Utang saya' in pre, 'Anggaran' in pre)
    pg.click('#advice [data-back]')
    # recap
    pg.click('[data-nav="report"]'); pg.click('[data-rseg="history"]'); pg.wait_for_timeout(300)
    pg.click('#archiveList details >> nth=0'); pg.click('#archiveList [data-recap] >> nth=0'); pg.wait_for_timeout(500)
    n=pg.locator('#recapTrack .rc').count(); print('recap cards',n,pg.inner_text('#recapTitle'))
    for k in range(n):
        pg.screenshot(path=OUT+f'd-recap{k}.png')
        pg.mouse.click(330,420); pg.wait_for_timeout(600)
    print('bars on:',pg.locator('#recapBars i.on').count())
    pg.click('#recapClose')
    # budgets page
    pg.click('[data-nav="more"]'); pg.click('#more [data-goto="budgets"]'); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+'d-budgets.png')
    pg.click('[data-budget-sug] >> nth=0'); pg.click('#saveMonthlyBudget'); pg.wait_for_timeout(300)
    print('budget saved:',st(pg)['monthlyBudget'])
    # banner test with clock early month
    pg2=ctx.new_page(); pg2.clock.install(time=datetime.datetime(2026,10,3,9,0))
    pg2.on('pageerror',lambda e: errors.append('pg2 '+str(e)))
    pg2.goto('http://localhost:8769/index.html'); pg2.wait_for_timeout(1500)
    print('banner visible Oct 3:',pg2.is_visible('#recapBanner'),pg2.inner_text('#recapBanner') if pg2.is_visible('#recapBanner') else '')
    pg2.screenshot(path=OUT+'d-banner.png')
    pg2.click('#recapBanner'); pg2.wait_for_timeout(400); print('opened:',pg2.inner_text('#recapTitle'))
    pg2.click('#recapClose'); pg2.reload(); pg2.wait_for_timeout(1500); print('banner after seen:',pg2.is_visible('#recapBanner'))
    b.close()
srv.terminate()
print('ERRORS:',errors)
