/* Excel-source rule: fixed return tariffs, unrounded equal shares, display-only rounding. */
(function(root){'use strict';
const efficiencies={normal:10,kei:15};
const fareVersion='excel-source-2026';
const fares={
 'ikuchi-weekday':{label:'生口（平日）',normal:2100,kei:1700},
 'innoshima-weekday':{label:'因島（平日）',normal:1400,kei:1100},
 'ikuchi-holiday':{label:'生口（休日）',normal:1800,kei:1400},
 'innoshima-holiday':{label:'因島（休日）',normal:1100,kei:800}
};
const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b){const c=a%b;a=b;b=c;}return a||1n;};
function rational(n,d=1n){if(d===0n)throw Error('乗車家族数が0です');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return{n:n/g,d:d/g};}
function fraction(value){if(value&&typeof value==='object'&&'n'in value&&'d'in value)return rational(BigInt(value.n),BigInt(value.d));const num=Number(value);if(!Number.isFinite(num))throw Error('有限の数値を入力してください');const [m,e='0']=num.toString().split('e'),p=m.split('.'),k=(p[1]?.length||0)-Number(e),n=BigInt(p.join(''));return k>=0?rational(n,10n**BigInt(k)):rational(n*10n**BigInt(-k));}
const add=(a,b)=>rational(a.n*b.d+b.n*a.d,a.d*b.d),neg=a=>rational(-a.n,a.d),sub=(a,b)=>add(a,neg(b)),div=(a,n)=>rational(a.n,a.d*BigInt(n)),asNumber=a=>Number(a.n)/Number(a.d),serial=a=>({n:String(a.n),d:String(a.d)});
function roundYen(value){const a=fraction(value),sign=a.n<0n?-1n:1n,n=a.n<0n?-a.n:a.n;return Number(sign*((n*2n+a.d)/(a.d*2n)));}
function nonnegative(value,label,max=1000000){if(value===null||value===undefined||value===''||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>max)throw Error(label+'を0以上の数値で入力してください');return fraction(value);}
function mode(leg){return leg.fareMode||'legacy';}
function cost(leg){const m=mode(leg);if(m==='table'){if(leg.fareVersion&&leg.fareVersion!==fareVersion)throw Error('未対応の料金表です');const f=fares[leg.fareKey];if(!f)throw Error('料金区分を選んでください');return rational(BigInt(f[leg.car]),2n);}
 if(m==='manual')return nonnegative(leg.manualAmount,'片道金額');
 if(m==='legacy'){const d=nonnegative(leg.distance,'距離'),p=nonnegative(leg.price,'ガソリン単価'),t=nonnegative(leg.toll,'高速料金');if(p.n===0n)throw Error('ガソリン単価は0より大きくしてください');return add(rational(d.n*p.n,d.d*p.d*BigInt(efficiencies[leg.car])),t);}
 throw Error('Excelの料金区分または手入力を選んでください');}
function calculate(leg){if(!Object.hasOwn(efficiencies,leg.car)||!leg.driver||!Array.isArray(leg.riders)||!leg.riders.length||new Set(leg.riders).size!==leg.riders.length)throw Error('担当家族と乗車家族を選んでください');if(leg.policy&&leg.policy!=='equalFamily')throw Error('未対応の精算ルールです');const c=cost(leg),s=div(c,leg.riders.length);return{total:asNumber(c),rawTotal:asNumber(c),perFamily:asNumber(s),shares:Object.fromEntries(leg.riders.map(id=>[id,asNumber(s)])),discarded:0,needsReview:mode(leg)==='legacy',exactTotal:serial(c),exactShare:serial(s)};}
function summarize(records,families){const rows=Object.fromEntries(families.map(f=>[f.id,{id:f.id,p:rational(0n),o:rational(0n)}]));for(const rec of records)for(const leg of rec.legs){const c=calculate(leg),total=fraction(c.exactTotal),share=fraction(c.exactShare);if(!rows[leg.driver])throw Error('担当家族が設定にありません');rows[leg.driver].p=add(rows[leg.driver].p,total);for(const id of leg.riders){if(!rows[id])throw Error('乗車家族が設定にありません');rows[id].o=add(rows[id].o,share);}}return Object.values(rows).map(r=>{const balance=sub(r.p,r.o);return{id:r.id,paid:asNumber(r.p),owed:asNumber(r.o),balance:asNumber(balance),exactBalance:serial(balance),displayBalance:roundYen(balance)};});}
function transfers(rows){const plus=rows.filter(r=>r.balance>0).map(r=>({id:r.id,n:fraction(r.exactBalance||r.balance)})),minus=rows.filter(r=>r.balance<0).map(r=>({id:r.id,n:neg(fraction(r.exactBalance||r.balance))})),out=[];let a=0,b=0;while(a<minus.length&&b<plus.length){const x=minus[a].n,y=plus[b].n,n=x.n*y.d<y.n*x.d?x:y;out.push({from:minus[a].id,to:plus[b].id,amount:asNumber(n),exactAmount:serial(n)});minus[a].n=sub(x,n);plus[b].n=sub(y,n);if(minus[a].n.n===0n)a++;if(plus[b].n.n===0n)b++;}return out;}
const api={calculate,summarize,transfers,roundYen,efficiencies,fares,fareVersion};if(typeof module!=='undefined')module.exports=api;root.RideCore=api;
})(globalThis);
