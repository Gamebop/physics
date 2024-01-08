class IndexedCache {
    constructor() {
        this._index = 0;
        this._freed = [];
        this._storage = [];
    }

    add(element) {
        const index = this._freed.pop() ?? this._index++; 
        this._storage[index] = element;
        return index;
    }

    get(index) {
        return this._storage[index];
    }

    free(index) {
        this._storage[index] = null;
        this._freed.push(index);
    }

    clear() {
        this._index = 0;
        this._freed.length = 0;
        this._storage.length = 0;
    }
}

export { IndexedCache };