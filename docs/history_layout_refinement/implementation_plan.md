# コードの是正・ブラッシュアップ (v62)

これまでの急速な機能追加（v56〜v61）によるコードの乱れを是正し、保守性とパフォーマンスを向上させます。

## 提案される変更（自動承認・即実行）

### UIマネージャーのリファクタリング

#### [MODIFY] [ui-manager.js](file:///h:/gravity/pachinko-ev-calculator/ui-manager.js)

- `renderHistory` の巨大なロジックを分割。
  - 統計計算、個別の履歴アイテム描画、サマリー更新を別メソッドに抽出。
- インラインスタイルを可能な限り排除し、`styles.css` のクラスへ移行。
- サマリーオーラの適用ロジックを一箇所に集約。
- 重複していたカウントアップアニメーションロジックを `animateEV` メ法に統一。

### スタイルシートの最適化

#### [MODIFY] [styles.css](file:///h:/gravity/pachinko-ev-calculator/styles.css)

- `ui-manager.js` から抽出したスタイルをクラスとして定義（例: `.history-item-compact`, `.summary-details`）。
- オーラの色などを CSS 変数 (`:root`) で管理するように変更。
- 重複するプロパティの整理。

### ユーティリティとメインロジックの整合

#### [MODIFY] [utils.js](file:///h:/gravity/pachinko-ev-calculator/utils.js) / [app.js](file:///h:/gravity/pachinko-ev-calculator/app.js)

- `formatCurrency` の変更に伴う、他箇所の二重 `￥` 表記の有無をチェックし修正。

### リリース工程（厳守）

- **バージョン更新**: v62
- **GitHub反映**: プッシュおよびタグ付け

## 検証プラン

### 自動検証

- 既存機能（履歴表示、期待値計算、LINE共有）が壊れていないことを確認。
- 開発者ツールでエラーが出ていないことを確認。
