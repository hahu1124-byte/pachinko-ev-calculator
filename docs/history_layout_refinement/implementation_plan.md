# 期待値表示の改善と演出の細分化 (v59)

期待値表示における記号の重複を修正し、統計情報のプラス収支に応じた演出をより細かく段階的に提供します。

## 提案される変更

### ユーティリティ

#### [MODIFY] [utils.js](file:///h:/gravity/pachinko-ev-calculator/utils.js)

- `formatCurrency` を修正し、`￥+1,000` または `￥-1,000` の形式で返すように変更。

### スタイルシート

#### [MODIFY] [styles.css](file:///h:/gravity/pachinko-ev-calculator/styles.css)

- 統計セクション用のオーラを4段階に拡張。すべてグラデーションを用いて表現。
  - `.summary-aura-green`: 0 ~ 200 (Emerald Gradient)
  - `.summary-aura-blue`: 200 ~ 1000 (Ocean/Blue Gradient)
  - `.summary-aura-bluegold`: 1000 ~ 2000 (Cyan to Gold Gradient)
  - `.summary-aura-gold`: 2000+ (Golden/Amber Gradient)
- テキストハイライト用のカラーも同様に拡張。

### UIマネージャー

#### [MODIFY] [ui-manager.js](file:///h:/gravity/pachinko-ev-calculator/ui-manager.js)

- `renderHistory` 内の HTML 文字列から、重複している `￥` 記号を削除（`formatCurrency` が含めるようになるため）。
- 合計期待値に応じたオーラ適用ロジックを更新（200, 1000, 2000の閾値を適用）。

### リリース工程（厳守）

- **バージョン更新**: v59
- **GitHub反映**: プッシュおよびタグ付け

## 検証プラン

### 手動確認

- 履歴サマリーの期待値表記が `￥+1,234` のようになっていることを確認。
- 期待値の増加に伴い、サマリーボックスのオーラが 緑 -> 青 -> 青金 -> 金 と変化することを確認。
- `v59` として正しくプッシュおよびタグ付けされることを確認。
