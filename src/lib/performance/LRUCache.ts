export type EvictCallback<K, V> = (key: K, value: V) => void;

class Node<K, V> {
  key: K;
  value: V;
  prev: Node<K, V> | null = null;
  next: Node<K, V> | null = null;
  constructor(key: K, value: V) {
    this.key = key;
    this.value = value;
  }
}

export class LRUCache<K, V> {
  private map = new Map<K, Node<K, V>>();
  private head: Node<K, V> | null = null;
  private tail: Node<K, V> | null = null;
  private _size = 0;
  private _maxSize: number;
  private onEvict?: EvictCallback<K, V>;

  constructor(maxSize: number = 100, onEvict?: EvictCallback<K, V>) {
    this._maxSize = Math.max(1, maxSize);
    this.onEvict = onEvict;
  }

  get size() {
    return this._size;
  }

  get maxSize() {
    return this._maxSize;
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    this.moveToFront(node);
    return node.value;
  }

  set(key: K, value: V): void {
    let node = this.map.get(key);
    if (node) {
      node.value = value;
      this.moveToFront(node);
      return;
    }
    node = new Node(key, value);
    this.map.set(key, node);
    this.addToFront(node);
    this._size++;
    if (this._size > this._maxSize) {
      this.evictLeastUsed();
    }
  }

  delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    this.removeNode(node);
    this.map.delete(key);
    this._size--;
    return true;
  }

  clear(): void {
    let cur = this.head;
    while (cur) {
      const next = cur.next;
      cur.prev = cur.next = null;
      cur = next;
    }
    this.head = this.tail = null;
    this.map.clear();
    this._size = 0;
  }

  private moveToFront(node: Node<K, V>) {
    if (this.head === node) return;
    this.removeNode(node);
    this.addToFront(node);
  }

  private addToFront(node: Node<K, V>) {
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private removeNode(node: Node<K, V>) {
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (this.head === node) this.head = node.next;
    if (this.tail === node) this.tail = node.prev;
    node.prev = node.next = null;
  }

  private evictLeastUsed() {
    if (!this.tail) return;
    const node = this.tail;
    this.removeNode(node);
    this.map.delete(node.key);
    this._size--;
    if (this.onEvict) this.onEvict(node.key, node.value);
  }
}

export function createStringCache<V>(maxSize = 100, onEvict?: EvictCallback<string, V>) {
  return new LRUCache<string, V>(maxSize, onEvict);
}

export function createObjectCache<K extends object, V>(maxSize = 100, onEvict?: EvictCallback<K, V>) {
  return new LRUCache<K, V>(maxSize, onEvict);
}

