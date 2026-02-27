# 履歴表示のレイアウト再修正と表記改善 (v66)

前回の修正で指摘された不備（改行、文字色、配置）を修正し、利便性を向上させました。

## 修正内容

### 1. 詳細表示の改善

- **改行の解除**: 機種名と貸玉（円）を同一行に配置（`flex-direction: row`）し、スッキリとした表示に戻しました。
- **チェックボックスの配置**: `header-right` のスタイルを `align-items: flex-start` に調整し、配置の違和感を取り除きました。
- **文字色の回帰**: 機種名に適用していたアクセントカラー（黄色）を撤回し、元の配色に戻しました。

### 2. 簡略表示の改善

- **表記の統合**: 1行目のヘッダーに `機種名 (貸玉円)` を統合して表示するようにし、2行目以降のデータ密度を最適化しました。

## リリース内容

- `app.js` バージョン: **v66**
- GitHub タグ: `v66`
- 記録更新: [FAILURES_LOG.md](file:///h:/gravity/pachinko-ev-calculator/docs/FAILURES_LOG.md), [overview.md](file:///h:/gravity/pachinko-ev-calculator/docs/pachinko_ev_calculator_status/overview.md)

## 検証結果

- 指定されたすべての修正項目（改行、色、配置、表記統合）を反映し、自律実行ルールに基づきリリースまで完了しました。
