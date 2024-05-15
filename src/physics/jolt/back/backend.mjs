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
    BP_LAYER_MOVING, BP_LAYER_NON_MOVING, BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_JOLTVEC32,
    BUFFER_WRITE_UINT32, BUFFER_WRITE_UINT8, BUFFER_WRITE_VEC32, CMD_REPORT_TRANSFORMS, COMPONENT_SYSTEM_BODY,
    COMPONENT_SYSTEM_CHAR, COMPONENT_SYSTEM_SOFT_BODY, OBJ_LAYER_MOVING, OBJ_LAYER_NON_MOVING, OPERATOR_CLEANER,
    OPERATOR_CREATOR, OPERATOR_MODIFIER, OPERATOR_QUERIER
} from '../constants.mjs';

class JoltBackend {
    constructor(messenger, data) {
        const config = {
            // Physics Settings
            // https://jrouwe.github.io/JoltPhysics/struct_physics_settings.html
            baumgarte: 0.2,
            maxSkippedSteps: 5,
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
            contactEventsEnabled: true,
            contactAddedEventsEnabled: true,
            contactPersistedEventsEnabled: false,
            contactRemovedEventsEnabled: true,
            contactPoints: true,
            contactPointsAveraged: true,
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
        this._updateCallback = null;
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

    set updateCallback(func) {
        this._updateCallback = func;
    }

    get updateCallback() {
        return this._updateCallback;
    }

    onLibLoad(Jolt, config) {
        // Util
        extendJoltMath(Jolt);

        // Physics operators
        this._creator = new Creator(this);
        this._modifier = new Modifier(this);
        this._cleaner = new Cleaner(this);
        this._querier = new Querier(this);
        this._tracker = new Tracker(Jolt);
        this._listener = new Listener(this);
        this._outBuffer = new CommandsBuffer({ ...config, commandsBufferSize: 2000 });
        this._stepTime = 0;
        this._steps = 0;
        this._inBuffer = null;
        this._fatalError = false;

        if (config.contactEventsEnabled) {
            this._listener.initEvents(config);
        }

        if ($_DEBUG) {
            this._drawer = new Drawer(Jolt);
            this._perfIndex = null;
        }

        this._responseMessage = {
            buffer: null,
            inBuffer: null,
            origin: 'physics-worker'
        };

        this._dispatcher.respond({
            origin: 'physics-worker',
            initDone: true
        }, null);

        if ($_DEBUG) {
            console.log('Jolt Physics:', $_JOLT_VERSION);
        }
    }

    step(data) {
        if (this._fatalError) return;

        if ($_DEBUG) {
            this._stepTime = performance.now();
            this._perfIndex = data.perfIndex;
        }

        const { buffer, meshBuffers, dt } = data;
        const outBuffer = this._outBuffer;
        let inBuffer = this._inBuffer;

        if (data.inBuffer) {
            outBuffer.buffer = data.inBuffer;
        }

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
        ok = ok && this._stepPhysics(dt);

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

        if (this._charUpdateSettings) {
            Jolt.destroy(this._charUpdateSettings);
            this._charUpdateSettings = null;
        }

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

        this.Jolt = null;
    }

    _stepPhysics(dt) {
        const config = this._config;
        const fixedStep = config.fixedStep;
        const subSteps = config.subSteps;
        const jolt = this._joltInterface;

        let time = this._time;
        let stepped = false;
        let ok = true;

        if (this._lastStamp !== 0) {
            dt = (performance.now() - this._lastStamp) * 0.001;
        }

        time += dt;

        while (ok && time >= fixedStep) {
            try {
                // Execute callbacks, if any
                this._updateCallback?.();

                // update characters before stepping
                ok = this._stepCharacters(fixedStep);
                // step the physics world

                if (ok) {
                    jolt.Step(fixedStep, subSteps);
                }
                this._steps++;
                stepped = true;
            } catch (e) {
                if ($_DEBUG) {
                    Debug.error(e);
                }
                ok = false;
            }

            time -= fixedStep;
        }

        if (ok && config.useMotionStates) {
            ok = this._updateMotionStates(time / fixedStep, stepped);
        }

        this._time = time;

        this._lastStamp = performance.now();

        return ok;
    }

    _updateMotionStates(alpha, stepped) {
        const Jolt = this.Jolt;
        const tracker = this._tracker;
        const system = this._physicsSystem;
        const characters = tracker.character;
        const dynamicType = Jolt.EBodyType_RigidBody;

        // active dynamic and active kinematic
        const numActiveBodies = system.GetNumActiveBodies(dynamicType);
        if (numActiveBodies > 0) {
            const bodyList = this._bodyList;

            bodyList.clear();
            system.GetActiveBodies(dynamicType, bodyList);

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

        const movingBPFilter = this._bpFilter;
        const movingLayerFilter = this._objFilter;
        const bodyFilter = this._bodyFilter;
        const shapeFilter = this._shapeFilter;
        let updateSettings = this._charUpdateSettings;

        try {
            if (!updateSettings) {
                updateSettings = this._charUpdateSettings = new Jolt.ExtendedUpdateSettings();
            }
            const allocator = joltInterface.GetTempAllocator();

            // TODO
            // make it customizable, like the raycast
            // const objectVsBroadPhaseLayerFilter = joltInterface.GetObjectVsBroadPhaseLayerFilter();
            // const objectLayerPairFilter = joltInterface.GetObjectLayerPairFilter();
            // const movingBPFilter = new Jolt.DefaultBroadPhaseLayerFilter(objectVsBroadPhaseLayerFilter, BP_LAYER_MOVING);
            // const movingLayerFilter = new Jolt.DefaultObjectLayerFilter(objectLayerPairFilter, 2);

            characters.forEach((char) => {
                const bFilter = char.bodyFilter || bodyFilter;

                char.ExtendedUpdate(
                    fixedStep,
                    char.GetUp(),
                    updateSettings,
                    movingBPFilter,
                    movingLayerFilter,
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

            // Jolt.destroy(movingBPFilter);
            // Jolt.destroy(movingLayerFilter);
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
        const creator = this._creator;
        const modifier = this._modifier;
        const querier = this._querier;
        const cleaner = this._cleaner;
        const count = cb.commandsCount;

        let ok = true;

        for (let i = 0; i < count; i++) {
            const operator = cb.readOperator();

            switch (operator) {
                case OPERATOR_CREATOR:
                    ok = ok && creator.create(meshBuffers);
                    break;

                case OPERATOR_MODIFIER:
                    ok = ok && modifier.modify();
                    break;

                case OPERATOR_QUERIER:
                    ok = ok && querier.query();
                    break;

                case OPERATOR_CLEANER:
                    ok = ok && cleaner.clean();
                    break;

                default:
                    if ($_DEBUG) {
                        Debug.error(`Invalid operator: ${operator}`);
                    }
                    return false;
            }
        }

        // Reset the cursors, so we can start from the buffer beginning on
        // the next step request
        cb.reset();

        return ok;
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

        return ok;
    }

    _writeCharacters(cb) {
        const Jolt = this.Jolt;
        const tracker = this._tracker;
        const characters = tracker.character;
        const count = characters.size;

        if (count === 0)
            return true;

        const useMotionStates = this._config.useMotionStates;

        cb.writeOperator(COMPONENT_SYSTEM_CHAR);
        cb.writeCommand(CMD_REPORT_TRANSFORMS);
        cb.write(count, BUFFER_WRITE_UINT32, false);

        try {
            characters.forEach((char) => {
                const index = tracker.getPCID(Jolt.getPointer(char));
                const isSupported = char.IsSupported();
                const state = char.GetGroundState();
                const linVel = char.GetLinearVelocity();
                const groundVelocity = char.GetGroundVelocity();
                const groundNormal = char.GetGroundNormal();
                const isTooSteep = char.IsSlopeTooSteep(groundNormal);

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
                const pointer = Jolt.getPointer(body);
                if (pointer === 0 || body.isCharPaired || body.GetMotionType() !== Jolt.EMotionType_Dynamic) {
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
                if (body.isVehicle) {
                    const data = tracker.constraintMap.get(index);
                    const constraint = data.constraint;
                    const wheelsCount = constraint.wheelsCount;
                    const modifier = this._modifier;

                    const jv1 = modifier.joltVec3_1;
                    const jv2 = modifier.joltVec3_2;

                    jv1.Set(0, 1, 0);
                    jv2.Set(1, 0, 0);

                    for (let i = 0; i < wheelsCount; i++) {
                        const transform = constraint.GetWheelLocalTransform(i, jv1, jv2);
                        const wheel = Jolt.castObject(constraint.GetWheel(i), Jolt.WheelWV);

                        cb.write(wheel.mLongitudinalSlip, BUFFER_WRITE_FLOAT32, false);
                        cb.write(wheel.mLateralSlip, BUFFER_WRITE_FLOAT32, false);
                        cb.write(wheel.mCombinedLongitudinalFriction, BUFFER_WRITE_FLOAT32, false);
                        cb.write(wheel.mCombinedLateralFriction, BUFFER_WRITE_FLOAT32, false);
                        cb.write(wheel.mBrakeImpulse, BUFFER_WRITE_FLOAT32, false);
                        cb.write(transform.GetTranslation(), BUFFER_WRITE_JOLTVEC32, false);
                        cb.write(transform.GetRotation().GetQuaternion(), BUFFER_WRITE_JOLTVEC32, false);
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
