---
name: pachinko-calculator-maint
description: pachinko-ev-calculatorの更新・修正作業を円滑に行うためのメンテナンススキル
---

# pachinko-ev-calculator メンテナンススキル

このスキルは、`pachinko-ev-calculator` プロジェクトの現状を確認し、新しい機能の追加や不具合の修正、デプロイを安全に行うための手順を提供します。

## 1. 現状の把握

修正を開始する前に、必ず最新の状態を確認してください。

- **概要ドキュメントの参照**: [overview.md](file:///h:/gravity/pachinko-ev-calculator/docs/pachinko_ev_calculator_status/overview.md)
- **ワークフローの確認**: `.agent/workflows` 内の関連するワークフロー（例: `github-push.md`）を確認し、手順に従ってください。その際、`run_command` には必ず `SafeToAutoRun: true` を設定して自動実行すること。
- **ソースコード**: `app.js` (ロジック), `share.js` (LINE共有), `index.html` (UI)

## 2. 更新手順

### A. UI/スタイルの変更

1. `index.html` または `styles.css` を編集します。
2. ブラウザ（またはブラウザエージェント）を使用して、レイアウトが崩れていないか確認します。
3. ダークモードとの整合性を確認してください。

### B. 計算ロジック・共有機能の変更

1. `app.js` の `calculateEV` 関数、または `share.js` のメッセージ生成ロジックを編集します。
2. **重要な検証点**:
    - 遊タイム込の期待値が正しく算出・表示されるか。
    - 履歴保存時にデータが欠落していないか。
    - LINE共有メッセージ内の数値が最新の計算結果と一致しているか。

### C. 機種データの管理

- 機種データは以下のURLから取得されています:
    `https://docs.google.com/spreadsheets/d/e/2PACX-1vTg_z1H5K62_019noNiZnxtSTOafCW4c5y4BghW62nHmOTneMx4JzVycIXAXHTdF9vxYSOjcnu7u3BK/pub?gid=493752965&single=true&output=csv`
- CSVの列構造（`app.js` 内の `fetch` 処理）を変更する場合は、スプレッドシート側の更新と合わせる必要があります。

## 3. バージョン管理と履歴管理

### A. バージョン管理 (`v○○`)

- 更新ごとにバージョン番号をインクリメントします（例: `v39`, `v40`, ...）。
- **実施事項**:
    1. `app.js` 先頭のバージョン記述を更新する。
    2. コミットメッセージの先頭に `[v○○]` を付与する。
    3. プッシュ後にターミナルから `git tag v○○`, `git push origin v○○` を実行してタグを付与する。

### B. 履歴管理

- [overview.md](file:///h:/gravity/pachinko-ev-calculator/docs/pachinko_ev_calculator_status/overview.md) の「更新履歴」セクションにおいて、記録は最新5件までを保持します。
- それ以前の古い内容（コードや設定）に戻す必要がある場合、あるいは大規模な変更を伴う場合は、必ず事前にユーザーの再確認と承認を得る必要があります。

### C. リファクタリング時のコード整合性チェック（最重要）

- `renderHistory` などの描画ループをリファクタリングする際は、以下の「3大欠落」を絶対に起こさないよう、修正後にコードを一行ずつセルフレビューしてください。
    1. **変数の定義漏れ**: ループ内で使用する `machineCounts` や `div` 等の変数が、修正後のスコープ内で正しく定義されているか。
    2. **フィルタの欠落**: `if ((item.playRate || 4) == currentSummaryRate)` 等の、表示対象を絞る条件式が維持されているか。
    3. **DOM操作の漏れ**: `document.createElement` や `historyList.appendChild(div)` が確実に実行されているか。
- **防止策**: 可能な限り一つの `forEach` ループに処理を集約し、ロジックを分散させないことで、コピペミスや削除ミスを防ぎます。

### D. ロールバック手順

重大な不具合が発生した場合は、以下の手順で以前の安定版に戻します。

1. 現在の変更を退避または破棄する (`git reset --hard`).
2. 以前のタグに切り替える (`git checkout v○○`).
3. 必要に応じて修正を行い、新バージョンとして再度デプロイする。

### E. ファイル分割の判断

- `app.js` の役割が多岐にわたり、ファイルサイズが1000行を大きく超えてきた場合は、自律的に分割（例: `logic.js`, `ui.js`への分離）を検討・提案します。

## 5. 【最重要】再発防止・徹底事項

**過去4回、リリース手順（バージョンアップ・プッシュ）を失念するという重大なミスが発生しています。**

作業を行うエージェントは、以下の事項を**脳内に刻み込み、例外なく実行すること。**

- **修正 ＝ リリースまで完遂すること。**
- コードを直して満足せず、必ず `github-push.md` を実行し、タグを打つ。
- 詳細は [FAILURES_LOG.md](file:///h:/gravity/pachinko-ev-calculator/docs/FAILURES_LOG.md) を参照し、二度と繰り返さない。
