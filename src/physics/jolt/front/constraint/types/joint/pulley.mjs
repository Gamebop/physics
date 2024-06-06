import { Vec3 } from 'playcanvas';
import {
    BUFFER_WRITE_FLOAT32, BUFFER_WRITE_VEC32, CONSTRAINT_TYPE_PULLEY
} from '../../../../constants.mjs';
import { JointConstraint } from '../joint-constraint.mjs';

/**
 * Pulley constraint.
 *
 * @group Utilities
 * @category Constraints
 */
class PulleyConstraint extends JointConstraint {
    _type = CONSTRAINT_TYPE_PULLEY;

    _fixedPoint1 = Vec3.ZERO;

    _fixedPoint2 = Vec3.ZERO;

    _ratio = 1;

    _minLength = 0;

    _maxLength = -1;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        if (opts.fixedPoint1) this._fixedPoint1 = opts.fixedPoint1;
        if (opts.fixedPoint2) this._fixedPoint2 = opts.fixedPoint2;
        this._ratio = opts.ratio ?? this._ratio;
        this._minLength = opts.minLength ?? this._minLength;
        this._maxLength = opts.maxLength ?? this._maxLength;
    }

    /**
     * Fixed world point to which body 1 is connected (always in world space).
     *
     * @returns {import('playcanvas').Vec3} - World position of a point.
     * @defaultValue Vec3(0, 0, 0)
     */
    get fixedPoint1() {
        return this._fixedPoint1;
    }

    /**
     * Fixed world point to which body 2 is connected (always in world space).
     *
     * @returns {import('playcanvas').Vec3} - World position of a point.
     * @defaultValue Vec3(0, 0, 0)
     */
    get fixedPoint2() {
        return this._fixedPoint2;
    }

    /**
     * Ratio between the two line segments:
     * ```
     * MinDistance <= Length1 + Ratio * Length2 <= MaxDistance
     * ```
     *
     * @returns {number} - Ratio between line segments.
     * @defaultValue 1
     */
    get ratio() {
        return this._ratio;
    }

    /**
     * The minimum length of the line segments. Use -1 to calculate the length based on the
     * positions of the objects when the constraint is created.
     *
     * @returns {number} - Length of line segments (meters).
     * @defaultValue 0
     */
    get minLength() {
        return this._minLength;
    }

    /**
     * The maximum length of the line segments. Use -1 to calculate the length based on the
     * positions of the objects when the constraint is created.
     *
     * @returns {number} - Length of line segments (meters).
     * @defaultValue 0
     */
    get maxLength() {
        return this._maxLength;
    }

    /**
     * @returns {number} - Constraint type alias number.
     * @defaultValue CONSTRAINT_TYPE_PULLEY
     */
    get type() {
        return this._type;
    }

    write(cb) {
        super.write(cb);

        cb.write(this._fixedPoint1, BUFFER_WRITE_VEC32, false);
        cb.write(this._fixedPoint2, BUFFER_WRITE_VEC32, false);
        cb.write(this._ratio, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._minLength, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxLength, BUFFER_WRITE_FLOAT32, false);
    }
}

export { PulleyConstraint };
