function buildAccessors(obj, schema) {
    // Create getter/setter pairs for each property defined in the schema
    for (let i = 0, end = schema.length; i < end; i++) {
        const property = schema[i];

        // Don't override existing getters/setters
        //
        // The second test is a bit ugly. Is there a more elegant way?
        const etter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(obj), property) ||
            Object.getOwnPropertyDescriptor(Object.getPrototypeOf(obj.constructor.prototype), property);
        if (etter != null) continue;

        Object.defineProperty(obj, property, {
            get: function () {
                return this[`_${property}`];
            },
            set: function (value) {
                const oldValue = this[`_${property}`];
                this[`_${property}`] = value;
                this.fire('set', property, oldValue, value);
            },
            configurable: true
        });
    }

    obj.accessorsBuilt = true;
}

const cmpOrder = (a, b) => a.order - b.order;
const sortOrder = arr => arr.sort(cmpOrder);

export { buildAccessors, sortOrder };
