import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _common import ROOT, DIST, SP, OUT, serve
import subprocess,time,json
from playwright.sync_api import sync_playwright

srv=serve(8771)
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,service_workers='block')
    pg=ctx.new_page()
    pg.on('pageerror',lambda e: errors.append(str(e)))
    pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'TUNNEL' not in m.text else None)
    cdp=ctx.new_cdp_session(pg)
    cdp.send('WebAuthn.enable')
    auth=cdp.send('WebAuthn.addVirtualAuthenticator',{'options':{'protocol':'ctap2','transport':'internal','hasResidentKey':True,'hasUserVerification':True,'isUserVerified':True,'automaticPresenceSimulation':True}})['authenticatorId']
    pg.goto('http://localhost:8771/index.html')
    pg.evaluate("localStorage.clear();localStorage.setItem('kantong-bersama-v1',JSON.stringify({profile:{name:'Charles',total:0},methodBalances:{Utama:500000}}));localStorage.setItem('cmoneytracker-tips-seen-v39','1');localStorage.setItem('cmoneytracker-whatsnew-v43','1')")
    pg.reload(); pg.wait_for_timeout(1300)
    pg.click('[data-nav="more"]'); pg.click('#more [data-goto="security"]'); pg.wait_for_timeout(300)
    print('no pin -> switch disabled:',pg.is_disabled('#bioSwitch'),'|',pg.inner_text('#bioStatus'))
    pg.fill('#newPinInput','1234'); pg.fill('#confirmPinInput','1234'); pg.click('#setPinBtn'); pg.wait_for_timeout(300)
    print('pin set -> switch disabled:',pg.is_disabled('#bioSwitch'),'|',pg.inner_text('#bioStatus'))
    pg.click('label.switch:has(#bioSwitch)'); pg.wait_for_timeout(1500)
    bio=pg.evaluate("JSON.parse(localStorage.getItem('cmoneytracker-bio'))"); print('bio stored:',bio and {k:(v if k!='pk' else (v or '')[:12]) for k,v in bio.items()})
    print('status:',pg.inner_text('#bioStatus'),'| menu meta:',pg.inner_text('#menuPinMeta'))
    pg.screenshot(path=OUT+'e-security.png',full_page=True)
    pg.click('#testLockBtn'); pg.wait_for_timeout(1500)
    print('after lock+auto bio, locked?',pg.is_visible('#lockScreen'))
    pg.reload(); pg.wait_for_timeout(2000)
    print('reload auto bio, locked?',pg.is_visible('#lockScreen'))
    cdp.send('WebAuthn.setUserVerified',{'authenticatorId':auth,'isUserVerified':False})
    pg.reload(); pg.wait_for_timeout(2000)
    print('UV false, locked?',pg.is_visible('#lockScreen'),'err:',pg.inner_text('#lockError'),'bio btn:',pg.is_visible('#bioUnlockBtn'))
    pg.screenshot(path=OUT+'e-lock.png')
    pg.fill('#lockPinInput','1111'); pg.click('#lockUnlockBtn'); pg.wait_for_timeout(300); print('wrong pin err:',pg.inner_text('#lockError'))
    pg.fill('#lockPinInput','1234'); pg.wait_for_timeout(500); print('pin unlock, locked?',pg.is_visible('#lockScreen'))
    cdp.send('WebAuthn.setUserVerified',{'authenticatorId':auth,'isUserVerified':True})
    # auto-lock after background
    pg.evaluate("""()=>{Object.defineProperty(document,'hidden',{get:()=>true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));
      const real=Date.now.bind(Date);Date.now=()=>real()+120000;
      Object.defineProperty(document,'hidden',{get:()=>false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));}""")
    pg.wait_for_timeout(200); print('auto-lock shown:',pg.is_visible('#lockScreen'))
    pg.wait_for_timeout(1500); print('then bio unlocked:',not pg.is_visible('#lockScreen'))
    # change pin
    pg.reload(); pg.wait_for_timeout(2000)
    pg.click('[data-nav="more"]'); pg.click('#more [data-goto="security"]'); pg.wait_for_timeout(300)
    pg.click('#changePinBtn'); print('change form visible:',pg.is_visible('#newPinInput'),'pin still set:',bool(pg.evaluate("localStorage.getItem('cmoneytracker-pin-hash')")))
    pg.click('#cancelPinChange'); print('after cancel form visible:',pg.is_visible('#newPinInput'))
    pg.click('#changePinBtn'); pg.fill('#newPinInput','5678'); pg.fill('#confirmPinInput','5678'); pg.click('#setPinBtn'); pg.wait_for_timeout(300)
    print('bio kept after change:',bool(pg.evaluate("localStorage.getItem('cmoneytracker-bio')")))
    pg.on('dialog',lambda d:d.accept())
    pg.click('#removePinBtn'); pg.wait_for_timeout(300)
    print('after remove: pin',pg.evaluate("localStorage.getItem('cmoneytracker-pin-hash')"),'bio',pg.evaluate("localStorage.getItem('cmoneytracker-bio')"),'switch disabled',pg.is_disabled('#bioSwitch'))
    # unsupported device
    ctx2=b.new_context(viewport={'width':390,'height':844}); p2=ctx2.new_page()
    p2.add_init_script("window.PublicKeyCredential&&(PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable=()=>Promise.resolve(false))")
    p2.goto('http://localhost:8771/index.html'); p2.evaluate("localStorage.setItem('kantong-bersama-v1',JSON.stringify({profile:{name:'X',total:0}}));localStorage.setItem('cmoneytracker-pin-hash','x');localStorage.setItem('cmoneytracker-tips-seen-v39','1');localStorage.setItem('cmoneytracker-whatsnew-v43','1')")
    p2.reload(); p2.wait_for_timeout(1300)
    print('unsupported: lock visible',p2.is_visible('#lockScreen'),'bio btn',p2.is_visible('#bioUnlockBtn'))
    b.close()
srv.terminate()
print('ERRORS:',errors)
