import { Debug } from '../../../debug.mjs';
import {
    BUFFER_READ_BOOL, BUFFER_READ_FLOAT32, BUFFER_READ_INT32, BUFFER_READ_UINT16,
    BUFFER_READ_UINT32, BUFFER_READ_UINT8, CONSTRAINT_SPACE_WORLD, CONSTRAINT_TYPE_CONE,
    CONSTRAINT_TYPE_DISTANCE, CONSTRAINT_TYPE_FIXED, CONSTRAINT_TYPE_HINGE, CONSTRAINT_TYPE_POINT,
    CONSTRAINT_TYPE_PULLEY, CONSTRAINT_TYPE_SIX_DOF, CONSTRAINT_TYPE_SLIDER,
    CONSTRAINT_TYPE_SWING_TWIST, CONSTRAINT_TYPE_VEHICLE_MOTO, CONSTRAINT_TYPE_VEHICLE_TRACK,
    CONSTRAINT_TYPE_VEHICLE_WHEEL, TRANSMISSION_AUTO, VEHICLE_CAST_TYPE_CYLINDER,
    VEHICLE_CAST_TYPE_RAY, VEHICLE_CAST_TYPE_SPHERE
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

        const velOverride = cb.read(BUFFER_READ_UINT16);
        const posOverride = cb.read(BUFFER_READ_UINT16);
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
        const creator = this._creator;
        const backend = creator.backend;
        const Jolt = backend.Jolt;
        const tracker = backend.tracker;
        const physicsSystem = backend.physicsSystem;
        const jv = creator.jv;
        const isWheeled = type === CONSTRAINT_TYPE_VEHICLE_WHEEL ||
                          type === CONSTRAINT_TYPE_VEHICLE_MOTO;

        try {
            const destroySettings = (list) => {
                for (let i = 0; i < list.length; i++) {
                    Jolt.destroy(list[i]);
                }
            };

            const updateCurve = (curve) => {
                curve.Clear();
                const count = cb.read(BUFFER_READ_UINT32);
                for (let i = 0; i < count; i++) {
                    const key = cb.read(BUFFER_READ_FLOAT32);
                    const val = cb.read(BUFFER_READ_FLOAT32);
                    curve.AddPoint(key, val);
                }
            };

            const updateGears = (gears) => {
                const count = cb.read(BUFFER_READ_UINT32);
                gears.clear();
                for (let i = 0; i < count; i++) {
                    gears.push_back(cb.read(BUFFER_READ_FLOAT32));
                }
            };

            const updateWheel = (wheel) => {
                wheel.mPosition = jv.FromBuffer(cb);
                wheel.mSuspensionForcePoint = jv.FromBuffer(cb);
                wheel.mSuspensionDirection = jv.FromBuffer(cb);
                wheel.mSteeringAxis = jv.FromBuffer(cb);
                wheel.mWheelUp = jv.FromBuffer(cb);
                wheel.mWheelForward = jv.FromBuffer(cb);
                wheel.mSuspensionMinLength = cb.read(BUFFER_READ_FLOAT32);
                wheel.mSuspensionMaxLength = cb.read(BUFFER_READ_FLOAT32);
                wheel.mSuspensionPreloadLength = cb.read(BUFFER_READ_FLOAT32);
                wheel.mRadius = cb.read(BUFFER_READ_FLOAT32);
                wheel.mWidth = cb.read(BUFFER_READ_FLOAT32);
                wheel.mEnableSuspensionForcePoint = cb.read(BUFFER_READ_BOOL);

                const spring = wheel.mSuspensionSpring;
                spring.mMode = cb.read(BUFFER_READ_UINT8);
                spring.mFrequency = cb.read(BUFFER_READ_FLOAT32);
                spring.mStiffness = cb.read(BUFFER_READ_FLOAT32);
                spring.mDamping = cb.read(BUFFER_READ_FLOAT32);

                // longitudinal friction
                if (cb.read(BUFFER_READ_BOOL)) {
                    updateCurve(wheel.mLongitudinalFriction);
                }

                // lateral friction
                if (cb.read(BUFFER_READ_BOOL)) {
                    updateCurve(wheel.mLateralFriction);
                }

                if (isWheeled) {
                    wheel.mInertia = cb.read(BUFFER_READ_FLOAT32);
                    wheel.mAngularDamping = cb.read(BUFFER_READ_FLOAT32);
                    wheel.mMaxSteerAngle = cb.read(BUFFER_READ_FLOAT32);
                    wheel.mMaxBrakeTorque = cb.read(BUFFER_READ_FLOAT32);
                    wheel.mMaxHandBrakeTorque = cb.read(BUFFER_READ_FLOAT32);
                }
            };

            // general
            let constraintSettings = new Jolt.VehicleConstraintSettings();
            constraintSettings.mNumVelocityStepsOverride = cb.read(BUFFER_READ_UINT16);
            constraintSettings.mNumPositionStepsOverride = cb.read(BUFFER_READ_UINT16);
            constraintSettings.mUp = jv.FromBuffer(cb);
            constraintSettings.mForward = jv.FromBuffer(cb);
            constraintSettings.mMaxPitchRollAngle = cb.read(BUFFER_READ_FLOAT32);

            const bodyIndex = cb.read(BUFFER_READ_INT32);

            // controller
            let controllerSettings;
            if (isWheeled) {
                controllerSettings = type === CONSTRAINT_TYPE_VEHICLE_WHEEL ?
                    new Jolt.WheeledVehicleControllerSettings() :
                    new Jolt.MotorcycleControllerSettings();
            } else {
                controllerSettings = new Jolt.TrackedVehicleControllerSettings();
            }

            // engine
            const engine = controllerSettings.mEngine;
            engine.mMaxTorque = cb.read(BUFFER_READ_FLOAT32);
            engine.mMinRPM = cb.read(BUFFER_READ_FLOAT32);
            engine.mMaxRPM = cb.read(BUFFER_READ_FLOAT32);
            engine.mInertia = cb.read(BUFFER_READ_FLOAT32);
            engine.mAngularDamping = cb.read(BUFFER_READ_FLOAT32);

            if (cb.read(BUFFER_READ_BOOL)) {
                updateCurve(engine.mNormalizedTorque);
            }

            // transmission
            const transmission = controllerSettings.mTransmission;
            const mode = cb.read(BUFFER_READ_UINT8);

            transmission.mMode = mode === TRANSMISSION_AUTO ?
                Jolt.ETransmissionMode_Auto : Jolt.ETransmissionMode_Manual;

            transmission.mSwitchTime = cb.read(BUFFER_READ_FLOAT32);
            transmission.mClutchReleaseTime = cb.read(BUFFER_READ_FLOAT32);
            transmission.mSwitchLatency = cb.read(BUFFER_READ_FLOAT32);
            transmission.mShiftUpRPM = cb.read(BUFFER_READ_FLOAT32);
            transmission.mShiftDownRPM = cb.read(BUFFER_READ_FLOAT32);
            transmission.mClutchStrength = cb.read(BUFFER_READ_FLOAT32);

            updateGears(transmission.mGearRatios);
            updateGears(transmission.mReverseGearRatios);

            // anti roll bars
            const barsCount = cb.read(BUFFER_READ_UINT32);
            const mAntiRollBars = constraintSettings.mAntiRollBars;
            const bars = [];
            for (let i = 0; i < barsCount; i++) {
                const bar = new Jolt.VehicleAntiRollBar();

                bar.mLeftWheel = cb.read(BUFFER_READ_UINT32);
                bar.mRightWheel = cb.read(BUFFER_READ_UINT32);
                bar.mStiffness = cb.read(BUFFER_READ_FLOAT32);

                bars.push(bar);
                mAntiRollBars.push_back(bar);
            }

            constraintSettings.mController = controllerSettings;

            // wheels contact tester
            const castType = cb.read(BUFFER_READ_UINT8);
            const layer = cb.read(BUFFER_READ_UINT32);
            let tester;
            switch (castType) {
                case VEHICLE_CAST_TYPE_RAY: {
                    jv.FromBuffer(cb);
                    const maxAngle = cb.read(BUFFER_READ_FLOAT32);
                    tester = new Jolt.VehicleCollisionTesterRay(layer, jv, maxAngle);
                    break;
                }
                case VEHICLE_CAST_TYPE_SPHERE: {
                    jv.FromBuffer(cb);
                    const maxAngle = cb.read(BUFFER_READ_FLOAT32);
                    const radius = cb.read(BUFFER_READ_FLOAT32);
                    tester = new Jolt.VehicleCollisionTesterCastSphere(layer, radius, jv, maxAngle);
                    break;
                }
                case VEHICLE_CAST_TYPE_CYLINDER: {
                    const fraction = cb.read(BUFFER_READ_FLOAT32);
                    tester = new Jolt.VehicleCollisionTesterCastCylinder(layer, fraction);
                    break;
                }
                default:
                    if ($_DEBUG) {
                        Debug.error(`Unrecognized cast type: ${castType}`);
                    }
                    return false;
            }

            // wheels
            const wheelsCount = cb.read(BUFFER_READ_UINT32);
            const mWheels = constraintSettings.mWheels;
            const Wheel = isWheeled ? Jolt.WheelSettingsWV : Jolt.WheelSettingsTV;
            mWheels.clear();
            for (let i = 0; i < wheelsCount; i++) {
                const wheel = new Wheel();
                updateWheel(wheel);
                mWheels.push_back(wheel);
            }

            // get tracks and map wheels
            if (!isWheeled) {
                const tracksCount = cb.read(BUFFER_READ_UINT32);
                for (let t = 0; t < tracksCount; t++) {
                    const track = controllerSettings.get_mTracks(t);
                    const twc = cb.read(BUFFER_READ_UINT32); // track wheels count

                    // Make the last wheel in the track to be a driven wheel (connected to engine)
                    track.mDrivenWheel = twc - 1;

                    for (let i = 0; i < twc; i++) {
                        track.mWheels.push_back(cb.read(BUFFER_READ_UINT32));
                    }
                }
            }

            // differentials
            const diffs = [];
            if (isWheeled) {
                const count = cb.read(BUFFER_READ_UINT32);
                if (count > 0) {
                    const differentials = controllerSettings.mDifferentials;

                    for (let i = 0; i < count; i++) {
                        const settings = new Jolt.VehicleDifferentialSettings();

                        settings.mLeftWheel = cb.read(BUFFER_READ_INT32);
                        settings.mRightWheel = cb.read(BUFFER_READ_INT32);
                        settings.mDifferentialRatio = cb.read(BUFFER_READ_FLOAT32);
                        settings.mLeftRightSplit = cb.read(BUFFER_READ_FLOAT32);
                        settings.mLimitedSlipRatio = cb.read(BUFFER_READ_FLOAT32);
                        settings.mEngineTorqueRatio = cb.read(BUFFER_READ_FLOAT32);

                        diffs.push(settings);
                        differentials.push_back(settings);
                    }
                }

                controllerSettings.mDifferentialLimitedSlipRatio = cb.read(BUFFER_READ_FLOAT32);

                if (type === CONSTRAINT_TYPE_VEHICLE_MOTO) {
                    controllerSettings.mMaxLeanAngle = cb.read(BUFFER_READ_FLOAT32);
                    controllerSettings.mLeanSpringConstant = cb.read(BUFFER_READ_FLOAT32);
                    controllerSettings.mLeanSpringDamping = cb.read(BUFFER_READ_FLOAT32);
                    controllerSettings.mLeanSpringIntegrationCoefficient = cb.read(BUFFER_READ_FLOAT32);
                    controllerSettings.mLeanSpringIntegrationCoefficientDecay = cb.read(BUFFER_READ_FLOAT32);
                    controllerSettings.mLeanSmoothingFactor = cb.read(BUFFER_READ_FLOAT32);
                }
            }

            // constraint
            const body = tracker.getBodyByPCID(bodyIndex);
            const constraint = new Jolt.VehicleConstraint(body, constraintSettings);

            // For backend to write wheels isometry
            body.isVehicle = true;
            body.vehicleConstraintIndex = index;

            constraint.SetVehicleCollisionTester(tester);
            constraint.isWheeled = isWheeled;

            // events
            if (backend.config.vehicleContactEventsEnabled) {
                backend.listener.initVehicleEvents(constraint);
            }

            physicsSystem.AddConstraint(constraint);

            const listener = new Jolt.VehicleConstraintStepListener(constraint);
            physicsSystem.AddStepListener(listener);

            // add references for Cleaner operator
            body.constraints = [index];
            constraint.listener = listener;

            let Controller;
            if (isWheeled) {
                Controller = type === CONSTRAINT_TYPE_VEHICLE_WHEEL ?
                    Jolt.WheeledVehicleController : Jolt.MotorcycleController;
            } else {
                Controller = Jolt.TrackedVehicleController;
            }
            constraint.controller = Jolt.castObject(constraint.GetController(), Controller);
            constraint.wheelsCount = wheelsCount;

            tracker.addConstraint(index, constraint, body);

            destroySettings(diffs);
            destroySettings(bars);

        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }
}

export { ConstraintCreator };