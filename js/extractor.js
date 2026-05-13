/**
 * extractor.js — 원문 자동 추출 + 교과명→교과군 매핑
 *
 * [GPT 보완 2] 원문에서 학생명·학번 후보 자동 추출
 * [GPT 보완 3] 교과명 입력 시 교과군 자동 추천
 */

const Extractor = (() => {

  // ─────────────────────────────────────────────
  // 교과명 → 교과군 매핑 테이블
  // ─────────────────────────────────────────────
  const SUBJECT_MAP = [
    {
      group: '국어',
      keywords: ['국어', '문학', '독서', '화법', '작문', '언어', '매체', '심화국어',
                 '고전읽기', '고전문학', '현대문학', '비문학', '수필'],
    },
    {
      group: '수학',
      keywords: ['수학', '미적분', '확률', '통계', '기하', '대수', '수학Ⅰ', '수학Ⅱ',
                 '수학I', '수학II', '심화수학', '고급수학', '수학과제탐구'],
    },
    {
      group: '과학',
      keywords: ['물리', '화학', '생명', '지구', '과학', '생물', '생태', '천문',
                 '융합과학', '과학탐구', '물리학', '화학Ⅰ', '화학Ⅱ', '생명과학',
                 '지구과학', '고급물리', '고급화학', '고급생명', '고급지구'],
    },
    {
      group: '사회',
      keywords: ['사회', '역사', '지리', '윤리', '정치', '경제', '법', '문화',
                 '한국사', '세계사', '동아시아', '세계지리', '한국지리',
                 '생활과윤리', '윤리와사상', '정치와법', '사회문화'],
    },
    {
      group: '영어',
      keywords: ['영어', '영미', '영작', '영독', '심화영어', '영어회화',
                 '영어독해', '영어작문', '영미문학', '영어Ⅰ', '영어Ⅱ', '영어I', '영어II'],
    },
    {
      group: '진로·기타',
      keywords: ['진로', '직업', '창업', '정보', '컴퓨터', '인공지능', '코딩',
                 '철학', '심리', '교육', '보건', '체육', '음악', '미술',
                 '기술', '가정', '제2외국어', '일본어', '중국어', '스페인어',
                 '프랑스어', '독일어', '한문'],
    },
  ];

  /**
   * 교과명 → 교과군 추천
   * @param {string} subjectName - 사용자가 입력한 교과명
   * @returns {string|null} 추천 교과군 ('국어', '수학', ... 또는 null)
   */
  function guessSubjectGroup(subjectName) {
    if (!subjectName || !subjectName.trim()) return null;
    const name = subjectName.trim();

    for (const { group, keywords } of SUBJECT_MAP) {
      for (const kw of keywords) {
        if (name.includes(kw)) return group;
      }
    }
    return null;
  }

  // ─────────────────────────────────────────────
  // 학생명 후보 추출 패턴
  // ─────────────────────────────────────────────
  const NAME_PATTERNS = [
    // "이름 | 정재민", "이름: 정재민", "이름: 정 재 민"
    /이름\s*[|:：]\s*([가-힣]{2,4})/g,
    // "성명 | 정재민", "성명: 정재민"
    /성명\s*[|:：]\s*([가-힣]{2,4})/g,
    // "학생명 | 정재민"
    /학생명\s*[|:：]\s*([가-힣]{2,4})/g,
    // "학생: 정재민"
    /학생\s*[|:：]\s*([가-힣]{2,4})/g,
    // "이름표: 정재민" (드물지만 포함)
    /이름표\s*[|:：]\s*([가-힣]{2,4})/g,
    // "제출자: 정재민"
    /제출자\s*[|:：]\s*([가-힣]{2,4})/g,
  ];

  // ─────────────────────────────────────────────
  // 학번 후보 추출 패턴
  // ─────────────────────────────────────────────
  const ID_PATTERNS = [
    // "학번 | 30419", "학번: 30419"
    /학번\s*[|:：]\s*(\d{4,6})/g,
    // "번호 | 19", "번호: 019"
    /번호\s*[|:：]\s*(\d{1,3})/g,
    // "출석번호: 19"
    /출석번호\s*[|:：]\s*(\d{1,3})/g,
    // "수험번호: 20312019"
    /수험번호\s*[|:：]\s*(\d{4,10})/g,
  ];

  /**
   * 원문에서 학생명 후보 추출
   * @param {string} text - 원문 텍스트
   * @returns {string[]} 고유 학생명 후보 배열
   */
  function extractNameCandidates(text) {
    if (!text) return [];
    const candidates = new Set();

    for (const pattern of NAME_PATTERNS) {
      // 패턴을 reset하여 재사용
      const re = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = re.exec(text)) !== null) {
        const name = match[1].trim();
        if (name.length >= 2 && name.length <= 4) {
          candidates.add(name);
        }
      }
    }

    return [...candidates];
  }

  /**
   * 원문에서 학번 후보 추출
   * @param {string} text - 원문 텍스트
   * @returns {string[]} 고유 학번 후보 배열
   */
  function extractIdCandidates(text) {
    if (!text) return [];
    const candidates = new Set();

    for (const pattern of ID_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = re.exec(text)) !== null) {
        candidates.add(match[1].trim());
      }
    }

    return [...candidates];
  }

  /**
   * 원문에서 학생명 + 학번을 동시에 추출
   * @param {string} text
   * @returns {{ names: string[], ids: string[] }}
   */
  function extractAll(text) {
    return {
      names: extractNameCandidates(text),
      ids: extractIdCandidates(text),
    };
  }

  /**
   * 깨진 문자 감지 (mammoth 추출 실패 패턴)
   * @param {string} text
   * @returns {boolean}
   */
  function hasGarbledText(text) {
    if (!text) return false;
    // #U+XXXX 패턴 또는 연속 물음표·빈 박스 문자
    return /[#＃]U\+?[0-9A-Fa-f]{4}/g.test(text) ||
           /\uFFFD{3,}/g.test(text);
  }

  return {
    guessSubjectGroup,
    extractNameCandidates,
    extractIdCandidates,
    extractAll,
    hasGarbledText,
    SUBJECT_MAP,
  };

})();
