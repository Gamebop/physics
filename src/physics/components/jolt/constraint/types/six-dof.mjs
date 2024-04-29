import { Debug } from "../../../../debug.mjs";
import { Constraint, SpringSettings, MotorSettings } from "./constraint.mjs";

function copyArr(src, dst) {
    for (let i = 0; i < src.length; ++i) {
        dst[i] = src[i];
    }
}

function copySettings(Constructor, src) {
    const settings = [];
    for (let i = 0; i < 6; ++i) {
        settings.push(new Constructor(src[i]));
    }
    return settings;
}

class SixDOFConstraint extends Constraint {
    _type = CONSTRAINT_TYPE_SIX_DOF;

    _axisX1 = pc.Vec3.RIGHT;

    _axisX2 = pc.Vec3.RIGHT;

    _axisY1 = pc.Vec3.UP;

    _axisY2 = pc.Vec3.UP;

    _fixedAxes = null;

    _freeAxes = null;

    _limitedAxes = null;

    _limitMax = null;

    _limitMin = null;

    _maxFriction = null;

    _swingType = CONSTRAINT_SWING_TYPE_CONE;

    _limitsSpringSettings = null;

    _motorSettings = null;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        opts.axisX1 && (this._axisX1 = opts.axisX1);
        opts.axisX2 && (this._axisX2 = opts.axisX2);
        opts.axisY1 && (this._axisY1 = opts.axisY1);
        opts.axisY2 && (this._axisY2 = opts.axisY2);

        this._swingType = opts.swingType ?? this._swingType;

        if (opts.fixedAxes) {
            this._fixedAxes = [];
            copyArr(opts.fixedAxes, this._fixedAxes);
        } else if (opts.freeAxes) {
            this._freeAxes = [];
            copyArr(opts.freeAxes, this._freeAxes);
        } else if (opts.limitedAxes) {
            this._limitedAxes = [];
            copyArr(opts.limitedAxes, this._limitedAxes);
        }

        if (opts.limitMin) {
            this._limitMin = [];
            copyArr(opts.limitMin, this._limitMin);
        }

        if (opts.limitMax) {
            this._limitMax = [];
            copyArr(opts.limitMax, this._limitMax);
        }

        if (opts.maxFriction) {
            this._maxFriction = [];
            copyArr(opts.maxFriction, this._maxFriction);
        }

        if (opts.limitsSpringSettings) {
            this._limitsSpringSettings = copySettings(SpringSettings, opts.limitsSpringSettings);
        }

        if (opts.motorSettings) {
            this._motorSettings = copySettings(MotorSettings, opts.motorSettings);
        }
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

    setTranslationLimits(min, max) {
        if (DEBUG) {
            let ok = Debug.checkVec(min, 'Invalid min vector for constraint limits', min);
            ok = ok && Debug.checkVec(max, 'Invalid max vector for constraint limits', min);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_LIMITS, this._index,
            min, BUFFER_WRITE_VEC32, false,
            max, BUFFER_WRITE_VEC32, false
        );
    }

    setRotationLimits(min, max) {
        if (DEBUG) {
            let ok = Debug.checkVec(min, 'Invalid min vector for constraint limits', min);
            ok = ok && Debug.checkVec(max, 'Invalid max vector for constraint limits', min);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_R_LIMITS, this._index,
            min, BUFFER_WRITE_VEC32, false,
            max, BUFFER_WRITE_VEC32, false
        );
    }

    setLimitsSpringSettings(axis, settings) {
        if (DEBUG) {
            let ok = Debug.checkUint(axis, `Invalid axis uint scalar: ${ axis }`);
            ok = ok && Debug.checkSpringSettings(settings);
            if (!ok) {
                return;
            }
        }

        const mode = settings.springMode ?? SPRING_MODE_FREQUENCY;
        const freqOrStiff = mode === SPRING_MODE_FREQUENCY ?
            settings.frequency : settings.stiffness;

        // TODO
        // needs update after we get rid of flags
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_SPRING_S, this._index,
            true, BUFFER_WRITE_BOOL, false,
            settings.springMode, BUFFER_WRITE_UINT8, true,
            freqOrStiff, BUFFER_WRITE_FLOAT32, true,
            settings.damping, BUFFER_WRITE_FLOAT32, true,
            axis, BUFFER_WRITE_UINT8, false
        );
    }

    setMaxFriction(axis, friction) {
        if (DEBUG) {
            let ok = Debug.checkUint(axis, `Invalid axis uint scalar: ${ axis }`);
            ok = ok && Debug.checkFloat(friction, `Invalid max friction scalar value: ${ friction }`);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_M_F, this._index,
            axis, BUFFER_WRITE_UINT8, false,
            friction, BUFFER_WRITE_FLOAT32, false
        );
    }

    setMotorState(axis, state) {
        if (DEBUG) {
            let ok = Debug.checkUint(axis, `Invalid axis uint scalar: ${ axis }`);
            ok = ok && Debug.checkUint(state, `Invalid motor state scalar for constraint:`, state);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_M_STATE, this._index,
            axis, BUFFER_WRITE_UINT8, false,
            state, BUFFER_WRITE_UINT8, false
        );
    }

    setTargetVelocityCS(velocity) {
        if (DEBUG) {
            const ok = Debug.checkVec(velocity, 'Invalid velocity vector:', velocity);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_VEL_CS, this._index,
            velocity, BUFFER_WRITE_VEC32, false
        );
    }

    setTargetAngularVelocityCS(velocity) {
        if (DEBUG) {
            const ok = Debug.checkVec(velocity, 'Invalid velocity vector:', velocity);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_ANG_VEL_CS, this._index,
            velocity, BUFFER_WRITE_VEC32, false
        );
    }

    setTargetPositionCS(position) {
        if (DEBUG) {
            const ok = Debug.checkVec(position, 'Invalid position vector:', position);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_POS_CS, this._index,
            position, BUFFER_WRITE_VEC32, false
        );
    }

    setTargetOrientationCS(rotation) {
        if (DEBUG) {
            const ok = Debug.checkQuat(rotation, 'Invalid rotation quaternion:', rotation);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_ROT_CS, this._index,
            rotation, BUFFER_WRITE_VEC32, false
        );
    }

    setTargetOrientationBS(rotation) {
        if (DEBUG) {
            const ok = Debug.checkQuat(rotation, 'Invalid rotation quaternion:', rotation);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_ROT_BS, this._index,
            rotation, BUFFER_WRITE_VEC32, false
        );
    }

    write(cb) {
        super.write(cb);

        const maxFriction = this._maxFriction;
        const limitMin = this._limitMin;
        const limitMax = this._limitMax;

        Constraint.writeAxes(cb, this._freeAxes);
        Constraint.writeAxes(cb, this._fixedAxes);
        Constraint.writeAxes(cb, this._limitedAxes, true);

        cb.write(this._point1, BUFFER_WRITE_VEC32, false);
        cb.write(this._axisX1, BUFFER_WRITE_VEC32, false);
        cb.write(this._axisY1, BUFFER_WRITE_VEC32, false);
        cb.write(this._point2, BUFFER_WRITE_VEC32, false);
        cb.write(this._axisX2, BUFFER_WRITE_VEC32, false);
        cb.write(this._axisY2, BUFFER_WRITE_VEC32, false);

        cb.write(!!maxFriction, BUFFER_WRITE_BOOL, false);
        if (maxFriction) {
            for (let i = 0; i < 6; i++) {
                cb.write(maxFriction[i], BUFFER_WRITE_FLOAT32, false);
            }
        }

        cb.write(!!limitMin, BUFFER_WRITE_BOOL, false);
        if (limitMin) {
            for (let i = 0; i < 6; i++) {
                cb.write(limitMin[i], BUFFER_WRITE_FLOAT32, false);
            }
        }

        cb.write(!!limitMax, BUFFER_WRITE_BOOL, false);
        if (limitMax) {
            for (let i = 0; i < 6; i++) {
                cb.write(limitMax[i], BUFFER_WRITE_FLOAT32, false);
            }
        }

        const limitsSpringSettings = this._limitsSpringSettings;
        const motorSettings = this._motorSettings;

        cb.write(!!limitsSpringSettings, BUFFER_WRITE_BOOL, false);
        if (!!limitsSpringSettings) {
            for (let i = 0; i < 6; ++i) {
                Constraint.writeSpringSettings(cb, limitsSpringSettings[i]);
            }
        }

        cb.write(!!motorSettings, BUFFER_WRITE_BOOL, false);
        if (!!motorSettings) {
            for (let i = 0; i < 6; ++i) {
                Constraint.writeMotorSettings(cb, motorSettings[i]);
            }
        }
    }
}

export { SixDOFConstraint };