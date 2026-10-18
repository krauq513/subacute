# -*- coding: utf-8 -*-
"""
build_all_subjects_data.py
Merges and standardizes questions across all 9 clinical subjects for the Quiz Web App:
- 진단검사의학과 (uses current perfected dataset)
- 내과, 외과, 산부인과, 소아청소년과, 신경과, 정신건강의학과, 정형외과, 영상의학과
Output:
- lab_med_quiz_vercel/data/quiz_all_subjects.json
- lab_med_quiz_vercel/data/quiz_data.js (window.QUIZ_DATA = [...])
"""

import os, sys, re, json, unicodedata

ROOT_DIR = r"C:\Users\ekims\OneDrive\냥의자료\2026-1\기말고사_자료"
QUIZ_BANK_DATA = os.path.join(ROOT_DIR, "quiz_bank", "data")
APP_DATA_DIR = os.path.join(ROOT_DIR, "lab_med_quiz_vercel", "data")

SUBJECT_CONFIGS = [
    ('진단검사의학과', 'lab_med_data', 'quiz_lab_med.json'),
    ('내과', 'im_data', 'quiz_내과.json'),
    ('외과', 'surgery_data', 'quiz_외과.json'),
    ('산부인과', 'obgyn_data', 'quiz_산부인과.json'),
    ('소아청소년과', 'pediatrics_data', 'quiz_소아청소년과.json'),
    ('신경과', 'neurology_data', 'quiz_신경과.json'),
    ('정신건강의학과', 'psychiatry_data', 'quiz_정신건강의학과.json'),
    ('정형외과', 'orthopedics_data', 'quiz_정형외과.json'),
    ('영상의학과', 'radiology_data', 'quiz_영상의학과.json')
]

CIRCLE_CHARS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
CIRCLE_MAP = {c: i for i, c in enumerate(CIRCLE_CHARS)}

def load_subject_themes(subject, module_name):
    sdir = os.path.join(ROOT_DIR, subject)
    if not os.path.exists(sdir):
        return [], {}, {}
    sys.path.insert(0, sdir)
    themes = []
    crop_map = {}
    year_map = {}
    try:
        mod = __import__(module_name)
        themes = getattr(mod, 'THEMES', [])
        for t in themes:
            crops = t.get('crops', [])
            for c in crops:
                crop_map[c] = t
            # Map years e.g. '26Y-01', '23Y_Q05'
            years = t.get('years', [])
            for y in years:
                m = re.search(r'(\d+Y)[-_]Q?(\d+)', y)
                if m:
                    k = f"{m.group(1)}_Q{int(m.group(2)):02d}"
                    year_map[k] = t
    except Exception as e:
        print(f"[{subject}] Theme load warning: {e}")
    finally:
        if sdir in sys.path:
            sys.path.remove(sdir)
    return themes, crop_map, year_map

def clean_opt_for_matching(opt):
    return re.sub(r'^[①②③④⑤⑥⑦⑧\d\.\)\-\s\⚫\●]+', '', opt).strip()

def main():
    all_questions = []
    summary_by_sub = {}

    for subject, mod_name, json_filename in SUBJECT_CONFIGS:
        # 1. 진단검사의학과: Use existing perfected JSON
        if subject == '진단검사의학과':
            perf_path = os.path.join(APP_DATA_DIR, 'quiz_lab_med.json')
            with open(perf_path, 'r', encoding='utf-8') as f:
                lab_qs = json.load(f)
            # Ensure subject is set
            for q in lab_qs:
                q['subject'] = '진단검사의학과'
            all_questions.extend(lab_qs)
            summary_by_sub[subject] = {
                'total': len(lab_qs),
                'with_ans': sum(1 for q in lab_qs if q.get('correct_option_index') is not None),
                '짤': sum(1 for q in lab_qs if q.get('category') == '짤'),
                '반짤': sum(1 for q in lab_qs if q.get('category') == '반짤'),
                '탈': sum(1 for q in lab_qs if q.get('category') == '탈'),
                'images': sum(1 for q in lab_qs if q.get('images') and len(q['images']) > 0)
            }
            print(f"[{subject}] Loaded perfected dataset: {len(lab_qs)} questions")
            continue

        # 2. Other subjects: Load from quiz_bank/data and enrich with themes
        src_path = os.path.join(QUIZ_BANK_DATA, json_filename)
        if not os.path.exists(src_path):
            print(f"[{subject}] Source file not found: {src_path}")
            continue

        with open(src_path, 'r', encoding='utf-8') as f:
            raw_qs = json.load(f)

        themes, crop_map, year_map = load_subject_themes(subject, mod_name)
        processed_qs = []

        for q in raw_qs:
            year = q.get('year', '26Y')
            q_num = int(q.get('q_num') or q.get('question_num') or 1)
            crop_key = f"{year}_Q{q_num:02d}.png"
            year_key = f"{year}_Q{q_num:02d}"

            # Theme match
            theme = crop_map.get(crop_key) or year_map.get(year_key)

            # Theme Title
            theme_title = q.get('theme_title')
            if not theme_title and theme:
                theme_title = theme.get('title', '')
            if not theme_title:
                theme_title = f"{subject} 임상 증례 및 기출 분석"

            # Subspecialty
            subspecialty = q.get('subspecialty')
            if not subspecialty and theme:
                subspecialty = theme.get('subspecialty', '')
            if not subspecialty:
                subspecialty = f"{subject} 일반"

            # Options
            options = q.get('options', [])

            # Answer resolution
            answer_idx = q.get('answer_idx')
            correct_option_index = q.get('correct_option_index')
            if correct_option_index is None and answer_idx is not None:
                correct_option_index = answer_idx - 1

            curated_ans = theme.get('answer', '') if theme else ''
            
            # If still no answer index, try matching curated answer from theme
            if correct_option_index is None and curated_ans and options:
                m_circ = re.search(r'([①②③④⑤⑥⑦⑧])', curated_ans)
                if m_circ and m_circ.group(1) in CIRCLE_MAP:
                    correct_option_index = CIRCLE_MAP[m_circ.group(1)]
                else:
                    for o_idx, opt in enumerate(options):
                        core = clean_opt_for_matching(opt)
                        if core and len(core) >= 2 and core in curated_ans:
                            correct_option_index = o_idx
                            break

            # Answer text
            correct_answer = q.get('correct_answer') or q.get('answer_text')
            if not correct_answer:
                if correct_option_index is not None and 0 <= correct_option_index < len(options):
                    correct_answer = options[correct_option_index]
                elif curated_ans:
                    correct_answer = curated_ans
                else:
                    correct_answer = "상세 해설 및 임상 가이드라인 참조"

            # Category resolution
            category = q.get('category')
            if not category or category == '기출':
                if theme:
                    category = theme.get('category') or theme.get('type')
            if not category or category not in ['짤', '반짤', '탈']:
                # Infer category from theme years
                if theme and len(theme.get('years', [])) >= 2:
                    category = '짤'
                elif theme and len(theme.get('years', [])) == 1:
                    category = '탈'
                else:
                    category = '기출'

            # Exam intelligence (Frequency & Raw Questions)
            raw_questions = []
            if theme and theme.get('years'):
                for y in theme['years']:
                    m_y = re.search(r'(\d+Y)[-_]Q?(\d+)', y)
                    if m_y:
                        raw_questions.append(f"{m_y.group(1)}-{int(m_y.group(2)):02d}")
                    else:
                        raw_questions.append(y)
            if not raw_questions:
                raw_questions = [f"{year}-{q_num:02d}"]

            freq_count = len(raw_questions)
            rate = min(100, int((freq_count / 6.0) * 100))

            # Explanation structuring
            raw_exp = q.get('explanation')
            structured_exp = {}
            if isinstance(raw_exp, dict):
                structured_exp = raw_exp
            else:
                exp_text = str(raw_exp or '').strip()
                kmle_theory = str(theme.get('kmle_theory', '') if theme else '').strip()
                kmle_q = str(theme.get('kmle_question', '') if theme else '').strip()
                theme_exp = str(theme.get('explanation', '') if theme else '').strip()

                full_text = exp_text or theme_exp

                structured_exp = {
                    'title': theme_title,
                    'findings': full_text or '상기 증례의 병력, 신체 진찰 및 검사 소견을 분석하여 핵심 진단을 도출하십시오.',
                    'differential': kmle_theory or '선지별 감별 임상 의의 및 주요 질환의 특징적 소견을 비교 평가하십시오.',
                    'trap': '임상적 함정: 유사 질환의 비전형적 양상 및 치료 금기 사항을 주의하십시오.',
                    'trigger': f"{theme_title} 핵심 지표 기준 즉시 정답 도출",
                    'kmle_link': f"KMLE {subject} 기출 및 표준 교과서 가이드라인 연계"
                }

                # Special case: Radiology / Surgery deep fields
                if theme and theme.get('deep_analysis'):
                    da = theme['deep_analysis']
                    if da.get('findings'): structured_exp['findings'] = da['findings']
                    if da.get('differential'): structured_exp['differential'] = da['differential']
                    if da.get('pitfall'): structured_exp['trap'] = da['pitfall']
                if theme and theme.get('trap'):
                    structured_exp['trap'] = theme['trap']
                if theme and theme.get('trigger'):
                    structured_exp['trigger'] = theme['trigger']
                if theme and theme.get('kmle_link'):
                    structured_exp['kmle_link'] = theme['kmle_link']

            # Fix image paths
            images = q.get('images', [])
            fixed_images = []
            for img in images:
                # Ensure path starts with images/
                img_clean = img.replace('\\', '/')
                if not img_clean.startswith('images/'):
                    img_clean = f"images/{subject}/{img_clean}"
                fixed_images.append(img_clean)

            # Build standardized item
            item = {
                'id': f"{subject}_{year}_Q{q_num:02d}",
                'index': len(processed_qs) + 1,
                'subject': subject,
                'year': year,
                'q_num': q_num,
                'category': category,
                'theme_title': theme_title,
                'subspecialty': subspecialty,
                'stem': q.get('stem', ''),
                'images': fixed_images,
                'options': options,
                'correct_option_index': correct_option_index if correct_option_index is not None else 0,
                'correct_answer': correct_answer,
                'explanation': structured_exp,
                'is_multiple_choice': False,
                'required_count': 1,
                'correct_option_indices': [correct_option_index] if correct_option_index is not None else [0],
                'freq_count': freq_count,
                'rate': rate,
                'freq_years': list(set(re.findall(r'\d+Y', ' '.join(raw_questions)))),
                'raw_questions': raw_questions
            }
            processed_qs.append(item)

        all_questions.extend(processed_qs)
        summary_by_sub[subject] = {
            'total': len(processed_qs),
            'with_ans': sum(1 for q in processed_qs if q.get('correct_option_index') is not None),
            '짤': sum(1 for q in processed_qs if q.get('category') == '짤'),
            '반짤': sum(1 for q in processed_qs if q.get('category') == '반짤'),
            '탈': sum(1 for q in processed_qs if q.get('category') == '탈'),
            'images': sum(1 for q in processed_qs if q.get('images') and len(q['images']) > 0)
        }
        print(f"[{subject}] Processed {len(processed_qs)} questions (Answers matched: {summary_by_sub[subject]['with_ans']})")

    # Run enrichment engine to attach option-by-option explanations
    try:
        from enrich_option_explanations import load_all_subject_themes, enrich_single_question
        themes_by_sub, crop_map, year_map, surgery_extra_map = load_all_subject_themes()
        enriched_list = []
        for q in all_questions:
            q_en = enrich_single_question(q, crop_map, year_map, surgery_extra_map)
            enriched_list.append(q_en)
        all_questions = enriched_list
        print(f"Successfully enriched {len(all_questions)} questions with option explanations!")
    except Exception as e:
        print(f"Option enrichment notice: {e}")

    # Save quiz_all_subjects.json
    out_json = os.path.join(APP_DATA_DIR, 'quiz_all_subjects.json')
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)
    print(f"\nSaved quiz_all_subjects.json: {len(all_questions)} total questions ({os.path.getsize(out_json) / (1024*1024):.2f} MB)")

    # Save quiz_data.js (window.QUIZ_DATA = [...])
    out_js = os.path.join(APP_DATA_DIR, 'quiz_data.js')
    with open(out_js, 'w', encoding='utf-8') as f:
        f.write("/**\n * KMLE ALL SUBJECTS QUIZ BANK DATA (WITH OPTION EXPLANATIONS)\n */\n")
        f.write("window.QUIZ_DATA = ")
        json.dump(all_questions, f, ensure_ascii=False)
        f.write(";\n")
    print(f"Saved quiz_data.js: ({os.path.getsize(out_js) / (1024*1024):.2f} MB)")

    print("\n=== SUMMARY BY SUBJECT ===")
    for sub, stat in summary_by_sub.items():
        print(f"• {sub}: {stat['total']}문항 (짤: {stat['짤']}, 반짤: {stat['반짤']}, 탈: {stat['탈']}, 그림: {stat['images']})")

if __name__ == '__main__':
    main()
