// Grade maths: conversion formulas, inverse conversion, SGPA to CGPA and course GPA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../../assets/js/grade-core.js');

test('Published conversion formulas', () => {
  assert.equal(G.toPercent(8.2, 'cbse').percent, 77.9);
  assert.equal(G.toPercent(8.2, 'vtu').percent, 74.5);
  assert.equal(G.toPercent(8.2, 'gtu').percent, 77);
  assert.equal(G.toPercent(8.2, 'anna').percent, 82);
  assert.equal(G.toPercent(8.2, 'mu').percent, 69.22);
  assert.equal(G.toPercent(10, 'cbse').percent, 95);
});

test('Results stay within 0–100% and inputs within the scale', () => {
  assert.equal(G.toPercent(0.5, 'vtu').percent, 0);
  assert.equal(G.toPercent(10, 'mu').percent, 82);
  assert.equal(G.toPercent(10.5, 'cbse').error, 'range');
  assert.equal(G.toPercent(-1, 'cbse').error, 'range');
});

test('Proportional and custom formulas', () => {
  assert.equal(G.toPercent(3.5, 'proportional', { max: 4 }).percent, 87.5);
  assert.equal(G.toPercent(3.5, 'cbse', { max: 4 }).error, 'scale');
  assert.equal(G.toPercent(8, 'custom', { a: 8.8, b: 5 }).percent, 75.4);
  assert.equal(G.toPercent(8, 'custom', { a: 0 }).error, 'custom');
});

test('Percentage back to CGPA uses the inverse formula', () => {
  assert.equal(G.toCgpa(77.9, 'cbse').cgpa, 8.2);
  assert.equal(G.toCgpa(74.5, 'vtu').cgpa, 8.2);
  assert.equal(G.toCgpa(75, 'proportional', { max: 4 }).cgpa, 3);
});

test('SGPA to CGPA: credit-weighted, simple mean without credits, mixed rejected', () => {
  assert.deepEqual(G.cgpaFromSemesters([{ sgpa: 8, credits: 20 }, { sgpa: 9, credits: 25 }]),
    { cgpa: 8.56, credits: 45, weighted: true, semesters: 2 });
  assert.equal(G.cgpaFromSemesters([{ sgpa: 8 }, { sgpa: 9 }, { sgpa: 7.5 }]).cgpa, 8.17);
  assert.equal(G.cgpaFromSemesters([{ sgpa: 8, credits: 20 }, { sgpa: 9 }]).error, 'mixed');
  assert.equal(G.cgpaFromSemesters([{ sgpa: 11 }]).error, 'range');
  assert.equal(G.cgpaFromSemesters([]).error, 'empty');
});

test('Course grades to GPA on the India 10-point and Malaysia 4.00 scales', () => {
  assert.equal(G.gpaFromCourses([{ grade: 'O', credits: 4 }, { grade: 'A', credits: 3 }, { grade: 'B+', credits: 3 }], 'india10').gpa, 8.5);
  const my = G.gpaFromCourses([{ grade: 'A', credits: 3 }, { grade: 'B+', credits: 3 }, { grade: 'B-', credits: 2 }], 'my4');
  // 4.00×3 + 3.33×3 + 2.67×2 = 27.33 quality points over 8 credits.
  assert.deepEqual([my.gpa, my.credits, my.qualityPoints], [3.42, 8, 27.33]);
  // Continue from a previous CGPA of 3.20 over 30 credits.
  assert.equal(G.gpaFromCourses([{ grade: 'A', credits: 3 }, { grade: 'B+', credits: 3 }, { grade: 'B-', credits: 2 }], 'my4', { cgpa: 3.2, credits: 30 }).cgpa, 3.25);
  assert.equal(G.gpaFromCourses([{ grade: 'Z', credits: 3 }], 'my4').error, 'grade');
});
