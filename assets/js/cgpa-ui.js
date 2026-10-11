/* CGPA calculator UI: semester SGPAs to CGPA, and course grades to GPA/CGPA on a chosen scale. */
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

  // ---- SGPA to CGPA
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

  // ---- Course grades to GPA
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

  // ---- rows: numbers and accessible names follow the row position
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
  // Results for the example rows ship in the HTML; recalculate only if the browser restored edited inputs.
  var restored = function (form) {
    return Array.prototype.some.call(form.elements, function (el) {
      return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : 'defaultValue' in el && el.value !== el.defaultValue;
    });
  };
  if (restored(semForm)) renderSem();
  if (restored(courseForm)) renderCourses();
})();
