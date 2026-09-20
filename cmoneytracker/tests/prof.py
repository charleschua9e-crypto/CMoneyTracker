import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _common import ROOT, DIST, SP, OUT, serve
exec(open('perf.py').read().split("with sync_playwright() as p:")[0])
from collections import defaultdict
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':390,'height':844},service_workers='block');pg=ctx.new_page()
    cdp=ctx.new_cdp_session(pg)
    pg.goto('http://localhost:8784/index.html')
    pg.evaluate("d=>{localStorage.clear();localStorage.setItem('kantong-bersama-v1',JSON.stringify(d));localStorage.setItem('cmoneytracker-tips-seen-v39','1');localStorage.setItem('cmoneytracker-whatsnew-v43','1');localStorage.setItem('cmoneytracker-persist-asked','2026-09-17')}",db)
    pg.reload();pg.wait_for_timeout(2500)
    cdp.send('Profiler.enable');cdp.send('Profiler.setSamplingInterval',{'interval':100});cdp.send('Profiler.start')
    for k in range(5):
        pg.evaluate("()=>{const i=document.querySelector('#smartQuickInput');i.value='kopi 1'+Math.random().toString().slice(2,4)+'rb';document.querySelector('#smartForm').requestSubmit()}")
    prof=cdp.send('Profiler.stop')['profile']
    nodes={n['id']:n for n in prof['nodes']}
    self_t=defaultdict(float)
    dt=prof['timeDeltas'];samples=prof['samples']
    for s,d in zip(samples,dt): 
        n=nodes[s]['callFrame'];self_t[n['functionName'] or '(anon)']+=d/1000
    # total (inclusive) via parent map
    parent={}
    for n in prof['nodes']:
        for c in n.get('children',[]): parent[c]=n['id']
    incl=defaultdict(float)
    for s,d in zip(samples,dt):
        seen=set();x=s
        while x is not None:
            fn=nodes[x]['callFrame']['functionName'] or '(anon)'
            if fn not in seen: incl[fn]+=d/1000;seen.add(fn)
            x=parent.get(x)
    print('SELF top:');[print('  %6.1f %s'%(v,k)) for k,v in sorted(self_t.items(),key=lambda x:-x[1])[:18]]
    print('INCLUSIVE top:');[print('  %6.1f %s'%(v,k)) for k,v in sorted(incl.items(),key=lambda x:-x[1])[:40]]
    b.close()
srv.terminate()
