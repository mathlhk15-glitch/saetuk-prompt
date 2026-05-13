/**
 * curriculum.js — 교육과정 자동 판단
 * 학년도 + 학년 → 2022 개정 / 2015 개정 자동 결정
 *
 * 판단 기준:
 *   2025학년도: 고1 → 2022 개정 / 고2·고3 → 2015 개정
 *   2026학년도: 고1·고2 → 2022 개정 / 고3 → 2015 개정
 *   2027학년도~: 전 학년 → 2022 개정
 *   2024학년도 이전: 전 학년 → 2015 개정
 */

const Curriculum = (() => {

  /**
   * 교육과정 판단
   * @param {number} schoolYear - 학년도 (예: 2026)
   * @param {number} grade      - 학년 (1, 2, 3)
   * @returns {{ curriculum: string, reason: string }}
   */
  function decide(schoolYear, grade) {
    const y = parseInt(schoolYear, 10);
    const g = parseInt(grade, 10);

    if (isNaN(y) || isNaN(g)) {
      return { curriculum: null, reason: '학년도 또는 학년을 선택해 주세요.' };
    }

    let curriculum;

    if (y >= 2027) {
      curriculum = '2022 개정';
    } else if (y === 2026) {
      curriculum = (g <= 2) ? '2022 개정' : '2015 개정';
    } else if (y === 2025) {
      curriculum = (g === 1) ? '2022 개정' : '2015 개정';
    } else {
      // 2024 이하
      curriculum = '2015 개정';
    }

    const gradeLabel = `고${g}`;
    const reason = `${y}학년도 ${gradeLabel} 기준`;

    return { curriculum, reason };
  }

  /**
   * UI 표시용 문자열
   * @returns {string} 예: "✅ 적용 교육과정: 2022 개정 (2026학년도 고2 기준)"
   */
  function getLabel(schoolYear, grade) {
    const { curriculum, reason } = decide(schoolYear, grade);
    if (!curriculum) return `⚠️ ${reason}`;
    return `✅ 적용 교육과정: ${curriculum} (${reason})`;
  }

  /**
   * 교육과정별 세특 작성 지시문 반환 (prompt.js에서 사용)
   */
  function getInstruction(curriculum) {
    if (curriculum === '2022 개정') {
      return `적용 교육과정: 2022 개정

- 깊이 있는 학습: 개념 간 연결, 실생활 연계, 학생 주도성이 드러나게.
- 융합적 사고: 다른 교과·분야와의 연결 고리가 있으면 서술에 포함.
- 디지털·AI 소양이 활동에 포함된 경우에만 자연스럽게 반영.
- 핵심 아이디어, 지식·이해, 과정·기능, 가치·태도가 통합적으로 드러나게.
- 성취기준 번호는 쓰지 말고, 성취기준의 행동 동사가 문장 안에 자연스럽게 녹아들게.`;
    } else {
      return `적용 교육과정: 2015 개정

- 과정 중심 평가: 결과물뿐 아니라 사고 과정·수행 과정·피드백 반영 여부가 드러나게.
- 교과 개념의 적용과 탐구 과정: 어떤 개념을 어떻게 사용했는지 구체적으로 서술.
- 핵심역량이 구체적 행위로 드러나게.
- 성취기준 번호는 쓰지 말고, 성취기준의 행동 동사가 문장 안에 자연스럽게 녹아들게.`;
    }
  }

  return { decide, getLabel, getInstruction };

})();
