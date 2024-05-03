import { Vec3 } from 'playcanvas';
import { Debug } from '../../../debug.mjs';
import { Constraint, MotorSettings } from './constraint.mjs';
import {
    BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT8, BUFFER_WRITE_VEC32, CMD_JNT_ST_SET_M_F_TORQUE,
    CMD_JNT_ST_SET_N_H_C_ANGLE, CMD_JNT_ST_SET_P_H_C_ANGLE, CMD_JNT_ST_SET_SWING_M_S,
    CMD_JNT_ST_SET_TWIST_M_S, CMD_JNT_ST_SET_T_ANG_VEL_CS, CMD_JNT_ST_SET_T_MAX_ANGLE, CMD_JNT_ST_SET_T_MIN_ANGLE,
    CMD_JNT_ST_SET_T_O_BS, CMD_JNT_ST_SET_T_O_CS, CONSTRAINT_TYPE_SWING_TWIST,
    OPERATOR_MODIFIER
} from '../../../constants.mjs';

/**
 * Interface for swing-twist constraint.
 *
 * @group Utilities
 * @category Constraints
 */
class SwingTwistConstraint extends Constraint {
    _type = CONSTRAINT_TYPE_SWING_TWIST;

    _twistAxis1 = Vec3.RIGHT;

    _twistAxis2 = Vec3.RIGHT;

    _planeAxis1 = Vec3.UP;

    _planeAxis2 = Vec3.UP;

    _normalHalfConeAngle = 0;

    _planeHalfConeAngle = 0;

    _twistMinAngle = 0;

    _twistMaxAngle = 0;

    _maxFrictionTorque = 0;

    _swingMotorSettings = null;

    _twistMotorSettings = null;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        this._twistAxis1 = opts.twistAxis1 || this._twistAxis1;
        this._twistAxis2 = opts.twistAxis2 || this._twistAxis2;
        this._planeAxis1 = opts.planeAxis1 || this._planeAxis1;
        this._planeAxis2 = opts.planeAxis2 || this._planeAxis2;
        this._normalHalfConeAngle = opts.normalHalfConeAngle ?? this._normalHalfConeAngle;

        if (opts.swingMotorSettings) {
            this._swingMotorSettings = new MotorSettings(opts.swingMotorSettings);
        }

        if (opts.twistMotorSettings) {
            this._twistMotorSettings = new MotorSettings(opts.twistMotorSettings);
        }
    }

    set maxFrictionTorque(torque) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(torque, `Invalid max friction torque scalar: ${torque}`);
            if (!ok) {
                return;
            }
        }

        if (this._maxFrictionTorque === torque) {
            return;
        }

        this._maxFrictionTorque = torque;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_M_F_TORQUE, this._index,
            torque, BUFFER_WRITE_FLOAT32, false
        );
    }

    get maxFrictionTorque() {
        return this._maxFrictionTorque;
    }

    get swingMotorSettings() {
        return this._swingMotorSettings;
    }

    set normalHalfConeAngle(angle) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(angle, `Invalid half cone angle scalar: ${angle}`);
            if (!ok) {
                return;
            }
        }

        if (this._normalHalfConeAngle === angle) {
            return;
        }

        this._normalHalfConeAngle = angle;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_N_H_C_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }

    get normalHalfConeAngle() {
        return this._normalHalfConeAngle;
    }

    set planeHalfConeAngle(angle) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(angle, `Invalid plane half cone angle scalar: ${angle}`);
            if (!ok) {
                return;
            }
        }

        if (this._planeHalfConeAngle === angle) {
            return;
        }

        this._planeHalfConeAngle = angle;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_P_H_C_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }

    get planeHalfConeAngle() {
        return this._planeHalfConeAngle;
    }

    get twistAxis1() {
        return this._twistAxis1;
    }

    get twistAxis2() {
        return this._twistAxis2;
    }

    set twistMaxAngle(angle) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(angle, `Invalid twist max angle scalar: ${angle}`);
            if (!ok) {
                return;
            }
        }

        if (this._twistMaxAngle === angle) {
            return;
        }

        this._twistMaxAngle = angle;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_T_MAX_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }

    get twistMaxAngle() {
        return this._twistMaxAngle;
    }

    set twistMinAngle(angle) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(angle, `Invalid twist min angle scalar: ${angle}`);
            if (!ok) {
                return;
            }
        }

        if (this._twistMinAngle === angle) {
            return;
        }

        this._twistMinAngle = angle;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_T_MIN_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }

    get twistMinAngle() {
        return this._twistMinAngle;
    }

    get twistMotorSettings() {
        return this._twistMotorSettings;
    }

    setTargetOrientationCS(rotation) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_T_O_CS, this._index,
            rotation, BUFFER_WRITE_VEC32, false
        );
    }

    setTargetOrientationBS(rotation) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_T_O_BS, this._index,
            rotation, BUFFER_WRITE_VEC32, false
        );
    }

    setTargetAngularVelocityCS(velocity) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_T_ANG_VEL_CS, this._index,
            velocity, BUFFER_WRITE_VEC32, false
        );
    }

    setSwingMotorState(state) {
        if ($_DEBUG) {
            const ok = Debug.checkUint(state, `Invalid motor state scalar: ${state}`);
            if (!ok) {
                return;
            }
        }
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_SWING_M_S, this._index,
            state, BUFFER_WRITE_UINT8, false
        );
    }

    setTwistMotorState(state) {
        if ($_DEBUG) {
            const ok = Debug.checkUint(state, `Invalid motor state scalar: ${state}`);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_TWIST_M_S, this._index,
            state, BUFFER_WRITE_UINT8, false
        );
    }

    write(cb) {
        super.write(cb);

        cb.write(this._point1, BUFFER_WRITE_VEC32);
        cb.write(this._twistAxis1, BUFFER_WRITE_VEC32);
        cb.write(this._planeAxis1, BUFFER_WRITE_VEC32);
        cb.write(this._point2, BUFFER_WRITE_VEC32);
        cb.write(this._twistAxis2, BUFFER_WRITE_VEC32);
        cb.write(this._planeAxis2, BUFFER_WRITE_VEC32);
        cb.write(this._normalHalfConeAngle, BUFFER_WRITE_FLOAT32);
        cb.write(this._planeHalfConeAngle, BUFFER_WRITE_FLOAT32);
        cb.write(this._twistMinAngle, BUFFER_WRITE_FLOAT32);
        cb.write(this._twistMaxAngle, BUFFER_WRITE_FLOAT32);
        cb.write(this._maxFrictionTorque, BUFFER_WRITE_FLOAT32);

        Constraint.writeMotorSettings(cb, this._swingMotorSettings);
        Constraint.writeMotorSettings(cb, this._twistMotorSettings);
    }
}

export { SwingTwistConstraint };
