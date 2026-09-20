import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _common import ROOT, DIST, SP, OUT, serve
import subprocess,time,datetime
from playwright.sync_api import sync_playwright

srv=serve(8780)
t=datetime.date.today()
import calendar
left=calendar.monthrange(t.year,t.month)[1]-t.day+1
saldo=70000*left
db=dict(profile=dict(name='Charles',total=0,planAt='2026-09-01'),expenses=[],incomes=[],methodBalances={'Utama':saldo},history=[])
errors=[]
def txt(pg,s): return pg.inner_text(s).replace('\n',' | ')
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,service_workers='block')
    pg=ctx.new_page(); pg.on('pageerror',lambda e: errors.append(str(e)))
    pg.goto('http://localhost:8780/index.html')
    pg.evaluate("d=>{localStorage.clear();localStorage.setItem('kantong-bersama-v1',JSON.stringify(d));localStorage.setItem('cmoneytracker-tips-seen-v39','1');localStorage.setItem('cmoneytracker-whatsnew-v43','1')}",db)
    pg.reload(); pg.wait_for_timeout(1500)
    print('awal:',pg.inner_text('#safeToday'),'|',pg.inner_text('#safeMeta1'))
    # nonton dicatat sebagai Jajan lewat form
    pg.click('#fabAdd'); pg.wait_for_timeout(300)
    pg.click('[data-kind="recurring"]'); pg.click('[data-sheet-cat="Jajan"]')
    pg.fill('#sheetAmount','35000'); pg.dispatch_event('#sheetAmount','input'); pg.fill('#sheetNote','nonton'); pg.dispatch_event('#sheetNote','input')
    print('toggle visible:',pg.is_visible('#sheetSpread'),'| on:','on' in pg.get_attribute('#sheetSpread','class'),'|',pg.inner_text('#sheetSpreadSub'))
    pg.screenshot(path=OUT+'s-sheet-off.png')
    pg.click('#sheetSave'); pg.wait_for_timeout(400)
    print('setelah nonton (belum disebar):',pg.inner_text('#safeToday'),'|',pg.inner_text('#safeMeta1'))
    print('saran:',txt(pg,'#safeOneOff'))
    pg.screenshot(path=OUT+'s-home-suggest.png')
    pg.click('[data-spread-ids]'); pg.wait_for_timeout(400)
    print('setelah disebar:',pg.inner_text('#safeToday'),'|',pg.inner_text('#safeMeta1'),'| toast:',pg.inner_text('#undoToastMsg'))
    print('info:',txt(pg,'#safeOneOff'))
    print('tx label:',txt(pg,'#recentList')[:80])
    pg.screenshot(path=OUT+'s-home-spread.png')
    # makan 30rb hari ini tetap memotong
    pg.fill('#smartQuickInput','makan 30rb'); pg.press('#smartQuickInput','Enter'); pg.wait_for_timeout(300)
    print('setelah makan:',pg.inner_text('#safeToday'),'|',pg.inner_text('#safeMeta1'))
    # nonton berikutnya lewat ketik cepat -> Hiburan otomatis sesekali
    pg.fill('#smartQuickInput','nonton xxi 50rb'); pg.press('#smartQuickInput','Enter'); pg.wait_for_timeout(300)
    last=pg.evaluate("(()=>{const d=JSON.parse(localStorage.getItem('kantong-bersama-v1'));return d.expenses[d.expenses.length-1]})()")
    print('ketik cepat nonton:',last['category'],last.get('spread'),'|',pg.inner_text('#safeToday'))
    # edit transaksi: toggle mencerminkan status
    pg.click('#recentList .tx:has-text("Jajan")'); pg.wait_for_timeout(300)
    print('edit toggle on:','on' in pg.get_attribute('#sheetSpread','class'),'|',pg.inner_text('#sheetSpreadSub'))
    pg.screenshot(path=OUT+'s-sheet-on.png')
    pg.click('#sheetSpread'); pg.click('#sheetSave'); pg.wait_for_timeout(300)
    print('setelah matikan di edit:',pg.inner_text('#safeToday'),'| saran lagi:',txt(pg,'#safeOneOff')[:60])
    pg.click('#safeOneOff [data-oneoff-x]'); pg.wait_for_timeout(300)
    print('ditutup:',pg.is_hidden('#safeOneOff'))
    b.close()
srv.terminate()
print('ERRORS:',errors)
