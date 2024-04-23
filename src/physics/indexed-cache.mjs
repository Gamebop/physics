/**
 * An indexed map cache. Used to temporarily store objects and functions. For example, a raycast
 * callback function to be called, once we get the result from the physics backend.
 * Indices can be freed and re-used.
 * 
 * @hidden
 */
class IndexedCache {
    constructor() {
        this._index = 0;
        this._freed = [];
        this._storage = [];
    }

    /**
     * Store an element in the cache. Will return one of the freed indices, or a new one.
     * 
     * @param {*} element - An object or a function to store in the cache
     * @returns {number}
     */
    add(element) {
        const index = this._freed.pop() ?? this._index++; 
        this._storage[index] = element;
        return index;
    }

    /**
     * Retrieves a stored element under the given index.
     * 
     * @param {number} index - An index of the element to retrieve.
     * @returns {*}
     */
    get(index) {
        return this._storage[index];
    }

    /**
     * Frees an index to allow a re-use of it in the future.
     * 
     * @param {number} index - An index to free. Once freed, the index might be used again.
     */
    free(index) {
        this._storage[index] = null;
        this._freed.push(index);
    }

    /**
     * Clears the cache from all elements and indices.
     */
    clear() {
        this._index = 0;
        this._freed.length = 0;
        this._storage.length = 0;
    }
}

export { IndexedCache };