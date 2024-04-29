import { Debug } from "../../../../debug.mjs";
import { Constraint } from "./constraint.mjs";

class ConeConstraint extends Constraint {
    _type = CONSTRAINT_TYPE_CONE;

    _twistAxis1 = pc.Vec3.RIGHT;

    _twistAxis2 = pc.Vec3.RIGHT;

    _halfConeAngle = 0;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        opts.twistAxis1 && (this._twistAxis1 = opts.twistAxis1);
        opts.twistAxis2 && (this._twistAxis2 = opts.twistAxis2);

        this._halfConeAngle = opts.halfConeAngle ?? this._halfConeAngle;
    }

    get halfConeAngle() {
        return this._halfConeAngle;
    }

    set halfConeAngle(angle) {
        if (DEBUG) {
            const ok = Debug.checkFloat(angle, `Invalid half cone angle scalar: ${ angle }`);
            if (!ok) {
                return;
            }
        }

        if (this._halfConeAngle === angle) {
            return;
        }

        this._halfConeAngle = angle;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_C_SET_H_C_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }    

    get twistAxis1() {
        return this._twistAxis1;
    }

    get twistAxis2() {
        return this._twistAxis2;
    }

    write(cb) {
        super.write(cb);

        cb.write(this._point1, BUFFER_WRITE_VEC32);
        cb.write(this._twistAxis1, BUFFER_WRITE_VEC32);
        cb.write(this._point2, BUFFER_WRITE_VEC32);
        cb.write(this._twistAxis2, BUFFER_WRITE_VEC32);
        cb.write(this._halfConeAngle, BUFFER_WRITE_FLOAT32);
    }
}

export { ConeConstraint };