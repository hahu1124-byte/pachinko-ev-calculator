---
description: pachinko-ev-calculatorの更新とGitHubへのプッシュ
---
# GitHubプッシュワークフロー

// turbo-all

1. 修正箇所のコード内に、処理の意図や内容を説明する日本語コメントが過不足なく追記されているか確認する
2. `tasks/todo.md` および `tasks/lessons.md` を更新し、進捗と学びを記録したか確認する
3. `git add .` を実行して変更をステージングする
4. `git commit -m "[v○○] アップデート内容"` の形式で、バージョン番号を含めてコミットする
5. `git push` を実行して変更を反映させる
6. `git tag -f v○○` および `git push -f origin v○○` を実行してタグを最新化する
