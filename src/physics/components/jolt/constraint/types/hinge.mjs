import { Vec3 } from "playcanvas";
import { Debug } from "../../../../debug.mjs";
import { Constraint, SpringSettings, MotorSettings } from "./constraint.mjs";
import {
    BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT8,
    BUFFER_WRITE_VEC32, CMD_JNT_H_SET_LIMITS, CMD_JNT_H_SET_M_F_TORQUE,
    CMD_JNT_H_SET_M_S, CMD_JNT_H_SET_SPRING_S, CMD_JNT_H_SET_T_ANGLE,
    CMD_JNT_H_SET_T_ANG_VEL, CONSTRAINT_TYPE_HINGE, OPERATOR_MODIFIER,
    SPRING_MODE_FREQUENCY
} from "../../constants.mjs";

class HingeConstraint extends Constraint {
    _type = CONSTRAINT_TYPE_HINGE;

    _hingeAxis1 = Vec3.UP;

    _hingeAxis2 = Vec3.UP;

    _normalAxis1 = Vec3.RIGHT;

    _normalAxis2 = Vec3.RIGHT;

    _limitsMax = 3.141592653589793;

    _limitsMin = -3.141592653589793;

    _limitsSpringSettings = null;

    _motorSettings = null;

    _maxFrictionTorque = 0;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        opts.hingeAxis1 && (this._hingeAxis1 = opts.hingeAxis1);
        opts.hingeAxis2 && (this._hingeAxis2 = opts.hingeAxis2);
        opts.normalAxis1 && (this._normalAxis1 = opts.normalAxis1);
        opts.normalAxis2 && (this._normalAxis2 = opts.normalAxis2);

        this._limitsMin = opts.limitsMin ?? this._limitsMin;
        this._limitsMax = opts.limitsMax ?? this._limitsMax;
        this._maxFrictionTorque = opts.maxFrictionTorque ?? this._maxFrictionTorque;

        if (opts.limitsSpringSettings) {
            this._limitsSpringSettings = new SpringSettings(opts.limitsSpringSettings);
        }

        if (opts.motorSettings) {
            this._motorSettings = new MotorSettings(opts.motorSettings);
        }
    }

    get hingeAxis1() {
        return this._hingeAxis1;
    }

    get hingeAxis2() {
        return this._hingeAxis2;
    }

    get limitsMax() {
        return this._limitsMax;
    }

    get limitsMin() {
        return this._limitsMin;
    }

    get limitsSpringSettings() {
        return this._limitsSpringSettings;
    }

    set limitsSpringSettings(settings) {
        if (DEBUG) {
            const ok = Debug.checkSpringSettings(settings);
            if (!ok) {
                return;
            }
        }

        this._limitsSpringSettings = settings;

        const mode = settings.springMode ?? SPRING_MODE_FREQUENCY;
        const freqOrStiff = mode === SPRING_MODE_FREQUENCY ?
            settings.frequency : settings.stiffness;

        // TODO
        // needs update after we get rid of flags
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_H_SET_SPRING_S, this._index,
            true, BUFFER_WRITE_BOOL, false,
            settings.springMode, BUFFER_WRITE_UINT8, true,
            freqOrStiff, BUFFER_WRITE_FLOAT32, true,
            settings.damping, BUFFER_WRITE_FLOAT32, true
        );
    }

    get maxFrictionTorque() {
        return this._maxFrictionTorque;
    }

    set maxFrictionTorque(torque) {
        if (this._maxFrictionTorque === torque) {
            return;
        }

        this._maxFrictionTorque = torque;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_H_SET_M_F_TORQUE, this._index,
            torque, BUFFER_WRITE_FLOAT32, false
        );
    }

    get motorSettings() {
        return this._motorSettings;
    }

    get normalAxis1() {
        return this._normalAxis1;
    }

    get normalAxis2() {
        return this._normalAxis2;
    }

    write(cb) {
        super.write(cb);

        cb.write(this._point1, BUFFER_WRITE_VEC32);
        cb.write(this._hingeAxis1, BUFFER_WRITE_VEC32);
        cb.write(this._normalAxis1, BUFFER_WRITE_VEC32);
        cb.write(this._point2, BUFFER_WRITE_VEC32);
        cb.write(this._hingeAxis2, BUFFER_WRITE_VEC32);
        cb.write(this._normalAxis2, BUFFER_WRITE_VEC32);
        cb.write(this._limitsMin, BUFFER_WRITE_FLOAT32);
        cb.write(this._limitsMax, BUFFER_WRITE_FLOAT32);
        cb.write(this._maxFrictionTorque, BUFFER_WRITE_FLOAT32);

        Constraint.writeSpringSettings(cb, this._limitsSpringSettings);
        Constraint.writeMotorSettings(cb, this._motorSettings);
    }

    setMotorState(state) {
        if (DEBUG) {
            const ok = Debug.checkUint(state, `Invalid motor state for constraint:`, state);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_H_SET_M_S, this._index,
            state, BUFFER_WRITE_UINT8, false
        );
    }

    setTargetAngularVelocity(velocity) {
        if (DEBUG) {
            const ok = Debug.checkFloat(velocity, `Invalid target velocity for constraint:`, velocity);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_H_SET_T_ANG_VEL, this._index,
            velocity, BUFFER_WRITE_FLOAT32, false
        );
    }

    setTargetAngle(angle) {
        if (DEBUG) {
            const ok = Debug.checkFloat(angle, `Invalid target radians for constraint:`, angle);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_H_SET_T_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }

    setLimits(min, max) {
        if (DEBUG) {
            let ok = Debug.checkFloat(min, `Invalid min scalar limit for constraint: ${ min }`);
            ok = ok && Debug.checkFloat(max, `Invalid max scalar limit for constraint: ${ max }`);
            ok = ok && Debug.assert(min <= max, `Invalid min/max range: [${ min } : ${ max }]`);
            if (!ok) {
                return;
            }
        }

        this._limitsMin = min;
        this._limitsMax = max;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_H_SET_LIMITS, this._index,
            min, BUFFER_WRITE_FLOAT32, false,
            max, BUFFER_WRITE_FLOAT32, false
        );
    }
}

export { HingeConstraint };