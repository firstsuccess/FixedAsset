# 公式資料と検証根拠
確認日: 2026-10-12

- 国税庁 No.5410（令和8年4月1日現在法令等）: 定額法、200/250％定率法、保証額、改定取得価額、100万円/8年の公式計算例
  https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5410.htm
- 国税庁 償却率等表: 旧定額、旧定率、定額、250％、200％、改定率、保証率
  https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/pdf/2100_02.pdf
- 国税庁 令和7年分収支内訳書（不動産所得用）の書き方: 2025-10-01現在、7ページ主要耐用年数、8ページ償却率のテキスト表。PDF画像と照合し数値を取り込み
  https://www.nta.go.jp/taxes/shiraberu/shinkoku/tebiki/2025/pdf/019.pdf
- 国税庁 No.5408（令和8年4月1日現在）: 2026-04-01以後取得40万円未満、年300万円、従業員400人以下等。2029-03-31まで。パラメータ登録のみで判定機能は未完成
  https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5408.htm
- 国税庁 令和8年度法人税関係法令の改正の概要: 30万から40万への取得日別改正・300万維持をクロスチェック
  https://www.nta.go.jp/publication/pamph/hojin/kaisei_gaiyo2026/pdf/A.pdf
- 国税庁 No.2105: 旧制度95％後の償却、建物・附属設備/構築物の方法制限（旧制度の計算は未実装）
  https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2105.htm
- 国税庁 確定申告書等作成コーナー: 減価償却費の端数処理は切上げ。作成コーナーの運用と一律法定規則を区別
  https://www.keisan.nta.go.jp/r7yokuaru_sp/aoiroshinkoku/hitsuyokeihi/genkashokyakuhi/scid1736.html

## 今回の追加照合
- 国税庁 No.5411: 旧定額/旧定率、95％上限、翌年度から60か月の残額償却、法人の供用日みなし取得。
  https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5411.htm
- 国税庁 No.2105: 所得税の旧制度、2008年からの残額償却を照合。旧制度の5年部分の切上げは本システムの対応範囲であり、一律の法定端数方式と断定しない。
  https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2105.htm
