import { Debug } from '../../../debug.mjs';
import {
    BUFFER_READ_BOOL, BUFFER_READ_FLOAT32, BUFFER_READ_UINT32, BUFFER_READ_UINT8, CONSTRAINT_SPACE_WORLD,
    CONSTRAINT_TYPE_CONE,
    CONSTRAINT_TYPE_DISTANCE,
    CONSTRAINT_TYPE_FIXED,
    CONSTRAINT_TYPE_HINGE,
    CONSTRAINT_TYPE_POINT,
    CONSTRAINT_TYPE_PULLEY,
    CONSTRAINT_TYPE_SIX_DOF,
    CONSTRAINT_TYPE_SLIDER,
    CONSTRAINT_TYPE_SWING_TWIST,
    CONSTRAINT_TYPE_VEHICLE_MOTO,
    CONSTRAINT_TYPE_VEHICLE_TRACK,
    CONSTRAINT_TYPE_VEHICLE_WHEEL
} from '../../../constants.mjs';
import { createMotorSettings, createSpringSettings, setSixDOFAxes } from './utils.mjs';

function createFixedConstraintSettings(Jolt, cb) {
    const settings = new Jolt.FixedConstraintSettings();
    
    if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
    if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);
    if (cb.flag) settings.mAutoDetectPoint = cb.read(BUFFER_READ_BOOL);
    if (cb.flag) settings.mAxisX1 = jv.FromBuffer(cb);
    if (cb.flag) settings.mAxisY1 = jv.FromBuffer(cb);
    if (cb.flag) settings.mAxisX2 = jv.FromBuffer(cb);
    if (cb.flag) settings.mAxisY2 = jv.FromBuffer(cb);

    return settings;
}

function createPointConstraintSettings(Jolt, jv, cb) {
    const settings = new Jolt.PointConstraintSettings();

    if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
    if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);

    return settings;
}

function createDistanceConstraintSettings(Jolt, jv, cb) {
    const settings = new Jolt.DistanceConstraintSettings();

    if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
    if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);
    if (cb.flag) settings.mMinDistance = cb.read(BUFFER_READ_FLOAT32);
    if (cb.flag) settings.mMaxDistance = cb.read(BUFFER_READ_FLOAT32);
    if (cb.read(BUFFER_READ_BOOL)) {
        const springSettings = createSpringSettings(cb, Jolt);
        settings.mLimitsSpringSettings = springSettings;
        Jolt.destroy(springSettings);
    }

    return settings;
}

function createHingeConstraintSettings(Jolt, jv, cb) {
    const settings = new Jolt.HingeConstraintSettings();

    if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
    if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);
    if (cb.flag) settings.mHingeAxis1 = jv.FromBuffer(cb);
    if (cb.flag) settings.mNormalAxis1 = jv.FromBuffer(cb);
    if (cb.flag) settings.mHingeAxis2 = jv.FromBuffer(cb);
    if (cb.flag) settings.mNormalAxis2 = jv.FromBuffer(cb);
    if (cb.flag) settings.mLimitsMin = cb.read(BUFFER_READ_FLOAT32);
    if (cb.flag) settings.mLimitsMax = cb.read(BUFFER_READ_FLOAT32);
    if (cb.flag) settings.mMaxFrictionTorque = cb.read(BUFFER_READ_FLOAT32);
    if (cb.read(BUFFER_READ_BOOL)) {
        const springSettings = createSpringSettings(cb, Jolt);
        settings.mLimitsSpringSettings = springSettings;
        Jolt.destroy(springSettings);
    }
    if (cb.read(BUFFER_READ_BOOL)) {
        const motorSettings = createMotorSettings(cb, Jolt);
        settings.mMotorSettings = motorSettings;
        Jolt.destroy(motorSettings);
    }

    return settings;
}

function createSliderConstraintSettings(Jolt, jv, cb) {
    const settings = new Jolt.SliderConstraintSettings();

    if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
    if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);
    if (cb.flag) settings.mAutoDetectPoint = cb.read(BUFFER_READ_BOOL);
    if (cb.flag) settings.mSliderAxis1 = jv.FromBuffer(cb);
    if (cb.flag) settings.mNormalAxis1 = jv.FromBuffer(cb);
    if (cb.flag) settings.mSliderAxis2 = jv.FromBuffer(cb);
    if (cb.flag) settings.mNormalAxis2 = jv.FromBuffer(cb);
    if (cb.flag) settings.mLimitsMin = cb.read(BUFFER_READ_FLOAT32);
    if (cb.flag) settings.mLimitsMax = cb.read(BUFFER_READ_FLOAT32);
    if (cb.flag) settings.mMaxFrictionForce = cb.read(BUFFER_READ_FLOAT32);
    if (cb.read(BUFFER_READ_BOOL)) {
        const springSettings = createSpringSettings(cb, Jolt);
        settings.mLimitsSpringSettings = springSettings;
        Jolt.destroy(springSettings);
    }
    if (cb.read(BUFFER_READ_BOOL)) {
        const motorSettings = createMotorSettings(cb, Jolt);
        settings.mMotorSettings = motorSettings;
        Jolt.destroy(motorSettings);
    }

    return settings;
}

function createConeConstraintSettings(Jolt, jv, cb) {
    const settings = new Jolt.ConeConstraintSettings();

    if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
    if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);
    if (cb.flag) settings.mTwistAxis1 = jv.FromBuffer(cb);
    if (cb.flag) settings.mTwistAxis2 = jv.FromBuffer(cb);
    if (cb.flag) settings.mHalfConeAngle = cb.read(BUFFER_READ_FLOAT32);

    return settings;
}

function createSwingTwistConstraintSettings(Jolt, jv, cb) {
    const settings = new Jolt.SwingTwistConstraintSettings();

    if (cb.flag) settings.mPosition1 = jv.FromBuffer(cb);
    if (cb.flag) settings.mPosition2 = jv.FromBuffer(cb);
    if (cb.flag) settings.mTwistAxis1 = jv.FromBuffer(cb);
    if (cb.flag) settings.mPlaneAxis1 = jv.FromBuffer(cb);
    if (cb.flag) settings.mTwistAxis2 = jv.FromBuffer(cb);
    if (cb.flag) settings.mPlaneAxis2 = jv.FromBuffer(cb);
    if (cb.flag) settings.mNormalHalfConeAngle = cb.read(BUFFER_READ_FLOAT32);
    if (cb.flag) settings.mPlaneHalfConeAngle = cb.read(BUFFER_READ_FLOAT32);
    if (cb.flag) settings.mTwistMinAngle = cb.read(BUFFER_READ_FLOAT32);
    if (cb.flag) settings.mTwistMaxAngle = cb.read(BUFFER_READ_FLOAT32);
    if (cb.flag) settings.mMaxFrictionTorque = cb.read(BUFFER_READ_FLOAT32);
    if (cb.read(BUFFER_READ_BOOL)) {
        const swingMotorSettings = createMotorSettings(cb, Jolt);
        settings.mSwingMotorSettings = swingMotorSettings;
        Jolt.destroy(swingMotorSettings);
    }
    if (cb.read(BUFFER_READ_BOOL)) {
        const twistMotorSettings = createMotorSettings(cb, Jolt);
        settings.mTwistMotorSettings = twistMotorSettings;
        Jolt.destroy(twistMotorSettings);
    }

    return settings;
}

function createPulleyConstraintSettings(Jolt, jv, cb) {
    const settings = new Jolt.PulleyConstraintSettings();

    settings.mBodyPoint1 = jv.FromBuffer(cb);
    settings.mBodyPoint2 = jv.FromBuffer(cb);
    settings.mFixedPoint1 = jv.FromBuffer(cb);
    settings.mFixedPoint2 = jv.FromBuffer(cb);
    settings.mRatio = cb.read(BUFFER_READ_FLOAT32);
    settings.mMinLength = cb.read(BUFFER_READ_FLOAT32);
    settings.mMaxLength = cb.read(BUFFER_READ_FLOAT32);

    return settings;
}

function createSixDOFConstraintSettings(Jolt, jv, cb) {
    const settings = new Jolt.SixDOFConstraintSettings();

    settings.mPosition1 = jv.FromBuffer(cb);
    settings.mPosition2 = jv.FromBuffer(cb);

    // free axes
    if (cb.read(BUFFER_READ_BOOL)) {
        setSixDOFAxes(cb, settings, 'MakeFreeAxis', Jolt, false /* isLimited */);
    }
    // fixed axes
    if (cb.read(BUFFER_READ_BOOL)) {
        setSixDOFAxes(cb, settings, 'MakeFixedAxis', Jolt, false /* isLimited */);
    }
    // limited axes
    if (cb.read(BUFFER_READ_BOOL)) {
        setSixDOFAxes(cb, settings, 'SetLimitedAxis', Jolt, true /* isLimited */);
    }

    settings.mAxisX1 = jv.FromBuffer(cb);
    settings.mAxisY1 = jv.FromBuffer(cb);
    settings.mAxisX2 = jv.FromBuffer(cb);
    settings.mAxisY2 = jv.FromBuffer(cb);

    // TODO
    // refactor

    if (cb.read(BUFFER_READ_BOOL)) {
        for (let i = 0; i < 6; ++i) {
            settings.set_mMaxFriction(i, cb.read(BUFFER_READ_FLOAT32));
        }
    }
    if (cb.read(BUFFER_READ_BOOL)) {
        for (let i = 0; i < 6; ++i) {
            settings.set_mLimitMin(i, cb.read(BUFFER_READ_FLOAT32));
        }
    }
    if (cb.read(BUFFER_READ_BOOL)) {
        for (let i = 0; i < 6; ++i) {
            settings.set_mLimitMax(i, cb.read(BUFFER_READ_FLOAT32));
        }
    }
    if (cb.read(BUFFER_READ_BOOL)) {
        for (let i = 0; i < 6; ++i) {
            if (cb.read(BUFFER_READ_BOOL)) {
                const springSettings = createSpringSettings(cb, Jolt);
                settings.set_mLimitsSpringSettings(i, springSettings);
                Jolt.destroy(springSettings);
            }
        }
    }
    if (cb.read(BUFFER_READ_BOOL)) {
        for (let i = 0; i < 6; ++i) {
            if (cb.read(BUFFER_READ_BOOL)) {
                const motorSettings = createMotorSettings(cb, Jolt);
                settings.set_mMotorSettings(i, motorSettings);
                Jolt.destroy(motorSettings);
            }
        }
    }

    return settings;
}

class ConstraintCreator {
    _creator = null;

    constructor(creator) {
        this._creator = creator;
    }

    create(cb) {
        const index = cb.read(BUFFER_READ_UINT32);
        const type = cb.read(BUFFER_READ_UINT8);

        if (type === CONSTRAINT_TYPE_VEHICLE_WHEEL || type === CONSTRAINT_TYPE_VEHICLE_MOTO ||
            type === CONSTRAINT_TYPE_VEHICLE_TRACK) {
            return this._createVehicle(type, index, cb);
        }

        return this._createJoint(type, index, cb);
    }

    _createJoint(type, index, cb) {
        const creator = this._creator;
        const jv = creator.jv;
        const backend = creator.backend;
        const Jolt = backend.Jolt;
        const tracker = backend.tracker;
        const physicsSystem = backend.physicsSystem;

        const velOverride = cb.read(BUFFER_READ_UINT8);
        const posOverride = cb.read(BUFFER_READ_UINT8);
        const idx1 = cb.read(BUFFER_READ_UINT32);
        const idx2 = cb.read(BUFFER_READ_UINT32);
        const space = (cb.read(BUFFER_READ_UINT8) === CONSTRAINT_SPACE_WORLD) ?
            Jolt.EConstraintSpace_WorldSpace : Jolt.EConstraintSpace_LocalToBodyCOM;

        const body1 = tracker.getBodyByPCID(idx1);
        const body2 = tracker.getBodyByPCID(idx2);

        if ($_DEBUG) {
            let ok = true;
            ok = ok && Debug.assert(!!body1, `Unable to locate body to add constraint to: ${idx1}`);
            ok = ok && Debug.assert(!!body2, `Unable to locate body to add constraint to: ${idx2}`);
            if (!ok) return false;
        }   

        let settings;
        switch (type) {
            case CONSTRAINT_TYPE_FIXED:
                settings = createFixedConstraintSettings(Jolt, cb);
                break;

            case CONSTRAINT_TYPE_POINT:
                settings = createPointConstraintSettings(Jolt, jv, cb);
                break;

            case CONSTRAINT_TYPE_DISTANCE:
                settings = createDistanceConstraintSettings(Jolt, jv, cb);
                break;

            case CONSTRAINT_TYPE_HINGE:
                settings = createHingeConstraintSettings(Jolt, jv, cb);
                break;

            case CONSTRAINT_TYPE_SLIDER:
                settings = createSliderConstraintSettings(Jolt, jv, cb);
                break;

            case CONSTRAINT_TYPE_CONE:
                settings = createConeConstraintSettings(Jolt, jv, cb);
                break;

            case CONSTRAINT_TYPE_SWING_TWIST:
                settings = createSwingTwistConstraintSettings(Jolt, jv, cb);
                break;

            case CONSTRAINT_TYPE_PULLEY:
                settings = createPulleyConstraintSettings(Jolt, jv, cb);
                break;

            case CONSTRAINT_TYPE_SIX_DOF: {
                settings = createSixDOFConstraintSettings(Jolt, jv, cb);
                break;
            }
            default:
                if ($_DEBUG) {
                    Debug.error(`Unrecognized constraint type: ${type}`);
                }
                return false;
        }
        
        settings.mSpace = space;

        if (velOverride > 0) settings.mNumVelocityStepsOverride = velOverride;
        if (posOverride > 0) settings.mNumPositionStepsOverride = posOverride;

        const constraint = settings.Create(body1, body2);

        if (!body1.constraints) {
            body1.constraints = [];
            body1.linked = new Set();
        }

        if (!body2.constraints) {
            body2.constraints = [];
            body2.linked = new Set();
        }

        body1.constraints.push(index);
        body2.constraints.push(index);

        // TODO
        // Change body linking. Current method doesn't allow 2 different joints between the same
        // two bodies.
        body1.linked.add(body2);
        body2.linked.add(body1);

        tracker.addConstraint(index, constraint, body1, body2);

        try {
            physicsSystem.AddConstraint(constraint);
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _createVehicle(type, index, cb) {

    }
}

export { ConstraintCreator };