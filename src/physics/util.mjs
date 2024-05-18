import { Vec3 } from 'playcanvas';
import { BUFFER_READ_FLOAT32 } from '../index.mjs';

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

function fromBuffer(buffer) {
    return new Vec3(
        buffer.read(BUFFER_READ_FLOAT32),
        buffer.read(BUFFER_READ_FLOAT32),
        buffer.read(BUFFER_READ_FLOAT32)
    );
}

export { buildAccessors, fromBuffer };
