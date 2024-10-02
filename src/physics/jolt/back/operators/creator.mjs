import { Debug } from '../../debug.mjs';
import { MotionState } from '../motion-state.mjs';
import {
    BFM_IGNORE_BACK_FACES, BP_LAYER_MOVING, BUFFER_READ_BOOL, BUFFER_READ_FLOAT32,
    BUFFER_READ_UINT16, BUFFER_READ_UINT32, BUFFER_READ_UINT8, CMD_CREATE_BODY,
    CMD_CREATE_CHAR, CMD_CREATE_CONSTRAINT, CMD_CREATE_GROUPS, CMD_CREATE_SHAPE,
    CMD_CREATE_SOFT_BODY, CMD_CREATE_VEHICLE, MOTION_QUALITY_DISCRETE, MOTION_TYPE_DYNAMIC,
    MOTION_TYPE_KINEMATIC, OBJ_LAYER_MOVING, OMP_CALCULATE_MASS_AND_INERTIA,
    OMP_MASS_AND_INERTIA_PROVIDED, SHAPE_BOX, SHAPE_CAPSULE, SHAPE_CONVEX_HULL, SHAPE_CYLINDER,
    SHAPE_EMPTY,
    SHAPE_HEIGHTFIELD, SHAPE_MESH, SHAPE_MUTABLE_COMPOUND, SHAPE_PLANE, SHAPE_SPHERE,
    SHAPE_STATIC_COMPOUND,
    SHAPE_TAPERED_CAPSULE,
    SHAPE_TAPERED_CYLINDER
} from '../../constants.mjs';
import { ConstraintCreator } from './helpers/constraint-creator.mjs';

/**
 * @group Private
 * @private
 */
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
                let ok = Debug.checkFloat(sx);
                ok = ok && Debug.checkFloat(sy);
                ok = ok && Debug.checkFloat(sz);
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
                    const ok = Debug.checkFloatPositive(cr);
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
                    let ok = Debug.checkFloatPositive(hh);
                    ok = ok && Debug.checkFloatPositive(r);
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
                    let ok = Debug.checkFloatPositive(hh);
                    ok = ok && Debug.checkFloatPositive(r);
                    ok = ok && Debug.checkFloatPositive(cr);
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
                    let ok = Debug.checkFloatPositive(r);
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
            case SHAPE_MUTABLE_COMPOUND:
                settings = createCompoundShapeSettings(cb, meshBuffers, Jolt, jv, jq);
                break;

            case SHAPE_HEIGHTFIELD:
                settings = createHeightFieldSettings(cb, Jolt, meshBuffers, jv);
                break;

            case SHAPE_PLANE:
                settings = createPlaneSettings(cb, Jolt, jv);
                break;

            case SHAPE_EMPTY:
                settings = new Jolt.EmptyShapeSettings();
                break;

            case SHAPE_TAPERED_CAPSULE:
                settings = createTaperedCapsuleSettings(cb, Jolt);
                break;

            case SHAPE_TAPERED_CYLINDER:
                settings = createTaperedCylinderSettings(cb, Jolt);
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

        const isStaticCompound = shapeType === SHAPE_STATIC_COMPOUND;
        const isMutableCompound = shapeType === SHAPE_MUTABLE_COMPOUND;
        if (isStaticCompound || isMutableCompound) {
            const compoundSettings = isStaticCompound ?
                new Jolt.StaticCompoundShapeSettings() : new Jolt.MutableCompoundShapeSettings();

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
                const ok = Debug.checkFloatPositive(density);
                if (!ok) {
                    return null;
                }
            }

            // not all shapes have density, e.g. a plane
            if (settings.mDensity != null) {
                settings.mDensity = density;
            }

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

    _joltVec3 = null;

    _backend = null;

    constructor(backend) {
        this._backend = backend;

        this.createPhysicsSystem();

        this._constraintCreator = new ConstraintCreator(this);
    }

    get backend() {
        return this._backend;
    }

    get jv() {
        return this._joltVec3;
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
                ok = this._constraintCreator.create(cb);
                break;

            case CMD_CREATE_CHAR:
                ok = this._createCharacter(cb, meshBuffers);
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
        this._joltQuat = new Jolt.Quat();

        const settings = new Jolt.JoltSettings();
        const bitFiltering = config.bitFiltering;

        if (bitFiltering) {
            const count = bitFiltering.length;
            const bpInterface = new Jolt.BroadPhaseLayerInterfaceMask(count * 0.5);

            for (let i = 0; i < count; i += 2) {
                bpInterface.ConfigureLayer(new Jolt.BroadPhaseLayer(i * 0.5), bitFiltering[i], bitFiltering[i + 1]);
            }

            settings.mObjectLayerPairFilter = new Jolt.ObjectLayerPairFilterMask();
            settings.mBroadPhaseLayerInterface = bpInterface;
            settings.mObjectVsBroadPhaseLayerFilter = new Jolt.ObjectVsBroadPhaseLayerFilterMask(bpInterface);
        } else {
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

            settings.mObjectLayerPairFilter = objectFilter;
            settings.mBroadPhaseLayerInterface = bpInterface;
            settings.mObjectVsBroadPhaseLayerFilter = new Jolt.ObjectVsBroadPhaseLayerFilterTable(
                settings.mBroadPhaseLayerInterface, bpLayerCount, settings.mObjectLayerPairFilter,
                objLayerCount);
        }

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
        if (this._joltVec3) {
            Jolt.destroy(this._joltVec3);
        }
        if (this._joltQuat) {
            Jolt.destroy(this._joltQuat);
        }
    }

    // TODO
    // convert creation methods to static methods or regular funcs

    _createShape(cb, meshBuffers) {
        // shape number
        const num = cb.read(BUFFER_READ_UINT32);

        const shapeSettings = Creator.createShapeSettings(cb, meshBuffers, this._backend.Jolt, this._joltVec3, this._joltQuat);
        if (!shapeSettings) {
            return false;
        }

        const shapeResult = shapeSettings.Create();
        if ($_DEBUG && shapeResult.HasError()) {
            Debug.error(`Failed to create shape: ${shapeResult.GetError().c_str()}`);
            return false;
        }
        const shape = shapeResult.Get();
        shape.AddRef();

        // mark it for release, e.g. when removing a child from compound shape
        shape.needsRelease = true;

        this._backend.tracker.shapeMap.set(num, shape);

        return true;
    }

    _createBody(cb, meshBuffers) {
        const backend = this._backend;
        const jv = this._joltVec3;
        const jq = this._joltQuat;
        const Jolt = backend.Jolt;
        const config = backend.config;

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

        // bit filtering
        const group = cb.read(BUFFER_READ_UINT32);
        const mask = cb.read(BUFFER_READ_UINT32);

        // object layer
        let objectLayer = cb.read(BUFFER_READ_UINT32);
        if (!!config.bitFiltering) {
            objectLayer = Jolt.ObjectLayerPairFilterMask.prototype.sGetObjectLayer(group, mask);
        }

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
        const colGroup = hasCollisionGroup ? cb.read(BUFFER_READ_UINT32) : null;

        // collision sub group
        const hasSubGroup = cb.read(BUFFER_READ_BOOL);
        const subGroup = hasSubGroup ? cb.read(BUFFER_READ_UINT32) : null;

        if (!config.bitFiltering && colGroup !== null && subGroup !== null) {
            const table = backend.groupFilterTables[colGroup];

            if ($_DEBUG) {
                let ok = Debug.assert(!!table,
                    `Trying to set a filter group that does not exist: ${colGroup}`);
                ok = ok && Debug.assert((subGroup <= table?.maxIndex),
                    `Trying to set sub group that is over the filter group table size: ${subGroup}`);
                if (!ok) {
                    return false;
                }
            }

            const mCollisionGroup = bodyCreationSettings.mCollisionGroup;
            mCollisionGroup.SetGroupFilter(table);
            mCollisionGroup.SetGroupID(colGroup);
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
                const ok = Debug.checkFloatPositive(mass);
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
            body.debugDrawDepth = cb.read(BUFFER_READ_BOOL);
            body.debugDraw = cb.read(BUFFER_READ_BOOL) && !config.useWebWorker;
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
            const ok = Debug.checkUint(index);
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
                let ok = Debug.checkUint(group);
                ok = ok && Debug.checkUint(subGroup);
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
            body.debugDrawDepth = cb.read(BUFFER_READ_BOOL);
            body.debugDraw = cb.read(BUFFER_READ_BOOL) && !backend.config.useWebWorker;
        }

        // Destroy shape settings after body is created:
        Jolt.destroy(bodyCreationSettings);

        backend.tracker.add(body, index);

        return true;
    }

    _createGroups(cb) {
        const backend = this._backend;
        const Jolt = backend.Jolt;
        const groupsCount = cb.read(BUFFER_READ_UINT32);
        if ($_DEBUG) {
            let ok = Debug.checkUint(groupsCount);
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
                const ok = Debug.checkUint(subGroupsCount);
                if (!ok) {
                    return false;
                }
                // for verification check (only in debug build) when creating a body
                table.maxIndex = subGroupsCount - 1;
            }
        }

        return true;
    }

    _createCharacter(cb, meshBuffers) {
        const backend = this._backend;
        const Jolt = backend.Jolt;
        const listener = backend.listener;
        const config = backend.config;
        const joltInterface = backend.joltInterface;
        const charEvents = config.charContactEventsEnabled;
        const jv = this._joltVec3;
        const jq = this._joltQuat;
        const settings = new Jolt.CharacterVirtualSettings();

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
        const updateSettings = new Jolt.ExtendedUpdateSettings();

        updateSettings.mStickToFloorStepDown.FromBuffer(cb);
        updateSettings.mWalkStairsStepUp.FromBuffer(cb);
        updateSettings.mWalkStairsMinStepForward = cb.read(BUFFER_READ_FLOAT32);
        updateSettings.mWalkStairsStepForwardTest = cb.read(BUFFER_READ_FLOAT32);
        updateSettings.mWalkStairsCosAngleForwardContact = cb.read(BUFFER_READ_FLOAT32);
        updateSettings.mWalkStairsStepDownExtra.FromBuffer(cb);

        const bpLayer = cb.read(BUFFER_READ_UINT16);
        const objLayer = cb.read(BUFFER_READ_UINT16);

        const group = cb.read(BUFFER_READ_UINT32);
        const mask = cb.read(BUFFER_READ_UINT32);

        character.bpFilter = bpLayer !== BP_LAYER_MOVING ? new Jolt.DefaultBroadPhaseLayerFilter(
            joltInterface.GetObjectVsBroadPhaseLayerFilter(), bpLayer) : null;

        const bitFiltering = config.bitFiltering;
        if (!!bitFiltering) {
            const objectVsBroadPhaseLayerFilter = joltInterface.GetObjectVsBroadPhaseLayerFilter();
            const objectLayerPairFilter = joltInterface.GetObjectLayerPairFilter();
            const objectLayer = backend.Jolt.ObjectLayerPairFilterMask.prototype.sGetObjectLayer(group, mask);

            character.bpFilter = new Jolt.DefaultBroadPhaseLayerFilter(objectVsBroadPhaseLayerFilter, objectLayer);
            character.objFilter = new Jolt.DefaultObjectLayerFilter(objectLayerPairFilter, objectLayer);
        } else {
            character.objFilter = objLayer !== OBJ_LAYER_MOVING ? new Jolt.DefaultObjectLayerFilter(
                joltInterface.GetObjectLayerPairFilter(), objLayer) : null;
        }

        character.updateSettings = updateSettings;

        if ($_DEBUG) {
            character.debugDrawDepth = cb.read(BUFFER_READ_BOOL);
            character.debugDraw = cb.read(BUFFER_READ_BOOL) && !config.useWebWorker;
        }

        if (config.useMotionStates && useMotionState) {
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
                let ok = Debug.checkFloat(sx);
                ok = ok && Debug.checkFloat(sy);
                ok = ok && Debug.checkFloat(sz);
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
            let ok = Debug.checkUint(base);
            ok = ok && Debug.checkUint(offset);
            ok = ok && Debug.checkUint(stride);
            ok = ok && Debug.checkUint(numIndices);
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
    const {
        base, stride, numIndices, triCount, positions, indices
    } = Creator.readMeshBuffers(cb, meshBuffers);

    // TODO:
    // add support for duplicate vertices test

    const p = positions;
    let i1, i2, i3, v1, v2, v3;
    let settings;

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

    return settings;
}

function createCompoundShapeSettings(cb, meshBuffers, Jolt, jv, jq) {
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
            ok = ok && Debug.checkVec(pos);
            ok = ok && Debug.checkQuat(rot);
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

function createPlaneSettings(cb, Jolt, jv) {
    jv.FromBuffer(cb);

    const plane = new Jolt.Plane(jv /* normal */, cb.read(BUFFER_READ_FLOAT32) /* constant */);
    const settings = new Jolt.PlaneShapeSettings(plane, new Jolt.PhysicsMaterial(),
        cb.read(BUFFER_READ_FLOAT32) /* half extent */);

    return settings;
}

function createTaperedCapsuleSettings(cb, Jolt) {
    return new Jolt.TaperedCapsuleShapeSettings(cb.read(BUFFER_READ_FLOAT32) /* half height */,
        cb.read(BUFFER_READ_FLOAT32) /* top radius */,
        cb.read(BUFFER_READ_FLOAT32) /* bottom radius */);
}

function createTaperedCylinderSettings(cb, Jolt) {
    return new Jolt.TaperedCylinderShapeSettings(cb.read(BUFFER_READ_FLOAT32) /* half height */,
        cb.read(BUFFER_READ_FLOAT32) /* top radius */,
        cb.read(BUFFER_READ_FLOAT32) /* bottom radius */,
        cb.read(BUFFER_READ_FLOAT32) /* convex radius */);
}

export { Creator };
