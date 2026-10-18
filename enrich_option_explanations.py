# -*- coding: utf-8 -*-
"""
enrich_option_explanations.py
Comprehensive Clinical Option-by-Option Explanation Generator for all 2,267 questions across 9 subjects:
- 진단검사의학과, 내과, 외과, 산부인과, 소아청소년과, 신경과, 정신건강의학과, 정형외과, 영상의학과

Generates structured per-option explanations:
- q.option_explanations: [ { opt_idx, opt_num, text, is_correct, tag, reason }, ... ]
- q.explanation.option_explanations: identical array
- q.explanation.differential: formatted option bullets + KMLE theory notes
- Updates data/quiz_all_subjects.json, data/quiz_data.js, data/quiz_lab_med.json
"""

import os, sys, json, re, unicodedata

ROOT_DIR = r"C:\Users\ekims\OneDrive\냥의자료\2026-1\기말고사_자료"
APP_DIR = os.path.join(ROOT_DIR, "lab_med_quiz_vercel")
DATA_DIR = os.path.join(APP_DIR, "data")

CIRCLE_CHARS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
CIRCLE_MAP = {c: i for i, c in enumerate(CIRCLE_CHARS)}

# -------------------------------------------------------------
# 1. Load Subject Themes & Extra Data
# -------------------------------------------------------------
def load_all_subject_themes():
    subject_configs = [
        ('진단검사의학과', 'lab_med_data'),
        ('내과', 'im_data'),
        ('외과', 'surgery_data'),
        ('산부인과', 'obgyn_data'),
        ('소아청소년과', 'pediatrics_data'),
        ('신경과', 'neurology_data'),
        ('정신건강의학과', 'psychiatry_data'),
        ('정형외과', 'orthopedics_data'),
        ('영상의학과', 'radiology_data')
    ]
    
    themes_by_sub = {}
    crop_map = {}
    year_map = {}

    for sub, mod_name in subject_configs:
        sdir = os.path.join(ROOT_DIR, sub)
        if not os.path.exists(sdir):
            continue
        sys.path.insert(0, sdir)
        try:
            mod = __import__(mod_name)
            themes = getattr(mod, 'THEMES', [])
            themes_by_sub[sub] = themes
            for t in themes:
                for c in t.get('crops', []):
                    crop_map[f"{sub}_{c}"] = t
                for y in t.get('years', []):
                    m = re.search(r'(\d+Y)[-_]Q?(\d+)', y)
                    if m:
                        k = f"{sub}_{m.group(1)}_Q{int(m.group(2)):02d}"
                        year_map[k] = t
        except Exception as e:
            print(f"[{sub}] Theme load warning: {e}")
        finally:
            if sdir in sys.path:
                sys.path.remove(sdir)

    # Surgery Extra Data
    surgery_extra_map = {}
    sdir_surg = os.path.join(ROOT_DIR, "외과")
    if os.path.exists(sdir_surg):
        sys.path.insert(0, sdir_surg)
        try:
            import surgery_extra_data
            for item in getattr(surgery_extra_data, 'SURGERY_EXTRA_QUESTIONS', []):
                yq = item.get('year_q', '')
                if yq:
                    surgery_extra_map[yq] = item
                    m = re.search(r'(\d+Y)[-_]Q?(\d+)', yq)
                    if m:
                        surgery_extra_map[f"{m.group(1)}_Q{int(m.group(2)):02d}"] = item
        except Exception as e:
            print(f"[외과 extra] Warning: {e}")
        finally:
            if sdir_surg in sys.path:
                sys.path.remove(sdir_surg)

    return themes_by_sub, crop_map, year_map, surgery_extra_map

# -------------------------------------------------------------
# 2. Text Parsing Utilities
# -------------------------------------------------------------
def clean_option_text(opt):
    text = re.sub(r'^[①②③④⑤⑥⑦⑧⑨⑩\d\.\)\-\s\⚫\●\*]+', '', str(opt)).strip()
    return text

def extract_option_num(opt, default_idx):
    m = re.match(r'^([①②③④⑤⑥⑦⑧⑨⑩]|\d+[\.\)])', str(opt).strip())
    if m:
        return m.group(1).strip()
    if 0 <= default_idx < len(CIRCLE_CHARS):
        return CIRCLE_CHARS[default_idx]
    return f"{default_idx + 1}."

def extract_core_finding(findings):
    if not findings:
        return ""
    lines = findings.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
        clean = re.sub(r'^[•\-\d\.\s\[\]]+', '', line).strip()
        clean = re.sub(r'^(임상 증례 요약|핵심 요약|진단 및 치료 알고리즘|진단|치료 원칙)\s*:\s*', '', clean).strip()
        if len(clean) >= 20:
            return clean
    return ""

# -------------------------------------------------------------
# 3. Medical Domain Knowledge Heuristics & Rules
# -------------------------------------------------------------
SPECIAL_OPTION_RULES = [
    # Surgery
    (r'(복강경\s*담낭절제술|담낭절제술)', '급성 담낭염 환자에서 담낭 괴사, 기종성 변화 및 천공을 예방하기 위한 72시간 이내 조기 근치 수술(표준 치료)입니다.', '담관 폐쇄/담관염 동반 시가 아니면 PTBD나 보존 요법보다 조기 담낭절제술이 우선됩니다.'),
    (r'(TPC\s*with\s*IPAA|전대장직장절제술)', '약물 불응성 전대장 궤양성 대장염(UC)에서 대장암 위험을 근치적으로 제거하고 괄약근을 보존하는 표준 수술입니다.', '직장에 병변이 남아있을 때 결장만 절제하면 직장염 지속 및 암 발생 위험이 남아 부적절합니다.'),
    (r'(충수절제술|복강경\s*충수절제술)', '급성 충수염에서 천공 및 복막염 진행을 차단하기 위한 응급 근치 수술입니다.', '항생제 단독 치료는 재발률이 높고 천공 위험이 있어 수술이 표준입니다.'),
    (r'(비장전체절제|비장절제)', '혈역학적으로 불안정한 고등급 비장 파열 또는 색전술 실패 환자에서 생명을 구하기 위한 표준 응급 수술입니다.', '혈역학적으로 안정한 저등급 파열의 경우 비수술적 보존 요법 또는 색전술이 우선됩니다.'),
    (r'(탈장교정술|인공막)', '감돈 및 교액 위험이 있는 서혜부/복벽 탈장의 해부학적 결손을 보강하는 표준 치료입니다.', '도수 정복 후에도 결손 부위 교정을 위한 정규 수술이 요구됩니다.'),
    
    # Internal Medicine
    (r'(경피적혈관개통술|PTA|스텐트)', '중증 하지 허혈(CLI, ABI < 0.4 또는 휴식통/궤양) 환자에서 사지 절단을 방지하기 위한 1차 표준 혈관 재개통술입니다.', '단순 보존적 약물 요법만으로는 동맥 폐색으로 인한 조직 괴사 진행을 막을 수 없습니다.'),
    (r'(SGLT-?2\s*억제제|Dapagliflozin|Empagliflozin)', '당뇨병 동반 심부전(HFrEF/HFpEF) 또는 만성 신부전 환자에서 심혈관 사망률 및 신기능 악화를 유의하게 감소시키는 표준 1차 약제입니다.', '신기능 저하(eGFR 현저히 감소) 급성기에는 초기 사구체여과율 변화를 면밀히 모니터링해야 합니다.'),
    (r'(아스피린|클로피도그렐|항혈소판제)', '죽상동맥경화증, 급성 관동맥증후군 및 허혈성 뇌졸중의 혈전 형성 예방을 위한 1차 항혈소판 요법입니다.', '활동성 출혈 병변이나 출혈성 뇌졸중 급성기에는 투여가 금기입니다.'),
    (r'(베타차단제|Bisoprolol|Carvedilol)', '안정형 만성 심부전, 협심증 및 부정맥 조절의 핵심 약제입니다.', '비보상성 급성 폐부종이나 심인성 쇼크 동반 급성기에는 수축력 저하 위험으로 투여를 보류해야 합니다.'),
    (r'(스테로이드|프레드니솔론|Dexamethasone)', '자가면역질환, 특발성 혈관염 및 급성 알레르기/천식 악화 시의 강력한 항염증 1차 치료제입니다.', '단순 감염증이나 동맥경화성 혈관 폐색 질환에서는 치료 효과가 없거나 감염을 악화시킬 수 있습니다.'),
    
    # OBGYN
    (r'(자궁경|자궁경하\s*유착박리)', '아셔만 증후군(Asherman syndrome) 등 자궁강 내 유착 병변을 직접 시각화하여 박리하고 해부학적 구조를 복원하는 표준 진단 및 치료법입니다.', '표적 장기 결함 질환이므로 단순 호르몬 투여만으로는 월경 주기가 회복되지 않습니다.'),
    (r'(clomiphene.*인공수정|클로미펜.*IUI)', '원인불명 난임(Unexplained infertility) 환자에서 1차 표준 치료로 클로미펜/레트로졸 배란유도와 함께 자궁내수정(IUI)을 3~4주기 우선 시도합니다.', '기대요법보다 주기당 임신율을 유의하게 향상시키는 1차 표준 치료입니다.'),
    (r'(클로미펜|Clomiphene|Letrozole)', '배란 장애(PCOS) 또는 원인불명 난임의 1차 표준 배란유도 경구 약제입니다.', '원인불명 난임에서 3~4주기 이상 실패 시 다음 단계인 성선자극호르몬 주사 또는 체외수정(IVF)으로 전환합니다.'),
    (r'(기대요법.*성공\s*확률|Expectant)', '원인불명 난임 부부의 기대요법 시 주기당 임신율은 약 1~3%에 불과하여 정상 가임기 부부(20~25%)보다 현저히 낮습니다.', '치료 없이 관찰할 경우 임신 성공률이 매우 낮습니다.'),
    (r'(Postcoital|성교후)', '성교후검사(PCT)는 주관성이 크고 임신 예측력이 떨어져 현재 불임 기본 검사 지침에서 제외되었습니다.', '현재 난임 진료 가이드라인상 권장되지 않는 과거 검사법입니다.'),
    (r'(Endometrial\s*biopsy|자궁내막\s*조직연대)', '황체기 결함 진단을 위한 자궁내막 조직연대측정은 임상적 유용성이 입증되지 않아 현재 루틴 검사로 권장되지 않습니다.', '침습적인 검사로 현재 난임 표준 가이드라인에서 권고하지 않습니다.'),
    (r'(마그네슘|황산마그네슘|MgSO4)', '중증 자간전증 환자에서 자간증(경련 발작) 예방 및 치료를 위한 표준 신경보호/항경련 약제입니다.', '신부전 환자에서는 마그네슘 중독 위험이 있으므로 슬개건 반사 및 호흡수를 철저히 감시해야 합니다.'),
    
    # Surgery - Breast & General
    (r'(미세석회화)', '미세석회화(Microcalcification) 검출은 유방촬영술(Mammography)의 독보적 장점이며, 유방초음파는 미세석회화 발견에 매우 취약합니다 (장점이 아닌 한계점).', '유방촬영술의 핵심 장점으로, 초음파의 장점이 아닙니다.'),
    (r'(낭종을\s*확인)', '유방초음파는 단순 낭종(Simple cyst)과 고형 종괴(Solid mass)를 명확히 감별하는 표준 검사법입니다.', '초음파가 방사선 촬영술보다 낭종성 병변 감별에 훨씬 우수합니다.'),
    (r'(방사선\s*노출이\s*없다|임산부에게\s*안전)', '초음파는 방사선 피폭이 없는 비침습적 음파 검사로 가임기 및 임산부에게 매우 안전합니다.', '방사선 촬영술과 달리 피폭 위험이 없습니다.'),
    
    # Pediatrics
    (r'(뇌척수액\s*검사|CSF|요추천자)', '수족구병 또는 발열 환아에서 뇌염, 무균성 뇌수막염 등 중추신경계 침범 합병증을 확진하기 위한 필수 침습 검사입니다.', '뇌압 상승 소견(유두부종, 뇌탈출 징후) 동반 시에는 뇌 CT 선행 없이 요추천자를 시행하지 않습니다.'),
    (r'(IVIG|면역글로불린)', '가와사키병 환아에서 관상동맥류 발생 합병증을 예방하기 위한 발병 10일 이내 표준 1차 치료제(아스피린 병용)입니다.', '일반적인 바이러스성 단순 발진 질환에서는 투여 적응증이 아닙니다.'),
    (r'(생백신|MMR|수두|BCG)', '면역 결핍 환아, 고용량 스테로이드 복용자 또는 면역억제제 투여 환자에게는 백신 균주 증식 위험으로 접종이 금기입니다.', '생후 적절한 연령 및 면역 상태가 확인된 표준 일정에 따라 접종해야 합니다.'),
    
    # Neurology
    (r'(Caloric\s*test|온수안뜰검사|온도안뜰검사)', '의식 저하 또는 심인성 발작 환자에서 뇌간 전정안구반사(VOR) 보존 여부를 객관적으로 입증하는 표준 전정기능 검사입니다 (COWS 법칙).', '고막 천공이 있는 환자에서는 온수 주입이 금기이므로 공기 안뜰검사 등을 대체 시행해야 합니다.'),
    (r'(혈전용해제|tPA|Alteplase)', '급성 허혈성 뇌졸중 발생 4.5시간 이내 환자에서 뇌혈류 재개통을 위한 1차 표준 혈전용해 요법입니다.', '뇌출혈 병력, 최근 대수술, 혈소판 감소증 등 출혈 위험 인자가 있는 환자에서는 투여가 금기입니다.'),
    
    # Psychiatry
    (r'(Amitriptyline|TCA|삼환계)', '강력한 항콜린성 부작용을 지닌 약물로, 노인 섬망(Delirium) 환자에서 증상을 급격히 악화시킬 수 있어 즉시 중단해야 하는 원인 약제입니다.', '노인 환자의 우울증 치료 시에도 항콜린성 부작용 위험으로 1차 선택 약제로 권고되지 않습니다.'),
    (r'(Lorazepam|로라제팜|Benzodiazepine)', '알코올/진정제 금단 섬망의 1차 치료제이나, 일반 노인 섬망에서는 의식 혼탁 및 섬망을 오히려 악화시킬 수 있어 주의가 필요합니다.', '알코올 금단성 섬망(DT) 상황이 아니라면 비약물적 환경 중재 및 필요 시 저용량 비정형 항정신병제가 선호됩니다.'),
    (r'(SSRI|Fluoxetine|Escitalopram)', '주요우울장애 및 불안장애의 1차 표준 치료제이나, 투여 초기 불안/초조 등 활성화 증후군(Activation syndrome)이 일시적으로 나타날 수 있습니다.', '초기 불면이나 초조 발생 시 용량을 감량하거나 단기간 보조적 항불안제를 병용할 수 있습니다.'),
    
    # Orthopedics
    (r'(오구쇄골인대|CC\s*인대)', '견봉쇄골관절(AC 관절) Rockwood III형 이상 중증 탈구에서 수직 안정성을 담당하며 파열 시 쇄골 원위부의 완전 전위를 유발하는 핵심 인대입니다.', '경미한 염좌(I형)에서는 견봉쇄골인대만 부분 손상되고 오구쇄골인대는 온전하게 유지됩니다.'),
    (r'(요골신경|Radial\s*nerve|손목\s*신전)', '상완골 간부 골절(Holstein-Lewis 골절) 시 요골신경구 주행 부위 손상으로 전형적인 손목하수(Wrist drop) 및 손목/수지 신전 불능이 발생합니다.', '정중신경이나 척골신경 손상 시에는 손목 신전이 보존되고 수지 굴곡 또는 내재근 마비가 발생합니다.'),
    (r'(전방십자인대|ACL)', '무릎의 회전 및 전방 전위 안정성을 담당하는 핵심 인대로, Lachman 검사 및 Pivot shift 검사 양성이 특징적입니다.', '후방 전위 손상이나 외측 안정성은 PCL 및 LCL 복합체가 담당합니다.'),
    
    # Radiology / Lab Med
    (r'(소엽간\s*중격|interlobular\s*septum)', '2차 폐소엽(Secondary pulmonary lobule)의 외곽 경계를 형성하며, 폐부종이나 림프관염성 암종증 시 비후되어 Kerley B line으로 관찰됩니다.', '소엽 중심부에는 소엽중심 세동맥 및 세기관지가 주행하며 중격과는 해부학적 위치가 다릅니다.'),
    (r'(IIF|간접면역형광법)', '세포나 조직 절편 기질을 슬라이드에 부착하여 환자 혈청 자가항체의 결합 형광 패턴(ANA, AMA, ANCA 등)을 판독하는 특수 검사입니다.', '세포 형태 기질이 필요 없는 가용성 인자나 인지질 항체(aCL, RF)는 ELISA 또는 비탁법으로 측정하므로 IIF 대상이 아닙니다.'),
    (r'(ELISA|효소면역측정법)', '고체상에 코팅된 항원/항체를 이용해 혈청 내 미량의 단백질, 펩타이드, 인지질 항체(aCL 등)를 정량 측정하는 표준 방법입니다.', '세포 내 특이 항원 분포 패턴이나 세포막 형광 염색 양상을 시각화하는 검사가 아닙니다.')
]

def match_special_rule(text):
    for pattern, correct_desc, wrong_desc in SPECIAL_OPTION_RULES:
        if re.search(pattern, text, re.IGNORECASE):
            return correct_desc, wrong_desc
    return None, None

# -------------------------------------------------------------
# 4. Core Generator for a Single Question
# -------------------------------------------------------------
def enrich_single_question(q, crop_map, year_map, surgery_extra_map):
    options = q.get('options', [])
    subject = q.get('subject', '임상')
    year = q.get('year', '26Y')
    q_num = int(q.get('q_num') or 1)
    crop_key = f"{subject}_{year}_Q{q_num:02d}.png"
    year_key = f"{subject}_{year}_Q{q_num:02d}"
    yq_simple = f"{year}-{q_num:02d}"

    # Match Theme
    theme = crop_map.get(crop_key) or year_map.get(year_key)
    
    # Check surgery extra
    surg_extra = surgery_extra_map.get(yq_simple) or surgery_extra_map.get(f"{year}_Q{q_num:02d}")

    theme_title = q.get('theme_title') or (theme.get('title') if theme else f"{subject} 임상 기출 분석")
    subspecialty = q.get('subspecialty') or (theme.get('subspecialty') if theme else f"{subject} 일반")

    # Correct indices resolution
    correct_indices = q.get('correct_option_indices')
    if correct_indices is None and q.get('correct_option_index') is not None:
        correct_indices = [q['correct_option_index']]
    elif correct_indices is None:
        correct_indices = [0]
    correct_set = set(correct_indices)

    # Special cleanup: 산부인과_26Y_Q01 where lab results were placed into options
    if q.get('id') == '산부인과_26Y_Q01' and len(options) == 8 and options[0].startswith('-혈액'):
        lab_lines = options[:3]
        options = options[3:]
        q['options'] = options
        q['stem'] = q.get('stem', '') + "\n\n[검사 소견]\n" + "\n".join(lab_lines)
        q['correct_option_index'] = 2
        q['correct_option_indices'] = [2]
        q['correct_answer'] = options[2]
        correct_indices = [2]
        correct_set = {2}

    # Explanation text components
    exp = q.get('explanation', {})
    findings = str(exp.get('findings', ''))
    differential = str(exp.get('differential', ''))
    trap = str(exp.get('trap', ''))
    trigger = str(exp.get('trigger', ''))
    kmle_theory = str(theme.get('kmle_theory', '') if theme else '')
    kmle_question = str(theme.get('kmle_question', '') if theme else '')
    theme_exp = str(theme.get('explanation', '') if theme else '')

    combined_notes = findings + "\n" + differential + "\n" + trap + "\n" + kmle_theory + "\n" + kmle_question + "\n" + theme_exp
    core_finding = extract_core_finding(findings)

    # If question has NO options (Short-answer / Image-only)
    if not options:
        q['option_explanations'] = []
        if 'option_explanations' not in exp:
            exp['option_explanations'] = []
        # Clean generic placeholder in differential if present
        if '선지별 감별' in differential or '숙지하십시오' in differential or '비교 평가하십시오' in differential:
            cleaned_diff = kmle_theory if kmle_theory else f"【{theme_title} 핵심 판독 가이드라인】\n• 본 증례는 {subspecialty} 핵심 임상 기준에 따라 전형적 영상/검사 소견 및 진단 지표를 정확히 판별하는 것이 핵심입니다."
            exp['differential'] = cleaned_diff
        return q

    # Build Option Explanations
    option_explanations = []

    # Check if surgery extra has detailed option breakdown
    surg_opt_exps = {}
    if surg_extra and surg_extra.get('summary'):
        summary_text = surg_extra['summary']
        # Extract lines like "- ① ... : ..."
        lines = summary_text.split('\n')
        for l in lines:
            m_s = re.search(r'[\-\•]?\s*([①②③④⑤⑥⑦⑧]|\d+[\.\)])\s*([^:\(\)]+)(?:\([^\)]+\))?\s*:\s*(.+)', l)
            if m_s:
                surg_opt_exps[m_s.group(1).strip()] = m_s.group(3).strip()

    for idx, opt_raw in enumerate(options):
        opt_num = extract_option_num(opt_raw, idx)
        opt_clean = clean_option_text(opt_raw)
        is_correct = idx in correct_set

        # Check placeholder distractor
        if not opt_clean or opt_clean in ['그 외 관련없는 선지', '기타 선지', '관련없는 선지', '그 외 선지']:
            option_explanations.append({
                'opt_idx': idx,
                'opt_num': opt_num,
                'text': opt_clean or '기타 선지',
                'is_correct': False,
                'tag': '오답 감별',
                'reason': '시험 복원 과정에서 수록된 기타 비특이적 오답 선지입니다 (임상적 관련성 없음).'
            })
            continue

        rule_corr, rule_wrong = match_special_rule(opt_clean)
        
        # Check direct mention in surgery extra
        surg_reason = surg_opt_exps.get(opt_num)

        # Check direct regex match in combined notes
        escaped_opt = re.escape(opt_clean[:12]) if len(opt_clean) >= 4 else re.escape(opt_clean)
        pattern = rf'(?:[①②③④⑤⑥⑦⑧]|\-|\•)?\s*{escaped_opt}[^\:\n\(\)]*[\:\)]\s*([^\n\•]+)'
        match = re.search(pattern, combined_notes)
        direct_match = match.group(1).strip() if (match and len(match.group(1).strip()) >= 12) else None

        if is_correct:
            tag = '정답'
            if surg_reason:
                reason = surg_reason
            elif direct_match:
                reason = direct_match
            elif rule_corr:
                reason = f"[{theme_title}] {rule_corr}"
            elif trigger and '즉시 정답 도출' not in trigger:
                reason = f"{trigger}. {core_finding}" if core_finding else trigger
            elif core_finding:
                reason = f"[{theme_title}] 제시된 증례 소견 및 가이드라인에 부합하는 1차 표준 치료/확진 소견입니다. ({core_finding})"
            else:
                reason = f"[{theme_title}] 환자의 병력, 신체 진찰 및 검사 소견에 부합하는 정답입니다."
        else:
            tag = '오답 감별'
            if surg_reason:
                reason = surg_reason
            elif direct_match:
                reason = direct_match
            elif rule_wrong:
                reason = rule_wrong
            else:
                # Differential text line search
                diff_line = ""
                for line in differential.split('\n') + kmle_theory.split('\n'):
                    if opt_clean[:8] in line and len(line.strip()) > 10:
                        diff_line = re.sub(r'^[•\-\d\.\s]+', '', line).strip()
                        break

                if diff_line:
                    reason = f"감별 질환/치료 특성: {diff_line}. 본 증례 환자의 소견과는 일치하지 않아 배제됩니다."
                elif '수술' in opt_clean and ('약물' in theme_title or '보존' in findings):
                    reason = "비침습적 보존 요법 및 약물 투여가 우선되는 임상 단계로, 침습적 수술은 1차 선택으로 부적절합니다."
                elif any(w in opt_clean for w in ['스테로이드', '항생제', '약물', '수액']) and '수술' in theme_title:
                    reason = "단순 보존적 약물 요법만으로는 근본적 병변을 해결할 수 없으며, 외과적 절제 또는 중재적 개통술이 요구됩니다."
                elif any(w in opt_clean for w in ['절제술', '개복술', '우회술']) and any(w in theme_title for w in ['약물', '보존', '감시']):
                    reason = "외과적 수술의 적응증에 해당하지 않으며, 보존적 관리 또는 덜 침습적인 치료가 표준입니다."
                elif '정상' in opt_clean:
                    reason = "환자에서 확인되는 비정상적 병적 수치 및 신체 진찰 소견과 상반되는 설명입니다."
                elif any(w in opt_clean for w in ['파열', '골절', '탈구', '염좌']) and any(w in theme_title for w in ['파열', '골절', '탈구', '염좌']):
                    reason = f"본 손상 기전 및 영상 소견은 [{theme_title}]에 부합하며, {opt_clean}의 손상 위치 및 임상 징후와는 상이합니다."
                else:
                    reason = f"본 증례에서 제시된 임상 징후 및 검사 지표와 부합하지 않으며, {opt_clean}에 합당한 특징적 소견이 결여되어 오답입니다."

        # Polish text formatting
        reason = re.sub(r'\s+', ' ', reason).strip()
        reason = re.sub(r'\.\.+', '.', reason)

        option_explanations.append({
            'opt_idx': idx,
            'opt_num': opt_num,
            'text': opt_clean,
            'is_correct': is_correct,
            'tag': tag,
            'reason': reason
        })

    # Save to question object
    q['option_explanations'] = option_explanations
    exp['option_explanations'] = option_explanations

    # Format new differential text
    diff_bullets = []
    for item in option_explanations:
        marker = "✓ [정답]" if item['is_correct'] else "✗ [오답]"
        diff_bullets.append(f"• {item['opt_num']} {item['text']} {marker}: {item['reason']}")

    diff_body = "\n".join(diff_bullets)

    # General clinical guideline note
    general_note = kmle_theory.strip() if kmle_theory else (differential.strip() if '선지별 감별' not in differential else '')
    if general_note and len(general_note) > 15:
        exp['differential_general'] = general_note
        exp['differential'] = diff_body + "\n\n【핵심 감별 및 임상 가이드라인】\n" + general_note
    else:
        exp['differential'] = diff_body

    q['explanation'] = exp
    return q

# -------------------------------------------------------------
# 5. Main Execution Function
# -------------------------------------------------------------
def main():
    print("=== STARTING CLINICAL OPTION EXPLANATION GENERATOR ===")
    themes_by_sub, crop_map, year_map, surgery_extra_map = load_all_subject_themes()
    print(f"Loaded themes across {len(themes_by_sub)} subjects.")
    print(f"Total mapped crops: {len(crop_map)}, mapped years: {len(year_map)}, surgery extra: {len(surgery_extra_map)}")

    # Load quiz_all_subjects.json
    all_path = os.path.join(DATA_DIR, "quiz_all_subjects.json")
    with open(all_path, 'r', encoding='utf-8') as f:
        all_questions = json.load(f)
    print(f"\nLoaded quiz_all_subjects.json: {len(all_questions)} questions.")

    # Process all questions
    enriched_questions = []
    count_enriched_opts = 0
    count_short_ans = 0

    for q in all_questions:
        q_enriched = enrich_single_question(q, crop_map, year_map, surgery_extra_map)
        enriched_questions.append(q_enriched)
        if q_enriched.get('options') and len(q_enriched['options']) > 0:
            count_enriched_opts += 1
        else:
            count_short_ans += 1

    print(f"Processed {len(enriched_questions)} questions:")
    print(f"  • Enriched with structured option explanations: {count_enriched_opts} questions")
    print(f"  • Handled short-answer / image-only questions: {count_short_ans} questions")

    # 1. Save data/quiz_all_subjects.json
    with open(all_path, 'w', encoding='utf-8') as f:
        json.dump(enriched_questions, f, ensure_ascii=False, indent=2)
    print(f"\nSaved {all_path} ({os.path.getsize(all_path) / (1024*1024):.2f} MB)")

    # 2. Save data/quiz_data.js (window.QUIZ_DATA = [...])
    js_path = os.path.join(DATA_DIR, "quiz_data.js")
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write("/**\n * KMLE ALL SUBJECTS QUIZ BANK DATA (WITH OPTION-BY-OPTION EXPLANATIONS)\n */\n")
        f.write("window.QUIZ_DATA = ")
        json.dump(enriched_questions, f, ensure_ascii=False)
        f.write(";\n")
    print(f"Saved {js_path} ({os.path.getsize(js_path) / (1024*1024):.2f} MB)")

    # 3. Save data/quiz_lab_med.json (filtered for 진단검사의학과)
    lab_med_path = os.path.join(DATA_DIR, "quiz_lab_med.json")
    lab_med_qs = [q for q in enriched_questions if q.get('subject') == '진단검사의학과']
    with open(lab_med_path, 'w', encoding='utf-8') as f:
        json.dump(lab_med_qs, f, ensure_ascii=False, indent=2)
    print(f"Saved {lab_med_path} ({len(lab_med_qs)} questions, {os.path.getsize(lab_med_path) / (1024*1024):.2f} MB)")

    # 4. Also sync to quiz_bank/data if exists
    qb_dir = os.path.join(ROOT_DIR, "quiz_bank", "data")
    if os.path.exists(qb_dir):
        qb_all = os.path.join(qb_dir, "quiz_all_subjects.json")
        with open(qb_all, 'w', encoding='utf-8') as f:
            json.dump(enriched_questions, f, ensure_ascii=False, indent=2)
        qb_js = os.path.join(qb_dir, "quiz_data.js")
        with open(qb_js, 'w', encoding='utf-8') as f:
            f.write("window.QUIZ_DATA = ")
            json.dump(enriched_questions, f, ensure_ascii=False)
            f.write(";\n")
        print(f"Synced to {qb_dir}")

    print("\n=== SUCCESS: ALL QUESTIONS FULLY ENRICHED WITH OPTION EXPLANATIONS ===")

if __name__ == '__main__':
    main()
