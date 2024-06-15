/**
 * An indexed map cache. Used to temporarily store objects and functions. For example, a raycast
 * callback function to be called, once we get the result from the physics backend.
 * Indices can be freed and re-used.
 *
 * @group Utilities
 */
class IndexedCache {
    constructor() {
        this._index = 0;
        this._freed = new Set();
        this._storage = [];
    }

    /**
     * Store an element in the cache. Will return one of the freed indices, or a new one.
     *
     * @param {object | function} element - An object or a function to store in the cache
     * @returns {number} - Index number under which the element is stored.
     */
    add(element) {
        const freed = this._freed;
        const [idx] = freed;
        if (idx !== undefined) {
            freed.delete(idx);
        }
        const index = idx ?? this._index++;
        this._storage[index] = element;
        return index;
    }

    /**
     * Retrieves a stored element under the given index.
     *
     * @param {number} index - An index of the element to retrieve.
     * @returns {object | function} - Element stored under given index.
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
        this._freed.add(index);
    }

    /**
     * Clears the cache from all elements and indices.
     */
    clear() {
        this._index = 0;
        this._freed.clear();
        this._storage.length = 0;
    }
}

export { IndexedCache };
