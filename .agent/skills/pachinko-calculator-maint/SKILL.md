---
name: pachinko-calculator-maint
description: pachinko-ev-calculatorの更新・修正作業を円滑に行うためのメンテナンススキル
---

# pachinko-ev-calculator メンテナンススキル

このスキルは、`pachinko-ev-calculator` プロジェクトの現状を確認し、新しい機能の追加や不具合の修正、デプロイを安全に行うための手順を提供します。

## 1. 現状の把握

修正を開始する前に、必ず最新の状態を確認してください。

- **概要ドキュメントの参照**: [overview.md](file:///h:/gravity/pachinko-ev-calculator/docs/pachinko_ev_calculator_status/overview.md)
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

## 3. デプロイ（GitHubへのプッシュ）

修正が完了し、動作確認が済んだら、以下のワークフローを使用して変更を反映させます。

```bash
/github-push
```

このコマンドにより、以下の手順が自動実行されます:

1. `git add .`
2. `git commit -m "..."`
3. `git push`

## 4. 注意事項

- **LocalStorageの互換性**: 履歴データの構造を変更する場合は、既存のデータが読み込めなくなる可能性があるため、`renderHistory` 関数内でのフォールバック処理を考慮してください。
- **外部依存**: CSVの取得に失敗した場合でも、サンプルデータで動作するように `catch` 節が実装されています。
