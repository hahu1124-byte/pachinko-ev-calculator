# 統計セクションの演出追加 (v58)

統計セクション（サマリー）において、合計期待値がプラスの場合に視覚的な演出を加え、ユーザーの達成感を高めます。

## 提案される変更

### スタイルシート

#### [MODIFY] [styles.css](file:///h:/gravity/pachinko-ev-calculator/styles.css)

- `.history-summary` 用のオーラアニメーションを追加。
- `.summary-aura-green`（+0〜）, `.summary-aura-gold`（+3万〜）などのクラスを定義。

### UIマネージャー

#### [MODIFY] [ui-manager.js](file:///h:/gravity/pachinko-ev-calculator/ui-manager.js)

- `renderHistory` 関数内を修正：
  - 合計期待値を表示する `span` 要素に特定のID（例: `history-total-ev-summary`）を付与。
  - 数値が更新される際、`animateEV` と同様のカウントアップ処理を適用。
  - `stats.sumWork` の値に応じて、サマリーボックス本体のクラスを切り替えオーラを適用。

### リリース工程（厳守）

- **バージョン更新**: v58
- **GitHub反映**: プッシュおよびタグ付け

## 検証プラン

### 手動確認

- 計算結果を履歴に保存し、サマリー（統計）が更新される際の数値カウントアップを確認。
- 合計期待値がプラスの場合、サマリーボックスが発光することを確認。
- 詳細モード・簡略モードの両方で演出が機能することを確認。
