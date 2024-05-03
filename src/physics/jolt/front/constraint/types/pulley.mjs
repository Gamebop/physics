import { Vec3 } from 'playcanvas';
import { Constraint } from './constraint.mjs';
import {
    BUFFER_WRITE_FLOAT32, BUFFER_WRITE_VEC32, CONSTRAINT_TYPE_PULLEY
} from '../../../constants.mjs';

/**
 * Interface for pulley constraint.
 *
 * @group Utilities
 * @category Constraints
 */
class PulleyConstraint extends Constraint {
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

    get fixedPoint1() {
        return this._fixedPoint1;
    }

    get fixedPoint2() {
        return this._fixedPoint2;
    }

    get ratio() {
        return this._ratio;
    }

    get minLength() {
        return this._minLength;
    }

    get maxLength() {
        return this._maxLength;
    }

    write(cb) {
        super.write(cb);

        cb.write(this._point1, BUFFER_WRITE_VEC32, false);
        cb.write(this._point2, BUFFER_WRITE_VEC32, false);
        cb.write(this._fixedPoint1, BUFFER_WRITE_VEC32, false);
        cb.write(this._fixedPoint2, BUFFER_WRITE_VEC32, false);
        cb.write(this._ratio, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._minLength, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxLength, BUFFER_WRITE_FLOAT32, false);
    }
}

export { PulleyConstraint };
