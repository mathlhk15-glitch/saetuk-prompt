/**
 * prompt.js — 최종 프롬프트 조립
 *
 * generatePrompt(inputData) 를 호출하면 완성된 프롬프트 문자열을 반환합니다.
 * presets.js / curriculum.js / utils.js 가 먼저 로드되어 있어야 합니다.
 *
 * 조립 순서 (계획서 §5 prompt.js 기준):
 *   [처리 요약]
 *   [역할 및 작성 원칙]
 *   [입력 정보]
 *   [1단계] 원문 분석표 작성 지시
 *   [2단계] 버전별 작성 전략 수립
 *   [3단계] 500/700/1000바이트 세특 작성 (OUTPUT_FORMAT)
 *   [4단계] 루브릭 자기 점검 (RUBRIC)
 *   [5단계] 최종 추천본 (FINAL_RECOMMENDATION)
 *   [교과별 문체 프리셋]
 *   [학종 평가 요소]
 *   [학생 특성 유형 판단 가이드]
 *   [사고 흐름 구조]
 *   [기관명 처리 기준]
 *   [프롬프트 강도별 지시]
 *   [금지어 + 대체 표현]
 *   [기재 금지 사항]
 *   [문체 원칙]
 *   [문체 예시]
 *   [최종 점검]
 *   [수행평가 원문]
 */

const Prompt = (() => {

  /**
   * 메인 함수: 프롬프트 전체 조립
   *
   * @param {Object} inputData
   * @param {string|number} inputData.schoolYear   - 학년도 (예: 2026)
   * @param {string|number} inputData.grade        - 학년 (1/2/3)
   * @param {string}        inputData.subjectName  - 교과명 (예: "심화국어")
   * @param {string}        inputData.subjectGroup - 교과군 (예: "국어")
   * @param {string}        inputData.studentName  - 학생명
   * @param {string}        [inputData.studentId]  - 학번 (선택)
   * @param {string}        inputData.promptMode   - '일반' | '학종강화' | '최상위권'
   * @param {string}        inputData.rawText      - 수행평가 원문
   * @returns {string} 완성된 프롬프트 문자열
   */
  function generatePrompt(inputData) {
    const {
      schoolYear,
      grade,
      subjectName,
      subjectGroup,
      studentName,
      studentId,
      promptMode,
      rawText,
    } = inputData;

    // ── 보조 정보 계산 ──────────────────────────
    const gradeLabel = `고${grade}`;
    const idLabel    = studentId && studentId.trim() ? studentId.trim() : '미확인';
    const dateLabel  = Utils.formatDate();

    const { chars, bytes, label: modeLabel } = Utils.getTextSummary(rawText);
    const { curriculum, reason } = Curriculum.decide(schoolYear, grade);
    const curriculumInstruction   = Curriculum.getInstruction(curriculum);

    const subjectPreset   = Presets.SUBJECT_PRESETS[subjectGroup] || Presets.SUBJECT_PRESETS['진로·기타'];
    const modeInstruction = Presets.MODE_INSTRUCTIONS[promptMode] || Presets.MODE_INSTRUCTIONS['최상위권'];

    // ── [처리 요약] ──────────────────────────────
    const summaryBlock = _buildSummary({
      studentName, subjectName, gradeLabel,
      schoolYear, curriculum, reason,
      promptMode, chars, bytes, modeLabel, dateLabel,
    });

    // ── [역할 및 작성 원칙] ──────────────────────
    const roleBlock = _buildRole();

    // ── [입력 정보] ──────────────────────────────
    const inputInfoBlock = _buildInputInfo({
      studentName, idLabel, subjectName, subjectGroup,
      schoolYear, gradeLabel, curriculum, reason, promptMode,
    });

    // ── [교육과정 지시문] ────────────────────────
    const curriculumBlock = _section('교육과정 적용 지시', curriculumInstruction);

    // ── [1단계] 원문 분석표 ──────────────────────
    const step1Block = _buildStep1();

    // ── [2단계] 버전별 작성 전략 ─────────────────
    const step2Block = _buildStep2();

    // ── [3단계] 분량별 출력 조건 ─────────────────
    const step3Block = Presets.OUTPUT_FORMAT;

    // ── [4단계] 루브릭 ───────────────────────────
    const step4Block = Presets.RUBRIC;

    // ── [5단계] 최종 추천본 ──────────────────────
    const step5Block = Presets.FINAL_RECOMMENDATION;

    // ── [교과별 문체 프리셋] ─────────────────────
    const subjectPresetBlock = _section('교과별 문체 프리셋', subjectPreset);

    // ── [학종 평가 요소] ─────────────────────────
    const hakjongBlock = Presets.HAKJONG_ELEMENTS;

    // ── [학생 특성 유형 판단] ────────────────────
    const studentTypeBlock = Presets.STUDENT_TYPE_GUIDE;

    // ── [사고 흐름 구조] ─────────────────────────
    const thinkingFlowBlock = Presets.THINKING_FLOW;

    // ── [기관명 처리 기준] ───────────────────────
    const agencyBlock = Presets.AGENCY_NAME_GUIDE;

    // ── [프롬프트 강도별 지시] ───────────────────
    const modeBlock = modeInstruction;

    // ── [금지어 + 대체 표현] ─────────────────────
    const bannedBlock = Presets.BANNED_EXPRESSIONS;

    // ── [기재 금지 사항] ─────────────────────────
    const prohibitionBlock = Presets.RECORD_PROHIBITIONS;

    // ── [문체 원칙] ──────────────────────────────
    const stylePrinciplesBlock = Presets.STYLE_PRINCIPLES;

    // ── [문체 예시] ──────────────────────────────
    const styleExamplesBlock = Presets.STYLE_EXAMPLES;

    // ── [최종 점검] ──────────────────────────────
    const finalCheckBlock = Presets.FINAL_CHECKLIST;

    // ── [수행평가 원문] — 압축형 분기 ────────────
    const rawTextBlock = _buildRawTextBlock(rawText, modeLabel);

    // ── 전체 조립 ────────────────────────────────
    const parts = [
      summaryBlock,
      roleBlock,
      inputInfoBlock,
      curriculumBlock,
      step1Block,
      step2Block,
      step3Block,
      step4Block,
      step5Block,
      subjectPresetBlock,
      hakjongBlock,
      studentTypeBlock,
      thinkingFlowBlock,
      agencyBlock,
      modeBlock,
      bannedBlock,
      prohibitionBlock,
      stylePrinciplesBlock,
      styleExamplesBlock,
      finalCheckBlock,
      rawTextBlock,
    ];

    return parts.filter(Boolean).join('\n\n');
  }

  // ═══════════════════════════════════════════════
  // 내부 블록 빌더
  // ═══════════════════════════════════════════════

  /** [처리 요약] 블록 */
  function _buildSummary({ studentName, subjectName, gradeLabel,
                            schoolYear, curriculum, reason,
                            promptMode, chars, bytes, modeLabel, dateLabel }) {
    return `[처리 요약]
학생: ${studentName} | 교과: ${subjectName} | 학년: ${gradeLabel}
교육과정: ${curriculum} (${reason}) | 강도: ${promptMode}
원문: ${chars.toLocaleString()}자 / 약 ${bytes.toLocaleString()}바이트 | 처리 모드: ${modeLabel}
생성일시: ${dateLabel}`;
  }

  /** [역할 및 작성 원칙] 블록 */
  function _buildRole() {
    return `══════════════════════════════════════════
■ 역할 및 작성 원칙
══════════════════════════════════════════
당신은 대한민국 고등학교 담당 교사입니다.
아래 [수행평가 원문]을 바탕으로 학교생활기록부 교과 세부능력 및 특기사항(세특)을 작성합니다.

다음 원칙을 반드시 지키십시오:
1. 원문에 근거한 사실만 서술. 추정·과장·창작 금지.
2. 교사가 학생을 관찰하고 기록하는 문체로 작성.
3. 아래 제시된 모든 지시 사항을 단계별로 완전히 수행한 뒤 세특을 출력할 것.
4. 각 단계(1~5)를 순서대로 수행하고, 각 단계의 출력을 명확히 표시할 것.`;
  }

  /** [입력 정보] 블록 */
  function _buildInputInfo({ studentName, idLabel, subjectName, subjectGroup,
                              schoolYear, gradeLabel, curriculum, reason, promptMode }) {
    return `══════════════════════════════════════════
■ 입력 정보
══════════════════════════════════════════
학생명: ${studentName}
학번: ${idLabel}
교과명: ${subjectName}
교과군: ${subjectGroup}
학년도: ${schoolYear}학년도 ${gradeLabel}
적용 교육과정: ${curriculum} (${reason})
프롬프트 강도: ${promptMode}형`;
  }

  /** [1단계] 원문 분석표 */
  function _buildStep1() {
    return `══════════════════════════════════════════
■ [1단계] 원문 분석표 작성 (세특 작성 전 반드시 먼저 수행)
══════════════════════════════════════════
세특을 작성하기 전에 아래 분석표를 먼저 작성하십시오.
분석표 없이 세특 본문을 먼저 작성하지 마십시오.

[원문 분석표 작성 항목]
① 이 학생의 핵심 탐구 주제 (1~2문장)
② 원문에서 확인되는 교과 개념 (있으면 원문 표현 그대로 기재)
③ 탐구 과정의 핵심 장면 (어떤 활동을 어떻게 수행했는가)
④ 사고의 전환 지점 (기존 생각이 수정된 계기가 있는가)
⑤ 구체적 근거 (수치·도구명·책 제목·자료 출처 등, 없으면 "없음")
⑥ 원문에서 확인되는 한계 인식 또는 후속 질문 (없으면 "없음")
⑦ 이 학생만의 개별적 특성 (같은 활동의 다른 학생과 구별되는 점)
⑧ 학생 특성 유형 판단 (가~바 중 1~2개, 원문 근거 포함)`;
  }

  /** [2단계] 버전별 작성 전략 */
  function _buildStep2() {
    return `══════════════════════════════════════════
■ [2단계] 버전별 작성 전략 수립
══════════════════════════════════════════
1단계 분석표를 바탕으로 세 버전(500/700/1000바이트)의 작성 전략을 수립하십시오.

[전략 수립 항목]
500바이트 전략:
- 선택할 핵심 장면 1개: _______________
- 사용할 평가어 1개: _______________
- 사고 전환 표현 방식: _______________

700바이트 전략:
- 선택할 핵심 장면 2개: _______________
- 사용할 평가어 2개 이내: _______________
- 탐구 흐름(①~⑤)에서 포함할 요소: _______________

1000바이트 전략:
- 포함할 구체적 정보(수치·도구·책 제목 등): _______________
- 사용할 평가어 3개 이내: _______________
- 전환 전후 비교 표현 방식: _______________
- 포함할 후속 질문 또는 확장 방향: _______________

주의: 세 버전에서 동일한 평가어를 반복하지 마십시오.`;
  }

  /** [수행평가 원문] 블록 — 전체형 / 압축형 분기 */
  function _buildRawTextBlock(rawText, modeLabel) {
    const isCompact = modeLabel === '압축형';

    const header = isCompact
      ? `══════════════════════════════════════════
■ 수행평가 원문 [처리 모드: 압축형]
══════════════════════════════════════════
[압축형 처리 지시]
원문이 5,000자를 초과합니다.
세특 작성을 위해 아래 원문에서 먼저 핵심 부분을 선별하십시오.

선별 기준 (우선순위 순):
  1. 학생의 직접 답변·서술 부분
  2. 학생의 성찰·자기평가 부분
  3. 자료 분석 과정 및 근거 기술 부분
  4. 학생이 스스로 제기한 질문 또는 후속 탐구 내용

제외 기준 (세특 근거로 사용하지 않을 것):
  - 수행평가 안내문 및 출제 의도
  - 배점표·채점 기준표
  - 제출 형식 안내 (글자 수, 양식 설명 등)

선별 작업 후 선택한 핵심 구절 목록을 먼저 제시하고,
그 이후에 1단계 분석표부터 순서대로 작성하십시오.

[원문 전문]`
      : `══════════════════════════════════════════
■ 수행평가 원문 [처리 모드: 전체형]
══════════════════════════════════════════
아래 원문 전체를 세특 작성의 근거로 사용하십시오.

[원문 전문]`;

    return `${header}
${rawText.trim()}`;
  }

  /** 섹션 헬퍼: 제목 + 내용 */
  function _section(title, content) {
    return `══════════════════════════════════════════
■ ${title}
══════════════════════════════════════════
${content}`;
  }

  return { generatePrompt };

})();
