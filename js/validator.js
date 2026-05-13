/**
 * validator.js — 입력값 검증 및 경고 메시지
 *
 * [GPT 보완 1] docx 추출 후 확인 체크 미완료 시 생성 버튼 비활성화
 *
 * validate(inputData) → { valid: boolean, errors: string[], warnings: string[] }
 * checkGenerateButton(state) → boolean (생성 버튼 활성화 여부)
 */

const Validator = (() => {

  const MIN_TEXT_LENGTH = 80; // 원문 최소 글자 수 (generator.py 기준 동일)

  /**
   * 전체 입력값 검증
   * @param {Object} inputData
   * @param {string|number} inputData.schoolYear   - 학년도
   * @param {string|number} inputData.grade        - 학년 (1/2/3)
   * @param {string}        inputData.subjectName  - 교과명
   * @param {string}        inputData.subjectGroup - 교과군
   * @param {string}        inputData.studentName  - 학생명
   * @param {string}        inputData.rawText      - 수행평가 원문
   * @param {string}        inputData.promptMode   - 프롬프트 강도
   * @param {boolean}       inputData.docxChecked  - docx 확인 체크 여부
   * @param {boolean}       inputData.docxUploaded - docx 업로드 사용 여부
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  function validate(inputData) {
    const errors = [];
    const warnings = [];

    const {
      schoolYear,
      grade,
      subjectName,
      subjectGroup,
      studentName,
      rawText,
      promptMode,
      docxChecked,
      docxUploaded,
    } = inputData;

    // ── 필수 항목 누락 검사 ──────────────────────
    if (!schoolYear) {
      errors.push('학년도를 선택해 주세요.');
    }
    if (!grade) {
      errors.push('학년을 선택해 주세요.');
    }
    if (!subjectName || !subjectName.trim()) {
      errors.push('교과명을 입력해 주세요.');
    }
    if (!subjectGroup) {
      errors.push('교과군을 선택해 주세요.');
    }
    if (!studentName || !studentName.trim()) {
      errors.push('학생명을 입력해 주세요.');
    }
    if (!rawText || !rawText.trim()) {
      errors.push('수행평가 원문을 입력해 주세요.');
    }
    if (!promptMode) {
      errors.push('프롬프트 강도를 선택해 주세요.');
    }

    // ── 원문 길이 검사 ──────────────────────────
    if (rawText && rawText.trim()) {
      const charCount = rawText.trim().length;
      if (charCount < MIN_TEXT_LENGTH) {
        errors.push(
          `원문이 너무 짧습니다. (현재 ${charCount}자 / 최소 ${MIN_TEXT_LENGTH}자 이상 입력 필요)`
        );
      }
    }

    // ── docx 확인 체크 미완료 ────────────────────
    // [GPT 보완 1] docx를 업로드한 경우, 확인 체크가 필수
    if (docxUploaded && !docxChecked) {
      errors.push('추출된 원문을 확인하고 체크박스를 선택해 주세요.');
    }

    // ── 경고 (warnings) — 생성 차단은 아님 ────────
    if (!inputData.studentId) {
      warnings.push('학번이 입력되지 않았습니다. 프롬프트에 "미확인"으로 표시됩니다.');
    }

    // 깨진 문자 감지 (extractor.js의 hasGarbledText 사용)
    if (rawText && typeof Extractor !== 'undefined' && Extractor.hasGarbledText(rawText)) {
      warnings.push(
        '원문에 깨진 문자가 포함된 것 같습니다. (예: #U+...)\n' +
        'docx에서 추출이 완전하지 않을 수 있으니 원문 입력란을 직접 확인해 주세요.'
      );
    }

    const valid = errors.length === 0;
    return { valid, errors, warnings };
  }

  /**
   * 생성 버튼 활성화 여부 판단
   * 필수 항목이 하나라도 비어 있거나 docx 미확인 시 false
   *
   * @param {Object} state - 현재 UI 상태
   * @param {string}  state.schoolYear
   * @param {string}  state.grade
   * @param {string}  state.subjectName
   * @param {string}  state.subjectGroup
   * @param {string}  state.studentName
   * @param {string}  state.rawText
   * @param {string}  state.promptMode
   * @param {boolean} state.docxUploaded
   * @param {boolean} state.docxChecked
   * @returns {boolean}
   */
  function checkGenerateButton(state) {
    const {
      schoolYear, grade, subjectName, subjectGroup,
      studentName, rawText, promptMode,
      docxUploaded, docxChecked,
    } = state;

    if (!schoolYear || !grade || !subjectName?.trim() || !subjectGroup) return false;
    if (!studentName?.trim()) return false;
    if (!rawText?.trim() || rawText.trim().length < MIN_TEXT_LENGTH) return false;
    if (!promptMode) return false;
    if (docxUploaded && !docxChecked) return false;

    return true;
  }

  /**
   * 개별 필드 인라인 검증 메시지 (실시간 표시용)
   * @param {string} field  - 필드명 ('schoolYear' | 'grade' | 'subjectName' | 'studentName' | 'rawText')
   * @param {*}      value  - 현재 값
   * @returns {string} 경고 메시지 (없으면 빈 문자열)
   */
  function validateField(field, value) {
    switch (field) {
      case 'rawText':
        if (!value || !value.trim()) return '원문을 입력해 주세요.';
        if (value.trim().length < MIN_TEXT_LENGTH)
          return `최소 ${MIN_TEXT_LENGTH}자 이상 입력해 주세요. (현재 ${value.trim().length}자)`;
        return '';
      case 'subjectName':
        if (!value || !value.trim()) return '교과명을 입력해 주세요.';
        return '';
      case 'studentName':
        if (!value || !value.trim()) return '학생명을 입력해 주세요.';
        return '';
      default:
        return '';
    }
  }

  return {
    validate,
    checkGenerateButton,
    validateField,
    MIN_TEXT_LENGTH,
  };

})();
