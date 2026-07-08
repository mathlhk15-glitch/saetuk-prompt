/**
 * presets-guide.js — 과목 AI 조교(GPTs·Gemini Gem·Claude Project 지침 생성) 전용 프리셋
 *
 * 이 탭은 학생별 세특을 직접 만드는 곳이 아니라, 과목별 AI 조교(프로젝트)를
 * 처음 세팅할 때 한 번 쓰는 지침 생성 도구다.
 *
 * presets.js의 공통 규칙(RECORD_PROHIBITIONS, BANNED_EXPRESSIONS, STYLE_PRINCIPLES,
 * FINAL_CHECKLIST)은 그대로 재사용하고, 이 파일에는 플랫폼 안내와 규칙 버전만 둔다.
 */

const PresetsGuide = (() => {

  const RULE_VERSION = 'v1.0';

  function ruleVersionTag(schoolName) {
    const name = schoolName && schoolName.trim() ? schoolName.trim() : '학교';
    return `[${name} 학생부 AI 작성 규칙 ${RULE_VERSION}]
- 교사 관찰 우선
- 학생자료 보조 활용
- 학생 원문 복사 금지
- 근거 없는 우수성 생성 금지
(※ 학교 기준이 바뀌면 이 지침을 다시 생성해 버전을 갱신하세요.)`;
  }

  const PLATFORM_LABELS = [
    ['common', '공통'],
    ['gpts', 'GPTs'],
    ['gem', 'Gemini Gem'],
    ['claude', 'Claude Project'],
  ];

  function platformIntro(platform) {
    const map = {
      gpts: '※ 아래 지침을 GPTs 빌더의 "Instructions(지침)" 필드에 붙여넣고, 평가계획서 PDF/DOCX 원본 파일을 Knowledge(지식)에 함께 첨부하세요.',
      gem: '※ 아래 지침을 Gemini Gem의 "지침" 항목에 붙여넣고, 평가계획서 원본 파일을 첨부 파일로 함께 등록하세요.',
      claude: '※ 아래 지침을 Claude 프로젝트의 "프로젝트 지침"에 붙여넣고, 평가계획서 원본 파일을 프로젝트 지식(Knowledge)에 함께 업로드하세요.',
      common: '※ 사용하는 AI 플랫폼의 시스템 지침·커스텀 인스트럭션 영역에 아래 내용을 붙여넣고, 평가계획서 원본 파일을 함께 첨부하세요.',
    };
    return map[platform] || map.common;
  }

  return {
    RULE_VERSION,
    ruleVersionTag,
    PLATFORM_LABELS,
    platformIntro,
  };

})();
