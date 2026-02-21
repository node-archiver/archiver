function setInitial(dll, node) {
  dll.length = 1;
  dll.head = dll.tail = node;
}

/**
 * @private
 */
class DoublyLinkedList {
  constructor() {
    this.head = this.tail = null;
    this.length = 0;
  }

  removeLink(node) {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;

    node.prev = node.next = null;
    this.length -= 1;
    return node;
  }

  empty(): this {
    while (this.head) this.shift();
    return this;
  }

  insertAfter(node, newNode): void {
    newNode.prev = node;
    newNode.next = node.next;
    if (node.next) node.next.prev = newNode;
    else this.tail = newNode;
    node.next = newNode;
    this.length += 1;
  }

  insertBefore(node, newNode) {
    newNode.prev = node.prev;
    newNode.next = node;
    if (node.prev) node.prev.next = newNode;
    else this.head = newNode;
    node.prev = newNode;
    this.length += 1;
  }

  unshift(node) {
    if (this.head) this.insertBefore(this.head, node);
    else setInitial(this, node);
  }

  push(node) {
    if (this.tail) this.insertAfter(this.tail, node);
    else setInitial(this, node);
  }

  shift() {
    return this.head && this.removeLink(this.head);
  }

  pop() {
    return this.tail && this.removeLink(this.tail);
  }

  toArray() {
    return [...this];
  }

  *[Symbol.iterator]() {
    let cur = this.head;
    while (cur) {
      yield cur.data;
      cur = cur.next;
    }
  }

  remove(testFn) {
    let curr = this.head;
    while (curr) {
      const { next } = curr;
      if (testFn(curr)) {
        this.removeLink(curr);
      }
      curr = next;
    }
    return this;
  }
}

export { DoublyLinkedList };
