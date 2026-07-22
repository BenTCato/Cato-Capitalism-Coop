const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
let src = fs.readFileSync(path.join(__dirname, 'coop/coop-server.js'), 'utf8');
src = src.replace('const server = http.createServer', 'const server = { listen(){}, on(){}, once(){} }; const _c = http.createServer');
src = src.replace(/\nstart\([^\n]*\);\s*$/, '\n');
src += '\nmodule.exports = { sanitizePlayerState, cleanGrade, numOr, tqPublicView, tqDashView, teacherOK, authBlockedReq, noteAuthFailReq, noteAuthOkReq, NAME_MAX_FAILS, authFailsByName };\n';
const m = { exports: {} };
vm.runInNewContext(src, { module:m, exports:m.exports, require, console, process, Buffer, setTimeout, setInterval, clearInterval, clearTimeout, __dirname, __filename:'coop-server.js' }, { filename:'coop-server.js' });
const S = m.exports;
let pass=0, fail=0;
function t(n,fn){ try{ fn(); pass++; console.log('  PASS',n);}catch(e){ fail++; console.log('  FAIL',n,'-',e.message);} }

console.log('\n[Fix 5] sanitizePlayerState strips XSS from relayed fields');
t('grade tag -> A', ()=>{assert.strictEqual(S.sanitizePlayerState({grade:'A"><img src=x onerror=alert(1)>'}).grade,'-');});
t('term tag -> number 1', ()=>{const d=S.sanitizePlayerState({term:'<img src=x onerror=alert(1)>'});assert.strictEqual(d.term,1);assert.strictEqual(typeof d.term,'number');});
t('stars tag -> 0', ()=>{assert.strictEqual(S.sanitizePlayerState({stars:'<svg onload=alert(1)>'}).stars,0);});
t('houseName brackets stripped', ()=>{assert.ok(!/[<>]/.test(S.sanitizePlayerState({houseName:'<b>x</b>'}).houseName));});
t('legit values preserved', ()=>{const d=S.sanitizePlayerState({grade:'A+',term:3,stars:1200,houseName:'Cozy Cottage'});assert.strictEqual(d.grade,'A+');assert.strictEqual(d.term,3);assert.strictEqual(d.stars,1200);assert.strictEqual(d.houseName,'Cozy Cottage');});
t('stats clamp 0..100', ()=>{const d=S.sanitizePlayerState({stats:{h:'<x>',e:150,ed:-5,f:65}});assert.strictEqual(d.stats.h,0);assert.strictEqual(d.stats.e,100);assert.strictEqual(d.stats.ed,0);assert.strictEqual(d.stats.f,65);});
t('termGrades sanitized', ()=>{const d=S.sanitizePlayerState({termGrades:{1:{grade:'"><img>',score:'x'}}});assert.strictEqual(d.termGrades[1].grade,'-');assert.strictEqual(d.termGrades[1].score,0);});

console.log('\n[Fix 2] answer key hidden from students, shown to teacher');
const tq={id:'q1',style:'mc',text:'Why trade?',choices:['a','b'],correct:0,reward:250,responses:{s1:{name:'Amy',answer:1,correct:false}}};
t('public omits correct', ()=>{assert.strictEqual(S.tqPublicView(tq).correct,undefined);});
t('public omits responses (count only)', ()=>{const v=S.tqPublicView(tq);assert.strictEqual(v.responses,undefined);assert.strictEqual(v.responseCount,1);});
t('dash keeps correct+responses', ()=>{const v=S.tqDashView(tq);assert.strictEqual(v.correct,0);assert.strictEqual(v.responses.length,1);});
t('teacherOK false wrong key', ()=>{assert.strictEqual(S.teacherOK({teacherKey:'abc'},{key:'x'}),false);});
t('teacherOK true right key', ()=>{assert.strictEqual(S.teacherOK({teacherKey:'abc'},{key:'abc'}),true);});
t('teacherOK true open room', ()=>{assert.strictEqual(S.teacherOK({},{}),true);});

console.log('\n[Fix 1] per-account cap defeats X-Forwarded-For spoofing');
t('lockout after NAME_MAX_FAILS with rotating IPs', ()=>{
  const name='victim'+Date.now();
  for(let i=0;i<S.NAME_MAX_FAILS;i++){const req={headers:{'x-forwarded-for':'10.0.0.'+i},socket:{remoteAddress:'10.0.0.'+i}};assert.strictEqual(S.authBlockedReq(req,name),false,'blocked too early i='+i);S.noteAuthFailReq(req,name);}
  const r2={headers:{'x-forwarded-for':'10.0.0.999'},socket:{remoteAddress:'10.0.0.999'}};assert.strictEqual(S.authBlockedReq(r2,name),true,'not blocked after cap');
});
t('success clears counter', ()=>{const name='clr'+Date.now();const req={headers:{},socket:{remoteAddress:'1.2.3.4'}};for(let i=0;i<3;i++)S.noteAuthFailReq(req,name);S.noteAuthOkReq(req,name);assert.ok(!S.authFailsByName.has(name.toLowerCase()));});

console.log('\n[Fix 4 helpers]');
t('cleanGrade junk -> -', ()=>{assert.strictEqual(S.cleanGrade('<script>'),'-');assert.strictEqual(S.cleanGrade('B-'),'B-');});
t('numOr fallback+clamp', ()=>{assert.strictEqual(S.numOr('x',7),7);assert.strictEqual(S.numOr(500,0,0,100),100);});

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
