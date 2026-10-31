# -*- coding: utf-8 -*-
"""
Enhanced Cross-Subject Clinical Guideline Overhaul Script
Provides domain-specific quantitative cutoffs and algorithmic decision paths.
"""

import json
import os
import re

DATA_PATH = r"C:\Users\ekims\OneDrive\냥의자료\2026-1\기말고사_자료\lab_med_quiz_vercel\data\quiz_all_subjects.json"
JS_PATH = r"C:\Users\ekims\OneDrive\냥의자료\2026-1\기말고사_자료\lab_med_quiz_vercel\data\quiz_data.js"
MIRROR_DATA = r"C:\Users\ekims\OneDrive\냥의자료\2026-1\기말고사_자료\quiz_bank\quiz_all_subjects.json"
MIRROR_JS = r"C:\Users\ekims\OneDrive\냥의자료\2026-1\기말고사_자료\quiz_bank\quiz_data.js"

# Domain specific clinical rules with exact cutoffs
DOMAIN_CUTOFF_RULES = [
    # Pulmonology / COPD / Asthma
    (
        ["spirometry", "fev1", "fvc", "copd", "폐기능", "천식", "폐쇄성", "기관지확장제"],
        """• 핵심 진단 및 정량적 Cutoff 기준:
  - 폐쇄성 환기장애 확진: 기관지확장제 투여 후 FEV1/FVC < 0.70 (70% 미만).
  - 기관지 가역성(BDR) 양성: FEV1 또는 FVC가 기저치 대비 12% 이상 AND 200 mL 이상 증가.
  - COPD GOLD 중증도 분류 (FEV1 % predicted):
    * GOLD 1 (경증): ≥ 80%
    * GOLD 2 (중등증): 50% ~ 79%
    * GOLD 3 (중증): 30% ~ 49%
    * GOLD 4 (최중증): < 30%
  - 증상 및 악화 위험도 평가: mMRC 호흡곤란 점수 (≥ 2점: 심한 호흡곤란) 또는 CAT 점수 (≥ 10점: 유의한 증상).
• 표준 치료 분기 (GOLD 2023/2024):
  - Group A (증상 적음, 악화 없음): 단일 기관지확장제 (LAMA 또는 LABA).
  - Group B (증상 많음, 악화 없음): LAMA + LABA 복합제.
  - Group E (연간 악화 ≥ 2회 또는 입원 1회): LAMA + LABA (+ 혈중 호산구 ≥ 300/uL 시 ICS 추가 3제 복합요법)."""
    ),
    # Cardiology / Hypertension / ABPM
    (
        ["abpm", "활동혈압", "24시간 혈압", "백의고혈압", "가면고혈압"],
        """• 핵심 진단 및 정량적 Cutoff 기준:
  - 진료실 혈압(Office BP): ≥ 140/90 mmHg.
  - 24시간 활동혈압(ABPM) 진단 기준:
    * 24시간 평균 혈압: ≥ 130/80 mmHg.
    * 주간(활동기) 평균 혈압: ≥ 135/85 mmHg.
    * 야간(수면기) 평균 혈압: ≥ 120/70 mmHg.
  - 가정 혈압(Home BP): ≥ 135/85 mmHg.
  - 야간 혈압 강하(Dipping): 정상 10~20% 강하 (Non-dipper: < 10% 강하 -> 심혈관 사건 고위험군).
• 진단 분기 및 처치:
  - 백의 고혈압(진료실 상승, ABPM 정상): 불필요한 약물 치료 지양, 생활습관 교정 및 주기적 추적.
  - 가면 고혈압(진료실 정상, ABPM 상승): 표적장기 손상 위험 높음 -> 표준 항고혈압제 약물 치료 개시."""
    ),
    # Endocrinology / DKA / HHS / DM
    (
        ["dka", "당뇨병성 케톤산증", "고혈당성 고삼투압", "hhs", "혈당", "인슐린"],
        """• 핵심 진단 및 정량적 Cutoff 기준:
  - DKA 진단: 혈당 > 250 mg/dL + 동맥혈 pH < 7.30 + 혈청 HCO3- < 18 mEq/L + 혈청/소변 케톤체 양성 + Anion Gap > 10~12.
  - HHS 진단: 혈당 > 600 mg/dL + 혈청 유효 삼투압 > 320 mOsm/kg + pH > 7.30 + HCO3- > 18 mEq/L + 케톤체 미량/음성.
• 수액 및 전해질 치료 알고리즘:
  1. 1차 수액: 0.9% 생리식염수 1~1.5 L/h 부하 (저혈량 쇼크 교정).
  2. 칼륨(K+) 수치별 인슐린 투여 분기:
     - K+ < 3.3 mEq/L: 인슐린 즉시 보류, KCl 보충 후 K+ ≥ 3.3 회복 시 인슐린 시작 (부정맥 및 심정지 예방).
     - K+ 3.3 ~ 5.2 mEq/L: 수액 1L당 KCl 20~30 mEq 혼합 투여 + 속효성 인슐린(0.1 U/kg/h) 투여.
     - K+ > 5.2 mEq/L: K+ 보충 없이 인슐린만 투여.
  3. 포도당 전환 기준: DKA는 혈당 200 mg/dL, HHS는 250~300 mg/dL 도달 시 5% 포도당 수액으로 전환 (저혈당 및 뇌부종 방지)."""
    ),
    # Nephrology / AKI / CKD / Dialysis
    (
        ["ckd", "aki", "사구체여과율", "투석", "요독증", "신장병", "단백뇨"],
        """• 핵심 진단 및 정량적 Cutoff 기준:
  - KDIGO CKD 병기 분류 (eGFR mL/min/1.73m²):
    * G1: ≥ 90 (신손상 동반) | G2: 60~89 | G3a: 45~59 | G3b: 30~44 | G4: 15~29 (투석 준비기) | G5: < 15 (말기 신부전).
  - 단백뇨/알부민뇨 병기 (ACR mg/g):
    * A1: < 30 (정상~미세증가) | A2: 30~300 (미세알부민뇨) | A3: > 300 (현성 단백뇨).
• 응급 혈액투석(HD) 적응증 (AEIOU):
  - A (산증): 중탄산염 불응성 대사성 산증 (pH < 7.15).
  - E (전해질): 심전도 변화를 동반한 난치성 고칼륨혈증 (K+ > 6.5 mEq/L).
  - I (독소): 배설 가능한 약물 중독 (Methanol, Ethylene glycol, Salicylate, Lithium).
  - O (체액 과다): 이뇨제 불응성 폐부종.
  - U (요독증): 요독성 심낭염, 요독성 뇌병증, 요독성 출혈."""
    ),
    # Gastroenterology / Ascites / SBP / Variceal Bleeding
    (
        ["sbp", "자발성 세균성 복막염", "간경변", "복수", "정맥류", "식도정맥류"],
        """• 핵심 진단 및 정량적 Cutoff 기준:
  - 복수 천자 SBP 확진 기준: 복수 다형핵백혈구(PMN, Neutrophil) 수 ≥ 250/μL (0.25 x 10^9/L).
  - 문맥고혈압성 복수 판정: 혈청-복수 알부민 농도차(SAAG) ≥ 1.1 g/dL.
• SBP 치료 표준 Plan:
  1. 경험적 1차 정맥 항생제: 3세대 세팔로스포린(Cefotaxime 2g q8h IV 또는 Ceftriaxone 1~2g q24h IV) 최소 5일간 투여.
  2. 간신증후군(HRS) 예방 알부민 투여: 진단 6시간 이내 1.5 g/kg IV 투여 + 3일째 1.0 g/kg 추가 투여 (Cr > 1.0 또는 BUN > 30 또는 T.Bilirubin > 4인 고위험군에서 사망률 현저히 감소).
• 정맥류 출혈 대처:
  - 조기 혈관수축제(Terlipressin, Octreotide, Somatostatin) 투여 + 예방적 Ceftriaxone 1g/일 + 12시간 이내 응급 내시경 밴드결찰술(EVL)."""
    ),
    # Hepatobiliary / Cholecystitis / Cholangitis / ERCP
    (
        ["담낭염", "담관염", "담석", "cholecystitis", "cholangitis", "ercp", "tokyo"],
        """• 핵심 진단 및 정량적 Cutoff 기준:
  - Tokyo Guideline 2018 (TG18) 급성 담낭염 중증도:
    * Grade I (경증): 단순 염증 -> 72시간 이내 조기 복강경 담낭절제술.
    * Grade II (중등증): WBC > 18,000/μL, 증상 지속 > 72시간, RUQ 종괴 -> 조기 수술 또는 항생제/PTGBD.
    * Grade III (중증): 장기 부전 동반 (저혈압, PaO2/FiO2 < 300, Cr > 2.0, Plt < 100,000) -> 응급 경피적 담낭배액술(PTGBD).
  - 급성 담관염 (Charcot 3징: 복통+황달+발열 / Reynolds 5징: +쇼크+의식저하):
    * 치료 1순위: 즉시 광범위 항생제 + 응급 내시경 담도 감압술(ERCP + EST / 담도 스텐트 또는 ENBD)."""
    ),
    # Psychiatry / Schizophrenia / Mood Disorders / Duration
    (
        ["조현병", "우울", "조증", "경조증", "양극성", "dsm-5", "섬망", "공황"],
        """• 핵심 진단 및 지속 기간 Cutoff (DSM-5):
  - 조현병 스펙트럼 지속 기간 기준:
    * 단기 정신병적 장애(Brief Psychotic): < 1개월 (완전 회복).
    * 조현병형 장애(Schizophreniform): 1개월 이상 ~ 6개월 미만.
    * 조현병(Schizophrenia): 최소 6개월 이상 지속 (최소 1개월간 활성기 증상: 망상, 환각, 와해된 언어 중 1개 이상 포함 2가지 이상).
  - 기분장애 기간 기준:
    * 주요우울장애(MDD): 연속 2주 이상 일상 기능 장애.
    * 조증 삽화(Manic episode): 최소 1주일 이상 뚜렷한 고양/흥분 (입원 필요 시 기간 불문).
    * 경조증 삽화(Hypomanic): 최소 4일 이상 지속 (일상 기능의 뚜렷한 손상 없음, 입원 불필요).
    * 지속성 우울장애(기분부전증): 성인 2년 이상 (소아청소년 1년 이상)."""
    ),
    # Pediatrics / Kawasaki / Febrile Seizure / Pyloric Stenosis
    (
        ["가와사키", "kawasaki", "열성경련", "유문협착", "비후성", "장중첩"],
        """• 핵심 진단 및 정량적 Cutoff 기준:
  - 가와사키병: 발열 ≥ 5일 + 4/5 주요 증상 (결막 충혈, 구강 점막 발적/딸기혀, 발진, 손발 부종/탈피, 림프절 비대 ≥ 1.5cm).
    * 1차 치료: 고용량 IVIG 2 g/kg 단회 투여 + 아스피린 (급성기 고용량 30~50 mg/kg/일 -> 해열 후 3~5 mg/kg/일 6~8주).
  - 열성경련:
    * 단순: 발작 지속 < 15분, 24시간 내 1회, 전신성.
    * 복합: 지속 ≥ 15분, 24시간 내 2회 이상 재발, 국소성.
  - 영아 비후성 유문협착증(HPS): 생후 2~8주 사출성 구토, 초음파 유문근 두께 ≥ 3 mm, 길이 ≥ 14 mm.
    * 치료: 수액으로 저염소성 저칼륨성 알칼리증 완전 교정 후 Ramstedt 유문근절개술."""
    ),
    # Orthopedics / Compartment / Fracture / Osteoporosis
    (
        ["구획증후군", "골다공증", "개방성", "t-score", "dxa", "골절", "상완골", "요골"],
        """• 핵심 진단 및 정량적 Cutoff 기준:
  - 급성 구획증후군: 구획 내 조직압 > 30 mmHg 또는 Delta P (확장기 혈압 - 구획압) < 30 mmHg.
    * 최조기 증상: 수동 신전 시 극심한 통증 -> 즉시 응급 근막절개술(Fasciotomy).
  - DXA 골다공증 진단 기준 (T-score):
    * 정상: ≥ -1.0 | 골감소증: -1.0 ~ -2.5 | 골다공증: ≤ -2.5 (1차 치료: 비스포스포네이트 / 데노수맙).
  - Gustilo-Anderson 개방성 골절:
    * Type I (< 1cm) / Type II (1~10cm) / Type III (> 10cm 고에너지 손상).
    * 수술 원칙: 6시간 이내 응급 변연절제술(I&D) + 항생제 + 세척(생리식염수 최소 3~9L) + 외고정."""
    ),
    # Neurology / Stroke / MG / GBS / Epilepsy
    (
        ["뇌졸중", "뇌경색", "tpa", "중증근무력증", "길랑바레", "뇌전증", "gbs"],
        """• 핵심 진단 및 치료 타임라인 기준:
  - 급성 허혈성 뇌경색:
    * 정맥내 혈전용해술(IV rt-PA): 증상 발생 후 4.5시간 이내 (혈압 < 185/110 mmHg 조절 필수).
    * 동맥내 기계적 혈전제거술(EVT): 대혈관 폐색 확인 시 6~24시간 이내.
  - 중증근무력증(MG): 아침보다 저녁에 심한 변동성 근력 약화, 안검하수/복시, 항 AChR 항체 양성, RNS 10% 이상 진폭 감퇴 -> Pyridostigmine 1차.
  - 길랑-바레 증후군(GBS): 선행 감염 후 대칭성 상행성 위약감, DTR 소실, CSF 알부민-세포 해리 (단백 상승, 백혈구 정상 < 5) -> IVIG 0.4g/kg 5일간 (스테로이드 금기)."""
    )
]

def build_advanced_guideline(q):
    theme = q.get("theme_title", "임상 질환")
    sub = q.get("subject", "임상의학")
    stem = q.get("stem", "")
    corr = q.get("correct_answer", "")
    
    # Resolve generic correct answer
    if not corr or "가이드라인 참조" in corr or "상세 해설" in corr:
        opts = q.get("options", [])
        c_idx = q.get("correct_option_index", 0)
        if isinstance(c_idx, int) and 0 <= c_idx < len(opts):
            corr = opts[c_idx]
        elif isinstance(c_idx, list) and len(c_idx) > 0 and 0 <= c_idx[0] < len(opts):
            corr = ", ".join([opts[i] for i in c_idx if 0 <= i < len(opts)])
        else:
            corr = "표준 임상 가이드라인 1차 권고 요법"

    combined_text = (theme + " " + stem + " " + sub).lower()
    
    # Check domain rules
    matched_rule = None
    for keywords, rule_content in DOMAIN_CUTOFF_RULES:
        if any(k in combined_text for k in keywords):
            matched_rule = rule_content
            break

    lines = []
    lines.append(f"【{theme} 핵심 임상 가이드라인 & Cutoff 기준치】")
    
    if matched_rule:
        lines.append(matched_rule)
    else:
        lines.append("• 핵심 진단 및 정량적 평가 기준:")
        exp = q.get("explanation", {})
        findings = exp.get("findings", "")
        if findings and len(findings) > 15:
            # Clean findings
            f_clean = findings.split("\n")[0].strip()
            lines.append(f"  - 주요 임상 지표: {f_clean}")
        else:
            lines.append(f"  - 병태생리 및 핵심 징후: {theme}의 전형적 소견 및 진단 기준치 적용.")

    lines.append("• 단계별 진단 및 치료 프로토콜 (Algorithmic Plan):")
    lines.append(f"  - 1차 선택 (표준 권고사항): {corr}.")
    lines.append("  - 2차 대안 / 불응 시 대처: 초기 반응 평가 후 호전이 없거나 중증도 진행 시 상위 침습적 중재술 또는 2차 약제로 신속 전환.")
    lines.append("• 근접 감별 사례 및 실전 주의사항:")
    lines.append("  - 비전형적 증례 또는 절대 금기 조건을 확인하여 오진과 합병증 발생을 예방할 것.")

    return "\n".join(lines)

def run_advanced_overhaul():
    print(f"Loading data from {DATA_PATH}...")
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    updated_count = 0
    for q in data:
        exp = q.get("explanation")
        if not exp:
            exp = {}
            q["explanation"] = exp
        
        tr = exp.get("trigger", "")
        # If trigger still contains generic fallback or has short one-liner
        if (
            not tr or
            "핵심 지표 기준 즉시 정답 도출" in tr or
            "상세 해설 및 임상 가이드라인 참조" in tr or
            "임상 가이드라인 참조" in tr or
            len(tr.strip()) < 30 or
            ("→" in tr and len(tr.split("\n")) <= 2 and len(tr) < 90)
        ):
            exp["trigger"] = build_advanced_guideline(q)
            updated_count += 1

    print(f"Advanced overhaul updated {updated_count} questions.")

    # Save JSON
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Rebuild quiz_data.js
    with open(JS_PATH, "w", encoding="utf-8") as f:
        f.write("window.QUIZ_DATA = ")
        json.dump(data, f, ensure_ascii=False)
        f.write(";\n")

    # Mirror
    if os.path.exists(os.path.dirname(MIRROR_DATA)):
        with open(MIRROR_DATA, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        with open(MIRROR_JS, "w", encoding="utf-8") as f:
            f.write("window.QUIZ_DATA = ")
            json.dump(data, f, ensure_ascii=False)
            f.write(";\n")
        print("Updated quiz_bank mirror successfully.")

if __name__ == "__main__":
    run_advanced_overhaul()
