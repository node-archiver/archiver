class FixedFIFO {
  buffer: Buffer[];

  mask: number;
  top: number;
  btm: number;
  next: FixedFIFO;

  constructor(hwm: number) {
    if (!(hwm > 0) || ((hwm - 1) & hwm) !== 0) {
      throw new Error("Max size for a FixedFIFO should be a power of two");
    }

    this.buffer = Array.from({ length: hwm });
    this.mask = hwm - 1;
    this.top = 0;
    this.btm = 0;
    this.next = null;
  }

  push(data: Buffer): boolean {
    if (this.buffer[this.top] !== undefined) return false;
    this.buffer[this.top] = data;
    this.top = (this.top + 1) & this.mask;
    return true;
  }

  shift(): Buffer {
    const last = this.buffer[this.btm];
    if (last === undefined) return undefined;
    this.buffer[this.btm] = undefined;
    this.btm = (this.btm + 1) & this.mask;
    return last;
  }

  peek(): Buffer {
    return this.buffer[this.btm];
  }
}

class FastFIFO {
  head: FixedFIFO;
  tail: FixedFIFO;
  length: number;

  constructor() {
    this.head = new FixedFIFO(16);
    this.tail = this.head;
    this.length = 0;
  }

  push(val: Buffer): void {
    this.length++;
    if (!this.head.push(val)) {
      const prev = this.head;
      this.head = prev.next = new FixedFIFO(2 * this.head.buffer.length);
      this.head.push(val);
    }
  }

  shift(): Buffer {
    if (this.length !== 0) this.length--;
    const val = this.tail.shift();
    if (val === undefined && this.tail.next) {
      const next = this.tail.next;
      this.tail.next = null;
      this.tail = next;
      return this.tail.shift();
    }

    return val;
  }

  peek(): Buffer {
    const val = this.tail.peek();
    if (val === undefined && this.tail.next) return this.tail.next.peek();
    return val;
  }
}

export { FastFIFO };
