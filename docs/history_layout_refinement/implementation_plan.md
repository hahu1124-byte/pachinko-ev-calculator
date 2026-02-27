# 再発防止策の導入とレイアウト修正（チェックボックス位置）

過去の不手際を反省し、再発防止策をプロジェクトに組み込むとともに、履歴表示のチェックボックスが機種名と重ならないよう配置を修正します。

## ユーザーレビュー必須事項

- **再発防止策の導入**: `docs/FAILURES_LOG.md` を作成し、今後は「修正＝リリース完了」までを必須工程とします。

## 提案される変更

### メンテナンス手順の強化

- `docs/FAILURES_LOG.md` [NEW]: 過去の失敗の記録と、徹底ルールの明文化。
- `SKILL.md` [MODIFY]: 再発防止セクションを追記。

### UIマネージャー

#### [MODIFY] [ui-manager.js](file:///h:/gravity/pachinko-ev-calculator/ui-manager.js)

- 履歴詳細モード (`renderHistory`) のチェックボックス配置を修正。
- `history-item-header` を `display: flex; justify-content: space-between; align-items: center;` に設定。
- チェックボックスから `position: absolute` を削除し、ヘッダー内の右端に自然に配置。
- 機種名の `h4` 要素の `flex` を調整し、チェックボックスと重ならないようにする。

### リリース工程（必須）

- **バージョン更新**: v57
- **GitHub反映**: プッシュおよびタグ付け

## 検証プラン

### 手動確認

- ブラウザで履歴を表示。
- 機種名が長くても、右側のチェックボックスと重ならないことを確認。
- 修正完了後、自律的に GitHub へプッシュされることを確認。
