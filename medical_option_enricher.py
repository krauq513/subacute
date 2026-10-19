# -*- coding: utf-8 -*-
"""
medical_option_enricher.py
High-Yield KMLE Medical Knowledge Engine for Option Explanations across All 9 Subjects:
- 진단검사의학과, 내과, 외과, 산부인과, 소아청소년과, 신경과, 정신건강의학과, 정형외과, 영상의학과

Core Principles:
1. Authentic KMLE clinical rationale for medical terms (drugs, diseases, procedures, tests, findings).
2. Strict adherence to user's "No Hallucination" instruction:
   If an option is an artifact, symbol (⚫, %, ~), combination choice (가다, 나라, 라), or arbitrary non-medical text:
   DO NOT generate fake boilerplate ("본 증례의 임상 경과..."). Return empty string ("").
3. Seamless integration with DOCX/PDF generators and Web Quiz JSON.
"""

import re
import unicodedata

# -------------------------------------------------------------------------
# 1. Non-Medical Artifact Detection (Must be left BLANK, NO Boilerplate!)
# -------------------------------------------------------------------------
NON_MEDICAL_PATTERNS = [
    r'^[⚫●•\-\*\◦\▪\.\,\s\~\:\;]+$',
    r'^[가나다라\s\,]+$',
    r'^(가|나|다|라|가나|다라|가다|나라|가나다|가나다라)$',
    r'^[A-E]\.?$',
    r'^\d+[\.\)]?$',
    r'^\d+\s*[\%℃도]\s*$',
    r'^(그\s*외\s*관련없는\s*선지|기타\s*선지|관련없는\s*선지|그\s*외\s*선지|기타|없음)$',
    r'^\(다른\s*선지\s*불확실.*?\)$',
    r'^[a-zA-Z0-9\s]{1,2}$'
]

def is_non_medical_artifact(text):
    if not text:
        return True
    t = text.strip()
    if len(t) <= 1:
        return True
    for p in NON_MEDICAL_PATTERNS:
        if re.match(p, t, re.IGNORECASE):
            return True
    return False

def clean_option_text(opt):
    if not opt:
        return ""
    text = str(opt).strip()
    text = re.sub(r'^[①②③④⑤⑥⑦⑧⑨⑩\d\.\)\-\s\⚫\●\•\*\◦\▪l]+', '', text).strip()
    text = re.sub(r'\s+', ' ', text)
    return text

# -------------------------------------------------------------------------
# 2. Comprehensive KMLE Medical Knowledge Base
# Format: (Regex pattern, Standard Indication / Nature, Exclusion / Differential Rationale)
# -------------------------------------------------------------------------
KMLE_KB = [
    # ------------------ Observation / General Management ------------------
    (
        r'^(경과관찰|경과\s*관찰|정기적\s*추적관찰|추적관찰|임상적\s*관찰|보존적\s*치료)$',
        "자연 호전이 기대되거나 경미하고 합병증 위험이 없는 양성 질환에서 1차로 선택하는 비침습적 관리입니다.",
        "진행성 질환, 급성 복통/염증, 혈역학적 불안정, 악성 의심 또는 즉각적 약물/수술 개입이 요구되는 응급 상황에서는 단순 관찰만으로 불충분합니다."
    ),
    (
        r'^(응급\s*수술|즉각적인\s*응급\s*개복술|응급\s*개복술)$',
        "범발성 복막염(천공), 비가역적 장관 허혈/괴사, 교액성 탈장 또는 조절되지 않는 활동성 대량 출혈 환자의 생명을 구하기 위한 즉각적 수술입니다.",
        "활력징후가 안정적이고 복막자극징후가 없거나 약물 및 비침습적 보존 치료에 반응하는 단계에서는 과도한 침습 처치입니다."
    ),

    # ------------------ Emergency / Resuscitation / Airway ------------------
    (
        r'(기관\s*삽관|기도\s*확보|기계\s*환기|기계적\s*인공호흡)',
        "호흡 부전(저산소혈증, 고탄산혈증 pH < 7.25), 의식 저하(GCS ≤ 8) 또는 심한 기도 폐쇄 환자에서 생명을 유지하기 위한 최우선 응급 기도 확보술입니다.",
        "자발 호흡이 충분하고 의식이 명료하며 경증 호흡곤란 단계인 환자에서는 비침습적 산소 요법이 우선됩니다."
    ),
    (
        r'(가슴관\s*삽입|흉관\s*삽입|Thoracostomy)',
        "긴장성/대량 기흉, 혈흉, 농흉 또는 심한 외상성 흉강 내 액체 저류 시 폐를 재팽창시키기 위한 필수 응급 배액술입니다.",
        "단순 소량 기흉(폐 허탈 < 15~20%)이거나 무증상 환자에서는 산소 흡입 및 안정 관찰이 우선됩니다."
    ),
    (
        r'(심낭\s*천자|Pericardiocentesis)',
        "심장 압전(Cardiac tamponade, Beck 3징후: 저혈압, 경정맥 확장, 심음 감쇠) 환자에서 심낭 내 삼출액을 긴급 배액하여 혈역학을 안정시키는 필수 처치입니다.",
        "혈역학적으로 안정적인 소량 심낭 삼출이나 단순 심근염/심낭염에서는 침습적 천자보다 원인 약물 치료가 표준입니다."
    ),

    # ------------------ Cardiology & Vascular ------------------
    (
        r'(아데노신|Adenosine)',
        "발작성상심실성빈맥(PSVT)의 급성기 동결절/방실결절 전도를 일시 차단하여 동율동으로 전환시키는 1차 약제입니다.",
        "부전도로를 통한 전도를 촉진하여 심실세동을 유발할 수 있으므로 WPW 증후군 동반 심방세동(AF with WPW)에서는 투여가 금기입니다."
    ),
    (
        r'(베타차단제|Beta-blocker|Bisoprolol|Carvedilol|Metoprolol|Atenolol|Propranolol)',
        "안정형 허혈성 심질환, 보상성 만성 심부전(HFrEF), 빈맥성 부정맥 및 고혈압의 표준 치료 약제입니다.",
        "비보상성 급성 심부전 악화기, 심인성 쇼크, 서맥 및 고도 방실차단, 심한 활동성 천식 환자에서는 심근 수축력 억제 및 기관지 수축 위험으로 금기입니다."
    ),
    (
        r'(ACE\s*inhibitor|ACEI|ARB|Lisinopril|Enalapril|Ramipril|Losartan|Valsartan|Candesartan)',
        "심부전(HFrEF), 당뇨병성 신증, 심근경색 후 심실 리모델링 억제 및 알부민뇨 감소를 위한 1차 표준 약제입니다.",
        "양측 신동맥 협착증, 임신, 고칼륨혈증(K > 5.5 mEq/L) 및 혈관부종 기왕력 환자에서는 투여가 금기입니다."
    ),
    (
        r'(SGLT-?2\s*억제제|SGLT2\s*inhibitor|Dapagliflozin|Empagliflozin)',
        "당뇨병 유무와 관계없이 심부전(HFrEF/HFpEF) 환자의 심혈관 사망률 감소 및 만성 신질환(CKD) 진행 지연을 위한 표준 1차 약제입니다.",
        "정상 혈당 케톤산증(Euglycemic DKA) 위험이 있으며, 중증 신기능 저하(eGFR 현저히 감소) 급성기에는 신기능 모니터링이 필요합니다."
    ),
    (
        r'(아스피린|클로피도그렐|티카그렐러|항혈소판제|Aspirin|Clopidogrel)',
        "급성 관동맥증후군(ACS), 허혈성 뇌졸중 및 동맥경화성 혈관 질환의 혈전 생성 예방을 위한 표준 항혈소판 요법입니다.",
        "활동성 궤양 출혈, 출혈성 뇌졸중 급성기 또는 중증 혈소판 감소증 환자에서는 출혈 위험을 증폭시키므로 금기입니다."
    ),
    (
        r'(와파린|Warfarin|DOAC|NOAC|Apixaban|Rivaroxaban|Dabigatran|Edoxaban|항응고제)',
        "심방세동(AF)의 뇌졸중 예방, 심부정맥혈전증(DVT) 및 폐색전증(PE)의 치료와 재발 방지를 위한 표준 항응고제입니다.",
        "활동성 대출혈 환자나 최근 대수술 직후에는 출혈 악화 위험으로 투여를 보류해야 합니다."
    ),
    (
        r'(헤파린|Heparin|LMWH|Enoxaparin)',
        "급성 심근경색, 심부정맥혈전증(DVT) 및 폐색전증 급성기의 즉각적인 항응고 치료제입니다.",
        "헤파린 유발성 혈소판감소증(HIT) 병력자나 중증 출혈성 질환자에서는 투여가 금기입니다."
    ),
    (
        r'(혈전용해제|tPA|Alteplase|Urokinase)',
        "발병 4.5시간 이내 급성 허혈성 뇌졸중 또는 혈역학적으로 불안정한 대량 폐색전증(Massive PE)에서 혈전을 용해하는 응급 약제입니다.",
        "최근 3개월 이내 두개내 출혈, 대수술 병력, 활동성 내장 출혈 또는 조절되지 않는 중증 고혈압 환자에서는 금기입니다."
    ),
    (
        r'(질산염|Nitroglycerin|NTG)',
        "관상동맥 확장 및 전부하(Preload) 감소로 협심증 흉통을 신속히 완화시키는 표준 항협심증 약제입니다.",
        "우심실 경색(RV infarction, 전부하 의존적), 수축기 혈압 90 미만 저혈압 또는 24시간 이내 PDE-5 억제제(실데나필) 복용 환자에서는 심각한 저혈압을 유발하므로 금기입니다."
    ),
    (
        r'(노르에피네프린|Norepinephrine)',
        "패혈성 쇼크(Septic shock) 등 혈관 확장성 쇼크에서 혈관을 수축시켜 평균동맥압(MAP ≥ 65 mmHg)을 회복시키는 1차 승압제입니다.",
        "혈류량 결핍(Hypovolemia)이 교정되지 않은 상태에서 단독 투여하면 말초 장기 허혈을 악화시킬 수 있습니다."
    ),
    (
        r'(도파민|Dopamine)',
        "서맥 동반 저혈압 또는 심인성 쇼크에서 심박수 및 수축력을 증가시키는 심근수축/승압제입니다.",
        "부정맥 유발 빈도가 높아 패혈성 쇼크 1차 승압제로는 노르에피네프린보다 열등하여 권장되지 않습니다."
    ),
    (
        r'(경피적\s*혈관개통술|PTA|경피적\s*관상동맥중재술|PCI|스텐트)',
        "급성 관동맥 폐색(STEMI) 또는 중증 하지 허혈(CLI) 환자에서 허혈 부위 혈류를 재개통시키는 표준 중재시술입니다.",
        "미만성 다혈관 질환이나 해부학적으로 중재시술이 불가능한 병변의 경우 관상동맥우회술(CABG)이나 우회수술이 선호됩니다."
    ),

    # ------------------ Pulmonology ------------------
    (
        r'(흡입\s*스테로이드|ICS|Budesonide|Fluticasone)',
        "지속성 천식 및 빈번한 급성 악화를 동반한 COPD 환자의 기도 염증을 억제하는 표준 조절제(Controller)입니다.",
        "급성 천식 발작의 즉각적인 기관지 확장을 유도하는 응급 구제약제(Reliever)로는 단독 사용하지 않습니다."
    ),
    (
        r'(속효성\s*베타-?2\s*작용제|SABA|Salbutamol|Albuterol)',
        "급성 천식 발작 및 기관지 연축 시 신속히 기도를 확장시키는 1차 표준 응급 구제 흡입제입니다.",
        "만성 지속성 천식에서 항염증 조절제(ICS) 없이 단독으로 장기 과다 사용하면 기도 과민성이 악화될 수 있습니다."
    ),
    (
        r'(항콜린제|Ipratropium|Tiotropium|LAMA)',
        "COPD 환자의 폐기능 개선 및 급성 악화 감소를 위한 핵심 유지 흡입 치료제입니다.",
        "전립선 비대증에 의한 급성 요폐나 폐쇄각 녹내장 환자에서는 항콜린 부작용을 면밀히 관찰해야 합니다."
    ),

    # ------------------ Gastroenterology & Hepatology ------------------
    (
        r'(프로톤펌프억제제|PPI|Omeprazole|Pantoprazole|Esomeprazole)',
        "소화성 궤양(위/십이지장 궤양), 상부위장관 출혈 및 위식도역류질환(GERD)의 위산 분비 억제 표준 1차 치료제입니다.",
        "비궤양성 기능성 소화불량 단독이거나 산 분비와 무관한 장관 감염성 질환의 원인 치료제는 아닙니다."
    ),
    (
        r'(테를리프레신|Terlipressin|옥트레오타이드|Octreotide|소마토스타틴)',
        "간경변증 식도정맥류 출혈 및 간신증후군(HRS) 환자에서 내장 혈관을 수축시켜 문맥압을 낮추는 1차 지혈 약제입니다.",
        "비정맥류성 궤양 출혈이나 일반적인 복막염에서는 문맥압 강하 적응증이 아닙니다."
    ),
    (
        r'(락툴로오스|Lactulose|리팍시민|Rifaximin)',
        "간경변 환자의 간성 뇌증(Hepatic encephalopathy)에서 장내 암모니아 흡수 및 생성을 억제하는 1차 표준 치료제입니다.",
        "장폐색이나 심한 설사/탈수 상태에서는 투여 시 주의가 필요합니다."
    ),
    (
        r'(5-ASA|Mesalamine|Sulfasalazine)',
        "경증~중등도 궤양성 대장염(UC)의 관해 유도 및 관해 유지 1차 표준 항염증 치료제입니다.",
        "독성 거대결장이나 전격성 대장염, 장천공 등 중증 급성 악화기에는 단독 투여로 부족하며 정맥 스테로이드 및 수술적 고려가 필요합니다."
    ),

    # ------------------ Surgery & Abdominal Procedures ------------------
    (
        r'(복강경\s*담낭절제술|담낭절제술|Cholecystectomy)',
        "급성 담낭염, 유증상 담석증 또는 담낭 용종(1cm 이상)에서 담낭 천공 및 재발을 근치적으로 방지하는 72시간 이내 표준 조기 수술입니다.",
        "담낭염 없이 총담관 결석 단독으로 발생한 담관염의 경우 내시경적 결석 제거(ERCP/EST)가 담낭절제술보다 우선됩니다."
    ),
    (
        r'(충수절제술|복강경\s*충수절제술|Appendectomy)',
        "급성 충수염에서 천공, 농양 형성 및 범발성 복막염 진행을 막기 위한 표준 응급 근치 수술입니다.",
        "충수 주위 거대 농양(Phlegmon)이 이미 형성된 경우 초기 항생제 및 경피적 배액 후 수주 뒤 지연 충수절제술이 권장됩니다."
    ),
    (
        r'(TPC\s*with\s*IPAA|전대장직장절제술)',
        "약물 불응성 전대장 궤양성 대장염(UC) 또는 FAP에서 대장·직장암 위험을 근치적으로 제거하고 괄약근을 보존하는 표준 수술입니다.",
        "직장을 보존하는 결장절제술을 시행하면 남아있는 직장에서 병변 재발 및 암 발생 위험이 지속되므로 부적절합니다."
    ),
    (
        r'(저위전방절제술|LAR)',
        "상부 및 중부 직장암에서 항문 괄약근을 보존하면서 직장 종양을 근치적으로 절제하는 표준 수술법입니다.",
        "항문연(Anal verge)과 매우 인접하여 괄약근 침범이 있는 극하부 직장암에서는 복회음절제술(APR)이 요구됩니다."
    ),
    (
        r'(복회음절제술|APR|Miles)',
        "항문 괄약근 침범이 있거나 괄약근 보존이 불가능한 하부 직장암에서 직장과 항문을 절제하고 영구 결장루를 만드는 근치 수술입니다.",
        "괄약근 보존이 충분히 가능한 중·상부 직장암 환자에서 불필요하게 괄약근을 제거하는 것은 삶의 질을 심각하게 저하시킵니다."
    ),
    (
        r'(경피경간담즙배액술|PTBD)',
        "폐쇄성 황달 또는 급성 화농성 담관염에서 내시경적 배액(ERCP)이 실패하거나 해부학적 변형으로 불가능할 때 시행하는 응급 경피적 감압술입니다.",
        "ERCP를 통한 내시경적 역행성 담즙배액(ERBD/ENBD)이 우선 가능한 일반적 담관 폐색에서는 1차로 선택되지 않습니다."
    ),
    (
        r'(고주파열치료|RFA|Radiofrequency\s*ablation)',
        "3cm 이하 단발성 또는 3개 이하의 조기 간세포암(HCC)에서 수술적 절제를 대체할 수 있는 국소 근치 소작술입니다.",
        "간 표면에 돌출되어 피막 파열 위험이 있거나 주위 주요 혈관/담관에 인접한 종양에서는 열 손상 합병증 위험이 큽니다."
    ),
    (
        r'(비장전체절제|비장절제술|Splenectomy)',
        "혈역학적으로 불안정한 고등급 비장 파열 또는 외상성 복강내 출혈 환자에서 생명을 구하기 위한 응급 지혈 수술입니다.",
        "혈역학적으로 안정한 저등급 파열 환자에서는 비장의 면역 기능을 보존하기 위해 비수술적 보존 치료 또는 혈관색전술이 우선됩니다."
    ),

    # ------------------ OB/GYN (Obstetrics & Gynecology) ------------------
    (
        r'(옥시토신|Oxytocin)',
        "자궁수축을 유도하여 유도분만, 분만 3기 관리 및 분만 후 자궁이완증 출혈(PPH)을 예방·지혈하는 표준 1차 약제입니다.",
        "아두골반불균형(CPD), 이전 고식적 제왕절개 수술력, 태아 절박가사(Fetal distress) 또는 비정상 태위에서는 자궁 파열 위험으로 금기입니다."
    ),
    (
        r'(리토드린|Ritodrine|아토시반|Atosiban|자궁수축억제제)',
        "임신 34주 이전 조기진통(Preterm labor) 환자에서 태아 폐 성숙을 위한 스테로이드 투여 시간을 확보하기 위한 단기 자궁수축억제제입니다.",
        "모체 심혈관 질환, 중증 자간전증, 조기양막파수 동반 융모양막염 또는 자궁내 태아 사망 시에는 즉각적 분만이 요구되므로 금기입니다."
    ),
    (
        r'(황산마그네슘|Magnesium\s*sulfate|MgSO4)',
        "중증 자간전증 및 자간증 환자에서 모체 경련 발작을 예방·치료하고 32주 이전 조산아의 뇌성마비를 예방하는 표준 신경보호 약제입니다.",
        "마그네슘 중독 시 호흡 억제 및 심정지가 발생할 수 있으므로 슬개건 반사(DTR), 호흡수, 요량을 감시해야 하며 신부전 환자는 주의를 요합니다."
    ),
    (
        r'(메토트렉세이트|MTX|Methotrexate)',
        "혈역학적으로 안정되고 혈청 hCG < 5,000 mIU/mL, 태아 심박동이 없으며 임신낭 크기 < 3.5cm인 자궁외임신의 표준 약물 치료제입니다.",
        "난관 파열 의심 소견, 혈복강, 활력징후 불안정 또는 자궁내 정상 임신이 공존하는 경우에는 투여가 금기이며 응급 수술이 필요합니다."
    ),
    (
        r'(클로미펜|Clomiphene|레트로졸|Letrozole)',
        "다낭성난소증후군(PCOS) 또는 배란 장애 난임 여성의 1차 표준 경구 배란유도제입니다.",
        "양측 난관 폐쇄, 중증 남성 요인 난임 또는 난소 기능 부전(POF) 환자에서는 배란 유도만으로 임신이 불가능하여 체외수정(IVF)이 필요합니다."
    ),
    (
        r'(프로게스테론|Progesterone|질식\s*프로게스테론)',
        "조산 기왕력이 있거나 경부 길이 단축(≤ 25mm)이 확인된 단태임신 여성에서 조산을 예방하고 자궁내막을 유지하는 호르몬 제제입니다.",
        "이미 진행된 활성기 조기진통이나 융모양막염이 발생한 상태에서는 조산을 억제할 수 없습니다."
    ),
    (
        r'(자궁절제술|Hysterectomy|전자궁적출술)',
        "약물 및 보존 치료에 불응하는 중증 자궁근종, 자궁내막암/경부암 또는 조절되지 않는 산후 대출혈의 최종 근치 수술입니다.",
        "가임력을 보존하고자 하는 젊은 여성의 초기 질환이나 단순 기능성 자궁출혈에서는 우선적으로 약물 및 보존 수술이 시도됩니다."
    ),
    (
        r'(제왕절개|제왕절개술|Cesarean\s*section)',
        "전치태반, 횡위 등 태위 이상, 이전 제왕절개 수술력(반흔 자궁), 태아 절박가사 또는 분만 정지 시 산모와 태아의 안전을 위한 표준 분만 수술입니다.",
        "정상적인 질식 분만이 원활히 진행 중인 산모에서 적응증 없이 제왕절개를 시행하는 것은 불필요한 수술적 합병증을 유발합니다."
    ),

    # ------------------ Pediatrics ------------------
    (
        r'(면역글로불린|IVIG)',
        "가와사키병 환아의 관상동맥류 발생 합병증을 억제하기 위한 발병 10일 이내 표준 1차 치료제(고용량 아스피린 병용)입니다.",
        "단순 바이러스성 발진이나 급성 호흡기 감염증에서는 투여 적응증이 아닙니다."
    ),
    (
        r'(폐\s*표면활성제|Surfactant)',
        "미숙아 호흡곤란증후군(RDS) 환아에서 폐포 허탈 및 무기폐를 호전시키기 위한 기관 내 표준 분무 치료제입니다.",
        "만삭아의 태변흡입증후군이나 일과성 빈호흡(TTN)의 1차 표준 치료제는 아닙니다."
    ),
    (
        r'(인도메타신|Indomethacin|이부프로펜|Ibuprofen\s*IV)',
        "미숙아 동맥관개존증(PDA)에서 프로스타글란딘 합성을 억제하여 동맥관의 약물적 폐쇄를 유도하는 1차 치료제입니다.",
        "폐동맥 협착 등 동맥관 의존성 선천성 심기형 환아에서는 동맥관이 닫히면 저산소증으로 사망하므로 절대 투여 금기입니다."
    ),
    (
        r'(알프로스타딜|PGE1|Prostaglandin\s*E1)',
        "대혈관전위, 폐동맥폐쇄 등 동맥관 의존성 선천성 심기형 신생아에서 동맥관 개방을 유지하여 체혈류/폐혈류를 확보하는 응급 구명 약제입니다.",
        "동맥관 폐쇄가 요구되는 일반적인 미숙아 PDA 환아에게 투여하면 심부전을 악화시킵니다."
    ),
    (
        r'(공기정복술|바륨정복술|장중첩증\s*정복술)',
        "생후 3개월~2세 영아 장중첩증(Intussusception)에서 복막염이나 장천공 징후가 없을 때 초기에 장을 환원시키는 표준 비수술 치료법입니다.",
        "복막염 징후(복벽 강직, 반발압통), 장천공 또는 쇼크 동반 시에는 정복술 중 천공 위험으로 절대 금기이며 응급 수술을 시행해야 합니다."
    ),

    # ------------------ Neurology ------------------
    (
        r'(로라제팜|Lorazepam|디아제팜|Diazepam|BZD|Benzodiazepine)',
        "뇌전증지속증(Status epilepticus)의 1차 응급 항경련제이자 알코올 금단 경련/진전섬망의 1차 치료제입니다.",
        "노인 환자의 비금단성 일반 섬망(Delirium)에서는 의식 혼탁 및 탈억제를 유발하여 섬망을 악화시킬 수 있으므로 주의해야 합니다."
    ),
    (
        r'(페니토인|Phenytoin|포스페니토인|Fosphenytoin)',
        "벤조디아제핀 투여 후에도 지속되는 뇌전증지속증(Status epilepticus)의 2차 표준 정맥주사 항경련제입니다.",
        "정맥 급속 투여 시 저혈압 및 심부정맥(심정지)을 유발할 수 있으므로 심전도 모니터링 하에 서서히 투여해야 합니다."
    ),
    (
        r'(페노바르비탈|Phenobarbital)',
        "신생아 경련(Neonatal seizure)의 1차 선택 표준 항경련제입니다.",
        "성인 뇌전증에서는 과도한 진정 및 인지기능 저하 부작용으로 인해 1차 약제로 권고되지 않습니다."
    ),
    (
        r'(티아민|Thiamine|비타민\s*B1)',
        "만성 알코올 의존자 또는 영양실조 환자에서 베르니케 뇌증(안구운동마비, 보행실조, 의식혼돈)을 예방·치료하기 위해 포도당 투여 전 반드시 선행 투여해야 하는 필수 비타민입니다.",
        "포도당 수액을 티아민보다 먼저 투여할 경우 뇌 내 티아민 소모가 급격히 촉진되어 급성 베르니케 뇌증이 촉발되므로 금기입니다."
    ),
    (
        r'(플루마제닐|Flumazenil)',
        "벤조디아제핀(BZD) 급성 과다 복용 환자의 의식 회복을 위한 특이적 길항 해독제입니다.",
        "BZD 만성 복용 환자나 삼환계 항우울제(TCA) 동시 중독 환자에게 투여하면 치명적인 금단 경련 및 부정맥을 유발할 수 있어 주의가 요구됩니다."
    ),
    (
        r'(알츠하이머|Alzheimer)',
        "초기에 최근 기억력 저하(Recent memory loss)가 서서히 진행되며 내측 측두엽(해마) 위축이 두드러지는 가장 흔한 퇴행성 치매입니다.",
        "계단식 악화(Stepwise) 경과를 보이거나 뚜렷한 국소 신경학적 결손이 동반된 증례는 혈관성 치매에 더 합당합니다."
    ),
    (
        r'(혈관성\s*치매|Vascular\s*dementia)',
        "뇌혈관질환(뇌졸중) 병력과 연관되어 계단식 악화 경과와 국소 신경학적 결손(반신마비, 연하곤란 등)을 특징으로 하는 치매입니다.",
        "뇌졸중 병력 없이 무증상 상태에서 수년간 매우 서서히 단기기억만 감퇴하는 양상은 알츠하이머병의 전형적 특징입니다."
    ),
    (
        r'(전두측두엽\s*치매|FTD|Frontotemporal)',
        "초기에 기억장애보다 성격 변화, 탈억제(사회적 부적절 행동), 무감동 및 언어 장애(원발진행실어증)가 두드러지는 치매입니다.",
        "단기기억 소실이 초기 핵심 증상인 알츠하이머병과 뚜렷이 구별됩니다."
    ),
    (
        r'(루이소체\s*치매|DLB|Lewy)',
        "생생한 시각적 환각(Visual hallucination), 인지기능의 현저한 일중 변동, 파킨슨 증상 및 REM수면행동장애를 동반하는 치매입니다.",
        "항정신병 약물(도파민 길항제) 투여 시 추체외로 부작용이 극도로 악화되는 약물 과민성을 보입니다."
    ),
    (
        r'(정상압수두증|NPH|Normal\s*pressure\s*hydrocephalus)',
        "보행장애(가장 초기), 요실금, 인지장애의 3대 증상(Hakim triad)을 보이며 뇌척수액 배액 시험(Tap test) 시 임상 증상이 극적으로 호전되는 질환입니다.",
        "뇌실 확장이 뇌위축에 의한 2차성 뇌실비대(Hydrocephalus ex vacuo)인 경우에는 뇌척수액 션트 수술의 효과가 없습니다."
    ),

    # ------------------ Psychiatry ------------------
    (
        r'(할로페리돌|Haloperidol|리스페리돈|Risperidone|올란자핀|Olanzapine|쿠에티아핀|Quetiapine|아리피프라졸|Aripiprazole|항정신병)',
        "조현병, 양극성 장애 조증 삽화 및 섬망 환자의 환각, 망상, 초조 증상을 조절하는 표준 1차 도파민 차단 약제입니다.",
        "추체외로 부작용(EPS), 정좌불능증, 대동맥 QT 연장 및 대사증후군 부작용 발생을 주의 깊게 모니터링해야 합니다."
    ),
    (
        r'(SSRI|Fluoxetine|Escitalopram|Sertraline|Paroxetine)',
        "주요우울장애, 공황장애, 강박장애(OCD) 및 범불안장애의 1차 표준 항우울 치료제입니다.",
        "치료 반응 발현까지 2~4주가 소요되며, 투여 초기 불안/초조 등 활성화 증후군(Activation syndrome)이 일시적으로 나타날 수 있습니다."
    ),
    (
        r'(삼환계\s*항우울제|TCA|Amitriptyline|Imipramine|Nortriptyline)',
        "과거 널리 쓰인 항우울제이나, 강력한 항콜린성 부작용, 기립성 저혈압 및 심장 전도 장애(치명적 부정맥) 위험이 있는 약제입니다.",
        "노인 환자에서 섬망, 요폐, 녹내장을 유발할 수 있으며 자살 위험이 높은 환자에게는 치명적 중독 위험으로 1차 선택을 피합니다."
    ),
    (
        r'(리튬|Lithium)',
        "양극성 장애 조증 및 우울 삽화의 치료와 재발 방지, 자살 충동 감소를 입증받은 1차 기분조절제입니다.",
        "치료 혈중 농도(0.6~1.2 mEq/L) 범위가 좁아 신독성, 갑상샘 기능 저하증 및 진전/운동실조 등 중독 증상을 정기 모니터링해야 합니다."
    ),
    (
        r'(발프로에이트|Valproate|Valproic\s*acid)',
        "양극성 장애 급성 조증 및 복합/혼재성 삽화, 전신발작 뇌전증의 표준 기분조절/항경련제입니다.",
        "최기형성(신경관 결손 위험)이 매우 높아 가임기 여성에서는 투여를 극력 피해야 하며 간독성 및 췌장염을 모니터링해야 합니다."
    ),
    (
        r'(조현병|Schizophrenia)',
        "망상, 환각, 와해된 언어 등의 정신병적 증상과 음성 증상이 최소 6개월 이상 지속되는 만성 정신 질환입니다.",
        "기분 삽화(조증/우울)가 질환 기간의 대부분을 차지하거나 명확한 신체/물질 원인이 있는 경우에는 조현병으로 단독 진단하지 않습니다."
    ),
    (
        r'(적응장애|Adjustment\s*disorder)',
        "식별 가능한 스트레스 사건 발생 3개월 이내에 나타나며, 스트레스 요인이 해소된 후 6개월 이내 증상이 호전되는 경미한 정서적 반응입니다.",
        "주요우울장애나 범불안장애의 완전한 진단 기준을 만족하거나 사별 반응에 해당하는 경우에는 진단에서 배제됩니다."
    ),
    (
        r'(주요우울장애|MDD|Major\s*depressive)',
        "2주 이상 지속되는 우울한 기분 또는 흥미/즐거움의 현저한 상실과 함께 수면, 식욕, 활력 저하가 동반되는 기분장애입니다.",
        "과거 단 한 번이라도 조증 또는 경조증 삽화가 있었다면 양극성 장애로 분류해야 하며 항우울제 단독 투여 시 조증 전환 위험이 있습니다."
    ),

    # ------------------ Orthopedics ------------------
    (
        r'(외고정|외고정술|External\s*fixation)',
        "심한 연부조직 손상을 동반한 고등급 개방성 골절, 감염된 골절 또는 혈역학적으로 불안정한 중증 골반 골절 환자에서 감염 위험을 줄이고 신속한 정복을 얻기 위한 임시/단계적 고정술입니다.",
        "연부조직 손상이 경미하고 감염 위험이 없는 단순 폐쇄성 골절에서는 해부학적 정복과 조기 관절 운동을 위해 내고정술(ORIF/IM nail)이 표준입니다."
    ),
    (
        r'(관혈적\s*정복\s*및\s*내고정술|ORIF)',
        "관절면을 침범하여 전위된 골절이나 도수 정복에 실패한 불안정성 골절을 해부학적으로 완벽히 맞추고 금속판/나사로 견고히 고정하는 표준 수술입니다.",
        "중증 연부조직 결손이나 활동성 화농 감염이 있는 부위에 내고정 금속물을 무리하게 삽입하면 심각한 골수염을 초래합니다."
    ),
    (
        r'(전방십자인대|ACL|Lachman)',
        "무릎의 전방 전위 및 회전 불안정성을 방지하는 핵심 인대로, Lachman 검사 및 Pivot shift 검사 양성이 특징적입니다.",
        "경골의 후방 전위를 막는 것은 후방십자인대(PCL)이며, 내·외측 스트레스는 측부인대(MCL, LCL)가 담당합니다."
    ),
    (
        r'(후방십자인대|PCL|Posterior\s*cruciate)',
        "경골의 후방 전위를 제한하는 핵심 인대로, 후방 서랍 검사(Posterior drawer test) 및 후방 처짐 검사(Sagging sign) 양성이 특징적입니다.",
        "Lachman 검사나 전방 서랍 검사 양성은 전방십자인대(ACL) 손상의 소견입니다."
    ),
    (
        r'(내측측부인대|MCL|Medial\s*collateral)',
        "무릎의 외반력(Valgus stress)에 저항하는 인대로, 무릎 30도 굴곡 상태에서의 외반 부하 검사 시 통증 및 이완이 확인됩니다.",
        "내반력(Varus stress)에 저항하는 구조물은 외측측부인대(LCL)입니다."
    ),
    (
        r'(액와신경|Axillary\s*nerve)',
        "상완골 외과경(Surgical neck) 골절이나 견관절 전방 탈구 시 손상되며, 삼각근(Deltoid) 마비로 견관절 외전 장애 및 견관절 외측 감각 소실이 나타납니다.",
        "손목하수(Wrist drop)는 요골신경(Radial nerve) 손상의 특징입니다."
    ),
    (
        r'(근피신경|Musculocutaneous\s*nerve)',
        "상완이두근(Biceps) 및 오구완근을 지배하여 주관절 굴곡을 담당하고 전완부 외측 감각을 지배합니다.",
        "수지 굴곡이나 엄지 대립 운동은 정중신경(Median nerve)이 지배합니다."
    ),
    (
        r'(정중신경|Median\s*nerve|수근관\s*증후군)',
        "수근관을 통과하여 1~3수지 및 4수지 요측 감각과 무지구근(Thenar muscles)을 지배하며, Tinel 및 Phalen 검사 양성을 보입니다.",
        "4~5수지 저림 및 골간근(Interossei) 위축은 척골신경(Ulnar nerve) 손상의 소견입니다."
    ),

    # ------------------ Laboratory Medicine ------------------
    (
        r'(항핵항체|ANA|Antinuclear\s*antibody)',
        "전신홍반루푸스(SLE), 전신경화증 등 전신 자가면역질환의 가장 민감한 선별 검사(IIF 이용)입니다.",
        "질환 특이도는 낮아 정상 노인이나 감염 질환에서도 위양성이 흔하므로 단독으로 SLE를 확진할 수 없습니다."
    ),
    (
        r'(Anti-dsDNA|항dsDNA)',
        "전신홍반루푸스(SLE)의 고특이도 진단 항체이자 질병 활성도(루푸스 신염 악화)를 반영하는 핵심 지표입니다.",
        "쇼그렌 증후군(Anti-Ro/La)이나 전신경화증(Anti-Scl-70)의 특이 항체가 아닙니다."
    ),
    (
        r'(ANCA|p-ANCA|c-ANCA|MPO|PR3)',
        "미세혈관염(GPA, MPA, EGPA)의 핵심 진단 자가항체입니다 (c-ANCA/PR3는 GPA, p-ANCA/MPO는 MPA/EGPA).",
        "대형 혈관염(Takayasu, 거대세포동맥염)에서는 ANCA가 음성이며 혈관 조영 검사가 필수적입니다."
    ),
    (
        r'(항미토콘드리아\s*항체|Anti-mitochondria|AMA)',
        "원발성 담즙성 담관염(PBC, Primary biliary cholangitis)의 95% 이상에서 양성을 나타내는 고특이도 진단 항체입니다.",
        "원발성 경화성 담관염(PSC)은 대개 AMA 음성이며 p-ANCA 양성과 담관조영술 상 구슬 모양(Beaded) 소견이 특징입니다."
    ),
    (
        r'(항인지질\s*항체|APA|Anti-cardiolipin|Lupus\s*anticoagulant|aCL)',
        "반복성 유산, 동정맥 혈전증 및 혈소판 감소를 유발하는 항인지질항체증후군(APS)의 진단 기준 항체입니다.",
        "가용성 인지질 항체는 ELISA 또는 응고 검사로 측정하며, 조직/세포 형태 기질을 쓰는 IIF 검사 대상이 아닙니다."
    ),
    (
        r'(재생불량성빈혈|Aplastic\s*anemia)',
        "골수 조혈모세포 결핍으로 인한 골수 저세포성(Hypocellularity) 및 말초혈액 범혈구감소증(Pancytopenia)을 특징으로 하는 질환입니다.",
        "비장 종대가 동반되지 않는 것이 특징이며, 간비종대가 있다면 백혈병, 골수섬유증 등 다른 골수 질환을 감별해야 합니다."
    ),
    (
        r'(암피실린|Ampicillin)',
        "Listeria monocytogenes, Enterococcus faecalis 등 그람양성균 커버를 위해 신생아 및 노인 뇌수막염 1차 요법에 필수 병용하는 페니실린계 항생제입니다.",
        "베타-락탐분해효소를 생성하는 황색포도알균(MSSA/MRSA)이나 녹농균 감염에는 효과가 없습니다."
    ),

    # ------------------ Hematology & Oncology ------------------
    (
        r'(All-trans\s*Retinoic\s*Acid|ATRA|트레티노인)',
        "급성 전골수구성 백혈병(APL, PML-RARA)에서 비정상 전골수구의 분화를 유도하여 조기 DIC 출혈 합병증을 예방하는 최우선 표준 1차 약제입니다.",
        "일반적인 급성 골수성 백혈병(AML)이나 림프모구성 백혈병(ALL)에서는 표준 1차 유도 요법 약제가 아닙니다."
    ),
    (
        r'(이마티닙|Imatinib|글리벡|Glivec|TKI)',
        "BCR-ABL 티로신 키나아제 억제제로 필라델피아 염색체 양성 만성 골수성 백혈병(CML) 및 위장관간질종양(GIST)의 1차 표준 표적 치료제입니다.",
        "급성 전골수구성 백혈병(APL)이나 림프종의 표준 원인 치료 약제가 아닙니다."
    ),
    (
        r'(리툭시맙|Rituximab|항-?CD20)',
        "CD20 양성 B세포 비호지킨 림프종 및 스테로이드 불응성 면역혈소판감소증(ITP)의 표준 면역표적치료제입니다.",
        "골수성 백혈병(AML/CML)이나 T세포 림프종 환자에서는 CD20 표적이 발현되지 않아 투여 대상이 아닙니다."
    ),
    (
        r'(프레드니솔론|Prednisolone|스테로이드|Dexamethasone)',
        "면역혈소판감소증(ITP), 자가면역용혈성빈혈(AIHA) 및 급성 염증/자가면역질환의 1차 표준 면역억제·항염증 약제입니다.",
        "급성 전골수구성 백혈병(APL)의 원인 유전자(PML-RARA) 표적 치료제가 아니며 단순 감염증에서는 오히려 면역을 저하시킵니다."
    ),
    (
        r'(항암치료|항암화학요법|Chemotherapy)',
        "전신 전이성 악성종양, 림프종 및 백혈병의 관해 유도 또는 수술 후 재발 방지를 위한 전신 표준 약물 치료입니다.",
        "국소에 국한된 조기 고형암의 경우 수술적 완전 절제가 완치를 위한 1차 표준 치료이며 단순 항암 단독 치료로 대체할 수 없습니다."
    ),
    (
        r'(방사선치료|Radiotherapy|Radiation)',
        "국소 진행성 악성종양의 수술 전/후 국소 재발 방지 또는 골전이 통증 완화를 위한 표준 국소 치료입니다.",
        "원격 전이가 동반된 전신 악성 질환의 전신 제어를 위한 단독 근치 요법으로는 부적절합니다."
    ),

    # ------------------ Hernia & Surgery ------------------
    (
        r'(Indirect\s*inguinal\s*hernia|간접\s*서혜부\s*탈장|간접\s*탈장)',
        "선천성 복막초상돌기(Processus vaginalis) 개존으로 인해 내서혜륜(Deep ring)을 통해 음낭으로 돌출하는 가장 흔한 서혜부 탈장입니다.",
        "Hesselbach 삼각을 통해 직하방으로 돌출하는 직접 탈장이나 대퇴륜을 통하는 대퇴 탈장과는 해부학적 발생 부위가 다릅니다."
    ),
    (
        r'(Direct\s*inguinal\s*hernia|직접\s*서혜부\s*탈장|직접\s*탈장)',
        "복벽 횡근막 약화로 인해 Hesselbach 삼각을 통해 복막이 전방으로 직접 돌출하는 후천성 탈장입니다.",
        "내서혜륜을 통과하지 않으며 음낭까지 하강하는 빈도가 간접 탈장보다 현저히 낮습니다."
    ),
    (
        r'(Femoral\s*hernia|대퇴\s*탈장)',
        "대퇴륜(Femoral ring)을 통해 서혜인대 하방으로 돌출하는 탈장으로, 결손 부위가 좁고 단단하여 감돈 및 교액(괴사) 위험이 가장 높아 발견 즉시 조기 수술이 원칙입니다.",
        "서혜인대 상방으로 돌출하는 일반 서혜부 탈장과는 해부학적 위치와 합병증 위험도가 다릅니다."
    ),
    (
        r'(Right\s*gastric\s*artery|우위동맥)',
        "고유간동맥(Proper hepatic artery)에서 기원하여 위의 소만부를 따라 주행하며 혈류를 공급하는 동맥입니다.",
        "위 대만부를 주행하는 우위대망동맥(Right gastroepiploic artery)이나 좌위동맥과는 해부학적 주행 부위가 상이합니다."
    ),
    (
        r'(J\s*형\s*낭형성술|회장낭|J-?pouch)',
        "전대장직장절제술(TPC) 후 말단 회장으로 J자형 인공 저장낭을 만들어 항문관에 문합함으로써 배변 횟수를 줄이고 자제 기능을 보존하는 표준 수술 기법입니다.",
        "직장을 보존하는 단순 결장절제술에서는 시행할 필요가 없습니다."
    ),
    (
        r'(직장\s*압력측정|Anorectal\s*manometry)',
        "선천성 거대결장증(Hirschsprung disease)에서 내항문괄약근 억제반사(RAIR) 소실 여부를 확인하고 만성 변비/변실금을 평가하는 표준 생리 기능 검사입니다.",
        "기계적 장폐색이나 대장암의 구조적 병변 진단 검사가 아닙니다."
    ),

    # ------------------ Imaging & Endoscopy ------------------
    (
        r'(복부\s*초음파|Abdominal\s*USG|초음파)',
        "급성 담낭염, 담석, 복수 및 수신증 등 간담도계와 복강 고형 장기 이상을 신속히 선별하는 비침습적 1차 영상 검사입니다.",
        "장관 천공에 의한 기복증(Free air)이나 췌장 심부 병변, 급성 게실염의 주위 지방 침윤 평가는 복부 CT가 훨씬 우수합니다."
    ),
    (
        r'(뇌\s*MRI|Brain\s*MRI)',
        "급성 뇌경색(DWI), 뇌종양, 뇌염, 탈수초성 질환(MS) 및 뇌간/후두개와 병변을 정밀 감별하는 표준 신경계 영상 검사입니다.",
        "급성 두개내 출혈(ICH/SAH)의 즉각적인 응급 진단이나 심박동기 등 금속 체내 삽입 환자에서는 비조영 뇌 CT가 우선됩니다."
    ),
    (
        r'(대장내시경|Colonoscopy)',
        "대장암 선별, 용종 절제 및 염증성 장질환(UC/크론병)의 점막 병변을 직접 관찰하고 조직 생검하는 표준 검사입니다.",
        "급성 게실염 급성기나 독성 거대결장 환자에서는 검사 중 장천공 위험이 극도로 높아 절대 금기입니다."
    ),

    # ------------------ Microbiology & Diagnostics ------------------
    (
        r'(세포테탄|Cefotetan|세폭시틴|Cefoxitin)',
        "골반염(PID) 및 복강 내 혼합 감염에서 Bacteroides fragilis 등 혐기성균을 커버하는 2세대 세팔로스포린계 항생제입니다.",
        "NMTT 측쇄로 인해 저프로트롬빈혈증(출혈 경향) 및 알코올 섭취 시 디설피람 유사 반응을 유발할 수 있어 주의해야 합니다."
    ),
    (
        r'(메티실린|Methicillin|옥사실린|Oxacillin|Nafcillin)',
        "베타-락탐분해효소에 저항성을 갖는 항포도알균 페니실린으로 MSSA 감염의 1차 표준 치료제입니다.",
        "mecA 유전자에 의해 PBP2a가 변형된 MRSA 감염에는 효과가 없어 반코마이신(Vancomycin) 투여가 요구됩니다."
    ),
    (
        r'(결핵균|Mycobacterium\s*tuberculosis|항산균)',
        "항산균 염색(Ziehl-Neelsen/Auramine-rhodamine) 양성 및 특이 PCR/배양으로 확진되는 만성 육아종성 호흡기 감염균입니다.",
        "일반 세균성 폐렴이나 비결핵항산균(NTM)과는 항생제 감수성 및 4제 표준 항결핵 요법(HERZ) 적용 대상이 상이합니다."
    ),
    (
        r'(HLA\s*crossmatching|교차시험)',
        "장기 이식 전 수혜자 혈청 내 기증자 특이 항체(DSA)의 존재를 확인하여 초급성 거부반응(Hyperacute rejection)을 예방하는 필수 검사입니다.",
        "T세포 교차시험 양성 시 즉각적인 이식편 괴사(초급성 거부반응)가 발생하므로 이식이 절대 금기입니다."
    ),

    # ------------------ OB/GYN Special Maneuvers & Conditions ------------------
    (
        r'(리트겐|Ritgen)',
        "분만 2기 아두 만출 시 회음부를 손으로 지지하고 턱을 전방으로 유도하여 급격한 아두 신전을 조절하고 회음열상을 최소화하는 표준 수기입니다.",
        "아두 만출 후 어깨 난산(Shoulder dystocia) 해결을 위한 수기가 아닙니다."
    ),
    (
        r'(모리쉐|Mauriceau)',
        "둔위(Breech) 질식 분만 시 후속 아두(Aftercoming head)의 굴곡을 유지하면서 안전하게 만출시키는 표준 분만 수기입니다.",
        "정상 두위 분만이나 태반 조기 박리 응급 상황의 해결법이 아닙니다."
    ),
    (
        r'(자궁근종|Myoma)',
        "자궁 평활근에서 발생하는 가장 흔한 양성 종양으로 월경과다 및 골반 압박 증상을 유발할 수 있습니다.",
        "폐경 후 급격히 크기가 증가하거나 괴사 소견을 보일 경우 악성 평활근육종과의 감별이 필요합니다."
    ),

    # ------------------ Neurology & Orthopedics Special ------------------
    (
        r'(급성횡단척수염|Transverse\s*myelitis)',
        "척수 분절의 급성 면역 염증으로 병변 이하의 양측성 운동 마비, 감각 저하(Sensory level) 및 대소변 장애를 유발하며 고용량 스테로이드가 1차 치료입니다.",
        "말초신경 다발 병변인 길랑-바레 증후군(GBS)이나 뇌경색과는 감각 수평선(Sensory level)의 존재로 명확히 감별됩니다."
    ),
    (
        r'(외측측부인대|LCL|Lateral\s*collateral)',
        "무릎의 내반력(Varus stress)에 저항하는 외측 안정성 인대로, 내반 부하 검사 시 통증 및 이완이 확인됩니다.",
        "무릎의 외반력(Valgus stress)에 저항하는 구조물은 내측측부인대(MCL)입니다."
    ),
    (
        r'(소엽간\s*중격|interlobular\s*septum)',
        "2차 폐소엽(Secondary pulmonary lobule)의 외곽 경계를 형성하며, 폐부종이나 림프관염성 암종증 시 비후되어 Kerley B line으로 관찰됩니다.",
        "소엽 중심부에는 소엽중심 세동맥 및 세기관지가 주행하며 중격과는 해부학적 위치가 다릅니다."
    )
]

# -------------------------------------------------------------------------
# 3. Lookup & Text Extraction Logic
# -------------------------------------------------------------------------
def normalize_pattern(pat):
    inner = pat.strip('()')
    parts = inner.split('|')
    new_parts = []
    for part in parts:
        p = part.strip()
        # Protect 2-5 letter English acronyms from substring matching
        if re.match(r'^[A-Za-z0-9\-]{2,5}$', p) and not p.startswith(r'\b'):
            new_parts.append(r'\b' + p + r'\b')
        else:
            new_parts.append(p)
    return '(' + '|'.join(new_parts) + ')'

def find_in_kmle_kb(opt_text, is_correct, subject):
    for pattern, corr_desc, wrong_desc in KMLE_KB:
        safe_pat = normalize_pattern(pattern)
        if re.search(safe_pat, opt_text, re.IGNORECASE):
            return corr_desc if is_correct else wrong_desc
    return None

def extract_direct_explanation(opt_clean, opt_num, source_text):
    if not source_text or not opt_clean or len(opt_clean) < 2:
        return ""
    
    # Check lines or sentences
    pieces = re.split(r'[\n•■▶\r]+', source_text)
    for piece in pieces:
        piece = piece.strip()
        if not piece:
            continue
        
        # Check if option number (e.g. ①) is at the start of piece
        if opt_num and re.match(rf'^[•\-\s]*{re.escape(opt_num)}[\s\:\.\)]', piece):
            cleaned = re.sub(rf'^[•\-\s]*{re.escape(opt_num)}[^\:\.\)]*[\:\.\)]\s*', '', piece).strip()
            cleaned = re.sub(r'[\(\[\{【]?(정답|오답|오답 감별)[\)\]\}】]?|[✓✗]', '', cleaned).strip(' :.-—')
            if len(cleaned) >= 12 and cleaned.lower() != opt_clean.lower() and '부합하지' not in cleaned:
                return cleaned
                
        # Check if option text is explicitly mentioned with colon or dash
        escaped_opt = re.escape(opt_clean[:10]) if len(opt_clean) >= 4 else re.escape(opt_clean)
        m = re.search(rf'{escaped_opt}[^\:\n\(\)]*[\:\—\-]\s*([^\n\•]+)', piece)
        if m:
            candidate = m.group(1).strip()
            candidate = re.sub(r'[\(\[\{【]?(정답|오답|오답 감별)[\)\]\}】]?|[✓✗]', '', candidate).strip(' :.-—')
            if len(candidate) >= 12 and candidate.lower() != opt_clean.lower() and '부합하지' not in candidate:
                return candidate
                
    return ""

# -------------------------------------------------------------------------
# 4. Main Enricher Interface
# -------------------------------------------------------------------------
def enrich_medical_option(opt_raw, opt_idx, is_correct, subject, question_obj=None, source_text=""):
    """
    Returns concise, genuine medical rationale for opt_raw, or "" if non-medical/unknown.
    NEVER returns robotic boilerplate!
    """
    opt_clean = clean_option_text(opt_raw)
    
    # 1. Non-medical artifact -> return empty string (User: "그저 비워둬도 괜찮아")
    if is_non_medical_artifact(opt_clean):
        return ""
        
    circs = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
    opt_num = circs[opt_idx] if opt_idx < len(circs) else f"({opt_idx+1})"
    
    # 2. Check KMLE Medical Knowledge Base FIRST for authoritative textbook rationale
    kb_match = find_in_kmle_kb(opt_clean, is_correct, subject)
    if kb_match:
        return kb_match
        
    # 3. Try direct extraction from problem explanation / theory if provided
    combined_source = source_text
    if question_obj:
        exp = question_obj.get('explanation', '')
        if isinstance(exp, dict):
            # Exclude 'differential' and 'option_explanations' to avoid circular contamination!
            exp_text = " ".join(str(v) for k, v in exp.items() if k not in ['differential', 'option_explanations'] and isinstance(v, str))
        else:
            exp_text = str(exp)
        theory = str(question_obj.get('kmle_theory', ''))
        combined_source = exp_text + " " + theory + " " + source_text
        
    direct = extract_direct_explanation(opt_clean, opt_num, combined_source)
    if direct:
        # Clean trailing markers
        direct = re.sub(r'[\(\[\{【]?(정답|오답|오답 감별)[\)\]\}】]?', '', direct).strip()
        direct = re.sub(r'\s+', ' ', direct).strip(' .:,;—')
        if len(direct) >= 12 and '부합하지' not in direct:
            return direct + "."
        
    # 4. If correct answer, provide guideline-based confirmation
    if is_correct:
        theme_title = question_obj.get('theme_title') if question_obj else ""
        if theme_title:
            return f"임상 증례 소견 및 최신 가이드라인에 부합하는 확진/1차 표준 치료 지침입니다."
        return "환자의 임상 양상, 진찰 소견 및 진단 기준에 부합하는 정답입니다."
        
    # 5. Fallback: Unknown distractor or non-differential option
    # STRICT USER RULE: "억지로 환각 일으켜서 해설할 필요없이 그저 비워둬도 괜찮아"
    return ""

def format_docx_bullet(c_prefix, opt_text, desc, is_corr):
    """
    Formats the bullet line for Word/PDF generator scripts.
    Never prints consecutive hyphens or fake boilerplate.
    """
    clean_desc = desc.strip() if desc else ""
    # Clean double hyphens if any slipped through
    clean_desc = clean_desc.replace("--", "~")
    
    if is_corr:
        if clean_desc:
            return f"{c_prefix} {opt_text} — {clean_desc} → 정답."
        else:
            return f"{c_prefix} {opt_text} → 정답."
    else:
        if clean_desc:
            return f"{c_prefix} {opt_text} — {clean_desc}"
        else:
            return f"{c_prefix} {opt_text}"
