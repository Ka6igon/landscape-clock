# 横向き時計

iPhoneの時計アプリで馴染みのある「世界時計・アラーム・ストップウォッチ・タイマー」を、ブラウザとホーム画面アプリのどちらでも使えるようにした独立PWAです。縦向き・横向きの切り替えに追従し、横向きでは操作を左側のタブに集約して表示領域を広げます。

## 使い方

ローカル確認は、プロジェクト直下で静的Webサーバーを起動します。

```powershell
python -m http.server 8080
```

`http://localhost:8080` を開いてください。iPhoneではHTTPSで公開したURLをSafariで開き、共有メニューから「ホーム画面に追加」を選ぶと、単独の時計アプリのように起動できます。

## 公開（GitHub Pages）

1. GitHubで空のリポジトリを作成します（例: `landscape-clock`）。
2. 下記の `YOUR_ACCOUNT` と `landscape-clock` を置き換えて実行します。

```powershell
git remote add origin https://github.com/YOUR_ACCOUNT/landscape-clock.git
git branch -M main
git add .
git commit -m "Initial landscape clock PWA"
git push -u origin main
```

3. リポジトリの **Settings → Pages** で **Deploy from a branch**、`main` / `root` を選択します。公開URLをiPhoneのSafariで開けば利用できます。

アラームと都市の設定はブラウザ内に保存されます。ブラウザではOS標準のアラームと同じバックグラウンド実行保証はできないため、確実な起床用途には端末標準のアラームも併用してください。
