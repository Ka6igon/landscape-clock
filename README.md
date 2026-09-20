# ストップウォッチ

iPhoneとiPadの縦横表示に対応した、ストップウォッチ専用のPWAです。

- 画面上半分に大きなデジタル時計と操作ボタンを常時表示
- 開始時にラップ1を自動作成し、ラップを押すたび次のラップを計測
- 最新の計測中ラップを一覧の先頭に表示。過去のラップは下へ蓄積し、スクロールで確認可能
- 99時間59分59秒99まで計測
- ダブルタップによる拡大を抑止し、縦向き・横向きの両方に対応

## iPhone・iPadで使う

公開URLをSafariで開き、共有メニューから「ホーム画面に追加」を選びます。ホーム画面のアイコンから起動すると、アプリのように利用できます。

https://ka6igon.github.io/landscape-clock/

## ローカル確認

```powershell
node -e "const http=require('http'),fs=require('fs'),path=require('path');http.createServer((req,res)=>{const file=req.url==='/'?'index.html':req.url.slice(1);fs.readFile(path.join(process.cwd(),file),(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.end(data);});}).listen(4173,'127.0.0.1');"
```

`http://127.0.0.1:4173` を開いて確認できます。
