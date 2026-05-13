/**
 * utils.js — 유틸리티 함수 모음
 * 바이트 계산, 글자 수, 처리 모드 판단, 날짜 포맷, 파일명 처리
 */

const Utils = (() => {

  /**
   * 나이스(NEIS) 기준 바이트 계산
   * 한글 1자 = 3바이트 / 영문·숫자·공백 = 1바이트 / 특수문자 = 3바이트
   */
  function countNaisBytes(text) {
    if (!text) return 0;
    let bytes = 0;
    for (const ch of text) {
      const code = ch.codePointAt(0);
      if (code <= 0x7F) {
        bytes += 1; // ASCII (영문, 숫자, 공백, 기본 특수문자)
      } else {
        bytes += 3; // 한글, 한자, 기타 유니코드
      }
    }
    return bytes;
  }

  /**
   * 글자 수 (공백 포함)
   */
  function countChars(text) {
    if (!text) return 0;
    return text.length;
  }

  /**
   * 처리 모드 판단
   * 5,000자 이하 → 전체형 / 초과 → 압축형
   */
  function getProcessingMode(text) {
    const chars = countChars(text);
    if (chars <= 5000) {
      return { mode: 'full', label: '전체형', chars };
    } else {
      return { mode: 'compact', label: '압축형', chars };
    }
  }

  /**
   * 오늘 날짜 포맷 (YYYY-MM-DD)
   */
  function formatDate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * 파일명 특수문자 제거 (Windows/Mac 안전)
   */
  function sanitizeFilename(name) {
    if (!name) return '세특프롬프트';
    return name
      .replace(/[\\/*?:"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .trim();
  }

  /**
   * 원문 요약 정보 반환 (UI 표시용)
   */
  function getTextSummary(text) {
    const chars = countChars(text);
    const bytes = countNaisBytes(text);
    const { mode, label } = getProcessingMode(text);
    return { chars, bytes, mode, label };
  }

  /**
   * 텍스트 정제 (연속 빈줄 제거, 앞뒤 공백 제거)
   */
  function cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  return {
    countNaisBytes,
    countChars,
    getProcessingMode,
    formatDate,
    sanitizeFilename,
    getTextSummary,
    cleanText,
  };

})();
