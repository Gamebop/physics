import { Debug } from '../../debug.mjs';
import { MotionState } from '../motion-state.mjs';
import { createSpringSettings, createMotorSettings, setSixDOFAxes } from '../utils.mjs';
import {
    BFM_IGNORE_BACK_FACES, BUFFER_READ_BOOL, BUFFER_READ_FLOAT32, BUFFER_READ_INT32,
    BUFFER_READ_UINT16, BUFFER_READ_UINT32, BUFFER_READ_UINT8, CMD_CREATE_BODY,
    CMD_CREATE_CHAR, CMD_CREATE_CONSTRAINT, CMD_CREATE_GROUPS, CMD_CREATE_SHAPE,
    CMD_CREATE_SOFT_BODY, CMD_CREATE_VEHICLE, CONSTRAINT_SPACE_WORLD, CONSTRAINT_TYPE_CONE,
    CONSTRAINT_TYPE_DISTANCE, CONSTRAINT_TYPE_FIXED, CONSTRAINT_TYPE_HINGE, CONSTRAINT_TYPE_POINT,
    CONSTRAINT_TYPE_PULLEY, CONSTRAINT_TYPE_SIX_DOF, CONSTRAINT_TYPE_SLIDER,
    CONSTRAINT_TYPE_SWING_TWIST, MOTION_QUALITY_DISCRETE, MOTION_TYPE_DYNAMIC,
    MOTION_TYPE_KINEMATIC, OMP_CALCULATE_MASS_AND_INERTIA, OMP_MASS_AND_INERTIA_PROVIDED,
    SHAPE_BOX, SHAPE_CAPSULE, SHAPE_CONVEX_HULL, SHAPE_CYLINDER, SHAPE_HEIGHTFIELD, SHAPE_MESH,
    SHAPE_SPHERE, SHAPE_STATIC_COMPOUND, TRANSMISSION_AUTO, VEHICLE_CAST_TYPE_CYLINDER,
    VEHICLE_CAST_TYPE_RAY, VEHICLE_CAST_TYPE_SPHERE, VEHICLE_TYPE_MOTORCYCLE, VEHICLE_TYPE_WHEEL
} from '../../constants.mjs';

class Creator {
    static createShapeSettings(cb, meshBuffers, Jolt, jv, jq) {
        const shapeType = cb.read(BUFFER_READ_UINT8);

        // scale
        const useScale = cb.read(BUFFER_READ_BOOL);
        let sx, sy, sz;
        if (useScale) {
            sx = cb.read(BUFFER_READ_FLOAT32);
            sy = cb.read(BUFFER_READ_FLOAT32);
            sz = cb.read(BUFFER_READ_FLOAT32);

            if ($_DEBUG) {
                let ok = Debug.checkFloat(sx, `Invalid scale X: ${sx}`);
                ok = ok && Debug.checkFloat(sy, `Invalid scale Y: ${sy}`);
                ok = ok && Debug.checkFloat(sz, `Invalid scale Z: ${sz}`);
                if (!ok) {
                    return null;
                }
            }
        }

        let settings, hh, r, cr;
        switch (shapeType) {
            case SHAPE_BOX:
                jv.FromBuffer(cb, true);
                cr = cb.read(BUFFER_READ_FLOAT32);
                if ($_DEBUG) {
                    const ok = Debug.checkFloatPositive(cr, `invalid convex radius: ${cr}`);
                    if (!ok) {
                        return null;
                    }
                }
                settings = createJoltShapeSettings(shapeType, Jolt, jv, cr);
                break;

            case SHAPE_CAPSULE:
                hh = cb.read(BUFFER_READ_FLOAT32);
                r = cb.read(BUFFER_READ_FLOAT32);
                if ($_DEBUG) {
                    let ok = Debug.checkFloatPositive(hh, `invalid half height: ${hh}`);
                    ok = ok && Debug.checkFloatPositive(r, `invalid radius: ${r}`);
                    if (useScale) {
                        ok = ok && Debug.assert((sx === sy) && (sy === sz), `Capsule shape scale must be uniform: ${sx}, ${sy}, ${sz}`);
                    }
                    if (!ok) {
                        return null;
                    }
                }
                settings = createJoltShapeSettings(shapeType, Jolt, hh, r);
                break;

            case SHAPE_CYLINDER:
                hh = cb.read(BUFFER_READ_FLOAT32);
                r = cb.read(BUFFER_READ_FLOAT32);
                cr = cb.read(BUFFER_READ_FLOAT32);
                if ($_DEBUG) {
                    let ok = Debug.checkFloatPositive(hh, `invalid half height: ${hh}`);
                    ok = ok && Debug.checkFloatPositive(r, `invalid radius: ${r}`);
                    ok = ok && Debug.checkFloatPositive(cr, `invalid convex radius: ${cr}`);
                    if (useScale) {
                        ok = ok && Debug.assert(sx === sz, `Cylinder shape scale must be uniform in XZ plane: ${sx}, ${sz}`);
                    }
                    if (!ok) {
                        return null;
                    }
                }
                settings = createJoltShapeSettings(shapeType, Jolt, hh, r, cr);
                break;

            case SHAPE_SPHERE:
                r = cb.read(BUFFER_READ_FLOAT32);
                if ($_DEBUG) {
                    let ok = Debug.checkFloatPositive(r, `invalid radius: ${r}`);
                    if (useScale) {
                        ok = ok && Debug.assert((sx === sy) && (sy === sz), `Sphere shape scale must be uniform: ${sx}, ${sy}, ${sz}`);
                    }
                    if (!ok) {
                        return null;
                    }
                }
                settings = createJoltShapeSettings(shapeType, Jolt, r);
                break;

            // intentional fall-through
            case SHAPE_MESH:
            case SHAPE_CONVEX_HULL:
                settings = createMeshShapeSettings(cb, Jolt, meshBuffers, shapeType, jv);
                break;

            case SHAPE_STATIC_COMPOUND:
                settings = createStaticCompoundShapeSettings(cb, meshBuffers, Jolt, jv, jq);
                break;

            case SHAPE_HEIGHTFIELD:
                settings = createHeightFieldSettings(cb, Jolt, meshBuffers, jv);
                break;

            default:
                if ($_DEBUG) {
                    Debug.warn('Invalid shape type', shapeType);
                }
                return null;
        }

        if (!settings) {
            return null;
        }

        if (shapeType === SHAPE_STATIC_COMPOUND) {
            const compoundSettings = new Jolt.StaticCompoundShapeSettings();

            for (let i = 0, end = settings.length; i < end; i += 3) {
                const childSettings = settings[i];
                const pos = settings[i + 1];
                const rot = settings[i + 2];

                jv.Set(pos.x, pos.y, pos.z);
                jq.Set(rot.x, rot.y, rot.z, rot.w);

                compoundSettings.AddShape(jv, jq, childSettings);
            }

            settings = compoundSettings;
        }

        const isCompoundChild = cb.read(BUFFER_READ_BOOL);
        if (!isCompoundChild) {
            const density = cb.read(BUFFER_READ_FLOAT32);
            if ($_DEBUG) {
                const ok = Debug.checkFloatPositive(density, `Invalid density value: ${density}`);
                if (!ok)
                    return null;
            }
            settings.mDensity = density;

            // When creating a compound shape, we should prefer setting the position/rotation
            // directly on adding a shape - compoundSettings.AddShape(vec, quat, childSettings).
            // Using a RotatedTranslatedShape would be a waste of CPU cycles, as Jolt would
            // transform the shape twice then, even the first one is an identity transform.

            // shape offset
            if (cb.read(BUFFER_READ_BOOL)) {
                jv.FromBuffer(cb);
                jq.FromBuffer(cb);

                settings = new Jolt.RotatedTranslatedShapeSettings(jv, jq, settings);
            }

            // center of mass offset
            if (cb.read(BUFFER_READ_BOOL)) {
                jv.FromBuffer(cb);

                settings = new Jolt.OffsetCenterOfMassShapeSettings(jv, settings);
            }
        }

        if (useScale) {
            jv.Set(sx, sy, sz);
            settings = new Jolt.ScaledShapeSettings(settings, jv);
        }

        return settings;
    }

    constructor(backend) {
        this._backend = backend;

        this.createPhysicsSystem();
    }

    create(meshBuffers) {
        const cb = this._backend.inBuffer;
        const command = cb.readCommand();
        let ok = true;

        switch (command) {
            case CMD_CREATE_BODY:
                ok = this._createBody(cb, meshBuffers);
                break;

            case CMD_CREATE_SOFT_BODY:
                ok = this._createSoftBody(cb, meshBuffers);
                break;

            case CMD_CREATE_GROUPS:
                ok = this._createGroups(cb);
                break;

            case CMD_CREATE_CONSTRAINT:
                ok = this._createConstraint(cb);
                break;

            case CMD_CREATE_CHAR:
                ok = this._createCharacter(cb);
                break;

            case CMD_CREATE_SHAPE:
                ok = this._createShape(cb, meshBuffers);
                break;

            case CMD_CREATE_VEHICLE:
                ok = this._createVehicle(cb);
                break;

            default:
                if ($_DEBUG) {
                    Debug.error(`Invalid command: ${command}`);
                }
                return false;
        }

        return ok;
    }

    createPhysicsSystem() {
        const backend = this._backend;
        const config = backend.config;
        const Jolt = backend.Jolt;

        this._joltVec3 = new Jolt.Vec3();
        this._joltVec3_2 = new Jolt.Vec3();
        this._joltQuat = new Jolt.Quat();

        const bpMap = new Map();
        const pairs = config.objectLayerPairs;
        const pairsCount = pairs.length * 0.5;
        const objectFilter = new Jolt.ObjectLayerPairFilterTable(pairsCount);
        for (let i = 0; i < pairsCount * 2; i += 2) {
            objectFilter.EnableCollision(pairs[i], pairs[i + 1]);
        }

        const bpLayers = config.broadPhaseLayers;
        const bpLayerCount = bpLayers.length;
        const bpInterface = new Jolt.BroadPhaseLayerInterfaceTable(pairsCount, bpLayerCount);
        for (let i = 0; i < bpLayerCount; i++) {
            const id = bpLayers[i];
            const bpLayer = new Jolt.BroadPhaseLayer(id);
            bpMap.set(id, bpLayer);
        }

        // Map object layers to broadphase layers
        let objLayerCount = 0;
        const objLayers = config.mapObjectToBroadPhaseLayer;
        for (let i = 0; i < objLayers.length; i += 2) {
            objLayerCount++;
            bpInterface.MapObjectToBroadPhaseLayer(objLayers[i], bpMap.get(objLayers[i + 1]));
        }
        // Broadphase layers have been copied to the bpInterface, so we can destroy those
        bpMap.forEach((bpLayer) => {
            Jolt.destroy(bpLayer);
        });
        bpMap.clear();

        const settings = new Jolt.JoltSettings();
        settings.mObjectLayerPairFilter = objectFilter;
        settings.mBroadPhaseLayerInterface = bpInterface;
        settings.mObjectVsBroadPhaseLayerFilter = new Jolt.ObjectVsBroadPhaseLayerFilterTable(settings.mBroadPhaseLayerInterface,
                                                                                              bpLayerCount,
                                                                                              settings.mObjectLayerPairFilter,
                                                                                              objLayerCount);
        const joltInterface = new Jolt.JoltInterface(settings);
        Jolt.destroy(settings);

        const physicsSystem = joltInterface.GetPhysicsSystem();
        const systemSettings = physicsSystem.GetPhysicsSettings();

        systemSettings.mBaumgarte = config.baumgarte;
        systemSettings.mBodyPairCacheCosMaxDeltaRotationDiv2 = config.bodyPairCacheCosMaxDeltaRotationDiv2;
        systemSettings.mBodyPairCacheMaxDeltaPositionSq = config.bodyPairCacheMaxDeltaPositionSq;
        systemSettings.mContactNormalCosMaxDeltaRotation = config.contactNormalCosMaxDeltaRotation;
        systemSettings.mContactPointPreserveLambdaMaxDistSq = config.contactPointPreserveLambdaMaxDistSq;
        systemSettings.mDeterministicSimulation = config.deterministicSimulation;
        systemSettings.mLinearCastMaxPenetration = config.linearCastMaxPenetration;
        systemSettings.mLinearCastThreshold = config.linearCastThreshold;
        systemSettings.mManifoldToleranceSq = config.manifoldToleranceSq;
        systemSettings.mMaxInFlightBodyPairs = config.maxInFlightBodyPairs;
        systemSettings.mMaxPenetrationDistance = config.maxPenetrationDistance;
        systemSettings.mMinVelocityForRestitution = config.minVelocityForRestitution;
        systemSettings.mNumPositionSteps = config.numPositionSteps;
        systemSettings.mNumVelocitySteps = config.numVelocitySteps;
        systemSettings.mPenetrationSlop = config.penetrationSlop;
        systemSettings.mPointVelocitySleepThreshold = config.pointVelocitySleepThreshold;
        systemSettings.mSpeculativeContactDistance = config.speculativeContactDistance;
        systemSettings.mStepListenerBatchesPerJob = config.stepListenerBatchesPerJob;
        systemSettings.mStepListenersBatchSize = config.stepListenersBatchSize;
        systemSettings.mTimeBeforeSleep = config.timeBeforeSleep;

        systemSettings.mConstraintWarmStart = config.constraintWarmStart;
        systemSettings.mUseBodyPairContactCache = config.useBodyPairContactCache;
        systemSettings.mUseManifoldReduction = config.useManifoldReduction;
        systemSettings.mUseLargeIslandSplitter = config.useLargeIslandSplitter;
        systemSettings.mAllowSleeping = config.allowSleeping;
        systemSettings.mCheckActiveEdges = config.checkActiveEdges;

        physicsSystem.SetPhysicsSettings(systemSettings);

        backend.joltInterface = joltInterface;
        backend.physicsSystem = physicsSystem;

        backend.bpFilter = new Jolt.DefaultBroadPhaseLayerFilter(joltInterface.GetObjectVsBroadPhaseLayerFilter(), 1);
        backend.objFilter = new Jolt.DefaultObjectLayerFilter(joltInterface.GetObjectLayerPairFilter(), 1);
        backend.bodyFilter = new Jolt.BodyFilter();
        backend.shapeFilter = new Jolt.ShapeFilter();
        backend.bodyList = new Jolt.BodyIDVector();
    }

    destroy() {
        Jolt.destroy(this._joltVec3);
        Jolt.destroy(this._joltQuat);
    }

    // TODO
    // convert creation methods to static methods or regular funcs

    _createShape(cb, meshBuffers) {
        // shape number
        const num = cb.read(BUFFER_READ_UINT32);

        const shapeSettings = Creator.createShapeSettings(cb, meshBuffers, this._backend.Jolt, this._joltVec3, this._joltQuat);
        if (!shapeSettings)
            return false;

        const shapeResult = shapeSettings.Create();
        if ($_DEBUG && shapeResult.HasError()) {
            Debug.error(`Failed to create shape: ${shapeResult.GetError().c_str()}`);
            return false;
        }
        const shape = shapeResult.Get();
        shape.AddRef();

        this._backend.tracker.shapeMap.set(num, shape);

        return true;
    }

    _createBody(cb, meshBuffers) {
        const backend = this._backend;
        const jv = this._joltVec3;
        const jq = this._joltQuat;
        const Jolt = backend.Jolt;

        // ------------ SHAPE PROPS ----------------

        const shapeSettings = Creator.createShapeSettings(cb, meshBuffers, Jolt, jv, jq);
        if (!shapeSettings) {
            return false;
        }

        const shapeResult = shapeSettings.Create();
        if ($_DEBUG && shapeResult.HasError()) {
            Debug.error(`Failed to create shape: ${shapeResult.GetError().c_str()}`);
            return false;
        }

        const shape = shapeResult.Get();

        // ------------ BODY PROPS ----------------

        // PCID
        const index = cb.read(BUFFER_READ_UINT32);

        // position
        jv.FromBuffer(cb);

        // rotation
        jq.FromBuffer(cb);

        // motion type
        const motionType = cb.read(BUFFER_READ_UINT8);

        let jmt = Jolt.EMotionType_Static;
        if (motionType === MOTION_TYPE_DYNAMIC) jmt = Jolt.EMotionType_Dynamic;
        else if (motionType === MOTION_TYPE_KINEMATIC) jmt = Jolt.EMotionType_Kinematic;

        // use motion state
        const useMotionState = cb.read(BUFFER_READ_BOOL);

        // object layer
        const objectLayer = cb.read(BUFFER_READ_UINT32);
        const bodyCreationSettings = new Jolt.BodyCreationSettings(shape, jv, jq, jmt, objectLayer);

        bodyCreationSettings.mLinearVelocity = jv.FromBuffer(cb);
        bodyCreationSettings.mAngularVelocity = jv.FromBuffer(cb);
        bodyCreationSettings.mMaxLinearVelocity = cb.read(BUFFER_READ_FLOAT32);
        bodyCreationSettings.mMaxAngularVelocity = cb.read(BUFFER_READ_FLOAT32);
        bodyCreationSettings.mFriction = cb.read(BUFFER_READ_FLOAT32);
        bodyCreationSettings.mRestitution = cb.read(BUFFER_READ_FLOAT32);
        bodyCreationSettings.mLinearDamping = cb.read(BUFFER_READ_FLOAT32);
        bodyCreationSettings.mAngularDamping = cb.read(BUFFER_READ_FLOAT32);
        bodyCreationSettings.mGravityFactor = cb.read(BUFFER_READ_FLOAT32);
        bodyCreationSettings.mInertiaMultiplier = cb.read(BUFFER_READ_FLOAT32);
        bodyCreationSettings.mAllowedDOFs = cb.read(BUFFER_READ_UINT8);
        bodyCreationSettings.mAllowDynamicOrKinematic = cb.read(BUFFER_READ_BOOL);
        bodyCreationSettings.mIsSensor = cb.read(BUFFER_READ_BOOL);

        const motionQuality = cb.read(BUFFER_READ_UINT8);
        bodyCreationSettings.mMotionQuality = motionQuality === MOTION_QUALITY_DISCRETE ?
            Jolt.EMotionQuality_Discrete : Jolt.EMotionQuality_LinearCast;

        bodyCreationSettings.mAllowSleeping = cb.read(BUFFER_READ_BOOL);

        // collision group
        const hasCollisionGroup = cb.read(BUFFER_READ_BOOL);
        const group = hasCollisionGroup ? cb.read(BUFFER_READ_UINT32) : null;

        // collision sub group
        const hasSubGroup = cb.read(BUFFER_READ_BOOL);
        const subGroup = hasSubGroup ? cb.read(BUFFER_READ_UINT32) : null;

        if (group !== null && subGroup !== null) {
            const table = backend.groupFilterTables[group];

            if ($_DEBUG) {
                let ok = Debug.assert(!!table, `Trying to set a filter group that does not exist: ${group}`);
                ok = ok && Debug.assert((subGroup <= table?.maxIndex), `Trying to set sub group that is over the filter group table size: ${subGroup}`);
                if (!ok) {
                    return false;
                }
            }

            const mCollisionGroup = bodyCreationSettings.mCollisionGroup;
            mCollisionGroup.SetGroupFilter(table);
            mCollisionGroup.SetGroupID(group);
            mCollisionGroup.SetSubGroupID(subGroup);
        }

        // override mass properties
        const selectedMethod = cb.read(BUFFER_READ_UINT8);
        if (selectedMethod !== OMP_CALCULATE_MASS_AND_INERTIA) {
            bodyCreationSettings.mOverrideMassProperties = selectedMethod === OMP_MASS_AND_INERTIA_PROVIDED ?
                Jolt.EOverrideMassProperties_MassAndInertiaProvided :
                Jolt.EOverrideMassProperties_CalculateInertia;

            const mass = cb.read(BUFFER_READ_FLOAT32);
            if ($_DEBUG) {
                const ok = Debug.checkFloatPositive(mass, `invalid mass: ${mass}`);
                if (!ok) {
                    return false;
                }
            }
            bodyCreationSettings.mMassPropertiesOverride.mMass = mass;

            if (selectedMethod === OMP_MASS_AND_INERTIA_PROVIDED) {
                jv.FromBuffer(cb);
                jq.FromBuffer(cb);

                const m4 = Jolt.Mat44.sRotationTranslation(jq, jv);
                bodyCreationSettings.mMassPropertiesOverride.mInertia = m4;
                Jolt.destroy(m4);
            }
        }

        const bodyInterface = backend.bodyInterface;
        const body = bodyInterface.CreateBody(bodyCreationSettings);
        bodyInterface.AddBody(body.GetID(), Jolt.EActivation_Activate);

        body.autoUpdateIsometry = cb.read(BUFFER_READ_BOOL);

        if ($_DEBUG) {
            this._addDebugDraw(cb.read(BUFFER_READ_BOOL), body);
        }

        // Destroy shape settings after body is created:
        Jolt.destroy(shapeSettings);
        Jolt.destroy(bodyCreationSettings);

        if (backend.config.useMotionStates) {
            if (useMotionState && (jmt === Jolt.EMotionType_Dynamic || jmt === Jolt.EMotionType_Kinematic)) {
                body.motionState = new MotionState(body);
            }
        }

        backend.tracker.add(body, index);

        return true;
    }

    _createSoftBody(cb, meshBuffers) {
        const backend = this._backend;
        const Jolt = backend.Jolt;
        const jv = this._joltVec3;
        const jq = this._joltQuat;

        // ------------ SHAPE PROPS ----------------

        const shapeSettings = Creator.createSoftBodyShapeSettings(cb, meshBuffers, Jolt);
        if (!shapeSettings) {
            return false;
        }

        // ------------ BODY PROPS ----------------

        // PCID
        const index = cb.read(BUFFER_READ_UINT32);
        if ($_DEBUG) {
            const ok = Debug.checkUint(index, `invalid body index: ${index}`);
            if (!ok) {
                return false;
            }
        }

        // position
        jv.FromBuffer(cb);

        // rotation
        jq.FromBuffer(cb);

        // const objectLayer = backend.getBitValue(layer);
        const bodyCreationSettings = new Jolt.SoftBodyCreationSettings(shapeSettings, jv, jq);

        // collision group
        const group = cb.flag ? cb.read(BUFFER_READ_UINT32) : null;

        // collision sub group
        const subGroup = cb.flag ? cb.read(BUFFER_READ_UINT32) : null;

        bodyCreationSettings.mObjectLayer = cb.read(BUFFER_READ_UINT16);
        bodyCreationSettings.mNumIterations = cb.read(BUFFER_READ_UINT32);
        bodyCreationSettings.mLinearDamping = cb.read(BUFFER_READ_FLOAT32);
        bodyCreationSettings.mMaxLinearVelocity = cb.read(BUFFER_READ_FLOAT32);
        bodyCreationSettings.mRestitution = cb.read(BUFFER_READ_FLOAT32);
        bodyCreationSettings.mFriction = cb.read(BUFFER_READ_FLOAT32);
        bodyCreationSettings.mPressure = cb.read(BUFFER_READ_FLOAT32);
        bodyCreationSettings.mGravityFactor = cb.read(BUFFER_READ_FLOAT32);
        bodyCreationSettings.mUpdatePosition = cb.read(BUFFER_READ_BOOL);
        bodyCreationSettings.mMakeRotationIdentity = cb.read(BUFFER_READ_BOOL);
        bodyCreationSettings.mAllowSleeping = cb.read(BUFFER_READ_BOOL);

        if (group !== null && subGroup !== null) {
            const table = backend.groupFilterTables[group];

            if ($_DEBUG) {
                let ok = Debug.checkUint(group, `Invalid filter group: ${group}`);
                ok = ok && Debug.checkUint(subGroup, `Invalid filter group: ${subGroup}`);
                ok = ok && Debug.assert(!!table, `Trying to set a filter group that does not exist: ${group}`);
                ok = ok && Debug.assert((subGroup <= table?.maxIndex), `Trying to set sub group that is over the filter group table size: ${subGroup}`);
                if (!ok) {
                    return false;
                }
            }

            const mCollisionGroup = bodyCreationSettings.mCollisionGroup;
            mCollisionGroup.SetGroupFilter(table);
            mCollisionGroup.SetGroupID(group);
            mCollisionGroup.SetSubGroupID(subGroup);
        }

        const bodyInterface = backend.bodyInterface;
        const body = bodyInterface.CreateSoftBody(bodyCreationSettings);
        bodyInterface.AddBody(body.GetID(), Jolt.EActivation_Activate);

        if ($_DEBUG) {
            this._addDebugDraw(cb.read(BUFFER_READ_BOOL), body);
        }

        // Destroy shape settings after body is created:
        Jolt.destroy(bodyCreationSettings);

        backend.tracker.add(body, index);

        return true;
    }

    _createVehicle(cb) {
        const backend = this._backend;
        const Jolt = backend.Jolt;
        const tracker = backend.tracker;
        const physicsSystem = backend.physicsSystem;
        const jv = this._joltVec3;
        const index = cb.read(BUFFER_READ_UINT32);
        const type = cb.read(BUFFER_READ_UINT8);
        const isWheeled = type === VEHICLE_TYPE_WHEEL || type === VEHICLE_TYPE_MOTORCYCLE;

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

            // controller
            let controllerSettings;
            if (isWheeled) {
                controllerSettings = type === VEHICLE_TYPE_WHEEL ?
                    new Jolt.WheeledVehicleControllerSettings() :
                    new Jolt.MotorcycleControllerSettings();
            } else {
                constraintSettings = new Jolt.TrackedVehicleControllerSettings();
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

            if (!isWheeled) {
                // get tracks and map wheels
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

            const diffs = [];
            if (isWheeled) {
                // differentials
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

                if (type === VEHICLE_TYPE_MOTORCYCLE) {
                    controllerSettings.mMaxLeanAngle = cb.read(BUFFER_READ_FLOAT32);
                    controllerSettings.mLeanSpringConstant = cb.read(BUFFER_READ_FLOAT32);
                    controllerSettings.mLeanSpringDamping = cb.read(BUFFER_READ_FLOAT32);
                    controllerSettings.mLeanSpringIntegrationCoefficient = cb.read(BUFFER_READ_FLOAT32);
                    controllerSettings.mLeanSpringIntegrationCoefficientDecay = cb.read(BUFFER_READ_FLOAT32);
                    controllerSettings.mLeanSmoothingFactor = cb.read(BUFFER_READ_FLOAT32);
                }
            }

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

            // constraint
            const body = tracker.getBodyByPCID(index);
            const constraint = new Jolt.VehicleConstraint(body, constraintSettings);
            const castType = cb.read(BUFFER_READ_UINT8);
            const layer = cb.read(BUFFER_READ_UINT32);

            // For backend to write wheels isometry
            body.isVehicle = true;

            // wheels contact tester
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
            constraint.SetVehicleCollisionTester(tester);

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
                Controller = type === VEHICLE_TYPE_WHEEL ?
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

    _createGroups(cb) {
        const backend = this._backend;
        const Jolt = backend.Jolt;
        const groupsCount = cb.read(BUFFER_READ_UINT32);
        if ($_DEBUG) {
            let ok = Debug.checkUint(groupsCount, `Invalid filter groups count: ${groupsCount}`);
            ok = ok && Debug.assert(groupsCount > 0, `Invalid filter groups count: ${groupsCount}`);
            if (!ok) {
                return false;
            }
        }

        for (let i = 0; i < groupsCount; i++) {
            const subGroupsCount = cb.read(BUFFER_READ_UINT32);
            const table = new Jolt.GroupFilterTable(subGroupsCount);
            backend.groupFilterTables.push(table);

            if ($_DEBUG) {
                const ok = Debug.checkUint(subGroupsCount, `Invalid sub group count: ${subGroupsCount}`);
                if (!ok) {
                    return false;
                }
                // for verification check (only in debug build) when creating a body
                table.maxIndex = subGroupsCount - 1;
            }
        }

        return true;
    }

    _createConstraint(cb) {
        const jv = this._joltVec3;
        const backend = this._backend;
        const Jolt = backend.Jolt;
        const tracker = backend.tracker;
        const physicsSystem = backend.physicsSystem;

        const index = cb.read(BUFFER_READ_UINT32);
        const type = cb.read(BUFFER_READ_UINT8);
        const idx1 = cb.read(BUFFER_READ_UINT32);
        const idx2 = cb.read(BUFFER_READ_UINT32);
        const velOverride = cb.read(BUFFER_READ_UINT8);
        const posOverride = cb.read(BUFFER_READ_UINT8);
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

        // TODO
        // refactor to own methods

        let settings;
        switch (type) {
            case CONSTRAINT_TYPE_FIXED:
                settings = new Jolt.FixedConstraintSettings();
                if (cb.flag) settings.mAutoDetectPoint = cb.read(BUFFER_READ_BOOL);
                if (!settings.mAutoDetectPoint) {
                    if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
                    if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);
                }
                if (cb.flag) settings.mAxisX1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mAxisY1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mAxisX2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mAxisY2 = jv.FromBuffer(cb);
                break;

            case CONSTRAINT_TYPE_POINT:
                settings = new Jolt.PointConstraintSettings();
                if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);
                break;

            case CONSTRAINT_TYPE_DISTANCE:
                settings = new Jolt.DistanceConstraintSettings();
                if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mMinDistance = cb.read(BUFFER_READ_FLOAT32);
                if (cb.flag) settings.mMaxDistance = cb.read(BUFFER_READ_FLOAT32);
                if (cb.read(BUFFER_READ_BOOL)) {
                    const springSettings = createSpringSettings(cb, Jolt);
                    settings.mLimitsSpringSettings = springSettings;
                    Jolt.destroy(springSettings);
                }
                break;

            case CONSTRAINT_TYPE_HINGE:
                settings = new Jolt.HingeConstraintSettings();
                if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mHingeAxis1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mNormalAxis1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);
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
                break;

            case CONSTRAINT_TYPE_SLIDER:
                settings = new Jolt.SliderConstraintSettings();
                if (cb.flag) settings.mAutoDetectPoint = cb.read(BUFFER_READ_BOOL);
                if (!settings.mAutoDetectPoint) {
                    if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
                    if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);
                }
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
                break;

            case CONSTRAINT_TYPE_CONE:
                settings = new Jolt.ConeConstraintSettings();
                if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mTwistAxis1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mTwistAxis2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mHalfConeAngle = cb.read(BUFFER_READ_FLOAT32);
                break;

            case CONSTRAINT_TYPE_SWING_TWIST:
                settings = new Jolt.SwingTwistConstraintSettings();
                if (cb.flag) settings.mPosition1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mTwistAxis1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mPlaneAxis1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mPosition2 = jv.FromBuffer(cb);
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
                break;

            case CONSTRAINT_TYPE_PULLEY:
                settings = new Jolt.PulleyConstraintSettings();
                settings.mBodyPoint1 = jv.FromBuffer(cb);
                settings.mBodyPoint2 = jv.FromBuffer(cb);
                settings.mFixedPoint1 = jv.FromBuffer(cb);
                settings.mFixedPoint2 = jv.FromBuffer(cb);
                settings.mRatio = cb.read(BUFFER_READ_FLOAT32);
                settings.mMinLength = cb.read(BUFFER_READ_FLOAT32);
                settings.mMaxLength = cb.read(BUFFER_READ_FLOAT32);
                break;

            case CONSTRAINT_TYPE_SIX_DOF: {
                settings = new Jolt.SixDOFConstraintSettings();
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
                settings.mPosition1 = jv.FromBuffer(cb);
                settings.mAxisX1 = jv.FromBuffer(cb);
                settings.mAxisY1 = jv.FromBuffer(cb);
                settings.mPosition2 = jv.FromBuffer(cb);
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
                break;
            }
            default:
                if ($_DEBUG) {
                    Debug.error(`Unrecognized constraint type: ${type}`);
                }
                return false;
        }

        if (velOverride > 0) settings.mNumVelocityStepsOverride = velOverride;
        if (posOverride > 0) settings.mNumPositionStepsOverride = posOverride;
        settings.mSpace = space;

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

        physicsSystem.AddConstraint(constraint);

        return true;
    }

    _createCharacter(cb) {
        const backend = this._backend;
        const Jolt = backend.Jolt;
        const listener = backend.listener;
        const config = backend.config;
        const charEvents = config.charContactEventsEnabled;
        const jv = this._joltVec3;
        const jq = this._joltQuat;
        const settings = new Jolt.CharacterVirtualSettings();

        const shapeSettings = Creator.createShapeSettings(cb, null, Jolt, jv, jq);
        if (!shapeSettings) {
            return false;
        }

        const shapeResult = shapeSettings.Create();
        if ($_DEBUG && shapeResult.HasError()) {
            Debug.error(`Failed to create shape: ${shapeResult.GetError().c_str()}`);
            return false;
        }

        const shape = shapeResult.Get();

        settings.mShape = shape;

        const index = cb.read(BUFFER_READ_UINT32);
        const useMotionState = cb.read(BUFFER_READ_BOOL);

        jv.FromBuffer(cb);
        settings.mUp = jv;

        jv.FromBuffer(cb);
        const distance = cb.read(BUFFER_READ_FLOAT32);
        const plane = new Jolt.Plane(jv, distance);
        settings.mSupportingVolume = plane;
        Jolt.destroy(plane);

        settings.mMaxSlopeAngle = cb.read(BUFFER_READ_FLOAT32);
        settings.mMass = cb.read(BUFFER_READ_FLOAT32);
        settings.mMaxStrength = cb.read(BUFFER_READ_FLOAT32);

        jv.FromBuffer(cb);
        settings.mShapeOffset = jv;

        const backFaceMode = cb.read(BUFFER_READ_UINT8);
        settings.mBackFaceMode = backFaceMode === BFM_IGNORE_BACK_FACES ?
            Jolt.EBackFaceMode_IgnoreBackFaces : Jolt.EBackFaceMode_CollideWithBackFaces;

        settings.mPredictiveContactDistance = cb.read(BUFFER_READ_FLOAT32);
        settings.mMaxCollisionIterations = cb.read(BUFFER_READ_UINT32);
        settings.mMaxConstraintIterations = cb.read(BUFFER_READ_UINT32);
        settings.mMinTimeRemaining = cb.read(BUFFER_READ_FLOAT32);
        settings.mCollisionTolerance = cb.read(BUFFER_READ_FLOAT32);
        settings.mCharacterPadding = cb.read(BUFFER_READ_FLOAT32);
        settings.mMaxNumHits = cb.read(BUFFER_READ_UINT32);
        settings.mHitReductionCosMaxAngle = cb.read(BUFFER_READ_FLOAT32);
        settings.mPenetrationRecoverySpeed = cb.read(BUFFER_READ_FLOAT32);

        jv.FromBuffer(cb);
        jq.FromBuffer(cb);

        if (charEvents && !listener.charListener) {
            listener.initCharacterEvents();
        }

        const character = new Jolt.CharacterVirtual(settings, jv, jq, backend.physicsSystem);

        if ($_DEBUG) {
            this._addDebugDraw(cb.read(BUFFER_READ_BOOL), character);
        }

        if (backend.config.useMotionStates && useMotionState) {
            character.motionState = new MotionState(character);
        }

        if (charEvents) {
            character.SetListener(listener.charListener);
        }

        // for motion state
        character.isCharacter = true;

        // for shape reset
        character.originalShape = shape;

        backend.tracker.add(character, index);

        return true;
    }

    _addDebugDraw(requested, body) {
        const backend = this._backend;
        const debugBodies = backend.tracker.debug;
        const isWorker = backend.config.useWebWorker;

        if (requested && isWorker) {
            Debug.warn('Debug draw was requested, but it is not supported, when running in ' +
                       'WebWorker. Disable WebWorker (useWebWorker option) when you need to ' +
                       'debug draw.');
            debugBodies.delete(body);
        } else {
            if (requested) {
                debugBodies.add(body);
            } else {
                debugBodies.delete(body);
            }
        }
    }

    static createSoftBodyShapeSettings(cb, meshBuffers, Jolt) {
        // scale
        const useScale = cb.read(BUFFER_READ_BOOL);
        let sx = 1;
        let sy = 1;
        let sz = 1;
        if (useScale) {
            sx = cb.read(BUFFER_READ_FLOAT32);
            sy = cb.read(BUFFER_READ_FLOAT32);
            sz = cb.read(BUFFER_READ_FLOAT32);

            if ($_DEBUG) {
                let ok = Debug.checkFloat(sx, `Invalid scale X: ${sx}`);
                ok = ok && Debug.checkFloat(sy, `Invalid scale Y: ${sy}`);
                ok = ok && Debug.checkFloat(sz, `Invalid scale Z: ${sz}`);
                if (!ok) {
                    return null;
                }
            }
        }

        const {
            base, vertexCount, triCount, positions, indices
        } = Creator.readMeshBuffers(cb, meshBuffers);

        const settings = new Jolt.SoftBodySharedSettings();

        // Create vertices
        const cache = new Set();
        const jf = new Jolt.Float3();
        const v = new Jolt.SoftBodySharedSettingsVertex();
        for (let i = 0; i < vertexCount; i++) {
            const i3 = i * 3;
            const x = positions[i3];
            const y = positions[i3 + 1];
            const z = positions[i3 + 2];

            // deduplicate verts
            const str = `${x}:${y}:${z}`;
            if (!cache.has(str)) {
                cache.add(str);

                jf.x = x * sx;
                jf.y = y * sy;
                jf.z = z * sz;
                v.mPosition = jf;

                settings.mVertices.push_back(v);
            }
        }

        const width = cb.read(BUFFER_READ_UINT32);
        const length = cb.read(BUFFER_READ_UINT32);
        const compliance = cb.read(BUFFER_READ_FLOAT32);
        const fixedCount = cb.read(BUFFER_READ_UINT32);
        const rowVerts = width + 1;
        const colVerts = length + 1;

        // Create edges
        const edge = new Jolt.SoftBodySharedSettingsEdge(0, 0, compliance);
        const constraints = settings.mEdgeConstraints;
        let v0, v1;
        for (let y = 0; y < colVerts; y++) {
            for (let x = 0; x < rowVerts; x++) {
                v0 = y + x * colVerts;
                edge.set_mVertex(0, v0);

                if (y < length) {
                    edge.set_mVertex(1, v0 + 1);
                    constraints.push_back(edge);
                }
                if (x < width) {
                    edge.set_mVertex(1, v0 + colVerts);
                    constraints.push_back(edge);
                }
                if (y < length && x < width) {
                    v1 = v0 + colVerts + 1;
                    edge.set_mVertex(1, v1);
                    constraints.push_back(edge);
                    edge.set_mVertex(0, v0 + 1);
                    edge.set_mVertex(1, v1 - 1);
                    constraints.push_back(edge);
                }
            }
        }
        settings.CalculateEdgeLengths();

        // Fixed verts
        for (let i = 0; i < fixedCount; i++) {
            const fixedIndex = cb.read(BUFFER_READ_UINT32);
            settings.mVertices.at(fixedIndex).mInvMass = 0;
        }

        // Create faces
        const face = new Jolt.SoftBodySharedSettingsFace(0, 0, 0, 0);
        let i1, i2, i3;
        for (let i = 0; i < triCount; i++) {
            i1 = indices[base + i * 3];
            i2 = indices[base + i * 3 + 1];
            i3 = indices[base + i * 3 + 2];

            face.set_mVertex(0, i1);
            face.set_mVertex(1, i2);
            face.set_mVertex(2, i3);
            settings.AddFace(face);
        }

        settings.Optimize();

        Jolt.destroy(edge);
        Jolt.destroy(face);
        Jolt.destroy(jf);
        Jolt.destroy(v);

        return settings;
    }

    static readMeshBuffers(cb, meshBuffers) {
        const base = cb.read(BUFFER_READ_UINT8);
        const offset = cb.read(BUFFER_READ_UINT32);
        const stride = cb.read(BUFFER_READ_UINT8);
        const vertexCount = cb.read(BUFFER_READ_UINT32);
        const numIndices = cb.read(BUFFER_READ_UINT32);
        const idxOffset = cb.read(BUFFER_READ_UINT32);

        if ($_DEBUG) {
            let ok = Debug.checkUint(base, `Invalid buffer base to generate mesh/hull: ${base}`);
            ok = ok && Debug.checkUint(offset, `Invalid positions buffer offset to generate mesh/hull: ${offset}`);
            ok = ok && Debug.checkUint(stride, `Invalid positions buffer stride to generate mesh/hull: ${stride}`);
            ok = ok && Debug.checkUint(numIndices, `Invalid indices count to generate mesh/hull: ${numIndices}`);
            ok = ok && Debug.assert(!!meshBuffers, `No mesh buffers to generate a mesh/hull: ${meshBuffers}`);
            ok = ok && Debug.assert(meshBuffers.length > 1, `Invalid buffers to generate mesh/hull: ${meshBuffers}`);
            if (!ok) {
                return null;
            }
        }

        const posBuffer = meshBuffers.shift();
        const idxBuffer = meshBuffers.shift();

        const positions = new Float32Array(posBuffer, offset); // vertex positions
        const arrayConstructor = numIndices > 65535 ? Uint32Array : Uint16Array;
        const indices = new arrayConstructor(idxBuffer, idxOffset, numIndices);
        const triCount = Math.floor(numIndices / 3);

        return { base, stride, vertexCount, numIndices, triCount, positions, indices };
    }
}

function createJoltShapeSettings(shape, Jolt, ...attr) {
    switch (shape) {
        case SHAPE_BOX:
            return new Jolt.BoxShapeSettings(attr[0] /* half extent */, attr[1] /* convex radius */);

        case SHAPE_SPHERE:
            return new Jolt.SphereShapeSettings(attr[0] /* radius */);

        case SHAPE_CAPSULE:
            return new Jolt.CapsuleShapeSettings(attr[0] /* half height */, attr[1] /* radius */);

        case SHAPE_CYLINDER:
            return new Jolt.CylinderShapeSettings(attr[0] /* half height */, attr[1] /* radius */, attr[2] /* convex radius */);

        default:
            if ($_DEBUG) {
                Debug.warnOnce(`Unrecognized shape: ${shape}`);
            }
            return null;
    }
}

function createMeshShapeSettings(cb, Jolt, meshBuffers, shapeType, jv) {
    const count = cb.read(BUFFER_READ_UINT32);

    // TODO
    // do not use compound, merge buffers into a single one instead
    const compoundSettings = count > 1 ? new Jolt.StaticCompoundShapeSettings() : null;

    let i1, i2, i3, v1, v2, v3;
    let settings;

    for (let i = 0; i < count; i++) {
        const {
            base, stride, numIndices, triCount, positions, indices
        } = Creator.readMeshBuffers(cb, meshBuffers);

        // TODO:
        // add support for duplicate vertices test

        const p = positions;

        if (shapeType === SHAPE_CONVEX_HULL) {
            const cache = new Set();

            settings = new Jolt.ConvexHullShapeSettings();

            for (let i = 0; i < numIndices; i++) {
                const index = indices[i] * stride;
                const x = p[index];
                const y = p[index + 1];
                const z = p[index + 2];

                // deduplicate verts
                const str = `${x}:${y}:${z}`;
                if (!cache.has(str)) {
                    cache.add(str);

                    jv.Set(x, y, z);
                    settings.mPoints.push_back(jv);
                }
            }
        } else if (shapeType === SHAPE_MESH) {
            const triangles = new Jolt.TriangleList();

            triangles.resize(triCount);

            for (let i = 0; i < triCount; i++) {
                i1 = indices[base + i * 3] * stride;
                i2 = indices[base + i * 3 + 1] * stride;
                i3 = indices[base + i * 3 + 2] * stride;

                const t = triangles.at(i);

                v1 = t.get_mV(0);
                v2 = t.get_mV(1);
                v3 = t.get_mV(2);

                v1.x = p[i1]; v1.y = p[i1 + 1]; v1.z = p[i1 + 2];
                v2.x = p[i2]; v2.y = p[i2 + 1]; v2.z = p[i2 + 2];
                v3.x = p[i3]; v3.y = p[i3 + 1]; v3.z = p[i3 + 2];
            }

            settings = new Jolt.MeshShapeSettings(triangles);
        }

        if (compoundSettings) {
            compoundSettings.AddShape(Jolt.Vec3.prototype.sZero(), Jolt.Quat.prototype.sIdentity(), settings);
        }
    }

    return compoundSettings || settings;
}

function createStaticCompoundShapeSettings(cb, meshBuffers, Jolt, jv, jq) {
    const childrenCount = cb.read(BUFFER_READ_UINT32);
    const children = [];

    for (let i = 0; i < childrenCount; i++) {
        const settings = Creator.createShapeSettings(cb, meshBuffers, Jolt, jv, jq);
        if (!settings) {
            return null;
        }

        const pos = {};
        const rot = {};

        cb.readVec(pos);
        cb.readQuat(rot);

        if ($_DEBUG) {
            let ok = true;
            ok = ok && Debug.checkVec(pos, `Invalid static compound child position vector`);
            ok = ok && Debug.checkQuat(rot, `Invalid static compound child quaternion`);
            if (!ok) {
                return null;
            }
        }

        children.push(settings, pos, rot);
    }

    return children;
}

function createHeightFieldSettings(cb, Jolt, meshBuffers, jv) {
    if ($_DEBUG) {
        let ok = Debug.assert(!!meshBuffers, `Missing buffers to generate a HeightField shape: ${meshBuffers}`);
        ok = ok && Debug.assert(meshBuffers.length > 0, `Invalid buffers to generate HeightField shape: ${meshBuffers}`);
        if (!ok) {
            return null;
        }
    }

    const buffer = meshBuffers.shift();
    const samples = new Float32Array(buffer);
    const size = samples.length;

    const settings = new Jolt.HeightFieldShapeSettings();
    settings.mOffset = jv.FromBuffer(cb);
    settings.mScale = jv.FromBuffer(cb);
    settings.mSampleCount = cb.read(BUFFER_READ_UINT32);
    settings.mBlockSize = cb.read(BUFFER_READ_UINT8);
    settings.mBitsPerSample = cb.read(BUFFER_READ_UINT8);
    settings.mActiveEdgeCosThresholdAngle = cb.read(BUFFER_READ_FLOAT32);
    settings.mHeightSamples.resize(size);

    // Convert the height samples into a Float32Array
    const heightSamples = new Float32Array(Jolt.HEAPF32.buffer, Jolt.getPointer(settings.mHeightSamples.data()), size);

    for (let i = 0, end = heightSamples.length; i < end; i++) {
        const height = samples[i];
        heightSamples[i] = height >= 0 ? height : Jolt.HeightFieldShapeConstantValues.prototype.cNoCollisionValue;
    }

    return settings;
}

export { Creator };
