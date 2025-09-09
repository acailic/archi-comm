import { describe, it, expect } from 'vitest';
import { LRUCache, createStringCache, createObjectCache } from '@/lib/performance/LRUCache';

describe('LRUCache', () => {
  it('basic set/get/delete/clear', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.get('a')).toBe(1);
    expect(cache.delete('b')).toBe(true);
    expect(cache.get('b')).toBeUndefined();
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('evicts least recently used on overflow', () => {
    const cache = new LRUCache<string, number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    // access a to make it MRU
    expect(cache.get('a')).toBe(1);
    // add c -> evict b
    cache.set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
  });

  it('updates recency on get', () => {
    const cache = new LRUCache<string, number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    // get a to mark recent, then set c to evict b
    cache.get('a');
    cache.set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
  });

  it('handles zero and single capacity edge cases', () => {
    const zero = new LRUCache<string, number>(0);
    zero.set('a', 1);
    // maxSize coerced to 1 in impl, so last set remains
    expect(zero.size).toBe(1);
    const one = new LRUCache<string, number>(1);
    one.set('a', 1);
    one.set('b', 2);
    expect(one.get('a')).toBeUndefined();
    expect(one.get('b')).toBe(2);
  });

  it('performance with many entries', () => {
    const cache = createStringCache<number>(1024);
    for (let i = 0; i < 1500; i++) cache.set(String(i), i);
    const start = performance.now();
    for (let i = 0; i < 1000; i++) cache.get(String(i));
    const dur = performance.now() - start;
    expect(dur).toBeLessThan(25);
  });

  it('works with object keys via generic', () => {
    const cache = createObjectCache<object, string>(10);
    const k1 = { a: 1 };
    const k2 = { a: 2 };
    cache.set(k1, 'one');
    cache.set(k2, 'two');
    expect(cache.get(k1)).toBe('one');
    expect(cache.get(k2)).toBe('two');
  });
});

