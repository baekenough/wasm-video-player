/**
 * FastQueue - O(1) FIFO queue implementation
 *
 * Uses a ring buffer approach to avoid O(n) Array.shift() operations.
 * Automatically grows when capacity is exceeded.
 */
export class FastQueue<T> {
  private buffer: (T | undefined)[];
  private head: number = 0;
  private tail: number = 0;
  private _length: number = 0;

  constructor(initialCapacity: number = 64) {
    this.buffer = new Array(initialCapacity);
  }

  /**
   * Add an item to the end of the queue - O(1) amortized
   */
  push(item: T): void {
    if (this._length === this.buffer.length) {
      this.grow();
    }

    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.buffer.length;
    this._length++;
  }

  /**
   * Remove and return the first item - O(1)
   */
  shift(): T | undefined {
    if (this._length === 0) {
      return undefined;
    }

    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined; // Allow GC
    this.head = (this.head + 1) % this.buffer.length;
    this._length--;

    return item;
  }

  /**
   * Peek at the first item without removing - O(1)
   */
  peek(): T | undefined {
    if (this._length === 0) {
      return undefined;
    }
    return this.buffer[this.head];
  }

  /**
   * Get item at index (0 = first item) - O(1)
   */
  at(index: number): T | undefined {
    if (index < 0 || index >= this._length) {
      return undefined;
    }
    return this.buffer[(this.head + index) % this.buffer.length];
  }

  /**
   * Current number of items in the queue
   */
  get length(): number {
    return this._length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this._length === 0;
  }

  /**
   * Clear all items from the queue
   */
  clear(): void {
    // Clear references to allow GC
    for (let i = 0; i < this.buffer.length; i++) {
      this.buffer[i] = undefined;
    }
    this.head = 0;
    this.tail = 0;
    this._length = 0;
  }

  /**
   * Double the buffer capacity
   */
  private grow(): void {
    const newCapacity = this.buffer.length * 2;
    const newBuffer: (T | undefined)[] = new Array(newCapacity);

    // Copy elements in order
    for (let i = 0; i < this._length; i++) {
      newBuffer[i] = this.buffer[(this.head + i) % this.buffer.length];
    }

    this.buffer = newBuffer;
    this.head = 0;
    this.tail = this._length;
  }

  /**
   * Convert to array (for debugging)
   */
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this._length; i++) {
      result.push(this.buffer[(this.head + i) % this.buffer.length] as T);
    }
    return result;
  }
}
