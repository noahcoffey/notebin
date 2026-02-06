import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle } from './debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call the function before the delay', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced();
    vi.advanceTimersByTime(100);

    expect(fn).not.toHaveBeenCalled();
  });

  it('calls the function after the delay', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced();
    vi.advanceTimersByTime(200);

    expect(fn).toHaveBeenCalledOnce();
  });

  it('only calls once when invoked multiple times rapidly', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(200);

    expect(fn).toHaveBeenCalledOnce();
  });

  it('passes arguments to the original function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a', 'b');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('a', 'b');
  });

  it('uses the latest arguments when called multiple times', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('first');
    debounced('second');
    debounced('third');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('third');
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls the function immediately on first invocation', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 200);

    throttled();

    expect(fn).toHaveBeenCalledOnce();
  });

  it('does not call again within the throttle window', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 200);

    throttled();
    throttled();
    throttled();

    expect(fn).toHaveBeenCalledOnce();
  });

  it('allows another call after the throttle window expires', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 200);

    throttled();
    vi.advanceTimersByTime(200);
    throttled();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('passes arguments to the original function', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 200);

    throttled('x', 'y');

    expect(fn).toHaveBeenCalledWith('x', 'y');
  });
});
