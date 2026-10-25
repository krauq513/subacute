# -*- coding: utf-8 -*-
"""
sync_expl_db_to_web.py
Synchronizes charm_v4.2 gold-standard hand-written clinical explanations (expl_db)
to the Web App and Quiz Bank datasets:
- lab_med_quiz_vercel/data/quiz_all_subjects.json
- lab_med_quiz_vercel/data/quiz_data.js
- lab_med_quiz_vercel/data/quiz_lab_med.json
- quiz_bank/data/quiz_all_subjects.json
- quiz_bank/data/quiz_data.js
- quiz_bank/data/quiz_<과목>.json (for all 9 subjects)
"""

import os, sys, json, re, shutil

ROOT_DIR = r"C:\Users\ekims\OneDrive\냥의자료\2026-1\기말고사_자료"
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import explain_db
import v43_fixes
import medical_option_enricher as moe

VERCEL_DATA_DIR = os.path.join(ROOT_DIR, "lab_med_quiz_vercel", "data")
QUIZ_BANK_DATA_DIR = os.path.join(ROOT_DIR, "quiz_bank", "data")

SUBJECT_CONFIGS = [
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

CIRCLE_CHARS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
CIRCLE_MAP = {c: i for i, c in enumerate(CIRCLE_CHARS)}

def sanitize_text(text):
    if not text:
        return ""
    # Never use consecutive hyphens
    s = str(text).replace("--", "~")
    return s.strip()

def clean_option_text(opt):
    text = re.sub(r'^[①②③④⑤⑥⑦⑧⑨⑩\d\.\)\-\s\⚫\●\*]+', '', str(opt)).strip()
    return sanitize_text(text)

def extract_option_num(opt, default_idx):
    m = re.match(r'^([①②③④⑤⑥⑦⑧⑨⑩]|\d+[\.\)])', str(opt).strip())
    if m:
        return m.group(1).strip()
    if 0 <= default_idx < len(CIRCLE_CHARS):
        return CIRCLE_CHARS[default_idx]
    return f"{default_idx + 1}."

def clean_general_guideline(differential_text):
    if not differential_text or '【핵심 감별 및 임상 가이드라인】' not in differential_text:
        return ""
    parts = differential_text.split('【핵심 감별 및 임상 가이드라인】')
    for p in reversed(parts[1:]):
        lines = [l.strip() for l in p.split('\n') if l.strip()]
        valid_lines = []
        for l in lines:
            if re.match(r'^[•\-\*\s]*[①②③④⑤⑥⑦⑧⑨⑩\d\.]', l) and any(m in l for m in ['[정답]', '[오답]', '✓', '✗']):
                continue
            if any(bp in l for bp in ['부합하지', '결여되어 오답', '오답 선지입니다', '특징적 소견이 결여']):
                continue
            valid_lines.append(l)
        if valid_lines:
            return "\n".join(valid_lines)
    return ""

def load_subject_metadata(subject, mod_name, db):
    sdir = os.path.join(ROOT_DIR, subject)
    theme_year_to_rep = {}
    crop_to_rep = {}
    theme_map_by_rep = {}
    if os.path.exists(sdir):
        sys.path.insert(0, sdir)
        try:
            mod = __import__(mod_name)
            themes = getattr(mod, 'THEMES', [])
            for t in themes:
                years = t.get('years', [])
                crops = t.get('crops', [])
                rep_tag = None
                for y in years:
                    m = re.search(r'(\d+Y)[-_]Q?(\d+)', y)
                    if m:
                        ytag = f"{m.group(1)}-{int(m.group(2)):02d}"
                        if ytag in db:
                            rep_tag = ytag
                            break
                if rep_tag:
                    theme_map_by_rep[rep_tag] = t
                    for y in years:
                        m = re.search(r'(\d+Y)[-_]Q?(\d+)', y)
                        if m:
                            ytag = f"{m.group(1)}-{int(m.group(2)):02d}"
                            theme_year_to_rep[ytag] = rep_tag
                    for c in crops:
                        crop_to_rep[c] = rep_tag
        except Exception as e:
            print(f"[{subject}] Warning loading module {mod_name}: {e}")
        finally:
            if sdir in sys.path:
                sys.path.remove(sdir)

    # Load exported items for similarity fallback
    exp_path = os.path.join(ROOT_DIR, "expl_db", "_export", f"{subject}.json")
    db_texts = []
    if os.path.exists(exp_path):
        try:
            with open(exp_path, 'r', encoding='utf-8') as f:
                exp_items = json.load(f)
            for item in exp_items:
                key = item.get('rep_tag')
                stem = item.get('stem', '')
                opts = " ".join(item.get('options', []))
                db_texts.append((key, item, stem + " " + opts))
        except Exception as e:
            print(f"[{subject}] Warning reading export file: {e}")

    return theme_year_to_rep, crop_to_rep, theme_map_by_rep, db_texts

def parse_expl_bullets(bullets_list):
    """
    Parses bullets from expl_db:
    Format: '① option_name — reason → 정답.' or '① option_name — reason'
    """
    parsed = []
    for b in bullets_list:
        b = sanitize_text(b)
        m = re.match(r'^([①-⑳]|\d+[\.\)])\s*(.*?)\s*[—\-]\s*(.*)$', b)
        if m:
            sym = m.group(1).strip()
            name = m.group(2).strip()
            reason_raw = m.group(3).strip()
            is_corr = bool(re.search(r'(?:→\s*정답|\(정답\)|정답\.?$)', reason_raw)) or ('→ 정답' in b)
            
            # Clean reason
            clean_reason = re.sub(r'\s*[—\-]?\s*→\s*정답\.?', '', reason_raw).strip()
            clean_reason = re.sub(r'\s*\(정답\)', '', clean_reason).strip()
            clean_reason = re.sub(r'정답\.$', '', clean_reason).strip()
            clean_reason = sanitize_text(clean_reason)
            
            # Remove redundant prefix if reason starts with name + colon
            if clean_reason.startswith(name + ' :') or clean_reason.startswith(name + ' -'):
                clean_reason = clean_reason[len(name)+2:].strip()

            parsed.append({
                'sym': sym,
                'name': name,
                'reason': clean_reason,
                'is_correct': is_corr
            })
    return parsed

def sync_question(q, db, theme_year_to_rep, crop_to_rep, theme_map_by_rep, db_texts, fixes=None):
    subject = q.get('subject', '')
    year = q.get('year', '')
    q_num = int(q.get('q_num') or 0)
    tag = f"{year}-{q_num:02d}"
    crop = f"{year}_Q{q_num:02d}.png"
    if fixes and tag in fixes:
        fix = fixes[tag]
        if 'title' in fix:
            q['theme_title'] = fix['title']
        if 'stem' in fix:
            s_val = fix['stem']
            if fix.get('box'):
                s_val = s_val + "\n" + "\n".join(fix['box'])
            q['stem'] = s_val
        elif fix.get('box'):
            b_str = "\n".join(fix['box'])
            if fix['box'][0] not in q.get('stem', ''):
                q['stem'] = q.get('stem', '') + "\n" + b_str
        if 'options' in fix:
            q['options'] = list(fix['options'])
        if fix.get('clear_images'):
            q['images'] = []
        if 'images' in fix:
            q['images'] = [f"images/{subject}/{im}" for im in fix['images']]
    options = q.get('options', [])

    # Special handling for 진단검사의학과: Clean existing recursive duplication
    if subject == '진단검사의학과':
        exp = q.get('explanation')
        if not isinstance(exp, dict):
            exp = {'findings': str(exp or '')}
        old_diff = exp.get('differential', '')
        clean_gen = clean_general_guideline(old_diff) or exp.get('differential_general', '')
        clean_gen = sanitize_text(clean_gen)
        exp['differential_general'] = clean_gen
        
        opt_exps = q.get('option_explanations') or exp.get('option_explanations') or []
        diff_bullets = []
        for item in opt_exps:
            marker = "✓ [정답]" if item.get('is_correct') else "✗ [오답]"
            r = sanitize_text(item.get('reason', ''))
            item['reason'] = r
            if r:
                diff_bullets.append(f"• {item.get('opt_num')} {item.get('text')} {marker}: {r}")
            else:
                diff_bullets.append(f"• {item.get('opt_num')} {item.get('text')} {marker}")
        
        diff_text = "\n".join(diff_bullets)
        if clean_gen:
            diff_text += "\n\n【핵심 감별 및 임상 가이드라인】\n" + clean_gen
        exp['differential'] = diff_text
        exp['findings'] = sanitize_text(exp.get('findings', ''))
        exp['trap'] = sanitize_text(exp.get('trap', ''))
        exp['trigger'] = sanitize_text(exp.get('trigger', ''))
        exp['kmle_link'] = sanitize_text(exp.get('kmle_link', ''))
        exp['option_explanations'] = opt_exps
        q['option_explanations'] = opt_exps
        q['explanation'] = exp
        return 'lab_med_cleaned'

    # Find matching expl_entry in expl_db
    target_key = None
    expl_entry = None
    match_source = None

    if tag in db:
        target_key = tag
        expl_entry = db[tag]
        match_source = 'direct'
    elif tag in theme_year_to_rep and theme_year_to_rep[tag] in db:
        target_key = theme_year_to_rep[tag]
        expl_entry = db[target_key]
        match_source = 'theme_year'
    elif crop in crop_to_rep and crop_to_rep[crop] in db:
        target_key = crop_to_rep[crop]
        expl_entry = db[target_key]
        match_source = 'crop'
    else:
        # Fallback to bigram similarity
        q_text = q.get('stem', '') + " " + " ".join(options)
        best_k, best_s = None, 0.0
        for k, it, text in db_texts:
            s = explain_db._sim(q_text, text)
            if s > best_s:
                best_s = s
                best_k = k
        if best_s >= 0.40 and best_k in db:
            target_key = best_k
            expl_entry = db[target_key]
            match_source = f'sim_{best_s:.2f}'

    theme = theme_map_by_rep.get(target_key) if target_key else None
    if fixes and target_key in fixes and 'title' in fixes[target_key]:
        q['theme_title'] = fixes[target_key]['title']
    theme_title = q.get('theme_title') or (theme.get('title') if theme else f"{subject} 임상 기출 분석")

    exp = q.get('explanation')
    if not isinstance(exp, dict):
        exp = {'findings': str(exp or '')}
    exp['title'] = theme_title

    # Case A: expl_entry found in expl_db
    if expl_entry:
        bullets = expl_entry.get('bullets', [])
        parsed_bullets = parse_expl_bullets(bullets)
        
        # Key takeaway into findings
        if expl_entry.get('key'):
            exp['findings'] = sanitize_text(expl_entry['key'])
        elif not exp.get('findings') or len(exp.get('findings', '')) < 10:
            exp['findings'] = f"{theme_title} 핵심 임상 증례 소견 및 검사 판독 기준 분석"
        else:
            exp['findings'] = sanitize_text(exp['findings'])

        # Variants into differential_general
        variants = expl_entry.get('variant', [])
        if variants:
            clean_variants = [sanitize_text(v) for v in variants if sanitize_text(v)]
            exp['differential_general'] = "\n".join(clean_variants)
        else:
            exp['differential_general'] = ""

        # Build option explanations
        new_opt_exps = []
        detected_correct = []

        if not options:
            q['option_explanations'] = []
            exp['option_explanations'] = []
            exp['differential'] = "\n".join(sanitize_text(b) for b in bullets)
            if exp.get('differential_general'):
                exp['differential'] += "\n\n【핵심 감별 및 임상 가이드라인】\n" + exp['differential_general']
            q['explanation'] = exp
            return match_source

        # Match bullets with options
        for idx, opt_raw in enumerate(options):
            opt_num = extract_option_num(opt_raw, idx)
            opt_clean = clean_option_text(opt_raw)

            # Match priority:
            # 1. Circle symbol match (opt_num == b.sym or CIRCLE_MAP.get(b.sym) == idx)
            # 2. Text match (opt_clean in b.name or b.name in opt_clean)
            matched_b = None
            for b in parsed_bullets:
                if b['sym'] == opt_num or CIRCLE_MAP.get(b['sym']) == idx:
                    matched_b = b
                    break
            if not matched_b and opt_clean:
                for b in parsed_bullets:
                    if b['name'] and (b['name'] in opt_clean or opt_clean in b['name']):
                        matched_b = b
                        break

            if matched_b:
                is_corr = matched_b['is_correct']
                reason = matched_b['reason']
                tag = '정답' if is_corr else '오답 감별'
                if is_corr:
                    detected_correct.append(idx)
            else:
                # No bullet matched for this option
                is_corr = (idx == q.get('correct_option_index'))
                tag = '정답' if is_corr else '오답 감별'
                reason = moe.enrich_medical_option(opt_clean, idx, is_corr, subject, question_obj=q) or ''
                reason = sanitize_text(reason)
                if is_corr:
                    detected_correct.append(idx)

            new_opt_exps.append({
                'opt_idx': idx,
                'opt_num': opt_num,
                'text': opt_clean,
                'is_correct': is_corr,
                'tag': tag,
                'reason': reason
            })

        # Answer synchronization
        if detected_correct:
            if len(detected_correct) == 1:
                q['correct_option_index'] = detected_correct[0]
                q['correct_option_indices'] = detected_correct
                q['correct_answer'] = options[detected_correct[0]]
            else:
                q['correct_option_index'] = detected_correct[0]
                q['correct_option_indices'] = detected_correct
                q['correct_answer'] = ', '.join(options[i] for i in detected_correct)

        # Differential text formatting
        diff_bullets = []
        for item in new_opt_exps:
            marker = "✓ [정답]" if item['is_correct'] else "✗ [오답]"
            if item['reason']:
                diff_bullets.append(f"• {item['opt_num']} {item['text']} {marker}: {item['reason']}")
            else:
                diff_bullets.append(f"• {item['opt_num']} {item['text']} {marker}")

        diff_body = "\n".join(diff_bullets)
        if exp.get('differential_general'):
            exp['differential'] = diff_body + "\n\n【핵심 감별 및 임상 가이드라인】\n" + exp['differential_general']
        else:
            exp['differential'] = diff_body

        q['option_explanations'] = new_opt_exps
        exp['option_explanations'] = new_opt_exps
        
        # Clean trap and trigger
        exp['trap'] = sanitize_text(exp.get('trap') or (theme.get('trap') if theme else '') or '임상적 함정: 유사 질환의 비전형적 양상 및 치료 금기 사항을 주의하십시오.')
        exp['trigger'] = sanitize_text(expl_entry.get('key') or exp.get('trigger') or (theme.get('trigger') if theme else '') or f"{theme_title} 핵심 지표 기준 즉시 정답 도출")
        exp['kmle_link'] = sanitize_text(exp.get('kmle_link') or f"KMLE {subject} 기출 및 표준 교과서 가이드라인 연계")
        q['explanation'] = exp
        return match_source

    # Case B: expl_entry NOT found (unmatched older question)
    else:
        old_diff = exp.get('differential', '')
        clean_gen = clean_general_guideline(old_diff) or exp.get('differential_general', '')
        clean_gen = sanitize_text(clean_gen)
        exp['differential_general'] = clean_gen

        opt_exps = q.get('option_explanations') or exp.get('option_explanations') or []
        corr_idx = q.get('correct_option_index')
        new_opt_exps = []

        for idx, opt_raw in enumerate(options):
            opt_num = extract_option_num(opt_raw, idx)
            opt_clean = clean_option_text(opt_raw)
            is_corr = (idx == corr_idx)
            
            # Find existing reason if clean
            existing_reason = ""
            for item in opt_exps:
                if item.get('opt_idx') == idx or item.get('opt_num') == opt_num:
                    r = item.get('reason', '')
                    if not any(bp in r for bp in ['부합하지', '결여되어 오답', '오답 선지입니다']):
                        existing_reason = r
                    break
            
            if not existing_reason:
                existing_reason = moe.enrich_medical_option(opt_clean, idx, is_corr, subject, question_obj=q) or ''
            
            existing_reason = sanitize_text(existing_reason)
            tag = '정답' if is_corr else '오답 감별'

            new_opt_exps.append({
                'opt_idx': idx,
                'opt_num': opt_num,
                'text': opt_clean,
                'is_correct': is_corr,
                'tag': tag,
                'reason': existing_reason
            })

        diff_bullets = []
        for item in new_opt_exps:
            marker = "✓ [정답]" if item['is_correct'] else "✗ [오답]"
            if item['reason']:
                diff_bullets.append(f"• {item['opt_num']} {item['text']} {marker}: {item['reason']}")
            else:
                diff_bullets.append(f"• {item['opt_num']} {item['text']} {marker}")

        diff_body = "\n".join(diff_bullets)
        if clean_gen:
            exp['differential'] = diff_body + "\n\n【핵심 감별 및 임상 가이드라인】\n" + clean_gen
        else:
            exp['differential'] = diff_body

        q['option_explanations'] = new_opt_exps
        exp['option_explanations'] = new_opt_exps
        exp['findings'] = sanitize_text(exp.get('findings') or f"{theme_title} 핵심 임상 증례 소견 및 검사 판독 기준 분석")
        exp['trap'] = sanitize_text(exp.get('trap') or '임상적 함정: 유사 질환의 비전형적 양상 및 치료 금기 사항을 주의하십시오.')
        exp['trigger'] = sanitize_text(exp.get('trigger') or f"{theme_title} 핵심 지표 기준 즉시 정답 도출")
        exp['kmle_link'] = sanitize_text(exp.get('kmle_link') or f"KMLE {subject} 기출 및 표준 교과서 가이드라인 연계")
        q['explanation'] = exp
        return 'unmatched_moe'

def main():
    src_path = os.path.join(VERCEL_DATA_DIR, "quiz_all_subjects.json")
    with open(src_path, 'r', encoding='utf-8') as f:
        all_qs = json.load(f)

    print(f"Loaded {len(all_qs)} questions from {src_path}")

    # Process each subject
    stats_by_sub = {}
    updated_questions = []

    for subject, mod_name in SUBJECT_CONFIGS:
        sub_qs = [q for q in all_qs if q.get('subject') == subject]
        if not sub_qs:
            print(f"[{subject}] No questions found!")
            continue

        db = explain_db.load_db(subject) if subject != '진단검사의학과' else {}
        fixes = v43_fixes.load(subject) if subject != '진단검사의학과' else {}
        theme_year_to_rep, crop_to_rep, theme_map_by_rep, db_texts = load_subject_metadata(subject, mod_name, db)

        match_counts = {}
        for q in sub_qs:
            res = sync_question(q, db, theme_year_to_rep, crop_to_rep, theme_map_by_rep, db_texts, fixes=fixes)
            match_counts[res] = match_counts.get(res, 0) + 1
            updated_questions.append(q)

        stats_by_sub[subject] = {
            'total': len(sub_qs),
            'db_entries': len(db),
            'matches': match_counts
        }
        print(f"[{subject}] Done {len(sub_qs)} qs: {match_counts}")

    # 1. Save Vercel quiz_all_subjects.json
    out_all_json = os.path.join(VERCEL_DATA_DIR, "quiz_all_subjects.json")
    with open(out_all_json, 'w', encoding='utf-8') as f:
        json.dump(updated_questions, f, ensure_ascii=False, indent=2)
    print(f"Saved: {out_all_json} ({os.path.getsize(out_all_json):,} bytes)")

    # 2. Save Vercel quiz_data.js
    out_js = os.path.join(VERCEL_DATA_DIR, "quiz_data.js")
    with open(out_js, 'w', encoding='utf-8') as f:
        f.write("window.QUIZ_DATA = ")
        json.dump(updated_questions, f, ensure_ascii=False, indent=2)
        f.write(";\n")
    print(f"Saved: {out_js} ({os.path.getsize(out_js):,} bytes)")

    # 3. Save Vercel quiz_lab_med.json
    lab_qs = [q for q in updated_questions if q.get('subject') == '진단검사의학과']
    out_lab_json = os.path.join(VERCEL_DATA_DIR, "quiz_lab_med.json")
    with open(out_lab_json, 'w', encoding='utf-8') as f:
        json.dump(lab_qs, f, ensure_ascii=False, indent=2)
    print(f"Saved: {out_lab_json} ({os.path.getsize(out_lab_json):,} bytes)")

    # 4. Save Quiz Bank mirror files
    os.makedirs(QUIZ_BANK_DATA_DIR, exist_ok=True)
    qb_all_json = os.path.join(QUIZ_BANK_DATA_DIR, "quiz_all_subjects.json")
    shutil.copy2(out_all_json, qb_all_json)
    qb_js = os.path.join(QUIZ_BANK_DATA_DIR, "quiz_data.js")
    shutil.copy2(out_js, qb_js)
    print(f"Mirrored to quiz_bank: quiz_all_subjects.json and quiz_data.js")

    # 5. Save Quiz Bank per-subject JSON files
    for subject, _ in SUBJECT_CONFIGS:
        s_qs = [q for q in updated_questions if q.get('subject') == subject]
        qb_s_json = os.path.join(QUIZ_BANK_DATA_DIR, f"quiz_{subject}.json")
        with open(qb_s_json, 'w', encoding='utf-8') as f:
            json.dump(s_qs, f, ensure_ascii=False, indent=2)
        print(f"Saved quiz_bank: quiz_{subject}.json ({len(s_qs)} qs, {os.path.getsize(qb_s_json):,} bytes)")

    print("\nALL DATA SYNCHRONIZATION COMPLETED SUCCESSFULLY!")

if __name__ == '__main__':
    main()
