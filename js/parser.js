/**
 * parser.js — docx/pdf 텍스트 추출 (mammoth.js / pdf.js 기반)
 *
 * 단락 + 표를 순서대로 추출하여 textarea에 삽입할 텍스트를 반환.
 * mammoth.min.js, pdf.min.js + pdf.worker.min.js가 lib/ 폴더에 오프라인으로 내장되어 있어야 합니다.
 *
 * 사용 예:
 *   const result = await Parser.extractFromFile(file);        // docx 전용 (기존 2구역 원문 업로드)
 *   const result = await Parser.extractGeneric(file);         // docx 또는 pdf (교사 관찰 메모·학생 자료 첨부)
 *   if (result.ok) { textarea.value = result.text; }
 *   else { alert(result.error); }
 */

const Parser = (() => {

  // pdf.js 워커 경로 설정 (한 번만)
  if (typeof pdfjsLib !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
  }

  /**
   * mammoth 가용 여부 확인
   */
  function isMammothAvailable() {
    return typeof mammoth !== 'undefined';
  }

  /**
   * pdf.js 가용 여부 확인
   */
  function isPdfjsAvailable() {
    return typeof pdfjsLib !== 'undefined';
  }

  /**
   * mammoth 변환 옵션
   * - 표(table)는 각 셀 내용을 탭으로 구분하고 행은 줄바꿈으로 처리
   * - 체크박스·이미지 안 텍스트는 mammoth가 추출 불가 → 사용자 안내 필요
   */
  const MAMMOTH_OPTIONS = {
    // 기본 스타일 매핑: 제목·본문 단락 그대로 추출
    styleMap: [
      "p[style-name='Heading 1'] => p",
      "p[style-name='Heading 2'] => p",
      "p[style-name='Heading 3'] => p",
      "table => table",
      "tr => tr",
      "td => td",
      "b => b",
      "i => i",
    ],
    // 표를 텍스트로 변환하는 커스텀 변환기
    transformDocument: _tableTransformer,
  };

  /**
   * 표(table) → 탭 구분 텍스트 변환기
   * mammoth의 transformDocument 훅을 사용
   */
  function _tableTransformer(element) {
    // mammoth element 구조: { type, children, ... }
    // table → 각 row → 각 cell 순서대로 텍스트 추출
    if (element.type === 'table') {
      const rows = (element.children || []).map(row => {
        const cells = (row.children || []).map(cell => {
          // 셀 내 단락 텍스트 합치기
          return (cell.children || [])
            .map(p => (p.children || []).map(r => r.value || '').join(''))
            .join(' ')
            .trim();
        });
        return cells.join('\t');
      });
      return {
        type: 'paragraph',
        children: [{ type: 'run', value: rows.join('\n') }],
        alignment: undefined,
        styleId: undefined,
        styleName: undefined,
        numbering: undefined,
      };
    }
    return element;
  }

  /**
   * File 객체(드래그앤드롭 or input)에서 텍스트 추출
   * @param {File} file
   * @returns {Promise<{ ok: boolean, text: string, error: string }>}
   */
  async function extractFromFile(file) {
    if (!isMammothAvailable()) {
      return {
        ok: false,
        text: '',
        error: 'mammoth.js 라이브러리를 찾을 수 없습니다. lib/mammoth.min.js 파일이 있는지 확인해 주세요.',
      };
    }

    if (!file) {
      return { ok: false, text: '', error: '파일이 없습니다.' };
    }

    // .docx 확장자 확인
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'docx') {
      return {
        ok: false,
        text: '',
        error: '.docx 파일만 지원합니다. (doc, hwp, pdf 등은 지원하지 않습니다.)',
      };
    }

    try {
      const arrayBuffer = await _readFileAsArrayBuffer(file);

      // mammoth로 텍스트 추출
      const result = await mammoth.extractRawText({ arrayBuffer });

      let text = (result.value || '').trim();

      // 연속 빈 줄 정리 (utils.js의 cleanText와 동일 기준)
      text = text.replace(/\n{3,}/g, '\n\n').trim();

      if (!text) {
        return {
          ok: false,
          text: '',
          error: 'docx에서 텍스트를 추출할 수 없었습니다. 파일이 비어있거나 이미지로만 구성된 문서일 수 있습니다.',
        };
      }

      return { ok: true, text, error: '' };

    } catch (e) {
      console.error('[Parser] docx 추출 오류:', e);
      return {
        ok: false,
        text: '',
        error: 'docx 추출에 실패했습니다. 텍스트를 직접 붙여넣기 해주세요.',
      };
    }
  }

  /**
   * PDF 파일에서 텍스트 추출 (pdf.js 기반)
   * @param {File} file
   * @returns {Promise<{ ok: boolean, text: string, error: string }>}
   */
  async function extractFromPdf(file) {
    if (!isPdfjsAvailable()) {
      return {
        ok: false,
        text: '',
        error: 'pdf.js 라이브러리를 찾을 수 없습니다. lib/pdf.min.js, lib/pdf.worker.min.js 파일이 있는지 확인해 주세요.',
      };
    }
    if (!file) {
      return { ok: false, text: '', error: '파일이 없습니다.' };
    }
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'pdf') {
      return { ok: false, text: '', error: '.pdf 파일만 지원합니다.' };
    }

    try {
      const arrayBuffer = await _readFileAsArrayBuffer(file);
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str || '').join(' ');
        text += pageText + '\n\n';
      }

      text = text.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();

      if (!text) {
        return {
          ok: false,
          text: '',
          error: 'PDF에서 텍스트를 추출할 수 없었습니다. 스캔 이미지로 만들어진 PDF일 수 있습니다. 텍스트를 직접 붙여넣어 주세요.',
        };
      }

      return { ok: true, text, error: '' };

    } catch (e) {
      console.error('[Parser] PDF 추출 오류:', e);
      return {
        ok: false,
        text: '',
        error: 'PDF 추출에 실패했습니다. 비밀번호로 보호된 파일이거나 손상되었을 수 있습니다. 텍스트를 직접 붙여넣기 해주세요.',
      };
    }
  }

  /**
   * docx 또는 pdf 확장자를 자동 판별해 텍스트 추출 (교사 관찰 메모·학생 자료 첨부용)
   * @param {File} file
   * @returns {Promise<{ ok: boolean, text: string, error: string }>}
   */
  async function extractGeneric(file) {
    if (!file) return { ok: false, text: '', error: '파일이 없습니다.' };
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'docx') return extractFromFile(file);
    if (ext === 'pdf') return extractFromPdf(file);
    return { ok: false, text: '', error: '.docx 또는 .pdf 파일만 지원합니다. (doc, hwp 등은 지원하지 않습니다.)' };
  }

  /**
   * File → ArrayBuffer 변환 (Promise 래퍼)
   * @param {File} file
   * @returns {Promise<ArrayBuffer>}
   */
  function _readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('파일 읽기에 실패했습니다.'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * DataTransfer (드래그앤드롭 이벤트)에서 .docx 파일 추출
   * @param {DataTransfer} dataTransfer
   * @returns {File|null}
   */
  function getDocxFromDrop(dataTransfer) {
    if (!dataTransfer || !dataTransfer.files) return null;
    const files = [...dataTransfer.files];
    return files.find(f => f.name.toLowerCase().endsWith('.docx')) || null;
  }

  return {
    extractFromFile,
    extractFromPdf,
    extractGeneric,
    getDocxFromDrop,
    isMammothAvailable,
    isPdfjsAvailable,
  };

})();
