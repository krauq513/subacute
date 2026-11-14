// Vercel Serverless Function: api/sync.js
// Handles real-time cross-client synchronization for profiles, error reports, comments, and edits

import { fetchGistData, saveGistData } from '../lib/gist.js';

function mergeData(serverData, clientData) {
  // 1. Reports merge
  const reportMap = new Map();
  (serverData.reports || []).forEach(r => { if (r && r.id) reportMap.set(r.id, r); });
  (clientData.clientReports || []).forEach(r => {
    if (r && r.id) {
      if (!reportMap.has(r.id)) {
        reportMap.set(r.id, r);
      } else {
        const existing = reportMap.get(r.id);
        reportMap.set(r.id, { ...existing, ...r });
      }
    }
  });

  // Automatically mark resolved reported errors
  const resolvedReportIds = new Set([
    'rep_1793464903407_4eczg',
    'rep_1793465487079_7leo0',
    'rep_1793487959415_j2ei2',
    'rep_1793490107805_c7lvw',
    'rep_1793509070690_6uszt',
    'rep_1793513521429_8y5q2',
    'rep_1793514411231_i4heg',
    'rep_1793514583213_irbvt',
    'rep_1793781200631_q4ay7',
    'rep_1793781392972_z89jl',
    'rep_1793781577640_aut6l',
    'rep_1793781832219_6a77j',
    'rep_1793979436606_p61x3',
    'rep_1793979454570_d99ct',
    'rep_1793979480318_5vzp0',
    'rep_1794016551773_thjep',
    'rep_1794020253933_d0dby',
    'rep_1794047371553_nh090',
    'rep_1794662534564_ucfue',
    'rep_test_init'
  ]);
  const resolvedQuestionIds = new Set([
  '내과_19Y_감염_Q01',
  '내과_19Y_감염_Q02',
  '내과_19Y_감염_Q03',
  '내과_19Y_감염_Q04',
  '내과_19Y_감염_Q05',
  '내과_19Y_내분비_Q01',
  '내과_19Y_내분비_Q02',
  '내과_19Y_내분비_Q03',
  '내과_19Y_내분비_Q04',
  '내과_19Y_내분비_Q05',
  '내과_19Y_류마_Q01',
  '내과_19Y_류마_Q02',
  '내과_19Y_류마_Q03',
  '내과_19Y_류마_Q04',
  '내과_19Y_신장_Q01',
  '내과_19Y_신장_Q02',
  '내과_19Y_신장_Q03',
  '내과_19Y_신장_Q04',
  '내과_19Y_신장_Q05',
  '내과_19Y_신장_Q06',
  '내과_19Y_신장_Q07',
  '내과_19Y_신장_Q08',
  '내과_19Y_신장_Q09',
  '내과_19Y_신장_Q10',
  '내과_19Y_심장_Q01',
  '내과_19Y_심장_Q02',
  '내과_19Y_심장_Q03',
  '내과_19Y_심장_Q04',
  '내과_19Y_심장_Q05',
  '내과_19Y_심장_Q06',
  '내과_19Y_심장_Q07',
  '내과_19Y_심장_Q08',
  '내과_19Y_심장_Q09',
  '내과_19Y_심장_Q10',
  '내과_19Y_혈종_Q00',
  '내과_19Y_혈종_Q01',
  '내과_19Y_혈종_Q02',
  '내과_19Y_혈종_Q03',
  '내과_19Y_혈종_Q04',
  '내과_19Y_호흡기_Q01',
  '내과_19Y_호흡기_Q02',
  '내과_19Y_호흡기_Q03',
  '내과_19Y_호흡기_Q04',
  '내과_19Y_호흡기_Q05',
  '내과_19Y_호흡기_Q06',
  '내과_19Y_호흡기_Q07',
  '내과_19Y_호흡기_Q08',
  '내과_19Y_호흡기_Q09',
  '내과_19Y_호흡기_Q10',
  '내과_20Y_Q01',
  '내과_20Y_Q03',
  '내과_20Y_Q05',
  '내과_20Y_Q06',
  '내과_20Y_Q08',
  '내과_20Y_Q11',
  '내과_20Y_Q12',
  '내과_20Y_Q14',
  '내과_20Y_Q15',
  '내과_20Y_Q17',
  '내과_20Y_Q25',
  '내과_20Y_Q28',
  '내과_20Y_Q32',
  '내과_20Y_Q33',
  '내과_20Y_Q39',
  '내과_20Y_Q44',
  '내과_20Y_Q45',
  '내과_20Y_Q46',
  '내과_20Y_Q47',
  '내과_20Y_Q51',
  '내과_20Y_Q52',
  '내과_20Y_Q53',
  '내과_21Y_Q01',
  '내과_21Y_Q03',
  '내과_21Y_Q04',
  '내과_21Y_Q05',
  '내과_21Y_Q06',
  '내과_21Y_Q07',
  '내과_21Y_Q09',
  '내과_21Y_Q11',
  '내과_21Y_Q12',
  '내과_21Y_Q13',
  '내과_21Y_Q16',
  '내과_21Y_Q17',
  '내과_21Y_Q18',
  '내과_21Y_Q19',
  '내과_21Y_Q20',
  '내과_21Y_Q21',
  '내과_21Y_Q22',
  '내과_21Y_Q23',
  '내과_21Y_Q25',
  '내과_21Y_Q27',
  '내과_21Y_Q28',
  '내과_21Y_Q29',
  '내과_21Y_Q30',
  '내과_21Y_Q31',
  '내과_21Y_Q34',
  '내과_21Y_Q35',
  '내과_21Y_Q36',
  '내과_21Y_Q37',
  '내과_21Y_Q38',
  '내과_21Y_Q42',
  '내과_21Y_Q45',
  '내과_21Y_Q46',
  '내과_21Y_Q47',
  '내과_21Y_Q50',
  '내과_21Y_Q51',
  '내과_21Y_Q52',
  '내과_21Y_Q53',
  '내과_21Y_Q55',
  '내과_21Y_Q57',
  '내과_22Y_Q01',
  '내과_22Y_Q02',
  '내과_22Y_Q03',
  '내과_22Y_Q04',
  '내과_22Y_Q05',
  '내과_22Y_Q06',
  '내과_22Y_Q07',
  '내과_22Y_Q08',
  '내과_22Y_Q09',
  '내과_22Y_Q13',
  '내과_22Y_Q17',
  '내과_22Y_Q20',
  '내과_22Y_Q21',
  '내과_22Y_Q22',
  '내과_22Y_Q23',
  '내과_22Y_Q26',
  '내과_22Y_Q28',
  '내과_22Y_Q29',
  '내과_22Y_Q30',
  '내과_22Y_Q33',
  '내과_22Y_Q35',
  '내과_22Y_Q38',
  '내과_22Y_Q41',
  '내과_22Y_Q44',
  '내과_22Y_Q47',
  '내과_22Y_Q49',
  '내과_22Y_Q50',
  '내과_22Y_Q51',
  '내과_22Y_Q52',
  '내과_22Y_Q53',
  '내과_22Y_Q54',
  '내과_22Y_Q56',
  '내과_22Y_Q58',
  '내과_22Y_Q59',
  '내과_22Y_Q60',
  '내과_23Y_Q03',
  '내과_23Y_Q05',
  '내과_23Y_Q06',
  '내과_23Y_Q07',
  '내과_23Y_Q08',
  '내과_23Y_Q13',
  '내과_23Y_Q19',
  '내과_23Y_Q20',
  '내과_23Y_Q21',
  '내과_23Y_Q22',
  '내과_23Y_Q24',
  '내과_23Y_Q25',
  '내과_23Y_Q26',
  '내과_23Y_Q28',
  '내과_23Y_Q33',
  '내과_23Y_Q34',
  '내과_23Y_Q35',
  '내과_23Y_Q38',
  '내과_23Y_Q46',
  '내과_23Y_Q49',
  '내과_23Y_Q51',
  '내과_23Y_Q52',
  '내과_23Y_Q53',
  '내과_23Y_Q54',
  '내과_23Y_Q55',
  '내과_23Y_Q58',
  '내과_23Y_Q60',
  '내과_26Y_Q18',
  '내과_26Y_Q22',
  '내과_26Y_Q30',
  '내과_26Y_Q31',
  '내과_26Y_Q35',
  '내과_26Y_Q40',
  '내과_26Y_Q44',
  '내과_26Y_Q45',
  '내과_26Y_Q59',
  '산부인과_19Y_Q05',
  '산부인과_19Y_Q13',
  '산부인과_19Y_Q35',
  '산부인과_19Y_Q36',
  '산부인과_19Y_Q44',
  '산부인과_19Y_Q50',
  '산부인과_19Y_Q57',
  '산부인과_19Y_Q74',
  '산부인과_19Y_Q75',
  '산부인과_19Y_Q80',
  '산부인과_19Y_Q91',
  '산부인과_20Y_부인과_Q23',
  '산부인과_22Y_Q16',
  '산부인과_22Y_Q20',
  '산부인과_23Y_Q04',
  '산부인과_23Y_Q06',
  '산부인과_23Y_Q14',
  '산부인과_26Y_Q02',
  '산부인과_26Y_Q06',
  '산부인과_26Y_Q08',
  '산부인과_26Y_Q09',
  '산부인과_26Y_Q10',
  '산부인과_26Y_Q20',
  '산부인과_26Y_Q21',
  '산부인과_26Y_Q30',
  '산부인과_26Y_Q57',
  '소아청소년과_20Y_Q32',
  '소아청소년과_20Y_Q40',
  '소아청소년과_22Y_Q04',
  '소아청소년과_22Y_Q05',
  '소아청소년과_22Y_Q06',
  '소아청소년과_22Y_Q08',
  '소아청소년과_22Y_Q09',
  '소아청소년과_22Y_Q10',
  '소아청소년과_22Y_Q13',
  '소아청소년과_22Y_Q15',
  '소아청소년과_22Y_Q20',
  '소아청소년과_22Y_Q22',
  '소아청소년과_22Y_Q24',
  '소아청소년과_22Y_Q27',
  '소아청소년과_22Y_Q28',
  '소아청소년과_22Y_Q30',
  '소아청소년과_22Y_Q32',
  '소아청소년과_22Y_Q33',
  '소아청소년과_22Y_Q37',
  '소아청소년과_22Y_Q40',
  '소아청소년과_22Y_Q44',
  '소아청소년과_22Y_Q47',
  '소아청소년과_22Y_Q48',
  '소아청소년과_22Y_Q49',
  '소아청소년과_23Y_Q11',
  '소아청소년과_23Y_Q14',
  '소아청소년과_23Y_Q18',
  '소아청소년과_23Y_Q22',
  '소아청소년과_23Y_Q23',
  '소아청소년과_23Y_Q37',
  '소아청소년과_23Y_Q38',
  '소아청소년과_23Y_Q39',
  '소아청소년과_23Y_Q42',
  '소아청소년과_26Y_Q01',
  '소아청소년과_26Y_Q02',
  '소아청소년과_26Y_Q13',
  '소아청소년과_26Y_Q38',
  '신경과_19Y_Q02',
  '신경과_19Y_Q14',
  '신경과_19Y_Q17',
  '신경과_19Y_Q36',
  '신경과_20Y_Q17',
  '신경과_21Y_Q06',
  '신경과_21Y_Q17',
  '신경과_22Y_Q09',
  '신경과_22Y_Q32',
  '신경과_22Y_Q37',
  '신경과_26Y_Q03',
  '신경과_26Y_Q06',
  '신경과_26Y_Q07',
  '신경과_26Y_Q08',
  '신경과_26Y_Q09',
  '신경과_26Y_Q10',
  '신경과_26Y_Q11',
  '신경과_26Y_Q13',
  '신경과_26Y_Q20',
  '신경과_26Y_Q22',
  '신경과_26Y_Q32',
  '신경과_26Y_Q36',
  '신경과_26Y_Q37',
  '신경과_26Y_Q38',
  '신경과_26Y_Q41',
  '신경과_26Y_Q42',
  '영상의학과_19Y_Q45',
  '영상의학과_19Y_Q50',
  '영상의학과_20Y_Q07',
  '영상의학과_20Y_Q23',
  '영상의학과_20Y_Q24',
  '영상의학과_20Y_Q27',
  '영상의학과_20Y_Q28',
  '영상의학과_20Y_Q40',
  '영상의학과_21Y_Q03',
  '영상의학과_21Y_Q04',
  '영상의학과_21Y_Q25',
  '영상의학과_21Y_Q27',
  '영상의학과_21Y_Q42',
  '영상의학과_22Y_Q12',
  '영상의학과_22Y_Q39',
  '영상의학과_22Y_Q44',
  '영상의학과_23Y_Q21',
  '영상의학과_23Y_Q26',
  '영상의학과_23Y_Q33',
  '영상의학과_23Y_Q34',
  '영상의학과_23Y_Q46',
  '영상의학과_23Y_Q48',
  '영상의학과_26Y_Q07',
  '영상의학과_26Y_Q14',
  '영상의학과_26Y_Q32',
  '영상의학과_26Y_Q33',
  '영상의학과_26Y_Q37',
  '영상의학과_26Y_Q44',
  '영상의학과_26Y_Q45',
  '외과_19Y_Q11',
  '외과_22Y_Q02',
  '외과_22Y_Q07',
  '정신건강의학과_19Y_Q04',
  '정신건강의학과_19Y_Q08',
  '정신건강의학과_19Y_Q19',
  '정신건강의학과_19Y_Q22',
  '정신건강의학과_19Y_Q35',
  '정신건강의학과_21Y_Q38',
  '정형외과_19Y_Q11',
  '정형외과_20Y_Q02',
  '정형외과_21Y_Q08',
  '정형외과_21Y_Q16',
  '정형외과_22Y_Q01',
  '정형외과_22Y_Q02',
  '정형외과_22Y_Q04',
  '정형외과_22Y_Q05',
  '정형외과_22Y_Q06',
  '정형외과_22Y_Q07',
  '정형외과_22Y_Q08',
  '정형외과_22Y_Q09',
  '정형외과_22Y_Q10',
  '정형외과_22Y_Q12',
  '정형외과_22Y_Q24',
  '정형외과_22Y_Q28',
  '정형외과_22Y_Q29',
  '정형외과_22Y_Q31',
  '정형외과_22Y_Q32',
  '정형외과_22Y_Q33',
  '정형외과_22Y_Q38',
  '정형외과_22Y_Q39',
  '정형외과_22Y_Q45',
  '정형외과_22Y_Q47',
  '정형외과_23Y_Q02',
  '정형외과_23Y_Q04',
  '정형외과_23Y_Q06',
  '정형외과_23Y_Q07',
  '정형외과_23Y_Q10',
  '정형외과_23Y_Q12',
  '정형외과_23Y_Q13',
  '정형외과_23Y_Q14',
  '정형외과_23Y_Q16',
  '정형외과_23Y_Q29',
  '정형외과_23Y_Q31',
  '정형외과_23Y_Q35',
  '정형외과_23Y_Q36',
  '정형외과_23Y_Q37',
  '정형외과_23Y_Q38',
  '정형외과_23Y_Q39',
  '정형외과_23Y_Q42',
  '정형외과_23Y_Q45',
  '정형외과_23Y_Q48',
  '정형외과_23Y_Q49',
  '정형외과_23Y_Q52',
  '정형외과_23Y_Q54',
  '정형외과_23Y_Q55',
  '정형외과_23Y_Q56',
  '정형외과_23Y_Q58',
  '정형외과_26Y_Q01',
  '정형외과_26Y_Q16',
  '정형외과_26Y_Q39',
  '진단검사의학과_21Y_수혈_Q04',
  '진단검사의학과_21Y_수혈_Q06',
  '진단검사의학과_22Y_Q16',
  '진단검사의학과_22Y_Q22',
  '진단검사의학과_22Y_Q27',
  '진단검사의학과_26Y_Q01'
  ]);
  for (const [rid, rep] of reportMap.entries()) {
    if (resolvedReportIds.has(rid) || resolvedQuestionIds.has(rep.questionId)) {
      rep.status = 'resolved';
      rep.resolvedAt = rep.resolvedAt || new Date().toISOString();
      if (rep.questionId === '소아청소년과_22Y_Q44') {
        rep.resolutionNote = '22Y 44번 원본 5지선다 복원 및 정답 ③ PDA(대형 좌-우 단락에 의한 심첨부 확장기잡음 및 P2 항진) 교정 완료';
      } else if (rep.questionId === '소아청소년과_26Y_Q38') {
        rep.resolutionNote = '출제 답안(② 머리 비율)과 교과서적 복수정답(③ 체표면적 비율) 감별 가이드라인 해설 추가 완료';
      } else if (rep.questionId === '소아청소년과_23Y_Q39') {
        rep.resolutionNote = '정답 ⑤(검사없이 추적관찰) 수정 및 단순 조기 유방 발육증 진단기준 해설 정렬 완료';
      } else if (rep.questionId === '소아청소년과_23Y_Q42') {
        rep.resolutionNote = '정답 ①(성장호르몬 결핍증) 및 원본 발문(아버지는 중학교 때 키가 컸고 어머니 초경 연령은 13세였다. 진단은?) 복원 및 상세 해설 완료';
      } else if (rep.questionId === '영상의학과_26Y_Q07') {
        rep.resolutionNote = '활동성 폐결핵 X-ray에 대한 [옳지 않은 것] 부정형 문제 강조 및 ① 폐암 의심 정답 해설 보강 완료';
      } else if (rep.questionId === '내과_26Y_Q31') {
        rep.resolutionNote = '정답 ERCP 수정(선지 1칸 밀림 교정) 및 PTBD 2차 요법 감별 해설 정렬 완료';
      } else if (rep.questionId === '내과_21Y_Q30') {
        rep.resolutionNote = '발문/선지 오표기 문구 정리 및 EST & Basket 담석제거술 표준 해설 완료';
      } else if (rep.questionId === '내과_23Y_Q33') {
        rep.resolutionNote = '심전도 사진 상하 2분할 통합 및 만성신부전 고칼륨혈증 임상 해설·트리거 교정 완료';
      } else if (rep.questionId === '내과_23Y_Q26') {
        rep.resolutionNote = '정답 ③(IBS-C 변비형 식이섬유 권장) 수정 및 IBS-C 진단기준·식이요법 해설 전면 교정 완료';
      } else if (rep.questionId === '내과_23Y_Q25') {
        rep.resolutionNote = '정답 ③(임상적으로 국소 진행암) 수정 및 선지 감별 해설 정렬 완료';
      } else if (rep.questionId === '내과_23Y_Q07') {
        rep.resolutionNote = '심초음파 사진 상하 2분할 통합 및 단일 고화질 이미지 배치 완료';
      } else if (rep.questionId === '내과_26Y_Q45') {
        rep.resolutionNote = '해설 선지 번호 및 비타민D 표기(25(OH)D, 1,25(OH)2D) 누락 교정 완료';
      } else if (rep.questionId === '정형외과_23Y_Q45') {
        rep.resolutionNote = '무릎 X-ray 상하 2분할 사진을 1440x1046 단일 고화질 이미지로 수직 통합 및 캐시 갱신 완료';
      } else if (rep.questionId === '정형외과_22Y_Q07') {
        rep.resolutionNote = '선지 내 힌트 문구 제거 및 5지선다 정렬 완료';
      } else if (rep.questionId === '정형외과_23Y_Q38') {
        rep.resolutionNote = '4개 신체진찰 사진을 개별 선지 카드(image-option-card)로 분리 및 4지선다 이미지 선지 UI 구현 완료';
      } else if (rep.questionId === '정형외과_23Y_Q37') {
        rep.resolutionNote = '슬관절 검사 사진 1440x1213 단일 통합 고화질 이미지 교정 및 캐시 갱신 완료';
      } else if (rep.questionId === '정형외과_23Y_Q36') {
        rep.resolutionNote = 'Lachman 검사 사진 1440x939 단일 통합 고화질 이미지 교정 및 캐시 갱신 완료';
      } else if (rep.questionId === '정형외과_23Y_Q06') {
        rep.resolutionNote = '정답 ③(요골관 증후군) 수정 및 저항성 회외전 검사·Arcade of Frohse 후골간신경 포착 심층 해설 추가 완료';
      } else if (rep.questionId === '산부인과_23Y_Q04') {
        rep.resolutionNote = '원본 시험지 사진 미수록 문항 안내 문구 및 32주 이전 중증 양수과다증 인도메타신 표준 치료 해설 보강 완료';
      } else if (rep.questionId === '산부인과_23Y_Q06') {
        rep.resolutionNote = '임신 중 모체 혈역학 생리(총 혈액량 32~34주 정점 후 분만까지 고평부 유지) 표준 해설 완료';
      } else if (rep.questionId === '산부인과_23Y_Q14') {
        rep.resolutionNote = '거대아 분만 후 자궁이완증 1차 옥시토신 투여 및 산후출혈 감별 표준 해설 완료';
      } else if (rep.questionId === '산부인과_26Y_Q57') {
        rep.resolutionNote = '내배엽동종양(Yolk sac tumor)의 Schiller-Duval body 및 Stage IA BEP 항암치료 핵심 가이드라인 교정 완료';
      } else if (['산부인과_26Y_Q02', '내과_23Y_Q46', '내과_23Y_Q52', '내과_23Y_Q54', '내과_23Y_Q55', '내과_23Y_Q60'].includes(rep.questionId)) {
        if (rep.questionId === '내과_23Y_Q60') {
          rep.resolutionNote = '2010 ACR/EULAR RA 진단 기준 표 이미지 추가 및 7점 확진 산정 해설 보강 완료';
        } else if (rep.questionId === '내과_23Y_Q55') {
          rep.resolutionNote = '누락된 DXA 골밀도 검사 소견 표(L1~L4, 대퇴골) 복원 및 T-score -2.5 이하 골다공증 판정 해설 보강 완료';
        } else if (rep.questionId === '내과_23Y_Q54') {
          rep.resolutionNote = '정답 ③(나이) 일치화 및 Harris-Benedict 식 음(-)의 계수 기초에너지요구량 해설 보강 완료';
        } else if (rep.questionId === '내과_23Y_Q52') {
          rep.resolutionNote = '정답 ③(IFG + IGT 복합 진단) 일치화 및 ADA/KDA 당뇨병 전단계 진단 기준 심층 해설 보강 완료';
        } else if (rep.questionId === '내과_23Y_Q46') {
          rep.resolutionNote = '정답 ①(MDS 고위험군 중앙생존 1년 미만) 교정 및 IPSS 진단 기준 해설 완료';
        } else {
          rep.resolutionNote = '클라우드 동기화 시스템 정상 연동 확인 완료';
        }
      } else {
        rep.resolutionNote = '발문 오분류 선지 제거 및 정답/오답 해설 1:1 정렬 수정 완료';
      }
    }
  }

  const mergedReports = Array.from(reportMap.values()).sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });

  // 2. Comments merge
  const mergedComments = { ...(serverData.comments || {}) };
  const deletedSet = new Set(clientData.deletedCommentIds || []);

  if (clientData.clientComments && typeof clientData.clientComments === 'object') {
    for (const [qId, commList] of Object.entries(clientData.clientComments)) {
      if (!Array.isArray(commList)) continue;
      const existingList = Array.isArray(mergedComments[qId]) ? mergedComments[qId] : [];
      const cMap = new Map();
      existingList.forEach(c => { if (c && c.id && !deletedSet.has(c.id)) cMap.set(c.id, c); });
      commList.forEach(c => { if (c && c.id && !deletedSet.has(c.id)) cMap.set(c.id, c); });
      mergedComments[qId] = Array.from(cMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }
  }

  if (deletedSet.size > 0) {
    for (const qId of Object.keys(mergedComments)) {
      mergedComments[qId] = mergedComments[qId].filter(c => !deletedSet.has(c.id));
      if (mergedComments[qId].length === 0) {
        delete mergedComments[qId];
      }
    }
  }

  // 3. Custom Edits & Logs
  const mergedEdits = { ...(serverData.customEdits || {}) };
  if (clientData.clientEdits && typeof clientData.clientEdits === 'object') {
    for (const [qId, editObj] of Object.entries(clientData.clientEdits)) {
      if (!editObj) continue;
      const sEdit = mergedEdits[qId];
      if (!sEdit || (editObj.timestamp || 0) >= (sEdit.timestamp || 0)) {
        mergedEdits[qId] = editObj;
      }
    }
  }

  const logMap = new Map();
  (serverData.editLogs || []).forEach(l => { if (l) logMap.set(l.id || `${l.timestamp}_${l.questionId}`, l); });
  (clientData.clientEditLogs || []).forEach(l => { if (l) logMap.set(l.id || `${l.timestamp}_${l.questionId}`, l); });
  // Purge permanently resolved questions from custom edits
  for (const qId of resolvedQuestionIds) {
    if (mergedEdits[qId]) delete mergedEdits[qId];
  }

    const mergedEditLogs = Array.from(logMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // 4. Profiles merge
  const profileMap = new Map();
  (serverData.profiles || []).forEach(p => {
    if (p && p.id) {
      profileMap.set(p.id, p);
    } else if (p && p.name) {
      profileMap.set(p.name, p);
    }
  });

  // Handle explicitly deleted profiles from client
  const deletedProfileSet = new Set(clientData.deletedProfileIds || []);
  if (deletedProfileSet.size > 0) {
    for (const [k, p] of Array.from(profileMap.entries())) {
      if (deletedProfileSet.has(p.id) || deletedProfileSet.has(k)) {
        profileMap.delete(k);
      }
    }
  }

  // Match profiles strictly by ID (name fallback only for legacy entries without an ID)
  function findExistingProfile(map, cp) {
    if (cp.id && map.has(cp.id)) return { key: cp.id, profile: map.get(cp.id) };
    if (!cp.id && cp.name) {
      const norm = cp.name.trim().toLowerCase();
      for (const [k, p] of map.entries()) {
        if (p && p.name && p.name.trim().toLowerCase() === norm) {
          return { key: k, profile: p };
        }
      }
    }
    return null;
  }

  (clientData.clientProfiles || []).forEach(cp => {
    if (!cp || (!cp.id && !cp.name)) return;
    if (deletedProfileSet.has(cp.id)) return;

    const match = findExistingProfile(profileMap, cp);
    if (!match) {
      profileMap.set(cp.id || cp.name, cp);
    } else {
      const { key, profile: sp } = match;
      const useCpForPosition = Number(cp.updatedAt || 0) >= Number(sp.updatedAt || 0);
      const effectiveResetAt = Math.max(Number(sp.resetAt || 0), Number(cp.resetAt || 0));

      // Merge per-question single deletions (keeps max delete timestamp per qId)
      const mergedDeletedAnswers = {};
      for (const srcDeleted of [sp.deletedAnswers, cp.deletedAnswers]) {
        if (srcDeleted && typeof srcDeleted === 'object') {
          for (const [qId, delTs] of Object.entries(srcDeleted)) {
            const tsNum = Number(delTs || 0);
            if (tsNum >= effectiveResetAt && tsNum > (mergedDeletedAnswers[qId] || 0)) {
              mergedDeletedAnswers[qId] = tsNum;
            }
          }
        }
      }

      // Handle profile reset and answer-level timestamp merge safely
      const mergedAnswers = {};
      const allAnswerSources = [sp.userAnswers, cp.userAnswers];
      allAnswerSources.forEach(src => {
        if (!src || typeof src !== 'object') return;
        for (const [qId, ans] of Object.entries(src)) {
          if (!ans) continue;
          const ansTime = Number(ans.timestamp || 0);
          if (effectiveResetAt > 0 && ansTime < effectiveResetAt) continue;
          if ((mergedDeletedAnswers[qId] || 0) > ansTime) continue;
          const existing = mergedAnswers[qId];
          if (!existing || ansTime >= Number(existing.timestamp || 0)) {
            mergedAnswers[qId] = ans;
          }
        }
      });

      // Union merge of bookmarks across devices
      const mergedBookmarks = Array.from(new Set([
        ...(Array.isArray(sp.bookmarks) ? sp.bookmarks : []),
        ...(Array.isArray(cp.bookmarks) ? cp.bookmarks : [])
      ]));

      // Merge subject map taking the latest position per subject
      const mergedSubjectMap = { ...(sp.lastSubjectMap || {}) };
      if (cp.lastSubjectMap && typeof cp.lastSubjectMap === 'object') {
        for (const [sub, cVal] of Object.entries(cp.lastSubjectMap)) {
          if (!mergedSubjectMap[sub] || useCpForPosition) {
            mergedSubjectMap[sub] = cVal;
          }
        }
      }

      const newerTime = Math.max(Number(sp.updatedAt || 0), Number(cp.updatedAt || 0)) || Date.now();

      profileMap.set(key, {
        id: sp.id || cp.id,
        name: cp.name || sp.name,
        avatar: cp.avatar || sp.avatar || '🩺',
        userAnswers: mergedAnswers,
        deletedAnswers: mergedDeletedAnswers,
        bookmarks: mergedBookmarks,
        lastQuestionId: useCpForPosition ? (cp.lastQuestionId !== undefined ? cp.lastQuestionId : sp.lastQuestionId) : (sp.lastQuestionId !== undefined ? sp.lastQuestionId : cp.lastQuestionId),
        lastSubjectMap: mergedSubjectMap,
        filters: useCpForPosition ? (cp.filters || sp.filters) : (sp.filters || cp.filters),
        shuffleOptions: cp.shuffleOptions !== undefined ? cp.shuffleOptions : sp.shuffleOptions,
        resetAt: effectiveResetAt,
        createdAt: sp.createdAt || cp.createdAt || Date.now(),
        updatedAt: newerTime
      });
    }
  });

  // Clear stale answers for permanently corrected questions across all profiles
  for (const p of profileMap.values()) {
    if (p.userAnswers && p.userAnswers['소아청소년과_23Y_Q39']) {
      delete p.userAnswers['소아청소년과_23Y_Q39'];
    }
  }

    return {
    reports: mergedReports,
    comments: mergedComments,
    customEdits: mergedEdits,
    editLogs: mergedEditLogs,
    profiles: Array.from(profileMap.values()),
    syncedAt: new Date().toISOString()
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const current = await fetchGistData();
      return res.status(200).json({ success: true, ...current });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const current = await fetchGistData();
      const merged = mergeData(current, body);

      // Save merged state to GitHub Gist (zero Vercel Blob usage)
      await saveGistData(merged);

      return res.status(200).json({ success: true, ...merged });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Error in /api/sync:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
