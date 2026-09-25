import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const enPath = path.resolve(__dirname, '../src/locales/en.json');
const zhPath = path.resolve(__dirname, '../src/locales/zh.json');
const jaPath = path.resolve(__dirname, '../src/locales/ja.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
const zh = JSON.parse(fs.readFileSync(zhPath, 'utf-8'));

// Pre-defined expert domain overrides for core terms and navigation
const domainOverrides = {
  page_title: 'PDFSeal - 100%ローカル・ブラウザ完結のPDFツールキット',
  offline_banner: 'オフラインモードで稼働中 — すべてのPDF処理はお使いの端末上で安全にローカル実行されています',
  local_badge: '100% ローカル処理',
  privacy_modal_title: '100% ローカルプライバシー保証',
  select_language: '言語の選択',
  more_tools_tooltip: 'その他のツールを表示',
  brand_subtitle: '100%安全・高速・ブラウザ完結のプライベートPDFツールキット',
  support_coffee: '開発者を応援する',
  support_fish: '開発者を支援',
  feedback_btn: 'フィードバック',
  tab_merge: 'PDF 結合',
  tab_compress: 'PDF 圧縮',
  tab_organize: 'ページ整理',
  tab_split: 'PDF 分割',
  tab_sign: '電子署名・印鑑',
  tab_watermark: '透かし追加',
  tab_sanitize: 'メタデータ削除',
  tab_redact: '墨消し（黒塗り）',
  tab_pipeline: '自動化フロー',
  tab_more: 'その他のツール',
  tab_unlock: 'パスワード解除',
  tab_dewatermark: '透かし除去',
  tab_image_to_pdf: '画像からPDF',
  tab_pdf_to_image: 'PDFから画像',
  tab_protect: 'パスワード保護',

  // P2I
  p2i_title: 'PDFを画像に変換',
  p2i_desc: 'PDFの各ページを高画質なPNGまたはJPG画像に素早く変換します。サーバーへのアップロードは一切ありません。',
  p2i_drop_title: 'ここにPDFをドロップ',
  p2i_drop_subtitle: 'またはクリックしてファイルを選択',
  p2i_format_label: '出力形式',
  p2i_format_png: 'PNG（高画質・可逆圧縮）',
  p2i_format_jpg: 'JPG（写真・軽量）',
  p2i_dpi_label: '解像度（DPI）',
  p2i_dpi_std: '150 DPI（標準・Web向け）',
  p2i_dpi_high: '300 DPI（高解像度・印刷向け）',
  p2i_btn_export_all: '全ページを一括ダウンロード（ZIP）',
  p2i_btn_export_page: 'このページをダウンロード',

  // I2P
  i2p_title: '画像をPDFに変換',
  i2p_desc: 'JPG、PNG、WebPなどの画像を1つのきれいなPDFドキュメントに変換します。',
  i2p_drop_title: 'ここに画像をドロップ',
  i2p_drop_subtitle: '複数画像のドラッグ＆ドロップに対応',
  i2p_page_size: 'ページサイズ',
  i2p_orientation: 'ページの向き',
  i2p_margin: '余白設定',
  i2p_btn_convert: 'PDFに変換してダウンロード',

  // Merge
  merge_title: 'PDF 結合',
  merge_desc: '複数のPDFファイルをドラッグ＆ドロップで自由な順序に並べ替えて1つに結合します。',
  merge_drop_title: 'ここにPDFをドロップして追加',
  merge_btn_merge: 'PDFを結合する',
  merge_btn_clear: 'すべてクリア',
  merge_btn_from_local: 'ファイルを追加',
  merge_btn_from_vault: '保管庫から追加',
  merge_btn_reverse: '順序を反転',

  // Split
  split_title: 'PDF 分割',
  split_desc: '指定ページやページ範囲ごとにPDFを分割・抽出します。',
  split_mode_extract: '指定ページを抽出',
  split_mode_split_all: '全ページを個別に分割',
  split_mode_fixed: '固定ページ数ごとに分割',
  split_mode_custom: 'カスタム範囲で分割',
  split_btn_split: 'PDFを分割する',

  // Compress
  compress_title: 'PDF 圧縮',
  compress_desc: '画質を維持しながらPDFのファイルサイズを軽量化します。',
  compress_mode_smart: 'おすすめ圧縮（標準画質）',
  compress_mode_strong: '高圧縮（最小サイズ）',
  compress_mode_lossless: '可逆圧縮（構造最適化）',
  compress_mode_target: '目標サイズ指定',
  compress_btn_compress: 'PDFを圧縮する',

  // Organize
  organize_title: 'ページ整理・回転',
  organize_desc: 'ページの並び替え、回転、不要ページの削除、白紙ページの挿入が直感的に行えます。',
  organize_btn_rotate_cw: '右に90°回転',
  organize_btn_rotate_ccw: '左に90°回転',
  organize_btn_delete: '選択ページを削除',
  organize_btn_save: '変更を保存してダウンロード',

  // Sign & Stamp
  sign_title: '電子署名・印鑑',
  sign_desc: '手書きサイン、印鑑画像の配置、テキスト署名が可能です。プライバシーも万全です。',
  sign_tab_draw: '手書きサイン',
  sign_tab_type: 'タイプ署名',
  sign_tab_upload: '印鑑・画像アップロード',
  sign_btn_sign: '署名を適用してダウンロード',

  // Watermark
  watermark_title: '透かし追加',
  watermark_desc: '社外秘・複製禁止などの透かし文字を自由な角度と透明度で配置します。',
  watermark_btn_apply: '透かしを適用してダウンロード',

  // Page Numbers
  page_number_title: 'ページ番号の追加',
  page_number_desc: 'ヘッダーやフッターに統一されたページ番号を自由な書式で一括挿入します。',
  page_number_btn_apply: 'ページ番号を追加してダウンロード',

  // Protect & Unlock
  protect_title: 'PDF パスワード保護',
  protect_desc: '軍用レベルのAES-256暗号化で、閲覧パスワードや印刷・コピー制限を設定します。',
  protect_btn_protect: '暗号化して保存',
  unlock_title: 'PDF パスワード解除',
  unlock_desc: '保護されたPDFのパスワードと権限制限を解除し、制限のないPDFを作成します。',
  unlock_btn_unlock: 'パスワードを解除する',

  // Sanitize & Redact
  sanitize_title: 'メタデータ削除・プライバシー保護',
  sanitize_desc: '作成者、編集履歴、GPS位置情報などの隠れたメタデータを完全に消去します。',
  sanitize_btn_sanitize: 'メタデータを消去して保存',
  redact_title: '墨消し（黒塗り）',
  redact_desc: '機密情報や個人情報をドラッグで黒塗りし、テキストと画像データをバイト単位で不可逆的に消去します。',
  redact_btn_burn: '墨消しを実行して保存',

  // Pipeline & Vault
  pipeline_title: '自動化パイプライン',
  pipeline_desc: '複数のPDF処理（メタデータ消去→圧縮→透かしなど）を1クリックの連続フローとして自動実行します。',
  vault_title: 'ローカル保管庫（Vault）',
  vault_desc: '端末内の安全なIndexedDBストレージ。ネットワーク送信なしで処理済みファイルを保管・管理できます。'
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function translateText(text) {
  if (!text || typeof text !== 'string') return text;
  if (!text.trim()) return text;

  // Protect {var} placeholders
  const varMap = {};
  let counter = 0;
  const protectedText = text.replace(/\{([a-zA-Z0-9_-]+)\}/g, (match, p1) => {
    const placeholder = `__VAR_${p1}_${counter++}__`;
    varMap[placeholder] = `{${p1}}`;
    return placeholder;
  });

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${encodeURIComponent(protectedText)}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let translated = data[0].map(item => item[0]).join('');

      // Restore {var} placeholders
      for (const [ph, orig] of Object.entries(varMap)) {
        const escapedPh = ph.replace(/_/g, '[_\\s]*');
        const reg = new RegExp(escapedPh, 'gi');
        translated = translated.replace(reg, orig);
      }

      // Also ensure any leftover { var } spaces are closed
      translated = translated.replace(/\{\s*([a-zA-Z0-9_-]+)\s*\}/g, '{$1}');

      return translated;
    } catch (err) {
      if (attempt === 2) {
        console.warn(`Translation failed for: "${text.slice(0, 30)}...": ${err.message}`);
        return text;
      }
      await sleep(1000 * (attempt + 1));
    }
  }
  return text;
}

async function run() {
  console.log(`Starting translation for ${Object.keys(en).length} keys...`);
  const ja = {};

  if (fs.existsSync(jaPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(jaPath, 'utf-8'));
      Object.assign(ja, existing);
    } catch (e) {}
  }

  const entries = Object.entries(en);
  const total = entries.length;
  let translatedCount = 0;

  for (let i = 0; i < total; i++) {
    const [key, enVal] = entries[i];

    if (domainOverrides[key]) {
      ja[key] = domainOverrides[key];
      translatedCount++;
      continue;
    }

    if (ja[key] && typeof ja[key] === 'string' && ja[key].trim().length > 0) {
      continue;
    }

    const jaVal = await translateText(enVal);
    ja[key] = jaVal;
    translatedCount++;

    if ((i + 1) % 50 === 0 || i === total - 1) {
      console.log(`Progress: ${i + 1}/${total} (${Math.round(((i + 1) / total) * 100)}%)`);
      fs.writeFileSync(jaPath, JSON.stringify(ja, null, 2), 'utf-8');
    }

    await sleep(35);
  }

  for (const k of Object.keys(en)) {
    if (!ja[k]) {
      ja[k] = en[k];
    }
  }

  fs.writeFileSync(jaPath, JSON.stringify(ja, null, 2), 'utf-8');
  console.log(`Done! Written ${Object.keys(ja).length} keys to ja.json.`);
}

run().catch(console.error);
