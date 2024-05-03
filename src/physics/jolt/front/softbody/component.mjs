import { Debug } from '../../debug.mjs';
import { BodyComponent } from '../body/component.mjs';
import { ShapeComponent } from '../shape/component.mjs';
import {
    BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT16,
    BUFFER_WRITE_UINT32, BUFFER_WRITE_VEC32
} from '../../constants.mjs';

/**
 * A SoftBody Component.
 *
 * @category SoftBody Component
 */
class SoftBodyComponent extends BodyComponent {
    _pressure = 0;

    _updatePosition = true;

    _makeRotationIdentity = true;

    _numIterations = 5;

    _compliance = 0;

    _width = 0;

    _length = 0;

    _fixedIndices = [];

    /**
     * The pressure of the soft body. Calculated from:
     * ```text
     * n * R * T
     * (amount of substance * ideal gass constant * absolute temperature)
     * ```
     * see [Pressure](https://en.wikipedia.org/wiki/Pressure)
     *
     * @defaultValue 0
     * @returns {number} - TODO
     */
    get pressure() {
        return this._pressure;
    }

    /**
     * Update the position of the body while simulating (set to `false` for something that is
     * attached to the static world)
     *
     * @defaultValue true
     * @returns {boolean} - TODO
     */
    get updatePosition() {
        return this._updatePosition;
    }

    /**
     * Bake specified rotation in the vertices and set the body rotation to identity (simulation is
     * slightly more accurate if the rotation of a soft body is kept to identity)
     *
     * @defaultValue true
     * @returns {boolean} - TODO
     */
    get makeRotationIdentity() {
        return this._makeRotationIdentity;
    }

    /**
     * Number of solver iterations.
     *
     * @defaultValue 5
     * @returns {number} - TODO
     */
    get numIterations() {
        return this._numIterations;
    }

    /**
     * Inverse of the stiffness of the spring.
     *
     * @defaultValue 0
     * @returns {number} - TODO
     */
    get compliance() {
        return this._compliance;
    }

    /**
     * Number of cells comprising a row. Think of a grid divided plane.
     *
     * @defaultValue 0
     * @returns {number} - TODO
     */
    get width() {
        return this._width;
    }

    /**
     * Number of cells comprising a column. Think of a grid divided plane.
     *
     * @returns {number} - TODO
     */
    get length() {
        return this._length;
    }

    /**
     * An array of indices that point to the vertices which will be static (e.g. attached to
     * something in the world).
     *
     * @defaultValue [] // plain JS Array of integers
     * @returns {Array<number>} - TODO
     */
    get fixedIndices() {
        return this._fixedIndices;
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

        if ($_DEBUG) {
            cb.write(this._debugDraw, BUFFER_WRITE_BOOL, false);
        }
    }

    onEnable() {
        if ($_DEBUG) {
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
