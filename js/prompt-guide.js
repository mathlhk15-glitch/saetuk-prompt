/**
 * prompt-guide.js — 과목 AI 조교(GPTs·Gemini Gem·Claude Project) 지침 생성 엔진
 *
 * generateGuidePrompts(inputData) 를 호출하면 5종 결과물을 반환합니다.
 *   A. masterGuide       — 프로젝트용 마스터 지침
 *   B. summaryCheckPrompt — 평가계획서 요약 확인 프롬프트
 *   C. studentTemplate   — 학생별 입력 템플릿
 *   D. studentExample    — 학생별 입력 예시 (채워진 샘플)
 *   E. checklist         — 최종 점검 체크리스트
 *
 * presets.js / presets-guide.js / curriculum.js / utils.js 가 먼저 로드되어 있어야 합니다.
 */

const PromptGuide = (() => {

  function generateGuidePrompts(inputData) {
    const {
      schoolYear, grade, subjectName, subjectGroup, platform,
      planExtractedText, performanceTaskName, evaluationElements,
      achievementStandards, rubric, productTypes,
      targetLength, styleBasis, schoolName,
    } = inputData;

    const gradeLabel = grade ? `고${grade}` : '(미입력)';
    const { curriculum, reason } = Curriculum.decide(schoolYear, grade);
    const curriculumInstruction = Curriculum.getInstruction(curriculum);
    const subjectPreset = Presets.SUBJECT_PRESETS[subjectGroup] || Presets.SUBJECT_PRESETS['진로·기타'];
    const length = parseInt(targetLength, 10) || 700;
    const style = styleBasis || '균형형';
    const hasPlan = !!(planExtractedText && planExtractedText.trim());

    const masterGuide = _buildMasterGuide({
      schoolYear, gradeLabel, subjectName, subjectGroup, platform,
      curriculum, reason, curriculumInstruction, subjectPreset,
      performanceTaskName, evaluationElements, achievementStandards,
      rubric, productTypes, length, style, schoolName, hasPlan,
    });

    const summaryCheckPrompt = _buildSummaryCheckPrompt(hasPlan);
    const studentTemplate = _buildStudentTemplate(length, style);
    const studentExample = _buildStudentExample(length, style, subjectName);
    const checklist = Presets.FINAL_CHECKLIST;

    return { masterGuide, summaryCheckPrompt, studentTemplate, studentExample, checklist };
  }

  // ═══════════════════════════════════════════════
  // A. 프로젝트용 마스터 지침
  // ═══════════════════════════════════════════════
  function _buildMasterGuide({ schoolYear, gradeLabel, subjectName, subjectGroup, platform,
                                curriculum, reason, curriculumInstruction, subjectPreset,
                                performanceTaskName, evaluationElements, achievementStandards,
                                rubric, productTypes, length, style, schoolName, hasPlan }) {
    const lines = [];
    lines.push(PresetsGuide.platformIntro(platform));
    lines.push('');
    lines.push(PresetsGuide.ruleVersionTag(schoolName));
    lines.push('');
    lines.push('══════════════════════════════════════════');
    lines.push('■ 역할');
    lines.push('══════════════════════════════════════════');
    lines.push(`당신은 ${subjectName || '(과목명 미입력)'} 담당 고등학교 교사의 교과 세부능력 및 특기사항(세특) 작성을 돕는 보조자입니다.`);
    lines.push('이 프로젝트는 한 과목에 대해 여러 학생의 세특 초안을 순서대로 작성하는 데 사용됩니다.');
    lines.push('');
    lines.push('══════════════════════════════════════════');
    lines.push('■ 대상 과목');
    lines.push('══════════════════════════════════════════');
    lines.push(`과목명: ${subjectName || '(미입력)'} (교과군: ${subjectGroup || '자동 판단'})`);
    lines.push(`학년도/학년: ${schoolYear || '(미입력)'}학년도 ${gradeLabel}`);
    lines.push(`적용 교육과정: ${curriculum} (${reason})`);
    lines.push('');
    lines.push(curriculumInstruction);
    lines.push('');
    lines.push('══════════════════════════════════════════');
    lines.push('■ 자료 우선순위');
    lines.push('══════════════════════════════════════════');
    lines.push('1순위: 교사의 직접 관찰·평가 메모');
    lines.push('2순위: 평가계획서와 수행평가 기준 (첨부된 원본 파일 참고)');
    lines.push('3순위: 학생 수행평가보고서, 자기평가서, 소감문, 수업산출물');
    lines.push('');
    lines.push('══════════════════════════════════════════');
    lines.push('■ 평가계획서 활용');
    lines.push('══════════════════════════════════════════');
    lines.push('평가계획서는 과목 맥락, 수행평가 기준, 평가요소, 성취기준, 관찰 포인트를 파악하기 위한 자료입니다.');
    lines.push('평가계획서에 없는 활동이나 성취를 만들어내지 마십시오.');
    if (performanceTaskName && performanceTaskName.trim()) lines.push(`수행평가명: ${performanceTaskName.trim()}`);
    if (evaluationElements && evaluationElements.trim()) lines.push(`평가요소: ${evaluationElements.trim()}`);
    if (achievementStandards && achievementStandards.trim()) lines.push(`성취기준: ${achievementStandards.trim()}`);
    if (rubric && rubric.trim()) lines.push(`채점기준/루브릭: ${rubric.trim()}`);
    if (productTypes && productTypes.trim()) lines.push(`학생 산출물 유형: ${productTypes.trim()}`);
    lines.push(hasPlan
      ? '(교사가 평가계획서 파일을 첨부·확인했습니다. 첨부된 원본 파일과 위 요약을 함께 참고하십시오.)'
      : '(평가계획서 파일이 아직 첨부되지 않았습니다. 이 프로젝트에 평가계획서 PDF/DOCX를 첨부한 뒤 사용하십시오.)');
    lines.push('');
    lines.push(subjectPreset);
    lines.push('');
    lines.push(Presets.STYLE_PRINCIPLES);
    lines.push('');
    lines.push(Presets.BANNED_EXPRESSIONS);
    lines.push('');
    lines.push(Presets.RECORD_PROHIBITIONS);
    lines.push('');
    lines.push('══════════════════════════════════════════');
    lines.push('■ 학생자료 활용 원칙');
    lines.push('══════════════════════════════════════════');
    lines.push('학생 수행평가보고서와 자기평가서는 보조 근거입니다.');
    lines.push('학생 원문을 그대로 옮기지 말고, 교사 관찰 시점으로 재구성하십시오.');
    lines.push('학생이 학생부 기재용 문장을 대신 쓴 것처럼 보이는 표현을 사용하지 마십시오.');
    lines.push('');
    lines.push('══════════════════════════════════════════');
    lines.push('■ 교사 관찰 부족 시');
    lines.push('══════════════════════════════════════════');
    lines.push('교사 관찰 메모가 없거나 추상적이면 보수적 초안 모드로 작성하십시오.');
    lines.push('이 경우 학생의 역량이나 태도를 단정하지 말고, 확인 가능한 활동 사실 중심으로 작성하십시오.');
    lines.push('');
    lines.push('══════════════════════════════════════════');
    lines.push('■ 문체/분량 기준');
    lines.push('══════════════════════════════════════════');
    lines.push(`문체: ${style}`);
    lines.push(`기본 목표 분량: ${length}바이트 이내 (학생별 요청 시 조정 가능)`);
    lines.push('');
    lines.push('══════════════════════════════════════════');
    lines.push('■ 학생별 작성 순서');
    lines.push('══════════════════════════════════════════');
    lines.push('1. 이 프로젝트를 처음 사용할 때는 아래 [평가계획서 요약 확인 프롬프트]를 먼저 실행해, 평가계획서를 올바르게 읽었는지 교사의 확인을 받으십시오.');
    lines.push('2. 교사가 "평가계획서 요약 확인 완료"라고 답하기 전에는 학생별 세특 초안을 작성하지 마십시오.');
    lines.push('3. 확인이 끝난 뒤에는 [학생별 입력 템플릿] 형식으로 자료를 받아 학생별 세특 초안을 작성하십시오.');
    lines.push('');
    lines.push('══════════════════════════════════════════');
    lines.push('■ 출력 형식 (학생별 초안 작성 시)');
    lines.push('══════════════════════════════════════════');
    lines.push('## 세특 초안');
    lines.push('본문: (세특 본문)');
    lines.push(`바이트 추정: 약 ○○○바이트 (목표 ${length}바이트 이내)`);
    lines.push('## 근거 점검');
    lines.push('교사 관찰에서 반영한 근거 / 학생자료에서 보조로 반영한 근거 / 근거 부족으로 제외한 내용');
    lines.push('## 교사용 수정 안내');
    lines.push('나이스 입력 전 교사가 확인해야 할 부분');
    lines.push('');
    lines.push('마지막 줄에 항상 이렇게 표시하십시오:');
    lines.push('"⚠️ 이 초안은 참고용입니다. 나이스 입력 전 반드시 직접 확인·수정해주세요."');

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════
  // B. 평가계획서 요약 확인 프롬프트
  // ═══════════════════════════════════════════════
  function _buildSummaryCheckPrompt(hasPlan) {
    const lines = [];
    lines.push('아래 첨부된 평가계획서(PDF/DOCX)를 읽고, 다음 항목을 표로 정리해줘.');
    lines.push('- 과목명 / 학년 / 학기');
    lines.push('- 수행평가명');
    lines.push('- 평가요소');
    lines.push('- 성취기준');
    lines.push('- 채점기준(루브릭)');
    lines.push('- 세특 작성 시 참고할 수 있는 관찰 포인트');
    lines.push('');
    lines.push('표 정리가 끝나면, "이 내용이 평가계획서와 일치하는지 교사가 먼저 확인한 뒤 학생 자료를 입력해 주세요."라고 안내해줘.');
    lines.push('교사가 "평가계획서 요약 확인 완료"라고 답하기 전에는 학생별 세특 초안을 작성하지 마.');
    if (hasPlan) {
      lines.push('');
      lines.push('(참고: 이 프로젝트를 세팅한 교사가 아래와 같이 평가계획서에서 미리 추출한 텍스트를 참고 자료로 남겨두었습니다. 다만 표·서식은 일부 누락되었을 수 있으니, 첨부된 원본 파일을 우선 근거로 삼으십시오.)');
    }
    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════
  // C. 학생별 입력 템플릿
  // ═══════════════════════════════════════════════
  function _buildStudentTemplate(length, style) {
    return [
      '[학생 식별명]',
      '(예: 1번, 2반 15번, A학생 — 실명 대신 사용을 권장합니다)',
      '',
      '[교사 관찰 메모] — 1순위 근거',
      '(관찰한 구체적 장면과 행동을 적어주세요. 없으면 "교사 관찰 메모 부족"이라고 적어주세요.)',
      '',
      '[학생자료] — 보조 근거 (선택)',
      '(수행평가보고서 파일 첨부 또는 핵심 내용 요약 / 자기평가서 등)',
      '',
      `[목표 분량] ${length}바이트 이내`,
      `[문체 기준] ${style}`,
      '',
      '[요청]',
      '위 자료와 이미 첨부된 평가계획서를 바탕으로 이 학생의 교과세특 초안을 작성해줘.',
    ].join('\n');
  }

  // ═══════════════════════════════════════════════
  // D. 학생별 입력 예시 (채워진 샘플)
  // ═══════════════════════════════════════════════
  function _buildStudentExample(length, style, subjectName) {
    const subj = subjectName && subjectName.trim() ? subjectName.trim() : '이 과목';
    return [
      '[학생 식별명]',
      '3번',
      '',
      '[교사 관찰 메모] — 1순위 근거',
      `보고서 초안에서는 주장과 근거가 분리되어 있었으나, 피드백 후 관련 자료를 다시 찾아 근거를 보완함. 발표 중 친구의 질문에 자료를 다시 제시하며 답변함.`,
      '',
      '[학생자료] — 보조 근거 (선택)',
      `${subj} 수행평가보고서 파일 첨부함. 자기평가서에는 "처음엔 자료 해석이 어려웠으나, 그래프를 다시 정리하며 이해가 깊어졌다"고 작성함.`,
      '',
      `[목표 분량] ${length}바이트 이내`,
      `[문체 기준] ${style}`,
      '',
      '[요청]',
      `위 자료와 이미 첨부된 평가계획서를 바탕으로 이 학생의 ${subj} 세특 초안을 작성해줘.`,
    ].join('\n');
  }

  return { generateGuidePrompts };

})();
