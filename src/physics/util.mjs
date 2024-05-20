import { Vec3 } from 'playcanvas';

function buildAccessors(obj, schema) {
    // Create getter/setter pairs for each property defined in the schema
    for (let i = 0, end = schema.length; i < end; i++) {
        const property = schema[i];

        // Don't override existing getters/setters
        const etter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(obj), property);
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

export { buildAccessors };
