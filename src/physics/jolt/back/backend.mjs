import { Debug } from '../debug.mjs';
import { extendJoltMath } from '../math.mjs';
import { CommandsBuffer } from './commands-buffer.mjs';
import { Cleaner } from './operators/cleaner.mjs';
import { Creator } from './operators/creator.mjs';
import { Drawer } from './operators/drawer.mjs';
import { Listener } from './operators/listener.mjs';
import { Modifier } from './operators/modifier.mjs';
import { Querier } from './operators/querier.mjs';
import { Tracker } from './operators/tracker.mjs';
import {
    BP_LAYER_MOVING, BP_LAYER_NON_MOVING, BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32,
    BUFFER_WRITE_JOLTVEC32, BUFFER_WRITE_UINT32, BUFFER_WRITE_UINT8, BUFFER_WRITE_VEC32,
    CMD_REPORT_TRANSFORMS, COMPONENT_SYSTEM_BODY, COMPONENT_SYSTEM_CHAR,
    COMPONENT_SYSTEM_SOFT_BODY, GROUND_STATE_IN_AIR, GROUND_STATE_NOT_SUPPORTED,
    GROUND_STATE_ON_GROUND, GROUND_STATE_ON_STEEP_GROUND, ISOMETRY_DEFAULT, ISOMETRY_FRONT_TO_BACK,
    ISOMETRY_NONE, OBJ_LAYER_MOVING, OBJ_LAYER_NON_MOVING, OPERATOR_CLEANER,
    OPERATOR_CREATOR, OPERATOR_MODIFIER, OPERATOR_QUERIER
} from '../constants.mjs';

/**
 * Jolt Backend.
 *
 * @group Managers
 * @category Jolt
 */
class JoltBackend {
    constructor(messenger, data) {
        const config = {
            // Physics Settings
            // https://jrouwe.github.io/JoltPhysics/struct_physics_settings.html
            baumgarte: 0.2,
            maxSkippedSteps: 2,
            bodyPairCacheCosMaxDeltaRotationDiv2: 0.9998476951563912,
            bodyPairCacheMaxDeltaPositionSq: Math.sqrt(0.001),
            contactNormalCosMaxDeltaRotation: 0.9961946980917455,
            contactPointPreserveLambdaMaxDistSq: Math.sqrt(0.01),
            deterministicSimulation: true,
            linearCastMaxPenetration: 0.25,
            linearCastThreshold: 0.75,
            manifoldToleranceSq: 1.0e-6,
            maxInFlightBodyPairs: 16384,
            maxPenetrationDistance: 0.2,
            minVelocityForRestitution: 1,
            numPositionSteps: 2,
            numVelocitySteps: 10,
            penetrationSlop: 0.02,
            pointVelocitySleepThreshold: 0.03,
            speculativeContactDistance: 0.02,
            stepListenerBatchesPerJob: 1,
            stepListenersBatchSize: 8,
            timeBeforeSleep: 0.5,
            // for debugging
            constraintWarmStart: true,
            useBodyPairContactCache: true,
            useManifoldReduction: true,
            useLargeIslandSplitter: true,
            allowSleeping: true,
            checkActiveEdges: true,
            // contact events
            charContactEventsEnabled: true,
            vehicleContactEventsEnabled: false,
            contactAddedEventsEnabled: true,
            contactPersistedEventsEnabled: false,
            contactRemovedEventsEnabled: true,
            contactPoints: true,
            contactPointsAveraged: true,
            bitFiltering: null,
            broadPhaseLayers: [BP_LAYER_NON_MOVING, BP_LAYER_MOVING],
            // object layer vs object layer
            objectLayerPairs: [
                OBJ_LAYER_NON_MOVING, OBJ_LAYER_MOVING,
                OBJ_LAYER_MOVING, OBJ_LAYER_MOVING
            ],
            // object layer to broadphase layer map
            mapObjectToBroadPhaseLayer: [
                0, BP_LAYER_NON_MOVING,
                1, BP_LAYER_MOVING
            ],
            ...data.config
        };

        config.contactEventsEnabled = config.contactAddedEventsEnabled ||
            config.contactPersistedEventsEnabled || config.contactRemovedEventsEnabled;

        this._config = config;
        this._dispatcher = messenger;
        this._time = 0;
        this._filterLayers = new Map();

        // Jolt data
        this.Jolt = null;
        this._joltInterface = null;
        this._physicsSystem = null;
        this._bodyInterface = null;
        this._bpFilter = null;
        this._objFilter = null;
        this._bodyFilter = null;
        this._shapeFilter = null;
        this._bodyList = null;
        this._idleCallback = null;
        this._groupFilterTables = [];

        this._lastStamp = 0;

        if (data.glueUrl && data.wasmUrl) {
            const loadJolt = async () => {
                const module = await import(data.glueUrl);
                module.default({
                    locateFile: () => {
                        return data.wasmUrl;
                    }
                }).then((Jolt) => {
                    this.Jolt = Jolt;
                    this.onLibLoad(Jolt, config);
                });
            };
            loadJolt();
        }
    }

    set joltInterface(joltInterface) {
        this._joltInterface = joltInterface;
    }

    get joltInterface() {
        return this._joltInterface;
    }

    set physicsSystem(system) {
        this._physicsSystem = system;
        this._bodyInterface = system.GetBodyInterface();
    }

    get physicsSystem() {
        return this._physicsSystem;
    }

    get groupFilterTables() {
        return this._groupFilterTables;
    }

    get bodyInterface() {
        return this._bodyInterface;
    }

    get inBuffer() {
        return this._inBuffer;
    }

    get outBuffer() {
        return this._outBuffer;
    }

    get config() {
        return this._config;
    }

    get tracker() {
        return this._tracker;
    }

    get creator() {
        return this._creator;
    }

    get listener() {
        return this._listener;
    }

    get querier() {
        return this._querier;
    }

    get cleaner() {
        return this._cleaner;
    }

    set bpFilter(filter) {
        this._bpFilter = filter;
    }

    get bpFilter() {
        return this._bpFilter;
    }

    set objFilter(filter) {
        this._objFilter = filter;
    }

    get objFilter() {
        return this._objFilter;
    }

    set bodyFilter(filter) {
        this._bodyFilter = filter;
    }

    get bodyFilter() {
        return this._bodyFilter;
    }

    set shapeFilter(filter) {
        this._shapeFilter = filter;
    }

    get shapeFilter() {
        return this._shapeFilter;
    }

    set bodyList(list) {
        this._bodyList = list;
    }

    get bodyList() {
        return this._bodyList;
    }

    set idleCallback(func) {
        this._idleCallback = func;
    }

    get idleCallback() {
        return this.idleCallback;
    }

    get immediateBuffer() {
        return this._immediateBuffer;
    }

    onLibLoad(Jolt, config) {
        // Util
        extendJoltMath(Jolt);

        // Physics operators
        this._tracker = new Tracker(Jolt, this);
        this._creator = new Creator(this);
        this._modifier = new Modifier(this);
        this._cleaner = new Cleaner(this);
        this._querier = new Querier(this);
        this._listener = new Listener(this);
        this._stepTime = 0;
        this._steps = 0;
        this._inBuffer = null;
        this._fatalError = false;
        this._outBuffer = new CommandsBuffer({ ...config, commandsBufferSize: 2000 });
        this._immediateBuffer = config.useWebWorker ? null : new CommandsBuffer({
            useSharedArrayBuffer: false,
            commandsBufferSize: 1000,
            allowCommandsBufferResize: true
        });

        if (config.contactEventsEnabled) {
            this._listener.initEvents(config);
        }

        if ($_DEBUG) {
            this._drawer = new Drawer(Jolt);
            this._perfIndex = null;
        }

        const msg = Object.create(null);
        msg.buffer = null;
        msg.inBuffer = null;
        msg.origin = 'physics-worker';
        this._responseMessage = msg;

        this._dispatcher.respond({
            origin: 'physics-worker',
            initDone: true
        }, null);

        if ($_DEBUG) {
            console.log('Jolt Physics:', $_JOLT_VERSION);
        }
    }

    immediateExecution(cb) {
        // Reset outbound buffer, so we can start writing results into it.
        const outBuffer = this._immediateBuffer;
        outBuffer.init();
        outBuffer.reset();

        return this._immediateCommand(cb);
    }

    immediateResponse() {
        return this._dispatcher.immediateResponse(this._immediateBuffer, null);
    }

    step(data, isManualStep) {
        if (this._fatalError) return;

        const { buffer, meshBuffers } = data;
        const { fixedStep, maxSkippedSteps } = this._config;
        const now = performance.now();
        const outBuffer = this._outBuffer;

        let dt = data.dt;
        let time = this._time;
        let inBuffer = this._inBuffer;

        if ($_DEBUG) {
            this._stepTime = now;
            this._perfIndex = data.perfIndex;
        }

        if (this._lastStamp !== 0) {
            dt = (now - this._lastStamp) * 0.001;
        }

        let stepsCount = 0;
        if (!isManualStep) {
            time += dt;
            while (time >= fixedStep) {
                stepsCount++;
                time -= fixedStep;
            }
            this._time = time;
        } else {
            stepsCount = 1;
        }

        if (stepsCount > maxSkippedSteps) {
            stepsCount = maxSkippedSteps;
        }

        if (data.inBuffer) {
            outBuffer.buffer = data.inBuffer;
        }

        // Make sure there are no lingering command counters before we start writing new ones.
        outBuffer.reset();
        outBuffer.init();

        let ok = true;
        if (buffer) {
            if (!inBuffer) {
                inBuffer = this._inBuffer = new CommandsBuffer();
            }

            inBuffer.buffer = buffer;

            // If commands buffer is provided, then execute commands, before stepping
            try {
                ok = ok && this._executeCommands(meshBuffers);
            } catch (e) {
                if ($_DEBUG) {
                    Debug.error(e);
                }
                ok = false;
            }
        }

        if (!inBuffer) {
            // The physics world is empty, as no commands were ever received yet,
            // so nothing to report and no reason to step the physics.
            const msg = this._responseMessage;
            if ($_DEBUG) {
                msg.perfIndex = this._perfIndex;
                msg.time = performance.now() - this._stepTime;
            }
            this._dispatcher.respond(msg);
            return;
        }

        // potentially step physics system, update motion states
        ok = ok && this._stepPhysics(stepsCount, time, isManualStep);

        // write the collected contact events
        this._listener.write(outBuffer);

        // write dynamic transforms to update entities
        ok = ok && this._writeIsometry(outBuffer);

        // write virtual characters state
        ok = ok && this._writeCharacters(outBuffer);

        // write debug draw data
        if ($_DEBUG && !this._config.useWebWorker) {
            // Write debug draw data
            ok = ok && this._drawer.write(this._tracker);
        }

        // report sim results to frontend
        ok = ok && this._send();

        if (!ok) {
            if ($_DEBUG) {
                Debug.error('Backend fatal error :(');
            }
            this._fatalError = true;
        }
    }

    overrideContacts(listener, overrides) {
        this._listener.overrideContacts(listener, overrides);
    }

    destroy() {
        const Jolt = this.Jolt;

        this._creator.destroy();
        this._creator = null;

        this._modifier.destroy();
        this._modifier = null;

        this._cleaner.destroy();
        this._cleaner = null;

        this._querier.destroy();
        this._querier = null;

        this._tracker.destroy();
        this._tracker = null;

        this._dispatcher = null;

        if (this._joltInterface) {
            Jolt.destroy(this._joltInterface);
            this._joltInterface = null;
        }

        const tables = this._groupFilterTables;
        const len = tables.length;
        if (len > 0) {
            for (let i = 0; i < len; i++) {
                const table = tables[i];
                Jolt.destroy(table);
            }
            tables.length = 0;
        }

        Jolt.destroy(this._bodyList);
        this._bodyList = null;

        this._inBuffer?.destroy();
        this._inBuffer = null;

        this._outBuffer?.destroy();
        this._outBuffer = null;

        this._immediateBuffer?.destroy();
        this._immediateBuffer = null;

        this._idleCallback = null;

        this.Jolt = null;
    }

    interpolate(data) {
        const outBuffer = this._outBuffer;

        // Make sure there are no lingering command counters before we start writing new ones.
        outBuffer.reset();
        outBuffer.init();

        this._updateMotionStates(data.alpha, data.stepped);

        // write dynamic transforms to update entities
        let ok = this._writeIsometry(outBuffer);

        // write virtual characters state
        ok = ok && this._writeCharacters(outBuffer);

        // write debug draw data
        if ($_DEBUG && !this._config.useWebWorker) {
            // Write debug draw data
            ok = ok && this._drawer.write(this._tracker);
        }

        // report sim results to frontend
        ok = ok && this._send();

        if (!ok) {
            if ($_DEBUG) {
                Debug.error('Backend fatal error :(');
            }
            this._fatalError = true;
        }
    }

    _stepPhysics(stepsCount, time, isManualStep) {
        const config = this._config;
        const fixedStep = config.fixedStep;
        const subSteps = config.subSteps;
        const jolt = this._joltInterface;

        let stepped = false;
        let ok = true;

        for (let i = 0; i < stepsCount; i++) {
            try {
                // update characters before stepping
                ok = this._stepCharacters(fixedStep);

                if (ok) {
                    // step the physics world
                    jolt.Step(fixedStep, subSteps);
                    stepped = true;
                }
            } catch (e) {
                if ($_DEBUG) {
                    Debug.error(e);
                }
                ok = false;
            }
        }

        this._steps += stepsCount;

        if (ok && !isManualStep && config.useMotionStates) {
            ok = this._updateMotionStates(time / fixedStep, stepped);
        }

        this._lastStamp = performance.now();

        return ok;
    }

    _updateMotionStates(alpha, stepped) {
        const Jolt = this.Jolt;
        const tracker = this._tracker;
        const system = this._physicsSystem;
        const characters = tracker.character;
        const rigidBody = Jolt.EBodyType_RigidBody;

        // active dynamic and active kinematic
        const numActiveBodies = system.GetNumActiveBodies(rigidBody);
        if (numActiveBodies > 0) {
            const bodyList = this._bodyList;

            bodyList.clear();
            system.GetActiveBodies(rigidBody, bodyList);

            for (let i = 0; i < numActiveBodies; i++) {
                const bodyID = bodyList.at(i);
                const body = system.GetBodyLockInterface().TryGetBody(bodyID);
                if (Jolt.getPointer(body) === 0 || body.isCharPaired) {
                    continue;
                }

                const ms = body.motionState;
                if (ms) {
                    ms.compute(alpha, stepped);
                }
            }
        }

        for (const char of characters) {
            const ms = char.motionState;
            if (ms) {
                const ok = ms.compute(alpha, stepped);
                if ($_DEBUG && !ok) {
                    return false;
                }
            }
        }

        return true;
    }

    _stepCharacters(fixedStep) {
        const Jolt = this.Jolt;
        const joltInterface = this._joltInterface;
        const bodyInterface = this._bodyInterface;
        const characters = this._tracker.character;
        if (characters.size === 0) return true;

        const defaultMovingBPLayerFilter = this._bpFilter;
        const defaultMovingObjLayerFilter = this._objFilter;
        const bodyFilter = this._bodyFilter;
        const shapeFilter = this._shapeFilter;

        try {
            const allocator = joltInterface.GetTempAllocator();

            characters.forEach((char) => {
                // body filter for paired body
                // TODO
                // switch to new Jolt's inner body, instead of paired body
                const bFilter = char.bodyFilter || bodyFilter;

                char.ExtendedUpdate(
                    fixedStep,
                    char.GetUp(),
                    char.updateSettings,
                    char.bpFilter ? char.bpFilter : defaultMovingBPLayerFilter,
                    char.objFilter ? char.objFilter : defaultMovingObjLayerFilter,
                    bFilter,
                    shapeFilter,
                    allocator
                );
                char.UpdateGroundVelocity();

                const pairedBody = char.pairedBody;
                if (pairedBody) {
                    const yOffset = char.GetShape().GetCenterOfMass().GetY();
                    const pos = char.GetPosition();
                    const y = pos.GetY() + yOffset;
                    pos.SetY(y);
                    bodyInterface.MoveKinematic(pairedBody.GetID(), pos, Jolt.Quat.prototype.sIdentity(), fixedStep);
                }
            });
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _executeCommands(meshBuffers) {
        const cb = this._inBuffer;
        const count = cb.commandsCount;

        for (let i = 0; i < count; i++) {
            const ok = this._executeCommand(cb, meshBuffers);
            if (!ok) {
                return false;
            }
        }

        // Reset the cursors, so we can start from the buffer beginning on the next step request
        cb.reset();
        cb.init();

        return true;
    }

    _executeCommand(cb, meshBuffers) {
        let ok = true;

        const operator = cb.readOperator();
        switch (operator) {
            case OPERATOR_CREATOR:
                ok = ok && this._creator.create(meshBuffers);
                break;

            case OPERATOR_MODIFIER:
                ok = ok && this._modifier.modify(meshBuffers);
                break;

            case OPERATOR_QUERIER:
                ok = ok && this._querier.query(cb);
                break;

            case OPERATOR_CLEANER:
                ok = ok && this._cleaner.clean();
                break;

            default:
                if ($_DEBUG) {
                    Debug.error(`Invalid operator: ${operator}`);
                }
                return false;
        }

        return ok;
    }

    _immediateCommand(cb, meshBuffers) {
        const operator = cb.readOperator();

        switch (operator) {
            case OPERATOR_QUERIER:
                return this._querier.immediateQuery(cb);

            case OPERATOR_CREATOR:
                return this._creator.immediateCreate(cb);

            case OPERATOR_CLEANER:
                return this._cleaner.immediateClean(cb);

            case OPERATOR_MODIFIER:
                return this._modifier.immediateModify(cb);

            default:
                if ($_DEBUG) {
                    Debug.error(`Invalid operator: ${operator}`);
                }
                break;
        }
    }

    _writeIsometry(cb) {
        // Report transforms of dynamic bodies and vertex positions of soft bodies
        const Jolt = this.Jolt;
        const system = this._physicsSystem;
        const activeRigidBodiesCount = system.GetNumActiveBodies(Jolt.EBodyType_RigidBody);
        const activeSoftBodiesCount = system.GetNumActiveBodies(Jolt.EBodyType_SoftBody);

        let ok = true;

        if (activeRigidBodiesCount > 0) {
            ok = this._writeRigidBodiesIsometry(activeRigidBodiesCount, system, cb);
        }

        if (activeSoftBodiesCount > 0) {
            ok = ok && this._writeSoftBodiesVertices(activeSoftBodiesCount, system, cb);
        }

        if (!activeRigidBodiesCount && !activeSoftBodiesCount && this._idleCallback) {
            this._idleCallback();
        }

        return ok;
    }

    _writeCharacters(cb) {
        const Jolt = this.Jolt;
        const tracker = this._tracker;
        const characters = tracker.character;
        const count = characters.size;

        if (count === 0) {
            return true;
        }

        const useMotionStates = this._config.useMotionStates;

        cb.writeOperator(COMPONENT_SYSTEM_CHAR);
        cb.writeCommand(CMD_REPORT_TRANSFORMS);
        cb.write(count, BUFFER_WRITE_UINT32, false);

        try {
            characters.forEach((char) => {
                const index = tracker.getPCID(Jolt.getPointer(char));
                const isSupported = char.IsSupported();
                const jState = char.GetGroundState();
                const linVel = char.GetLinearVelocity();
                const groundVelocity = char.GetGroundVelocity();
                const groundNormal = char.GetGroundNormal();
                const isTooSteep = char.IsSlopeTooSteep(groundNormal);

                let state;
                switch (jState) {
                    case Jolt.EGroundState_OnGround:
                        state = GROUND_STATE_ON_GROUND;
                        break;
                    case Jolt.EGroundState_OnSteepGround:
                        state = GROUND_STATE_ON_STEEP_GROUND;
                        break;
                    case Jolt.EGroundState_NotSupported:
                        state = GROUND_STATE_NOT_SUPPORTED;
                        break;
                    case Jolt.EGroundState_InAir:
                        state = GROUND_STATE_IN_AIR;
                        break;
                }

                cb.write(index, BUFFER_WRITE_UINT32, false);

                const ms = char.motionState;
                if (useMotionStates && ms) {
                    cb.write(ms.position, BUFFER_WRITE_VEC32, false);
                    cb.write(ms.rotation, BUFFER_WRITE_VEC32, false);
                } else {
                    cb.write(char.GetPosition(), BUFFER_WRITE_JOLTVEC32, false);
                    cb.write(char.GetRotation(), BUFFER_WRITE_JOLTVEC32, false);
                }

                cb.write(linVel, BUFFER_WRITE_JOLTVEC32, false);
                cb.write(isSupported, BUFFER_WRITE_BOOL, false);
                cb.write(state, BUFFER_WRITE_UINT8, false);

                if (isSupported) {
                    const groundID = char.GetGroundBodyID();
                    const bodyLockInterface = this._physicsSystem.GetBodyLockInterface();
                    let bodyGround = bodyLockInterface.TryGetBody(groundID);
                    if (Jolt.getPointer(bodyGround) === 0) {
                        bodyGround = null;
                    }
                    cb.write(!!bodyGround, BUFFER_WRITE_BOOL, false);
                    if (bodyGround) {
                        const groundIdx = tracker.getPCID(Jolt.getPointer(bodyGround));
                        cb.write(groundIdx, BUFFER_WRITE_UINT32, false);
                    }

                    cb.write(isTooSteep, BUFFER_WRITE_BOOL, false);
                    cb.write(groundVelocity, BUFFER_WRITE_JOLTVEC32, false);
                    cb.write(groundNormal, BUFFER_WRITE_JOLTVEC32, false);
                }
            });
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _send() {
        const dispatcher = this._dispatcher;
        const msg = this._responseMessage;
        const outBuffer = this._outBuffer;
        const buffer = outBuffer.buffer;
        const drawer = this._drawer;
        const debugDraw = !!(drawer && drawer.dirty);
        const useSAB = this._config.useSAB;

        outBuffer.reset();
        // this._querier.reset();
        this._listener.reset();

        if (debugDraw) {
            msg.drawViews = drawer.data;
        } else {
            msg.drawViews = null;
        }

        msg.buffer = buffer.byteLength > 0 ? buffer : null;
        msg.steps = this._steps;

        // TODO
        // refactor

        const buffers = [];

        // If we are in a web worker, we need to detach the incoming buffer,
        // so it is available for write in main thread
        if (typeof importScripts === 'function') {
            const inBuffer = this._inBuffer;
            const ib = inBuffer.buffer;
            if (ib.byteLength > 0) {
                msg.inBuffer = ib;
                if (!useSAB) {
                    buffers.push(ib);
                }
            } else {
                msg.inBuffer = null;
            }
        }

        if ($_DEBUG) {
            msg.perfIndex = this._perfIndex;
            msg.time = performance.now() - this._stepTime;
        }

        if (debugDraw) {
            buffers.push(...drawer.buffers);
        }

        if (!useSAB && buffer.byteLength > 0) {
            buffers.push(buffer);
        }

        dispatcher.respond(msg, buffers);

        if (debugDraw) {
            drawer.reset();
        }

        return true;
    }

    _writeRigidBodiesIsometry(count, system, cb) {
        const Jolt = this.Jolt;
        const useMotionStates = this._config.useMotionStates;
        const bodyList = this._bodyList;
        const tracker = this._tracker;

        try {
            bodyList.clear();
            system.GetActiveBodies(Jolt.EBodyType_RigidBody, bodyList);

            for (let i = 0; i < count; i++) {
                const bodyID = bodyList.at(i);
                const body = system.GetBodyLockInterface().TryGetBody(bodyID);

                if (Jolt.getPointer(body) === 0 ||
                        body.isometryUpdate === ISOMETRY_FRONT_TO_BACK ||
                        body.isometryUpdate === ISOMETRY_NONE ||
                        (body.isometryUpdate === ISOMETRY_DEFAULT &&
                            body.GetMotionType() === Jolt.EMotionType_Kinematic) ||

                        // TODO
                        // deprecate char paired bodies, use new Jolt API
                        body.isCharPaired) {
                    continue;
                }

                // If body was added by user using Jolt API directly, then backend is not aware of it.
                // We skip it, assuming user handles its tracking himself.
                const index = tracker.getPCID(Jolt.getPointer(body));
                if (index == null) {
                    continue;
                }

                cb.writeOperator(COMPONENT_SYSTEM_BODY);
                cb.writeCommand(CMD_REPORT_TRANSFORMS);

                cb.write(index, BUFFER_WRITE_UINT32, false);

                const ms = body.motionState;
                if (useMotionStates && ms) {
                    cb.write(ms.position, BUFFER_WRITE_VEC32, false);
                    cb.write(ms.rotation, BUFFER_WRITE_VEC32, false);
                } else {
                    cb.write(body.GetPosition(), BUFFER_WRITE_JOLTVEC32, false);
                    cb.write(body.GetRotation(), BUFFER_WRITE_JOLTVEC32, false);
                }

                cb.write(body.GetLinearVelocity(), BUFFER_WRITE_JOLTVEC32, false);
                cb.write(body.GetAngularVelocity(), BUFFER_WRITE_JOLTVEC32, false);

                // If it is a vehicle, write wheels isometry as well
                const isVehicle = !!body.isVehicle;
                cb.write(isVehicle, BUFFER_WRITE_BOOL, false);
                if (isVehicle) {
                    const data = tracker.constraintMap.get(body.vehicleConstraintIndex);
                    const constraint = data.constraint;
                    const wheelsCount = constraint.wheelsCount;
                    const modifier = this._modifier;

                    const jv1 = modifier.joltVec3_1;
                    const jv2 = modifier.joltVec3_2;

                    jv1.Set(0, 1, 0);
                    jv2.Set(1, 0, 0);

                    // cb.write(wheelsCount, BUFFER_WRITE_UINT32, false);

                    for (let i = 0; i < wheelsCount; i++) {
                        const isWheeled = constraint.isWheeled;
                        const transform = constraint.GetWheelLocalTransform(i, jv1, jv2);
                        const JoltWheel = isWheeled ? Jolt.WheelWV : Jolt.WheelTV;
                        const wheel = Jolt.castObject(constraint.GetWheel(i), JoltWheel);

                        if (isWheeled) {
                            cb.write(wheel.mLongitudinalSlip, BUFFER_WRITE_FLOAT32, false);
                            cb.write(wheel.mLateralSlip, BUFFER_WRITE_FLOAT32, false);
                            cb.write(wheel.mCombinedLongitudinalFriction, BUFFER_WRITE_FLOAT32, false);
                            cb.write(wheel.mCombinedLateralFriction, BUFFER_WRITE_FLOAT32, false);
                            cb.write(wheel.mBrakeImpulse, BUFFER_WRITE_FLOAT32, false);
                        }
                        cb.write(transform.GetTranslation(), BUFFER_WRITE_JOLTVEC32, false);
                        cb.write(transform.GetQuaternion(), BUFFER_WRITE_JOLTVEC32, false);
                    }
                }
            }

        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _writeSoftBodiesVertices(count, system, cb) {
        const Jolt = this.Jolt;
        const bodyList = this._bodyList;
        const tracker = this._tracker;

        try {
            bodyList.clear();
            system.GetActiveBodies(Jolt.EBodyType_SoftBody, bodyList);

            for (let i = 0; i < count; i++) {
                const bodyID = bodyList.at(i);
                const body = system.GetBodyLockInterface().TryGetBody(bodyID);
                const pointer = Jolt.getPointer(body);
                if (pointer === 0) {
                    continue;
                }

                cb.writeOperator(COMPONENT_SYSTEM_SOFT_BODY);
                cb.writeCommand(CMD_REPORT_TRANSFORMS);

                const index = tracker.getPCID(pointer);
                cb.write(index, BUFFER_WRITE_UINT32, false);

                const vertices = Jolt.castObject(body.GetMotionProperties(), Jolt.SoftBodyMotionProperties).GetVertices();
                const count = vertices.size();

                cb.write(count, BUFFER_WRITE_UINT32, false);
                for (let i = 0; i < count; i++) {
                    cb.write(vertices.at(i).mPosition, BUFFER_WRITE_JOLTVEC32, false);
                }
            }
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }
}

export { JoltBackend };
