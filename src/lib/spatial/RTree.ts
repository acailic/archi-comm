/**
 * /src/lib/spatial/RTree.ts
 * R-tree spatial indexing system for efficient collision detection and viewport queries
 * Provides fast spatial queries for large datasets with bounding box operations
 * RELEVANT FILES: src/shared/contracts/index.ts, src/features/canvas/utils/virtualization.ts
 */

import { DesignComponent, Connection } from '../@shared/contracts';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;

  intersects(other: BoundingBox): boolean;
  contains(point: { x: number; y: number }): boolean;
  area(): number;
  union(other: BoundingBox): BoundingBox;
}

export class BoundingBoxImpl implements BoundingBox {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number
  ) {}

  intersects(other: BoundingBox): boolean {
    return !(
      this.x + this.width < other.x ||
      other.x + other.width < this.x ||
      this.y + this.height < other.y ||
      other.y + other.height < this.y
    );
  }

  contains(point: { x: number; y: number }): boolean {
    return (
      point.x >= this.x &&
      point.x <= this.x + this.width &&
      point.y >= this.y &&
      point.y <= this.y + this.height
    );
  }

  area(): number {
    return this.width * this.height;
  }

  union(other: BoundingBox): BoundingBox {
    const minX = Math.min(this.x, other.x);
    const minY = Math.min(this.y, other.y);
    const maxX = Math.max(this.x + this.width, other.x + other.width);
    const maxY = Math.max(this.y + this.height, other.y + other.height);
    return new BoundingBoxImpl(minX, minY, maxX - minX, maxY - minY);
  }

  static fromComponent(component: DesignComponent, sizeMap?: Map<string, { width: number; height: number }>): BoundingBox {
    // Use actual size if available, otherwise use defaults
    const actualSize = sizeMap?.get(component.id);
    const width = actualSize?.width ?? 120;
    const height = actualSize?.height ?? 80;
    return new BoundingBoxImpl(component.x, component.y, width, height);
  }

  static fromConnection(connection: Connection, components: DesignComponent[]): BoundingBox {
    const fromComp = components.find(c => c.id === connection.from);
    const toComp = components.find(c => c.id === connection.to);

    if (!fromComp || !toComp) {
      return new BoundingBoxImpl(0, 0, 0, 0);
    }

    const minX = Math.min(fromComp.x, toComp.x);
    const minY = Math.min(fromComp.y, toComp.y);
    const maxX = Math.max(fromComp.x + 120, toComp.x + 120);
    const maxY = Math.max(fromComp.y + 80, toComp.y + 80);

    return new BoundingBoxImpl(minX, minY, maxX - minX, maxY - minY);
  }
}

export interface SpatialItem<T> {
  id: string;
  bounds: BoundingBox;
  data: T;
  type: 'component' | 'connection';
}

export interface RTreeNode {
  bounds: BoundingBox;
  children?: RTreeNode[];
  items?: SpatialItem<any>[];
  isLeaf: boolean;
  level: number;
}

export class RTree<T> {
  private root: RTreeNode | null = null;
  private readonly maxChildren = 8;
  private readonly minChildren = 4;
  private itemCount = 0;
  private removeCount = 0;
  private readonly rebuildThreshold = 50;

  constructor() {
    this.clear();
  }

  insert(item: SpatialItem<T>): void {
    if (!item?.bounds || !item.id) {
      throw new Error('Invalid item: must have id and bounds');
    }

    if (!this.root) {
      this.root = this.createLeafNode(0);
    }

    this._insert(this.root, item);
    this.itemCount++;
  }

  private _insert(node: RTreeNode, item: SpatialItem<T>): void {
    if (node.isLeaf) {
      node.items!.push(item);
      this.expandBounds(node, item.bounds);

      if (node.items!.length > this.maxChildren) {
        this.splitLeaf(node);
      }
    } else {
      const bestChild = this.chooseSubtree(node, item.bounds);
      this._insert(bestChild, item);
      this.expandBounds(node, item.bounds);

      if (bestChild.children && bestChild.children.length > this.maxChildren) {
        this.splitInternal(bestChild);
      }
    }
  }

  remove(id: string): boolean {
    if (!this.root) return false;

    const removed = this._remove(this.root, id);
    if (removed) {
      this.itemCount--;
      this.removeCount++;

      // Trigger rebuild if too many removals
      if (this.removeCount > this.rebuildThreshold) {
        this.rebuild();
      }
    }

    return removed;
  }

  private _remove(node: RTreeNode, id: string): boolean {
    if (node.isLeaf) {
      const index = node.items!.findIndex(item => item.id === id);
      if (index !== -1) {
        node.items!.splice(index, 1);
        this.recalculateBounds(node);
        return true;
      }
      return false;
    } else {
      for (const child of node.children!) {
        if (this._remove(child, id)) {
          this.recalculateBounds(node);
          return true;
        }
      }
      return false;
    }
  }

  query(bounds: BoundingBox): SpatialItem<T>[] {
    if (!this.root || !bounds) return [];

    const results: SpatialItem<T>[] = [];
    this._query(this.root, bounds, results);
    return results;
  }

  private _query(node: RTreeNode, bounds: BoundingBox, results: SpatialItem<T>[]): void {
    if (!node.bounds.intersects(bounds)) return;

    if (node.isLeaf) {
      for (const item of node.items!) {
        if (item.bounds.intersects(bounds)) {
          results.push(item);
        }
      }
    } else {
      for (const child of node.children!) {
        this._query(child, bounds, results);
      }
    }
  }

  queryPoint(x: number, y: number): SpatialItem<T>[] {
    const point = { x, y };
    const results: SpatialItem<T>[] = [];

    if (!this.root) return results;

    this._queryPoint(this.root, point, results);
    return results;
  }

  private _queryPoint(node: RTreeNode, point: { x: number; y: number }, results: SpatialItem<T>[]): void {
    if (!node.bounds.contains(point)) return;

    if (node.isLeaf) {
      for (const item of node.items!) {
        if (item.bounds.contains(point)) {
          results.push(item);
        }
      }
    } else {
      for (const child of node.children!) {
        this._queryPoint(child, point, results);
      }
    }
  }

  update(id: string, newBounds: BoundingBox): boolean {
    const removed = this.remove(id);
    if (!removed) return false;

    // Find the original item to preserve its data
    const allItems = this.getAllItems();
    const originalItem = allItems.find(item => item.id === id);

    if (originalItem) {
      const updatedItem: SpatialItem<T> = {
        ...originalItem,
        bounds: newBounds
      };
      this.insert(updatedItem);
    }

    return true;
  }

  bulkLoad(items: SpatialItem<T>[]): void {
    if (!items || items.length === 0) {
      this.clear();
      return;
    }

    // Sort items by hilbert curve for better spatial locality
    const sortedItems = items.slice().sort((a, b) => {
      const aCenter = { x: a.bounds.x + a.bounds.width / 2, y: a.bounds.y + a.bounds.height / 2 };
      const bCenter = { x: b.bounds.x + b.bounds.width / 2, y: b.bounds.y + b.bounds.height / 2 };
      return this.hilbertDistance(aCenter.x, aCenter.y) - this.hilbertDistance(bCenter.x, bCenter.y);
    });

    this.root = this.buildTree(sortedItems, 0);
    this.itemCount = items.length;
    this.removeCount = 0;
  }

  clear(): void {
    this.root = null;
    this.itemCount = 0;
    this.removeCount = 0;
  }

  getStats() {
    return {
      itemCount: this.itemCount,
      removeCount: this.removeCount,
      height: this.getHeight(),
      needsRebuild: this.removeCount > this.rebuildThreshold
    };
  }

  private buildTree(items: SpatialItem<T>[], level: number): RTreeNode {
    if (items.length <= this.maxChildren) {
      return this.createLeafNode(level, items);
    }

    const children: RTreeNode[] = [];
    const childSize = Math.ceil(items.length / this.maxChildren);

    for (let i = 0; i < items.length; i += childSize) {
      const childItems = items.slice(i, i + childSize);
      children.push(this.buildTree(childItems, level + 1));
    }

    return this.createInternalNode(level, children);
  }

  private createLeafNode(level: number, items: SpatialItem<T>[] = []): RTreeNode {
    const node: RTreeNode = {
      bounds: this.calculateBounds(items.map(item => item.bounds)),
      items: items.slice(),
      isLeaf: true,
      level
    };

    return node;
  }

  private createInternalNode(level: number, children: RTreeNode[]): RTreeNode {
    const node: RTreeNode = {
      bounds: this.calculateBounds(children.map(child => child.bounds)),
      children: children.slice(),
      isLeaf: false,
      level
    };

    return node;
  }

  private calculateBounds(bounds: BoundingBox[]): BoundingBox {
    if (bounds.length === 0) {
      return new BoundingBoxImpl(0, 0, 0, 0);
    }

    let result = bounds[0];
    for (let i = 1; i < bounds.length; i++) {
      result = result.union(bounds[i]);
    }

    return result;
  }

  private expandBounds(node: RTreeNode, bounds: BoundingBox): void {
    node.bounds = node.bounds.union(bounds);
  }

  private recalculateBounds(node: RTreeNode): void {
    if (node.isLeaf) {
      node.bounds = this.calculateBounds(node.items!.map(item => item.bounds));
    } else {
      node.bounds = this.calculateBounds(node.children!.map(child => child.bounds));
    }
  }

  private chooseSubtree(node: RTreeNode, bounds: BoundingBox): RTreeNode {
    let bestChild = node.children![0];
    let minIncrease = this.calculateAreaIncrease(bestChild.bounds, bounds);

    for (let i = 1; i < node.children!.length; i++) {
      const child = node.children![i];
      const increase = this.calculateAreaIncrease(child.bounds, bounds);

      if (increase < minIncrease ||
          (increase === minIncrease && child.bounds.area() < bestChild.bounds.area())) {
        bestChild = child;
        minIncrease = increase;
      }
    }

    return bestChild;
  }

  private calculateAreaIncrease(bounds: BoundingBox, newBounds: BoundingBox): number {
    const originalArea = bounds.area();
    const expandedArea = bounds.union(newBounds).area();
    return expandedArea - originalArea;
  }

  private splitLeaf(node: RTreeNode): void {
    const items = node.items!;
    const [group1, group2] = this.quadraticSplit(items.map(item => item.bounds));

    const items1 = items.filter((_, i) => group1.includes(i));
    const items2 = items.filter((_, i) => group2.includes(i));

    node.items = items1;
    node.bounds = this.calculateBounds(items1.map(item => item.bounds));

    const newNode = this.createLeafNode(node.level, items2);

    // Handle root split
    if (node === this.root) {
      const newRoot = this.createInternalNode(0, [node, newNode]);
      this.root = newRoot;
    }
  }

  private splitInternal(node: RTreeNode): void {
    const children = node.children!;
    const [group1, group2] = this.quadraticSplit(children.map(child => child.bounds));

    const children1 = children.filter((_, i) => group1.includes(i));
    const children2 = children.filter((_, i) => group2.includes(i));

    node.children = children1;
    node.bounds = this.calculateBounds(children1.map(child => child.bounds));

    const newNode = this.createInternalNode(node.level, children2);

    // Handle root split
    if (node === this.root) {
      const newRoot = this.createInternalNode(node.level - 1, [node, newNode]);
      this.root = newRoot;
    }
  }

  private quadraticSplit(bounds: BoundingBox[]): [number[], number[]] {
    if (bounds.length < 2) return [[], []];

    // Find worst pair
    let maxWaste = -1;
    let seed1 = 0, seed2 = 1;

    for (let i = 0; i < bounds.length - 1; i++) {
      for (let j = i + 1; j < bounds.length; j++) {
        const union = bounds[i].union(bounds[j]);
        const waste = union.area() - bounds[i].area() - bounds[j].area();
        if (waste > maxWaste) {
          maxWaste = waste;
          seed1 = i;
          seed2 = j;
        }
      }
    }

    const group1 = [seed1];
    const group2 = [seed2];
    const remaining = [...Array(bounds.length).keys()].filter(i => i !== seed1 && i !== seed2);

    // Distribute remaining items
    while (remaining.length > 0) {
      const index = remaining.shift()!;
      const bounds1 = this.calculateBounds(group1.map(i => bounds[i]));
      const bounds2 = this.calculateBounds(group2.map(i => bounds[i]));

      const increase1 = this.calculateAreaIncrease(bounds1, bounds[index]);
      const increase2 = this.calculateAreaIncrease(bounds2, bounds[index]);

      if (increase1 < increase2) {
        group1.push(index);
      } else {
        group2.push(index);
      }
    }

    return [group1, group2];
  }

  private hilbertDistance(x: number, y: number): number {
    // Simplified hilbert curve calculation for spatial locality
    return Math.floor(x / 100) * 1000 + Math.floor(y / 100);
  }

  private rebuild(): void {
    const allItems = this.getAllItems();
    this.bulkLoad(allItems);
  }

  private getAllItems(): SpatialItem<T>[] {
    const items: SpatialItem<T>[] = [];
    if (this.root) {
      this._getAllItems(this.root, items);
    }
    return items;
  }

  private _getAllItems(node: RTreeNode, items: SpatialItem<T>[]): void {
    if (node.isLeaf) {
      items.push(...node.items!);
    } else {
      for (const child of node.children!) {
        this._getAllItems(child, items);
      }
    }
  }

  private getHeight(): number {
    return this.root ? this._getHeight(this.root) : 0;
  }

  private _getHeight(node: RTreeNode): number {
    if (node.isLeaf) return 1;
    return 1 + Math.max(...node.children!.map(child => this._getHeight(child)));
  }
}