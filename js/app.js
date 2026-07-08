/**
 * app.js — 이벤트 바인딩 및 화면 제어
 *
 * 로드 순서: utils → curriculum → presets → extractor → validator → parser → prompt → app
 *
 * 담당 역할:
 *   - UI 요소 참조 및 초기화
 *   - 학년도/학년 변경 → 교육과정 표시
 *   - 교과명 입력 → 교과군 자동 추천
 *   - 원문 입력 → 글자 수/바이트/모드 실시간 표시
 *   - 원문 붙여넣기 → 학생명·학번 후보 자동 추출 제안
 *   - docx 드래그앤드롭 및 클릭 업로드 → 텍스트 추출
 *   - docx 확인 체크 → 생성 버튼 활성화 제어
 *   - 상태 패널(3구역) 실시간 갱신
 *   - 생성 버튼 클릭 → 프롬프트 생성 및 결과 표시
 *   - 복사 / txt 다운로드 / 초기화
 */

(function () {
  'use strict';

  // ── UI 요소 참조 ───────────────────────────────
  const $ = id => document.getElementById(id);

  const elSchoolYear      = $('school-year');
  const elGrade           = $('grade');
  const elCurriculumResult= $('curriculum-result');
  const elSubjectName     = $('subject-name');
  const elSubjectGroup    = $('subject-group');
  const elGroupHint       = $('group-hint');
  const elStudentName     = $('student-name');
  const elStudentId       = $('student-id');
  const elRawText         = $('raw-text');
  const elCharCount       = $('char-count');
  const elByteCount       = $('byte-count');
  const elModeDisplay     = $('mode-display');
  const elDropZone        = $('drop-zone');
  const elDocxInput       = $('docx-input');
  const elDocxConfirmBox  = $('docx-confirm-box');
  const elDocxChecked     = $('docx-checked');
  const elStatusPanel     = $('status-panel');
  const elAlertError      = $('alert-error');
  const elAlertWarning    = $('alert-warning');
  const elBtnGenerate     = $('btn-generate');
  const elOutputSection   = $('output-section');
  const elOutputText      = $('output-text');
  const elBtnCopy         = $('btn-copy');
  const elBtnDownload     = $('btn-download');
  const elBtnReset        = $('btn-reset');
  const elToast           = $('toast');
  const elNameSuggest     = $('name-suggest');
  const elIdSuggest       = $('id-suggest');
  const elObservationText = $('observation-text');
  const elObservationFile  = $('observation-file');
  const elObservationFileStatus = $('observation-file-status');
  const elMultiVersion    = $('multi-version');
  const elBtnToggleMore   = $('btn-toggle-more');
  const elSubjectMoreFields = $('subject-more-fields');

  // ── 모드 스위처 요소 ───────────────────────────
  const elModeBtnSubject  = $('mode-btn-subject');
  const elModeBtnHomeroom = $('mode-btn-homeroom');
  const elPanelSubject    = $('panel-subject');
  const elPanelHomeroom   = $('panel-homeroom');

  // ── 담임용 UI 요소 참조 ────────────────────────
  const elHrStudentName   = $('hr-student-name');
  const elHrStudentId     = $('hr-student-id');
  const elHrObservation   = $('hr-observation');
  const elHrObservationFile = $('hr-observation-file');
  const elHrObservationFileStatus = $('hr-observation-file-status');
  const elHrMaterial      = $('hr-material');
  const elHrMaterialFile  = $('hr-material-file');
  const elHrMaterialFileStatus = $('hr-material-file-status');
  const elBtnGenerateHr   = $('btn-generate-homeroom');
  const elHrAlertError    = $('hr-alert-error');
  const elHrAlertWarning  = $('hr-alert-warning');

  // ── 내부 상태 ──────────────────────────────────
  let state = {
    schoolYear:   '',
    grade:        '',
    subjectName:  '',
    subjectGroup: '',
    studentName:  '',
    studentId:    '',
    promptMode:   '균형',
    rawText:      '',
    observationText: '',
    multiVersion: false,
    docxUploaded: false,
    docxChecked:  false,
  };

  // ── 담임용 내부 상태 ───────────────────────────
  let hrState = {
    itemType: '',
    studentName: '',
    studentId: '',
    observationText: '',
    materialText: '',
    targetLength: '700',
  };

  // ── 초기화 ─────────────────────────────────────
  function init() {
    // 학년도 기본값: 현재 연도
    const currentYear = new Date().getFullYear();
    const yearOpt = elSchoolYear.querySelector(`option[value="${currentYear}"]`);
    if (yearOpt) {
      yearOpt.selected = true;
      state.schoolYear = String(currentYear);
    }

    // 기본 강도 동기화
    const defaultMode = document.querySelector('input[name="prompt-mode"]:checked');
    if (defaultMode) state.promptMode = defaultMode.value;

    bindEvents();
    updateAll();
  }

  // ── 이벤트 바인딩 ──────────────────────────────
  function bindEvents() {
    // 학년도 / 학년
    elSchoolYear.addEventListener('change', () => {
      state.schoolYear = elSchoolYear.value;
      updateCurriculumDisplay();
      updateStatusPanel();
      updateGenerateButton();
    });
    elGrade.addEventListener('change', () => {
      state.grade = elGrade.value;
      updateCurriculumDisplay();
      updateStatusPanel();
      updateGenerateButton();
    });

    // 교과명 → 교과군 자동 추천
    elSubjectName.addEventListener('input', () => {
      state.subjectName = elSubjectName.value;
      autoGuessSubjectGroup();
      updateStatusPanel();
      updateGenerateButton();
      validateFieldInline('subjectName', state.subjectName, $('err-subject-name'));
    });

    // 교과군 수동 변경
    elSubjectGroup.addEventListener('change', () => {
      state.subjectGroup = elSubjectGroup.value;
      elGroupHint.classList.remove('show'); // 수동 선택 시 힌트 숨김
      updateStatusPanel();
      updateGenerateButton();
    });

    // 학생명
    elStudentName.addEventListener('input', () => {
      state.studentName = elStudentName.value;
      updateStatusPanel();
      updateGenerateButton();
      validateFieldInline('studentName', state.studentName, $('err-student-name'));
    });

    // 학번
    elStudentId.addEventListener('input', () => {
      state.studentId = elStudentId.value;
      updateStatusPanel();
    });

    // 강도 라디오
    document.querySelectorAll('input[name="prompt-mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        state.promptMode = radio.value;
        updateStatusPanel();
      });
    });

    // 원문 입력
    elRawText.addEventListener('input', () => {
      state.rawText = elRawText.value;
      updateTextCounter();
      updateStatusPanel();
      updateGenerateButton();
      validateFieldInline('rawText', state.rawText, $('err-raw-text'));
      // 원문 변경 시 학생명·학번 후보 재추출
      extractAndSuggest(state.rawText);
    });

    // docx 드롭존 클릭
    elDropZone.addEventListener('click', () => elDocxInput.click());
    elDropZone.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') elDocxInput.click();
    });

    // docx input change
    elDocxInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) handleDocxFile(file);
    });

    // 드래그앤드롭
    elDropZone.addEventListener('dragover', e => {
      e.preventDefault();
      elDropZone.classList.add('drag-over');
    });
    elDropZone.addEventListener('dragleave', () => {
      elDropZone.classList.remove('drag-over');
    });
    elDropZone.addEventListener('drop', e => {
      e.preventDefault();
      elDropZone.classList.remove('drag-over');
      const file = Parser.getDocxFromDrop(e.dataTransfer);
      if (file) {
        handleDocxFile(file);
      } else {
        showAlert('error', '.docx 파일만 드래그앤드롭할 수 있습니다.');
      }
    });

    // docx 확인 체크박스
    elDocxChecked.addEventListener('change', () => {
      state.docxChecked = elDocxChecked.checked;
      updateGenerateButton();
      updateStatusPanel();
    });

    // 교사 관찰 메모
    elObservationText.addEventListener('input', () => {
      state.observationText = elObservationText.value;
    });
    elObservationFile.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) {
        attachFileToTextarea(file, elObservationText, elObservationFileStatus, text => {
          state.observationText = text;
        });
      }
    });

    // 다중 버전 출력 옵션
    elMultiVersion.addEventListener('change', () => {
      state.multiVersion = elMultiVersion.checked;
    });

    // 모드 스위처
    elModeBtnSubject.addEventListener('click', () => switchMode('subject'));
    elModeBtnHomeroom.addEventListener('click', () => switchMode('homeroom'));

    // 더 입력할 내용 토글 (교과용)
    elBtnToggleMore.addEventListener('click', () => {
      const showing = elSubjectMoreFields.style.display !== 'none';
      elSubjectMoreFields.style.display = showing ? 'none' : '';
      elBtnToggleMore.textContent = showing ? '더 입력할 내용 ▾' : '더 입력할 내용 접기 ▴';
    });

    // ── 담임용 이벤트 ─────────────────────────────
    document.querySelectorAll('input[name="hr-item"]').forEach(radio => {
      radio.addEventListener('change', () => {
        hrState.itemType = radio.value;
        updateHrGenerateButton();
      });
    });
    document.querySelectorAll('input[name="hr-length"]').forEach(radio => {
      radio.addEventListener('change', () => { hrState.targetLength = radio.value; });
    });
    elHrStudentName.addEventListener('input', () => {
      hrState.studentName = elHrStudentName.value;
      updateHrGenerateButton();
    });
    elHrStudentId.addEventListener('input', () => { hrState.studentId = elHrStudentId.value; });
    elHrObservation.addEventListener('input', () => {
      hrState.observationText = elHrObservation.value;
      updateHrGenerateButton();
    });
    elHrObservationFile.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) {
        attachFileToTextarea(file, elHrObservation, elHrObservationFileStatus, text => {
          hrState.observationText = text;
          updateHrGenerateButton();
        });
      }
    });
    elHrMaterial.addEventListener('input', () => {
      hrState.materialText = elHrMaterial.value;
      updateHrGenerateButton();
    });
    elHrMaterialFile.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) {
        attachFileToTextarea(file, elHrMaterial, elHrMaterialFileStatus, text => {
          hrState.materialText = text;
          updateHrGenerateButton();
        });
      }
    });
    elBtnGenerateHr.addEventListener('click', handleGenerateHomeroom);

    // 생성 버튼
    elBtnGenerate.addEventListener('click', handleGenerate);

    // 복사
    elBtnCopy.addEventListener('click', handleCopy);

    // 다운로드
    elBtnDownload.addEventListener('click', handleDownload);

    // 초기화
    elBtnReset.addEventListener('click', handleReset);
  }

  // ── 교육과정 자동 표시 ─────────────────────────
  function updateCurriculumDisplay() {
    if (state.schoolYear && state.grade) {
      const label = Curriculum.getLabel(state.schoolYear, state.grade);
      elCurriculumResult.textContent = label;
      elCurriculumResult.classList.add('show');
    } else {
      elCurriculumResult.classList.remove('show');
    }
  }

  // ── 교과군 자동 추천 (GPT 보완 3) ──────────────
  function autoGuessSubjectGroup() {
    const guessed = Extractor.guessSubjectGroup(state.subjectName);
    if (guessed && !state.subjectGroup) {
      // 교과군이 아직 선택되지 않은 경우 자동 선택
      elSubjectGroup.value = guessed;
      state.subjectGroup = guessed;
      elGroupHint.textContent = `✅ "${guessed}" 교과군으로 자동 추천되었습니다. 다른 교과군이면 직접 변경해 주세요.`;
      elGroupHint.classList.add('show');
    } else if (guessed && state.subjectGroup !== guessed) {
      // 이미 선택되어 있지만 추천과 다른 경우 힌트만 표시
      elGroupHint.textContent = `💡 교과명 기준 추천 교과군: ${guessed}`;
      elGroupHint.classList.add('show');
    } else {
      elGroupHint.classList.remove('show');
    }
  }

  // ── 원문 카운터 표시 ───────────────────────────
  function updateTextCounter() {
    const text = state.rawText;
    const { chars, bytes, label, mode } = Utils.getTextSummary(text);
    elCharCount.textContent = `${chars.toLocaleString()}자`;
    elByteCount.textContent = `약 ${bytes.toLocaleString()}바이트`;
    elModeDisplay.textContent = `처리 모드: ${label}`;
    elModeDisplay.className = 'mode-label' + (mode === 'compact' ? ' mode-compact' : '');
  }

  // ── 학생명·학번 후보 추출 제안 (GPT 보완 2) ────
  function extractAndSuggest(text) {
    const { names, ids } = Extractor.extractAll(text);

    if (names.length > 0) {
      const html = names.map(n =>
        `원문에서 발견: <strong>${n}</strong>
         <span class="suggest-apply" data-type="name" data-val="${n}">[적용]</span>`
      ).join('<br>');
      elNameSuggest.innerHTML = '👤 원문에 실명이 포함되어 있을 수 있습니다. 적용하더라도 AI에 붙여넣기 전 번호·약칭으로 바꾸는 것을 권장합니다.<br>' + html;
      elNameSuggest.classList.add('show');
    } else {
      elNameSuggest.classList.remove('show');
    }

    if (ids.length > 0) {
      const html = ids.map(id =>
        `원문에서 발견: <strong>${id}</strong>
         <span class="suggest-apply" data-type="id" data-val="${id}">[적용]</span>`
      ).join('<br>');
      elIdSuggest.innerHTML = '🔢 학번 후보: ' + html;
      elIdSuggest.classList.add('show');
    } else {
      elIdSuggest.classList.remove('show');
    }

    // [적용] 버튼 이벤트 위임
    [elNameSuggest, elIdSuggest].forEach(el => {
      el.querySelectorAll('.suggest-apply').forEach(btn => {
        btn.onclick = () => {
          const { type, val } = btn.dataset;
          if (type === 'name') {
            elStudentName.value = val;
            state.studentName = val;
            elNameSuggest.classList.remove('show');
          } else {
            elStudentId.value = val;
            state.studentId = val;
            elIdSuggest.classList.remove('show');
          }
          updateStatusPanel();
          updateGenerateButton();
        };
      });
    });
  }

  // ── docx 파일 처리 ─────────────────────────────
  async function handleDocxFile(file) {
    elDropZone.querySelector('strong').textContent = '⏳ 추출 중...';
    clearAlerts();

    const result = await Parser.extractFromFile(file);

    elDropZone.querySelector('strong').textContent = 'docx 파일을 드래그하거나 클릭하세요';
    elDocxInput.value = ''; // input 초기화 (같은 파일 재업로드 허용)

    if (!result.ok) {
      showAlert('error', result.error);
      return;
    }

    // textarea에 삽입
    const cleaned = Utils.cleanText(result.text);
    elRawText.value = cleaned;
    state.rawText = cleaned;

    updateTextCounter();
    updateStatusPanel();
    updateGenerateButton();
    extractAndSuggest(cleaned);
    validateFieldInline('rawText', cleaned, $('err-raw-text'));

    // docx 확인 체크박스 표시 (GPT 보완 1)
    state.docxUploaded = true;
    state.docxChecked  = false;
    elDocxChecked.checked = false;
    elDocxConfirmBox.classList.add('show');
    updateGenerateButton(); // 체크 전이므로 비활성화
  }

  // ── 상태 패널(3구역) 갱신 ─────────────────────
  function updateStatusPanel() {
    const s = state;

    // 충분한 정보가 있을 때만 표시
    const hasBasic = s.schoolYear && s.grade;
    if (!hasBasic && !s.rawText) {
      elStatusPanel.classList.remove('show');
      return;
    }

    const lines = [];

    // 교육과정
    if (s.schoolYear && s.grade) {
      const { curriculum, reason } = Curriculum.decide(s.schoolYear, s.grade);
      lines.push(`<span class="ok">✅ 교육과정: ${curriculum} (${reason})</span>`);
    }

    // 처리 모드
    if (s.rawText) {
      const { chars, label } = Utils.getTextSummary(s.rawText);
      lines.push(`<span class="ok">✅ 처리 모드: ${label} (원문 ${chars.toLocaleString()}자)</span>`);
    }

    // 교과 프리셋
    if (s.subjectGroup) {
      lines.push(`<span class="ok">✅ 교과 프리셋: ${s.subjectGroup}</span>`);
    }

    // 항상 포함되는 지시 항목
    lines.push(`<span class="ok">✅ 원문 분석표 지시 포함</span>`);
    lines.push(`<span class="ok">✅ 출력 분량: ${s.multiVersion ? '500/700/1000바이트 3버전' : '700바이트 1개'}</span>`);
    lines.push(`<span class="ok">✅ 루브릭 자기 점검 지시 포함</span>`);
    lines.push(`<span class="ok">✅ 금지어 + 대체 표현 포함</span>`);
    lines.push(`<span class="ok">✅ 최종 추천본 요청 포함</span>`);
    if (s.observationText && s.observationText.trim()) {
      lines.push(`<span class="ok">✅ 교사 관찰 메모 반영 (1순위 근거)</span>`);
    } else {
      lines.push(`<span class="warn">⚠️ 교사 관찰 메모 없음 — 보수적 모드로 작성됩니다</span>`);
    }

    // 강도
    if (s.promptMode) {
      lines.push(`<span class="ok">✅ 프롬프트 강도: ${s.promptMode}형</span>`);
    }

    // 학번 미입력 경고
    if (!s.studentId || !s.studentId.trim()) {
      lines.push(`<span class="warn">⚠️ 학번 미입력 — 프롬프트에 "미확인"으로 표시됩니다</span>`);
    }

    // docx 미확인
    if (s.docxUploaded && !s.docxChecked) {
      lines.push(`<span class="warn">⚠️ docx 추출 원문을 확인하고 체크해 주세요</span>`);
    }

    elStatusPanel.innerHTML = lines.join('<br>');
    elStatusPanel.classList.add('show');
  }

  // ── 생성 버튼 활성화 제어 ─────────────────────
  function updateGenerateButton() {
    const canGenerate = Validator.checkGenerateButton(state);
    elBtnGenerate.disabled = !canGenerate;
  }

  // ── 필드 인라인 오류 표시 ─────────────────────
  function validateFieldInline(field, value, errEl) {
    if (!errEl) return;
    const msg = Validator.validateField(field, value);
    if (msg && value !== '') {
      errEl.textContent = msg;
      errEl.classList.add('show');
    } else {
      errEl.classList.remove('show');
    }
  }

  // ── 생성 버튼 클릭 ────────────────────────────
  function handleGenerate() {
    clearAlerts();

    const inputData = {
      schoolYear:   state.schoolYear,
      grade:        state.grade,
      subjectName:  state.subjectName,
      subjectGroup: state.subjectGroup,
      studentName:  state.studentName,
      studentId:    state.studentId,
      promptMode:   state.promptMode,
      rawText:      state.rawText,
      observationText: state.observationText,
      multiVersion: state.multiVersion,
      docxUploaded: state.docxUploaded,
      docxChecked:  state.docxChecked,
    };

    // 최종 유효성 검사
    const { valid, errors, warnings } = Validator.validate(inputData);

    if (!valid) {
      showAlert('error', '⚠️ 입력을 확인해 주세요:\n• ' + errors.join('\n• '));
      return;
    }

    if (warnings.length > 0) {
      showAlert('warning', warnings.join('\n'));
    }

    // 생성 버튼 로딩 상태
    elBtnGenerate.disabled = true;
    elBtnGenerate.innerHTML = '<span class="spinner"></span> 생성 중...';

    // 동기 작업이지만 UI 업데이트를 위해 setTimeout 사용
    setTimeout(() => {
      try {
        const prompt = Prompt.generatePrompt(inputData);
        elOutputText.value = prompt;
        elOutputSection.classList.add('show');
        elOutputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        console.error('[app] 프롬프트 생성 오류:', e);
        showAlert('error', '프롬프트 생성 중 오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해 주세요.');
      } finally {
        elBtnGenerate.disabled = false;
        elBtnGenerate.innerHTML = '✨ 세특 프롬프트 생성';
        updateGenerateButton();
      }
    }, 30);
  }

  // ── 관찰메모·학생자료 파일 첨부 공용 헬퍼 ───────
  async function attachFileToTextarea(file, textareaEl, statusEl, onUpdated) {
    statusEl.textContent = `⏳ "${file.name}" 불러오는 중...`;
    statusEl.className = 'file-attach-status';

    const result = await Parser.extractGeneric(file);

    if (!result.ok) {
      statusEl.textContent = `❌ ${result.error}`;
      statusEl.className = 'file-attach-status error';
      return;
    }

    const tag = `[첨부: ${file.name}]`;
    const existing = textareaEl.value.trim();
    const combined = existing ? `${existing}\n\n${tag}\n${result.text}` : `${tag}\n${result.text}`;
    textareaEl.value = combined;
    onUpdated(combined);

    let statusMsg = `✅ "${file.name}"에서 ${result.text.length.toLocaleString()}자 불러옴`;
    if (typeof Extractor !== 'undefined' && Extractor.hasGarbledText(result.text)) {
      statusMsg += ' — ⚠️ 깨진 문자가 있는 것 같습니다. 내용을 확인해 주세요.';
    } else {
      statusMsg += ' — 내용을 확인해 주세요.';
    }
    statusEl.textContent = statusMsg;
    statusEl.className = 'file-attach-status ok';
  }

  // ── 모드 스위처 ────────────────────────────────
  function switchMode(mode) {
    if (mode === 'homeroom') {
      elPanelSubject.style.display = 'none';
      elPanelHomeroom.style.display = '';
      elModeBtnSubject.classList.remove('active');
      elModeBtnHomeroom.classList.add('active');
    } else if (mode === 'subject') {
      elPanelHomeroom.style.display = 'none';
      elPanelSubject.style.display = '';
      elModeBtnHomeroom.classList.remove('active');
      elModeBtnSubject.classList.add('active');
    }
    elOutputSection.classList.remove('show');
    clearAlerts();
    clearHrAlerts();
  }

  // ── 담임용 생성 버튼 활성화 제어 ───────────────
  function updateHrGenerateButton() {
    elBtnGenerateHr.disabled = !Validator.checkHomeroomGenerateButton(hrState);
  }

  // ── 담임용 알림 헬퍼 ───────────────────────────
  function showHrAlert(type, msg) {
    const el = type === 'error' ? elHrAlertError : elHrAlertWarning;
    el.textContent = msg;
    el.classList.add('show');
  }
  function clearHrAlerts() {
    elHrAlertError.classList.remove('show');
    elHrAlertWarning.classList.remove('show');
  }

  // ── 담임용 생성 버튼 클릭 ──────────────────────
  function handleGenerateHomeroom() {
    clearHrAlerts();

    const inputData = {
      itemType:        hrState.itemType,
      studentName:     hrState.studentName,
      studentId:       hrState.studentId,
      observationText: hrState.observationText,
      materialText:    hrState.materialText,
      targetLength:    hrState.targetLength,
    };

    const { valid, errors, warnings } = Validator.validateHomeroom(inputData);

    if (!valid) {
      showHrAlert('error', '⚠️ 입력을 확인해 주세요:\n• ' + errors.join('\n• '));
      return;
    }
    if (warnings.length > 0) {
      showHrAlert('warning', warnings.join('\n'));
    }

    elBtnGenerateHr.disabled = true;
    elBtnGenerateHr.innerHTML = '<span class="spinner"></span> 생성 중...';

    setTimeout(() => {
      try {
        const prompt = PromptHomeroom.generateHomeroomPrompt(inputData);
        elOutputText.value = prompt;
        elOutputSection.classList.add('show');
        elOutputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // 다운로드 파일명에 사용할 수 있도록 공용 state에도 반영
        state.studentName = hrState.studentName;
        state.subjectName = PresetsHomeroom.ITEM_LABELS[hrState.itemType] || '창체행특';
      } catch (e) {
        console.error('[app] 담임용 프롬프트 생성 오류:', e);
        showHrAlert('error', '프롬프트 생성 중 오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해 주세요.');
      } finally {
        elBtnGenerateHr.disabled = false;
        elBtnGenerateHr.innerHTML = '✨ 창체·행특 프롬프트 생성';
        updateHrGenerateButton();
      }
    }, 30);
  }

  // ── 복사 ──────────────────────────────────────
  function handleCopy() {
    const text = elOutputText.value;
    if (!text) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast());
    } else {
      // 구형 브라우저 fallback
      elOutputText.select();
      document.execCommand('copy');
      showToast();
    }
  }

  // ── 다운로드 ───────────────────────────────────
  function handleDownload() {
    const text = elOutputText.value;
    if (!text) return;

    const name   = Utils.sanitizeFilename(state.studentName) || '학생';
    const subj   = Utils.sanitizeFilename(state.subjectName) || '교과';
    const date   = Utils.formatDate().replace(/-/g, '');
    const filename = `${name}_${subj}_세특프롬프트_${date}.txt`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── 초기화 ─────────────────────────────────────
  function handleReset() {
    if (!confirm('모든 입력 내용과 생성 결과를 초기화합니다. 계속하시겠습니까?')) return;

    // 폼 초기화
    elSchoolYear.value  = String(new Date().getFullYear());
    elGrade.value       = '';
    elSubjectName.value = '';
    elSubjectGroup.value= '';
    elStudentName.value = '';
    elStudentId.value   = '';
    elRawText.value     = '';
    elObservationText.value = '';
    elObservationFileStatus.textContent = '';
    elObservationFileStatus.className = 'file-attach-status';
    elMultiVersion.checked  = false;
    elOutputText.value  = '';

    // 라디오 기본값 복원
    document.querySelector('#mode-hakjong').checked = true;

    // 상태 초기화
    state = {
      schoolYear:   String(new Date().getFullYear()),
      grade:        '',
      subjectName:  '',
      subjectGroup: '',
      studentName:  '',
      studentId:    '',
      promptMode:   '균형',
      rawText:      '',
      observationText: '',
      multiVersion: false,
      docxUploaded: false,
      docxChecked:  false,
    };

    // 담임용 폼 및 상태 초기화
    elHrStudentName.value = '';
    elHrStudentId.value   = '';
    elHrObservation.value = '';
    elHrObservationFileStatus.textContent = '';
    elHrObservationFileStatus.className = 'file-attach-status';
    elHrMaterial.value    = '';
    elHrMaterialFileStatus.textContent = '';
    elHrMaterialFileStatus.className = 'file-attach-status';
    document.querySelectorAll('input[name="hr-item"]').forEach(r => { r.checked = false; });
    document.querySelector('#hr-len-700').checked = true;
    hrState = {
      itemType: '',
      studentName: '',
      studentId: '',
      observationText: '',
      materialText: '',
      targetLength: '700',
    };
    clearHrAlerts();
    updateHrGenerateButton();

    // UI 초기화
    elDocxConfirmBox.classList.remove('show');
    elDocxChecked.checked = false;
    elNameSuggest.classList.remove('show');
    elIdSuggest.classList.remove('show');
    elGroupHint.classList.remove('show');
    elCurriculumResult.classList.remove('show');
    elStatusPanel.classList.remove('show');
    elOutputSection.classList.remove('show');
    clearAlerts();
    updateTextCounter();
    updateGenerateButton();

    document.querySelectorAll('.field-error').forEach(el => el.classList.remove('show'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── 알림 헬퍼 ─────────────────────────────────
  function showAlert(type, msg) {
    const el = type === 'error' ? elAlertError : elAlertWarning;
    el.textContent = msg;
    el.classList.add('show');
  }
  function clearAlerts() {
    elAlertError.classList.remove('show');
    elAlertWarning.classList.remove('show');
  }

  // ── 토스트 ─────────────────────────────────────
  function showToast() {
    elToast.classList.add('show');
    setTimeout(() => elToast.classList.remove('show'), 2000);
  }

  // ── 전체 갱신 (초기 로드 시) ──────────────────
  function updateAll() {
    updateCurriculumDisplay();
    updateTextCounter();
    updateStatusPanel();
    updateGenerateButton();
  }

  // ── 진입점 ─────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
