import { Debug } from "../../../debug.mjs";
import { BodyComponent } from "../body/component.mjs";
import { ShapeComponent } from "../component.mjs";

class SoftBodyComponent extends BodyComponent {
    // amount of substance * ideal gass constant * absolute temperature
    // n * R * T
    // see https://en.wikipedia.org/wiki/Pressure
    _pressure = 0;

    // Update the position of the body while simulating (set to false for something
    // that is attached to the static world)
    _updatePosition = true;

    // Bake specified mRotation in the vertices and set the body rotation to identity (simulation is slightly more accurate if the rotation of a soft body is kept to identity)
    _makeRotationIdentity = true;

    // Number of solver iterations
    _numIterations = 5;

    // Inverse of the stiffness of the spring.
    _compliance = 0;

    // Number of cells comprising a row. Think of a grid divided plane.
    _width = 0;

    // Number of cells comprising a column. Think of a grid divided plane.
    _length = 0;

    _fixedIndices = [];

    constructor(system, entity) {
        super(system, entity);
    }

    writeComponentData(cb) {
        this._writeShapeData(cb, this);

        cb.write(this._index, BUFFER_WRITE_UINT32, false);

        // We always use world position and rotation from the current entity the component
        // is attached to (instead of default zero vectors)
        const entity = this.entity;
        const pos = entity.getPosition();
        const rot = entity.getRotation();

        // TODO
        // get rid of flags

        // Loss of precision for pos/rot (64 -> 32)
        cb.write(pos, BUFFER_WRITE_VEC32, false);
        cb.write(rot, BUFFER_WRITE_VEC32, false);

        cb.write(this._collisionGroup, BUFFER_WRITE_UINT32);
        cb.write(this._subGroup, BUFFER_WRITE_UINT32);

        cb.write(this._objectLayer, BUFFER_WRITE_UINT16, false);
        cb.write(this._numIterations, BUFFER_WRITE_UINT32, false);
        cb.write(this._linearDamping, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxLinearVelocity, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._restitution, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._friction, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._pressure, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._gravityFactor, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._updatePosition, BUFFER_WRITE_BOOL, false);
        cb.write(this._makeRotationIdentity, BUFFER_WRITE_BOOL, false);
        cb.write(this._allowSleeping, BUFFER_WRITE_BOOL, false);

        DEBUG && cb.write(this._debugDraw, BUFFER_WRITE_BOOL, false);
    }

    onEnable() {
        if (DEBUG) {
            if (!this._renderAsset && !this._meshes) {
                Debug.warn('Unable to locate mesh data for a soft body', this);
                return;
            }
        }

        const system = this.system;

        this._index = system.getIndex(this.entity);

        if (this._renderAsset && !this._meshes) {
            this._addMeshes();
        } else {
            system.createBody(this);
        }
    }

    _writeShapeData(cb) {
        let useEntityScale = this._useEntityScale;
        let scale;
        if (useEntityScale) {
            scale = this.entity.getLocalScale();
            if (scale.x === 1 && scale.y === 1 && scale.z === 1) {
                useEntityScale = false;
            }
        }

        cb.write(useEntityScale, BUFFER_WRITE_BOOL, false);
        if (useEntityScale) {
            // Potential precision loss 64 -> 32
            cb.write(scale, BUFFER_WRITE_VEC32, false);
        }
    
        ShapeComponent.addMeshes(this._meshes, cb);

        cb.write(this._width, BUFFER_WRITE_UINT32, false);
        cb.write(this._length, BUFFER_WRITE_UINT32, false);
        cb.write(this._compliance, BUFFER_WRITE_FLOAT32, false);

        const fixed = this._fixedIndices;
        const count = fixed.length;

        cb.write(count, BUFFER_WRITE_UINT32, false);
        for (let i = 0; i < count; i++) {
            cb.write(fixed[i], BUFFER_WRITE_UINT32, false);
        }
    }

}

export { SoftBodyComponent };