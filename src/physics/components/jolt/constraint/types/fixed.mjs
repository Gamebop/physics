import { Vec3 } from "playcanvas";
import { Debug } from "../../../../debug.mjs";
import { Constraint } from "./constraint.mjs";
import {
    BUFFER_WRITE_BOOL, BUFFER_WRITE_VEC32, CONSTRAINT_TYPE_FIXED
} from "../../constants.mjs";

class FixedConstraint extends Constraint {
    _type = CONSTRAINT_TYPE_FIXED;

    _autoDetectPoint = true;

    _axisX1 = Vec3.RIGHT;

    _axisX2 = Vec3.RIGHT;

    _axisY1 = Vec3.UP;

    _axisY2 = Vec3.UP;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        this._autoDetectPoint = opts.autoDetectPoint ?? this._autoDetectPoint;

        opts.axisX1 && (this._axisX1 = opts.axisX1);
        opts.axisX2 && (this._axisX2 = opts.axisX2);
        opts.axisY1 && (this._axisY1 = opts.axisY1);
        opts.axisY2 && (this._axisY2 = opts.axisY2);
    }

    get autoDetectPoint() {
        return this._autoDetectPoint;
    }

    get axisX1() {
        return this._axisX1;
    }

    get axisX2() {
        return this._axisX2;
    }

    get axisY1() {
        return this._axisY1;
    }

    get axisY2() {
        return this._axisY2;
    }

    write(cb) {
        const auto = this._autoDetectPoint;
        if (DEBUG && !auto) {
            let ok = Debug.checkVec(this._point1, 
                'Fixed constraint has disabled autoDetectPoint, but point1 was not provided');
            ok = ok && Debug.checkVec(this._point2,
                'Fixed constraint has disabled autoDetectPoint, but point2 was not provided');
            if (!ok) {
                return;
            }
        }

        super.write(cb);

        cb.write(auto, BUFFER_WRITE_BOOL);
        if (!auto) {
            cb.write(this._point1, BUFFER_WRITE_VEC32);
            cb.write(this._point2, BUFFER_WRITE_VEC32);
        }
        cb.write(this._axisX1, BUFFER_WRITE_VEC32);
        cb.write(this._axisY1, BUFFER_WRITE_VEC32);
        cb.write(this._axisX2, BUFFER_WRITE_VEC32);
        cb.write(this._axisY2, BUFFER_WRITE_VEC32);
    }


}

export { FixedConstraint };