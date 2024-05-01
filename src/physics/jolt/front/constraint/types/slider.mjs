import { Vec3 } from 'playcanvas';
import { Debug } from '../../../debug.mjs';
import { Constraint, SpringSettings, MotorSettings } from './constraint.mjs';
import {
    BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT8,
    BUFFER_WRITE_VEC32, CMD_JNT_S_SET_LIMITS, CMD_JNT_S_SET_M_F_FORCE,
    CMD_JNT_S_SET_M_STATE, CMD_JNT_S_SET_SPRING_S, CMD_JNT_S_SET_T_POS,
    CMD_JNT_S_SET_T_VEL, CONSTRAINT_TYPE_SLIDER, OPERATOR_MODIFIER,
    SPRING_MODE_FREQUENCY
} from '../../../constants.mjs';

class SliderConstraint extends Constraint {
    _type = CONSTRAINT_TYPE_SLIDER;

    _sliderAxis1 = Vec3.RIGHT;

    _sliderAxis2 = Vec3.RIGHT;

    _normalAxis1 = Vec3.UP;

    _normalAxis2 = Vec3.UP;

    _limitsMin = -Number.MAX_VALUE;

    _limitsMax = Number.MAX_VALUE;

    _maxFrictionForce = 0;

    _limitsSpringSettings = null;

    _motorSettings = null;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        opts.sliderAxis1 && (this._sliderAxis1 = opts.sliderAxis1);
        opts.sliderAxis2 && (this._sliderAxis2 = opts.sliderAxis2);
        opts.normalAxis1 && (this._normalAxis1 = opts.normalAxis1);
        opts.normalAxis2 && (this._normalAxis2 = opts.normalAxis2);

        this._limitsMin = opts.limitsMin ?? this._limitsMin;
        this._limitsMax = opts.limitsMax ?? this._limitsMax;
        this._maxFrictionForce = opts.maxFrictionForce ?? this._maxFrictionForce;

        if (opts.limitsSpringSettings) {
            this._limitsSpringSettings = new SpringSettings(opts.limitsSpringSettings);
        }

        if (opts.motorSettings) {
            this._motorSettings = new MotorSettings(opts.motorSettings);
        }
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
        if ($_DEBUG) {
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
            OPERATOR_MODIFIER, CMD_JNT_S_SET_SPRING_S, this._index,
            true, BUFFER_WRITE_BOOL, false,
            settings.springMode, BUFFER_WRITE_UINT8, true,
            freqOrStiff, BUFFER_WRITE_FLOAT32, true,
            settings.damping, BUFFER_WRITE_FLOAT32, true
        );
    }    

    get maxFrictionForce() {
        return this._maxFrictionForce;
    }

    set maxFrictionForce(force) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(force, `Invalid max friction force scalar value: ${ force }`);
            if (!ok) {
                return;
            }
        }

        if (this._maxFrictionForce === force) {
            return;
        }

        this._maxFrictionForce = force;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_S_SET_M_F_FORCE, this._index,
            force, BUFFER_WRITE_FLOAT32, false
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

    get sliderAxis1() {
        return this._sliderAxis1;
    }

    get sliderAxis2() {
        return this._sliderAxis2;
    }

    write(cb) {
        super.write(cb);

        const auto = this._autoDetectPoint;
        cb.write(auto, BUFFER_WRITE_BOOL);
        if (!auto) {
            cb.write(this._point1, BUFFER_WRITE_VEC32);
            cb.write(this._point2, BUFFER_WRITE_VEC32);
        }
        cb.write(this._sliderAxis1, BUFFER_WRITE_VEC32);
        cb.write(this._normalAxis1, BUFFER_WRITE_VEC32);
        cb.write(this._sliderAxis2, BUFFER_WRITE_VEC32);
        cb.write(this._normalAxis2, BUFFER_WRITE_VEC32);
        cb.write(this._limitsMin, BUFFER_WRITE_FLOAT32);
        cb.write(this._limitsMax, BUFFER_WRITE_FLOAT32);
        cb.write(this._maxFrictionForce, BUFFER_WRITE_FLOAT32);

        Constraint.writeSpringSettings(cb, this._limitsSpringSettings);
        Constraint.writeMotorSettings(cb, this._motorSettings);
    }

    setMotorState(state) {
        if ($_DEBUG) {
            const ok = Debug.checkUint(state, `Invalid motor state scalar for constraint:`, state);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_S_SET_M_STATE, this._index,
            state, BUFFER_WRITE_UINT8, false
        );
    }

    setTargetVelocity(velocity) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(velocity, `Invalid target velocity scalar for constraint:`, velocity);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_S_SET_T_VEL, this._index,
            velocity, BUFFER_WRITE_FLOAT32, false
        );
    }

    setTargetPosition(pos) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(pos, `Invalid target position scalar for constraint:`, pos);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_S_SET_T_POS, this._index,
            pos, BUFFER_WRITE_FLOAT32, false
        );
    }

    setLimits(min, max) {
        if ($_DEBUG) {
            let ok = Debug.checkFloat(min, `Invalid min limit for constraint: ${ min }`);
            ok = ok && Debug.checkFloat(max, `Invalid max limit for constraint: ${ max }`);
            ok = ok && Debug.assert(min <= max, `Invalid min/max range: [${ min } : ${ max }]`);
            if (!ok) {
                return;
            }
        }

        this._limitsMin = min;
        this._limitsMax = max;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_S_SET_LIMITS, this._index,
            min, BUFFER_WRITE_FLOAT32, false,
            max, BUFFER_WRITE_FLOAT32, false
        );
    }
}

export { SliderConstraint };