import json, sys, math
from collections import defaultdict
import os
HERE=os.path.dirname(os.path.abspath(__file__))
G=os.path.join(HERE,'data')+'/'
LNG0,LAT0=-87.745,41.830; LNG1,LAT1=-87.590,41.995
S=1e5
def q(c): return (round((c[0]-LNG0)*S), round((c[1]-LAT0)*S))
def inb(c,m=0.004): return LNG0-m<=c[0]<=LNG1+m and LAT0-m<=c[1]<=LAT1+m
def rdp(pts,eps):
    if len(pts)<3: return pts
    a,b=pts[0],pts[-1];dx,dy=b[0]-a[0],b[1]-a[1];L=math.hypot(dx,dy) or 1
    i,dm=0,0
    for k in range(1,len(pts)-1):
        p=pts[k];d=abs(dy*(p[0]-a[0])-dx*(p[1]-a[1]))/L
        if d>dm:i,dm=k,d
    if dm>eps: return rdp(pts[:i+1],eps)[:-1]+rdp(pts[i:],eps)
    return [a,b]
def enc(pts):
    out=[];px=py=0
    for x,y in pts: out+= [x-px,y-py];px,py=x,y
    return out
def chain(segs):
    # merge polylines sharing endpoints
    segs=[list(s) for s in segs]
    ends=defaultdict(list)
    for i,s in enumerate(segs): ends[s[0]].append(i);ends[s[-1]].append(i)
    used=[False]*len(segs);res=[]
    for i in range(len(segs)):
        if used[i]:continue
        used[i]=True;line=segs[i][:]
        for direction in (0,1):
            while True:
                tip=line[-1]
                nxt=[j for j in ends[tip] if not used[j]]
                if not nxt:break
                j=nxt[0];used[j]=True;s=segs[j]
                line+= (s[1:] if s[0]==tip else s[::-1][1:])
            line.reverse()
        res.append(line)
    return res
T=json.load(open(G+'Transportation.geojson'))
groups={c:defaultdict(list) for c in ['1','2','3','4']}
for f in T['features']:
    p=f['properties'];c=p.get('CLASS')
    if c not in groups:continue
    g=f['geometry'];lines=[g['coordinates']] if g['type']=='LineString' else g['coordinates']
    nm=' '.join(x for x in [p.get('PRE_DIR'),(p.get('STREET_NAM') or '').title(),(p.get('STREET_TYP') or '').title()] if x)
    for ln in lines:
        if not any(inb(c2) for c2 in ln):continue
        pts=[q(c2) for c2 in ln]
        groups[c][nm].append(pts)
out={'origin':[LNG0,LAT0],'scale':S}
for c,eps in [('1',3),('2',2),('3',2),('4',2)]:
    arr=[]
    for nm,segs in groups[c].items():
        for ln in chain(segs):
            ln=rdp(ln,eps)
            if len(ln)>=2: arr.append(enc(ln))
        # name index
    out['c'+c]=arr
    # names: for labels pick per-name longest chain
names=[]
for c in ['1','2','3']:
    for nm,segs in groups[c].items():
        for ln in chain(segs):
            L=sum(math.hypot(ln[i+1][0]-ln[i][0],ln[i+1][1]-ln[i][1]) for i in range(len(ln)-1))
            if L>400: names.append([nm.replace('N ','').replace('S ','').replace('E ','').replace('W ','') if nm[:2] in('N ','S ','E ','W ') else nm,int(c),enc(rdp(ln,4))])
out['names']=names
# rivers
W=json.load(open(G+'mwrd-waterways.geojson'));riv=[]
for f in W['features']:
    n=(f['properties'].get('WATERWAY_NAME') or '')
    if 'Chicago' not in n and 'North Shore' not in n:continue
    g=f['geometry'];lines=[g['coordinates']] if g['type']=='LineString' else g['coordinates']
    for ln in lines:
        pts=[q(c2) for c2 in ln if inb(c2,0.01)]
        if len(pts)>1: riv.append(enc(rdp(pts,3)))
out['river']=riv
# boundary
B=json.load(open(G+'city_boundary.geojson'))
geom=B.get('geometry',B)
polys=geom['coordinates'] if geom['type']=='MultiPolygon' else [geom['coordinates']]
bd=[]
for poly in polys:
    ring=poly[0]
    if not any(inb(c2,0.05) for c2 in ring):continue
    pts=[q(c2) for c2 in ring];h=len(pts)//2;bd.append(enc(rdp(pts[:h+1],3)[:-1]+rdp(pts[h:],3)))
out['bound']=bd
# rails
R=json.load(open(G+'cta_rail_lines.geojson'));rl=[]
for f in R['features']:
    g=f['geometry'];lines=[g['coordinates']] if g['type']=='LineString' else g['coordinates']
    for ln in lines:
        pts=[q(c2) for c2 in ln if inb(c2,0.01)]
        if len(pts)>1: rl.append([f['properties']['route'],enc(rdp(pts,2))])
out['rail']=rl
E=json.load(open(G+'cta_entrances.geojson'));st=defaultdict(list)
for f in E['features']:
    c2=f['geometry']['coordinates']
    if inb(c2): st[(f['properties']['name'],f['properties']['line'])].append(c2)
stations=[]
for (n,l),cs in st.items():
    x=sum(c[0] for c in cs)/len(cs);y=sum(c[1] for c in cs)/len(cs)
    stations.append([n,l,*q((x,y))])
out['stations']=stations
# hoods labels
H=json.load(open(G+'hoods.geojson'));hl=[]
for f in H['features']:
    g=f['geometry'];polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    best=max(polys,key=lambda p:len(p[0]));ring=best[0]
    A=cx=cy=0
    for i in range(len(ring)-1):
        x0,y0=ring[i][:2];x1,y1=ring[i+1][:2];cr=x0*y1-x1*y0;A+=cr;cx+=(x0+x1)*cr;cy+=(y0+y1)*cr
    if A==0:continue
    cx/=3*A;cy/=3*A
    if inb((cx,cy),0): hl.append([f['properties']['name'],*q((cx,cy)),round(abs(A)/2*1e4,2)])
out['hoods']=hl
s=json.dumps(out,separators=(',',':'))
open(os.path.join(HERE,'mapdata.json'),'w').write(s)
print(len(s), {k:len(v) for k,v in out.items() if isinstance(v,list)})
