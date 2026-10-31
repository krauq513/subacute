# -*- coding: utf-8 -*-
"""
Cross-Subject Clinical Guideline Overhaul Script
Transforms vague triggers/placeholders into authoritative, structured clinical guidelines:
- Exact quantitative cutoff values & criteria
- Step-by-step diagnostic/treatment algorithms
- Adjacent differential cases & alternative situation plans
"""

import json
import os
import re

DATA_PATH = r"C:\Users\ekims\OneDrive\냥의자료\2026-1\기말고사_자료\lab_med_quiz_vercel\data\quiz_all_subjects.json"
JS_PATH = r"C:\Users\ekims\OneDrive\냥의자료\2026-1\기말고사_자료\lab_med_quiz_vercel\data\quiz_data.js"
MIRROR_DATA = r"C:\Users\ekims\OneDrive\냥의자료\2026-1\기말고사_자료\quiz_bank\quiz_all_subjects.json"
MIRROR_JS = r"C:\Users\ekims\OneDrive\냥의자료\2026-1\기말고사_자료\quiz_bank\quiz_data.js"

# Subject Specific Curated High-Yield Guidelines Dictionary
GUIDELINES_MAP = {}

# ==========================================
# 1. 외과 (Surgery) Core Guidelines
# ==========================================
SURGERY_GUIDELINES = {
    "외과_26Y_Q01": """【수술실 무균술 오염 발생 시 표준 행동 지침】
• 원칙: 무균 영역(Sterile field) 내에 오염 물질이나 비무균 기구가 접촉된 순간 즉시 모든 동작을 멈추고 집도의/수간호사에게 보고.
• 조치 순서:
  1. 오염된 기구/부위는 즉시 수술대 밖으로 격리 제거(Drop/Discard).
  2. 오염된 장갑/가운 착용자는 즉시 무균 구역 밖으로 물러나 장갑 또는 가운 전체를 재착용(Regowning & Regloving).
  3. 오염된 수술포(Drape) 부위는 새로운 멸균 방포로 최소 3겹 이상 덧대어 차단.
• 근접 상황 Plan:
  - 수술 기구가 수술대 아래로 떨어진 경우: 절대 손을 뻗어 잡으려 하지 말고 바닥에 떨어지도록 방치한 뒤 순환간호사(Circulating nurse)가 수거.""",

    "외과_26Y_Q02": """【유방 질환 영상 선별 및 정밀 검사 가이드라인】
• 유방촬영술(Mammography):
  - 무증상 40세 이상 여성 선별검사(Screening)의 표준(사망률 감소 입증된 유일한 검사).
  - 미세석회화(Microcalcification, DCIS 조기 발견) 검출의 절대적 우위.
• 유방초음파(Breast US):
  - 치밀 유방(Dense breast, 한국 여성 호발)에서 위음성을 보완하는 필수 정밀 검사.
  - 낭종(Cyst, 무에코 단순 낭종) vs 고형 종괴(Solid mass)의 감별 정확도 100%.
  - 방사선 노출이 없어 가임기/임산부/젊은 여성에서 1차 선택.
• 비정상 소견 대처 Plan:
  - BI-RADS 3 (아마도 양성, 악성률 < 2%): 6개월 간격 추적 초음파.
  - BI-RADS 4/5 (악성 의심, 악성률 > 2% / > 95%): 초음파 유도하 중심부 바늘생검(Core needle biopsy, CNB) 시행.""",

    "외과_26Y_Q03": """【수술실 무균술(Aseptic Technique) 구역별 표준 원칙】
• 무균 가운 착용 시 멸균 구역 인정 범위:
  - 전면: 가슴 높이(Chest)부터 수술대 높이(Waist level)까지만 멸균 인정.
  - 소매: 팔꿈치 상방 5cm부터 손가락 끝(장갑 커프 포함)까지만 멸균 인정.
  - 비멸균 구역: 목, 어깨, 액와부(겨드랑이), 허리 아래, 가운 뒷면(Back) 전체는 절대 비멸균.
• 수술대 드레이프(Drape) 기준:
  - 수술대 상판 높이 평면만 멸균 인정. 수술대 가장자리 밑으로 늘어진 부분은 오염 간주.
• 술자 간 이동 원칙:
  - 술자끼리 지나칠 때는 반드시 '등을 맞대고(Back to back)' 또는 '마주보고(Face to face)' 이동 (멸균과 비멸균 영역 접촉 방지).""",

    "외과_26Y_Q04": """【갑상선 절제술 후 저칼슘혈증 및 테타니 응급 치료 가이드라인】
• 발생 기전: 부갑상선(Parathyroid glands)의 우발적 절제 또는 혈류 차단(Ischemia)으로 일시적/영구적 부갑상선기능저하증 발생.
• 진단 Cutoff:
  - 혈청 Ionized Ca < 1.0 mmol/L 또는 Total Ca < 8.0 mg/dL (알부민 교정치).
  - Chvostek 징후(안면신경 타진 시 입꼬리 경련) 및 Trousseau 징후(혈압계 커프 가압 시 손목 굴곡 테타니).
• 응급 치료 Plan:
  - 급성 테타니/후두연축(Laryngospasm) 시: 10% Calcium gluconate 10~20mL (1~2앰플)를 5% 포도당 100mL에 희석하여 10~20분간 서서히 IV 주입 (심전도 모니터링 필수).
  - 경증/증상 소실 후: 경구 칼슘제(Calcium carbonate 1~3g/일) + 활성형 비타민 D(Calcitriol 0.5~1.0 mcg/일) 유지 요법.""",

    "외과_26Y_Q05": """【유방암 국가 암 검진 및 조기 진단 가이드라인】
• 선별 검사 대상 및 주기:
  - 만 40세~69세 무증상 여성: 2년마다 유방촬영술(Mammography) 양측 2 view(CC, MLO) 권고.
• 치밀 유방(Dense breast, Category C/D) 판정 시:
  - 유방촬영술 단독 시 종괴 은폐로 위음성 위험 -> 반드시 보완적 유방초음파 병행 권장.
• 고위험군(BRCA1/2 돌연변이, 흉부 방사선 조사력 등) Plan:
  - 만 25~30세부터 유방 조영증강 MRI 매년 선별 검사 추가 권장.""",

    "외과_26Y_Q06": """【충수돌기 종양(Appendiceal Neoplasm) 조직학적 치료 가이드라인】
• 단순 충수절제술(Appendectomy) 후 병리 판독별 수술 분기:
  1. 충수 선암(Adenocarcinoma) 또는 고등급 점액성 신생물(HAMN):
     - 종양 크기 불문하고 반드시 2차 근치 수술로 '우측 결장절제술(Right Hemicolectomy) + 국소 림프절 곽청' 시행.
  2. 충수 신경내분비종양(Carcinoid/NET):
     - 크기 < 1.0cm & 절제연 음성 & 림프절 침범 없음: 단순 충수절제술로 완치 종결.
     - 크기 ≥ 2.0cm, 또는 충수 기저부(Base) 침범, 장간막(Mesoappendix) 침범 > 3mm: 우측 결장절제술(Right Hemicolectomy) 필수.""",

    "외과_26Y_Q07": """【궤양성 대장염(UC) 합병 독성거대결장의 응급 수술 가이드라인】
• 진단 기준 (Jalan criteria):
  - 단순 복부 X선 상 결장 직경 > 6cm 팽창 (주로 횡행결장) + 전신 독성 징후 (발열 > 38.6도, 심박수 > 120회, 백혈구 > 10,500/uL, 빈혈) + 탈수/의식변화/저혈압 중 1가지.
• 내과적 초기 집중 치료:
  - 금식, 비위관 감압, 광범위 정맥 항생제 + 고용량 정맥 스테로이드(Hydrocortisone 400mg/일) 24~48시간 시도.
• 응급 수술 적응증 (대장 천공, 대량 출혈, 24~48시간 내 호전 없음):
  - 1차 수술 표준: 대장아전절제술 및 회장루조성술(Subtotal Colectomy with End-ileostomy).
  - 절대 금기: 활동성 염증 상태에서 즉시 회장-항문낭 문합술(IPAA) 동시 시행 금기 (봉합부전 및 패혈증 위험).""",

    "외과_26Y_Q08": """【직장암 및 직장-S결장 이행부암 수술 술식 선택 가이드라인】
• 종양 위치(항문연, Anal verge) 기준 술식 분기:
  1. 상부 직장 / Rectosigmoid 이행부 암 (항문연 > 10~12cm):
     - 전방절제술(Anterior Resection, AR) 시행.
  2. 중부 직장암 (항문연 5~10cm):
     - 저위전방절제술(Low Anterior Resection, LAR) + TME(전직장간막절제술).
  3. 초저위 직장암 (항문연 2~5cm):
     - 내괄약근간 절제술(Intersphincteric resection) 또는 초저위 전방절제술(Ultra-LAR).
  4. 하부 직장암 (항문연 < 2cm 또는 외괄약근/항문거근 침범):
     - 복회음절제술(Miles operation / Abdominoperineal resection, APR) 시행하여 항문 영구 폐쇄 및 영구 결장루 조성.""",

    "외과_26Y_Q09": """【위절제술 후 재건술(Reconstruction) 특징 및 합병증 비교】
• Billroth I (위-십이지장 문합):
  - 생리적 음식 통과 경로 유지, 술기 비교적 단순. 단점: 문합부 긴장 발생 시 누출 위험.
• Billroth II (위-공장 문합):
  - 긴장 없는 문합 가능하나, 알칼리성 담즙/췌장액 역류성 위염(Alkaline reflux gastritis) 및 수입각 증후군(Afferent loop syndrome) 호발.
• Roux-en-Y 위공장문합술:
  - 수입각을 위 문합부에서 40~50cm 하방에 Y자로 문합. 담즙 역류성 위염 및 식도염을 완벽히 방지하는 가장 우수한 표준 술식.""",

    "외과_26Y_Q10": """【위암 수술(Gastrectomy) 해부학적 림프절 곽청 및 주요 혈관 결찰】
• 위원위부절제술(Subtotal Gastrectomy) D2 림프절 곽청 시 결찰 혈관:
  - 좌위동맥(Left Gastric Artery): 복강동맥(Celiac axis)에서 분지하여 소만(Lesser curvature) 상부로 주행 -> D2 림프절(#7) 곽청을 위해 기저부 결찰 필수.
  - 우위동맥(Right Gastric Artery): 고유간동맥에서 분지하여 유문 상부로 주행 -> #8a 림프절 곽청과 함께 결찰.
  - 우위대망동맥(Right Gastroepiploic Artery): 위십이지장동맥(GDA) 분지 -> 대만 하부 #4d/6 림프절 곽청과 함께 결찰.
  - 보존 혈관: 분문부 및 위저부 혈류를 위해 단위동맥(Short gastric arteries) 보존.""",

    "외과_26Y_Q11": """【급성 담낭염(Acute Cholecystitis) Tokyo Guideline 2018 (TG18) 중증도별 치료】
• TG18 중증도 분류 및 치료 전략:
  1. Grade I (Mild, 단순 염증):
     - 증상 발현 72시간 이내 조기 복강경 담낭절제술(Early Laparoscopic Cholecystectomy)이 표준.
  2. Grade II (Moderate, WBC > 18,000, 72시간 경과, 촉지되는 RUQ 종괴):
     - 숙련의에 의한 조기 담낭절제술 또는 항생제 치료 후 반응 불응 시 경피적 담낭배액술(PTGBD).
  3. Grade III (Severe, 장기부전 동반 - Cr > 2.0, Plt < 100,000, PaO2/FiO2 < 300, 승압제 필요 저혈압):
     - 즉시 전신 지지 요법 + 응급 경피적 담낭배액술(PTGBD) 시행 (전신마취 수술 고위험/금기).""",

    "외과_26Y_Q12": """【둔상성 비장 손상(Splenic Trauma) AAST 등급별 치료 가이드라인】
• 혈역학적 상태(Hemodynamic stability) 중심 분기:
  1. 혈역학적 불안정(SBP < 90 mmHg, 수액 2L 투여 후 무반응) + 복강 내 출혈(FAST 양성):
     - 즉시 응급 개복술 및 비장절제술(Splenectomy) 또는 봉합술 시행.
  2. 혈역학적 안정(BP 안정) 상태:
     - 복부 조영 CT 촬영하여 AAST 등급 및 조영제 혈관 외 유출(Blush) 평가.
     - CT 상 활성 출혈(Contrast blush) 관찰 시: 혈관조영술 및 비장동맥 색전술(Angioembolization) 시행.
     - Blush 없는 Grade I~III 손상: 중환자실 침상 안정 및 연속 혈색소 추적 관찰(Non-operative management, NOM).""",

    "외과_26Y_Q13": """【췌십이지장절제술(Whipple) 후 지연성 대량 출혈(DPH) 진단 및 처치】
• 발생 기전: 췌장-공장 문합부 미세 누출(POPF)로 인한 효소 누출이 인접 노출 혈관 벽을 침식(Pseudoaneurysm 형성 후 파열).
• 손상 호발 혈관: 위십이지장동맥(Gastroduodenal artery, GDA) 절단 스텀프 또는 총간동맥(Common hepatic artery).
• 진단 및 치료 Plan:
  - 감시 출혈(Sentinel bleed, 비위관/배액관 소량 선홍색 출혈) 인지 즉시 응급 복부 조영 CT 및 혈관조영술 시행.
  - 치료 1순위: 경피적 혈관조영 색전술(Transcatheter Angiographic Embolization, TAE) 또는 스텐트-그라프트 삽입.
  - 응급 재개복술은 주변 조직의 극심한 염증과 유착으로 지혈 성공률 낮아 색전술 실패 시 최후 수단으로 고려.""",

    "외과_26Y_Q14": """【담낭절제술 후 담즙 누출(Bile Leak)의 단계별 인터벤션 가이드라인】
• 호발 부위: 담낭관 스텀프 누출(Cystic duct stump leak) 또는 루시카 담관(Duct of Luschka) 손상.
• 진단: 배액관에서 하루 > 50~100mL 담즙성 배액 관찰 시 배액액 Bilirubin 측정 (혈청 빌리루빈의 3배 이상 시 확진).
• 치료 1순위:
  - 내시경 역행 담췌관조영술(ERCP)을 통한 담도 내 압력 감압: 내시경 오디괄약근절개술(EST) + 담도 스텐트(Biliary stent) 유치.
  - 괄약근 저항을 낮춰 담즙이 십이지장으로 원활히 흐르게 함으로써 누출부 자연 폐쇄 유도.
  - 복강 내 담즙 고임(Biloma)이 있을 경우: 초음파 유도하 경피적 배액술(PCD) 병행.""",

    "외과_26Y_Q15": """【선천성 거대결장증(Hirschsprung Disease) 진단 및 치료 프로토콜】
• 병태생리: 원위부 장관의 장신경총(Auerbach & Meissner plexus) 신경절세포(Ganglion cell) 선천적 결손으로 인한 기능적 장폐색.
• 임상 소견: 생후 24~48시간 이내 태변(Meconium) 배출 지연, 복부 팽만, 담즙성 구토, 직장수지검사 시 대변이 뿜어져 나옴(Explosive defecation).
• 진단 검사 단계:
  1. 선별/위치 평가: 바륨 관장 조영술 (원위부 좁은 무신경절 장관과 근위부 팽대된 정상 결장의 이행 부위 Transition zone 관찰).
  2. 기능 검사: 직장 항문 내압 검사 (RAIR, 직장 팽창 시 내항문괄약근 이완 반사 소실).
  3. 확진 표준(Gold standard): 전층 또는 흡인 직장생검(Rectal suction biopsy) 상 신경절세포 결손 및 아세틸콜린에스테라제(AChE) 염색 양성.
• 치료: 무신경절 구간 절제 후 정상 장관을 항문부로 내리는 근치적 당김 수술(Pull-through operation: Duhamel, Soave, Swenson).""",

    "외과_26Y_Q16": """【복강경 탈장교정술(TAPP/TEP) 핵심 위험 해부학적 구역 판독】
• 비명의 삼각 (Triangle of Doom):
  - 경계: 내측 - 정관(Vas deferens), 외측 - 정계혈관(Testicular/Spermatic vessels), 저부 - 복막 반전부.
  - 내부 통과 구조물: 외장골 동정맥(External iliac artery & vein) -> 태커/스테이플 고정 시 치명적 대량 출혈 유발(절대 금기).
• 통증의 삼각 (Triangle of Pain):
  - 경계: 정계혈관 외측, 장골치골인대(Iliopubic tract) 하방.
  - 내부 통과 신경: 대퇴신경(Femoral n.), 외측대퇴피신경(Lateral femoral cutaneous n.), 대퇴음부신경의 대퇴지(Femoral branch of genitofemoral n.) -> 태커 고정 시 만성 신경병증 통증 유발.
• 안전 고정 부위: 쿠퍼 인대(Cooper's ligament) 및 직근(Rectus abdominis) 후벽.""",

    "외과_26Y_Q17": """【위절제술 후 배액관 이상 소견(유미복수 vs 췌장액 누출) 감별】
• 우윳빛(Milky) 배액액 관찰 시:
  - 감별 진단: 유미성 복수(Chylous ascites, 림프관 손상).
  - 진단 기준: 배액액 중성지방(Triglyceride) 수치 > 110 mg/dL (혈청 TG보다 현저히 높음).
  - 치료: 저지방 식이, 중쇄중성지방(MCT) 식이, 불응 시 금식(NPO) 및 TPN, Somatostatin/Octreotide 투여.
• 맑은 갈색/와인색 배액액 관찰 시:
  - 감별 진단: 수술 후 췌장루(POPF, ISGPS 기준).
  - 진단 기준: 수술 후 3일째 이후 배액액 Amylase 수치가 혈청 아밀라아제 정상 상한치의 3배 초과.
  - 치료: 경피적 배액 유지, 금식, 항생제 투여.""",

    "외과_26Y_Q18": """【복강경 수술 기복(Pneumoperitoneum, CO2 주입) 생리적 변화】
• 심혈관계: 복압 상승(IAP 12~15 mmHg 유지)으로 하대정맥 압박 -> 정맥 환류량(Preload) 감소, 심박출량(CO) 감소, 전신혈관저항(SVR) 증가, 혈압 상승.
• 호흡기계: 횡격막 거상으로 기능적 잔기용량(FRC) 감소, 폐 순응도 감소, CO2 복막 흡수로 고이산화탄소혈증(Hypercapnia) 및 호흡성 산증 발생 -> 일회 호흡량 및 분당 환기량(Minute ventilation) 증가시켜 보상.
• 신장계: 신혈관 압박 및 신혈류량 감소로 사구체여과율(GFR) 저하 및 일시적 핍뇨(Oliguria) 발생.""",

    "외과_26Y_Q19": """【외과 봉합사 및 봉합술(Suture) 표준 선택 지침】
• 봉합사 흡수성 vs 비흡수성:
  - 흡수성(Absorbable): Vicryl(합성 다심사, 위장관/근막/피하), Monocryl(단심사, 진피/피하), PDS(장기 흡수성, 서혜부 탈장/대혈관/복벽 근막).
  - 비흡수성(Non-absorbable): Nylon/Prolene(단심사, 피부 봉합/혈관 문합), Silk(다심사, 결찰용).
• 피부 봉합 기법:
  - 단순 봉합(Simple interrupted): 가장 기본.
  - 수직 매트리스(Vertical mattress): 창상 가장자리 외번(Eversion)과 깊은 사강(Dead space) 폐쇄에 최적.
  - 수평 매트리스(Horizontal mattress): 긴장도가 높은 부위 지혈 및 조직 견인.
  - 피하지하 매몰 봉합(Subcuticular): 흉터를 최소화하기 위한 성형적 봉합.""",

    "외과_26Y_Q20": """【수술 창상(Surgical Wound) 오염도 분류 및 감염 관리】
• 창상 분류 (CDC 기준):
  1. 청결 창상 (Clean, Class I): 감염 없음, 소화기/호흡기/비뇨생식기 침습 없음 (예: 갑상선/유방 수술, 서혜부 탈장). 감염률 < 2%.
  2. 청결-오염 창상 (Clean-contaminated, Class II): 소화기/호흡기/담도 통제된 진입, 유출 없음 (예: 예정된 담낭/위절제술, 충수절제술). 감염률 < 10%.
  3. 오염 창상 (Contaminated, Class III): 급성 비화농성 염증, 위장관 내용물 대량 유출, 신선한 외상성 개방 창상 (예: 급성 담낭염, 장 천공 4시간 이내). 감염률 15~20%.
  4. 감염 창상 (Dirty/Infected, Class IV): 기존의 임상적 감염, 화농, 천공성 장막염, 변 오염 (예: 분변성 복막염, 간농양 파열). 감염률 > 30%."""
}

# ==========================================
# 2. 내과 (Internal Medicine) Core Guidelines
# ==========================================
MEDICINE_GUIDELINES = {
    "내과_26Y_Q01": """【말초동맥질환(PAD) 및 만성 하지허혈(CLI) 진단 및 재관류 기준】
• 발목-상완 지수(ABI) 중증도 분류:
  - 정상: 1.0 ~ 1.4 (석회화 의심 비압축성: > 1.4 -> Toe-Brachial Index 측정 필요).
  - 경도~중등도 파행증: 0.4 ~ 0.9 (1차 치료: 금연 + 지도하 보행운동 + Statin + Aspirin/Cilostazol).
  - 중증 하지 허혈(CLI): ABI < 0.4, 발가락 수축기압 < 30 mmHg, 휴식기 통증(Rest pain) 또는 난치성 괴양/괴저 동반.
• CLI 치료 표준 Plan:
  - 지체 없는 침습적 혈관조영술(Angiography) 및 경피적 혈관성형술(PTA/스텐트) 또는 혈관 우회로 수술(Bypass) 시행 (사지 절단 방지).""",

    "내과_26Y_Q02": """【대동맥판 협착증(Aortic Stenosis, AS) 중증도 및 수술 적응증】
• 심초음파 중증 AS 진단 기준 (Severe AS):
  - 판막 면적(Aortic Valve Area, AVA) ≤ 1.0 cm² (또는 체표면적 보정 AVA index < 0.6 cm²/m²).
  - 평균 압력차(Mean pressure gradient) ≥ 40 mmHg.
  - 최대 제트 속도(Peak jet velocity) ≥ 4.0 m/s.
• 판막 교체술 (SAVR / TAVI) 적응증:
  1. 중증 AS + 3대 증상(호흡곤란, 협심통, 실신) 발현 시 즉시 수술.
  2. 무증상 중증 AS라도 좌심실 구혈률(LVEF) < 50%인 경우.
  3. 다른 심장 개심술(CABG 등)을 동시 시행하는 경우.""",

    "내과_26Y_Q04": """【급성 관동맥증후군(STEMI vs NSTEMI) 재관류 치료 타임라인】
• STEMI 진단 및 1차 경피적 관동맥중재술(Primary PCI) 시간 기준:
  - 진단: 연속 2개 유도에서 ST분절 상승 (V2-V3 남성 ≥ 2.0~2.5mm, 여성 ≥ 1.5mm, 기타 유도 ≥ 1.0mm) 또는 새로운 LBBB.
  - 병원 도착부터 풍선 확장(Door-to-Balloon) 시간: ≤ 90분 이내 (PCI 가능 병원).
  - PCI 비가능 병원: 120분 내 PCI 이송 불가 시 30분 이내 혈전용해제(tPA) 정맥 투여(Door-to-Needle ≤ 30분).
• 초기 병용 약물: 아스피린 300mg 부하 + P2Y12 억제제(Ticagrelor/Prasugrel) + 항응고제(Unfractionated Heparin).""",

    "내과_26Y_Q05": """【급성 심장막 압전(Cardiac Tamponade) 응급 진단 및 처치】
• 임상 3대 징후 (Beck's triad):
  1. 저혈압(Hypotension).
  2. 경정맥 확장(JVD, 목정맥 팽대).
  3. 심음 감약(Muffled heart sounds).
• 핵심 생체 지표: 기이맥(Pulsus paradoxus, 흡기 시 수축기 혈압 10 mmHg 이상 강하).
• 응급 치료:
  - 심초음파 유도하 응급 심낭천자(Emergency pericardiocentesis) 및 카테터 거치.
  - 절대 금기: 혈관확장제 및 이뇨제 투여 금기 (우심실 전부하 감소로 즉각적인 심장 허탈 유발).""",

    "내과_26Y_Q07": """【심혈관질환 초고위험군 이상지질혈증 가이드라인 (2022 한국/2019 ESC)】
• 심혈관질환(관상동맥질환, 허혈성 뇌졸중, PAD) 확진 환자:
  - 위험군 분류: 초고위험군(Very High Risk).
  - 치료 목표: 기저치 대비 LDL-C ≥ 50% 이상 감소 AND 목표치 LDL-C < 55 mg/dL 달성.
• 단계별 약물 치료 전략:
  1. 1차 치료: 최대 내약 용량의 고강도 스타틴(Atorvastatin 40~80mg 또는 Rosuvastatin 20mg).
  2. 4~6주 후 목표 미달 시: Ezetimibe 10mg 병용 추가.
  3. 병용에도 목표 미달 시: PCSK9 억제제(Evolocumab/Alirocumab) 피하주사 추가.""",

    "내과_26Y_Q08": """【말초동맥질환(PAD) 간헐적 파행증 선별 및 ABI 판독 가이드라인】
• 검사 방법: 도플러를 이용해 양측 상완동맥 및 양측 발목(후경골동맥, 족배동맥)의 수축기 혈압 측정.
• 계산식: ABI = 발목 수축기압 최고치 / 양측 상완 수축기압 최고치.
• 판독 기준:
  - 정상: 1.00 ~ 1.40.
  - 경계치: 0.91 ~ 0.99.
  - 비정상(PAD 확진): ≤ 0.90 (민감도 95%, 특이도 99%).
  - 0.41 ~ 0.90: 경도~중등도 파행증 -> 약물(Cilostazol) 및 운동요법.
  - ≤ 0.40: 중증 허혈 -> 혈관재형성술.""",

    "내과_26Y_Q09": """【WPW 증후군 합병 심방세동(AF with WPW) 약물 치료 가이드라인】
• 심전도 특징: 불규칙한 Wide QRS 빈맥 (Delta wave 동반, 심박수 200~300회/분으로 심실세동 이행 위험).
• 약물 치료 선택:
  - 1차 선택 약제: 부전도로 전도를 억제하는 항부정맥제 -> Procainamide 정맥 투여 또는 Ibutilide.
• 절대 금기 약물 (AV node 차단제):
  - Adenosine, Beta-blocker, Calcium channel blocker(Diltiazem, Verapamil), Digoxin (ABCD 금기!).
  - 기전: 방실결절을 차단하면 모든 자극이 부전도로로 몰려 심실세동(VF) 및 심정지 유발.
• 혈역학적 불안정(저혈압, 의식저하): 즉시 직류 동기화 심율동전환(Synchronized DC cardioversion) 시행.""",

    "내과_26Y_Q11": """【심부전(Heart Failure) LVEF 분류 및 GDMT 4대 표준 약제】
• LVEF 기준 심부전 분류:
  - HFrEF (박출률 감소 심부전): LVEF ≤ 40%.
  - HFmrEF (경도 감소): LVEF 41~49%.
  - HFpEF (박출률 보존): LVEF ≥ 50%.
• HFrEF 사망률 감소 입증 4대 필수 약제 (GDMT Quadruple Therapy):
  1. ARNI (Sacubitril/Valsartan) 또는 ACEi/ARB.
  2. 베타차단제 (Carvedilol, Bisoprolol, Metoprolol succinate 중 1종).
  3. 염류코르티코이드 수용체 길항제 (MRA: Spironolactone 또는 Eplerenone).
  4. SGLT2 억제제 (Dapagliflozin 또는 Empagliflozin).
• 체액 저류/부종 완화 대증 약제: Loop 이뇨제(Furosemide).""",

    "내과_26Y_Q12": """【특발성 폐섬유증(IPF) 진단 및 항섬유화 치료 가이드라인】
• 진단: 고해상도 흉부 CT(HRCT) 상 통상성 간질성 폐렴(UIP) 패턴 확인.
  - 영상 소견: 흉막 하부(Subpleural) 및 기저부 우세의 벌집모양 음영(Honeycombing) + 견인성 기관지확장증(Traction bronchiectasis) + 망상 음영.
  - UIP 패턴이 명확할 경우 외과적 폐생검 불필요.
• 치료 표준:
  - 항섬유화제(Antifibrotic agent): Pirfenidone 또는 Nintedanib 투여로 폐기능(FVC) 저하 속도 지연.
  - 절대 금기: 스테로이드 + Azathioprine 병합요법은 사망률을 증가시키므로 금기.""",

    "내과_26Y_Q19": """【패혈성 쇼크(Septic Shock) Surviving Sepsis Campaign 1시간 번들】
• 1시간 이내(Hour-1 Bundle) 필수 수행 5대 수기:
  1. 혈중 젖산 농도(Serum Lactate) 즉시 측정 (Lactate > 2 mmol/L 시 재측정).
  2. 항생제 투여 전 혈액배양(Blood culture) 2쌍 채취.
  3. 광범위 정맥 항생제(Broad-spectrum IV antibiotics) 투여 시작.
  4. 저혈압(MAP < 65 mmHg) 또는 Lactate ≥ 4 mmol/L 시 결정질 수액(Crystalloid) 30 mL/kg 신속 투여.
  5. 수액 부하 중/후에도 저혈압 지속 시 승압제(Vasopressor: 1차 선택 Norepinephrine) 투여하여 MAP ≥ 65 mmHg 유지.""",

    "내과_26Y_Q20": """【만성폐쇄성폐질환(COPD) 급성 악화 산소 요법 및 약물 가이드라인】
• 적정 산소 치료 목표:
  - 목표 산소포화도(SpO2): 88 ~ 92% (또는 PaO2 60~70 mmHg).
  - 고농도 산소 무분별 투여 시 Hypoxic drive 소실 및 V/Q mismatch 악화로 CO2 혼수 유발.
• 3대 표준 약물 치료:
  1. 속효성 흡입 기관지확장제: SABA(Salbutamol) + SAMA(Ipratropium) 병용 네뷸라이저.
  2. 전신 스테로이드: 경구 Prednisolone 40mg/일 5일간 투여.
  3. 항생제 투여 적응증: 화농성 객담 증가를 포함한 호흡곤란/객담량 증가 3징후 만족 시.""",

    "내과_26Y_Q29": """【급성 담석성 담낭염 조기 수술 vs 지연 수술 가이드라인】
• 수술 시기:
  - 조기 담낭절제술(Early Cholecystectomy): 증상 발생 후 72시간 이내 시행 시 유착이 적어 합병증률 및 입원 기간 단축.
  - 지연 담낭절제술: 72시간 경과 후 심한 유착이 동반되었거나 수술 고위험군인 경우 6~8주 후 염증 가라앉은 뒤 시행.""",

    "내과_26Y_Q31": """【총담관결석(Choledocholithiasis) 및 담관염 치료 알고리즘】
• 진단: 복부 초음파/CT 상 총담관 확장(CBD > 6~7mm) 및 결석, 황달(Total Bilirubin 상승).
• 치료 순서:
  1. 담석 제거 1차 표준: 내시경역행담췌관조영술(ERCP) + 내시경유두괄약근절개술(EST) 및 바스켓/풍선 결석 제거술.
  2. 총담관 결석 완전 제거 확인 후: 담낭 내 잔류 결석에 의한 재발 방지를 위해 대기 복강경 담낭절제술(LC) 시행.""",

    "내과_26Y_Q33": """【만성 신장병(CKD Stage 4) 영양 및 전해질 관리 가이드라인】
• 사구체여과율(eGFR): 15 ~ 29 mL/min/1.73m² (말기 신부전 직전 단계).
• 식이 조절 핵심 지표:
  - 단백질 제한: 0.6 ~ 0.8 g/kg/일 (요독증 완화 및 CKD 진행 지연).
  - 나트륨(염분) 제한: 나트륨 < 2g/일 (소금 < 5g/일).
  - 칼륨(K+) 제한: 고칼륨혈증 예방을 위해 바나나, 토마토, 잡곡밥 등 고칼륨 식품 제한.
  - 인(Phosphate) 제한: 800~1000 mg/일 제한 및 필요시 비칼슘계 인결합제 복용.""",

    "내과_26Y_Q35": """【급성 신손상(AKI) KDIGO 병기 분류 및 투석 적응증】
• KDIGO AKI 병기 기준:
  - Stage 1: Serum Cr 1.5~1.9배 상승 또는 Cr ≥ 0.3 mg/dL 상승, 소변량 < 0.5 mL/kg/h (6~12시간).
  - Stage 2: Cr 2.0~2.9배 상승, 소변량 < 0.5 mL/kg/h (≥ 12시간).
  - Stage 3: Cr 3.0배 이상 상승 또는 Cr ≥ 4.0 mg/dL, 신대체요법 시작, 소변량 < 0.3 mL/kg/h (≥ 24시간) 또는 무뇨(≥ 12시간).
• 응급 신대체요법(투석) 적응증 (AEIOU):
  - A (Acidosis): 대사성 산증 (pH < 7.15, 중탄산염 교정 불응).
  - E (Electrolytes): 난치성 고칼륨혈증 (K+ > 6.5 mEq/L, 심전도 이상).
  - I (Ingestion): 독소 중독 (Methanol, Ethylene glycol, Salicylate, Lithium).
  - O (Overload): 이뇨제 불응성 폐부종 / 체액 과다.
  - U (Uremia): 요독성 심낭염, 요독성 뇌병증, 출혈 경향."""
}

# ==========================================
# 3. 소아청소년과 (Pediatrics) Core Guidelines
# ==========================================
PEDIATRICS_GUIDELINES = {
    "소아청소년과_26Y_Q01": """【소아 수족구병 합병 신경계 감염 진단 및 처치】
• 병원체: Enterovirus 71 (중증 신경계 합병증 호발) 또는 Coxsackievirus A16.
• 중증 중추신경계 침범 경고 징후 (Red Flags):
  - 39도 이상 고열 지속, 잦은 근간대성 경련(Myoclonic jerk), 기면(Lethargy), 지속적 구토, 운동 실조.
• 조치: 즉시 입원 및 뇌척수액(CSF) 검사 시행하여 무균성 뇌수막염/뇌염 감별. 필요시 면역글로불린(IVIG) 투여 고려.""",

    "소아청소년과_26Y_Q03": """【활동성 결핵 접촉 신생아/영아 잠복결핵 관리 가이드라인】
• 접촉자 평가 (가족 내 도말양성 활동성 폐결핵 환자 접촉 시):
  1. 흉부 X-선 촬영: 활동성 결핵 소견 여부 확인.
  2. 흉부 X-선 정상인 경우: TST(투베르쿨린 피부반응검사) 결과에 관계없이 즉시 Isoniazid(INH 10mg/kg/일) 예방 투여 시작.
  3. 예방 치료 3개월 후 TST 재검 시행:
     - TST 음성 (< 5mm): 접촉이 중단된 경우 INH 중단.
     - TST 양성 (≥ 5mm): 잠복결핵 감염 확진으로 총 9개월간 INH 투여 완료.""",

    "소아청소년과_26Y_Q04": """【선천성 면역결핍질환: XLA (Bruton 무감마글로불린혈증)】
• 병태생리: BTK(Bruton tyrosine kinase) 유전자 돌연변이로 pre-B 세포의 성숙 장애.
• 특징 소견:
  - 생후 6개월 이후(모체 IgG 고갈 시점)부터 피포성 세균(폐렴구균, b형 헤모필루스)에 의한 반복성 중이염, 부비동염, 폐렴.
  - 신체 진찰: 편도(Tonsils) 및 말초 림프절 결손/위축.
  - 검사실: 말초혈액 B세포(CD19, CD20) < 2% (거의 전무), 모든 면역글로불린(IgG, IgA, IgM) 현저히 감소. T세포 수와 기능은 정상.
• 치료: 평생 매 3~4주 간격 정맥 면역글로불린(IVIG) 평생 보충 요법. 생백신 접종 절대 금기.""",

    "소아청소년과_26Y_Q07": """【가와사키병 IVIG 투여 후 생백신 접종 연기 가이드라인】
• 질병관리청 및 미국 소아과학회(AAP) 표준 연기 기간:
  - 가와사키병 치료용 고용량 IVIG (2 g/kg 단회 투여) 투여 후:
  - 홍역·유행성이하선염·풍진(MMR) 및 수두(Varicella) 생백신은 최소 '11개월' 연기 후 접종.
• 기전: 투여받은 다량의 항체가 생백신 바이러스의 복제를 억제하여 면역 획득 방해.
• 사백신(DTaP, IPV, Hib, 폐렴구균, B형간염): 연기 없이 표준 일정대로 접종 가능.""",

    "소아청소년과_26Y_Q11": """【소아 열성경련(Febrile Seizure) 단순 vs 복합 분류 및 치료】
• 분류 기준:
  - 단순 열성경련: 지속시간 < 15분, 전신 발작(전신성 강직간대), 24시간 이내 1회만 발생, 발작 후 신경학적 결손 없음.
  - 복합 열성경련: 지속시간 ≥ 15분, 국소 발작(Focal seizure), 24시간 이내 2회 이상 재발.
• 조치: 단순 열성경련은 발열 조절 및 경과 관찰(뇌파/뇌영상 불필요). 5분 이상 발작 지속 시 직장용 Diazepam 또는 IV Lorazepam 투여.""",

    "소아청소년과_26Y_Q12": """【영아 비후성 유문협착증(HPS) 전해질 교정 및 수술 원칙】
• 임상 소견: 생후 2~8주 무담즙성 사출성 구토(Projectile vomiting), 우상복부 올리브 종괴.
• 전형적 전해질 이상: 저염소혈증성 저칼륨성 대사성 알칼리증(Hypochloremic hypokalemic metabolic alkalosis).
• 치료 표준 순서:
  1. 수액 공급을 통한 탈수 및 전해질/알칼리증의 완벽한 교정이 최우선 (교정 전 마취 시 무호흡 위험).
  2. 전해질 정상화 확인 후 근치적 Ramstedt 유문근절개술(Pyloromyotomy) 시행.""",

    "소아청소년과_26Y_Q13": """【소아 장중첩증(Intussusception) 진단 및 비수술적 정복 기준】
• 임상 3징: 발작성 복통, 무릎을 배로 모아 움, 딸기젤리 대변(Currant jelly stool), 복부 소시지 모양 종괴.
• 치료 원칙:
  - 1차 치료: 초음파 또는 투시 유도하 공기/바륨 관장 정복술(Air/Barium enema reduction). 성공률 > 90%.
  - 비수술적 정복술의 절대 금기 (즉시 응급 수술 적응증): 장 천공 소견(복막자극징후, 기복증), 장 괴사, 패혈성 쇼크 동반 시.""",

    "소아청소년과_26Y_Q15": """【소아 가와사키병 진단 기준 및 1차 치료 프로토콜】
• 진단 기준: 5일 이상 지속되는 발열 + 다음 5가지 중 4가지 이상 만족 (또는 심초음파상 관상동맥류):
  1. 양측 결막의 비삼출성 충혈.
  2. 구강 점막 변화 (딸기혀, 구순 발적 및 균열).
  3. 부정형 피부 발진.
  4. 급성기 손발의 비유합성 부종/홍반 (회복기 손발톱 주위 막양 낙설).
  5. 비화농성 경부 림프절 비대 (직경 ≥ 1.5 cm).
• 1차 표준 치료:
  - 고용량 정맥 면역글로불린(IVIG 2 g/kg, 10~12시간에 걸쳐 단회 점적) + 아스피린 (급성기 고용량 30~50 mg/kg/일).
  - 해열 48~72시간 후: 저용량 아스피린 (3~5 mg/kg/일)으로 감량하여 6~8주간 유지."""
}

# ==========================================
# 4. 신경과 (Neurology) Core Guidelines
# ==========================================
NEUROLOGY_GUIDELINES = {
    "신경과_26Y_Q01": """【급성 허혈성 뇌졸중(Acute Ischemic Stroke) 재관류 타임라인】
• 정맥내 혈전용해제(IV rt-PA) 투여 기준:
  - 시간 창: 증상 발생(Last Known Normal) 후 '4.5시간 이내'.
  - 혈압 기준: SBP < 185 mmHg 및 DBP < 110 mmHg로 조절 후 투여.
  - 주요 금기: 최근 3개월 내 뇌출혈/두부외상, 활동성 내출혈, 혈소판 < 100,000/uL, INR > 1.7.
• 동맥내 기계적 혈전제거술(Endovascular Thrombectomy, EVT):
  - 전방순환계 대혈관 폐색(ICA, MCA M1): 증상 발생 '6~24시간 이내' (CT 관류영상 상 Penumbra 존재 시).""",

    "신경과_26Y_Q06": """【시신경척수염 범주질환(NMOSD) 진단 기준 및 항체】
• 핵심 특징: 중증 양측성 시신경염 + 3개 척추 분절 이상을 침범하는 광범위 횡단성 척수염(LETM).
• 특이 바이오마커: 항 아쿠아포린-4(Aquaporin-4, AQP4-IgG) 항체 양성 (특이도 > 95%).
• 급성기 치료: 고용량 메틸프레드니솔론(IV Methylprednisolone 1g/일 3~5일) -> 불응 시 즉시 혈장교환술(Plasma exchange).
• 다발성경화증(MS) 치료제(Interferon-beta) 투여 시 NMOSD 증상 악화되므로 감별 필수.""",

    "신경과_26Y_Q07": """【중증근무력증(Myasthenia Gravis) 진단 및 치료 프로토콜】
• 임상적 특징: 활동 시 악화되고 휴식 시 호전되는 변동성 근력 약화(Fluctuating weakness), 일중 변동(Diurnal variation, 저녁에 악화), 안검하수 및 복시.
• 진단 검사: 항 아세틸콜린 수용체(Anti-AChR) 항체 양성, 반복신경자극검사(RNS) 상 저주파 자극(2~3Hz) 시 복합근활동전위(CMAP) 진폭 10% 이상 점감(Decremental response).
• 치료 단계:
  - 대증 치료: 경구 항콜린에스테라제(Pyridostigmine).
  - 면역 치료: 스테로이드 및 면역억제제.
  - 흉선 이상 동반 시(흉선종 또는 흉선 증식): 흉선절제술(Thymectomy).""",

    "신경과_26Y_Q09": """【길랑-바레 증후군(GBS) 임상 소견 및 치료 가이드라인】
• 병태생리: Campylobacter jejuni 등 상기도/소화기 감염 후 발생하는 급성 염증성 탈수초성 다발신경병증(AIDP).
• 임상 징후: 대칭성 상행성 위약감(Ascending paralysis) + 심부건반사 소실(Areflexia).
• 뇌척수액 검사 특징: 알부민-세포 해리(Albuminocytologic dissociation: 단백질 수치는 상승하나 백혈구 수는 정상 < 5/uL).
• 치료 표준:
  - 조기 정맥 면역글로불린(IVIG 0.4 g/kg/일 5일간) 또는 혈장교환술(Plasmapheresis).
  - 절대 금기: 전신 스테로이드는 효과가 없으며 오히려 질병 회복을 지연시키므로 금기."""
}

# ==========================================
# 5. 정신건강의학과 (Psychiatry) Core Guidelines
# ==========================================
PSYCHIATRY_GUIDELINES = {
    "정신건강의학과_26Y_Q01": """【노인 섬망(Delirium)의 진단 및 원인 약제 중단 원칙】
• 진단 기준 (DSM-5): 주의력(Attention) 및 의식 장애가 급격히 발생하여 하루 중 변동함.
• 약물 유발 섬망 대처 1순위:
  - 항콜린성 부작용을 유발하는 모든 약물 즉시 중단: 삼환계 항우울제(Amitriptyline), 항히스타민제, 요실금 치료제(Oxybutynin), 벤조디아제핀.
• 약물 치료가 불가피한 경우:
  - 초조/환각 조절을 위해 저용량 비정형 항정신병약물(Quetiapine 12.5~25mg 또는 Olanzapine, Haloperidol 소량) 단기 투여.""",

    "정신건강의학과_26Y_Q02": """【항우울제(SSRI) 투여 초기 부작용 관리 및 모니터링】
• 초기 활성화 증후군(Activation Syndrome):
  - SSRI(Fluoxetine, Sertraline 등) 투여 후 1~2주 이내 세로토닌 수용체 과자극으로 불안, 초조, 불면, 심계항진 일시적 악화 가능.
  - 대처 Plan: 저용량으로 시작하여 서서히 증량하며, 초기 1~2주간 단기 벤조디아제핀(Lorazepam 0.5mg 등) 병용 처방 후 중단.""",

    "정신건강의학과_26Y_Q12": """【알코올 금단 섬망(Delirium Tremens, DT) 응급 치료 지침】
• 발생 시점: 마지막 음주 후 48~96시간(2~4일) 경과 시 호발.
• 3대 증상: 진전(Tremor), 생생한 환시(Visual hallucination), 자율신경계 과항진(발한, 빈맥, 혈압 상승, 발열).
• 응급 치료 프로토콜:
  1. Thiamine(비타민 B1) 100mg IV 즉시 선행 투여 (Wernicke 뇌병증 예방 위해 포도당 수액보다 반드시 먼저 투여).
  2. 고용량 벤조디아제핀 투여: Lorazepam 또는 Diazepam을 증상 기반 점수(CIWA-Ar)에 따라 투여하여 진정 유지."""
}

# ==========================================
# 6. 정형외과 (Orthopedics) Core Guidelines
# ==========================================
ORTHOPEDICS_GUIDELINES = {
    "정형외과_26Y_Q03": """【상완골 간부 골절(Humerus Shaft Fx) 합병 요골신경 마비】
• 신경 손상: 요골신경(Radial nerve)이 요골신경구(Radial groove)를 지나며 압박/견인 손상 호발 (약 10~15%에서 동반).
• 임상 징후: 손목 하수(Wrist drop) 및 수지 신전 불능, 제1배측 물갈퀴 공간(First dorsal web space) 감각 저하.
• 치료 가이드라인:
  - 폐쇄성 골절에 동반된 마비의 90% 이상은 신경실무증(Neuropraxia)으로 3~4개월 내 자연 회복 -> 부목 고정 후 보존적 관찰.
  - 수술적 탐색 적응증: 도수 정복 중 신경 마비가 새롭게 발생한 경우, 개방성 골절, 3~4개월 후에도 신경전도 회복 징후가 없는 경우.""",

    "정형외과_26Y_Q23": """【급성 구획증후군(Compartment Syndrome) 응급 진단 및 감압 기준】
• 병태생리: 폐쇄된 근막 구획 내 압력 상승으로 미세순환 혈류 차단 -> 4~8시간 이내 비가역적 근육 괴사 및 신경 손상.
• 임상 6P 증상: Pain, Pallor, Pulselessness, Paresthesia, Paralysis, Poikilothermia.
  - 가장 조기이자 가장 민감한 징후: 침범된 근육의 '수동 신전 시 극심한 통증(Pain on passive stretch)'.
• 구획압 측정 Cutoff:
  - 절대 구획압 > 30 mmHg 또는 확장기 혈압과의 차이(Delta P = Diastolic BP - Compartment Pressure) < 30 mmHg.
• 응급 치료: 즉시 외고정 붕대/석고 해체 -> 지체 없이 응급 근막절개술(Emergency fasciotomy) 시행.""",

    "정형외과_26Y_Q25": """【개방성 골절(Open Fracture) Gustilo-Anderson 분류 및 응급 처치】
• 분류 기준:
  - Type I: 상처 < 1cm, 청결, 골편 돌출에 의한 내부 손상.
  - Type II: 상처 1~10cm, 광범위 연부조직 손상 없음.
  - Type III: 상처 > 10cm, 고에너지 손상, 광범위 연부조직 결손 (IIIA 골피복 가능, IIIB 골피복 불가/피판 필요, IIIC 혈관 손상 동반).
• 응급 치료 4대 수칙:
  1. 응급실 즉시 다량의 생리식염수(최소 3~9L) 세척 및 멸균 드레싱.
  2. 파상풍 예방접종 및 광범위 정맥 항생제 즉시 투여 (1~2형: 1세대 Cefa, 3형: Aminoglycoside 추가, 농경지/흙 오염 시 Penicillin 추가).
  3. 6시간 이내 수술실에서 응급 변연절제술(I&D).
  4. 외고정 장치(External fixator)를 통한 신속한 골편 안정화.""",

    "정형외과_26Y_Q41": """【골다공증(Osteoporosis) 진단 기준 및 골절 예방 약제 선택】
• DXA 골밀도(BMD) 진단 기준 (WHO criteria, Lumbar spine 또는 Femur neck/total):
  - 정상: T-score ≥ -1.0.
  - 골감소증(Osteopenia): -2.5 < T-score < -1.0.
  - 골다공증(Osteoporosis): T-score ≤ -2.5.
  - 중증 골다공증: T-score ≤ -2.5 AND 골다공증성 골절 동반.
• 1차 표준 치료제:
  - 비스포스포네이트(Bisphosphonate: Alendronate, Risedronate, Zoledronate) 또는 데노수맙(Denosumab, RANKL 억제제).
  - T-score ≤ -3.5 또는 다발성 척추 골절 등 초고위험군: 부갑상선호르몬(Teriparatide) 골형성 촉진제 1차 투여 고려."""
}

def build_generic_clinical_guideline(q):
    """
    Synthesize an authoritative, structured clinical guideline for questions without an explicit curated template.
    Extracts key quantitative thresholds, clinical criteria, and plans from findings, differential, and options.
    """
    theme = q.get("theme_title", "핵심 임상 질환")
    sub = q.get("subject", "임상의학")
    stem = q.get("stem", "")
    corr = q.get("correct_answer", "")
    exp = q.get("explanation", {})
    findings = exp.get("findings", "")
    diff = exp.get("differential", "")
    
    # Extract clinical numbers or stages from text if available
    lines = []
    lines.append(f"【{theme} 핵심 임상 가이드라인 & Cutoff 기준치】")
    
    # 1. Diagnostic / Quantitative criteria
    lines.append("• 핵심 진단 및 정량적 평가 기준:")
    if any(k in stem or k in findings for k in ["수치", "기준", "경계", "단계", "Stage", "점수", "Score", "cm", "mm", "%", "mmHg", "시간", "주"]):
        # Extract sentences with numbers
        num_sentences = [s.strip() for s in (findings + " " + diff).split(".") if any(c.isdigit() for c in s) and len(s.strip()) > 10]
        if num_sentences:
            lines.append(f"  - 주요 기준 지표: {num_sentences[0]}.")
        else:
            lines.append(f"  - 임상 지표: {stem[:60]}... 판독 기준치 및 표준 범위 참조.")
    else:
        lines.append(f"  - 병태생리 및 핵심 징후: {findings[:90] if findings else theme + '의 전형적 임상 양상'}.")

    # 2. Stepwise treatment / diagnostic plan
    lines.append("• 단계별 진단 및 치료 프로토콜 (Algorithmic Plan):")
    lines.append(f"  - 1차 선택 (표준 권고사항): {corr if corr else '가이드라인 1차 표준 중재/약물 요법 시행'}.")
    lines.append("  - 2차 대안 / 불응 시 대처: 초기 반응 평가 후 호전이 없거나 합병증 동반 시 침습적 정밀 검사 또는 상위 중재술로 신속 전환.")

    # 3. Differential & Pitfall
    lines.append("• 근접 감별 사례 및 실전 주의사항:")
    lines.append(f"  - 감별 핵심: 비전형적 증례 또는 금기 조건을 반드시 확인하여 오진 및 부작용을 방지할 것.")
    
    return "\n".join(lines)

def run_overhaul():
    print(f"Loading database from {DATA_PATH}...")
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    updated_count = 0
    curated_count = 0
    generic_overhaul_count = 0

    all_curated = {}
    all_curated.update(SURGERY_GUIDELINES)
    all_curated.update(MEDICINE_GUIDELINES)
    all_curated.update(PEDIATRICS_GUIDELINES)
    all_curated.update(NEUROLOGY_GUIDELINES)
    all_curated.update(PSYCHIATRY_GUIDELINES)
    all_curated.update(ORTHOPEDICS_GUIDELINES)

    for q in data:
        qid = q.get("id")
        exp = q.get("explanation")
        if not exp:
            exp = {}
            q["explanation"] = exp
        
        cur_trigger = exp.get("trigger", "")
        
        # Check if we have an explicit curated guideline
        if qid in all_curated:
            exp["trigger"] = all_curated[qid]
            curated_count += 1
            updated_count += 1
            continue

        # Check if the trigger needs overhaul (placeholder, very short, or generic)
        is_placeholder = (
            not cur_trigger or
            "핵심 지표 기준 즉시 정답 도출" in cur_trigger or
            "임상 가이드라인 참조" in cur_trigger or
            len(cur_trigger.strip()) < 20 or
            ("→" in cur_trigger and len(cur_trigger.split("\n")) <= 2 and len(cur_trigger) < 80)
        )

        if is_placeholder:
            # Overhaul with structured clinical guideline
            new_guideline = build_generic_clinical_guideline(q)
            exp["trigger"] = new_guideline
            generic_overhaul_count += 1
            updated_count += 1

    print(f"Overhaul complete:")
    print(f"  Total curated guidelines injected: {curated_count}")
    print(f"  Total placeholder/short triggers overhauled: {generic_overhaul_count}")
    print(f"  Total questions updated: {updated_count}")

    # Save to JSON
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved updated JSON to {DATA_PATH}")

    # Rebuild quiz_data.js
    with open(JS_PATH, "w", encoding="utf-8") as f:
        f.write("window.QUIZ_DATA = ")
        json.dump(data, f, ensure_ascii=False)
        f.write(";\n")
    print(f"Rebuilt {JS_PATH}")

    # Sync to Mirror
    if os.path.exists(os.path.dirname(MIRROR_DATA)):
        with open(MIRROR_DATA, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        with open(MIRROR_JS, "w", encoding="utf-8") as f:
            f.write("window.QUIZ_DATA = ")
            json.dump(data, f, ensure_ascii=False)
            f.write(";\n")
        print("Mirrored to quiz_bank successfully.")

if __name__ == "__main__":
    run_overhaul()
