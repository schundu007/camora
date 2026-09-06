/**
 * Which solved-pattern exemplars get injected into a coding solve.
 *
 * The bug these pin down: asked to "add 2 numbers using python", Sona answered
 * with LeetCode 2 — reversed linked lists, dummy head, carry, divmod — and
 * generated that problem's examples (l1 = [2,4,3]) as the test cases. An
 * exemplar is handed to the model as "the exact contract to follow", so a
 * wrong one does not merely add noise; it redefines the problem.
 *
 * The gate was `score > 0`, which meant one shared generic word was enough.
 * "reverse a list in python" scored 6 against Reverse Linked List purely on
 * "list" and "reverse" — the two words that do NOT tell those problems apart.
 */
import { describe, it, expect } from 'vitest';
import { lexicalRetrieve } from '../src/services/codingKnowledge.js';

const ids = (q) => lexicalRetrieve(q, 2).map((e) => e.id);

describe('lexicalRetrieve', () => {
  it('injects nothing for a plain arithmetic request', () => {
    // The reported question. Anything retrieved here is a different problem
    // being substituted for "a + b".
    expect(ids('add 2 numbers using python')).toEqual([]);
    expect(ids('add two numbers')).toEqual([]);
    expect(ids('write a function to add two numbers')).toEqual([]);
  });

  it('does not answer "reverse a list" with a linked list', () => {
    expect(ids('reverse a list in python')).toEqual([]);
    expect(ids('reverse a list')).toEqual([]);
  });

  it('still retrieves when the request names the actual structure', () => {
    expect(ids('reverse a singly linked list')).toContain('reverse-linked-list');
    expect(ids('reverse the nodes of a linked list in place')).toContain('reverse-linked-list');
  });

  it('still retrieves genuine pattern matches', () => {
    expect(ids('find two numbers in an array that sum to a target')).toContain('two-sum');
    expect(ids('check if the parentheses are balanced using a stack')).toContain('valid-parentheses');
    expect(ids('longest substring without repeating characters sliding window')).toContain('longest-substring');
    expect(ids('count the number of islands in a grid using dfs')).toContain('num-islands');
    expect(ids('binary search a sorted array for a target index')).toContain('binary-search');
  });

  it('a language name alone never retrieves anything', () => {
    expect(ids('python')).toEqual([]);
    expect(ids('write some code in java')).toEqual([]);
  });

  it('handles empty and tiny input', () => {
    expect(ids('')).toEqual([]);
    expect(ids('ab')).toEqual([]);
  });
});
