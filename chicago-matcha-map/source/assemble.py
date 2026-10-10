"""Assemble the playable page: template.html + spots.js + mapdata.json -> ../index.html"""
import os
H=os.path.dirname(os.path.abspath(__file__))
r=lambda n:open(os.path.join(H,n)).read()
t=r('template.html').replace('__MAPDATA__',r('mapdata.json')).replace('__SPOTS__',r('spots.js'))
head='''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,-apple-system,sans-serif}img{max-width:100%}[hidden]{display:none!important}*,*::before,*::after{box-sizing:border-box}</style>
'''
i=t.index('<div class="app">')
open(os.path.join(H,'..','index.html'),'w').write(head+t[:i]+'</head>\n<body>\n'+t[i:]+'\n</body>\n</html>\n')
print('wrote index.html')
