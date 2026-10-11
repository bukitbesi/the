(function (root) {
'use strict';
var round2 = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
var clamp = function (n, lo, hi) { return Math.min(hi, Math.max(lo, n)); };
var FORMULAS = {
x95: { a: 9.5, b: 0, label: 'CGPA × 9.5' },
x10: { a: 10, b: 0, label: 'CGPA × 10' },
less075: { a: 10, b: -7.5, label: '(CGPA − 0.75) × 10' },
less05: { a: 10, b: -5, label: '(CGPA − 0.5) × 10' },
mu: { a: 7.1, b: 11, label: 'CGPA × 7.1 + 11' }
};
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
function toCgpa(percent, presetId, opts) {
percent = Number(percent);
if (!isFinite(percent) || percent < 0 || percent > 100) return { error: 'range' };
var f = toPercent(0, presetId, opts);
if (f.error) return f;
var max = Number(opts && opts.max) > 0 ? Number(opts.max) : 10;
return { cgpa: round2(clamp((percent - f.b) / f.a, 0, max)), formula: f.formula };
}
var SCALES = {
india10: { max: 10, grades: [['O', 10], ['A+', 9], ['A', 8], ['B+', 7], ['B', 6], ['C', 5], ['P', 4], ['F', 0], ['Ab', 0]] },
my4: { max: 4, grades: [['A+', 4], ['A', 4], ['A-', 3.67], ['B+', 3.33], ['B', 3], ['B-', 2.67], ['C+', 2.33], ['C', 2], ['C-', 1.67], ['D+', 1.33], ['D', 1], ['E', 0], ['F', 0]] }
};
function gradePoint(scale, grade) {
var s = SCALES[scale];
for (var i = 0; s && i < s.grades.length; i++) if (s.grades[i][0] === grade) return s.grades[i][1];
return null;
}
function weighted(items, prev) {
var pts = 0, cr = 0;
items.forEach(function (it) { pts += it.points * it.credits; cr += it.credits; });
if (prev && prev.credits > 0) { pts += prev.cgpa * prev.credits; cr += prev.credits; }
return cr > 0 ? { value: round2(pts / cr), credits: round2(cr), qualityPoints: round2(pts) } : { error: 'empty' };
}
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
(function () {
'use strict';
var G = window.TBBGrades;
var semForm = document.getElementById('semForm');
var courseForm = document.getElementById('courseForm');
if (!G || !semForm || !courseForm) return;
var $ = function (id) { return document.getElementById(id); };
var fmt = function (n) { return n.toFixed(2); };
var ERR = {
empty: 'Enter at least one result.',
range: 'Each SGPA must be between 0 and 10.',
credits: 'Credits must be more than 0.',
mixed: 'Enter credits for every semester, or leave them all blank for a simple average.',
grade: 'Choose a grade for each course.',
prev: 'Previous CGPA must be within the grading scale.'
};
function semRows() {
return Array.prototype.map.call($('semRows').rows, function (tr) {
var inputs = tr.querySelectorAll('input');
return { sgpa: inputs[0].value.trim(), credits: inputs[1].value.trim() };
});
}
function renderSem() {
var r = G.cgpaFromSemesters(semRows(), 10);
$('semError').hidden = !r.error;
$('semError').textContent = r.error ? ERR[r.error] : '';
$('semCgpa').textContent = r.error ? '–' : fmt(r.cgpa);
$('semDetail').textContent = r.error ? '' : r.semesters + (r.semesters === 1 ? ' semester' : ' semesters') +
(r.weighted ? ', ' + r.credits + ' credits (credit-weighted)' : ' (simple average)');
$('semConvert').href = r.error ? '/cgpa-to-percentage/' : '/cgpa-to-percentage/#cgpa=' + fmt(r.cgpa) + '&u=generic95';
if (!r.error) $('semLive').textContent = 'CGPA ' + fmt(r.cgpa) + '.';
}
function fillGrades(select, scale, keep) {
var opts = G.SCALES[scale].grades.map(function (g) {
return '<option value="' + g[0] + '">' + g[0] + ' (' + g[1].toFixed(scale === 'my4' ? 2 : 0) + ')</option>';
}).join('');
select.innerHTML = '<option value="">Grade</option>' + opts;
if (keep && G.gradePoint(scale, keep) !== null) select.value = keep;
}
function courseRows() {
return Array.prototype.map.call($('courseRows').rows, function (tr) {
return { grade: tr.querySelector('select').value, credits: tr.querySelector('input').value };
});
}
function renderCourses() {
var scale = courseForm.elements.scale.value;
var prev = { cgpa: courseForm.elements.prevCgpa.value, credits: courseForm.elements.prevCredits.value };
var r = G.gpaFromCourses(courseRows(), scale, prev.credits ? prev : null);
$('courseError').hidden = !r.error;
$('courseError').textContent = r.error ? ERR[r.error] : '';
$('courseGpa').textContent = r.error ? '–' : fmt(r.gpa);
$('courseCredits').textContent = r.error ? '–' : String(r.credits);
$('coursePoints').textContent = r.error ? '–' : fmt(r.qualityPoints);
$('courseCgpaRow').hidden = r.error || r.cgpa === undefined;
if (!r.error && r.cgpa !== undefined) $('courseCgpa').textContent = fmt(r.cgpa) + ' over ' + r.totalCredits + ' credits';
if (!r.error) $('courseLive').textContent = 'GPA ' + fmt(r.gpa) + '.';
}
var LABELS = { semRows: ['SGPA semester', 'Credits semester'], courseRows: ['Grade course', 'Credits course'] };
function renumber(tbody) {
Array.prototype.forEach.call(tbody.rows, function (tr, i) {
tr.cells[0].textContent = i + 1;
tr.querySelectorAll('input,select').forEach(function (el, j) { el.setAttribute('aria-label', LABELS[tbody.id][j] + ' ' + (i + 1)); });
tr.querySelector('.row-del').setAttribute('aria-label', 'Remove row ' + (i + 1));
});
}
function addRow(tbodyId, templateId, after) {
var row = $(templateId).content.firstElementChild.cloneNode(true);
$(tbodyId).appendChild(row);
renumber($(tbodyId));
if (after) after(row);
row.querySelector('input,select').focus();
}
document.addEventListener('click', function (e) {
var t = e.target.closest && e.target.closest('button');
if (!t) return;
if (t.id === 'semAdd') { addRow('semRows', 'semTpl'); renderSem(); }
else if (t.id === 'courseAdd') { addRow('courseRows', 'courseTpl', function (row) { fillGrades(row.querySelector('select'), courseForm.elements.scale.value); }); renderCourses(); }
else if (t.classList.contains('row-del')) {
var tbody = t.closest('tbody');
if (tbody.rows.length > 1) { t.closest('tr').remove(); renumber(tbody); }
if (tbody.id === 'semRows') renderSem(); else renderCourses();
}
});
var frames = {};
function later(key, fn) { cancelAnimationFrame(frames[key]); frames[key] = requestAnimationFrame(fn); }
semForm.addEventListener('input', function () { later('sem', renderSem); });
courseForm.addEventListener('input', function () { later('course', renderCourses); });
courseForm.addEventListener('change', function (e) {
if (e.target.name !== 'scale') return;
Array.prototype.forEach.call($('courseRows').querySelectorAll('select'), function (s) { fillGrades(s, e.target.value, s.value); });
renderCourses();
});
[semForm, courseForm].forEach(function (form) { form.addEventListener('submit', function (e) { e.preventDefault(); }); });
var restored = function (form) {
return Array.prototype.some.call(form.elements, function (el) {
return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : 'defaultValue' in el && el.value !== el.defaultValue;
});
};
if (restored(semForm)) renderSem();
if (restored(courseForm)) renderCourses();
})();
