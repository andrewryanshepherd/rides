/* Shared map background for every map on the site (race maps, heatmaps, ride pages).
   Change the look everywhere by editing MAPSTYLE below. */
(function(){
const MAPSTYLE={
  bg:'#121110',            // map panel background
  dim:.55,                 // overall strength of every background detail (0–1)
  washLo:.015, washHi:.06, // elevation shading: low ground → high ground
  contour:.07, contourIdx:.15, contourW:.6, contourIdxW:.9, // contour lines (every 4th is an index line)
  river:'127,167,201', riverBig:.45, riverSmall:.12, riverBigW:1.3, riverSmallW:.55,
  lakeFill:.12, lakeEdge:.3,
  road:'235,222,198', roadMajor:.28, roadMinor:.14, roadMajorW:1.5, roadMinorW:.9,
  labels:true, labelFont:'400 8.5px "Space Grotesk",sans-serif', riverLabel:.75, roadLabel:.8
};
const dec=s=>{const pts=[];let i=0,lat=0,lng=0;while(i<s.length){for(let k=0;k<2;k++){let sh=0,r=0,b;do{b=s.charCodeAt(i++)-63;r|=(b&31)<<sh;sh+=5}while(b>=32);const v=r&1?~(r>>1):r>>1;if(k)lng+=v;else lat+=v}pts.push([lat/1e4,lng/1e4])}return pts};
function unpack(v){return{bb:v.bb,nx:v.nx,ny:v.ny,el:typeof v.el==='string'?(v.el.match(/../g)||[]).map(x=>parseInt(x,36)+(v.off||0)):(v.el||[]),
  riv:(v.riv||[]).map(a=>({b:a[0],n:a[1],p:dec(a[2])})),road:(v.road||[]).map(a=>({c:a[0],r:a[1],p:dec(a[2])})),lake:(v.lake||[]).map(a=>({n:a[0],p:dec(a[1])}))}}
const cache={};
function load(url){return cache[url]=cache[url]||fetch(url).then(r=>r.ok?r.json():{}).then(d=>{const o={};if(d&&d.bb)return unpack(d);for(const k in (d||{}))o[k]=unpack(d[k]);return o}).catch(()=>({}))}
function draw(x,bm,P,w,h){if(!bm||document.documentElement.classList.contains('light'))return;const S0=MAPSTYLE;const [S,W,N,E]=bm.bb,nx=bm.nx,ny=bm.ny,el=bm.el;const LL=(i,j)=>[N-(N-S)*j/(ny-1),W+(E-W)*i/(nx-1)];
  x.save();x.beginPath();x.rect(0,0,w,h);x.clip();x.globalAlpha=S0.dim;x.setLineDash([]);
  // only touch grid cells that land on screen
  const q00=P(LL(0,0)),q11=P(LL(nx-1,ny-1));const cw=(q11[0]-q00[0])/(nx-1),ch=(q11[1]-q00[1])/(ny-1);
  const i0=Math.max(0,Math.floor(-q00[0]/cw)-1),i1=Math.min(nx-2,Math.ceil((w-q00[0])/cw)+1),j0=Math.max(0,Math.floor(-q00[1]/ch)-1),j1=Math.min(ny-2,Math.ceil((h-q00[1])/ch)+1);
  if(el.length===nx*ny&&i1>i0&&j1>j0){let lo=1e9,hi=-1e9;for(let j=j0;j<=j1+1;j++)for(let i=i0;i<=i1+1;i++){const v=el[j*nx+i];if(v<lo)lo=v;if(v>hi)hi=v}
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const v=(el[j*nx+i]+el[j*nx+i+1]+el[(j+1)*nx+i]+el[(j+1)*nx+i+1])/4;const t=(v-lo)/Math.max(hi-lo,1);const a=P(LL(i,j)),b=P(LL(i+1,j+1));const fe=Math.min(1,Math.min(i,nx-2-i,j,ny-2-j)/10);x.fillStyle=`rgba(255,245,233,${((S0.washLo+t*(S0.washHi-S0.washLo))*fe).toFixed(3)})`;x.fillRect(a[0],a[1],b[0]-a[0]+.6,b[1]-a[1]+.6)}
    const span=hi-lo,iv=span>800?50:span>300?25:10;x.lineJoin='round';
    for(let L=Math.ceil(lo/iv)*iv;L<=hi;L+=iv){const idx=Math.round(L/iv)%4===0;x.lineWidth=idx?S0.contourIdxW:S0.contourW;const base=idx?S0.contourIdx:S0.contour;
      for(const band of [[0,3,.25],[3,7,.6],[7,1e9,1]]){x.strokeStyle=`rgba(255,245,233,${base*band[2]})`;x.beginPath();
      for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const ed=Math.min(i,nx-2-i,j,ny-2-j);if(ed<band[0]||ed>=band[1])continue;const a=el[j*nx+i],b=el[j*nx+i+1],c=el[(j+1)*nx+i+1],d=el[(j+1)*nx+i];const cs=(a>=L?8:0)|(b>=L?4:0)|(c>=L?2:0)|(d>=L?1:0);if(cs===0||cs===15)continue;
        const f=(p,q)=>(L-p)/((q-p)||1e-9);const T=[i+f(a,b),j],R=[i+1,j+f(b,c)],B=[i+f(d,c),j+1],Lf=[i,j+f(a,d)];const sg={1:[[Lf,B]],2:[[B,R]],3:[[Lf,R]],4:[[T,R]],5:[[Lf,T],[B,R]],6:[[T,B]],7:[[Lf,T]],8:[[Lf,T]],9:[[T,B]],10:[[T,R],[Lf,B]],11:[[T,R]],12:[[Lf,R]],13:[[B,R]],14:[[Lf,B]]}[cs];
        sg.forEach(([u,v])=>{const p1=P(LL(u[0],u[1])),p2=P(LL(v[0],v[1]));x.moveTo(p1[0],p1[1]);x.lineTo(p2[0],p2[1])})}x.stroke()}}}
  const vis=p=>{for(const q of p){const s=P(q);if(s[0]>-40&&s[0]<w+40&&s[1]>-40&&s[1]<h+40)return true}return false};
  const path=pts=>{x.beginPath();pts.forEach((p,i)=>{const q=P(p);i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1])})};
  x.lineJoin='round';x.lineCap='round';
  (bm.lake||[]).forEach(l=>{if(!vis(l.p))return;path(l.p);x.closePath();x.fillStyle=`rgba(${S0.river},${S0.lakeFill})`;x.fill();x.strokeStyle=`rgba(${S0.river},${S0.lakeEdge})`;x.lineWidth=.8;x.stroke()});
  (bm.riv||[]).forEach(v=>{if(!vis(v.p))return;path(v.p);x.strokeStyle=`rgba(${S0.river},${v.b?S0.riverBig:S0.riverSmall})`;x.lineWidth=v.b?S0.riverBigW:S0.riverSmallW;x.stroke()});
  (bm.road||[]).forEach(v=>{if(!vis(v.p))return;path(v.p);const mj=v.c!=='p';x.strokeStyle=`rgba(${S0.road},${mj?S0.roadMajor:S0.roadMinor})`;x.lineWidth=mj?S0.roadMajorW:S0.roadMinorW;x.stroke()});
  if(S0.labels){x.font=S0.labelFont;x.textAlign='center';const seen=new Set(),inb=q=>q[0]>20&&q[0]<w-20&&q[1]>20&&q[1]<h-20;
    (bm.lake||[]).filter(l=>l.n&&!/pond|tank|basin/i.test(l.n)&&l.p.length>=12).forEach(l=>{if(seen.has(l.n))return;let cx=0,cy=0;l.p.forEach(p=>{const q=P(p);cx+=q[0];cy+=q[1]});cx/=l.p.length;cy/=l.p.length;if(!inb([cx,cy]))return;seen.add(l.n);x.fillStyle=`rgba(${S0.river},${S0.riverLabel})`;x.fillText(l.n.toUpperCase(),cx,cy+3)});
    (bm.riv||[]).filter(v=>v.b&&/river/i.test(v.n||'')).forEach(v=>{if(seen.has(v.n)||v.p.length<6)return;const q=P(v.p[Math.floor(v.p.length/2)]);if(!inb(q))return;seen.add(v.n);x.fillStyle=`rgba(${S0.river},${S0.riverLabel})`;x.fillText(v.n.toUpperCase(),q[0],q[1]-5)});
    (bm.road||[]).filter(v=>v.c!=='p'&&v.r).forEach(v=>{const rf=v.r;if(seen.has(rf)||v.p.length<4)return;const q=P(v.p[Math.floor(v.p.length/2)]);if(!inb(q))return;seen.add(rf);x.fillStyle='rgba(12,12,12,.85)';const tw=x.measureText(rf).width+8;x.fillRect(q[0]-tw/2,q[1]-6,tw,12);x.strokeStyle=`rgba(${S0.road},.4)`;x.lineWidth=.8;x.strokeRect(q[0]-tw/2,q[1]-6,tw,12);x.fillStyle=`rgba(${S0.road},${S0.roadLabel})`;x.fillText(rf,q[0],q[1]+3)})}
  x.restore()}
window.MapBase={style:MAPSTYLE,load,draw,unpack};
if(document.getElementById('main')||document.querySelector('#detail')){load('data/basemap_austin.json').then(d=>{if(d&&d.bb){window.__BM=d;window.__BMP=Promise.resolve();try{window.redrawAll&&redrawAll()}catch(e){}let n=0;const t=setInterval(()=>{if(++n>40||!document.querySelector('.loading')){clearInterval(t);dispatchEvent(new Event('resize'))}},150)}})}
})();
