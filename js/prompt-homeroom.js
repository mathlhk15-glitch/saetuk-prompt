/**
 * prompt-homeroom.js — 담임교사용(행동특성및종합의견, 자율/진로/동아리활동) 프롬프트 조립
 *
 * generateHomeroomPrompt(inputData) 를 호출하면 완성된 프롬프트 문자열을 반환합니다.
 * presets.js / presets-homeroom.js / utils.js 가 먼저 로드되어 있어야 합니다.
 *
 * presets.js의 공통 규칙(기재 금지, 상투 표현 금지, 문체 원칙, 최종 점검)을 그대로
 * 재사용하고, 항목별 초점과 문체 예시만 presets-homeroom.js에서 가져온다.
 */

const PromptHomeroom = (() => {

  function generateHomeroomPrompt(inputData) {
    const {
      itemType,
      studentName,
      studentId,
      observationText,
      materialText,
      targetLength,
    } = inputData;

    const idLabel = studentId && studentId.trim() ? studentId.trim() : '미확인';
    const dateLabel = Utils.formatDate();
    const hasObservation = !!(observationText && observationText.trim());
    const hasMaterial = !!(materialText && materialText.trim());
    const itemLabel = PresetsHomeroom.ITEM_LABELS[itemType] || itemType;
    const itemFocus = PresetsHomeroom.ITEM_FOCUS[itemType] || '';
    const length = parseInt(targetLength, 10) || 700;

    const parts = [
      _buildSummary({ studentName, itemLabel, hasObservation, hasMaterial, length, dateLabel }),
      _buildRole(hasObservation, itemLabel),
      hasObservation ? _buildObservationBlock(observationText) : _buildNoObservationNotice(),
      hasMaterial ? _buildMaterialBlock(materialText) : '',
      _buildInputInfo({ studentName, idLabel, itemLabel }),
      itemFocus,
      Presets.STYLE_PRINCIPLES,
      PresetsHomeroom.STYLE_EXAMPLES_HOMEROOM,
      Presets.BANNED_EXPRESSIONS,
      Presets.RECORD_PROHIBITIONS,
      _buildOutputFormat(length),
      Presets.FINAL_CHECKLIST,
    ];

    return parts.filter(Boolean).join('\n\n');
  }

  // ═══════════════════════════════════════════════
  // 내부 블록 빌더
  // ═══════════════════════════════════════════════

  function _buildSummary({ studentName, itemLabel, hasObservation, hasMaterial, length, dateLabel }) {
    return `[처리 요약]
학생 식별명: ${studentName} | 작성 항목: ${itemLabel}
교사 관찰 메모: ${hasObservation ? '있음 (1순위 근거)' : '없음 (자료만으로 보수적 작성)'} | 학생 자료: ${hasMaterial ? '있음 (보조 근거)' : '없음'}
목표 분량: ${length}바이트
생성일시: ${dateLabel}`;
  }

  function _buildRole(hasObservation, itemLabel) {
    return `══════════════════════════════════════════
■ 역할 및 작성 원칙
══════════════════════════════════════════
당신은 대한민국 고등학교 담임교사입니다.
아래 자료를 바탕으로 학교생활기록부 '${itemLabel}' 항목을 작성합니다.

다음 원칙을 반드시 지키십시오:
1. 자료에 근거한 사실만 서술. 추정·과장·창작 금지.
2. 담임교사가 학생을 관찰하고 기록하는 문체로 작성. 학생이 쓴 글이나 자기평가서 문장을 그대로 옮기지 말고 반드시 교사의 시점으로 재구성할 것.
3. ${hasObservation ? '아래 [교사 관찰 메모]를 1순위 근거로 삼고, 학생 자료는 보조 근거로만 활용할 것.' : '[교사 관찰 메모]가 제공되지 않았으므로, 학생의 역량·태도·성장을 단정하지 말고 자료에서 확인되는 사실 중심으로 보수적으로 작성할 것.'}
4. 특정 대학명, 자격증, 사교육 관련 내용은 절대 포함하지 말 것.
5. 이 항목의 성격(아래 [항목별 초점])에 맞는 내용만 다룰 것.`;
  }

  function _buildObservationBlock(observationText) {
    return `══════════════════════════════════════════
■ 교사 관찰 메모 (1순위 근거)
══════════════════════════════════════════
아래는 담임교사가 이 학생을 직접 관찰하고 남긴 메모입니다. 이 내용을 작성의 가장 중요한 근거로 삼으십시오.

${observationText.trim()}`;
  }

  function _buildNoObservationNotice() {
    return `══════════════════════════════════════════
■ 교사 관찰 메모 (없음)
══════════════════════════════════════════
이번 요청에는 교사 관찰 메모가 포함되지 않았습니다.
아래 학생 자료만을 근거로, 학생의 역량이나 태도를 단정하지 말고 자료에서 확인되는 행동 사실 중심으로 보수적으로 작성하십시오.
가능하면 다음번에는 짧게라도 교사 관찰 메모를 함께 제공하는 것을 권장한다는 점을 마지막에 한 줄로 안내하십시오.`;
  }

  function _buildMaterialBlock(materialText) {
    return `══════════════════════════════════════════
■ 학생 자료 (보조 근거 — 자기평가서·상담자료·활동기록 등)
══════════════════════════════════════════
아래 자료는 보조 근거로만 활용하십시오. 문장을 그대로 옮기지 말고, 교사 관찰 시점으로 재구성하십시오.

${materialText.trim()}`;
  }

  function _buildInputInfo({ studentName, idLabel, itemLabel }) {
    return `══════════════════════════════════════════
■ 입력 정보
══════════════════════════════════════════
학생 식별명: ${studentName}
학번: ${idLabel}
작성 항목: ${itemLabel}`;
  }

  function _buildOutputFormat(length) {
    const min = Math.round(length * 0.9);
    const max = Math.round(length * 1.05);
    return `══════════════════════════════════════════
■ 출력 조건
══════════════════════════════════════════
아래 조건으로 작성하십시오.

- 목표: ${min}~${max}바이트
- '학생은', '본인은', '자신은', '이 학생은', 학생명 — 절대 사용 금지
- 1인칭(나, 저, 제) — 절대 사용 금지
- 추상적 칭찬("성실함", "열심히 함")보다 구체적 행동과 장면으로 서술
- 마지막 문장은 교사 시점의 종합 평가로 마무리

바이트 계산 기준 (출력 전 반드시 직접 계산):
  한글 1자 = 3바이트 / 영문·숫자·공백 = 1바이트 / 특수문자 = 3바이트

출력 형식:
## 작성 초안
본문:
(본문)
바이트 추정: 약 ○○○바이트
반영 핵심 요소: ○○ / ○○ / ○○
근거 점검: 교사 관찰에서 반영한 부분 / 학생 자료에서 보조로 반영한 부분

마지막 줄에 항상 이렇게 표시하십시오:
"⚠️ 이 초안은 참고용입니다. 나이스 입력 전 반드시 직접 확인·수정해주세요."`;
  }

  function _section(title, content) {
    return `══════════════════════════════════════════
■ ${title}
══════════════════════════════════════════
${content}`;
  }

  return { generateHomeroomPrompt };

})();
