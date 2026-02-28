# スプレッドシート変数対応表 (Variable Mapping)

このドキュメントは、パチンコ期待値計算ツール内の変数名と、元となったスプレッドシートのセル・数式との対応を記録したものです。今後のロジック修正やスプレッドシートとの整合性確認に使用してください。

## 1. 通常時の計算 (Normal EV Calculation)

| スプレッドシート項目 | 元の変数名 (v79以前) | 改善後の変数名 (v79.1以降) | 説明 |
| :--- | :--- | :--- | :--- |
| **J14** (期待値/回) | `j14Result` | `normalEVPerSpinRaw` | 1回転あたりの期待値(玉単価ベース)の生データ。 |
| **(無し)** | `normalBallUnitPrice` | `normalBallUnitPrice` | 持ち玉遊技時の換算単価。 |
| **(無し)** | `normalCashUnitPrice` | `normalCashUnitPrice` | 現金投資時の換算単価。 |

## 2. 遊タイム期待値の計算 (Yutime EV Calculation)

| スプレッドシート項目 | 元の変数名 (v79以前) | 改善後の変数名 (v79.1以降) | 説明 |
| :--- | :--- | :--- | :--- |
| **I17** (期待確率) | `yutimeExpectancy` | `yutimeSuccessProb` | 指定回転数までに大当たりを引く確率。 |
| **I18** (遊込持単価) | `rawI18` | `yutimeBallUnitPriceRaw` | 遊タイム考慮時の1回転あたり期待値(玉単価)の生データ。 |
| **I19** (遊込現単価) | `rawI19Base / rawI19` | `yutimeCashUnitPriceRawBase / yutimeCashUnitPriceRaw` | 遊タイム考慮時の現金単価計算のベース。 |

---

## 3. その他の対応

- `effectiveProb`: スプレッドシートの計算過程における実質的な確率調整項目。
- `yutimeTotalProb`: 遊タイム中を含めた実質的な大当たり確率（平均連チャン・増減等を考慮）。

> [!IMPORTANT]
> ロジックを修正する際は、この対応表を参照してスプレッドシートの数式との乖離が発生しないよう注意してください。
