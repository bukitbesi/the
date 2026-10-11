/* Grade maths shared by the CGPA calculator, the CGPA-to-percentage converter, the build and the tests.
   Conversion formulas are the ones universities commonly publish; a student's own university circular
   or conversion certificate always takes precedence, which the pages say next to every result. */
(function (root) {
  'use strict';

  var round2 = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var clamp = function (n, lo, hi) { return Math.min(hi, Math.max(lo, n)); };

  // Linear formulas: percentage = cgpa * a + b (on a 10-point scale unless noted).
  var FORMULAS = {
    x95: { a: 9.5, b: 0, label: 'CGPA × 9.5' },
    x10: { a: 10, b: 0, label: 'CGPA × 10' },
    less075: { a: 10, b: -7.5, label: '(CGPA − 0.75) × 10' },
    less05: { a: 10, b: -5, label: '(CGPA − 0.5) × 10' },
    mu: { a: 7.1, b: 11, label: 'CGPA × 7.1 + 11' }
  };

  // Presets name the formula each body is commonly reported to use. Notes are shown with the result.
  var PRESETS = [
    { id: 'cbse', name: 'CBSE (Class 10, CCE scheme)', formula: 'x95' },
    { id: 'vtu', name: 'VTU (2015 scheme onwards)', formula: 'less075' },
    { id: 'aktu', name: 'AKTU', formula: 'less075' },
    { id: 'makaut', name: 'MAKAUT (WBUT)', formula: 'less075' },
    { id: 'sppu', name: 'SPPU (Pune University, engineering 2019 pattern)', formula: 'less075', note: 'sppu' },
    { id: 'gtu', name: 'GTU', formula: 'less05' },
    { id: 'mu', name: 'University of Mumbai', formula: 'mu', note: 'mu' },
    { id: 'anna', name: 'Anna University', formula: 'x10' },
    { id: 'generic95', name: 'Other / not sure (CGPA × 9.5)', formula: 'x95' },
    { id: 'generic10', name: 'Other (CGPA × 10)', formula: 'x10' },
    { id: 'proportional', name: 'Any scale: CGPA ÷ maximum × 100', formula: 'proportional' },
    { id: 'custom', name: 'Custom formula from your university', formula: 'custom' }
  ];

  function presetById(id) {
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) return PRESETS[i];
    return PRESETS[0];
  }

  // Returns { percent, formula } or { error }. max is the grading scale (10 by default).
  function toPercent(cgpa, presetId, opts) {
    opts = opts || {};
    var max = Number(opts.max) > 0 ? Number(opts.max) : 10;
    cgpa = Number(cgpa);
    if (!isFinite(cgpa) || cgpa < 0 || cgpa > max) return { error: 'range', max: max };
    var preset = presetById(presetId);
    var f;
    if (preset.formula === 'proportional') f = { a: 100 / max, b: 0, label: 'CGPA ÷ ' + max + ' × 100' };
    else if (preset.formula === 'custom') {
      var a = Number(opts.a), b = Number(opts.b) || 0;
      if (!isFinite(a) || a <= 0) return { error: 'custom' };
      f = { a: a, b: b, label: 'CGPA × ' + a + (b ? (b > 0 ? ' + ' : ' − ') + Math.abs(b) : '') };
    } else {
      if (max !== 10) return { error: 'scale' };
      f = FORMULAS[preset.formula];
    }
    return { percent: round2(clamp(cgpa * f.a + f.b, 0, 100)), formula: f.label, a: f.a, b: f.b, preset: preset };
  }

  // Inverse of the same linear formula, clamped to the scale.
  function toCgpa(percent, presetId, opts) {
    percent = Number(percent);
    if (!isFinite(percent) || percent < 0 || percent > 100) return { error: 'range' };
    var f = toPercent(0, presetId, opts);
    if (f.error) return f;
    var max = Number(opts && opts.max) > 0 ? Number(opts.max) : 10;
    return { cgpa: round2(clamp((percent - f.b) / f.a, 0, max)), formula: f.formula };
  }

  // Common grade-point scales. India: UGC CBCS 10-point letters. Malaysia: 4.00 scale used by public universities.
  var SCALES = {
    india10: { max: 10, grades: [['O', 10], ['A+', 9], ['A', 8], ['B+', 7], ['B', 6], ['C', 5], ['P', 4], ['F', 0], ['Ab', 0]] },
    my4: { max: 4, grades: [['A+', 4], ['A', 4], ['A-', 3.67], ['B+', 3.33], ['B', 3], ['B-', 2.67], ['C+', 2.33], ['C', 2], ['C-', 1.67], ['D+', 1.33], ['D', 1], ['E', 0], ['F', 0]] }
  };
  function gradePoint(scale, grade) {
    var s = SCALES[scale];
    for (var i = 0; s && i < s.grades.length; i++) if (s.grades[i][0] === grade) return s.grades[i][1];
    return null;
  }

  // Credit-weighted average of (points, credits) pairs, optionally continuing from a previous CGPA.
  function weighted(items, prev) {
    var pts = 0, cr = 0;
    items.forEach(function (it) { pts += it.points * it.credits; cr += it.credits; });
    if (prev && prev.credits > 0) { pts += prev.cgpa * prev.credits; cr += prev.credits; }
    return cr > 0 ? { value: round2(pts / cr), credits: round2(cr), qualityPoints: round2(pts) } : { error: 'empty' };
  }

  // Semester SGPAs to CGPA. With credits the average is weighted; without any credits it is a simple mean.
  function cgpaFromSemesters(rows, max) {
    max = max || 10;
    var list = rows.filter(function (r) { return r && r.sgpa !== '' && r.sgpa != null; }).map(function (r) {
      return { points: Number(r.sgpa), credits: r.credits === '' || r.credits == null ? null : Number(r.credits) };
    });
    if (!list.length) return { error: 'empty' };
    for (var i = 0; i < list.length; i++) {
      if (!isFinite(list[i].points) || list[i].points < 0 || list[i].points > max) return { error: 'range', row: i };
      if (list[i].credits !== null && (!isFinite(list[i].credits) || list[i].credits <= 0)) return { error: 'credits', row: i };
    }
    var withCredits = list.filter(function (r) { return r.credits !== null; }).length;
    if (withCredits && withCredits !== list.length) return { error: 'mixed' };
    var r = weighted(list.map(function (x) { return { points: x.points, credits: withCredits ? x.credits : 1 }; }));
    return { cgpa: r.value, credits: withCredits ? r.credits : null, weighted: !!withCredits, semesters: list.length };
  }

  // Course letter grades to GPA, and to CGPA when previous results are given.
  function gpaFromCourses(rows, scale, prev) {
    var list = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!r || !r.grade) continue;
      var gp = gradePoint(scale, r.grade), cr = Number(r.credits);
      if (gp === null) return { error: 'grade', row: i };
      if (!isFinite(cr) || cr <= 0) return { error: 'credits', row: i };
      list.push({ points: gp, credits: cr });
    }
    if (!list.length) return { error: 'empty' };
    var gpa = weighted(list);
    var out = { gpa: gpa.value, credits: gpa.credits, qualityPoints: gpa.qualityPoints };
    if (prev && Number(prev.credits) > 0) {
      var p = { cgpa: Number(prev.cgpa), credits: Number(prev.credits) };
      if (!isFinite(p.cgpa) || p.cgpa < 0 || p.cgpa > SCALES[scale].max) return { error: 'prev' };
      var c = weighted(list, p);
      out.cgpa = c.value; out.totalCredits = c.credits;
    }
    return out;
  }

  var api = { FORMULAS: FORMULAS, PRESETS: PRESETS, SCALES: SCALES, toPercent: toPercent, toCgpa: toCgpa,
    gradePoint: gradePoint, cgpaFromSemesters: cgpaFromSemesters, gpaFromCourses: gpaFromCourses, round2: round2 };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBGrades = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
