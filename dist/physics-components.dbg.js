var PhysicsComponents;
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/backends/jolt/backend.mjs":
/*!***************************************!*\
  !*** ./src/backends/jolt/backend.mjs ***!
  \***************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   JoltBackend: () => (/* binding */ JoltBackend)
/* harmony export */ });
/* harmony import */ var jolt_physics_package_json__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! jolt-physics/package.json */ "./node_modules/jolt-physics/package.json");
/* harmony import */ var _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../physics/components/jolt/constants.mjs */ "./src/physics/components/jolt/constants.mjs");
/* harmony import */ var _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../physics/debug.mjs */ "./src/physics/debug.mjs");
/* harmony import */ var _physics_math_mjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../physics/math.mjs */ "./src/physics/math.mjs");
/* harmony import */ var _commands_buffer_mjs__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./commands-buffer.mjs */ "./src/backends/jolt/commands-buffer.mjs");
/* harmony import */ var _operators_cleaner_mjs__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./operators/cleaner.mjs */ "./src/backends/jolt/operators/cleaner.mjs");
/* harmony import */ var _operators_creator_mjs__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./operators/creator.mjs */ "./src/backends/jolt/operators/creator.mjs");
/* harmony import */ var _operators_drawer_mjs__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./operators/drawer.mjs */ "./src/backends/jolt/operators/drawer.mjs");
/* harmony import */ var _operators_listener_mjs__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./operators/listener.mjs */ "./src/backends/jolt/operators/listener.mjs");
/* harmony import */ var _operators_modifier_mjs__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./operators/modifier.mjs */ "./src/backends/jolt/operators/modifier.mjs");
/* harmony import */ var _operators_querier_mjs__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./operators/querier.mjs */ "./src/backends/jolt/operators/querier.mjs");
/* harmony import */ var _operators_tracker_mjs__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./operators/tracker.mjs */ "./src/backends/jolt/operators/tracker.mjs");














class JoltBackend {
    constructor(messenger, data) {
        // // TODO
        // // add webworker
        // if (!window || !window.Jolt) return;

        const config = {
            // Physics Settings
            // https://jrouwe.github.io/JoltPhysics/struct_physics_settings.html
            baumgarte: 0.2,
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
            // object layers
            layerPairs: [
                [ 0, 1 ],   // non-moving, moving
                [ 1, 1 ]    // moving, moving
            ],
            ...data.config
        };
        this._config = config;
        this._time = 0;

        const loadJolt = async () => {
            const module = await import(/* webpackIgnore: true */ data.glueUrl);
            module.default({
                locateFile: () => {
                    return data.wasmUrl;
                }
            }).then(Jolt => {

                //  TODO
                
                console.log(Jolt)
                
                // window.Jolt = Jolt;
                // onLoad();
            });

            // WebAssembly.instantiate(data.module, {}).then((instance) => {
            //     console.log(instance);
            // });            
        }
        loadJolt();


        // async function load() {
        //     const module = require('./lib/jolt-physics.wasm.js')
        //     console.log(module)

        //     WebAssembly.instantiate(data.module, {}).then((instance) => {
        //         console.log(instance);
                
    
        //         // instance.exports.exported_func();
        //     });
        // }

        // load();

        // Transform filters to bit values
        this._filterLayers = new Map();
        this._filterToBits(config);

        // Jolt specific
        this._joltInterface = null;
        this._physicsSystem = null;
        this._bodyInterface = null;
        this._bpFilter = null;
        this._objFilter = null;
        this._bodyFilter = null;
        this._shapeFilter = null;
        this._bodyList = null;
        this._groupFilterTables = [];

        // Physics operators
        this._creator = new _operators_creator_mjs__WEBPACK_IMPORTED_MODULE_6__.Creator(this);
        this._modifier = new _operators_modifier_mjs__WEBPACK_IMPORTED_MODULE_9__.Modifier(this);
        this._cleaner = new _operators_cleaner_mjs__WEBPACK_IMPORTED_MODULE_5__.Cleaner(this);
        this._querier = new _operators_querier_mjs__WEBPACK_IMPORTED_MODULE_10__.Querier(this);
        this._tracker = new _operators_tracker_mjs__WEBPACK_IMPORTED_MODULE_11__.Tracker(this);
        this._drawer = new _operators_drawer_mjs__WEBPACK_IMPORTED_MODULE_7__.Drawer();
        
        const listener = new _operators_listener_mjs__WEBPACK_IMPORTED_MODULE_8__.Listener(this);

        if (config.contactEventsEnabled) {
            listener.initEvents(config);
        }

        this._listener = listener;

        this._outBuffer = new _commands_buffer_mjs__WEBPACK_IMPORTED_MODULE_4__.CommandsBuffer({ ...this._config, commandsBufferSize: 2000 });

        // Util
        (0,_physics_math_mjs__WEBPACK_IMPORTED_MODULE_3__.extendMath)();

        this._stepTime = 0;
        this._steps = 0;

        this._responseMessage = { buffer: null, softBodies: [] };
        this._dispatcher = messenger;
        this._inBuffer = null;
        this._fatalError = false;

        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev) {
            this._perfIndex = null;
        }

        this._exposeConstants();
    }

    set joltInterface(joltInterface) {
        this._joltInterface = joltInterface;
    }

    get joltInterface() {
        return this._joltInterface;
    }

    get physicsSystem() {
        return this._physicsSystem;
    }
    set physicsSystem(system) {
        this._physicsSystem = system;
        this._bodyInterface = system.GetBodyInterface();
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

    get bpFilter() {
        return this._bpFilter;
    }

    set bpFilter(filter) {
        this._bpFilter = filter;
    }

    get objFilter() {
        return this._objFilter;
    }

    set objFilter(filter) {
        this._objFilter = filter;
    }

    get bodyFilter() {
        return this._bodyFilter;
    }

    set bodyFilter(filter) {
        this._bodyFilter = filter;
    }

    get shapeFilter() {
        return this._shapeFilter;
    }

    set shapeFilter(filter) {
        this._shapeFilter = filter;
    }

    get bodyList() {
        return this._bodyList;
    }

    set bodyList(list) {
        this._bodyList = list;
    }

    step(data) {
        if (this._fatalError) return;
        
        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev) {
            this._stepTime = performance.now();
            this._perfIndex = data.perfIndex;
        }
        
        const { buffer, meshBuffers, dt } = data;
        let inBuffer = this._inBuffer;

        let ok = true;
        if (buffer) {
            if (!inBuffer) {
                inBuffer = this._inBuffer = new _commands_buffer_mjs__WEBPACK_IMPORTED_MODULE_4__.CommandsBuffer();
                inBuffer.buffer = buffer;
            }

            // If commands buffer is provided, then execute commands, before stepping
            try {
                ok = ok && this._executeCommands(meshBuffers);
            } catch (e) {
                _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.error(e);
                ok = false;
            }
        }

        if (!inBuffer) {
            // The physics world is empty, as no commands were ever received yet,
            // so nothing to report and no reason to step the physics.
            return;
        }

        const outBuffer = this._outBuffer;

        // potentially step physics system, update motion states
        ok = ok && this._stepPhysics(dt);

        // write the collected contact events
        this._listener.write(outBuffer);

        // write dynamic transforms to update entities
        ok = ok && this._writeIsometry(outBuffer);

        // write virtual characters state
        ok = ok && this._writeCharacters(outBuffer);

        // write debug draw data
        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev) {
            // Write debug draw data
            ok = ok && this._drawer.write(this._tracker);
        }     

        // report sim results to frontend
        ok = ok && this._send();

        if (!ok) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.error('Backend fatal error :(');
            this._fatalError = true;
        }
    }

    overrideContacts(listener, overrides) {
        this._listener.overrideContacts(listener, overrides);
    }

    getBitValue(name) {
        const layers = this._filterLayers;

        if (!layers.has(name)) {
            layers.set(name, layers.size ? 1 << layers.size - 1 : 0);
        }

        return layers.get(name);
    }

    destroy() {
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
    }

    _stepPhysics(dt) {
        const config = this._config;
        const fixedStep = config.fixedStep;
        const subSteps = config.subSteps;
        const jolt = this._joltInterface;

        let time = this._time;
        let stepped = false;
        let ok = true;

        time += dt;

        while (ok && time >= fixedStep) {
            try {
                // update characters before stepping
                ok = this._updateCharacters(fixedStep);
                // step the physics world
                ok && jolt.Step(fixedStep, subSteps);
                this._steps++;
                stepped = true;
            } catch (e) {
                _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.error(e);
                ok = false;
            }

            time -= fixedStep;
        }

        if (ok && config.useMotionStates) {
            ok = this._updateMotionStates(time / fixedStep, stepped);
        }

        this._time = time;

        return ok;
    }

    _updateMotionStates(alpha, stepped) {
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
                if (Jolt.getPointer(body) === 0) {
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
                if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev && !ok) {
                    return false;
                }
            }
        }

        return true;
    }

    _updateCharacters(fixedStep) {
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
            const allocator = this._joltInterface.GetTempAllocator();
    
            characters.forEach(char => {
                char.ExtendedUpdate(
                    fixedStep,
                    char.GetUp(),
                    updateSettings,
                    movingBPFilter,
                    movingLayerFilter,
                    bodyFilter,
                    shapeFilter,
                    allocator
                );
                char.UpdateGroundVelocity();
            });
        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.error(e);
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
                case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.OPERATOR_CREATOR:
                    ok = ok && creator.create(meshBuffers);
                    break;

                case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.OPERATOR_MODIFIER:
                    ok = ok && modifier.modify();
                    break;

                case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.OPERATOR_QUERIER:
                    ok = ok && querier.query();
                    break;

                case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.OPERATOR_CLEANER:
                    ok = ok && cleaner.clean();
                    break;

                default:
                    _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.error(`Invalid operator: ${ operator }`);
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
        const tracker = this._tracker;
        const characters = tracker.character;
        const count = characters.size;

        if (count === 0)
            return true;

        const useMotionStates = this._config.useMotionStates;

        cb.writeOperator(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.COMPONENT_SYSTEM_CHAR);
        cb.writeCommand(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.CMD_UPDATE_TRANSFORMS);
        cb.write(count, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_UINT32, false);

        try {
            characters.forEach(char => {
                const index = tracker.getPCID(Jolt.getPointer(char));
                const isSupported = char.IsSupported();
                const state = char.GetGroundState();
                const linVel = char.GetLinearVelocity();
                const groundVelocity = char.GetGroundVelocity();
                const groundNormal = char.GetGroundNormal();
                const isTooSteep = char.IsSlopeTooSteep(groundNormal);

                cb.write(index, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_UINT32, false);

                const ms = char.motionState;
                if (useMotionStates && ms) {
                    cb.write(ms.position, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_VEC32, false);
                    cb.write(ms.rotation, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_VEC32, false);
                } else {
                    cb.write(char.GetPosition(), _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_JOLTVEC32, false);
                    cb.write(char.GetRotation(), _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_JOLTVEC32, false);
                }

                cb.write(linVel, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_JOLTVEC32, false);
                cb.write(isSupported, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_BOOL, false);
                cb.write(state, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_UINT8, false);

                if (isSupported) {
                    const groundID = char.GetGroundBodyID();
                    const bodyLockInterface = this._physicsSystem.GetBodyLockInterface();
                    let bodyGround = bodyLockInterface.TryGetBody(groundID);
                    if (Jolt.getPointer(bodyGround) === 0) {
                        bodyGround = null;
                    }
                    cb.write(!!bodyGround, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_BOOL, false);
                    if (bodyGround) {
                        const groundIdx = tracker.getPCID(Jolt.getPointer(bodyGround));
                        cb.write(groundIdx, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_UINT32, false);
                    }

                    cb.write(isTooSteep, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_BOOL, false);
                    cb.write(groundVelocity, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_JOLTVEC32, false);
                    cb.write(groundNormal, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_JOLTVEC32, false);
                }
            });
        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.error(e);
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

        outBuffer.reset();
        this._querier.reset();
        this._listener.reset();

        if (debugDraw) {
            msg.drawViews = drawer.data;
        } else {
            msg.drawViews = null;
        }

        msg.buffer = buffer;
        msg.steps = this._steps;

        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev) {
            msg.perfIndex = this._perfIndex;
            msg.time = performance.now() - this._stepTime;
        }

        // TODO
        // refactor

        if (this._config.useSAB) {
            if (debugDraw) {
                dispatcher.respond(msg, [ ...drawer.buffers ]);
                drawer.reset();
            } else {
                dispatcher.respond(msg);
            }
        } else {
            if (debugDraw) {
                dispatcher.respond(msg, [ buffer, ...drawer.buffers ]);
                drawer.reset();
            } else {
                dispatcher.respond(msg, [ buffer ]);
            }
        }

        return true;
    }

    _filterToBits(config) {
        const filterLayers = this._filterLayers;
        const pairs = config.layerPairs;
        for (let i = 0, end = pairs.length; i < end; i++) {
            const pair = pairs[i];
            pair[0] = this.getBitValue(pair[0]);
            pair[1] = this.getBitValue(pair[1]);
        }

        const layers = [];
        filterLayers.forEach(key => {
            layers.push(key);
        });

        config.layers = layers;
    }

    _exposeConstants() {
        const dispatcher = this._dispatcher;
        const msg = this._responseMessage;

        msg.constants = [
            'JOLT_VERSION', jolt_physics_package_json__WEBPACK_IMPORTED_MODULE_0__.version,

            'JOLT_MOTION_TYPE_STATIC', Jolt.EMotionType_Static,
            'JOLT_MOTION_TYPE_DYNAMIC', Jolt.EMotionType_Dynamic,
            'JOLT_MOTION_TYPE_KINEMATIC', Jolt.EMotionType_Kinematic,

            'JOLT_OMP_CALCULATE_INERTIA', Jolt.EOverrideMassProperties_CalculateInertia,
            'JOLT_OMP_CALCULATE_MASS_AND_INERTIA', Jolt.EOverrideMassProperties_CalculateMassAndInertia,
            'JOLT_OMP_MASS_AND_INERTIA_PROVIDED', Jolt.EOverrideMassProperties_MassAndInertiaProvided,

            'JOLT_ALLOWED_DOFS_TRANSLATION_X', Jolt.EAllowedDOFs_TranslationX,
            'JOLT_ALLOWED_DOFS_TRANSLATION_Y', Jolt.EAllowedDOFs_TranslationY,
            'JOLT_ALLOWED_DOFS_TRANSLATION_Z', Jolt.EAllowedDOFs_TranslationZ,
            'JOLT_ALLOWED_DOFS_ROTATION_X', Jolt.EAllowedDOFs_RotationX,
            'JOLT_ALLOWED_DOFS_ROTATION_Y', Jolt.EAllowedDOFs_RotationY,
            'JOLT_ALLOWED_DOFS_ROTATION_Z', Jolt.EAllowedDOFs_RotationZ,
            'JOLT_ALLOWED_DOFS_PLANE_2D', Jolt.EAllowedDOFs_Plane2D,
            'JOLT_ALLOWED_DOFS_ALL', Jolt.EAllowedDOFs_All,

            'JOLT_MOTION_QUALITY_DISCRETE', Jolt.EMotionQuality_Discrete,
            'JOLT_MOTION_QUALITY_LINEAR_CAST', Jolt.EMotionQuality_LinearCast,

            'JOLT_BFM_IGNORE_BACK_FACES', Jolt.EBackFaceMode_IgnoreBackFaces,
            'JOLT_BFM_COLLIDE_BACK_FACES', Jolt.EBackFaceMode_CollideWithBackFaces,
            
            'JOLT_GROUND_STATE_ON_GROUND', Jolt.EGroundState_OnGround,
            'JOLT_GROUND_STATE_ON_STEEP_GROUND', Jolt.EGroundState_OnSteepGround,
            'JOLT_GROUND_STATE_NOT_SUPPORTED', Jolt.EGroundState_NotSupported,
            'JOLT_GROUND_STATE_IN_AIR', Jolt.EGroundState_InAir,

            'JOLT_TRANSMISSION_AUTO', Jolt.ETransmissionMode_Auto,
            'JOLT_TRANSMISSION_MANUAL', Jolt.ETransmissionMode_Manual,

            'JOLT_SPRING_MODE_FREQUENCY', Jolt.ESpringMode_FrequencyAndDamping,
            'JOLT_SPRING_MODE_STIFFNESS', Jolt.ESpringMode_StiffnessAndDamping,
        ];

        dispatcher.respond(msg);

        msg.constants = null;
    }

    _writeRigidBodiesIsometry(count, system, cb) {
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
                if (pointer === 0) {
                    continue;
                }

                cb.writeOperator(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.COMPONENT_SYSTEM_BODY);
                cb.writeCommand(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.CMD_UPDATE_TRANSFORMS);

                const index = tracker.getPCID(Jolt.getPointer(body));
                cb.write(index, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_UINT32, false);

                const ms = body.motionState;
                if (useMotionStates && ms) {
                    cb.write(ms.position, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_VEC32, false);
                    cb.write(ms.rotation, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_VEC32, false);
                } else {
                    cb.write(body.GetPosition(), _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_JOLTVEC32, false);
                    cb.write(body.GetRotation(), _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_JOLTVEC32, false);
                }

                cb.write(body.GetLinearVelocity(), _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_JOLTVEC32, false);
                cb.write(body.GetAngularVelocity(), _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_JOLTVEC32, false);

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

                        cb.write(transform.GetTranslation(), _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_JOLTVEC32, false);
                        cb.write(transform.GetRotation().GetQuaternion(), _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_JOLTVEC32, false);
                    }
                }
            }

        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.error(e);
            return false;
        }

        return true;
    }

    _writeSoftBodiesVertices(count, system, cb) {
        // const useMotionStates = this._config.useMotionStates;
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

                cb.writeOperator(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.COMPONENT_SYSTEM_SOFT_BODY);
                cb.writeCommand(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.CMD_UPDATE_TRANSFORMS);

                const index = tracker.getPCID(pointer);
                cb.write(index, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_UINT32, false);

                const vertices = Jolt.castObject(body.GetMotionProperties(), Jolt.SoftBodyMotionProperties).GetVertices();
                const count = vertices.size();

                cb.write(count, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_UINT32, false);
                for (let i = 0; i < count; i++) {
                    cb.write(vertices.at(i).mPosition, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_JOLTVEC32, false);
                }
            }
        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.error(e);
            return false;
        }

        return true;
    }
}





/***/ }),

/***/ "./src/backends/jolt/commands-buffer.mjs":
/*!***********************************************!*\
  !*** ./src/backends/jolt/commands-buffer.mjs ***!
  \***********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CommandsBuffer: () => (/* binding */ CommandsBuffer)
/* harmony export */ });
/* harmony import */ var _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../physics/debug.mjs */ "./src/physics/debug.mjs");
/* harmony import */ var _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../physics/components/jolt/constants.mjs */ "./src/physics/components/jolt/constants.mjs");



class CommandsBuffer {
    constructor(config) {
        if (config) {
            let Buffer;
            if (config.useSharedArrayBuffer) {
                Buffer = SharedArrayBuffer;
            } else {
                Buffer = ArrayBuffer;
            }
            this._buffer = new Buffer(config.commandsBufferSize);
            this._view = new DataView(this._buffer);
            this._allowGrowth = config.allowCommandsBufferResize;
        } else {
            this._allowGrowth = true;
        }

        // First 2 bytes are for commands count, so we start from 2
        this._bytesOffset = _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT16_SIZE;
        this._commandsCount = 0;
        this._dirty = false;
        this._meshBuffers = [];
    }

    get buffer() {
        return this._buffer;
    }

    set buffer(b) {
        this._buffer = b;
        this._view = new DataView(b);
    }

    get dirty() {
        return this._dirty;
    }

    get flag() {
        return this.readUint8();
    }

    get commandsCount() {
        return this._view.getUint16(0);
    }

    get meshBuffers() {
        return this._meshBuffers;
    }

    writeJoltVec32(vec) {
        this.writeFloat32(vec.GetX());
        this.writeFloat32(vec.GetY());
        this.writeFloat32(vec.GetZ());
        if (vec.GetW) {
            this.writeFloat32(vec.GetW());
        }
    }

    readVec(vec) {
        vec.x = this.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32);
        vec.y = this.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32);
        vec.z = this.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32);
    }

    readQuat(quat) {
        this.readVec(quat);
        quat.w = this.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32);
    }

    ignoreFlag() {
        this._bytesOffset += _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT8_SIZE;
    }

    reserveOffset(method) {
        const offset = this._bytesOffset;
        this[method](0);
        return offset;
    }

    writeReserved(value, offset, method) {
        this[method](value, offset);
    }    

    updateBuffer(buffer) {
        if (this._buffer.byteLength !== buffer.byteLength) {
            this._buffer = buffer;
            this._view = new DataView(buffer);
        }
    }

    read(method) {
        _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.assert(
            method === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_BOOL ||
            method === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32 ||
            method === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT8 ||
            method === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT16 ||
            method === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT32 ||
            method === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_INT32,
            `Invalid write command method: ${ method }`
        );

        return this[method]();
    }

    /**
     * Writes value to buffer. Skips flag for uint8 values.
     */
    write(value, method, addFlag = true) {
        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.assert(
                method === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_BOOL || 
                method === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_FLOAT32 ||
                method === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_UINT8 ||
                method === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_UINT16 ||
                method === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_UINT32 ||
                method === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_INT32 ||
                method === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_VEC32 ||
                method === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_JOLTVEC32 ||
                method === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_PLANE,
                `Invalid write command method: ${ method }`
            );
        }

        if (value == null) {
            this.writeUint8(0);
        } else {
            if (addFlag) this.writeUint8(1);
            this[method](value);
        }
    }

    readCommand() {
        return this.readUint8();
    }

    /**
     * 
     * @param {Number} command Number in [0-255] range specifying a command variant for backend
     */
    writeCommand(command) {
        this._increment();
        this.writeUint8(command);
        this._dirty = true;
    }

    readOperator() {
        return this.readUint8();
    }

    writeOperator(operator) {
        this.writeUint8(operator);
    }

    writeVector32(vector) {
        this.writeFloat32(vector.x);
        this.writeFloat32(vector.y);
        this.writeFloat32(vector.z);
        if (vector.w !== undefined) {
            this.writeFloat32(vector.w);
        }
    }

    readFloat32() {
        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && this._isOutsideBounds(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.FLOAT32_SIZE)) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.warnOnce('Commands Buffer: Aborting read outside buffer bounds.');
            return 0;
        }
        const value = this._view.getFloat32(this._bytesOffset);
        _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(value, `Got invalid value from buffer: ${ value }`);
        this._bytesOffset += _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.FLOAT32_SIZE;
        return value;
    }

    /**
     * 
     * @param {Number} value 
     */
    writeFloat32(value, offset) {
        if (!this._canWrite(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.FLOAT32_SIZE)) return;
        _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(value, `Trying to write invalid value to buffer: ${ value }`);
        if (offset == null) {
            this._view.setFloat32(this._bytesOffset, value);
            this._bytesOffset += _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.FLOAT32_SIZE;
        } else {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.assert(this._buffer.byteLength >= (offset + _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.FLOAT32_SIZE), 'Trying to write outside of buffer bounds.');
            this._view.setFloat32(offset, value);
        }
    }

    readUint8() {
        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && this._isOutsideBounds(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT8_SIZE)) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.warnOnce('Commands Buffer: Aborting read outside buffer bounds.');
            return 0;
        }
        const value = this._view.getUint8(this._bytesOffset);
        _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkUint(value, `Got invalid value from buffer: ${ value }`);
        this._bytesOffset += _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT8_SIZE;
        return value;
    }

    /**
     * 
     * @param {Number} value 
     */
    writeUint8(value, offset) {
        if (!this._canWrite(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT8_SIZE)) return;
        _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkUint(value, `Trying to write invalid value to buffer: ${ value }`);
        if (offset == null) {
            this._view.setUint8(this._bytesOffset, value);
            this._bytesOffset += _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT8_SIZE;
        } else {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.assert(this._buffer.byteLength >= (offset + _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT8_SIZE), 'Trying to write outside of buffer bounds.');
            this._view.setUint8(offset, value);
        }
    }

    readUint16() {
        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && this._isOutsideBounds(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT16_SIZE)) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.warnOnce('Commands Buffer: Aborting read outside buffer bounds.');
            return 0;
        }
        const value = this._view.getUint16(this._bytesOffset);
        _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkUint(value, `Got invalid value from buffer: ${ value }`);
        this._bytesOffset += _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT16_SIZE;
        return value;
    }

    /**
     * 
     * @param {Number} value 
     */
    writeUint16(value, offset) {
        if (!this._canWrite(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT16_SIZE)) return;
        _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkUint(value, `Trying to write invalid value to buffer: ${ value }`);
        if (offset == null) {
            this._view.setUint16(this._bytesOffset, value);
            this._bytesOffset += _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT16_SIZE;
        } else {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.assert(this._buffer.byteLength >= (offset + _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT16_SIZE), 'Trying to write outside of buffer bounds.');
            this._view.setUint16(offset, value);
        }
    }

    readUint32() {
        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && this._isOutsideBounds(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT32_SIZE)) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.warnOnce('Commands Buffer: Aborting read outside buffer bounds.');
            return 0;
        }
        const value = this._view.getUint32(this._bytesOffset);
        _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkUint(value, `Got invalid value from buffer: ${ value }`);
        this._bytesOffset += _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT32_SIZE;
        return value;
    }

    writeUint32(value, offset) {
        _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkUint(value, `Trying to write invalid value to buffer: ${ value }`);
        if (offset == null) {
            if (!this._canWrite(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT32_SIZE)) return;
            this._view.setUint32(this._bytesOffset, value);
            this._bytesOffset += _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT32_SIZE;
        } else {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.assert(this._buffer.byteLength >= (offset + _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT32_SIZE), 'Trying to write outside of buffer bounds.');
            this._view.setUint32(offset, value);
        }
    }

    readInt32() {
        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && this._isOutsideBounds(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.INT32_SIZE)) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.warnOnce('Commands Buffer: Aborting read outside buffer bounds.');
            return null;
        }
        const value = this._view.getInt32(this._bytesOffset);
        _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkInt(value, `Got invalid value from buffer: ${ value }`);
        this._bytesOffset += _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.INT32_SIZE;
        return value;
    }

    writeInt32(value, offset) {
        _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkInt(value, `Trying to write invalid value to buffer: ${ value }`);
        if (offset == null) {
            if (!this._canWrite(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.INT32_SIZE)) return;
            this._view.setInt32(this._bytesOffset, value);
            this._bytesOffset += _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.INT32_SIZE;
        } else {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.assert(this._buffer.byteLength >= (offset + _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.INT32_SIZE), 'Trying to write outside of buffer bounds.');
            this._view.setInt32(offset, value);
        }
    }    

    readBool() {
        return this.readUint8() ? true : false;
    }

    /**
     * 
     * @param {Boolean} value 
     */
    writeBool(value) {
        this.writeUint8(value ? 1 : 0);
    }

    writePlane(plane) {
        this.writeVector32(plane.normal);
        this.writeFloat32(plane.distance);
    }

    addBuffer(buffer) {
        this._meshBuffers.push(buffer);
    }

    skip(bytes, size) {
        this._bytesOffset += (bytes * size);
    }

    reset() {
        this._commandsCount = 0;
        this._bytesOffset = _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT16_SIZE;
        this._dirty = false;
    }

    destroy() {
        this._view = null;
        this._buffer = null;
    }

    _increment() {
        this._view.setUint16(0, ++this._commandsCount);
    }

    _canWrite(increment) {
        if (this._isOutsideBounds(increment)) {
            if (this._allowGrowth) {
                this._resize();
            } else {
                _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.warnOnce('Commands Buffer: reached capacity limits. Not allowed to grow.' +
                    ' Consider using "allowCommandsBufferResize" option or allocate a larger buffer' +
                    ' using "commandsBufferSize". Current buffer' +
                    ' size (bytes):', this._buffer.byteLength);
                return false;
            }
        }

        return true;
    }

    _resize(increment) {
        const old = this._buffer;
        const currentSize = old.byteLength;
        const addendum = increment ? increment : currentSize * 0.5;
        const buffer = new old.constructor(currentSize + addendum);

        new Uint8Array(buffer).set(new Uint8Array(old));

        this._buffer = buffer;
        this._view = new DataView(buffer);
    }

    _isOutsideBounds(increment) {
        if ((this._bytesOffset + increment) > this._buffer.byteLength) {
            return true;
        }
        return false;
    }
}



/***/ }),

/***/ "./src/backends/jolt/motion-state.mjs":
/*!********************************************!*\
  !*** ./src/backends/jolt/motion-state.mjs ***!
  \********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MotionState: () => (/* binding */ MotionState)
/* harmony export */ });
/* harmony import */ var _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../physics/debug.mjs */ "./src/physics/debug.mjs");


const v1 = { x: 0, y: 0, z: 0 };
const q1 = { x: 0, y: 0, z: 0, w: 1 };
const q2 = { x: 0, y: 0, z: 0, w: 1 };

class MotionState {
    constructor(body) {
        this._body = body;

        this._updatePosition(body);
        this._updateRotation(body);
    }

    compute(alpha, stepped) {
        const body = this._body;
        const position = this._position;
        const op = this._oldPos;
        const cp = this._currentPos;
        
        try {
            if (stepped) {
                const bp = body.GetPosition();
                op.x = cp.x; op.y = cp.y; op.z = cp.z;
                cp.x = bp.GetX(); cp.y = bp.GetY(); cp.z = bp.GetZ();
            }

            v1.x = cp.x * alpha;
            v1.y = cp.y * alpha;
            v1.z = cp.z * alpha;

            position.x = v1.x;
            position.y = v1.y;
            position.z = v1.z;

            v1.x = op.x * (1 - alpha);
            v1.y = op.y * (1 - alpha);
            v1.z = op.z * (1 - alpha);

            position.x += v1.x;
            position.y += v1.y;
            position.z += v1.z;

            if (!body.isCharacter) {
                const r = this._rotation;
                const cr = this._currentRot;
                const or = this._oldRot;

                if (stepped) {
                    const br = body.GetRotation();
                    or.x = cr.x; or.y = cr.y; or.z = cr.z; or.w = cr.w;
                    cr.x = br.GetX(); cr.y = br.GetY(); cr.z = br.GetZ(); cr.w = br.GetW();
                }

                let q2x = cr.x;
                let q2y = cr.y;
                let q2z = cr.z;
                let q2w = cr.w;

                let dot = r.x * q2x + r.y * q2y + r.z * q2z + r.w * q2w;
                if (dot < 0) {
                    q2x = -q2x;
                    q2y = -q2y;
                    q2z = -q2z;
                    q2w = -q2w;
                    dot = -dot;
                }

                const theta = Math.acos(dot);
                if (theta > 0.0001) {
                    const invst = 1 / Math.sin(theta);
                    const c0 = Math.sin((1 - alpha) * theta) * invst;
                    const c1 = Math.sin(alpha * theta) * invst;
                    r.x = c0 * or.x + c1 * q2x;
                    r.y = c0 * or.y + c1 * q2y;
                    r.z = c0 * or.z + c1 * q2z;
                    r.w = c0 * or.w + c1 * q2w;
                } else {
                    r.x = r.x;
                    r.y = r.y;
                    r.z = r.z;
                    r.w = r.w;
                }
            }
        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.error(e);
            return false;
        }

        return true;
    }

    get position() {
        return this._position;
    }

    get rotation() {
        return this._rotation;
    }

    _updatePosition(body) {
        const bodyPos = body.GetPosition();
        const p = { x: bodyPos.GetX(), y: bodyPos.GetY(), z: bodyPos.GetZ() };

        this._position = p;
        this._currentPos = { x: p.x, y: p.y, z: p.z };
        this._oldPos = { x: p.x, y: p.y, z: p.z };
    }

    _updateRotation(body) {
        const bodyRot = body.GetRotation();
        const r = { x: bodyRot.GetX(), y: bodyRot.GetY(), z: bodyRot.GetZ(), w: bodyRot.GetW() };

        this._rotation = r;
        this._currentRot = { x: r.x, y: r.y, z: r.z, w: r.w };
        this._oldRot = { x: r.x, y: r.y, z: r.z, w: r.w };
    }
}



/***/ }),

/***/ "./src/backends/jolt/operators/cleaner.mjs":
/*!*************************************************!*\
  !*** ./src/backends/jolt/operators/cleaner.mjs ***!
  \*************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Cleaner: () => (/* binding */ Cleaner)
/* harmony export */ });
/* harmony import */ var _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../physics/components/jolt/constants.mjs */ "./src/physics/components/jolt/constants.mjs");
/* harmony import */ var _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../physics/debug.mjs */ "./src/physics/debug.mjs");



class Cleaner {
    constructor(backend) {
        this._backend = backend;
    }

    clean() {
        const cb = this._backend.inBuffer;
        const command = cb.readCommand();
        let ok = true;

        switch (command) {
            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_DESTROY_BODY:
                ok = this._destroyBody(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_DESTROY_SHAPE:
                ok = this._destroyShape(cb);
                break;
        }

        return ok;
    }

    destroy() {
        this._backend = null;
    }

    _destroyBody(cb) {
        const index = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        const backend = this._backend;
        const tracker = backend.tracker;
        const bodyInterface = backend.bodyInterface;
        const physicsSystem = backend.physicsSystem;

        const body = tracker.getBodyByPCID(index);

        if (!body) {
            // Body could have been destroyed already. For example:
            // Disable parent, then manually disable child. The body
            // would get destroyed when parent was disabled. The
            // command for destroy would be issued again, when child is
            // disabled.
            return true;
        }

        if (body.debugDrawData) {
            Jolt.destroy(body.triContext);
            body.triContext = null;
            body.debugDrawData = null;
        }

        tracker.stopTrackingBody(body);

        if (body.motionState) {
            body.motionState = null;
        }

        const constraints = body.constraints;
        if (constraints) {
            const constraintMap = tracker.constraintMap;
            for (let i = 0, end = constraints.length; i < end; i++) {
                const index = constraints[i];
                const data = constraintMap.get(index);
                const constraint = data.constraint;
                const listener = constraint.listener; // vehicle
                
                constraintMap.delete(index);
                if (listener && Jolt.getPointer(listener) !== 0) {
                    physicsSystem.RemoveStepListener(listener);
                    Jolt.destroy(listener);
                    constraint.listener = null;
                }
                if (Jolt.getPointer(constraint) !== 0) {
                    physicsSystem.RemoveConstraint(constraint);
                }
            }
            body.constraints = null;

            body.linked?.forEach(linkedBody => {
                if (Jolt.getPointer(linkedBody) !== 0) {
                    bodyInterface.ActivateBody(linkedBody.GetID());
                }
                linkedBody.linked.delete(body);
            });
            body.linked = null;
        }

        const id = body.GetID();
        bodyInterface.RemoveBody(id);
        bodyInterface.DestroyBody(id);

        return true;
    }

    _destroyShape(cb) {
        const tracker = this._backend.tracker;
        const shapeNumber = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        const shape = tracker.shapeMap.get(shapeNumber);

        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && !shape) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.warn('Trying to destroy a shape that has already been destroyed');
            return false;
        }

        Jolt.destroy(shape);

        tracker.shapeMap.delete(shapeNumber);

        return true;
    }
}



/***/ }),

/***/ "./src/backends/jolt/operators/creator.mjs":
/*!*************************************************!*\
  !*** ./src/backends/jolt/operators/creator.mjs ***!
  \*************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Creator: () => (/* binding */ Creator)
/* harmony export */ });
/* harmony import */ var _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../physics/components/jolt/constants.mjs */ "./src/physics/components/jolt/constants.mjs");
/* harmony import */ var _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../physics/debug.mjs */ "./src/physics/debug.mjs");
/* harmony import */ var _motion_state_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../motion-state.mjs */ "./src/backends/jolt/motion-state.mjs");




class Creator {
    constructor(backend) {
        this._backend = backend;

        this.createPhysicsSystem();

        this._joltVec3 = new Jolt.Vec3();
        this._joltVec3_2 = new Jolt.Vec3();
        this._joltQuat = new Jolt.Quat();
    }

    create(meshBuffers) {
        const cb = this._backend.inBuffer;
        const command = cb.readCommand();
        let ok = true;

        switch (command) {
            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_CREATE_BODY:
                ok = this._createBody(cb, meshBuffers);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_CREATE_SOFT_BODY:
                ok = this._createSoftBody(cb, meshBuffers);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_CREATE_GROUPS:
                ok = this._createGroups(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_CREATE_CONSTRAINT:
                ok = this._createConstraint(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_CREATE_CHAR:
                ok = this._createCharacter(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_CREATE_SHAPE:
                ok = this._createShape(cb, meshBuffers);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_CREATE_VEHICLE:
                ok = this._createVehicle(cb);
                break;

            default:
                _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(`Invalid command: ${ command }`);
                return false;
        }

        return ok;
    }

    createPhysicsSystem() {
        const backend = this._backend;
        const config = backend.config;
        const layerPairs = config.layerPairs;
        const layers = config.layers;
        const layersCount = layers.length;

        const objectFilter = new Jolt.ObjectLayerPairFilterTable(layersCount);
        for (let i = 0; i < layersCount; i++) {
            const pair = layerPairs[i];
            objectFilter.EnableCollision(pair[0], pair[1]);
        }

        const bpInterface = new Jolt.BroadPhaseLayerInterfaceTable(layersCount, layersCount);
        for (let i = 0; i < layersCount; i++) {
            const objLayer = layers[i];
            const bpLayer = new Jolt.BroadPhaseLayer(objLayer);
            bpInterface.MapObjectToBroadPhaseLayer(objLayer, bpLayer);
        }

        const settings = new Jolt.JoltSettings();
        settings.mObjectLayerPairFilter = objectFilter;
        settings.mBroadPhaseLayerInterface = bpInterface;
        settings.mObjectVsBroadPhaseLayerFilter = new Jolt.ObjectVsBroadPhaseLayerFilterTable(settings.mBroadPhaseLayerInterface, layersCount, settings.mObjectLayerPairFilter, layersCount);
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

    createShapeSettings(shape, ...attr) {
        switch (shape) {
            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_BOX:
                return new Jolt.BoxShapeSettings(attr[0] /* half extent */, attr[1] /* convex radius */);

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_SPHERE:
                return new Jolt.SphereShapeSettings(attr[0] /* radius */);

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_CAPSULE:
                return new Jolt.CapsuleShapeSettings(attr[0] /* half height */, attr[1] /* radius */);

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_CYLINDER:
                return new Jolt.CylinderShapeSettings(attr[0] /* half height */, attr[1] /* radius */, attr[2] /* convex radius */);

            default:
                _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.warnOnce(`Unrecognized shape: ${ shape }`);
                return null;
        }
    }

    destroy() {
        Jolt.destroy(this._joltVec3);
        Jolt.destroy(this._joltQuat);
    }

    // TODO
    // convert creation methods to static

    _createShape(cb, meshBuffers) {
        // shape number
        const num = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);

        const shapeSettings = this._createShapeSettings(cb, meshBuffers);
        if (!shapeSettings)
            return false;

        const shape = shapeSettings.Create().Get();

        this._backend.tracker.shapeMap.set(num, shape);

        return true;
    }

    _createBody(cb, meshBuffers) {
        const backend = this._backend;
        const jv = this._joltVec3;
        const jq = this._joltQuat;

        // ------------ SHAPE PROPS ----------------

        const shapeSettings = this._createShapeSettings(cb, meshBuffers);
        if (!shapeSettings) {
            return false;
        }
        
        const shape = shapeSettings.Create().Get();

        // ------------ BODY PROPS ----------------

        // PCID
        const index = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);

        // position
        jv.FromBuffer(cb);

        // rotation
        jq.FromBuffer(cb);

        // motion type
        const motionType = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);

        // use motion state
        const useMotionState = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);

        // object layer
        const layer = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT16);
        const objectLayer = backend.getBitValue(layer);
        const bodyCreationSettings = new Jolt.BodyCreationSettings(shape, jv, jq, motionType, objectLayer);

        bodyCreationSettings.mLinearVelocity = jv.FromBuffer(cb);
        bodyCreationSettings.mAngularVelocity = jv.FromBuffer(cb);
        bodyCreationSettings.mMaxLinearVelocity = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        bodyCreationSettings.mMaxAngularVelocity = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        bodyCreationSettings.mFriction = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        bodyCreationSettings.mRestitution = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        bodyCreationSettings.mLinearDamping = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        bodyCreationSettings.mAngularDamping = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        bodyCreationSettings.mGravityFactor = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        bodyCreationSettings.mInertiaMultiplier = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        bodyCreationSettings.mAllowedDOFs = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
        bodyCreationSettings.mAllowDynamicOrKinematic = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
        bodyCreationSettings.mIsSensor = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
        bodyCreationSettings.mMotionQuality = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
        bodyCreationSettings.mAllowSleeping = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
        
        // collision group
        const group = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32) : null;

        // collision sub group
        const subGroup = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32) : null;

        // debug draw
        const debugDraw = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL) : false;

        if (group !== null && subGroup !== null) {
            const table = backend.groupFilterTables[group];

            if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
                let ok = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkUint(group, `Invalid filter group: ${ group }`);
                ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkUint(subGroup, `Invalid filter group: ${ subGroup }`);
                ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert(!!table, `Trying to set a filter group that does not exist: ${ group }`);
                ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert((subGroup <= table?.maxIndex), `Trying to set sub group that is over the filter group table size: ${ subGroup }`);
                if (!ok) {
                    return false;
                }
            }

            const mCollisionGroup = bodyCreationSettings.mCollisionGroup;
            mCollisionGroup.SetGroupFilter(table);
            mCollisionGroup.SetGroupID(group);
            mCollisionGroup.SetSubGroupID(subGroup);
        }

        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
            let ok = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkUint(index, `invalid body index: ${ index }`);
            ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkUint(layer, `invalid object layer: ${ layer }`);
            ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkUint(motionType, `invalid motion type: ${ motionType }`);
            if (!ok) {
                return false;
            }
        }

        // override mass properties
        const selectedMethod = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
            const ok = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkUint(selectedMethod, `invalid mass override method: ${ selectedMethod }`);
            if (!ok) return false;
        }
        
        if (selectedMethod !== Jolt.EOverrideMassProperties_CalculateMassAndInertia) {
            bodyCreationSettings.mOverrideMassProperties = selectedMethod;

            const mass = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
                const ok = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkFloatPositive(mass, `invalid mass: ${ mass }`);
                if (!ok) return false;
            }
            bodyCreationSettings.mMassPropertiesOverride.mMass = mass;

            if (selectedMethod === Jolt.EOverrideMassProperties_MassAndInertiaProvided) {
                jv.FromBuffer(cb);
                jq.FromBuffer(cb);

                const m4 = Jolt.Mat44.sRotationTranslation(jq, jv);
                bodyCreationSettings.mMassPropertiesOverride.mInertia = m4;
                Jolt.destroy(m4);
            }
        }

        const bodyInterface = backend.bodyInterface;
        const body = bodyInterface.CreateBody(bodyCreationSettings);
        bodyInterface.AddBody(body.GetID(), Jolt.Activate);

        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
            body.debugDraw = debugDraw;
        }

        // Destroy shape settings after body is created:
        Jolt.destroy(shapeSettings);
        Jolt.destroy(bodyCreationSettings);

        if (backend.config.useMotionStates) {
            if (useMotionState && (motionType === Jolt.EMotionType_Dynamic || motionType === Jolt.EMotionType_Kinematic)) {
                body.motionState = new _motion_state_mjs__WEBPACK_IMPORTED_MODULE_2__.MotionState(body);
            }
        }

        backend.tracker.add(body, index);

        return true;
    }

    _createSoftBody(cb, meshBuffers) {
        const backend = this._backend;
        const jv = this._joltVec3;
        const jq = this._joltQuat;

        // ------------ SHAPE PROPS ----------------

        const shapeSettings = Creator.createSoftBodyShapeSettings(cb, meshBuffers);
        if (!shapeSettings) {
            return false;
        }
        
        // ------------ BODY PROPS ----------------

        // PCID
        const index = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
            let ok = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkUint(index, `invalid body index: ${ index }`);
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
        const group = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32) : null;

        // collision sub group
        const subGroup = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32) : null;

        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
            const mObjectLayer = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT16);
            const mNumIterations = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
            const mLinearDamping = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            const mMaxLinearVelocity = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            const mRestitution = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            const mFriction = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            const mPressure = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            const mGravityFactor = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            const mUpdatePosition = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
            const mMakeRotationIdentity = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
            const mAllowSleeping = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);

            bodyCreationSettings.mObjectLayer = mObjectLayer;
            // bodyCreationSettings.mNumIterations = mNumIterations;
            // bodyCreationSettings.mLinearDamping = mLinearDamping;
            // bodyCreationSettings.mMaxLinearVelocity = mMaxLinearVelocity;
            // bodyCreationSettings.mRestitution = mRestitution;
            // bodyCreationSettings.mFriction = mFriction;
            // bodyCreationSettings.mPressure = mPressure;
            // bodyCreationSettings.mGravityFactor = mGravityFactor;
            bodyCreationSettings.mUpdatePosition = mUpdatePosition;
            // bodyCreationSettings.mMakeRotationIdentity = mMakeRotationIdentity;
            // bodyCreationSettings.mAllowSleeping = mAllowSleeping;
        } else {
            bodyCreationSettings.mObjectLayer = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT16);
            bodyCreationSettings.mNumIterations = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
            bodyCreationSettings.mLinearDamping = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            bodyCreationSettings.mMaxLinearVelocity = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            bodyCreationSettings.mRestitution = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            bodyCreationSettings.mFriction = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            bodyCreationSettings.mPressure = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            bodyCreationSettings.mGravityFactor = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            bodyCreationSettings.mUpdatePosition = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
            bodyCreationSettings.mMakeRotationIdentity = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
            bodyCreationSettings.mAllowSleeping = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
        }
        
        // debug draw
        const debugDraw = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL) : false;

        if (group !== null && subGroup !== null) {
            const table = backend.groupFilterTables[group];

            if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
                let ok = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkUint(group, `Invalid filter group: ${ group }`);
                ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkUint(subGroup, `Invalid filter group: ${ subGroup }`);
                ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert(!!table, `Trying to set a filter group that does not exist: ${ group }`);
                ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert((subGroup <= table?.maxIndex), `Trying to set sub group that is over the filter group table size: ${ subGroup }`);
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
        bodyInterface.AddBody(body.GetID(), Jolt.Activate);

        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
            body.debugDraw = debugDraw;
        }

        // Destroy shape settings after body is created:
        Jolt.destroy(bodyCreationSettings);

        backend.tracker.add(body, index);

        return true;
    }

    _createVehicle(cb) {
        const backend = this._backend;
        const tracker = backend.tracker;
        const physicsSystem = backend.physicsSystem;
        const jv = this._joltVec3;
        const index = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        const type = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
        const isWheeled = type === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.VEHICLE_TYPE_WHEEL || type === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.VEHICLE_TYPE_MOTORCYCLE;

        try {
            const destroySettings = (list) => {
                for (let i = 0; i < list.length; i++) {
                    Jolt.destroy(list[i]);
                }
            };

            const updateCurve = (curve) => {
                curve.Clear();
                const count = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
                for (let i = 0; i < count; i++) {
                    curve.AddPoint(
                        cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32),
                        cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32)
                    );
                }
            };

            const updateGears = (gears) => {
                const count = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
                gears.clear();
                for (let i = 0; i < count; i++) {
                    gears.push_back(cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32));
                }
            }

            const updateWheel = (wheel) => {
                wheel.mPosition = jv.FromBuffer(cb);
                wheel.mSuspensionForcePoint = jv.FromBuffer(cb);
                wheel.mSuspensionDirection = jv.FromBuffer(cb);
                wheel.mSteeringAxis = jv.FromBuffer(cb);
                wheel.mWheelUp = jv.FromBuffer(cb);
                wheel.mWheelForward = jv.FromBuffer(cb);
                wheel.mSuspensionMinLength = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                wheel.mSuspensionMaxLength = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                wheel.mSuspensionPreloadLength = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                wheel.mRadius = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                wheel.mWidth = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                wheel.mEnableSuspensionForcePoint = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);

                const spring = wheel.mSuspensionSpring;
                spring.mMode = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
                spring.mFrequency = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                spring.mStiffness = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                spring.mDamping = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);

                // longitudinal friction
                if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL)) {
                    updateCurve(wheel.mLongitudinalFriction);
                }

                // lateral friction
                if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL)) {
                    updateCurve(wheel.mLateralFriction);
                }                    

                if (isWheeled) {
                    wheel.mInertia = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                    wheel.mAngularDamping = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                    wheel.mMaxSteerAngle = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                    wheel.mMaxBrakeTorque = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                    wheel.mMaxHandBrakeTorque = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                }
            }

            // general
            const constraintSettings = new Jolt.VehicleConstraintSettings();
            constraintSettings.mNumVelocityStepsOverride = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT16);
            constraintSettings.mNumPositionStepsOverride = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT16);
            constraintSettings.mUp = jv.FromBuffer(cb);
            constraintSettings.mForward = jv.FromBuffer(cb);
            constraintSettings.mMaxPitchRollAngle = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);

            // controller
            let controllerSettings;
            if (isWheeled) {
                controllerSettings = type === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.VEHICLE_TYPE_WHEEL ?
                    new Jolt.WheeledVehicleControllerSettings() :
                    new Jolt.MotorcycleControllerSettings()
            } else {
                constraintSettings = new Jolt.TrackedVehicleControllerSettings();
            }

            // engine
            const engine = controllerSettings.mEngine;
            engine.mMaxTorque = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            engine.mMinRPM = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            engine.mMaxRPM = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            engine.mInertia = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            engine.mAngularDamping = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);

            if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL)) {
                updateCurve(engine.mNormalizedTorque);
            }

            // transmission
            const transmission = controllerSettings.mTransmission;
            transmission.mMode = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
            transmission.mSwitchTime = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            transmission.mClutchReleaseTime = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            transmission.mSwitchLatency = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            transmission.mShiftUpRPM = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            transmission.mShiftDownRPM = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            transmission.mClutchStrength = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            updateGears(transmission.mGearRatios);
            updateGears(transmission.mReverseGearRatios);
    
            // wheels
            const wheelsCount = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
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
                const tracksCount = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
                for (let t = 0; t < tracksCount; t++) {
                    const track = controllerSettings.get_mTracks(t);
                    const twc = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32); // track wheels count

                    // Make the last wheel in the track to be a driven wheel (connected to engine)
                    track.mDrivenWheel = twc - 1;

                    for (let i = 0; i < twc; i++) {
                        track.mWheels.push_back(cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32));
                    }
                }
            }

            const diffs = [];
            if (isWheeled) {
                // differentials
                const count = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
                if (count > 0) {
                    const differentials = controllerSettings.mDifferentials;

                    for (let i = 0; i < count; i++) {
                        const settings = new Jolt.VehicleDifferentialSettings();

                        settings.mLeftWheel = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_INT32);
                        settings.mRightWheel = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_INT32);
                        settings.mDifferentialRatio = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                        settings.mLeftRightSplit = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                        settings.mLimitedSlipRatio = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                        settings.mEngineTorqueRatio = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);

                        diffs.push(settings);
                        differentials.push_back(settings);
                    }
                }

                controllerSettings.mDifferentialLimitedSlipRatio = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);

                if (type === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.VEHICLE_TYPE_MOTORCYCLE) {
                    controllerSettings.mMaxLeanAngle = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                    controllerSettings.mLeanSpringConstant = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                    controllerSettings.mLeanSpringDamping = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                    controllerSettings.mLeanSpringIntegrationCoefficient = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                    controllerSettings.mLeanSpringIntegrationCoefficientDecay = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                    controllerSettings.mLeanSmoothingFactor = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                }
            }

            // anti roll bars
            const barsCount = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
            const mAntiRollBars = constraintSettings.mAntiRollBars;
            const bars = [];
            for (let i = 0; i < barsCount; i++) {
                const bar = new Jolt.VehicleAntiRollBar();

                bar.mLeftWheel = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
                bar.mRightWheel = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
                bar.mStiffness = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);

                bars.push(bar);
                mAntiRollBars.push_back(bar);
            }

            constraintSettings.mController = controllerSettings;

            // constraint
            const body = tracker.getBodyByPCID(index);
            const constraint = new Jolt.VehicleConstraint(body, constraintSettings);
            const castType = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
            const layer = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);

            // For backend to write wheels isometry
            body.isVehicle = true;

            // wheels contact tester
            let tester;
            switch (castType) {
                case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.VEHICLE_CAST_TYPE_RAY: {
                    jv.FromBuffer(cb);
                    const maxAngle = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                    tester = new Jolt.VehicleCollisionTesterRay(layer, jv, maxAngle);
                    break;
                }
                case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.VEHICLE_CAST_TYPE_SPHERE: {
                    jv.FromBuffer(cb);
                    const maxAngle = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                    const radius = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                    tester = new Jolt.VehicleCollisionTesterCastSphere(layer, radius, jv, maxAngle);
                    break;
                }
                case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.VEHICLE_CAST_TYPE_CYLINDER: {
                    const fraction = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                    tester = new Jolt.VehicleCollisionTesterCastCylinder(layer, fraction);
                    break;
                }
                default:
                    _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(`Unrecognized cast type: ${ castType }`);
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
                Controller = type === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.VEHICLE_TYPE_WHEEL ? 
                    Jolt.WheeledVehicleController : 
                    Jolt.MotorcycleController;
            } else {
                Controller = Jolt.TrackedVehicleController;
            }
            constraint.controller = Jolt.castObject(constraint.GetController(), Controller);
            constraint.wheelsCount = wheelsCount;

            tracker.addConstraint(index, constraint, body);

            destroySettings(diffs);
            destroySettings(bars);

        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(e);
            return false;
        }

        return true;
    }

    _createGroups(cb) {
        const backend = this._backend;
        const groupsCount = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
            let ok = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkUint(groupsCount, `Invalid filter groups count: ${ groupsCount }`);
            ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert(groupsCount > 0, `Invalid filter groups count: ${ groupsCount }`);
            if (!ok)
                return false
        }
        
        for (let i = 0; i < groupsCount; i++) {
            const subGroupsCount = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32)
            const table = new Jolt.GroupFilterTable(subGroupsCount);
            backend.groupFilterTables.push(table);

            if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
                const ok = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkUint(subGroupsCount, `Invalid sub group count: ${ subGroupsCount }`);
                if (!ok)
                    return false;
                table.maxIndex = subGroupsCount - 1; // for debug test in debug mode when creating a body
            }
        }

        return true;
    }

    _createShapeSettings(cb, meshBuffers) {
        const jv = this._joltVec3;
        const jq = this._joltQuat;
        const shapeType = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);

        // scale
        const useScale = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
        let sx, sy, sz
        if (useScale) {
            sx = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            sy = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            sz = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            
            if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
                let ok = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkFloat(sx, `Invalid scale X: ${ sx }`);
                ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkFloat(sy, `Invalid scale Y: ${ sy }`);
                ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkFloat(sz, `Invalid scale Z: ${ sz }`);
                if (!ok) {
                    return null;
                }
            }
        }

        let settings, hh, r, cr;
        switch (shapeType) {
            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_BOX:
                jv.FromBuffer(cb, true);
                cr = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
                    const ok = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkFloatPositive(cr, `invalid convex radius: ${ cr }`);
                    if (!ok) {
                        return null;
                    }
                }
                settings = this.createShapeSettings(shapeType, jv, cr);
                break;
            
            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_CAPSULE:
                hh = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                r = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
                    let ok = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkFloatPositive(hh, `invalid half height: ${ hh }`);
                    ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkFloatPositive(r, `invalid radius: ${ r }`);
                    if (useScale) {
                        ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert((sx === sy) && (sy === sz), `Capsule shape scale must be uniform: ${ sx }, ${ sy }, ${ sz }`);
                    }
                    if (!ok) {
                        return null;
                    }
                }
                settings = this.createShapeSettings(shapeType, hh, r);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_CYLINDER:
                hh = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                r = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                cr = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
                    let ok = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkFloatPositive(hh, `invalid half height: ${ hh }`);
                    ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkFloatPositive(r, `invalid radius: ${ r }`);
                    ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkFloatPositive(cr, `invalid convex radius: ${ cr }`);
                    if (useScale) {
                        ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert(sx === sz, `Cylinder shape scale must be uniform in XZ plane: ${ sx }, ${ sz }`);
                    }
                    if (!ok) {
                        return null;
                    }
                }
                settings = this.createShapeSettings(shapeType, hh, r, cr);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_SPHERE:
                r = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
                    let ok = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkFloatPositive(r, `invalid radius: ${ r }`);
                    if (useScale) {
                        ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert((sx === sy) && (sy === sz), `Sphere shape scale must be uniform: ${ sx }, ${ sy }, ${ sz }`);
                    }
                    if (!ok) {
                        return null;
                    }
                }
                settings = this.createShapeSettings(shapeType, r);
                break;

            // intentional fall-through
            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_MESH:
            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_CONVEX_HULL:
                settings = Creator.createMeshShapeSettings(cb, meshBuffers, shapeType);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_STATIC_COMPOUND:
                settings = this._createStaticCompoundShapeSettings(cb, meshBuffers);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_HEIGHTFIELD:
                settings = this._createHeightFieldSettings(cb, meshBuffers);
                break;

            default:
                _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.warn('Invalid shape type', shapeType);
                return null;
        }

        if (!settings) {
            return null;
        }

        if (shapeType === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_STATIC_COMPOUND) {
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
        
        const isCompoundChild = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
        if (!isCompoundChild) {
            const density = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
                const ok = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkFloatPositive(density, `Invalid density value: ${ density }`);
                if (!ok)
                    return null;
            }
            settings.mDensity = density;
        }

        // shape offset
        if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL)) {
            jv.FromBuffer(cb);
            jq.FromBuffer(cb);

            settings = new Jolt.RotatedTranslatedShapeSettings(jv, jq, settings);
        }

        // center of mass offset
        if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL)) {
            jv.FromBuffer(cb);

            settings = new Jolt.OffsetCenterOfMassShapeSettings(jv, settings);
        }

        if (useScale) {
            jv.Set(sx, sy, sz);
            settings = new Jolt.ScaledShapeSettings(settings, jv);
        }

        return settings;
    } 

    _createStaticCompoundShapeSettings(cb, meshBuffers) {
        const childrenCount = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        const children = [];

        for (let i = 0; i < childrenCount; i++) {
            const settings = this._createShapeSettings(cb, meshBuffers);
            if (!settings) return null;

            const pos = {};
            const rot = {};
            
            cb.readVec(pos);
            cb.readQuat(rot);

            if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
                let ok = true;
                ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkVec(pos, `Invalid static compound child position vector`);
                ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkQuat(rot, `Invalid static compound child quaternion`);
                return null;
            }

            children.push(settings, pos, rot);
        }

        return children;
    }

    _createHeightFieldSettings(cb, meshBuffers) {
        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
            let ok = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert(!!meshBuffers, `Missing buffers to generate a HeightField shape: ${ meshBuffers }`);
            ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert(meshBuffers.length > 0, `Invalid buffers to generate HeightField shape: ${ meshBuffers }`);
            if (!ok) {
                return null;
            }
        }

        const jv = this._joltVec3;
        const buffer = meshBuffers.shift();
        const samples = new Float32Array(buffer);
        const size = samples.length;

        const settings = new Jolt.HeightFieldShapeSettings();
        settings.mOffset = jv.FromBuffer(cb);
        settings.mScale = jv.FromBuffer(cb);
        settings.mSampleCount = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        settings.mBlockSize = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
        settings.mBitsPerSample = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
        settings.mActiveEdgeCosThresholdAngle = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        settings.mHeightSamples.resize(size);

        // Convert the height samples into a Float32Array
        const heightSamples = new Float32Array(Jolt.HEAPF32.buffer, Jolt.getPointer(settings.mHeightSamples.data()), size);

        for (let i = 0, end = heightSamples.length; i < end; i++) {
            const height = samples[i];
            heightSamples[i] = height >=0 ? height : Jolt.HeightFieldShapeConstantValues.prototype.cNoCollisionValue;
        }

        return settings;
    }

    _createConstraint(cb) {
        const jv = this._joltVec3;
        const backend = this._backend;
        const tracker = backend.tracker;
        const physicsSystem = backend.physicsSystem;

        const type = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
        const index = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        const idx1 = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        const idx2 = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);

        const body1 = tracker.getBodyByPCID(idx1);
        const body2 = tracker.getBodyByPCID(idx2);

        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
            let ok = true;
            ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert(!!body1, `Unable to locate body to add constraint to: ${ idx1 }`);
            ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert(!!body2, `Unable to locate body to add constraint to: ${ idx2 }`);
            if (!ok) return false;
        }

        // TODO
        // refactor to own methods

        let settings;
        switch (type) {
            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_TYPE_FIXED:
                settings = new Jolt.FixedConstraintSettings();
                if (cb.flag) settings.mAutoDetectPoint = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
                if (!settings.mAutoDetectPoint) {
                    if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
                    if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);
                }
                if (cb.flag) settings.mAxisX1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mAxisY1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mAxisX2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mAxisY2 = jv.FromBuffer(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_TYPE_POINT:
                settings = new Jolt.PointConstraintSettings();
                if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_TYPE_DISTANCE:
                settings = new Jolt.DistanceConstraintSettings();
                if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mMinDistance = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (cb.flag) settings.mMaxDistance = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL)) {
                    const springSettings = this._createSpringSettings(cb);
                    settings.mLimitsSpringSettings = springSettings;
                    Jolt.destroy(springSettings);
                }
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_TYPE_HINGE:
                settings = new Jolt.HingeConstraintSettings();
                if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mHingeAxis1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mNormalAxis1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mHingeAxis2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mNormalAxis2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mLimitsMin = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (cb.flag) settings.mLimitsMax = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (cb.flag) settings.mMaxFrictionTorque = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL)) {
                    const springSettings = this._createSpringSettings(cb);
                    settings.mLimitsSpringSettings = springSettings;
                    Jolt.destroy(springSettings);
                }
                if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL)) {
                    const motorSettings = this._createMotorSettings(cb);
                    settings.mMotorSettings = motorSettings;
                    Jolt.destroy(motorSettings);
                }
                break;
            
            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_TYPE_SLIDER:
                settings = new Jolt.SliderConstraintSettings();
                if (cb.flag) settings.mAutoDetectPoint = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
                if (!settings.mAutoDetectPoint) {
                    if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
                    if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);
                }
                if (cb.flag) settings.mSliderAxis1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mNormalAxis1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mSliderAxis2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mNormalAxis2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mLimitsMin = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (cb.flag) settings.mLimitsMax = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (cb.flag) settings.mMaxFrictionForce = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL)) {
                    const springSettings = this._createSpringSettings(cb);
                    settings.mLimitsSpringSettings = springSettings;
                    Jolt.destroy(springSettings);
                }
                if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL)) {
                    const motorSettings = this._createMotorSettings(cb);
                    settings.mMotorSettings = motorSettings;
                    Jolt.destroy(motorSettings);
                }
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_TYPE_CONE:
                settings = new Jolt.ConeConstraintSettings();
                if (cb.flag) settings.mPoint1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mTwistAxis1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mPoint2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mTwistAxis2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mHalfConeAngle = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_TYPE_SWING_TWIST:
                settings = new Jolt.SwingTwistConstraintSettings();
                if (cb.flag) settings.mPosition1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mTwistAxis1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mPlaneAxis1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mPosition2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mTwistAxis2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mPlaneAxis2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mNormalHalfConeAngle = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (cb.flag) settings.mPlaneHalfConeAngle = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (cb.flag) settings.mTwistMinAngle = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (cb.flag) settings.mTwistMaxAngle = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (cb.flag) settings.mMaxFrictionTorque = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL)) {
                    const swingMotorSettings = this._createMotorSettings(cb);
                    settings.mSwingMotorSettings = swingMotorSettings;
                    Jolt.destroy(swingMotorSettings);
                }
                if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL)) {
                    const twistMotorSettings = this._createMotorSettings(cb);
                    settings.mTwistMotorSettings = twistMotorSettings;
                    Jolt.destroy(twistMotorSettings);
                }
                break;
            
            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_TYPE_SIX_DOF:
                settings = new Jolt.SixDOFConstraintSettings();
                if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8)) {
                    const count = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
                    for (let i = 0; i < count; i++) {
                        const axis = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);

                        switch (axis) {
                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_TRANSLATION_X:
                                settings.MakeFreeAxis(Jolt.SixDOFConstraintSettings_EAxis_TranslationX);
                                break;

                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_TRANSLATION_Y:
                                settings.MakeFreeAxis(Jolt.SixDOFConstraintSettings_EAxis_TranslationY);
                                break;
                            
                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_TRANSLATION_Z:
                                settings.MakeFreeAxis(Jolt.SixDOFConstraintSettings_EAxis_TranslationZ);
                                break;

                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_ROTATION_X:
                                settings.MakeFreeAxis(Jolt.SixDOFConstraintSettings_EAxis_RotationX);
                                break;
                            
                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_ROTATION_Y:
                                settings.MakeFreeAxis(Jolt.SixDOFConstraintSettings_EAxis_RotationY);
                                break;

                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_ROTATION_Z:
                                settings.MakeFreeAxis(Jolt.SixDOFConstraintSettings_EAxis_RotationZ);
                                break;
                            
                            default:
                                _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(`Unrecognized six dof constraint axis setting: ${ axis }`);
                                return false;
                        }
                    }
                }
                if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8)) {
                    const count = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
                    for (let i = 0; i < count; i++) {
                        const axis = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);

                        switch (axis) {
                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_TRANSLATION_X:
                                settings.MakeFixedAxis(Jolt.SixDOFConstraintSettings_EAxis_TranslationX);
                                break;

                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_TRANSLATION_Y:
                                settings.MakeFixedAxis(Jolt.SixDOFConstraintSettings_EAxis_TranslationY);
                                break;
                            
                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_TRANSLATION_Z:
                                settings.MakeFixedAxis(Jolt.SixDOFConstraintSettings_EAxis_TranslationZ);
                                break;

                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_ROTATION_X:
                                settings.MakeFixedAxis(Jolt.SixDOFConstraintSettings_EAxis_RotationX);
                                break;
                            
                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_ROTATION_Y:
                                settings.MakeFixedAxis(Jolt.SixDOFConstraintSettings_EAxis_RotationY);
                                break;

                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_ROTATION_Z:
                                settings.MakeFixedAxis(Jolt.SixDOFConstraintSettings_EAxis_RotationZ);
                                break;
                            
                            default:
                                _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(`Unrecognized six dof constraint axis setting: ${ axis }`);
                                return false;
                        }
                    }
                }
                if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8)) {
                    const count = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
                    for (let i = 0; i < count; i++) {
                        const axis = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
                        const min = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                        const max = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);

                        switch (axis) {
                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_TRANSLATION_X:
                                settings.SetLimitedAxis(Jolt.SixDOFConstraintSettings_EAxis_TranslationX, min, max);
                                break;

                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_TRANSLATION_Y:
                                settings.SetLimitedAxis(Jolt.SixDOFConstraintSettings_EAxis_TranslationY, min, max);
                                break;
                            
                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_TRANSLATION_Z:
                                settings.SetLimitedAxis(Jolt.SixDOFConstraintSettings_EAxis_TranslationZ, min, max);
                                break;

                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_ROTATION_X:
                                settings.SetLimitedAxis(Jolt.SixDOFConstraintSettings_EAxis_RotationX, min, max);
                                break;
                            
                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_ROTATION_Y:
                                settings.SetLimitedAxis(Jolt.SixDOFConstraintSettings_EAxis_RotationY, min, max);
                                break;

                            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SIX_DOF_ROTATION_Z:
                                settings.SetLimitedAxis(Jolt.SixDOFConstraintSettings_EAxis_RotationZ, min, max);
                                break;
                            
                            default:
                                _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(`Unrecognized six dof constraint axis setting: ${ axis }`);
                                return false;
                        }
                    }
                }                
                if (cb.flag) settings.mPosition1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mAxisX1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mAxisY1 = jv.FromBuffer(cb);
                if (cb.flag) settings.mPosition2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mAxisX2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mAxisY2 = jv.FromBuffer(cb);
                if (cb.flag) settings.mMaxFriction = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (cb.flag) settings.mLimitMin = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (cb.flag) settings.mLimitMax = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL)) {
                    const springSettings = this._createSpringSettings(cb);
                    settings.mLimitsSpringSettings = springSettings;
                    Jolt.destroy(springSettings);
                }
                if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL)) {
                    const motorSettings = this._createMotorSettings(cb);
                    settings.mMotorSettings = motorSettings;
                    Jolt.destroy(motorSettings);
                }
                break;

            default:
                _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(`Unrecognized constraint type: ${ type }`);
                return false;
        }

        if (cb.flag) settings.mNumVelocityStepsOverride = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
        if (cb.flag) settings.mNumPositionStepsOverride = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
        if (cb.flag) {
            const space = (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8) === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONSTRAINT_SPACE_WORLD) ? Jolt.EConstraintSpace_WorldSpace : Jolt.EConstraintSpace_LocalToBodyCOM;
            settings.mSpace = space;
        }

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

        body1.linked.add(body2);
        body2.linked.add(body1);

        tracker.addConstraint(index, constraint, body1, body2);

        physicsSystem.AddConstraint(constraint);
        
        return true;
    }

    _createSpringSettings(cb) {
        const springSettings = new Jolt.SpringSettings();
        const mode = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8) : _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SPRING_MODE_FREQUENCY;
        springSettings.mMode = (mode === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SPRING_MODE_FREQUENCY) ? 
            Jolt.ESpringMode_FrequencyAndDamping : Jolt.ESpringMode_StiffnessAndDamping;
        if (cb.flag) springSettings.mFrequency = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        if (cb.flag) springSettings.mStiffness = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        if (cb.flag) springSettings.mDamping = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        return springSettings;
    }

    _createMotorSettings(cb) {
        const motorSettings = new Jolt.MotorSettings();
        if (cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL)) {
            const springsSettings = this._createSpringSettings(cb);
            motorSettings.mSpringSettings = springsSettings;
            Jolt.destroy(springsSettings);
        }
        if (cb.flag) motorSettings.mMinForceLimit = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        if (cb.flag) motorSettings.mMaxForceLimit = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        if (cb.flag) motorSettings.mMinTorqueLimit = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        if (cb.flag) motorSettings.mMaxTorqueLimit = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);

        return motorSettings;
    }

    _createCharacter(cb) {
        const backend = this._backend;
        const listener = backend.listener;
        const charEvents = backend.config.charContactEventsEnabled;
        const jv = this._joltVec3;
        const jq = this._joltQuat;
        const settings = new Jolt.CharacterVirtualSettings();

        const shapeSettings = this._createShapeSettings(cb, null);
        if (!shapeSettings) {
            return false;
        }

        const shape = shapeSettings.Create().Get();
        
        settings.mShape = shape;

        const index = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        const useMotionState = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);

        jv.FromBuffer(cb);
        settings.mUp = jv;

        jv.FromBuffer(cb);
        const distance = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        const plane = new Jolt.Plane(jv, distance);
        settings.mSupportingVolume = plane;
        Jolt.destroy(plane);

        settings.mMaxSlopeAngle = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        settings.mMass = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        settings.mMaxStrength = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);

        jv.FromBuffer(cb);
        settings.mShapeOffset = jv;
        settings.mBackFaceMode = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
        settings.mPredictiveContactDistance = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        settings.mMaxCollisionIterations = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        settings.mMaxConstraintIterations = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        settings.mMinTimeRemaining = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        settings.mCollisionTolerance = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        settings.mCharacterPadding = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        settings.mMaxNumHits = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        settings.mHitReductionCosMaxAngle = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        settings.mPenetrationRecoverySpeed = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);

        jv.FromBuffer(cb);
        jq.FromBuffer(cb);

        if (charEvents && !listener.charListener) {
            listener.initCharacterEvents();
        }

        const character = new Jolt.CharacterVirtual(settings, jv, jq, backend.physicsSystem);

        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
            character.debugDraw = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
        }        

        if (backend.config.useMotionStates && useMotionState) {
            character.motionState = new _motion_state_mjs__WEBPACK_IMPORTED_MODULE_2__.MotionState(character);
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

    static createMeshShapeSettings(cb, meshBuffers, shapeType) {
        const {
            base, stride, numIndices, triCount, positions, indices
        } = Creator.readMeshBuffers(cb, meshBuffers);

        // TODO:
        // add support for duplicate vertices test

        const p = positions;
        let i1, i2, i3;
        let settings;

        if (shapeType === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_CONVEX_HULL) {
            const cache = new Set();
            const jv = this._joltVec3;

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
        } else if (shapeType === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_MESH) {
            const triangles = new Jolt.TriangleList();
    
            triangles.resize(triCount);
            
            let v1, v2, v3;
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

    static createSoftBodyShapeSettings(cb, meshBuffers) {
        // scale
        const useScale = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
        let sx = 1;
        let sy = 1;
        let sz = 1;
        if (useScale) {
            sx = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            sy = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            sz = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            
            if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
                let ok = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkFloat(sx, `Invalid scale X: ${ sx }`);
                ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkFloat(sy, `Invalid scale Y: ${ sy }`);
                ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkFloat(sz, `Invalid scale Z: ${ sz }`);
                if (!ok) {
                    return null;
                }
            }
        }

        const {
            base, stride, vertexCount, triCount, positions, indices
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

        const width = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        const length = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        const compliance = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
        const fixedCount = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
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
            const fixedIndex = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
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
        const base = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
        const offset = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        const stride = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
        const vertexCount = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        const numIndices = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        const idxLength = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        const idxOffset = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);

        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
            let ok = _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkUint(base, `Invalid buffer base to generate mesh/hull: ${ base }`);
            ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkUint(offset, `Invalid positions buffer offset to generate mesh/hull: ${ offset }`);
            ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkUint(stride, `Invalid positions buffer stride to generate mesh/hull: ${ stride }`);
            ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkUint(numIndices, `Invalid indices count to generate mesh/hull: ${ numIndices }`);
            ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert(!!meshBuffers, `No mesh buffers to generate a mesh/hull: ${ meshBuffers }`);
            ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert(meshBuffers.length > 1, `Invalid buffers to generate mesh/hull: ${ meshBuffers }`);
            if (!ok) {
                return null;
            }
        }

        const posBuffer = meshBuffers.shift();
        const idxBuffer = meshBuffers.shift();
        
        const positions = new Float32Array(posBuffer, offset); // vertex positions
        const arrayConstructor = numIndices > 65535 ? Uint32Array : Uint16Array;
        const indices = new arrayConstructor(idxBuffer, idxOffset, idxLength);
        const triCount = Math.floor(numIndices / 3);

        return { base, stride, vertexCount, numIndices, triCount, positions, indices };
    }
}





/***/ }),

/***/ "./src/backends/jolt/operators/drawer.mjs":
/*!************************************************!*\
  !*** ./src/backends/jolt/operators/drawer.mjs ***!
  \************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Drawer: () => (/* binding */ Drawer)
/* harmony export */ });
/* harmony import */ var _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../physics/components/jolt/constants.mjs */ "./src/physics/components/jolt/constants.mjs");
/* harmony import */ var _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../physics/debug.mjs */ "./src/physics/debug.mjs");



class Drawer {
    constructor() {
        this._joltAabb = Jolt.AABox.prototype.sBiggest();
        this._joltQuat = Jolt.Quat.prototype.sIdentity();
        this._scale = new Jolt.Vec3(1, 1, 1);
        this._data = [];
        this._buffers = [];
        this._contexts = [];
    }

    get data() {
        return this._data;
    }

    get buffers() {
        return this._buffers;
    }

    get dirty() {
        return this._data.length > 0;
    }

    write(tracker) {
        const debugBodies = tracker.debug;

        if (debugBodies.size === 0) {
            return true;
        }

        let ok = true;
        debugBodies.forEach(body => {
            ok = ok && this._writeShape(body, tracker);
        });

        return ok;
    }

    reset() {
        this._data.length = 0;
        this._buffers.length = 0;
    }

    destroy() {
        this.reset();

        Jolt.destroy(this._joltAabb);
        this._joltAabb = null;

        Jolt.destroy(this._joltQuat);
        this._joltQuat = null;

        Jolt.destroy(this._scale);
        this._scale = null;
    }

    _writeShape(body, tracker) {
        try {
            const motionType = body.isCharacter ? Jolt.EMotionType_Kinematic : body.GetMotionType();
            const isRigidBody = body.GetBodyType() === Jolt.EBodyType_RigidBody;

            const data = body.debugDrawData;
            if (data) {
                if (isRigidBody) {
                    const buffer = Jolt.HEAPF32.buffer;

                    this._data.push(...data, motionType, buffer);
                    this._buffers.push(buffer);

                    return true;
                } else {
                    // Soft body will have new vertex positions, so we need to create a new triContext
                    Jolt.destroy(body.triContext);
                    body.triContext = null;
                    body.debugDrawData = null;
                }
            }

            // TODO
            // don't send the heap, create and send a view instead
            // also, use backend's outBuffer.meshBuffers instead of local this._buffers

            const shape = body.GetShape();
            const index = tracker.getPCID(Jolt.getPointer(body));
            const triContext = new Jolt.ShapeGetTriangles(shape, Jolt.AABox.prototype.sBiggest(), shape.GetCenterOfMass(), Jolt.Quat.prototype.sIdentity(), this._scale);
            const byteOffset = triContext.GetVerticesData();
            const length = triContext.GetVerticesSize() / _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.FLOAT32_SIZE;
            const buffer = Jolt.HEAPF32.buffer;

            body.debugDrawData = [index, length, byteOffset];
            body.triContext = triContext;

            this._data.push(index, length, byteOffset, motionType, buffer);
            this._buffers.push(buffer);

        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(e);
            return false;
        }

        return true;
    }
}



/***/ }),

/***/ "./src/backends/jolt/operators/listener.mjs":
/*!**************************************************!*\
  !*** ./src/backends/jolt/operators/listener.mjs ***!
  \**************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Listener: () => (/* binding */ Listener)
/* harmony export */ });
/* harmony import */ var _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../physics/components/jolt/constants.mjs */ "./src/physics/components/jolt/constants.mjs");
/* harmony import */ var _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../physics/debug.mjs */ "./src/physics/debug.mjs");



class Listener {
    constructor(backend) {
        this._listener = null;
        this._charListener = null;

        this._backend = backend;

        this._contactsData = [0];
        this._contactsCache = new Set();

        this._charContactsData = new Map();
    }

    get dirty() {
        return (this._contactsData[0] > 0 || this._charContactsData[0] > 0);
    }

    get charListener() {
        return this._charListener;
    }

    // Contact Events

    onContactValidate(body1, body2, baseOffset, collideShapeResult) {
        return Jolt.ValidateResult_AcceptAllContactsForThisBodyPair;
    }

    initEvents(config) {
        const listener = new Jolt.ContactListenerJS();
        listener.OnContactValidate = this.onContactValidate.bind(this);
        
        if (config.contactAddedEventsEnabled) {
            listener.OnContactAdded = this.onContactAdded.bind(this);
        } else {
            listener.OnContactAdded = () => {};
        }

        if (config.contactPersistedEventsEnabled) {
            listener.OnContactPersisted = this.onContactPersisted.bind(this);
        } else {
            listener.OnContactPersisted = () => {};
        }

        if (config.contactRemovedEventsEnabled) {
            listener.OnContactRemoved = this.onContactRemoved.bind(this);
        } else {
            listener.OnContactRemoved = () => {};
        }

        this._backend.physicsSystem.SetContactListener(listener);

        this._listener = listener;
    }

    overrideContacts(listenerType, overrides) {
        if (listenerType === 'char' && !this._charListener) {
            this.initCharacterEvents();
        }

        const listener = listenerType === 'contacts' ? this._listener : this._charListener;

        for (const [method, funcStr] of Object.entries(overrides)) {
            listener[method] = eval('(' + funcStr + ')');
        }
    }

    onContactPersisted(b1Pointer, b2Pointer, manifoldPointer, settingsPointer) {
        this._wrapAndWrite(b1Pointer, b2Pointer, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONTACT_TYPE_PERSISTED, false);
    }

    onContactRemoved(subShapePairPointer) {
        const subShapePair = Jolt.wrapPointer(subShapePairPointer, Jolt.SubShapeIDPair);
        const bodyLockInterface = this._backend.physicsSystem.GetBodyLockInterface();

        let body1 = bodyLockInterface.TryGetBody(subShapePair.GetBody1ID());
        let body2 = bodyLockInterface.TryGetBody(subShapePair.GetBody2ID());

        // A body could have been destroyed by the time this closure is called.
        // Check if the body is still valid:
        if (Jolt.getPointer(body1) === 0) {
            body1 = null;
        }
        if (Jolt.getPointer(body2) === 0) {
            body2 = null;
        }

        this._writeContactPair(body1, body2, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONTACT_TYPE_REMOVED, true);
    }

    onContactAdded(b1Pointer, b2Pointer, manifoldPointer, settingsPointer) {
        const data = this._contactsData;
        const { contactPoints, contactPointsAveraged } = this._backend.config;
        const manifold = Jolt.wrapPointer(manifoldPointer, Jolt.ContactManifold);

        this._wrapAndWrite(b1Pointer, b2Pointer, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONTACT_TYPE_ADDED, true);

        const n = manifold.mWorldSpaceNormal;
        const d = manifold.mPenetrationDepth;

        data.push(n.GetX(), n.GetY(), n.GetZ(), d);

        if (contactPoints) {
            const jv = Jolt.Vec3.prototype.sZero();
            const offset = manifold.mBaseOffset;
            const points1 = manifold.mRelativeContactPointsOn1;
            const points2 = manifold.mRelativeContactPointsOn2;
            const count1 = points1.size();

            if (contactPointsAveraged) {
                for (let i = 0; i < count1; i++) {
                    jv.Add(points1.at(i));
                }
                jv.Mul(1 / count1);
                jv.Add(offset);
                data.push(jv.GetX(), jv.GetY(), jv.GetZ());
            } else {
                const count2 = points1.size();
                data.push(offset.GetX(), offset.GetY(), offset.GetZ(), count1, count2);
                for (let i = 0; i < count1; i++) {
                    const p = points1.at(i);
                    data.push(p.GetX(), p.GetY(), p.GetZ());
                }
                for (let i = 0; i < count2; i++) {
                    const p = points2.at(i);
                    data.push(p.GetX(), p.GetY(), p.GetZ());
                }
            }
        }
    }

    // Character contact events

    initCharacterEvents() {
        const listener = new Jolt.CharacterContactListenerJS();

        listener.OnAdjustBodyVelocity = () => {};

        listener.OnContactValidate = (character, bodyID2, subShapeID2) => {
            // allow all
            return true;
        };

        listener.OnContactAdded = () => {};

        listener.OnContactSolve = this.onCharContactSolve.bind(this);

        this._charListener = listener;
    }

    onCharContactSolve(character, bodyID2, subShapeID2, cp, cn, cv, contactMaterial, characterVelocity, nv) {
        character = Jolt.wrapPointer(character, Jolt.CharacterVirtual);
        cp = Jolt.wrapPointer(cp, Jolt.Vec3);
        cn = Jolt.wrapPointer(cn, Jolt.Vec3);
        cv = Jolt.wrapPointer(cv, Jolt.Vec3);
        nv = Jolt.wrapPointer(nv, Jolt.Vec3);

        const tracker = this._backend.tracker;
        const data = this._charContactsData;
        const index = tracker.getPCID(Jolt.getPointer(character));
        
        const bodyLockInterface = this._backend.physicsSystem.GetBodyLockInterface();

        let body2 = bodyLockInterface.TryGetBody(bodyID2);
        if (Jolt.getPointer(body2) === 0) {
            body2 = null;
        }

        let contacts = data.get(index);
        if (!contacts) {
            contacts = [0];
            data.set(index, contacts);
        }

        contacts[0] = ++contacts[0];

        contacts.push(!!body2);
        if (body2) {
            const index2 = tracker.getPCID(Jolt.getPointer(body2));
            contacts.push(index2);
        } else {
            contacts.push(null);
        }

        // contact position
        contacts.push(cp.GetX());
        contacts.push(cp.GetY());
        contacts.push(cp.GetZ());

        // contact normal
        contacts.push(cn.GetX());
        contacts.push(cn.GetY());
        contacts.push(cn.GetZ());

        // contact velocity
        contacts.push(cv.GetX());
        contacts.push(cv.GetY());
        contacts.push(cv.GetZ());

        // new character velocity
        contacts.push(nv.GetX());
        contacts.push(nv.GetY());
        contacts.push(nv.GetZ());
    }

    initVehicleEvents(constraint) {
        const listener = Jolt.VehicleConstraintCallbacksJS();

        listener.GetCombinedFriction = (wheelIndex, tireFrictionDirection, tireFriction, body2, subShapeID2) => {
            body2 = Jolt.wrapPointer(body2, Jolt.Body);
            return Math.sqrt(tireFriction * body2.GetFriction()); // This is the default calculation
        };
        listener.OnPreStepCallback = () => {};
        listener.OnPostCollideCallback = () => {};
        listener.OnPostStepCallback = () => {};

        listener.SetVehicleConstraint(constraint);

        this._vehicleListener = listener;
    }

    write(cb) {
        this._writeContactEvents(cb);
        this._writeCharacterEvents(cb);
    }

    reset(cb) {
        this._contactsData.length = 0;
        this._contactsData[0] = 0;
        this._contactsCache.clear();
        this._charContactsData.clear();
    }

    destroy() {
        if (this._listener) {
            Jolt.destroy(this._listener);
            this._listener = null;
        }

        if (this._charListener) {
            Jolt.destroy(this._charListener);
            this._charListener = null;
        }
    }

    _writeContactEvents(cb) {
        const data = this._contactsData;
        const contactsCount = data[0];
        
        if (contactsCount === 0) {
            return;
        }
        
        const { contactPoints, contactPointsAveraged } = this._backend.config;

        cb.writeOperator(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.COMPONENT_SYSTEM_BODY);
        cb.writeCommand(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_REPORT_CONTACTS);
        
        cb.write(contactsCount, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT32, false);

        // TODO
        // average points per contact pair, instead of all contacts

        for (let i = 0, k = 1; i < contactsCount; i++) {
            // type
            const type = data[k++];
            cb.write(type, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT8, false);

            // idx1, idx2, can be -1
            const isValidBody1 = data[k++];
            const isValidBody2 = data[k++];
            cb.write(isValidBody1, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_BOOL, false);
            cb.write(isValidBody2, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_BOOL, false);
            if (isValidBody1) {
                cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT32, false);
            }
            if (isValidBody2) {
                cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT32, false);
            }

            if (type === _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CONTACT_TYPE_ADDED) {
                // normal xyz
                cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_FLOAT32, false);
                cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_FLOAT32, false);
                cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_FLOAT32, false);
                
                // depth
                cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_FLOAT32, false);
    
                cb.write(contactPoints, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_BOOL, false);
                if (contactPoints) {
    
                    cb.write(contactPointsAveraged, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_BOOL, false);
                    if (contactPointsAveraged) {
                        // world point
                        cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_FLOAT32, false);
                        cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_FLOAT32, false);
                        cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_FLOAT32, false);
                    } else {
                        // offset
                        cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_FLOAT32, false);
                        cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_FLOAT32, false);
                        cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_FLOAT32, false);
                        
                        // count1, count2
                        const count1 = data[k++];
                        const count2 = data[k++];
                        cb.write(count1, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT32, false);
                        cb.write(count2, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT32, false);
    
                        // local points
                        for (let i = 0; i < count1; i++) {
                            cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_FLOAT32, false);
                            cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_FLOAT32, false);
                            cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_FLOAT32, false);
                        }
                        for (let i = 0; i < count2; i++) {
                            cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_FLOAT32, false);
                            cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_FLOAT32, false);
                            cb.write(data[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_FLOAT32, false);
                        }                    
                    }
                }
            }
        }
    }

    _writeCharacterEvents(cb) {
        const data = this._charContactsData;
        const charsCount = data.size;

        // Skip writing contact events, if there are none
        let skip = true;
        data.forEach(contacts => {
            if (contacts[0] > 0)
                skip = false;
        });
        if (skip)
            return;

        cb.writeOperator(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.COMPONENT_SYSTEM_CHAR);
        cb.writeCommand(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_REPORT_CONTACTS);
        cb.write(charsCount, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT32, false);

        data.forEach((contacts, index) => {
            const contactsCount = contacts[0];

            cb.write(index, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT32, false);
            cb.write(contactsCount, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT32, false);

            for (let i = 0, k = 1; i < contactsCount; i++) {
                // is body 2 valid
                cb.write(contacts[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_BOOL, false);
                cb.write(contacts[k++] || 0, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT32, false);
                
                // contact position
                // contact normal
                // contact velocity
                // new char velocity
                for (let n = 0; n < 12; n++) {
                    cb.write(contacts[k++], _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_FLOAT32, false);
                }
            }
        });
    }

    _wrapAndWrite(b1Pointer, b2Pointer, type, ignoreCache) {
        const Body = Jolt.Body;

        const body1 = Jolt.wrapPointer(b1Pointer, Body);
		const body2 = Jolt.wrapPointer(b2Pointer, Body);

        this._writeContactPair(body1, body2, type, ignoreCache);
    }

    _writeContactPair(body1, body2, type, ignoreCache) {
        const tracker = this._backend.tracker;
        const data = this._contactsData;

        let idx1 = null;
        if (body1 !== null) {
            idx1 = tracker.getPCID(Jolt.getPointer(body1)) ?? null;
        }

        let idx2 = null;
        if (body2 !== null) {
            idx2 = tracker.getPCID(Jolt.getPointer(body2)) ?? null;
        }

        // Persisted contacts will be called once per substep, which may 
        // happen multiple times per sim step. For general purposes, the first
        // substep results should be enough, so we can discard the same
        // contact pair after the first substep.
        if (!ignoreCache && body1 && body2) {
            const cache = this._contactsCache;
            const str = `${ idx1 }:${ idx2 }:${ type }`;
            if (cache.has(str)) {
                return;
            }
            cache.add(str);
        }

        data[0] = ++data[0];

        data.push(type);
        data.push(!!body1);
        data.push(!!body2);

        if (body1)
            data.push(idx1);
        
        if (body2)
            data.push(idx2);
    }
}



/***/ }),

/***/ "./src/backends/jolt/operators/modifier.mjs":
/*!**************************************************!*\
  !*** ./src/backends/jolt/operators/modifier.mjs ***!
  \**************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Modifier: () => (/* binding */ Modifier)
/* harmony export */ });
/* harmony import */ var _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../physics/components/jolt/constants.mjs */ "./src/physics/components/jolt/constants.mjs");
/* harmony import */ var _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../physics/debug.mjs */ "./src/physics/debug.mjs");
/* harmony import */ var _motion_state_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../motion-state.mjs */ "./src/backends/jolt/motion-state.mjs");




class Modifier {
    constructor(backend) {
        this._backend = backend;

        this._joltVec3_1 = new Jolt.Vec3();
        this._joltVec3_2 = new Jolt.Vec3();
        this._joltVec3_3 = new Jolt.Vec3();
        this._joltQuat_1 = new Jolt.Quat();
    }

    get joltVec3_1() {
        return this._joltVec3_1;
    }

    get joltVec3_2() {
        return this._joltVec3_2;
    }

    modify() {
        const cb = this._backend.inBuffer;
        const command = cb.readCommand();
        let ok = true;

        switch (command) {
            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_CHANGE_GRAVITY:
                ok = this._changeGravity(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_ADD_FORCE:
                ok = this._applyForces(cb, 'AddForce');
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_ADD_IMPULSE:
                ok = this._applyForces(cb, 'AddImpulse');
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_ADD_ANGULAR_IMPULSE:
                ok = this._applyForces(cb, 'AddAngularImpulse', true);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_APPLY_BUOYANCY_IMPULSE:
                ok = this._applyBuoyancyImpulse(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_ADD_TORQUE:
                ok = this._applyForces(cb, 'AddTorque', true);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_MOVE_BODY:
                ok = this._moveBody(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_SET_LIN_VEL:
                ok = this._applyForces(cb, 'SetLinearVelocity', true);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_CHAR_SET_LIN_VEL:
                this._setCharacterLinVel(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_SET_ANG_VEL:
                ok = this._applyForces(cb, 'SetAngularVelocity', true);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_RESET_VELOCITIES:
                ok = this._resetVelocities(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_SET_MOTION_TYPE:
                ok = this._setMotionType(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_TOGGLE_GROUP_PAIR:
                ok = this._toggleGroupPair(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_SET_USER_DATA:
                ok = this._setUserData(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_CHAR_SET_SHAPE:
                ok = this._setCharShape(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_USE_MOTION_STATE:
                ok = this._useMotionState(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_SET_CONSTRAINT_ENABLED:
                ok = this._setConstraintEnabled(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_SET_DRIVER_INPUT:
                ok = this._setDriverInput(cb);
                break;
        }

        return ok;
    }

    destroy() {
        Jolt.destroy(this._joltVec3_1);
        Jolt.destroy(this._joltVec3_2);
        Jolt.destroy(this._joltVec3_3);
        Jolt.destroy(this._joltQuat_1);
    }

    _changeGravity(cb) {
        const jv = this._joltVec3;

        jv.FromBuffer(cb);

        try {
            this._backend.system.SetGravity(jv);
        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(e);
            return false;
        }

        return true;
    }

    _applyForces(cb, method, oneAttr = false) {
        const jv1 = this._joltVec3_1;
        const jv2 = this._joltVec3_2;

        const body = this._getBody(cb);

        try {
            jv1.FromBuffer(cb);
            if (oneAttr) {
                body[method](jv1);
            } else {
                if (cb.flag) {
                    jv2.FromBuffer(cb);
                    body[method](jv1, jv2);
                } else {
                    body[method](jv1);
                }
            }
            this._backend.bodyInterface.ActivateBody(body.GetID());
        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(e);
            return false;
        }

        return true;
    }

    _setCharShape(cb) {
        const backend = this._backend;
        const tracker = backend.tracker;
        const pcid = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        const useCallback = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
        const shapeIndex = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32) : null;

        const char = tracker.getBodyByPCID(pcid);
        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && !char) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.warn(`Unable to locate character under id: ${ pcid }`);
            return false;
        }

        let shape;
        if (shapeIndex != null) {
            shape = tracker.shapeMap.get(shapeIndex);
            if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && !shape) {
                _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.warn(`Unable to locate shape: ${ shapeIndex }`);
                return false;
            }
        } else {
            shape = char.originalShape;
        }

        let cbIndex;
        if (useCallback) {
            cbIndex = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        }

        const ok = char.SetShape(shape, 
            backend.config.penetrationSlop * 1.5,
            backend.bpFilter,
            backend.objFilter,
            backend.bodyFilter,
            backend.shapeFilter,
            backend.joltInterface.GetTempAllocator());
        
        if (ok && useCallback) {
            const cb = backend.outBuffer;

            cb.writeOperator(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.COMPONENT_SYSTEM_CHAR);
            cb.writeCommand(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_REPORT_SET_SHAPE);
            cb.write(cbIndex, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT32, false);
        }
        
        return true;
    }

    _resetCharShape(cb) {
        const backend = this._backend;
        const tracker = backend.tracker;
        const pcid = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        const useCallback = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);

        let cbIndex;
        if (useCallback) {
            cbIndex = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        }

        const char = tracker.getBodyByPCID(pcid);

        const ok = char.SetShape(shape, 
            backend.config.penetrationSlop * 1.5,
            backend.bpFilter,
            backend.objFilter,
            backend.bodyFilter,
            backend.shapeFilter,
            backend.joltInterface.GetTempAllocator());
        
        if (ok && useCallback) {
            const cb = backend.outBuffer;

            cb.writeOperator(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.COMPONENT_SYSTEM_CHAR);
            cb.writeCommand(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_REPORT_SET_SHAPE);
            cb.write(cbIndex, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT32, false);
        }
        
        return true;
    }

    _setUserData(cb) {
        const obj = this._getBody(cb);

        try {
            const shape = obj.GetShape();
            const value = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            shape.SetUserData(value);
        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(e);
            return false;
        }

        return true;
    }

    _useMotionState(cb) {
        const body = this._getBody(cb);
        const useMotionState = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);

        if (!body.motionState && useMotionState) {
            body.motionState = new _motion_state_mjs__WEBPACK_IMPORTED_MODULE_2__.MotionState(body);
        } else if (body.motionState && !useMotionState) {
            body.motionState = null;
        }

        return true;
    }

    _setCharacterLinVel(cb) {
        const jv = this._joltVec3_1;
        const char = this._getBody(cb);

        try {
            jv.FromBuffer(cb);
            char.SetLinearVelocity(jv);
        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(e);
            return false;
        }        
    }

    _applyBuoyancyImpulse(cb) {
        const backend = this._backend;
        const body = this._getBody(cb);
        const jv1 = this._joltVec3_1;
        const jv2 = this._joltVec3_2;
        const jv3 = this._joltVec3_3;

        try {
            const waterSurfacePosition = jv1.FromBuffer(cb);
            const surfaceNormal = jv2.FromBuffer(cb);
            const buoyancy = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            const linearDrag = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            const angularDrag = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
            const fluidVelocity = jv3.FromBuffer(cb);
            const deltaTime = backend.config.fixedStep;
            const gravity = backend.physicsSystem.GetGravity();

            body.ApplyBuoyancyImpulse(waterSurfacePosition, surfaceNormal, buoyancy, linearDrag, angularDrag, fluidVelocity, gravity, deltaTime);
        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(e);
            return false;
        }

        return true;
    }

    _setConstraintEnabled(cb) {
        const backend = this._backend;

        const index = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        const enabled = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
        const activate = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);

        const data = backend.tracker.constraintMap.get(index);
        
        // An index could be old and constraint might have been already destroyed.
        if (!data) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.warn(`Trying to enable/disable a constraint that has already been destroyed: ${ index }`);
            return true;
        }

        try {
            data.constraint.SetEnabled(enabled);
    
            if (activate) {
                const bodyInterface = backend.bodyInterface;
                const { body1, body2 } = data;
    
                if (Jolt.getPointer(data.body1) !== 0) {
                    bodyInterface.ActivateBody(body1.GetID());
                }
                if (Jolt.getPointer(data.body2) !== 0) {
                    bodyInterface.ActivateBody(body2.GetID());
                }
            }
        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(e);
            return false;
        }
        
        return true;
    }

    _resetVelocities(cb) {
        const jv1 = this._joltVec3_1;
        const body = this._getBody(cb);

        try {
            jv1.Set(0, 0, 0);

            body.SetLinearVelocity(jv1);
            body.SetAngularVelocity(jv1);
        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(e);
            return false;
        }

        return true;
    }

    _moveBody(cb) {
        const backend = this._backend;
        const jv = this._joltVec3_1;
        const jq = this._joltQuat_1;
        const body = this._getBody(cb);

        try {
            jv.FromBuffer(cb);
            jq.FromBuffer(cb);

            if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
                const type = body.GetMotionType();
                if (type === Jolt.EMotionType_Dynamic || type === Jolt.EMotionType_Kinematic) {
                    backend.bodyInterface.SetPositionAndRotation(body.GetID(), jv, jq, Jolt.Activate);
                } else {
                    _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.warnOnce('Trying to move a static body.');
                }
            } else {
                backend.bodyInterface.SetPositionAndRotation(body.GetID(), jv, jq, Jolt.Activate);
            }
        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(e);
            return false;
        }

        return true;
    }

    _setDriverInput(cb) {
        const backend = this._backend;
        const tracker = backend.tracker;
        const index = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);

        const body = tracker.getBodyByPCID(index);
        const data = tracker.constraintMap.get(index);
        if (!data || !body) {
            return true;
        }

        data.constraint.controller.SetDriverInput(
            cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32),
            cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32),
            cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32),
            cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32)
        );

        backend.bodyInterface.ActivateBody(body.GetID());

        return true;
    }

    _toggleGroupPair(cb) {
        const backend = this._backend;
        const enable = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
        const group = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT16);
        const subGroup1 = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT16);
        const subGroup2 = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT16);

        try {
            const filter = backend.groupFilterTables[group];

            if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
                let ok = true;
                ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert(!!filter, `Unable to locate filter group: ${ group }`);
                ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert(subGroup1 <= filter.maxIndex, `Sub group number is over the filter table size: ${ subGroup1 }`);
                ok = ok && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert(subGroup2 <= filter.maxIndex, `Sub group number is over the filter table size: ${ subGroup2 }`);
                if (!ok) return false;
            }

            if (enable) {
                filter.EnableCollision(subGroup1, subGroup2);
            } else {
                filter.DisableCollision(subGroup1, subGroup2);
            }
        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(e);
            return false;
        }

        return true;
    }

    _setMotionType(cb) {
        const backend = this._backend;
        const tracker = backend.tracker;
        const bodyInterface = backend.bodyInterface;
        const index = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT16);
        const body = tracker.getBodyByPCID(index);
        const type = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);

        _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.checkUint(type);

        try {
            bodyInterface.SetMotionType(body.GetID(), type, Jolt.Activate);
            tracker.update(body, index);
        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(e);
            return false;
        }

        return true;
    }

    _getBody(cb) {
        const index = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        return this._backend.tracker.getBodyByPCID(index);
    }
}





/***/ }),

/***/ "./src/backends/jolt/operators/querier.mjs":
/*!*************************************************!*\
  !*** ./src/backends/jolt/operators/querier.mjs ***!
  \*************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Querier: () => (/* binding */ Querier)
/* harmony export */ });
/* harmony import */ var _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../physics/components/jolt/constants.mjs */ "./src/physics/components/jolt/constants.mjs");
/* harmony import */ var _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../physics/debug.mjs */ "./src/physics/debug.mjs");



const params = [];

class Querier {
    static writeRayHit(buffer, system, tracker, cast, calculateNormal, hit) {
        const body = system.GetBodyLockInterfaceNoLock().TryGetBody(hit.mBodyID);
        const point = cast.GetPointOnRay(hit.mFraction);
        const normal = calculateNormal ? body.GetWorldSpaceSurfaceNormal(hit.mSubShapeID2, point) : null;

        const index = tracker.getPCID(Jolt.getPointer(body));
        buffer.write(index, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT32, false);
        buffer.write(point, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_JOLTVEC32, false);
        buffer.write(normal, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_JOLTVEC32);

        Jolt.destroy(point);
    }

    static writeShapeHit(buffer, system, tracker, cast, calculateNormal, hit) {
        const body = system.GetBodyLockInterfaceNoLock().TryGetBody(hit.mBodyID2);
        const transform = cast.mCenterOfMassStart;
        const point = transform.GetTranslation();
        const dir = cast.mDirection;

        dir.Mul(hit.mFraction);
        point.Add(dir);

        const normal = calculateNormal ? body.GetWorldSpaceSurfaceNormal(hit.mSubShapeID2, point) : null;

        const index = tracker.getPCID(Jolt.getPointer(body));
        buffer.write(index, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT32, false);
        buffer.write(point, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_JOLTVEC32, false);
        buffer.write(normal, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_JOLTVEC32);

        Jolt.destroy(point);
        if (normal) Jolt.destroy(normal);
    }    

    constructor(backend) {
        this._backend = backend;

        // TODO
        // refactor to lazy allocate

        this._rayCast = new Jolt.RRayCast();
        this._rayCastSettings = new Jolt.RayCastSettings();
        this._tempVectors = [
            new Jolt.Quat(), new Jolt.Vec3(), new Jolt.Vec3(), 
            new Jolt.Vec3(), new Jolt.Vec3(), new Jolt.Vec3(),
        ];

        this._shapeCastSettings = new Jolt.ShapeCastSettings();


        this._collectorRayFirst = new Jolt.CastRayClosestHitCollisionCollector();
        this._collectorRayAll = new Jolt.CastRayAllHitCollisionCollector();

        this._collectorShapeFirst = new Jolt.CastShapeClosestHitCollisionCollector();
        this._collectorShapeAll = new Jolt.CastShapeAllHitCollisionCollector();

        this._dirty = false;
        this._bodies = [];
        this._shapeCache = new Map();
    }

    get dirty() {
        return this._dirty;
    }

    get bpFilter() {
        return this._bpFilter;
    }

    get objFilter() {
        return this._objFilter;
    }

    get bodyFilter() {
        return this._bodyFilter;
    }

    get shapeFilter() {
        return this._shapeFilter;
    }

    reset() {
        this._dirty = false;
    }

    query() {
        const cb = this._backend.inBuffer;
        const command = cb.readCommand();
        let ok = true;

        switch (command) {
            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_CAST_RAY:
                ok = this._castRay(cb);
                break;

            case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_CAST_SHAPE:
                ok = this._castShape(cb);
                break;

            default:
                _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(`Invalid querier command: ${ command }`);
                return false;
        }

        return ok;
    }

    destroy() {
        this._tempVectors.forEach(vector => {
            Jolt.destroy(vector);
        });
        this._tempVectors.length = 0;

        Jolt.destroy(this._rayCast);
        this._rayCast = null;

        Jolt.destroy(this._rayCastSettings);
        this._rayCastSettings = null;

        Jolt.destroy(this._shapeCastSettings);
        this._shapeCastSettings = null;

        Jolt.destroy(this._bpFilter);
        this._bpFilter = null;

        Jolt.destroy(this._objFilter);
        this._objFilter = null;

        Jolt.destroy(this._bodyFilter);
        this._bodyFilter = null;

        Jolt.destroy(this._shapeFilter);
        this._shapeFilter = null;

        Jolt.destroy(this._collectorRayFirst);
        this._collectorRayFirst = null;

        Jolt.destroy(this._collectorRayAll);
        this._collectorRayAll = null;

        this._commandsBuffer.destroy();
        this._commandsBuffer = null;

        this._shapeCache.forEach(shape => {
            Jolt.destroy(shape);
        });
        this._shapeCache.clear();

        params.length = 0;
        params = undefined;
    }

    _castRay(cb) {
        const tracker = this._backend.tracker;
        const buffer = this._commandsBuffer;
        const castSettings = this._rayCastSettings;
        const jv = this._tempVectors[1];
        const cast = this._rayCast;
        const system = this._backend.physicsSystem;

        const cache = this._bodies;
        cache.length = 0;

        buffer.writeCommand(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_CAST_RAY);
        
        const queryIndex = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        buffer.write(queryIndex, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT16, false);

        try {
            jv.FromBuffer(cb);
            cast.mOrigin = jv;
    
            jv.FromBuffer(cb);
            cast.mDirection = jv;
    
            const firstOnly = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL) : true;
            const calculateNormal = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL) : false;
            const ignoreBackFaces = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL) : true;
            const solidConvex = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL) : true;
            const collector = firstOnly ? this._collectorRayFirst : this._collectorRayAll;
            const { bpFilter, objFilter, bodyFilter, shapeFilter } = this._backend;
    
            castSettings.mBackFaceMode = ignoreBackFaces ? Jolt.EBackFaceMode_IgnoreBackFaces : Jolt.EBackFaceMode_CollideWithBackFaces;
            castSettings.mTreatConvexAsSolid = solidConvex;

            system.GetNarrowPhaseQuery().CastRay(cast, castSettings, collector, bpFilter, objFilter, bodyFilter, shapeFilter);

            if (firstOnly) {
                if (collector.HadHit()) {
                    buffer.write(1, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT16, false); // hits count
                    Querier.writeRayHit(buffer, system, tracker, cast, calculateNormal, collector.mHit);
                    this._dirty = true;
                }
            } else {
                const hits = collector.mHits;
                const count = hits.size();
                buffer.write(count, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT16, false); // hits count
                for (let i = 0; i < count; i++) {
                    Querier.writeRayHit(buffer, system, tracker, cast, calculateNormal, hits.at(i));
                    this._dirty = true;
                }
            }
    
            collector.Reset();
            
        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(e);
            return false;
        }

        return true;
    }

    _castShape(cb) {
        const buffer = this._commandsBuffer;
        const tempVectors = this._tempVectors;
        const scale = tempVectors[1];
        const direction = tempVectors[2];
        const position = tempVectors[3];
        const offset = tempVectors[4];
        const rotation = tempVectors[0];
        const backend = this._backend;
        const castSettings = this._shapeCastSettings;
        const tracker = backend.tracker;
        const creator = backend.creator;
        const system = backend.physicsSystem;

        const queryIndex = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT32);
        const shapeType = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);

        buffer.writeCommand(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.CMD_CAST_SHAPE);
        buffer.write(queryIndex, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT16, false);
        
        try {
            position.FromBuffer(cb);
            rotation.FromBuffer(cb);
            direction.FromBuffer(cb);
            cb.flag ? scale.FromBuffer(cb) : scale.Set(1, 1, 1);
            cb.flag ? offset.FromBuffer(cb) : offset.Set(0, 0, 0);
            if (cb.flag) castSettings.mBackFaceModeTriangles = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
            if (cb.flag) castSettings.mBackFaceModeConvex = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_UINT8);
            if (cb.flag) castSettings.mUseShrunkenShapeAndConvexRadius = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
            if (cb.flag) castSettings.mReturnDeepestPoint = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL);
            
            const firstOnly = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL) : true;
            const calculateNormal = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_BOOL) : false;
            const collector = firstOnly ? this._collectorShapeFirst : this._collectorShapeAll;
            
            params.length = 0;

            let shape, str;
            switch (shapeType) {
                case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_SPHERE: {
                    const radius = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32) : 0.5;
                    str = `${ shapeType }:${ radius }`;
                    shape = this._shapeCache.get(str);
                    if (!shape) params.push(radius)
                    break;
                }

                case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_BOX: {
                    let x, y, z;
                    if (cb.flag) {
                        x = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                        y = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                        z = cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32);
                    } else {
                        x = 0.5; y = 0.5; z = 0.5;
                    }
                    const halfExtent = tempVectors[5];
                    halfExtent.Set(x, y, z);
                    const cr = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32) : 0.05;
                    str = `${ shapeType }:${ x }:${ y }:${ z }:${ cr }`;
                    shape = this._shapeCache.get(str);
                    if (!shape) params.push(halfExtent, cr);
                    break;
                }

                case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_CAPSULE: {
                    const halfHeight = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32) : 0.5;
                    const radius = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32) : 0.5;
                    str = `${ shapeType }:${ halfHeight }:${ radius }`;
                    shape = this._shapeCache.get(str);
                    if (!shape) params.push(halfHeight, radius);
                    break;
                }

                case _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.SHAPE_CYLINDER: {
                    const halfHeight = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32) : 0.5;
                    const radius = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32) : 0.5;
                    const convexRadius = cb.flag ? cb.read(_physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_READ_FLOAT32) : 0.05;
                    str = `${ shapeType }:${ halfHeight }:${ radius }:${ convexRadius }`;
                    if (!shape) params.push(halfHeight, radius, convexRadius);
                    break;
                }
                
                default:
                    _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(`Shape type in cast not supported: ${ shapeType }`);
                    return false;
            }

            if (!shape) {
                const settings = creator.createShapeSettings(shapeType, ...params);
                shape = settings.Create().Get();
                this._shapeCache.set(str, shape);
            }

            const transform = Jolt.Mat44.prototype.sRotationTranslation(rotation, position);
            const shapeCast = new Jolt.RShapeCast(shape, scale, transform, direction);
            const { bpFilter, objFilter, bodyFilter, shapeFilter } = backend;
            system.GetNarrowPhaseQuery().CastShape(shapeCast, castSettings, offset, collector, bpFilter, objFilter, bodyFilter, shapeFilter);
            
            if (firstOnly) {
                if (collector.HadHit()) {
                    buffer.write(1, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT16, false); // hits count
                    Querier.writeShapeHit(buffer, system, tracker, shapeCast, calculateNormal, collector.mHit);

                    this._dirty = true;
                }        
            } else {
                const hits = collector.mHits;
                const count = hits.size();
                buffer.write(count, _physics_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_0__.BUFFER_WRITE_UINT16, false); // hits count
                for (let i = 0; i < count; i++) {
                    Querier.writeShapeHit(buffer, system, tracker, shapeCast, calculateNormal, hits.at(i));
                    this._dirty = true;
                }
            }

            collector.Reset();

            Jolt.destroy(shapeCast);

        } catch (e) {
            _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev && _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.error(e);
            return false;
        }

        return true;
    }
}



/***/ }),

/***/ "./src/backends/jolt/operators/tracker.mjs":
/*!*************************************************!*\
  !*** ./src/backends/jolt/operators/tracker.mjs ***!
  \*************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Tracker: () => (/* binding */ Tracker)
/* harmony export */ });
/* harmony import */ var _physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../physics/debug.mjs */ "./src/physics/debug.mjs");


class Tracker {
    constructor(backend) {
        this.backend = backend;

        // TODO
        // eval: get rid of _dynamic and _kinematic
        this._dynamic = new Set();
        this._kinematic = new Set();

        this._character = new Set();
        this._bodyMap = new Map();
        this._idxMap = new Map();
        this._shapeMap = new Map();
        this._constraintMap = new Map();

        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            this._debug = new Set();

            Object.defineProperty(this, 'debug', {
                get: () => { return this._debug; }
            });
        }
    }

    get dynamic() {
        return this._dynamic;
    }

    get kinematic() {
        return this._kinematic;
    }

    get character() {
        return this._character;
    }

    get shapeMap() {
        return this._shapeMap;
    }

    get constraintMap() {
        return this._constraintMap;
    }

    add(body, index) {
        if (body.isCharacter) {
            this._character.add(body);
        } else {
            const motionType = body.GetMotionType();
            const bodyType = body.GetBodyType();
    
            if (bodyType === Jolt.EBodyType_RigidBody) {
                switch (motionType) {
                    case Jolt.EMotionType_Dynamic:
                        this._dynamic.add(body);
                        break;
                    case Jolt.EMotionType_Kinematic:
                        this._kinematic.add(body);
                        break;
                    case Jolt.EMotionType_Static:
                        // no need to track statics
                        break;
                    default:
                        break;
                }
            }
        }

        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && body.debugDraw) {
            this._debug.add(body);
        }

        this._idxMap.set(Jolt.getPointer(body), index);
        this._bodyMap.set(index, body);
    }

    // addCharacter(char, index) {
        
    //     this._idxMap.set(Jolt.getPointer(char), index);
    //     this._bodyMap.set(index, char);

    //     if (Debug.dev && char.debugDraw) {
    //         this._debug.add(char);
    //     }
    // }

    addConstraint(index, constraint, body1, body2) {
        this._constraintMap.set(index, { constraint, body1, body2 });
    }

    getBodyByPCID(index) {
        return this._bodyMap.get(index);
    }

    getPCID(index) {
        return this._idxMap.get(index);
    }

    update(body, index) {
        this.remove(body);
        this.add(body, index);
    }

    stopTrackingBody(body) {
        this._dynamic.delete(body);
        this._kinematic.delete(body);
        this._character.delete(body);

        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            this._debug.delete(body);
        }

        const jid = Jolt.getPointer(body);
        const idx = this._idxMap.get(jid);

        this._bodyMap.delete(idx);
        this._idxMap.delete(jid);
    }

    destroy() {
        this._dynamic.clear();
        this._kinematic.clear();

        this._character.forEach(char => {
            Jolt.destroy(char);
        });
        this._character.clear();

        this._bodyMap.forEach(body => {
            Jolt.destroy(body);
        });
        this._bodyMap.clear();

        if (_physics_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            this._debug.clear();
        }
    }
}



/***/ }),

/***/ "./src/physics/components/jolt/body/component.mjs":
/*!********************************************************!*\
  !*** ./src/physics/components/jolt/body/component.mjs ***!
  \********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BodyComponent: () => (/* binding */ BodyComponent)
/* harmony export */ });
/* harmony import */ var _debug_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../debug.mjs */ "./src/physics/debug.mjs");
/* harmony import */ var _component_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../component.mjs */ "./src/physics/components/jolt/component.mjs");
/* harmony import */ var _constants_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../constants.mjs */ "./src/physics/components/jolt/constants.mjs");




const vec3 = new pc.Vec3();

class BodyComponent extends _component_mjs__WEBPACK_IMPORTED_MODULE_1__.ShapeComponent {

    // ---- BODY PROPS ----

    // Position of the body (not of the center of mass)
    _position = new pc.Vec3();

    // Rotation of the body.
    _rotation = new pc.Quat();

    // World space linear velocity of the center of mass (m/s)
    _linearVelocity = new pc.Vec3();

    // World space angular velocity (rad/s)
    _angularVelocity = new pc.Vec3();

    // Motion type, determines if the object is static, dynamic or kinematic.
    _motionType = pc.JOLT_MOTION_TYPE_STATIC;

    // Enables/disables the use of motion state for this entity. Not used by static bodies.
    _useMotionState = true;

    // The collision layer this body belongs to (determines if two objects can collide).
    // Allows cheap filtering.
    _objectLayer = 0;

    // The collision group this body belongs to (determines if two objects can collide).
    // Expensive, so disabled by default.
    _collisionGroup = null;

    // Sub-group (within the collision group). Expensive, so disabled by default.
    _subGroup = null;

    // Which degrees of freedom this body has (can be used to limit simulation to 2D)
    _allowedDOFs = pc.JOLT_ALLOWED_DOFS_ALL;

    // When this body is created as static, this setting tells the system to create a
    // MotionProperties object so that the object can be switched to kinematic or dynamic.
    _allowDynamicOrKinematic = false;

    // If this body is a sensor. A sensor will receive collision callbacks, but will not
    // cause any collision responses and can be used as a trigger volume.
    _isSensor = false;

    // Motion quality, or how well it detects collisions when it has a high velocity.
    _motionQuality = pc.JOLT_MOTION_QUALITY_DISCRETE;

    // If this body can go to sleep or not.
    _allowSleeping = true;

    // Friction of the body (dimensionless number, usually between 0 and 1, 0 = no friction,
    // 1 = friction force equals force that presses the two bodies together). Note that bodies
    // can have negative friction but the combined friction should never go below zero.
    _friction = 0.2;

    // Restitution of body (dimensionless number, usually between 0 and 1, 0 = completely
    // inelastic collision response, 1 = completely elastic collision response). Note that
    // bodies can have negative restitution but the combined restitution should never go below zero.
    _restitution = 0;

    // Linear damping: dv/dt = -c * v. c must be between 0 and 1 but is usually close to 0.
    _linearDamping = 0;

    // Angular damping: dw/dt = -c * w. c must be between 0 and 1 but is usually close to 0.
    _angularDamping = 0;

    // Maximum linear velocity that this body can reach (m/s)
    _maxLinearVelocity = 500;

    // Maximum angular velocity that this body can reach (rad/s)
    _maxAngularVelocity = 0.25 * Math.PI * 60;

    // Value to multiply gravity with for this body.
    _gravityFactor = 1;

    // When calculating the inertia (not when it is provided) the calculated inertia will be multiplied by this value.
    _inertiaMultiplier = 1;

    // Determines how mMassPropertiesOverride will be used. By default tells Jolt to
    // auto-calculate by the shape.
    _overrideMassProperties = pc.JOLT_OMP_CALCULATE_MASS_AND_INERTIA;

    // Used only if Jolt.CalculateInertia or Jolt.MassAndInertiaProvided is selected for
    // mass calculation method
    _overrideMass = 1;

    // Used if Jolt.MassAndInertiaProvided is selected for mass calculation method.
    // Backend will create inertia matrix from the given position/rotation.
    _overrideInertiaPosition = new pc.Vec3();
    _overrideInertiaRotation = new pc.Quat();

    constructor(system, entity) {
        super(system, entity);
    }

    set linearVelocity(vec) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            const ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkVec(vec, `Invalid linear velocity vector`);
            if (!ok) return;
        }

        if (!vec.equals(this._linearVelocity)) {
            this._linearVelocity.copy(vec);
            this.system.addCommand(
                _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_SET_LIN_VEL, this._index,
                vec, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false
            );
        }
    }

    get linearVelocity() {
        return this._linearVelocity;
    }

    set angularVelocity(vec) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            const ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkVec(vec, `Invalid angular velocity vector`);
            if (!ok) return;
        }

        if (!vec.equals(this._angularVelocity)) {
            this._angularVelocity.copy(vec);
            this.system.addCommand(
                _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_SET_ANG_VEL, this._index,
                vec, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false
            );
        }
    }

    get angularVelocity() {
        return this._angularVelocity;
    }

    set motionType(type) {
        _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkUint(type, `Invalid motion type: ${ type }`);
        this._motionType = type;
        this.system.addCommand(
            _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_SET_MOTION_TYPE, this._index,
            type, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT8, false
        );
    }

    get motionType() {
        return this._motionType;
    }

    get collisionGroup() {
        return this._group;
    }

    get subGroup() {
        return this._subGroup;
    }

    get index() {
        return this._index;
    }

    get userData() {
        return this._userData;
    }

    set userData(num) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            let ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(num, `Invalid user data value. Should be a number: ${ num }`);
            if (!ok)
                return;
        }

        this._userData = num;

        this.system.addCommand(
            _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_SET_USER_DATA, this._index,
            num, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false
        );      
    }

    get useMotionState() {
        return this._useMotionState;
    }

    set useMotionState(bool) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            const ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkBool(bool, `Invalid bool value for useMotionState property: ${ bool }`);
            if (!ok)
                return;
        }

        this.system.addCommand(
            _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_USE_MOTION_STATE, this._index,
            bool, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_BOOL, false
        );
    }

    addForce(force, offset, isOffsetLocal = false) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            let ok = true;
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkVec(force, `Invalid add force vector`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkVec(offset, `Invalid add force offset`);
            if (!ok) {
                return;
            }
        }

        let _offset = null;
        if (offset) {
            _offset = vec3.copy(offset);

            if (isOffsetLocal) {
                this._localToWorld(_offset);
            }
        }

        this.system.addCommand(
            _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_ADD_FORCE, this._index,
            force, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false,
            _offset, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, true
        );
    }

    addForceScalars(forceX, forceY, forceZ, offsetX = 0, offsetY = 0, offsetZ = 0, isOffsetLocal = false) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            let ok = true;
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(forceX, `Invalid add impulse X component: ${ forceX }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(forceY, `Invalid add impulse Y component: ${ forceY }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(forceZ, `Invalid add impulse Z component: ${ forceZ }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(offsetX, `Invalid add impulse offset X component: ${ offsetX }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(offsetY, `Invalid add impulse offset Y component: ${ offsetY }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(offsetZ, `Invalid add impulse offset Z component: ${ offsetZ }`);
            if (!ok) {
                return;
            }
        }

        let offset = null;
        if (offsetX !== 0 || offsetY !== 0 || offsetZ !== 0) {
            offset = vec3.set(offsetX, offsetY, offsetZ);

            if (isOffsetLocal) {
                this._localToWorld(offset);
            }
        }

        this.system.addCommand(
            _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_ADD_FORCE, this._index,
            forceX, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false,
            forceY, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false,
            forceZ, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false,
            offset, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, true
        );
    }

    addImpulse(impulse, offset = pc.Vec3.ZERO, isOffsetLocal = false) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            let ok = true;
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkVec(impulse, `Invalid add impulse vector:`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkVec(offset, `Invalid add impulse offset:`);
            if (!ok) {
                return;
            }
        }

        let _offset = null;
        if (offset) {
            _offset = vec3.copy(offset);

            if (isOffsetLocal) {
                this._localToWorld(_offset);
            }
        }

        this.system.addCommand(
            _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_ADD_IMPULSE, this._index,
            impulse, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false,
            _offset, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, true
        );
    }

    addImpulseScalars(impulseX, impulseY, impulseZ, offsetX = 0, offsetY = 0, offsetZ = 0, isOffsetLocal = false) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            let ok = true;
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(impulseX, `Invalid add impulse X component: ${ impulseX }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(impulseY, `Invalid add impulse Y component: ${ impulseY }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(impulseZ, `Invalid add impulse Z component: ${ impulseZ }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(offsetX, `Invalid add impulse offset X component: ${ offsetX }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(offsetY, `Invalid add impulse offset Y component: ${ offsetY }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(offsetZ, `Invalid add impulse offset Z component: ${ offsetZ }`);
            if (!ok) {
                return;
            }
        }

        let offset = null;
        if (offsetX !== 0 || offsetY !== 0 || offsetZ !== 0) {
            offset = vec3.set(offsetX, offsetY, offsetZ);

            if (isOffsetLocal) {
                this._localToWorld(offset);
            }
        }

        this.system.addCommand(
            _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_ADD_FORCE, this._index,
            impulseX, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false,
            impulseY, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false,
            impulseZ, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false,
            offset, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, true
        );
    }

    applyBuoyancyImpulse(waterSurfacePosition, surfaceNormal, buoyancy, linearDrag, angularDrag, fluidVelocity) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            let ok = true;
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkVec(waterSurfacePosition, `Invalid water surface position vector`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkVec(surfaceNormal, `Invalid surface normal`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(buoyancy, `Invalid buoyancy scalar: ${ buoyancy }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(linearDrag, `Invalid linear drag scalar: ${ linearDrag }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(angularDrag, `Invalid angular drag scalar: ${ angularDrag }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkVec(fluidVelocity, `Invalid fluid velocity vector`);
            if (!ok) return;
        }

        this.system.addCommand(
            _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_APPLY_BUOYANCY_IMPULSE, this._index,
            waterSurfacePosition, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false,
            surfaceNormal, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false,
            buoyancy, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false,
            linearDrag, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false,
            angularDrag, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false,
            fluidVelocity, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false
        );
    }

    addAngularImpulse(impulse) {
        this.system.addCommand(
            _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_ADD_IMPULSE, this._index,
            impulse, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false
        );
    }

    addTorque(torque) {
        this.system.addCommand(
            _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_ADD_FORCE, this._index,
            torque, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false
        );
    }

    writeIsometry() {
        const entity = this.entity;
        if (entity._dirtyWorld) {
            const position = entity.getPosition();
            const rotation = entity.getRotation();

            this.system.addCommand(
                _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_MOVE_BODY, this._index,
                position, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false,
                rotation, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false
            );

            if (this._motionType === pc.JOLT_MOTION_TYPE_DYNAMIC) {
                this.resetVelocities();
            }
        }
    }

    writeComponentData(cb) {
        const ok = _component_mjs__WEBPACK_IMPORTED_MODULE_1__.ShapeComponent.writeShapeData(cb, this);
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && !ok) {
            _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.warn('Error creating a shape data.');
            cb.reset();
            return;
        }

        cb.write(this._index, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);

        // We always use world position and rotation from the current entity the component
        // is attached to (instead of default zero vectors)
        const entity = this.entity;
        const pos = entity.getPosition();
        const rot = entity.getRotation();

        // TODO
        // get rid of flags

        // Loss of precision for pos/rot (64 -> 32)
        cb.write(pos, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
        cb.write(rot, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);

        cb.write(this._motionType, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT8, false);
        cb.write(this._useMotionState, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_BOOL, false);
        cb.write(this._objectLayer, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT16, false);
        cb.write(this._linearVelocity, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
        cb.write(this._angularVelocity, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
        cb.write(this._maxLinearVelocity, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxAngularVelocity, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._friction, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._restitution, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._linearDamping, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._angularDamping, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._gravityFactor, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._inertiaMultiplier, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._allowedDOFs, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT8, false);
        cb.write(this._allowDynamicOrKinematic, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_BOOL, false);
        cb.write(this._isSensor, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_BOOL, false);
        cb.write(this._motionQuality, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT8, false);
        cb.write(this._allowSleeping, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_BOOL, false);
        cb.write(this._collisionGroup, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32);
        cb.write(this._subGroup, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32);

        _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && cb.write(this._debugDraw, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_BOOL, false);

        const massProps = this._overrideMassProperties;
        cb.write(massProps, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT8, false);

        if (massProps !== pc.JOLT_OMP_CALCULATE_MASS_AND_INERTIA) {
            cb.write(this._overrideMass, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);

            if (this._overrideMassProperties === pc.JOLT_OMP_MASS_AND_INERTIA_PROVIDED) {
                // override inertia
                // Potential precision loss (64 -> 32)
                cb.write(this._overrideInertiaPosition, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
                cb.write(this._overrideInertiaRotation, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
            }
        }
    }

    resetVelocities() {
        this.system.addCommand(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_RESET_VELOCITIES, this._index);
    }

    onEnable() {
        const system = this.system;
        const shape = this._shape;
        const isCompoundChild = this._isCompoundChild;

        this._index = system.getIndex(this.entity);

        if ((shape === _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.SHAPE_MESH || shape === _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.SHAPE_CONVEX_HULL || shape === _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.SHAPE_HEIGHTFIELD) && 
            this._renderAsset && !this._meshes) {
            this._addMeshes();
        } else if (!isCompoundChild) {
            system.createBody(this);
        }

        if (!isCompoundChild) {
            const motionType = this._motionType;
            if ((motionType === pc.JOLT_MOTION_TYPE_DYNAMIC && this._trackDynamic) || motionType === pc.JOLT_MOTION_TYPE_KINEMATIC) {
                this._isometryEvent = this.system.on('write-isometry', this.writeIsometry, this);
            }
        }
    }

    onDisable() {
        super.onDisable();

        const system = this.system;
        const componentIndex = this._index;

        system.setIndexFree(componentIndex);

        // TODO
        // Jolt currently exposes only static compounds to Wasm. Which means,
        // that a compound parent cannot change children. So, currently
        // a child cannot be added/removed, we can only destroy/create
        // parent.

        if (this._isCompoundChild) return;

        system.addCommand(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_CLEANER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_DESTROY_BODY, componentIndex);

        this._isometryEvent?.off();
        this._isometryEvent = null;
    }

    _localToWorld(vec) {
        const m4 = this.entity.getWorldTransform();
        m4.transformPoint(vec, vec);
    }

    _addMeshes() {
        const id = this._renderAsset;
        const assets = this.system.app.assets;

        const onAssetFullyReady = (asset) => {
            this._meshes = asset.resource.meshes;
            this.system.createBody(this);
        };

        const loadAndHandleAsset = (asset) => {
            asset.ready((asset) => {
                if (asset.data.containerAsset) {
                    const containerAsset = assets.get(asset.data.containerAsset);
                    if (containerAsset.loaded) {
                        onAssetFullyReady(asset);
                    } else {
                        containerAsset.ready(() => {
                            onAssetFullyReady(asset);
                        });
                        assets.load(containerAsset);
                    }
                } else {
                    onAssetFullyReady(asset);
                }
            });

            assets.load(asset);
        };

        const asset = assets.get(id);
        if (asset) {
            loadAndHandleAsset(asset);
        } else {
            assets.once('add:' + id, loadAndHandleAsset);
        }        
    }
}





/***/ }),

/***/ "./src/physics/components/jolt/body/system.mjs":
/*!*****************************************************!*\
  !*** ./src/physics/components/jolt/body/system.mjs ***!
  \*****************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BodyComponentSystem: () => (/* binding */ BodyComponentSystem)
/* harmony export */ });
/* harmony import */ var _debug_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../debug.mjs */ "./src/physics/debug.mjs");
/* harmony import */ var _util_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../util.mjs */ "./src/physics/util.mjs");
/* harmony import */ var _constants_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../constants.mjs */ "./src/physics/components/jolt/constants.mjs");
/* harmony import */ var _response_handler_mjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../response-handler.mjs */ "./src/physics/components/jolt/response-handler.mjs");
/* harmony import */ var _system_mjs__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../system.mjs */ "./src/physics/components/jolt/system.mjs");
/* harmony import */ var _component_mjs__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./component.mjs */ "./src/physics/components/jolt/body/component.mjs");







const schema = [
    // Jolt body
    'position',
    'rotation',
    'linearVelocity',
    'angularVelocity',
    'friction',
    'restitution',
    'linearDamping',
    'angularDamping',
    'maxLinearVelocity',
    'maxAngularVelocity',
    'gravityFactor',
    'inertiaMultiplier',
    'overrideMass',
    'overrideMassProperties',
    'overrideInertiaPosition',
    'overrideInertiaRotation',
    'motionType',
    'objectLayer',
    'collisionGroup',
    'subGroup',
    'allowedDOFs',
    'allowDynamicOrKinematic',
    'isSensor',
    'motionQuality',
    'allowSleeping',
];

class BodyComponentSystem extends _system_mjs__WEBPACK_IMPORTED_MODULE_4__.ShapeComponentSystem {

    constructor(app, manager, id) {
        super(app, manager);

        this.id = 'body';
        this.schema = [...this.schema, ...schema];
        this.ComponentType = _component_mjs__WEBPACK_IMPORTED_MODULE_5__.BodyComponent;

        manager.systems.set(id, this);

        (0,_util_mjs__WEBPACK_IMPORTED_MODULE_1__.buildAccessors)(this, this.schema);
    }

    overrideContacts(callbacks = {}) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            !!callbacks.OnContactValidate && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.assert(typeof callbacks.OnContactValidate === 'function', 'OnContactValidate must be a function', callbacks);
            !!callbacks.OnContactAdded && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.assert(typeof callbacks.OnContactAdded === 'function', 'OnContactAdded must be a function', callbacks);
            !!callbacks.OnContactPersisted && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.assert(typeof callbacks.OnContactPersisted === 'function', 'OnContactPersisted must be a function', callbacks);
            !!callbacks.OnContactRemoved && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.assert(typeof callbacks.OnContactRemoved === 'function', 'OnContactRemoved must be a function', callbacks);
        }

        const overrides = Object.create(null);
        if (callbacks.OnContactValidate) {
            overrides.OnContactValidate = new String(callbacks.OnContactValidate);
        }
        if (callbacks.OnContactAdded) {
            overrides.OnContactAdded = new String(callbacks.OnContactAdded);
        }
        if (callbacks.OnContactPersisted) {
            overrides.OnContactPersisted = new String(callbacks.OnContactPersisted);
        }
        if (callbacks.OnContactRemoved) {
            overrides.OnContactRemoved = new String(callbacks.OnContactRemoved);
        }

        const msg = Object.create(null);
        msg.type = 'override-contacts';
        msg.listener = 'contacts';
        msg.overrides = overrides;
        this._manager.sendUncompressed(msg);
    }

    createBody(component) {
        const cb = this._manager.commandsBuffer;

        cb.writeOperator(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_CREATOR);
        cb.writeCommand(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_CREATE_BODY);

        component.writeComponentData(cb);
    }

    processCommands(cb) {
        const command = cb.readCommand();

        switch (command) {
            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_UPDATE_TRANSFORMS:
                // TODO
                // move to ResponseHandler
                _system_mjs__WEBPACK_IMPORTED_MODULE_4__.ShapeComponentSystem.updateDynamic(cb);
                break;

            // TODO
            // handle by manager directly
            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_CAST_RAY:
            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_CAST_SHAPE:
                _response_handler_mjs__WEBPACK_IMPORTED_MODULE_3__.ResponseHandler.handleQuery(cb, this.entityMap, this._manager.queryMap);
                break;

            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_REPORT_CONTACTS:
                _response_handler_mjs__WEBPACK_IMPORTED_MODULE_3__.ResponseHandler.handleContact(cb, this.entityMap, this._manager.config);
                break;
        }
    }

    requestIsometry() {
        this.fire('write-isometry');
    }

    initializeComponentData(component, data) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            const ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.verifyProperties(data, this.schema);
            if (!ok)
                return;
        }

        super.initializeComponentData(component, data);
    }
}





/***/ }),

/***/ "./src/physics/components/jolt/char/component.mjs":
/*!********************************************************!*\
  !*** ./src/physics/components/jolt/char/component.mjs ***!
  \********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CharComponent: () => (/* binding */ CharComponent)
/* harmony export */ });
/* harmony import */ var _debug_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../debug.mjs */ "./src/physics/debug.mjs");
/* harmony import */ var _component_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../component.mjs */ "./src/physics/components/jolt/component.mjs");
/* harmony import */ var _constants_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../constants.mjs */ "./src/physics/components/jolt/constants.mjs");
/* harmony import */ var _system_mjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../system.mjs */ "./src/physics/components/jolt/system.mjs");





class CharComponent extends _component_mjs__WEBPACK_IMPORTED_MODULE_1__.ShapeComponent {
    // ---- SHAPE PROPS ----

    // Shape type
    _shape = _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.SHAPE_CAPSULE;

    // ---- CHARACTER PROPS ----

    // Vector indicating the up direction of the character.
    _up = pc.Vec3.UP;

    // Enables/disables the use of motion state for the character.
    _useMotionState = true;

    // Character linear velocity. Must be set by user. Backend will use it to calculate next
    // position.
    _linearVelocity = new pc.Vec3();

    // Plane, defined in local space relative to the character. Every contact 
    // behind this plane can support the character, every contact in front of 
    // this plane is treated as only colliding with the player. Default: Accept
    // any contact.
    _supportingVolume = new pc.Plane(pc.Vec3.UP, -1);

    // Maximum angle of slope that character can still walk on (radians).
    _maxSlopeAngle = 45 * pc.math.DEG_TO_RAD;

    // Character mass (kg). Used to push down objects with gravity when the 
    // character is standing on top.
    _mass = 70;

    // Maximum force with which the character can push other bodies (N).
    _maxStrength = 100;

    // An extra offset applied to the shape in local space.
    _shapeOffset = pc.Vec3.ZERO;

    // When colliding with back faces, the character will not be able to move through
    // back facing triangles. Use this if you have triangles that need to collide
    // on both sides.
    _backFaceMode = pc.JOLT_BFM_COLLIDE_BACK_FACES;

    // How far to scan outside of the shape for predictive contacts. A value of 0 will
    // most likely cause the character to get stuck as it cannot properly calculate a sliding
    // direction anymore. A value that's too high will cause ghost collisions.
    _predictiveContactDistance = 0.1;

    // Max amount of collision loops
    _maxCollisionIterations = 5;

    // How often to try stepping in the constraint solving.
    _maxConstraintIterations = 15;

    // Early out condition: If this much time is left to simulate we are done.
    _minTimeRemaining = 1.0e-4;

    // How far we're willing to penetrate geometry
    _collisionTolerance = 1.0e-3;

    // How far we try to stay away from the geometry, this ensures that the sweep will
    // hit as little as possible lowering the collision cost and reducing the risk of
    // getting stuck.
    _characterPadding = 0.02;

    // Max num hits to collect in order to avoid excess of contact points collection.
    _maxNumHits = 256;

    // Cos(angle) where angle is the maximum angle between two hits contact normals that 
    // are allowed to be merged during hit reduction. Default is around 2.5 degrees. Set 
    // to -1 to turn off.
    _hitReductionCosMaxAngle = 0.999;

    // This value governs how fast a penetration will be resolved, 0 = nothing is resolved,
    // 1 = everything in one update.
    _penetrationRecoverySpeed = 1;

    // Read-only. True if the character is supported by normal or steep ground.
    _isSupported = false;

    // Read-only. True if the ground is too steep to walk on.
    _isSlopeTooSteep = false;

    // Read-only. If the character is supported, this will tell the ground entity.
    _groundEntity = null;

    // Read-only. If the character is supported, this will tell the ground normal. Otherwise
    // will be a zero vector.
    _groundNormal = new pc.Vec3();

    // If the character is not supported, will be a zero vector.
    _groundVelocity = new pc.Vec3();

    // Ground state.
    _state = pc.JOLT_GROUND_STATE_NOT_SUPPORTED;

    // User data to be associated with a shape.
    _userData = null;

    constructor(system, entity) {
        super(system, entity);
    }

    get linearVelocity() {
        return this._linearVelocity;
    }

    set linearVelocity(vel) {
        _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkVec(vel, `Invalid character linear velocity`, vel);
        this.system.addCommand(
            _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_CHAR_SET_LIN_VEL, this._index,
            vel, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false
        );
    }

    get userData() {
        return this._userData;
    }

    set userData(num) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            let ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(num, `Invalid user data value. Should be a number: ${ num }`);
            if (!ok)
                return;
        }

        this._userData = num;

        this.system.addCommand(
            _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_SET_USER_DATA, this._index,
            num, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false
        );        
    }

    setShape(shapeIndex = null, callback = null) {
        const system = this.system;

        system.addCommand(
            _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_CHAR_SET_SHAPE, this._index,
            !!callback, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_BOOL, false,
            shapeIndex, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, true
        );

        if (callback) {
            this._writeCallback(callback);
        }
    }

    writeComponentData(cb) {
        const ok = _component_mjs__WEBPACK_IMPORTED_MODULE_1__.ShapeComponent.writeShapeData(cb, this, true /* force write rotation */);
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && !ok) {
            _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.warn('Error creating a shape data.');
            return false;
        }

        cb.write(this._index, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);
        cb.write(this._useMotionState, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_BOOL, false);
        cb.write(this._up, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
        cb.write(this._supportingVolume, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_PLANE, false);
        cb.write(this._maxSlopeAngle, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._mass, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxStrength, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._shapeOffset, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
        cb.write(this._backFaceMode, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT8, false);
        cb.write(this._predictiveContactDistance, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxCollisionIterations, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);
        cb.write(this._maxConstraintIterations, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);
        cb.write(this._minTimeRemaining, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._collisionTolerance, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._characterPadding, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxNumHits, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);
        cb.write(this._hitReductionCosMaxAngle, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._penetrationRecoverySpeed, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);

        const entity = this.entity;
        const pos = entity.getPosition();
        const rot = entity.getRotation();

        // Loss of precision for pos/rot (64 -> 32)
        cb.write(pos, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
        cb.write(rot, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);

        _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && cb.write(this._debugDraw, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_BOOL, false);
    }

    updateTransforms(cb, map) {
        const entity = this.entity;

        entity.setPosition(
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32),
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32),
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32)
        );

        entity.setRotation(
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32),
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32),
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32),
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32)
        );

        this._linearVelocity.set(
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32),
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32),
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32)
        );

        const isSupported = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_BOOL);
        this._isSupported = isSupported;
        this._state = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_UINT8);

        if (isSupported && cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_BOOL)) {
            const groundIndex = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_UINT32);
            this._groundEntity = map.get(groundIndex) || null;
            this._isSlopeTooSteep = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_BOOL);
            this._groundVelocity.set(
                cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32),
                cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32),
                cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32)
            );
            this._groundNormal.set(
                cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32),
                cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32),
                cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32)
            );
        } else {
            this._groundEntity = null;
            this._groundNormal.set(0, 0, 0);
            this._groundVelocity.set(0, 0, 0);
        }
    }

    onEnable() {
        const system = this.system;

        this._index = system.getIndex(this.entity);

        system.createCharacter(this);
    }

    _writeCallback(callback) {
        if (callback) {
            const system = this.system;
            const callbackIndex = system.getCallbackIndex(callback);
            system.addCommandArgs(callbackIndex, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);
        }
    }
}





/***/ }),

/***/ "./src/physics/components/jolt/char/system.mjs":
/*!*****************************************************!*\
  !*** ./src/physics/components/jolt/char/system.mjs ***!
  \*****************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CharComponentSystem: () => (/* binding */ CharComponentSystem)
/* harmony export */ });
/* harmony import */ var _util_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../util.mjs */ "./src/physics/util.mjs");
/* harmony import */ var _debug_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../debug.mjs */ "./src/physics/debug.mjs");
/* harmony import */ var _constants_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../constants.mjs */ "./src/physics/components/jolt/constants.mjs");
/* harmony import */ var _indexed_cache_mjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../indexed-cache.mjs */ "./src/physics/indexed-cache.mjs");
/* harmony import */ var _component_mjs__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./component.mjs */ "./src/physics/components/jolt/char/component.mjs");
/* harmony import */ var _response_handler_mjs__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../response-handler.mjs */ "./src/physics/components/jolt/response-handler.mjs");
/* harmony import */ var _system_mjs__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../system.mjs */ "./src/physics/components/jolt/system.mjs");








const schema = [
    // Jolt virtual character
    'up',
    'supportingVolume',
    'maxSlopeAngle',
    'mass',
    'maxStrength',
    'shapeOffset',
    'backFaceMode',
    'predictiveContactDistance',
    'maxCollisionIterations',
    'maxConstraintIterations',
    'minTimeRemaining',
    'collisionTolerance',
    'characterPadding',
    'maxNumHits',
    'hitReductionCosMaxAngle',
    'penetrationRecoverySpeed',
    'isSupported',
    'isSlopeTooSteep',
    'groundEntity',
    'groundNormal',
    'groundVelocity',
    'state'
];

class CharComponentSystem extends _system_mjs__WEBPACK_IMPORTED_MODULE_6__.ShapeComponentSystem {
    constructor(app, manager, id) {
        super(app, manager);

        this.id = 'char';
        this.schema = [...this.schema, ...schema];
        this.ComponentType = _component_mjs__WEBPACK_IMPORTED_MODULE_4__.CharComponent;

        this._queryMap = new _indexed_cache_mjs__WEBPACK_IMPORTED_MODULE_3__.IndexedCache();

        this._exposeConstants();

        manager.systems.set(id, this);

        (0,_util_mjs__WEBPACK_IMPORTED_MODULE_0__.buildAccessors)(this, this.schema);
    }

    getCallbackIndex(callback) {
        return this._manager.queryMap.add(callback);
    }

    initializeComponentData(component, data) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
            const ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.verifyProperties(data, this.schema);
            if (!ok) return;
        }

        super.initializeComponentData(component, data);
    }

    processCommands(cb) {
        const command = cb.readCommand();

        switch (command) {
            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_UPDATE_TRANSFORMS:
                this._updateCharTransforms(cb);
                break;

            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_REPORT_CONTACTS:
                _response_handler_mjs__WEBPACK_IMPORTED_MODULE_5__.ResponseHandler.handleCharContacts(cb, this.entityMap);
                break;

            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_REPORT_SET_SHAPE:
                _response_handler_mjs__WEBPACK_IMPORTED_MODULE_5__.ResponseHandler.handleCharSetShape(cb, this._manager.queryMap);
                break;
        }
    }

    createCharacter(component) {
        const cb = this._manager.commandsBuffer;

        cb.writeOperator(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_CREATOR);
        cb.writeCommand(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_CREATE_CHAR);

        component.writeComponentData(cb);
    }

    overrideContacts(callbacks = {}) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.dev) {
            !!callbacks.OnAdjustBodyVelocity && _debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert(typeof callbacks.OnAdjustBodyVelocity === 'function', 'OnAdjustBodyVelocity must be a function', callbacks);
            !!callbacks.OnContactValidate && _debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert(typeof callbacks.OnContactValidate === 'function', 'OnContactValidate must be a function', callbacks);
            !!callbacks.OnContactAdded && _debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert(typeof callbacks.OnContactAdded === 'function', 'OnContactAdded must be a function', callbacks);
            !!callbacks.OnContactSolve && _debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.assert(typeof callbacks.OnContactSolve === 'function', 'OnContactSolve must be a function', callbacks);
        }

        const overrides = Object.create(null);
        if (callbacks.OnAdjustBodyVelocity) {
            overrides.OnAdjustBodyVelocity = new String(callbacks.OnAdjustBodyVelocity);
        }
        if (callbacks.OnContactValidate) {
            overrides.OnContactValidate = new String(callbacks.OnContactValidate);
        }
        if (callbacks.OnContactAdded) {
            overrides.OnContactAdded = new String(callbacks.OnContactAdded);
        }
        if (callbacks.OnContactSolve) {
            overrides.OnContactSolve = new String(callbacks.OnContactSolve);
        }

        const msg = Object.create(null);
        msg.type = 'override-contacts';
        msg.listener = 'char';
        msg.overrides = overrides;
        this._manager.sendUncompressed(msg);
    }

    _exposeConstants() { }

    _updateCharTransforms(cb) {
        const charsCount = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_UINT32);

        for (let i = 0; i < charsCount; i++) {
            const index = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_UINT32);

            const entity = this.entityMap.get(index);
            if (!entity) continue;

            entity.char.updateTransforms(cb, this.entityMap);
        }
    }
}



/***/ }),

/***/ "./src/physics/components/jolt/component.mjs":
/*!***************************************************!*\
  !*** ./src/physics/components/jolt/component.mjs ***!
  \***************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ShapeComponent: () => (/* binding */ ShapeComponent)
/* harmony export */ });
/* harmony import */ var _debug_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../debug.mjs */ "./src/physics/debug.mjs");
/* harmony import */ var _util_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../util.mjs */ "./src/physics/util.mjs");
/* harmony import */ var _constants_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./constants.mjs */ "./src/physics/components/jolt/constants.mjs");




const quat = new pc.Quat();

class ShapeComponent extends pc.EventHandler {

    // ---- COMPONENT PROPS ----

    // Shape type
    _shape = _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.SHAPE_BOX;

    // Enable / disable component
    _enabled = true;

    // Automatically moves dynamic bodies, when the position is set on entity.
    _trackDynamic = true;

    // Unique body index. This can change during entity lifecycle, e.g. every time entity is enabled, a new
    // index is assigned and a new body is created. The index is used to map entity to body. Indices can be reused.
    _index = -1;

    // Render asset ID, used for mesh or convex hulls.
    _renderAsset = null;

    // Meshes used for mesh or convex hulls
    _meshes = null;

    // Tells if the component describes a compound child
    _isCompoundChild = false;

    // Applies entity scale on the shape
    _useEntityScale = true;

    // Read-only. Constraint indices applied on this body.
    _constraints = new Map();    

    // Debug draw
    _debugDraw = false;

    // ---- SHAPE PROPS ----

    // Half extents for a box shape
    _halfExtent = new pc.Vec3(0.5, 0.5, 0.5);

    // Raidus for radius based shapes
    _radius = 0.5;

    // Internally the convex radius will be subtracted from the half extent so the total box will not grow with the convex radius
    _convexRadius = 0.05;

    // Half height of radius based shapes, e.g. cylinder, capsule
    _halfHeight = 0.5;

    // Density of the object in kg / m^3
    _density = 1000;

    // Shape local position offset
    _shapePosition = pc.Vec3.ZERO;

    // Shape local rotation offset
    _shapeRotation = pc.Vec3.ZERO;

    // Offset center of mass in local space of the body. Does not move the shape.
    _massOffset = pc.Vec3.ZERO;

    _hfSamples = null;

    _hfSampleCount = 0;

    // The HeightField is divided in blocks of hfBlockSize * hfBlockSize * 2 triangles and the
    // acceleration structure culls blocks only, bigger block sizes reduce memory consumption
    // but also reduce query performance. Sensible values are [2, 8], does not need to be a
    // power of 2. Note that at run-time Jolt performs one more grid subdivision, so the effective
    // block size is half of what is provided here.
    _hfBlockSize = 2;

    // How many bits per sample to use to compress the HeightField. Can be in the range [1, 8].
    // Note that each sample is compressed relative to the min/max value of its block of
    // hfBlockSize * hfBlockSize pixels so the effective precision is higher. Also note that
    // increasing hfBlockSize saves more memory than reducing the amount of bits per sample.
    _hfBitsPerSample = 8;

    // Cosine of the threshold angle (if the angle between the two triangles in HeightField is
    // bigger than this, the edge is active, note that a concave edge is always inactive). Setting
    // this value too small can cause ghost collisions with edges, setting it too big can cause
    // depenetration artifacts (objects not depenetrating quickly). Valid ranges are between
    // cos(0 degrees) and cos(90 degrees). The default value is cos(5 degrees).
    _hfActiveEdgeCosThresholdAngle = 0.996195;

    _hfScale = pc.Vec3.ONE;

    // The height field is a surface defined by: hfOffset + hfScale * (x, hfHeightSamples[y * hfSampleCount + x], y).
    // where x and y are integers in the range x and y e [0, hfSampleCount - 1].
    _hfOffset = pc.Vec3.ZERO;

    // The ComponentSystem used to create this Component.
    system;

    // The Entity that this Component is attached to.
    entity;

    constructor(system, entity) {
        super();

        this.system = system;
        this.entity = entity;

        if (system.schema && !this._accessorsBuilt) {
            (0,_util_mjs__WEBPACK_IMPORTED_MODULE_1__.buildAccessors)(this, system.schema);
        }

        this.on('set', function (name, oldValue, newValue) {
            this.fire('set_' + name, name, oldValue, newValue);
        });

        this.on('set_enabled', this.onSetEnabled, this);
    }


    get constraints() {
        return this._constraints;
    }
    
    onSetEnabled(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if (this.entity.enabled) {
                if (newValue) {
                    this.onEnable();
                } else {
                    this.onDisable();
                }
            }
        }
    }

    onEnable() {}

    onDisable() {
        const constraints = this._constraints;

        constraints.forEach((entity2, index) => {
            entity2?.body?.constraints.delete(index);
            this.system.freeConstraintIndex(index);
        });
        constraints.clear();
    }

    onPostStateChange() {}

    static writeShapeData(cb, props, forceWriteRotation = false) {
        const shape = props.shape;
        cb.write(shape, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT8, false);
    
        let useEntityScale = props.useEntityScale;
        let scale;
        if (useEntityScale) {
            scale = props.scale || props.entity.getLocalScale();
            if (scale.x === 1 && scale.y === 1 && scale.z === 1) {
                useEntityScale = false;
            }
        }

        cb.write(useEntityScale, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_BOOL, false);
        if (useEntityScale || (
            shape === _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.SHAPE_MESH ||
            shape === _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.SHAPE_CONVEX_HULL)) {
            // Potential precision loss 64 -> 32
            cb.write(scale, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
        }
    
        let ok = true;
        switch (shape) {
            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.SHAPE_BOX:
                cb.write(props.halfExtent, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
                cb.write(props.convexRadius, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                break;
    
            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.SHAPE_CAPSULE:
                cb.write(props.halfHeight, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                cb.write(props.radius, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                break;
    
            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.SHAPE_CYLINDER:
                cb.write(props.halfHeight, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                cb.write(props.radius, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                cb.write(props.convexRadius, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                break;
    
            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.SHAPE_SPHERE:
                cb.write(props.radius, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                break;
    
            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.SHAPE_STATIC_COMPOUND:
                ok = ShapeComponent.addCompoundChildren(cb, props.entity);
                break;
    
            // intentional fall-through
            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.SHAPE_CONVEX_HULL:
            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.SHAPE_MESH:
                ShapeComponent.addMeshes(props.meshes, cb);
                break;
            
            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.SHAPE_HEIGHTFIELD:
                cb.write(props.hfOffset, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
                cb.write(props.hfScale, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
                cb.write(props.hfSampleCount, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);
                cb.write(props.hfBlockSize, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT8, false);
                cb.write(props.hfBitsPerSample, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT8, false);
                cb.write(props.hfActiveEdgeCosThresholdAngle, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                cb.addBuffer(props.hfSamples.buffer);
                break;
    
            default:
                _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.warn('Unsupperted shape type', shape);
                return false;
        }
    
        const isCompoundChild = props.isCompoundChild;
        cb.write(isCompoundChild, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_BOOL, false);
        if (!isCompoundChild) {
            cb.write(props.density, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        }
    
        const position = props.shapePosition;
        const rotation = props.shapeRotation;
        const massOffset = props.massOffset;
        const hasPositionOffset = !position.equals(pc.Vec3.ZERO);
        const hasRotationOffset = forceWriteRotation || !rotation.equals(pc.Vec3.ZERO);
        const hasShapeOffset = hasPositionOffset || hasRotationOffset;
        const hasMassOffset = !massOffset.equals(pc.Vec3.ZERO);

        cb.write(hasShapeOffset, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_BOOL, false);
        if (hasShapeOffset) {
            quat.setFromEulerAngles(rotation);
            cb.write(position, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
            cb.write(quat, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
        }

        cb.write(hasMassOffset, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_BOOL, false);
        if (hasMassOffset) {
            cb.write(massOffset, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
        }

        return ok;
    }

    static addCompoundChildren(cb, parent) {
        const components = parent.findComponents('body');
        const count = components.length;
        const childrenCount = count - 1; // -1 to exclude the parent

        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && childrenCount === 0) {
            _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.warn('Trying to create a static (immutable) compound body without children shapes. Aborting.');
            return false;
        }

        cb.write(childrenCount, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < count; i++) {
            const component = components[i];
            if (component.entity === parent) {
                continue;
            }

            const ok = ShapeComponent.writeShapeData(cb, component);
            if (!ok) {
                return false;
            }

            const entity = component.entity;
            const pos = entity.getLocalPosition();
            const rot = entity.getLocalRotation();

            // Loss of precision for pos/rot (64 -> 32)
            cb.write(pos, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
            cb.write(rot, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
        }

        return true;
    }

    static addMeshes(meshes, cb) {
        for (let i = 0; i < meshes.length; i++) {
            const mesh = meshes[i];
            const vb = mesh.vertexBuffer;
            const ib = mesh.indexBuffer[0];
            const format = vb.getFormat();

            for (let i = 0; i < format.elements.length; i++) {
                const element = format.elements[i];
                if (element.name === pc.SEMANTIC_POSITION) {
                    cb.write(mesh.primitive[0].base, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT8, false);
                    cb.write(element.offset, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);
                    cb.write(element.stride / _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.FLOAT32_SIZE, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT8, false);
                    cb.addBuffer(vb.storage);
                    break;
                }
            }

            cb.write(vb.numVertices, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);
            cb.write(ib.numIndices, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);

            // TODO
            // workaround until this is fixed:
            // https://github.com/playcanvas/engine/issues/5869
            // buffer.addBuffer(ib.storage);

            const storage = ib.storage;
            const isView = ArrayBuffer.isView(storage);

            let byteLength, byteOffset;
            if (isView) {
                byteLength = storage.byteLength;
                byteOffset = storage.byteOffset;
            } else {
                byteLength = storage.byteLength / ib.bytesPerIndex;
                byteOffset = 0;
            }

            cb.write(byteLength, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);
            cb.write(byteOffset, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);
            cb.addBuffer(isView ? storage.buffer : storage);
        }
    }
}





/***/ }),

/***/ "./src/physics/components/jolt/constants.mjs":
/*!***************************************************!*\
  !*** ./src/physics/components/jolt/constants.mjs ***!
  \***************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BUFFER_READ_BOOL: () => (/* binding */ BUFFER_READ_BOOL),
/* harmony export */   BUFFER_READ_FLOAT32: () => (/* binding */ BUFFER_READ_FLOAT32),
/* harmony export */   BUFFER_READ_INT32: () => (/* binding */ BUFFER_READ_INT32),
/* harmony export */   BUFFER_READ_UINT16: () => (/* binding */ BUFFER_READ_UINT16),
/* harmony export */   BUFFER_READ_UINT32: () => (/* binding */ BUFFER_READ_UINT32),
/* harmony export */   BUFFER_READ_UINT8: () => (/* binding */ BUFFER_READ_UINT8),
/* harmony export */   BUFFER_WRITE_BOOL: () => (/* binding */ BUFFER_WRITE_BOOL),
/* harmony export */   BUFFER_WRITE_FLOAT32: () => (/* binding */ BUFFER_WRITE_FLOAT32),
/* harmony export */   BUFFER_WRITE_INT32: () => (/* binding */ BUFFER_WRITE_INT32),
/* harmony export */   BUFFER_WRITE_JOLTVEC32: () => (/* binding */ BUFFER_WRITE_JOLTVEC32),
/* harmony export */   BUFFER_WRITE_PLANE: () => (/* binding */ BUFFER_WRITE_PLANE),
/* harmony export */   BUFFER_WRITE_UINT16: () => (/* binding */ BUFFER_WRITE_UINT16),
/* harmony export */   BUFFER_WRITE_UINT32: () => (/* binding */ BUFFER_WRITE_UINT32),
/* harmony export */   BUFFER_WRITE_UINT8: () => (/* binding */ BUFFER_WRITE_UINT8),
/* harmony export */   BUFFER_WRITE_VEC32: () => (/* binding */ BUFFER_WRITE_VEC32),
/* harmony export */   CMD_ADD_ANGULAR_IMPULSE: () => (/* binding */ CMD_ADD_ANGULAR_IMPULSE),
/* harmony export */   CMD_ADD_FORCE: () => (/* binding */ CMD_ADD_FORCE),
/* harmony export */   CMD_ADD_IMPULSE: () => (/* binding */ CMD_ADD_IMPULSE),
/* harmony export */   CMD_ADD_TORQUE: () => (/* binding */ CMD_ADD_TORQUE),
/* harmony export */   CMD_APPLY_BUOYANCY_IMPULSE: () => (/* binding */ CMD_APPLY_BUOYANCY_IMPULSE),
/* harmony export */   CMD_CAST_RAY: () => (/* binding */ CMD_CAST_RAY),
/* harmony export */   CMD_CAST_SHAPE: () => (/* binding */ CMD_CAST_SHAPE),
/* harmony export */   CMD_CHANGE_GRAVITY: () => (/* binding */ CMD_CHANGE_GRAVITY),
/* harmony export */   CMD_CHAR_SET_LIN_VEL: () => (/* binding */ CMD_CHAR_SET_LIN_VEL),
/* harmony export */   CMD_CHAR_SET_SHAPE: () => (/* binding */ CMD_CHAR_SET_SHAPE),
/* harmony export */   CMD_CREATE_BODY: () => (/* binding */ CMD_CREATE_BODY),
/* harmony export */   CMD_CREATE_CHAR: () => (/* binding */ CMD_CREATE_CHAR),
/* harmony export */   CMD_CREATE_CONSTRAINT: () => (/* binding */ CMD_CREATE_CONSTRAINT),
/* harmony export */   CMD_CREATE_GROUPS: () => (/* binding */ CMD_CREATE_GROUPS),
/* harmony export */   CMD_CREATE_SHAPE: () => (/* binding */ CMD_CREATE_SHAPE),
/* harmony export */   CMD_CREATE_SOFT_BODY: () => (/* binding */ CMD_CREATE_SOFT_BODY),
/* harmony export */   CMD_CREATE_VEHICLE: () => (/* binding */ CMD_CREATE_VEHICLE),
/* harmony export */   CMD_DESTROY_BODY: () => (/* binding */ CMD_DESTROY_BODY),
/* harmony export */   CMD_DESTROY_CONSTRAINT: () => (/* binding */ CMD_DESTROY_CONSTRAINT),
/* harmony export */   CMD_DESTROY_SHAPE: () => (/* binding */ CMD_DESTROY_SHAPE),
/* harmony export */   CMD_MOVE_BODY: () => (/* binding */ CMD_MOVE_BODY),
/* harmony export */   CMD_REPORT_CONTACTS: () => (/* binding */ CMD_REPORT_CONTACTS),
/* harmony export */   CMD_REPORT_SET_SHAPE: () => (/* binding */ CMD_REPORT_SET_SHAPE),
/* harmony export */   CMD_RESET_VELOCITIES: () => (/* binding */ CMD_RESET_VELOCITIES),
/* harmony export */   CMD_SET_ANG_VEL: () => (/* binding */ CMD_SET_ANG_VEL),
/* harmony export */   CMD_SET_CONSTRAINT_ENABLED: () => (/* binding */ CMD_SET_CONSTRAINT_ENABLED),
/* harmony export */   CMD_SET_DRIVER_INPUT: () => (/* binding */ CMD_SET_DRIVER_INPUT),
/* harmony export */   CMD_SET_LIN_VEL: () => (/* binding */ CMD_SET_LIN_VEL),
/* harmony export */   CMD_SET_MOTION_TYPE: () => (/* binding */ CMD_SET_MOTION_TYPE),
/* harmony export */   CMD_SET_USER_DATA: () => (/* binding */ CMD_SET_USER_DATA),
/* harmony export */   CMD_TOGGLE_GROUP_PAIR: () => (/* binding */ CMD_TOGGLE_GROUP_PAIR),
/* harmony export */   CMD_UPDATE_TRANSFORMS: () => (/* binding */ CMD_UPDATE_TRANSFORMS),
/* harmony export */   CMD_USE_MOTION_STATE: () => (/* binding */ CMD_USE_MOTION_STATE),
/* harmony export */   COMPONENT_SYSTEM_BODY: () => (/* binding */ COMPONENT_SYSTEM_BODY),
/* harmony export */   COMPONENT_SYSTEM_CHAR: () => (/* binding */ COMPONENT_SYSTEM_CHAR),
/* harmony export */   COMPONENT_SYSTEM_SOFT_BODY: () => (/* binding */ COMPONENT_SYSTEM_SOFT_BODY),
/* harmony export */   COMPONENT_SYSTEM_VEHICLE: () => (/* binding */ COMPONENT_SYSTEM_VEHICLE),
/* harmony export */   CONSTRAINT_SIX_DOF_ROTATION_X: () => (/* binding */ CONSTRAINT_SIX_DOF_ROTATION_X),
/* harmony export */   CONSTRAINT_SIX_DOF_ROTATION_Y: () => (/* binding */ CONSTRAINT_SIX_DOF_ROTATION_Y),
/* harmony export */   CONSTRAINT_SIX_DOF_ROTATION_Z: () => (/* binding */ CONSTRAINT_SIX_DOF_ROTATION_Z),
/* harmony export */   CONSTRAINT_SIX_DOF_TRANSLATION_X: () => (/* binding */ CONSTRAINT_SIX_DOF_TRANSLATION_X),
/* harmony export */   CONSTRAINT_SIX_DOF_TRANSLATION_Y: () => (/* binding */ CONSTRAINT_SIX_DOF_TRANSLATION_Y),
/* harmony export */   CONSTRAINT_SIX_DOF_TRANSLATION_Z: () => (/* binding */ CONSTRAINT_SIX_DOF_TRANSLATION_Z),
/* harmony export */   CONSTRAINT_SPACE_LOCAL: () => (/* binding */ CONSTRAINT_SPACE_LOCAL),
/* harmony export */   CONSTRAINT_SPACE_WORLD: () => (/* binding */ CONSTRAINT_SPACE_WORLD),
/* harmony export */   CONSTRAINT_TYPE_CONE: () => (/* binding */ CONSTRAINT_TYPE_CONE),
/* harmony export */   CONSTRAINT_TYPE_DISTANCE: () => (/* binding */ CONSTRAINT_TYPE_DISTANCE),
/* harmony export */   CONSTRAINT_TYPE_FIXED: () => (/* binding */ CONSTRAINT_TYPE_FIXED),
/* harmony export */   CONSTRAINT_TYPE_HINGE: () => (/* binding */ CONSTRAINT_TYPE_HINGE),
/* harmony export */   CONSTRAINT_TYPE_POINT: () => (/* binding */ CONSTRAINT_TYPE_POINT),
/* harmony export */   CONSTRAINT_TYPE_SIX_DOF: () => (/* binding */ CONSTRAINT_TYPE_SIX_DOF),
/* harmony export */   CONSTRAINT_TYPE_SLIDER: () => (/* binding */ CONSTRAINT_TYPE_SLIDER),
/* harmony export */   CONSTRAINT_TYPE_SWING_TWIST: () => (/* binding */ CONSTRAINT_TYPE_SWING_TWIST),
/* harmony export */   CONTACT_TYPE_ADDED: () => (/* binding */ CONTACT_TYPE_ADDED),
/* harmony export */   CONTACT_TYPE_PERSISTED: () => (/* binding */ CONTACT_TYPE_PERSISTED),
/* harmony export */   CONTACT_TYPE_REMOVED: () => (/* binding */ CONTACT_TYPE_REMOVED),
/* harmony export */   FLOAT32_SIZE: () => (/* binding */ FLOAT32_SIZE),
/* harmony export */   INT32_SIZE: () => (/* binding */ INT32_SIZE),
/* harmony export */   OBJECT_LAYER_MOVING: () => (/* binding */ OBJECT_LAYER_MOVING),
/* harmony export */   OBJECT_LAYER_NON_MOVING: () => (/* binding */ OBJECT_LAYER_NON_MOVING),
/* harmony export */   OPERATOR_CLEANER: () => (/* binding */ OPERATOR_CLEANER),
/* harmony export */   OPERATOR_CREATOR: () => (/* binding */ OPERATOR_CREATOR),
/* harmony export */   OPERATOR_MODIFIER: () => (/* binding */ OPERATOR_MODIFIER),
/* harmony export */   OPERATOR_QUERIER: () => (/* binding */ OPERATOR_QUERIER),
/* harmony export */   SHAPE_BOX: () => (/* binding */ SHAPE_BOX),
/* harmony export */   SHAPE_CAPSULE: () => (/* binding */ SHAPE_CAPSULE),
/* harmony export */   SHAPE_CONVEX_HULL: () => (/* binding */ SHAPE_CONVEX_HULL),
/* harmony export */   SHAPE_CYLINDER: () => (/* binding */ SHAPE_CYLINDER),
/* harmony export */   SHAPE_HEIGHTFIELD: () => (/* binding */ SHAPE_HEIGHTFIELD),
/* harmony export */   SHAPE_MESH: () => (/* binding */ SHAPE_MESH),
/* harmony export */   SHAPE_SPHERE: () => (/* binding */ SHAPE_SPHERE),
/* harmony export */   SHAPE_STATIC_COMPOUND: () => (/* binding */ SHAPE_STATIC_COMPOUND),
/* harmony export */   SPRING_MODE_FREQUENCY: () => (/* binding */ SPRING_MODE_FREQUENCY),
/* harmony export */   SPRING_MODE_STIFFNESS: () => (/* binding */ SPRING_MODE_STIFFNESS),
/* harmony export */   UINT16_SIZE: () => (/* binding */ UINT16_SIZE),
/* harmony export */   UINT32_SIZE: () => (/* binding */ UINT32_SIZE),
/* harmony export */   UINT8_SIZE: () => (/* binding */ UINT8_SIZE),
/* harmony export */   VEHICLE_CAST_TYPE_CYLINDER: () => (/* binding */ VEHICLE_CAST_TYPE_CYLINDER),
/* harmony export */   VEHICLE_CAST_TYPE_RAY: () => (/* binding */ VEHICLE_CAST_TYPE_RAY),
/* harmony export */   VEHICLE_CAST_TYPE_SPHERE: () => (/* binding */ VEHICLE_CAST_TYPE_SPHERE),
/* harmony export */   VEHICLE_TYPE_MOTORCYCLE: () => (/* binding */ VEHICLE_TYPE_MOTORCYCLE),
/* harmony export */   VEHICLE_TYPE_TRACK: () => (/* binding */ VEHICLE_TYPE_TRACK),
/* harmony export */   VEHICLE_TYPE_WHEEL: () => (/* binding */ VEHICLE_TYPE_WHEEL)
/* harmony export */ });
const OPERATOR_CREATOR = 0;
const OPERATOR_MODIFIER = 1;
const OPERATOR_QUERIER = 2;
const OPERATOR_CLEANER = 3;

const CONSTRAINT_TYPE_FIXED = 0;
const CONSTRAINT_TYPE_POINT = 1;
const CONSTRAINT_TYPE_DISTANCE = 2;
const CONSTRAINT_TYPE_HINGE = 3;
const CONSTRAINT_TYPE_SLIDER = 4;
const CONSTRAINT_TYPE_CONE = 5;
const CONSTRAINT_TYPE_SWING_TWIST = 6;
const CONSTRAINT_TYPE_SIX_DOF = 7;

const CONSTRAINT_SIX_DOF_TRANSLATION_X = 0;
const CONSTRAINT_SIX_DOF_TRANSLATION_Y = 1;
const CONSTRAINT_SIX_DOF_TRANSLATION_Z = 2;
const CONSTRAINT_SIX_DOF_ROTATION_X = 3;
const CONSTRAINT_SIX_DOF_ROTATION_Y = 4;
const CONSTRAINT_SIX_DOF_ROTATION_Z = 5;

const CONSTRAINT_SPACE_LOCAL = 0;
const CONSTRAINT_SPACE_WORLD = 1;

const SPRING_MODE_FREQUENCY = 0;
const SPRING_MODE_STIFFNESS = 1;

const VEHICLE_CAST_TYPE_RAY = 0;
const VEHICLE_CAST_TYPE_SPHERE = 1;
const VEHICLE_CAST_TYPE_CYLINDER = 2;

const OBJECT_LAYER_NON_MOVING = 0;
const OBJECT_LAYER_MOVING = 1;

const SHAPE_BOX = 0;
const SHAPE_CAPSULE = 1;
const SHAPE_CYLINDER = 2;
const SHAPE_SPHERE = 3;
const SHAPE_MESH = 4;
const SHAPE_CONVEX_HULL = 5;
const SHAPE_STATIC_COMPOUND = 6;
const SHAPE_HEIGHTFIELD = 7;

const VEHICLE_TYPE_WHEEL = 0;
const VEHICLE_TYPE_TRACK = 1;
const VEHICLE_TYPE_MOTORCYCLE = 2;

const CONTACT_TYPE_ADDED = 0;
const CONTACT_TYPE_PERSISTED = 1;
const CONTACT_TYPE_REMOVED = 2;

const COMPONENT_SYSTEM_BODY = 0;
const COMPONENT_SYSTEM_CHAR = 1;
const COMPONENT_SYSTEM_VEHICLE = 2;
const COMPONENT_SYSTEM_SOFT_BODY = 3;

const FLOAT32_SIZE = Float32Array.BYTES_PER_ELEMENT;
const INT32_SIZE = Int32Array.BYTES_PER_ELEMENT;
const UINT32_SIZE = Uint32Array.BYTES_PER_ELEMENT;
const UINT16_SIZE = Uint16Array.BYTES_PER_ELEMENT;
const UINT8_SIZE = Uint8Array.BYTES_PER_ELEMENT;

const BUFFER_WRITE_UINT8 = 'writeUint8';
const BUFFER_WRITE_UINT16 = 'writeUint16';
const BUFFER_WRITE_UINT32 = 'writeUint32';
const BUFFER_WRITE_INT32 = 'writeInt32';
const BUFFER_WRITE_VEC32 = 'writeVector32';
const BUFFER_WRITE_FLOAT32 = 'writeFloat32';
const BUFFER_WRITE_BOOL = 'writeBool';
const BUFFER_WRITE_PLANE = 'writePlane';
const BUFFER_WRITE_JOLTVEC32 = 'writeJoltVec32';

const BUFFER_READ_UINT8 = 'readUint8';
const BUFFER_READ_UINT16 = 'readUint16';
const BUFFER_READ_UINT32 = 'readUint32';
const BUFFER_READ_INT32 = 'readInt32';
const BUFFER_READ_FLOAT32 = 'readFloat32';
const BUFFER_READ_BOOL = 'readBool';


let i = 0;
// frontend -> backend
const CMD_CREATE_BODY = i++;
const CMD_CREATE_CHAR = i++;
const CMD_CREATE_SHAPE = i++;
const CMD_CREATE_VEHICLE = i++;
const CMD_CREATE_SOFT_BODY = i++;
const CMD_ADD_FORCE = i++;
const CMD_ADD_IMPULSE = i++;
const CMD_APPLY_BUOYANCY_IMPULSE = i++;
const CMD_ADD_ANGULAR_IMPULSE = i++;
const CMD_ADD_TORQUE = i++;
const CMD_CAST_RAY = i++;
const CMD_CAST_SHAPE = i++;
const CMD_DESTROY_BODY = i++;
const CMD_DESTROY_SHAPE = i++;
const CMD_MOVE_BODY = i++;
const CMD_SET_LIN_VEL = i++;
const CMD_SET_ANG_VEL = i++;
const CMD_SET_MOTION_TYPE = i++;
const CMD_RESET_VELOCITIES = i++;
const CMD_TOGGLE_GROUP_PAIR = i++;
const CMD_CREATE_GROUPS = i++;
const CMD_CREATE_CONSTRAINT = i++;
const CMD_CHANGE_GRAVITY = i++;
const CMD_CHAR_SET_LIN_VEL = i++;
const CMD_CHAR_SET_SHAPE = i++;
const CMD_SET_USER_DATA = i++;
const CMD_USE_MOTION_STATE = i++;
const CMD_SET_CONSTRAINT_ENABLED = i++;
const CMD_DESTROY_CONSTRAINT = i++;
const CMD_SET_DRIVER_INPUT = i++;
// backend -> frontend
const CMD_UPDATE_TRANSFORMS = i++;
const CMD_REPORT_CONTACTS = i++;
const CMD_REPORT_SET_SHAPE = i++;


/***/ }),

/***/ "./src/physics/components/jolt/manager.mjs":
/*!*************************************************!*\
  !*** ./src/physics/components/jolt/manager.mjs ***!
  \*************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   JoltManager: () => (/* binding */ JoltManager)
/* harmony export */ });
/* harmony import */ var _debug_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../debug.mjs */ "./src/physics/debug.mjs");
/* harmony import */ var _indexed_cache_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../indexed-cache.mjs */ "./src/physics/indexed-cache.mjs");
/* harmony import */ var _manager_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../manager.mjs */ "./src/physics/manager.mjs");
/* harmony import */ var _component_mjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./component.mjs */ "./src/physics/components/jolt/component.mjs");
/* harmony import */ var _constants_mjs__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./constants.mjs */ "./src/physics/components/jolt/constants.mjs");
/* harmony import */ var _system_mjs__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./system.mjs */ "./src/physics/components/jolt/system.mjs");







class JoltManager extends _manager_mjs__WEBPACK_IMPORTED_MODULE_2__.PhysicsManager {
    // https://jrouwe.github.io/JoltPhysics/class_fixed_constraint_settings.html
    static writeFixedConstraint(cb, opts) {
        cb.write(opts.autoDetectPoint, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_BOOL);
        if (!opts.autoDetectPoint) {
            cb.write(opts.point1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
            cb.write(opts.point2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        }
        cb.write(opts.axisX1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.axisY1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.axisX2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.axisY2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
    }

    // https://jrouwe.github.io/JoltPhysics/class_point_constraint_settings.html
    static writePointConstraint(cb, opts) {
        cb.write(opts.point1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.point2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
    }

    // https://jrouwe.github.io/JoltPhysics/class_distance_constraint_settings.html
    static writeDistanceConstraint(cb, opts) {
        cb.write(opts.point1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.point2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.minDistance, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
        cb.write(opts.maxDistance, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);

        JoltManager.writeSpringSettings(cb, opts.springSettings);
    }

    // https://jrouwe.github.io/JoltPhysics/class_hinge_constraint_settings.html
    static writeHingeConstraint(cb, opts) {
        cb.write(opts.point1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.hingeAxis1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.normalAxis1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.point2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.hingeAxis2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.normalAxis2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.limitsMin, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
        cb.write(opts.limitsMax, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
        cb.write(opts.maxFrictionTorque, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);

        JoltManager.writeSpringSettings(cb, opts.springSettings);
        JoltManager.writeMotorSettings(cb, opts.motorSettings);
    }

    // https://jrouwe.github.io/JoltPhysics/class_slider_constraint_settings.html
    static writeSliderConstraint(cb, opts) {
        cb.write(opts.autoDetectPoint, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_BOOL);
        if (!opts.autoDetectPoint) {
            cb.write(opts.point1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
            cb.write(opts.point2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        }
        cb.write(opts.sliderAxis1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.normalAxis1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.sliderAxis2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.normalAxis2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.limitsMin, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
        cb.write(opts.limitsMax, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
        cb.write(opts.maxFrictionForce, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);

        JoltManager.writeSpringSettings(cb, opts.springSettings);
        JoltManager.writeMotorSettings(cb, opts.motorSettings);
    }

    // https://jrouwe.github.io/JoltPhysics/class_cone_constraint_settings.html
    static writeConeConstraint(cb, opts) {
        cb.write(opts.point1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.twistAxis1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.point2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.twistAxis2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.halfConeAngle, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
    }

    // https://jrouwe.github.io/JoltPhysics/class_swing_twist_constraint_settings.html
    static writeSwingTwistConstraint(cb, opts) {
        cb.write(opts.position1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.twistAxis1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.planeAxis1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.position2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.twistAxis2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.planeAxis2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.normalHalfConeAngle, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
        cb.write(opts.planeHalfConeAngle, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
        cb.write(opts.twistMinAngle, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
        cb.write(opts.twistMaxAngle, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
        cb.write(opts.maxFrictionTorque, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);

        JoltManager.writeMotorSettings(cb, opts.swingMotorSettings);
        JoltManager.writeMotorSettings(cb, opts.twistMotorSettings);
    }

    // https://jrouwe.github.io/JoltPhysics/class_six_d_o_f_constraint_settings.html
    static writeSixDofConstraint(cb, opts) {
        JoltManager.writeAxes(cb, opts.freeAxes);
        JoltManager.writeAxes(cb, opts.fixedAxes);
        JoltManager.writeAxes(cb, opts.limitedAxes, true);

        cb.write(opts.position1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.axisX1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.axisY1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.position2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.axisX2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.axisY2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts.maxFriction, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
        cb.write(opts.limitsMin, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
        cb.write(opts.limitsMax, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);

        JoltManager.writeSpringSettings(cb, opts.springSettings);
        JoltManager.writeMotorSettings(cb, opts.motorSettings);
    }

    static writeAxes(cb, axes, limits) {
        cb.write(!!axes, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_BOOL, false);
        if (axes) {
            const count = axes.length;
            if (limits) {
                cb.write(count / 3, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT8, false);
                for (let i = 0; i < count; i += 3) {
                    cb.write(axes[i], _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT8, false);
                    cb.write(axes[i + 1], _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32, false);
                    cb.write(axes[i + 2], _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32, false);
                }
            } else {
                cb.write(count, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT8, false);
                for (let i = 0; i < count; i++) {
                    cb.write(axes[i], _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT8, false);
                }
            }
        }
    }

    static writeSpringSettings(cb, springSettings) {
        cb.write(!!springSettings, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_BOOL, false);
        if (springSettings != null) {
            cb.write(springSettings.springMode, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT8);
            cb.write(springSettings.frequency, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
            cb.write(springSettings.stiffness, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
            cb.write(springSettings.damping, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
        }
    }

    static writeMotorSettings(cb, motorSettings) {
        cb.write(!!motorSettings, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_BOOL, false);
        if (motorSettings != null) {
            this._writeSpringSettings(cb, motorSettings.springSettings);
            cb.write(motorSettings.minForceLimit, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
            cb.write(motorSettings.maxForceLimit, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
            cb.write(motorSettings.minTorqueLimit, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
            cb.write(motorSettings.maxTorqueLimit, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
        }
    }

    constructor(app, opts) {
        super(app, 'jolt', opts);

        this._queryMap = new _indexed_cache_mjs__WEBPACK_IMPORTED_MODULE_1__.IndexedCache();
        this._constraintMap = new _indexed_cache_mjs__WEBPACK_IMPORTED_MODULE_1__.IndexedCache();
        this._shapeMap = new _indexed_cache_mjs__WEBPACK_IMPORTED_MODULE_1__.IndexedCache();
        this._gravity = new pc.Vec3(0, -9.81, 0);
    }

    set gravity(gravity) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            const ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkVec(gravity, `Invalid gravity vector`, gravity);
            if (!ok)
                return;
        }

        if (!this._gravity.equals(gravity)) {
            this._gravity.copy(gravity);

            const cb = this._outBuffer;

            cb.writeOperator(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.OPERATOR_MODIFIER);
            cb.writeCommand(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CMD_CHANGE_GRAVITY);
            cb.write(gravity, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32, false);
        }
    }

    get gravity() {
        return this._gravity;
    }

    get queryMap() {
        return this._queryMap;
    }

    onMessage(msg) {
        super.onMessage(msg);

        if (msg.drawViews) {
            _system_mjs__WEBPACK_IMPORTED_MODULE_5__.ShapeComponentSystem.debugDraw(this._app, msg.drawViews, this._config);
        }
    }

    createShape(type, options = {}) {
        const cb = this._outBuffer;

        const opts = {
            // defaults
            density: 1000,
            shapePosition: new pc.Vec3(),
            shapeRotation: new pc.Vec3(),
            scale: new pc.Vec3(1, 1, 1),
            halfExtent: new pc.Vec3(0.5, 0.5, 0.5),
            convexRadius: 0.05,
            halfHeight: 0.5,
            radius: 0.5,

            // user overrides
            ...options,

            // hard rules
            shape: type,
            useEntityScale: false,
            isCompoundChild: false,
            massOffset: pc.Vec3.ZERO
        };

        const index = this._shapeMap.add(opts);

        cb.writeOperator(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.OPERATOR_CREATOR);
        cb.writeCommand(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CMD_CREATE_SHAPE);
        cb.write(index, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT32, false);

        _component_mjs__WEBPACK_IMPORTED_MODULE_3__.ShapeComponent.writeShapeData(cb, opts, true /* force write rotation */);

        return index;
    }

    destroyShape(index) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            const ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkUint(index, `Invalid shape number: ${ num }`);
            if (!ok)
                return;
        }

        const cb = this._outBuffer;

        cb.writeOperator(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.OPERATOR_CLEANER);
        cb.writeCommand(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CMD_DESTROY_SHAPE);
        cb.write(index, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT32, false);

        this._shapeMap.free(index);
    }    

    createFilterGroups(groups) {
        const cb = this._outBuffer;
        const groupsCount = groups.length;

        cb.writeOperator(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.OPERATOR_CREATOR);
        cb.writeCommand(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CMD_CREATE_GROUPS);
        cb.write(groupsCount, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < groupsCount; i++) {
            // sub groups count
            cb.write(groups[i], _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT32, false);
        }
    }

    toggleGroupPair(group, subGroup1, subGroup2, enable) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            let ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkUint(group, `Invalid group 1: ${ group }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkUint(subGroup1, `Invalid group 1: ${ subGroup1 }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkUint(subGroup2, `Invalid group 2: ${ subGroup2 }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkBool(enable, `Invalid toggle flag: ${ enable }`);
            if (!ok)
                return;
        }

        const cb = this._outBuffer;

        cb.writeOperator(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.OPERATOR_MODIFIER);
        cb.writeCommand(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CMD_TOGGLE_GROUP_PAIR);
        cb.write(enable, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_BOOL, false);
        cb.write(group, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT16, false);
        cb.write(subGroup1, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT16, false);
        cb.write(subGroup2, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT16, false);
    }    

    castRay(origin, dir, callback, opts) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            let ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkVec(origin,`Invalid origin vector`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkVec(dir, `Invalid direction vector`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.assert(callback, 'castRay requires a callback function castRay(origin, dir, callback, opts)');
            if (ok && opts?.firstOnly != null) ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkBool(opts.firstOnly);
            if (ok && opts?.calculateNormal != null) ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkBool(opts.calculateNormal);
            if (ok && opts?.ignoreBackFaces != null) ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkBool(opts.ignoreBackFaces);
            if (ok && opts?.treatConvexAsSolid != null) ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkBool(opts.treatConvexAsSolid);
            if (!ok)
                return;
        }

        const cb = this._outBuffer;
        const callbackIndex = this._queryMap.add(callback);

        cb.writeOperator(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.OPERATOR_QUERIER);
        cb.writeCommand(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CMD_CAST_RAY);
        cb.write(callbackIndex, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT32, false);
        cb.write(origin, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32, false);
        cb.write(dir, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32, false);
        cb.write(opts?.firstOnly, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_BOOL);
        cb.write(opts?.calculateNormal, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_BOOL);
        cb.write(opts?.ignoreBackFaces, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_BOOL);
        cb.write(opts?.treatConvexAsSolid, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_BOOL);
    }

    castShape(shape, pos, rot, dir, callback, opts) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            let ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkVec(pos, `Invalid cast shape position vector`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkVec(dir, `Invalid cast shape direction vector`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkQuat(rot, `Invalid cast shape rotation`);
            if (!ok)
                return;
        }

        const cb = this._outBuffer;
        const queryIndex = this._queryMap.add(callback);

        cb.writeOperator(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.OPERATOR_QUERIER);
        cb.writeCommand(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CMD_CAST_SHAPE);
        cb.write(queryIndex, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT32, false);
        cb.write(shape, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT8, false);
        cb.write(pos, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32, false);
        cb.write(rot, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32, false);
        cb.write(dir, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32, false);
        cb.write(opts?.scale, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts?.offset, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
        cb.write(opts?.backFaceModeTriangles, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT8);
        cb.write(opts?.backFaceModeConvex, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT8);
        cb.write(opts?.useShrunkenShapeAndConvexRadius, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_BOOL);
        cb.write(opts?.returnDeepestPoint, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_BOOL);
        cb.write(opts?.firstOnly, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_BOOL);
        cb.write(opts?.calculateNormal, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_BOOL);

        switch (shape) {
            case SHAPE_SPHERE:
                cb.write(opts?.radius, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
                break;

            case SHAPE_BOX:
                cb.write(opts?.halfExtent, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
                cb.write(opts?.convexRadius, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
                break;

            case SHAPE_CAPSULE:
                cb.write(opts?.halfHeight, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
                cb.write(opts?.radius, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
                break;

            case SHAPE_CYLINDER:
                cb.write(opts?.halfHeight, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
                cb.write(opts?.radius, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_FLOAT32);
                cb.write(opts?.convexRadius, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_VEC32);
                break;

            default:
                _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.warnOnce(`Invalid shape for casting: ${ shape }`);
                break;
        }
    }    

    createConstraint(type, entity1, entity2, opts = {}) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            let ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.assert(!!entity1.c.body, `Entity has no Body Component. Cannot create constraint.`, entity1);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.assert(!!entity2.c.body, `Entity has no Body Component. Cannot create constraint.`, entity2);
            if (!ok) return;
        }

        const cb = this._outBuffer;
        const index = this._constraintMap.add({ entity1, entity2 });

        entity1.body.constraints.set(index, entity2);
        entity2.body.constraints.set(index, entity1);

        cb.writeOperator(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.OPERATOR_CREATOR);
        cb.writeCommand(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CMD_CREATE_CONSTRAINT);
        cb.write(type, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT8, false);

        cb.write(index, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT32, false);
        cb.write(entity1.c.body.index, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT32, false);
        cb.write(entity2.c.body.index, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT32, false);

        switch (type) {
            case _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CONSTRAINT_TYPE_FIXED:
                JoltManager.writeFixedConstraint(cb, opts);
                break;

            case _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CONSTRAINT_TYPE_POINT:
                JoltManager.writePointConstraint(cb, opts);
                break;

            case _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CONSTRAINT_TYPE_DISTANCE:
                JoltManager.writeDistanceConstraint(cb, opts);
                break;

            case _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CONSTRAINT_TYPE_HINGE:
                JoltManager.writeHingeConstraint(cb, opts);
                break;

            case _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CONSTRAINT_TYPE_SLIDER:
                JoltManager.writeSliderConstraint(cb, opts);
                break;

            case _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CONSTRAINT_TYPE_CONE:
                JoltManager.writeConeConstraint(cb, opts);
                break;

            case _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CONSTRAINT_TYPE_SWING_TWIST:
                JoltManager.writeSwingTwistConstraint(cb, opts);
                break;

            case _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CONSTRAINT_TYPE_SIX_DOF:
                JoltManager.writeSixDofConstraint(cb, opts);
                break;

            default:
                _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.error(`Unrecognized constraint type: ${ type }`);
                return;
        }

        cb.write(opts.numVelocityStepsOverride, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT8);
        cb.write(opts.numPositionStepsOverride, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT8);
        cb.write(opts.space, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT8);

        return index;
    }

    destroyConstraint(index) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            const ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkUint(index, `Invalid index of a constraint trying to destroy: ${ index }`);
            if (!ok)
                return;
        }

        const cb = this._outBuffer;

        cb.writeOperator(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.OPERATOR_CLEANER);
        cb.writeCommand(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CMD_DESTROY_CONSTRAINT);
        cb.write(index, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT32, false);

        this.freeConstraintIndex(index);
    }

    freeConstraintIndex(index) {
        this._constraintMap.free(index);
    }

    setConstraintEnabled(index, enabled, activate = true) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            let ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkUint(index, `Invalid constraint index: ${ index }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkBool(enabled, `Invalid constraint enable bool: ${ enabled }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkBool(enabled, `Invalid activate bool: ${ enabled }`);
            if (!ok)
                return;
        }

        const cb = this._outBuffer;

        cb.writeOperator(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.OPERATOR_MODIFIER);
        cb.writeCommand(_constants_mjs__WEBPACK_IMPORTED_MODULE_4__.CMD_SET_CONSTRAINT_ENABLED);
        cb.write(index, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_UINT32, false);
        cb.write(enabled, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_BOOL, false);
        cb.write(activate, _constants_mjs__WEBPACK_IMPORTED_MODULE_4__.BUFFER_WRITE_BOOL, false);
    }
}





/***/ }),

/***/ "./src/physics/components/jolt/response-handler.mjs":
/*!**********************************************************!*\
  !*** ./src/physics/components/jolt/response-handler.mjs ***!
  \**********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ResponseHandler: () => (/* binding */ ResponseHandler)
/* harmony export */ });
/* harmony import */ var _debug_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../debug.mjs */ "./src/physics/debug.mjs");
/* harmony import */ var _constants_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./constants.mjs */ "./src/physics/components/jolt/constants.mjs");



class ContactResult {
    constructor(entity, normal, depth, point = null, offset = null, points1 = null, points2 = null) {
        this.entity = entity;
        this.normal = normal;
        this.penetrationDepth = depth;
        if (point) this.point = point;
        if (offset) this.offset = offset;
        if (points1) this.points1 = points1;
        if (points2) this.points2 = points2;
    }
}

class CharContactResult {
    constructor(entity, contactPosition, contactNormal, contactVelocity, newCharVelocity) {
        this.entity = entity;
        this.contactPosition = contactPosition;
        this.contactNormal = contactNormal;
        this.contactVelocity = contactVelocity;
        this.newCharVelocity = newCharVelocity;
    }
}

class RaycastResult {
    constructor(entity, point, normal) {
        this.entity = entity;
        this.point = point;
        if (normal) {
            this.normal = normal;
        }
    }
}

class ResponseHandler {
    static handleContact(cb, map) {
        const count = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT32);

        for (let i = 0; i < count; i++) {
            const type = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT8);
            const isValidBody1 = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_BOOL);
            const isValidBody2 = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_BOOL);

            let idx1 = null;
            if (isValidBody1) {
                idx1 = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT32);
            }

            let idx2 = null;
            if (isValidBody2) {
                idx2 = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT32);
            }

            const entity1 = map.get(idx1);
            const entity2 = map.get(idx2);

            switch (type) {
                case _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.CONTACT_TYPE_ADDED: {
                    const normal = pc.Vec3.fromBuffer(cb);
                    const depth = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32);
                    const contactPoints = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_BOOL);
                    let point, points1, points2, offset;

                    if (contactPoints) {
                        const averaged = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_BOOL);

                        if (averaged) {
                            point = pc.Vec3.fromBuffer(cb);
                        } else {
                            offset = pc.Vec3.fromBuffer(cb);
                            const count1 = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT32);
                            const count2 = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT32);
                            points1 = [];
                            points2 = [];
                            for (let i = 0; i < count1; i++) {
                                points1.push(pc.Vec3.fromBuffer(cb));
                            }
                            for (let i = 0; i < count2; i++) {
                                points2.push(pc.Vec3.fromBuffer(cb));
                            }
                        }
                    }

                    const event = 'contact:added';
                    if (entity1?.hasEvent(event)) {
                        const contactResult = new ContactResult(entity2, normal, depth, point, offset, points1, points2);
                        entity1.fire(event, contactResult);
                    }
                    if (entity2?.hasEvent(event)) {
                        const contactResult = new ContactResult(entity1, normal, depth, point, offset, points1, points2);
                        entity2.fire(event, contactResult);
                    }
                    break;
                }

                case _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.CONTACT_TYPE_PERSISTED: {
                    const event = 'contact:persisted';
                    if (entity1?.hasEvent(event)) {
                        entity1.fire(event, entity2);
                    }
                    if (entity2?.hasEvent(event)) {
                        entity2.fire(event, entity1);
                    }
                    break;
                }

                case _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.CONTACT_TYPE_REMOVED: {
                    const event = 'contact:removed';
                    if (entity1?.hasEvent(event)) {
                        entity1.fire(event, entity2);
                    }
                    if (entity2?.hasEvent(event)) {
                        entity2.fire(event, entity1);
                    }
                }
            }
        }
    }

    static handleCharContacts(cb, map) {
        const charsCount = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT32);

        for (let c = 0; c < charsCount; c++) {
            const charIndex = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT32);
            const contactsCount = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT32);
            const charEntity = map.get(charIndex);
            const results = [];

            if (!charEntity.hasEvent('contact:char')) {
                cb.skip(1 * contactsCount, _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.UINT8_SIZE);
                cb.skip(13 * contactsCount, _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.FLOAT32_SIZE);
                continue;
            }

            for (let i = 0; i < contactsCount; i++) {
                const isValidBody2 = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_BOOL);
                const otherIndex = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT32);

                let otherEntity = null;
                if (isValidBody2) {
                    otherEntity = map.get(otherIndex) || null;
                }
    
                const cp = pc.Vec3.fromBuffer(cb); // contact position
                const cn = pc.Vec3.fromBuffer(cb); // contact normal
                const cv = pc.Vec3.fromBuffer(cb); // contact velocity
                const nv = pc.Vec3.fromBuffer(cb); // new char velocity
    
                const result = new CharContactResult(otherEntity, cp, cn, cv, nv);    
                results.push(result);
            }

            charEntity.fire('contact:char', results);
        }
    }

    static handleQuery(buffer, entityMap, queryMap) {
        const results = [];

        const queryIndex = buffer.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT16);
        const hitsCount = buffer.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT16);

        for (let i = 0; i < hitsCount; i++) {
            const bodyIndex = buffer.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT32);

            const point = new pc.Vec3(
                buffer.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
                buffer.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
                buffer.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32)
            );

            let normal;
            if (buffer.flag) {
                normal = new pc.Vec3(
                    buffer.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
                    buffer.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
                    buffer.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32)
                );
            }

            const entity = entityMap.get(bodyIndex);
            if (!entity) {
                // Entity could have been deleted by the time the raycast result arrived.
                // We just ignore this result then.
                continue;
            }

            results.push(new RaycastResult(entity, point, normal));
        }

        const callback = queryMap.get(queryIndex);
        queryMap.free(queryIndex);
        callback?.(results);
    }

    static handleCharSetShape(cb, queryMap) {
        const cbIndex = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT32);
        const callback = queryMap.get(cbIndex);

        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && !callback) {
            _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.warn(`Unable to locate callback with index: ${ cbIndex }`);
            return;
        }

        queryMap.free(cbIndex);
        callback();
    }
}



/***/ }),

/***/ "./src/physics/components/jolt/softbody/component.mjs":
/*!************************************************************!*\
  !*** ./src/physics/components/jolt/softbody/component.mjs ***!
  \************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SoftBodyComponent: () => (/* binding */ SoftBodyComponent)
/* harmony export */ });
/* harmony import */ var _debug_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../debug.mjs */ "./src/physics/debug.mjs");
/* harmony import */ var _body_component_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../body/component.mjs */ "./src/physics/components/jolt/body/component.mjs");
/* harmony import */ var _component_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../component.mjs */ "./src/physics/components/jolt/component.mjs");
/* harmony import */ var _constants_mjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../constants.mjs */ "./src/physics/components/jolt/constants.mjs");





class SoftBodyComponent extends _body_component_mjs__WEBPACK_IMPORTED_MODULE_1__.BodyComponent {
    // amount of substance * ideal gass constant * absolute temperature
    // n * R * T
    // see https://en.wikipedia.org/wiki/Pressure
    _pressure = 0;

    // Update the position of the body while simulating (set to false for something
    // that is attached to the static world)
    _updatePosition = true;

    // Bake specified mRotation in the vertices and set the body rotation to identity (simulation is slightly more accurate if the rotation of a soft body is kept to identity)
    _makeRotationIdentity = true;

    // Number of solver iterations
    _numIterations = 5;

    // Inverse of the stiffness of the spring.
    _compliance = 0;

    // Number of cells comprising a row. Think of a grid divided plane.
    _width = 0;

    // Number of cells comprising a column. Think of a grid divided plane.
    _length = 0;

    _fixedIndices = [];

    constructor(system, entity) {
        super(system, entity);
    }

    writeComponentData(cb) {
        this._writeShapeData(cb, this);

        cb.write(this._index, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_UINT32, false);

        // We always use world position and rotation from the current entity the component
        // is attached to (instead of default zero vectors)
        const entity = this.entity;
        const pos = entity.getPosition();
        const rot = entity.getRotation();

        // TODO
        // get rid of flags

        // Loss of precision for pos/rot (64 -> 32)
        cb.write(pos, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_VEC32, false);
        cb.write(rot, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_VEC32, false);

        cb.write(this._collisionGroup, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_UINT32);
        cb.write(this._subGroup, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_UINT32);

        cb.write(this._objectLayer, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_UINT16, false);
        cb.write(this._numIterations, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_UINT32, false);
        cb.write(this._linearDamping, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxLinearVelocity, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._restitution, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._friction, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._pressure, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._gravityFactor, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._updatePosition, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_BOOL, false);
        cb.write(this._makeRotationIdentity, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_BOOL, false);
        cb.write(this._allowSleeping, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_BOOL, false);

        _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && cb.write(this._debugDraw, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_BOOL, false);
    }

    onEnable() {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            if (!this._renderAsset && !this._meshes) {
                _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.warn('Unable to locate mesh data for a soft body', this);
                return;
            }
        }

        const system = this.system;

        this._index = system.getIndex(this.entity);

        if (this._renderAsset && !this._meshes) {
            this._addMeshes();
        } else {
            system.createBody(this);
        }
    }

    _writeShapeData(cb) {
        let useEntityScale = this._useEntityScale;
        let scale;
        if (useEntityScale) {
            scale = this.entity.getLocalScale();
            if (scale.x === 1 && scale.y === 1 && scale.z === 1) {
                useEntityScale = false;
            }
        }

        cb.write(useEntityScale, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_BOOL, false);
        if (useEntityScale) {
            // Potential precision loss 64 -> 32
            cb.write(scale, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_VEC32, false);
        }
    
        _component_mjs__WEBPACK_IMPORTED_MODULE_2__.ShapeComponent.addMeshes(this._meshes, cb);

        cb.write(this._width, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_UINT32, false);
        cb.write(this._length, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_UINT32, false);
        cb.write(this._compliance, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_FLOAT32, false);

        const fixed = this._fixedIndices;
        const count = fixed.length;

        cb.write(count, _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_UINT32, false);
        for (let i = 0; i < count; i++) {
            cb.write(fixed[i], _constants_mjs__WEBPACK_IMPORTED_MODULE_3__.BUFFER_WRITE_UINT32, false);
        }
    }

}



/***/ }),

/***/ "./src/physics/components/jolt/softbody/system.mjs":
/*!*********************************************************!*\
  !*** ./src/physics/components/jolt/softbody/system.mjs ***!
  \*********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SoftBodyComponentSystem: () => (/* binding */ SoftBodyComponentSystem)
/* harmony export */ });
/* harmony import */ var _util_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../util.mjs */ "./src/physics/util.mjs");
/* harmony import */ var _body_system_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../body/system.mjs */ "./src/physics/components/jolt/body/system.mjs");
/* harmony import */ var _constants_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../constants.mjs */ "./src/physics/components/jolt/constants.mjs");
/* harmony import */ var _system_mjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../system.mjs */ "./src/physics/components/jolt/system.mjs");
/* harmony import */ var _component_mjs__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./component.mjs */ "./src/physics/components/jolt/softbody/component.mjs");






const schema = [
    // Component
    'enabled',
    'debugDraw',
    'renderAsset',
    'meshes',
    'useEntityScale',

    // Soft Body
	'position',
	'rotation',
	'objectLayer',
	'collisionGroup',
    'subGroup',
	'numIterations',
	'linearDamping',
	'maxLinearVelocity',
	'restitution',
	'friction',
	'pressure',
	'gravityFactor',
	'updatePosition',
	'makeRotationIdentity',
    'allowSleeping',

    // Shape Data
    'width',
    'length',
    'fixedIndices',
    'compliance'
];

const vec = new pc.Vec3();
const quat = new pc.Quat()
const positions = [];
const indices = [];

class SoftBodyComponentSystem extends _body_system_mjs__WEBPACK_IMPORTED_MODULE_1__.BodyComponentSystem {

    constructor(app, manager, id) {
        super(app, manager);

        this.id = 'softbody';
        this.schema = schema;
        this.ComponentType = _component_mjs__WEBPACK_IMPORTED_MODULE_4__.SoftBodyComponent;

        manager.systems.set(id, this);

        (0,_util_mjs__WEBPACK_IMPORTED_MODULE_0__.buildAccessors)(this, this.schema);
    }

    createBody(component) {
        const cb = this._manager.commandsBuffer;

        cb.writeOperator(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_CREATOR);
        cb.writeCommand(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_CREATE_SOFT_BODY);

        component.writeComponentData(cb);
    }

    processCommands(cb) {
        const command = cb.readCommand();

        switch (command) {
            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_UPDATE_TRANSFORMS:
                this._updateVertices(cb);
            break;
        }
    }

    _updateVertices(cb) {
        const index = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_UINT32);
        const count = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_UINT32);

        const entity = this.entityMap.get(index);

        positions.length = 0;
        indices.length = 0;

        const component = entity?.c.softbody;
        const mesh = component?.meshes[0];
        if (!mesh) {
            return;
        }

        mesh.getIndices(indices);

        let sx = 1;
        let sy = 1;
        let sz = 1;
        
        if (component.useEntityScale ) {
            const s = entity.getLocalScale();
            sx = s.x || 1; sy = s.y || 1; sz = s.z || 1;
        }

        quat.copy(entity.getRotation()).invert();

        for (let i = 0; i < count; i++) {
            vec.set(
                cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32) / sx,
                cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32) / sy,
                cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_READ_FLOAT32) / sz
            );

            quat.transformVector(vec, vec);

            positions.push(vec.x, vec.y, vec.z);
        }

        mesh.setNormals(pc.calculateNormals(positions, indices));
        mesh.setPositions(positions);
        mesh.update();
    }
}



/***/ }),

/***/ "./src/physics/components/jolt/system.mjs":
/*!************************************************!*\
  !*** ./src/physics/components/jolt/system.mjs ***!
  \************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ShapeComponentSystem: () => (/* binding */ ShapeComponentSystem)
/* harmony export */ });
/* harmony import */ var _indexed_cache_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../indexed-cache.mjs */ "./src/physics/indexed-cache.mjs");
/* harmony import */ var _constants_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./constants.mjs */ "./src/physics/components/jolt/constants.mjs");




let v1, v2, v3;

function getColor(type, config) {
    switch (type) {
        case pc.JOLT_MOTION_TYPE_STATIC:
            return config.debugColorStatic;
        case pc.JOLT_MOTION_TYPE_KINEMATIC:
            return config.debugColorKinematic;
        case pc.JOLT_MOTION_TYPE_DYNAMIC:
            return config.debugColorDynamic;
        default:
            return pc.Color.WHITE;
    }
}

const schema = [
    // component
    'enabled',
    'index',
    'trackDynamic',
    'renderAsset',
    'meshes',
    'isCompoundChild',
    'useEntityScale',
    'useMotionState',
    'debugDraw',

    // Jolt shape
    'shape',
    'halfExtent',
    'radius',
    'convexRadius',
    'halfHeight',
    'density',
    'shapePosition',
    'shapeRotation',
    'massOffset',
    'hfScale',
    'hfOffset',
    'hfSamples',
    'hfSampleCount',
    'hfBlockSize',
    'hfBitsPerSample',
    'hfActiveEdgeCosThresholdAngle'
];

class ShapeComponentSystem extends pc.ComponentSystem {
    static entityMap = new _indexed_cache_mjs__WEBPACK_IMPORTED_MODULE_0__.IndexedCache();

    constructor(app, manager) {
        super();

        this.app = app;

        // The store where all ComponentData objects are kept
        this.store = {};
        this.schema = schema;

        this._manager = manager;

        this.entityMap = ShapeComponentSystem.entityMap;

        this._exposeConstants();
    }

    addCommand() {
        const cb = this._manager.commandsBuffer;
        
        cb.writeOperator(arguments[0]);
        cb.writeCommand(arguments[1]);

        // component index
        cb.write(arguments[2], _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_WRITE_UINT32, false);

        for (let i = 3, end = arguments.length; i < end; i += 3) {
            cb.write(arguments[i], arguments[i + 1], arguments[i + 2]);
        }
    }

    addCommandArgs() {
        const cb = this._manager.commandsBuffer;
        for (let i = 0, end = arguments.length; i < end; i += 3) {
            cb.write(arguments[i], arguments[i + 1], arguments[i + 2]);
        }
    }

    addComponent(entity, data = {}) {
        const component = new this.ComponentType(this, entity);

        this.store[entity.getGuid()] = { entity };

        entity[this.id] = component;
        entity.c[this.id] = component;

        this.initializeComponentData(component, data);

        return component;
    }

    initializeComponentData(component, data) {
        component.enabled = true;

        for (const [key, value] of Object.entries(data)) {
            component[`_${ key }`] = value;
        }

        if (component.entity.enabled && !component.isCompoundChild) {
            component.onEnable();
        }
    }

    freeConstraintIndex(index) {
        this._manager.freeConstraintIndex(index);
    }

    getIndex(entity) {
        return this.entityMap.add(entity);
    }

    setIndexFree(index) {
        this.entityMap.free(index);
    }

    _exposeConstants() {
        if (typeof window !== 'undefined' && window.pc) {
            pc.JOLT_SHAPE_BOX = _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.SHAPE_BOX;
            pc.JOLT_SHAPE_CAPSULE = _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.SHAPE_CAPSULE;
            pc.JOLT_SHAPE_CYLINDER = _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.SHAPE_CYLINDER;
            pc.JOLT_SHAPE_SPHERE = _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.SHAPE_SPHERE;
            pc.JOLT_SHAPE_MESH = _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.SHAPE_MESH;
            pc.JOLT_SHAPE_CONVEX_HULL = _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.SHAPE_CONVEX_HULL;
            pc.JOLT_SHAPE_STATIC_COMPOUND = _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.SHAPE_STATIC_COMPOUND;
            pc.JOLT_SHAPE_HEIGHTFIELD = _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.SHAPE_HEIGHTFIELD;
            pc.JOLT_OBJECT_LAYER_NON_MOVING = _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.OBJECT_LAYER_NON_MOVING;
            pc.JOLT_OBJECT_LAYER_MOVING = _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.OBJECT_LAYER_MOVING;
            pc.JOLT_VEHICLE_TYPE_WHEEL = _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.VEHICLE_TYPE_WHEEL;
            pc.JOLT_VEHICLE_TYPE_TRACK = _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.VEHICLE_TYPE_TRACK;
            pc.JOLT_VEHICLE_TYPE_MOTORCYCLE = _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.VEHICLE_TYPE_MOTORCYCLE;
            pc.JOLT_VEHICLE_CAST_TYPE_RAY = _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.VEHICLE_CAST_TYPE_RAY;
            pc.JOLT_VEHICLE_CAST_TYPE_CYLINDER = _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.VEHICLE_CAST_TYPE_CYLINDER;
            pc.JOLT_VEHICLE_CAST_TYPE_SPHERE = _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.VEHICLE_CAST_TYPE_SPHERE;
        }
    }

    static updateDynamic(cb) {
        const index = cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_UINT32);
        const entity = this.entityMap.get(index);
        const vehicleComponent = entity?.c.vehicle;

        if (!entity) {
            cb.skip(13 * _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.FLOAT32_SIZE);
            if (vehicleComponent) {
                cb.skip(vehicleComponent.wheels.length * 7 * _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.FLOAT32_SIZE);
            }
            return;
        }

        entity.setPosition(
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32)
        );

        entity.setRotation(
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32)
        );

        const component = entity.c.body || vehicleComponent;
        component._linearVelocity.set(
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32)
        );
        component._angularVelocity.set(
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
            cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32)
        );

        if (vehicleComponent) {
            const wheels = vehicleComponent.wheels;
            const wheelsCount = wheels.length;

            for (let i = 0; i < wheelsCount; i++) {
                const wheel = wheels[i];
                const entity = wheel.entity;

                if (!entity) {
                    cb.skip(7 * _constants_mjs__WEBPACK_IMPORTED_MODULE_1__.FLOAT32_SIZE);
                    continue;
                }

                entity.setLocalPosition(
                    cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
                    cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
                    cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32)
                );

                entity.setLocalRotation(
                    cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
                    cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
                    cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
                    cb.read(_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32)
                );
            }
        }
    }

    static debugDraw(app, data, config) {
        const useDepth = config.debugDrawDepth;
        const layer = app.scene.layers.getLayerById(config.debugDrawLayerId);

        if (!v1) {
            v1 = new pc.Vec3();
            v2 = new pc.Vec3();
            v3 = new pc.Vec3();
        }
    
        for (let d = 0, total = data.length; d < total; d += 5) {
            const index = data[d];
            const length = data[d + 1];
            const byteOffset = data[d + 2];
            const motionType = data[d + 3];
            const buffer = data[d + 4];
    
            const view = new Float32Array(buffer, byteOffset, length);
            const entity = this.entityMap.get(index);
            const color = getColor(motionType, config);
    
            const p = entity.getPosition();
            const r = entity.getRotation();
    
            for (let i = 0, end = view.length; i < end; i += 9) {
                v1.set(view[i], view[i + 1], view[i + 2]);
                v2.set(view[i + 3], view[i + 4], view[i + 5]);
                v3.set(view[i + 6], view[i + 7], view[i + 8]);
    
                r.transformVector(v1, v1);
                r.transformVector(v2, v2);
                r.transformVector(v3, v3);
                v1.add(p);
                v2.add(p);
                v3.add(p);
    
                app.drawLine(v1, v2, color, useDepth, layer);
                app.drawLine(v2, v3, color, useDepth, layer);
                app.drawLine(v3, v1, color, useDepth, layer);
            }
        }
    }    
}





/***/ }),

/***/ "./src/physics/components/jolt/vehicle/component.mjs":
/*!***********************************************************!*\
  !*** ./src/physics/components/jolt/vehicle/component.mjs ***!
  \***********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   VehicleComponent: () => (/* binding */ VehicleComponent)
/* harmony export */ });
/* harmony import */ var _debug_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../debug.mjs */ "./src/physics/debug.mjs");
/* harmony import */ var _body_component_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../body/component.mjs */ "./src/physics/components/jolt/body/component.mjs");
/* harmony import */ var _constants_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../constants.mjs */ "./src/physics/components/jolt/constants.mjs");




class VehicleComponent extends _body_component_mjs__WEBPACK_IMPORTED_MODULE_1__.BodyComponent {
    // Used only when the constraint is active. Override for the number of solver 
    // velocity iterations to run, 0 means use the default in PhysicsSettings.numVelocitySteps.
    // The number of iterations to use is the max of all contacts and constraints in the island.
    _numVelocityStepsOverride = 0;

    // Used only when the constraint is active. Override for the number of solver
    // position iterations to run, 0 means use the default in PhysicsSettings.numPositionSteps.
    // The number of iterations to use is the max of all contacts and constraints in the island.
    _numPositionStepsOverride = 0;

    // Vector indicating the up direction of the vehicle (in local space to the body)
    _up = pc.Vec3.UP;

    // Vector indicating forward direction of the vehicle (in local space to the body)
    _forward = pc.Vec3.BACK;

    // Defines the maximum pitch/roll angle (rad), can be used to avoid the car from getting upside
    // down. The vehicle up direction will stay within a cone centered around the up axis with half
    // top angle maxPitchRollAngle, set to pi to turn off. Defaults to ~1.04 rad (60 degrees)
    _maxPitchRollAngle = 1.0471975511965976;

    // An array of arrays. Each array represents a track and lists indices of wheels that are inside
    // that track. The last element in each track array will become a driven wheel (an index that points
    // to a wheel that is connected to the engine).
    // Example with 2 tracks, and each having 4 wheels: [[0, 1, 2, 3], [4, 5, 6, 7]]
    _tracks = [];

    // An array of objects that describe each wheel. See _writeWheelsData().
    _wheels = [];

    // Vehicle type. Can be wheeled (VEHICLE_TYPE_WHEEL) or tracked (VEHICLE_TYPE_TRACK).
    _type = _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.VEHICLE_TYPE_WHEEL;

    // Max amount of torque (Nm) that the engine can deliver.
    _maxTorque = 500;
    
    // Min amount of revolutions per minute (rpm) the engine can produce without stalling.
    _minRPM = 1000;

    // Max amount of revolutions per minute (rpm) the engine can generate.
    _maxRPM = 6000;

    // Moment of inertia (kg m^2) of the engine.
    _inertia = 0.5;

    // Angular damping factor of the wheel: dw/dt = -c * w.
    _angularDamping = 0.2;

    // Curve that describes a ratio of the max torque the engine can produce vs the fraction of the max RPM of the engine.
    _normalizedTorque = new pc.Curve([0, 0.8, 0, 0.8]);

    // How to switch gears.
    _mode = pc.JOLT_TRANSMISSION_AUTO;

    // Ratio in rotation rate between engine and gear box, first element is 1st gear, 2nd element 2nd gear etc.
    _gearRatios = [2.66, 1.78, 1.3, 1, 0.74];

    // Ratio in rotation rate between engine and gear box when driving in reverse.
    _reverseGearRatios = [-2.9];

    // How long it takes to switch gears (s), only used in auto mode.
    _switchTime = 0.5;

    // How long it takes to release the clutch (go to full friction), only used in auto mode
    _clutchReleaseTime = 0.3;

    // How long to wait after releasing the clutch before another switch is attempted (s), only used in auto mode.
    _switchLatency = 0.5;

    // If RPM of engine is bigger then this we will shift a gear up, only used in auto mode.
    _shiftUpRPM = 4000;

    // If RPM of engine is smaller then this we will shift a gear down, only used in auto mode.
    _shiftDownRPM = 2000;

    // Strength of the clutch when fully engaged. Total torque a clutch applies is 
    // Torque = ClutchStrength * (Velocity Engine - Avg Velocity Wheels At Clutch) (units: k m^2 s^-1)
    _clutchStrength = 10;

    // List of differentials and their properties
    _differentials = [];

    // Used when vehicle is of wheeled type. Ratio max / min average wheel speed of each differential
    // (measured at the clutch). When the ratio is exceeded all torque gets distributed to the differential
    // with the minimal average velocity. This allows implementing a limited slip differential between
    // differentials. Set to Number.MAX_VALUE for an open differential. Value should be > 1.
    _differentialLimitedSlipRatio = 1.4;

    // An anti rollbar is a stiff spring that connects two wheels to reduce the amount of roll the
    // vehicle makes in sharp corners See: https://en.wikipedia.org/wiki/Anti-roll_bar
    _antiRollBars = [];    

    // Collision tester that tests wheels collision.
    // - VEHICLE_CAST_TYPE_RAY
    // - VEHICLE_CAST_TYPE_SPHERE
    // - VEHICLE_CAST_TYPE_CYLINDER 
    _castType = _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.VEHICLE_CAST_TYPE_RAY;

    // Object layer to test collision with.
    _castObjectLayer = _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OBJECT_LAYER_MOVING;

    // World space up vector, used to avoid colliding with vertical walls.
    _castUp = pc.Vec3.UP;

    // Max angle (rad) that is considered for colliding wheels. This is to avoid colliding
    // with vertical walls. Defaults to ~1.4 rad (80 degrees).
    _castMaxSlopeAngle = 1.3962634015954636;

    // Sets the radius of the sphere used in cast.
    _castRadius = 0.3;

    // Fraction of half the wheel width (or wheel radius if it is smaller) that is used as the convex radius
    _castFraction = 0.1;

    // How far we're willing to make the bike lean over in turns (in radians)
    _maxLeanAngle = 45;
    
    // Spring constant for the lean spring.
    _leanSpringConstant = 5000;

    // Spring damping constant for the lean spring.
    _leanSpringDamping = 1000;

    // The lean spring applies an additional force equal to this coefficient * Integral(delta angle, 0, t),
    // this effectively makes the lean spring a PID controller.
    _leanSpringIntegrationCoefficient = 0;

    // How much to decay the angle integral when the wheels are not touching the floor:
    // new_value = e^(-decay * t) * initial_value.
    _leanSpringIntegrationCoefficientDecay = 4;

    // How much to smooth the lean angle (0 = no smoothing, 1 = lean angle never changes). Note that this
    // is frame rate dependent because the formula is: smoothing_factor * previous + (1 - smoothing_factor) * current
    _leanSmoothingFactor = 0.8;

    constructor(system, entity) {
        super(system, entity);
    }

    writeVehicleData(cb) {
        const type = this._type;

        // general vehicle data
        cb.write(this._index, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);
        cb.write(type, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT8, false);
        cb.write(this._numVelocityStepsOverride, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT16, false);
        cb.write(this._numVelocityStepsOverride, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT16, false);
        cb.write(this._up, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
        cb.write(this._forward, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
        cb.write(this._maxPitchRollAngle, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);

        // engine data
        cb.write(this._maxTorque, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._minRPM, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxRPM, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._inertia, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._angularDamping, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        VehicleComponent.writeCurvePoints(cb, this._normalizedTorque);

        // transmission data
        cb.write(this._mode, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT8, false);
        cb.write(this._switchTime, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._clutchReleaseTime, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._switchLatency, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._shiftUpRPM, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._shiftDownRPM, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        cb.write(this._clutchStrength, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        VehicleComponent.writeGears(cb, this._gearRatios);
        VehicleComponent.writeGears(cb, this._reverseGearRatios);

        // wheels data
        const isWheeled = type === _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.VEHICLE_TYPE_WHEEL || type === _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.VEHICLE_TYPE_MOTORCYCLE;
        if (isWheeled) {
            this._writeWheelsData(cb);
        } else {
            this._writeTracksData(cb);
        }

        if (isWheeled) {
            // differentials
            this._writeDifferentials(cb);
            cb.write(this._differentialLimitedSlipRatio, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);

            if (type === _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.VEHICLE_TYPE_MOTORCYCLE) {
                cb.write(this._maxLeanAngle, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                cb.write(this._leanSpringConstant, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                cb.write(this._leanSpringDamping, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                cb.write(this._leanSpringIntegrationCoefficient, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                cb.write(this._leanSpringIntegrationCoefficientDecay, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                cb.write(this._leanSmoothingFactor, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
            }
        }

        this._writeAntiRollBars(cb);

        // cast type
        const castType = this._castType;
        cb.write(castType, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT8, false);
        cb.write(this._castObjectLayer, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);
        switch (castType) {
            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.VEHICLE_CAST_TYPE_RAY:
                cb.write(this._castUp, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
                cb.write(this._castMaxSlopeAngle, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                break;
            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.VEHICLE_CAST_TYPE_SPHERE:
                cb.write(this._castUp, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);
                cb.write(this._castMaxSlopeAngle, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                cb.write(this._castRadius, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                break;
            case _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.VEHICLE_CAST_TYPE_CYLINDER:
                cb.write(this._castFraction, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                break;
        }
    }

    // Any type:
    //      input0 - Value between -1 and 1 for auto transmission and value between 0 and 1 indicating 
    //              desired driving direction and amount the gas pedal is pressed
    // Wheeled:
    //      input1 - Value between -1 and 1 indicating desired steering angle (1 = right)
    //      input2 - Value between 0 and 1 indicating how strong the brake pedal is pressed
    //      input3 - Value between 0 and 1 indicating how strong the hand brake is pulled
    // Tracked:
    //      input1 - Value between -1 and 1 indicating an extra multiplier to the rotation rate of the left track (used for steering)
    //      input2 - Value between -1 and 1 indicating an extra multiplier to the rotation rate of the right track (used for steering)
    //      input3 - Value between 0 and 1 indicating how strong the brake pedal is pressed
    setDriverInput(input0, input1, input2, input3) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            let ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkRange(input0, -1, 1, `Invalid driver input for forward (input0). Expected a number in [-1:1] range. Received: ${ input0 }`);
            if (this._type === _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.VEHICLE_TYPE_WHEEL || this._type === _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.VEHICLE_TYPE_MOTORCYCLE) {
                ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkRange(input1, -1, 1, `Invalid driver input for right (input1). Expected a number in [-1:1] range. Received: ${ input1 }`);
                ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkRange(input2, 0, 1, `Invalid driver input for brake (input2). Expected a number in [0:1] range. Received: ${ input2 }`);
                ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkRange(input3, 0, 1, `Invalid driver input for hand brake (input3). Expected a number in [0:1] range. Received: ${ input3 }`);
            } else {
                ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkRange(input1, -1, 1, `Invalid driver input for left ratio (input1). Expected a number in [-1:1] range. Received: ${ input1 }`);
                ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkRange(input2, -1, 1, `Invalid driver input for right ratio (input2). Expected a number in [-1:1] range. Received: ${ input2 }`);
                ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkRange(input3, 0, 1, `Invalid driver input for brake (input3). Expected a number in [0:1] range. Received: ${ input3 }`);
            }
            if (!ok)
                return;
        }

        this.system.addCommand(
            _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_MODIFIER, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_SET_DRIVER_INPUT, this._index,
            input0, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false,
            input1, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false,
            input2, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false,
            input3, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false
        );
    }

    onEnable() {
        const system = this.system;

        this._index = system.getIndex(this.entity);

        system.createVehicle(this);
    }

    _writeTracksData(cb) {
        const tracks = this._tracks;
        const count = tracks.length;

        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && count === 0) {
            _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.warn('Invalid tracks data. Need at least one track.', tracks);
            return;
        }

        this._writeWheelsData(cb);

        cb.write(count, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);
        
        for (let t = 0; t < count; t++) {
            const track = tracks[t];
            const wheelsCount = track.length;

            cb.write(wheelsCount, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);

            for (let i = 0; i < wheelsCount; i++) {
                cb.write(track[i], _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);
            }
        }
    }

    _writeWheelsData(cb) {
        const wheels = this._wheels;
        const count = wheels.length;

        cb.write(count, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < count; i++) {
            const desc = wheels[i];

            if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
                let ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.assert(desc.position, 
                    'A wheel description requires an attachment position of wheel' +
                    'suspension in local space of the vehicle', desc);
                const spring = desc.spring;
                if (spring) {
                    const { stiffness, frequency } = spring;
                    if (stiffness != null) {
                        _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.assert(stiffness !== 0, 'Wheel spring stiffness cannot be zero', spring);
                    }
                    if (frequency != null) {
                        _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.assert(frequency !== 0, 'Wheel spring frequency cannot be zero', spring);
                    }
                }
                if (!ok)
                    return;
            }

            // Attachment point of wheel suspension in local space of the body.
            cb.write(desc.position, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);

            // Where tire forces (suspension and traction) are applied, in local space of the body. 
            // A good default is the center of the wheel in its neutral pose. See enableSuspensionForcePoint.
            cb.write(desc.suspensionForcePoint || pc.Vec3.ZERO, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);

            // Direction of the suspension in local space of the body, should point down.
            cb.write(desc.suspensionDirection || pc.Vec3.DOWN, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);

            // Direction of the steering axis in local space of the body, should point up (e.g. for a 
            // bike would be -suspensionDirection)
            cb.write(desc.steeringAxis || pc.Vec3.UP, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);

            // Up direction when the wheel is in the neutral steering position (usually 
            // component.up but can be used to give the wheel camber or for a bike would be -suspensionDirection)
            cb.write(desc.wheelUp || pc.Vec3.UP, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);

            // Forward direction when the wheel is in the neutral steering position (usually 
            // component.forward but can be used to give the wheel toe, does not need to be perpendicular
            // to wheelUp)
            cb.write(desc.wheelForward || pc.Vec3.BACK, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_VEC32, false);

            // How long the suspension is in max raised position relative to the attachment point (m)
            cb.write(desc.suspensionMinLength ?? 0.3, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);

            // How long the suspension is in max droop position relative to the attachment point (m)
            cb.write(desc.suspensionMaxLength ?? 0.5, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);

            // The natural length (m) of the suspension spring is defined as suspensionMaxLength + 
            // suspensionPreloadLength. Can be used to preload the suspension as the spring is compressed
            // by suspensionPreloadLength when the suspension is in max droop position. Note that this means
            // when the vehicle touches the ground there is a discontinuity so it will also make the vehicle
            // more bouncy as we're updating with discrete time steps.
            cb.write(desc.suspensionPreloadLength ?? 0, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);

            // Radius of the wheel (m)
            cb.write(desc.radius ?? 0.3, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);

            // Width of the wheel (m)
            cb.write(desc.width ?? 0.1, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);

            // If disabled, the forces are applied at the collision contact point. This leads to a more
            // accurate simulation when interacting with dynamic objects but makes the vehicle less stable.
            // When setting this to true, all forces will be applied to a fixed point on the vehicle body.
            cb.write(desc.enableSuspensionForcePoint ?? false, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_BOOL, false);

            // wheel spring data
            const spring = desc.spring || {};
            cb.write(spring.mode ?? pc.JOLT_SPRING_MODE_FREQUENCY, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT8, false);
            cb.write(spring.frequency ?? 1.5, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
            cb.write(spring.stiffness ?? 1.5, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
            cb.write(spring.damping ?? 0.5, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);

            // Friction in forward direction of tire as a function of the slip ratio (fraction):
            // (omega_wheel * r_wheel - v_longitudinal) / |v_longitudinal|.
            // Slip ratio here is a ratio of wheel spinning relative to the floor. At 0 the wheel has full
            // traction and is rolling perfectly in sync with the ground. At 1 the wheel is locked and
            // is sliding over the ground.
            VehicleComponent.writeCurvePoints(cb, desc.longitudinalFriction);

            // Friction in sideway direction of tire as a function of the slip angle (degrees):
            // angle between relative contact velocity and vehicle direction.
            // If tire forward matches the vehicle direction, then the angle is 0 degrees. If the 
            // vehicle is sliding sideways, e.g. on ice, then the angle is 90 degrees. Example curve keys could
            // be: [[0, 1], [90, 0.3]] - full friction at zero degrees, and 0.3 friction at 90.
            VehicleComponent.writeCurvePoints(cb, desc.lateralFriction);

            const type = this._type;
            if (type === _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.VEHICLE_TYPE_WHEEL || type === _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.VEHICLE_TYPE_MOTORCYCLE) {

                // Moment of inertia (kg m^2), for a cylinder this would be 0.5 * M * R^2 which is 
                // 0.9 for a wheel with a mass of 20 kg and radius 0.3 m.
                cb.write(desc.inertia ?? 0.9, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);

                // Angular damping factor of the wheel: dw/dt = -c * w.
                cb.write(desc.angularDamping ?? 0.2, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);

                // How much this wheel can steer (radians). Defaults to ~1.22 rad (70 degrees).
                cb.write(desc.maxSteerAngle ?? 1.2217304763960306, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                
                // How much torque (Nm) the brakes can apply to this wheel.
                cb.write(desc.maxBrakeTorque ?? 1500, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);

                // How much torque (Nm) the hand brake can apply to this wheel (usually only applied
                // to the rear wheels)
                cb.write(desc.maxHandBrakeTorque ?? 4000, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
            }
        }
    }

    _writeDifferentials(cb) {
        const differentials = this._differentials;
        const count = differentials.length;

        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev && count === 0) {
            _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.warnOnce('Vehicle component is missing wheels differentials.' +
                'Default values will make a vehicle without wheels.');
        }

        cb.write(count, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < count; i++) {
            const diff = differentials[i];

            // Index (in mWheels) that represents the left wheel of this 
            // differential (can be -1 to indicate no wheel)
            cb.write(diff.leftWheel ?? -1, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_INT32, false);

            // Same as leftWheel, but for the right one.
            cb.write(diff.rightWheel ?? -1, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_INT32, false);

            // Ratio between rotation speed of gear box and wheels.
            cb.write(diff.differentialRatio ?? 3.42, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);

            // Defines how the engine torque is split across the left and right 
            // wheel (0 = left, 0.5 = center, 1 = right)
            cb.write(diff.leftRightSplit ?? 0.5, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);

            // Ratio max / min wheel speed. When this ratio is exceeded, all
            // torque gets distributed to the slowest moving wheel. This allows
            // implementing a limited slip differential. Set to Number.MAX_VALUE
            // for an open differential. Value should be > 1.
            cb.write(diff.limitedSlipRatio ?? 1.4, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);

            // How much of the engines torque is applied to this differential
            // (0 = none, 1 = full), make sure the sum of all differentials is 1.
            cb.write(diff.engineTorqueRatio ?? 1, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        }
    }

    _writeAntiRollBars(cb) {
        const bars = this._antiRollBars;
        const count = bars.length;

        cb.write(count, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < count; i++) {
            const bar = bars[i];

            // Index (in wheels) that represents the left wheel of this anti-rollbar.
            cb.write(bar.leftWheel ?? 0, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);

            // Index (in wheels) that represents the right wheel of this anti-rollbar.
            cb.write(bar.rightWheel ?? 1, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);

            // Stiffness (spring constant in N/m) of anti rollbar, can be 0 to disable the anti-rollbar.
            cb.write(bar.stiffness ?? 1000, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        }
    }

    static writeCurvePoints(cb, curve) {
        cb.write(!!curve, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_BOOL, false);

        if (curve) {
            const keys = curve.keys;
            const count = keys.length;

            cb.write(count, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);

            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];

                cb.write(key[0], _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
                cb.write(key[1], _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
            }
        }
    }

    static writeGears(cb, gears) {
        const count = gears.length;
        cb.write(count, _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_UINT32, false);
        for (let i = 0; i < count; i++) {
            cb.write(gears[i], _constants_mjs__WEBPACK_IMPORTED_MODULE_2__.BUFFER_WRITE_FLOAT32, false);
        }
    }    
}





/***/ }),

/***/ "./src/physics/components/jolt/vehicle/system.mjs":
/*!********************************************************!*\
  !*** ./src/physics/components/jolt/vehicle/system.mjs ***!
  \********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   VehicleComponentSystem: () => (/* binding */ VehicleComponentSystem)
/* harmony export */ });
/* harmony import */ var _util_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../util.mjs */ "./src/physics/util.mjs");
/* harmony import */ var _body_system_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../body/system.mjs */ "./src/physics/components/jolt/body/system.mjs");
/* harmony import */ var _constants_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../constants.mjs */ "./src/physics/components/jolt/constants.mjs");
/* harmony import */ var _component_mjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./component.mjs */ "./src/physics/components/jolt/vehicle/component.mjs");





const schema = [
    'antiRollBars',
    'angularDamping',
    'castFraction',
    'castMaxSlopeAngle',
    'castObjectLayer',
    'castRadius',
    'castType',
    'castUp',
    'clutchReleaseTime',
    'clutchStrength',
    'differentialLimitedSlipRatio',
    'differentials',
    'forward',
    'gearRatios',
    'inertia',
    'numVelocityStepsOverride',
    'leanSmoothingFactor',
    'leanSpringConstant',
    'leanSpringDamping',
    'leanSpringIntegrationCoefficient',
    'leanSpringIntegrationCoefficientDecay',
    'maxLeanAngle',
    'numPositionStepsOverride',
    'maxPitchRollAngle',
    'maxTorque',
    'maxRPM',
    'minRPM',
    'mode',
    'normalizedTorque',
    'reverseGearRatios',
    'shiftDownRPM',
    'shiftUpRPM',
    'switchLatency',
    'switchTime',
    'tracks',
    'type',
    'wheels',
    'up'

];

class VehicleComponentSystem extends _body_system_mjs__WEBPACK_IMPORTED_MODULE_1__.BodyComponentSystem {
    constructor(app, manager, id) {
        super(app, manager);

        this.id = 'vehicle';
        this.schema = [...this.schema, ...schema];
        this.ComponentType = _component_mjs__WEBPACK_IMPORTED_MODULE_3__.VehicleComponent;

        manager.systems.set(id, this);

        (0,_util_mjs__WEBPACK_IMPORTED_MODULE_0__.buildAccessors)(this, this.schema);
    }

    createVehicle(component) {
        super.createBody(component);

        const cb = this._manager.commandsBuffer;

        cb.writeOperator(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.OPERATOR_CREATOR);
        cb.writeCommand(_constants_mjs__WEBPACK_IMPORTED_MODULE_2__.CMD_CREATE_VEHICLE);

        component.writeVehicleData(cb);
    }
}



/***/ }),

/***/ "./src/physics/debug.mjs":
/*!*******************************!*\
  !*** ./src/physics/debug.mjs ***!
  \*******************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Debug: () => (/* binding */ Debug)
/* harmony export */ });
class Debug {
    static _logged = new Set();

    static dev = ("development" === 'development');

    static log(...attr) {
        console.log(...attr);
    }

    static logOnce(msg, ...attr) {
        if (!Debug._logged.has(msg)) {
            Debug._logged.add(msg);
            console.log(msg, ...attr);
        }
    }

    static warn(...attr) {
        console.warn(...attr);
    }

    static warnOnce(msg, ...attr) {
        if (!Debug._logged.has(msg)) {
            Debug._logged.add(msg);
            console.warn(msg, ...attr);
        }
    }

    static error(...attr) {
        console.error(...attr);
    }
    
    static errorOnce(...attr) {
        if (!Debug._logged.has(attr[0])) {
            Debug._logged.add(attr[0]);
            Debug.error(...attr);
        }
    }

    static assert(test, ...attr) {
        if (!test) {
            Debug.errorOnce('Assert Error:', test, ...attr);
            return false;
        }
        return true;
    }

    static checkRange(number, min, max, msg) {
        let ok = Debug.checkFloat(number, msg);
        ok = ok && Debug.assert(number >= min, msg);
        ok = ok && Debug.assert(number <= max, msg);
        return ok;
    }   

    static checkInt(number, msg) {
        const ok = Debug.assert(Number.isInteger(number), msg);
        return ok;
    }    

    static checkUint(number, msg) {
        let ok = Debug.checkInt(number, msg);
        ok = ok && Debug.assert(number >= 0, msg);
        return ok;
    }

    static checkFloat(number, msg) {
        let ok = Debug.assert(typeof number === 'number', msg);
        ok = ok && Debug.assert(!isNaN(number), msg);
        return ok;
    }

    static checkFloatPositive(number, msg) {
        let ok = Debug.checkFloat(number, msg);
        ok = ok && Debug.assert(number >= 0, msg);
        return ok;
    }

    static checkBool(bool, msg) {
        return Debug.assert((bool === true || bool === false), msg);
    }

    static checkVec(vec, msg) {
        let ok = Debug.checkFloat(vec.x, msg);
        ok = ok && Debug.checkFloat(vec.y, msg);
        ok = ok && Debug.checkFloat(vec.z, msg);
        return ok;
    }

    static checkVecPositive(vec, msg) {
        let ok = Debug.checkFloatPositive(vec.x, msg);
        ok = ok && Debug.checkFloatPositive(vec.y, msg);
        ok = ok && Debug.checkFloatPositive(vec.z, msg);
        return ok;
    }

    static checkQuat(quat, msg) {
        let ok = true;
        ok = ok && Debug.checkVec(quat, msg);
        ok = ok && Debug.checkFloat(quat.w, msg);
        return ok;
    }

    static verifyProperties(data, schema) {
        let ok = true;
        Object.entries(data).forEach(entry => {
            let found = false;
            for (let i = 0, end = schema.length; i < end; i++) {
                if (entry[0] === schema[i]) {
                    found = true;
                }
            }
            ok = ok && Debug.assert(found, `Component: Unrecognized options property: ${ entry }`);
        });

        return ok;
    }
}



/***/ }),

/***/ "./src/physics/dispatcher.mjs":
/*!************************************!*\
  !*** ./src/physics/dispatcher.mjs ***!
  \************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Dispatcher: () => (/* binding */ Dispatcher)
/* harmony export */ });
/* harmony import */ var _backends_jolt_backend_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../backends/jolt/backend.mjs */ "./src/backends/jolt/backend.mjs");
/* harmony import */ var _debug_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./debug.mjs */ "./src/physics/debug.mjs");



let backend = null;

function createBackend(messenger, data) {
    // const { backendName, url, config } = data;
    switch (data.backendName) {
        case 'jolt':
            backend = new _backends_jolt_backend_mjs__WEBPACK_IMPORTED_MODULE_0__.JoltBackend(messenger, data);
            break;

        // intentional fall-through
        case 'ammo':
        case 'rapier':
        case 'physx':
            _debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.warn(`Invalid backend selection: ${ backend }`);
            break;

        default:
            _debug_mjs__WEBPACK_IMPORTED_MODULE_1__.Debug.warn(`Invalid backend selection: ${ backend }`);
    }
}

class Dispatcher {
    constructor(manager = null) {
        this._useMainThread = !!manager;
        this._manager = manager;
        this._destroying = false;

        if (!manager) {
            this.postMessage = self.postMessage;
        }
    }

    postMessage(msg) {
        this.handleMessage(msg);
    }

    handleMessage(data) {
        if (this._destroying) return;

        switch (data.type) {
            case 'step':
                backend?.step(data);
                break;

            case 'create-backend':
                createBackend(this, data);
                // If we don't use a Web Worker, expose the backend instance to main thread for dev convenience
                if (this._manager) {
                    this._manager.backend = backend;
                }
                break;

            case 'override-contacts':
                backend?.overrideContacts(data.listener, data.overrides);
                break;

            case 'destroy':
                this.destroy();
                break;

            default:
                break;
        }
    }

    destroy() {
        this._destroying = true;

        backend.destroy();
        backend = null;
        self.onmessage = (e) => {};
        dispatcher = null;
    }

    respond(msg) {
        msg.origin = 'physics-worker';
        if (this._useMainThread) {
            this._manager.onMessage(msg);
        } else {
            self.postMessage(msg);
        }
    }
}

let dispatcher = new Dispatcher();

self.onmessage = function(event) {
    const data = event.data || event;
    if (data.origin !== 'physics-manager') return;
    dispatcher.handleMessage(data);
}



/***/ }),

/***/ "./src/physics/indexed-cache.mjs":
/*!***************************************!*\
  !*** ./src/physics/indexed-cache.mjs ***!
  \***************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   IndexedCache: () => (/* binding */ IndexedCache)
/* harmony export */ });
class IndexedCache {
    constructor() {
        this._index = 0;
        this._freed = [];
        this._storage = [];
    }

    add(element) {
        const index = this._freed.pop() ?? this._index++; 
        this._storage[index] = element;
        return index;
    }

    get(index) {
        return this._storage[index];
    }

    free(index) {
        this._storage[index] = null;
        this._freed.push(index);
    }

    clear() {
        this._index = 0;
        this._freed.length = 0;
        this._storage.length = 0;
    }
}



/***/ }),

/***/ "./src/physics/init.mjs":
/*!******************************!*\
  !*** ./src/physics/init.mjs ***!
  \******************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   init: () => (/* binding */ init)
/* harmony export */ });
/* harmony import */ var _components_jolt_body_system_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./components/jolt/body/system.mjs */ "./src/physics/components/jolt/body/system.mjs");
/* harmony import */ var _components_jolt_char_system_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./components/jolt/char/system.mjs */ "./src/physics/components/jolt/char/system.mjs");
/* harmony import */ var _components_jolt_vehicle_system_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./components/jolt/vehicle/system.mjs */ "./src/physics/components/jolt/vehicle/system.mjs");
/* harmony import */ var _debug_mjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./debug.mjs */ "./src/physics/debug.mjs");
/* harmony import */ var _components_jolt_manager_mjs__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./components/jolt/manager.mjs */ "./src/physics/components/jolt/manager.mjs");
/* harmony import */ var _components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./components/jolt/constants.mjs */ "./src/physics/components/jolt/constants.mjs");
/* harmony import */ var _components_jolt_softbody_system_mjs__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./components/jolt/softbody/system.mjs */ "./src/physics/components/jolt/softbody/system.mjs");








// Override chunk location in order for the engine to locate them in PlayCanvas Editor.
const oldFn = __webpack_require__.u;
__webpack_require__.u = (chunkId) => {
    const filename = oldFn(chunkId);
    const app = pc.Application.getApplication();
    const asset = app.assets.find(filename, 'script');
    const url = asset.getFileUrl();
    return url;
};

// TODO
// Once we add webworker support, init should be changed to async
// function and wait for worker response to resolve.

function init(app = pc.Application.getApplication(), opts = {}) {
    const options = {
        backend: 'jolt',
        propertyName: 'physics',
        ...opts
    };

    const { backend, propertyName } = options;

    switch(backend) {
        case 'jolt': {
            if (app[propertyName]) {
                _debug_mjs__WEBPACK_IMPORTED_MODULE_3__.Debug.dev && _debug_mjs__WEBPACK_IMPORTED_MODULE_3__.Debug.warn(`Unable to initialize Physics Manager. Application has an existing property name that conflicts. ` + 
                    `Tried to use "app.${ propertyName }". Use { propertyName: string } in init options to use a custom property name. Aborting.`);
                return;
            }

            const manager = new _components_jolt_manager_mjs__WEBPACK_IMPORTED_MODULE_4__.JoltManager(app, options);
            app[propertyName] = manager;

            app.systems.add(new _components_jolt_body_system_mjs__WEBPACK_IMPORTED_MODULE_0__.BodyComponentSystem(app, manager, _components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_5__.COMPONENT_SYSTEM_BODY));
            app.systems.add(new _components_jolt_char_system_mjs__WEBPACK_IMPORTED_MODULE_1__.CharComponentSystem(app, manager, _components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_5__.COMPONENT_SYSTEM_CHAR));
            app.systems.add(new _components_jolt_vehicle_system_mjs__WEBPACK_IMPORTED_MODULE_2__.VehicleComponentSystem(app, manager, _components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_5__.COMPONENT_SYSTEM_VEHICLE));
            app.systems.add(new _components_jolt_softbody_system_mjs__WEBPACK_IMPORTED_MODULE_6__.SoftBodyComponentSystem(app, manager, _components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_5__.COMPONENT_SYSTEM_SOFT_BODY));
            break;
        }

        default:
            _debug_mjs__WEBPACK_IMPORTED_MODULE_3__.Debug.dev && _debug_mjs__WEBPACK_IMPORTED_MODULE_3__.Debug.warn(`Backend not implemented: ${ backend }`);
            return destroy();
    }

    app.on('destroy', () => destroy());

    function destroy() {
        app[propertyName].destroy();
        app[propertyName] = null;
    }
}



/***/ }),

/***/ "./src/physics/manager.mjs":
/*!*********************************!*\
  !*** ./src/physics/manager.mjs ***!
  \*********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PhysicsManager: () => (/* binding */ PhysicsManager)
/* harmony export */ });
/* harmony import */ var _package_json__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../package.json */ "./package.json");
/* harmony import */ var _backends_jolt_commands_buffer_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../backends/jolt/commands-buffer.mjs */ "./src/backends/jolt/commands-buffer.mjs");
/* harmony import */ var _debug_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./debug.mjs */ "./src/physics/debug.mjs");
/* harmony import */ var _dispatcher_mjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./dispatcher.mjs */ "./src/physics/dispatcher.mjs");
/* harmony import */ var _indexed_cache_mjs__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./indexed-cache.mjs */ "./src/physics/indexed-cache.mjs");






const stepMessage = { type: 'step', buffer: null, origin: 'physics-manager' };

class PhysicsManager {
    constructor(app, backendName, opts = {}) {
        const config = {
            useSharedArrayBuffer: true,
            commandsBufferSize: 10000, // bytes, 10k is enough to update about 150 active dynamic objects
            allowCommandsBufferResize: true,
            useWebWorker: false,
            fixedStep: 1 / 30,
            subSteps: 1,
            useMotionStates: true,
            debugColorStatic: pc.Color.GRAY,
            debugColorKinematic: pc.Color.MAGENTA,
            debugColorDynamic: pc.Color.YELLOW,
            debugDrawLayerId: pc.LAYERID_IMMEDIATE,
            debugDrawDepth: true,
            ...opts
        };

        // Make sure requested features are supported
        config.useSharedArrayBuffer = config.useSharedArrayBuffer && typeof SharedArrayBuffer !== 'undefined';
        config.useWebWorker = config.useWebWorker && typeof Worker !== 'undefined';
        config.useSAB = config.useWebWorker && config.useSharedArrayBuffer;

        this._createDispatcher(config);

        this._systems = new Map();
        this._backend = null

        // const asset = app.assets.find('jolt-physics.wasm-compat.js');
        // const url = asset.getFileURL();
        // asset.ready(loadedAsset => {
        //     // const resp = await fetch(url);
        //     // const buffer  = await resp.arrayBuffer();

        //     console.log(loadedAsset)
            
        //     // const msg = Object.create(null);
        //     // msg.type = 'create-backend';
        //     // // msg.module = asset.getFileURL();
        //     // msg.backendName = backendName;
        //     // msg.config = config;
        //     // this.sendUncompressed(msg);
        // });
        // app.assets.load(asset);
        
        // const asset = app.assets.find('jolt-physics.wasm-compat.js');
        // asset.ready(async loadedAsset => {
        //     const module = await import(loadedAsset.getFileUrl());
        //     module.default().then(Jolt => {
        //         console.log(Jolt);

        //         // window.Jolt = Jolt;
        //         const msg = Object.create(null);
        //         msg.type = 'create-backend';
        //         // msg.module = asset.getFileURL();
        //         msg.backendName = backendName;
        //         msg.config = config;
        //         this.sendUncompressed(msg);                
        //     });
        // });
        // app.assets.load(asset);

        // if (window.Jolt) return;
        // const asset = app.assets.find('jolt-physics.wasm-compat.js');
        // async function load() {
        //     const url = asset.getAbsoluteUrl(asset.getFileUrl());
        //     const module = await import(url);
        //     module.default().then(Jolt => {
        //         window.Jolt = Jolt;
        //         // onLoad();
        //     });
        // }
        // load();

        const wasmAsset = app.assets.find('jolt-physics.wasm.wasm');
        const glueAsset = app.assets.find('jolt-physics.wasm.js');

        const msg = Object.create(null);
        msg.type = 'create-backend';
        msg.glueUrl = glueAsset.getFileUrl();
        msg.wasmUrl = wasmAsset.getFileUrl();
        // msg.module = mod;
        msg.backendName = backendName;
        msg.config = config;
        this.sendUncompressed(msg);


        // WebAssembly.compileStreaming(fetch(wasmAsset.getFileUrl())).then((mod) => {
        //     const msg = Object.create(null);
        //     msg.type = 'create-backend';
        //     msg.glueUrl = glueAsset.getFileUrl();
        //     msg.module = mod;
        //     msg.backendName = backendName;
        //     msg.config = config;
        //     this.sendUncompressed(msg);
        // });

        this._outBuffer = new _backends_jolt_commands_buffer_mjs__WEBPACK_IMPORTED_MODULE_1__.CommandsBuffer(config);
        this._inBuffer = null;
        this._paused = false;
        this._steps = 0;

        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev) {
            this._perfCache = new _indexed_cache_mjs__WEBPACK_IMPORTED_MODULE_4__.IndexedCache();
        }

        this._frame = app.stats.frame;
        this._updateEvent = app.systems.on('postUpdate', this.onUpdate, this);

        this.version = _package_json__WEBPACK_IMPORTED_MODULE_0__.version;

        this._config = config;
        this._app = app;
    }

    set backend(instance) {
        this._backend = instance;
    }
    get backend() {
        return this._backend;
    }

    get systems() {
        return this._systems;
    }

    set paused(bool) {
        this._paused = bool;
    }
    get paused() {
        return this._paused;
    }

    get commandsBuffer() {
        return this._outBuffer;
    }

    get config() {
        return this._config;
    }

    get steps() {
        return this._steps;
    }

    onUpdate() {
        if (this._paused) return;

        let index;
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev) {
            const startTime = performance.now();
            index = this._perfCache.add(startTime);
        }
        
        this._writeIsometry();
        this._dispatchCommands(this._frame.dt, index);
    }

    sendUncompressed(msg) {
        msg.origin = 'physics-manager';
        this._dispatcher.postMessage(msg);
    }

    onMessage(msg) {
        if (this._paused || msg.origin !== 'physics-worker') return;

        const systems = this._systems;
        let inBuffer = this._inBuffer;

        if (msg.buffer) {
            if (!inBuffer) {
                inBuffer = this._inBuffer = new _backends_jolt_commands_buffer_mjs__WEBPACK_IMPORTED_MODULE_1__.CommandsBuffer();
            }

            // Make sure to use the incoming buffer, as the old one could
            // have been destroyed during resize.
            inBuffer.buffer = msg.buffer;

            const count = inBuffer.commandsCount;
            for (let i = 0; i < count; i++) {
                const operator = inBuffer.readOperator();
                if (_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev) {
                    const ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.assert(!!systems.get(operator), `Invalid component system: ${ operator }`);
                    if (!ok) {
                        this._updateEvent.off();
                        return;
                    }
                }

                systems.get(operator).processCommands(inBuffer);
            }

            inBuffer.reset();
        }

        this._steps = msg.steps ?? 0;

        // TODO
        // handle properly when we are in a module, e.g. engine only
        const constants = msg.constants;
        if (constants) {
            for (let i = 0, end = constants.length; i < end; i += 2) {
                const key = constants[i];
                const value = constants[i + 1];

                window.pc[key] = value;
            }
        }

        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev) {
            const perfIndex = msg.perfIndex;
            if (perfIndex == null) return;

            const cache = this._perfCache;
            const startTime = cache.get(perfIndex);
            const frame = this._app.stats.frame;
            
            cache.free(perfIndex);
            frame.physicsTime = performance.now() - startTime + msg.time;
        }        
    }

    destroy() {
        this._systems.forEach(system => {
            system.destroy();
        });
        this._systems.clear();

        const msg = Object.create(null);
        msg.type = 'destroy';
        this.sendUncompressed(msg);
        this._backend = null;

        this._commandsBuffer.destroy();
        this._commandsBuffer = null;

        this._dispatcher = null;
        this._frame = null;

        this._updateEvent?.off();
        this._updateEvent = null;

        this._app[this._config.propertyName] = null;
    }

    _writeIsometry() {
        this._systems.forEach(system => {
            system.requestIsometry?.();
        })
    }

    _dispatchCommands(dt, perfIndex) {
        const cb = this._outBuffer;

        stepMessage.dt = dt;

        if (!cb.dirty) {
            stepMessage.buffer = null;
            this._dispatcher.postMessage(stepMessage);
            return;
        }

        const buffer = cb.buffer;
        const buffers = [ buffer ];
        stepMessage.buffer = buffer;

        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_2__.Debug.dev) {
            stepMessage.perfIndex = perfIndex;
        }

        // Also add any potential mesh and convex hull shapes buffers
        const meshBuffers = cb.meshBuffers;
        if (meshBuffers.length > 0) {
            stepMessage.meshBuffers = meshBuffers;
            buffers.push(...meshBuffers);
        } else {
            stepMessage.meshBuffers = null;
        }

        if (this._config.useSAB) {
            this._dispatcher.postMessage(stepMessage);
        } else {
            this._dispatcher.postMessage(stepMessage, buffers);
        }

        cb.meshBuffers.length = 0;
        cb.reset();
    }

    _createDispatcher(config) {
        if (config.useWebWorker) {
            // TODO
            // This will generate a chunk, which will not be able to be found correctly, when
            // using PlayCanvas Editor. Revisit when ESMScripts are supported.
            this._dispatcher = new Worker(
                /* webpackChunkName: "worker" */ new URL(/* worker import */ __webpack_require__.p + __webpack_require__.u("worker"), __webpack_require__.b
            ), { type: undefined });
        } else {
            this._dispatcher = new _dispatcher_mjs__WEBPACK_IMPORTED_MODULE_3__.Dispatcher(this);
        }
    }
}



/***/ }),

/***/ "./src/physics/math.mjs":
/*!******************************!*\
  !*** ./src/physics/math.mjs ***!
  \******************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   extendMath: () => (/* binding */ extendMath)
/* harmony export */ });
/* harmony import */ var _debug_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./debug.mjs */ "./src/physics/debug.mjs");
/* harmony import */ var _components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./components/jolt/constants.mjs */ "./src/physics/components/jolt/constants.mjs");



function extendMath() {
    pc.Vec3.fromBuffer = function(buffer) {
        return new pc.Vec3(
            buffer.read(_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
            buffer.read(_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
            buffer.read(_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32)
        );
    };

    Jolt.Vec3.prototype.FromBuffer = function(buffer, isPositive) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            const x = buffer.read(_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32);
            const y = buffer.read(_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32);
            const z = buffer.read(_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32);

            const test = isPositive ? _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloatPositive : _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat;

            let ok = test(x, `invalid vector X component: ${ x }`);
            ok = ok && test(y, `invalid vector Y component: ${ y }`);
            ok = ok && test(z, `invalid vector Z component: ${ z }`);
            if (!ok) return this;

            this.Set(x, y, z);
        } else {
            this.Set(
                buffer.read(_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
                buffer.read(_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
                buffer.read(_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32)
            );
        }

        return this;
    };

    Jolt.Vec3.prototype.set = function(x, y, z) {
        this.Set(x, y, z);
        return this;
    };

    Jolt.Vec3.prototype.print = function() {
        console.log(this.GetX(), this.GetY(), this.GetZ());
    };

    Jolt.Quat.prototype.FromBuffer = function(buffer) {
        if (_debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.dev) {
            const x = buffer.read(_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32);
            const y = buffer.read(_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32);
            const z = buffer.read(_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32);
            const w = buffer.read(_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32);

            let ok = _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(x, `invalid quaternion X component: ${ x }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(y, `invalid quaternion Y component: ${ y }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(z, `invalid quaternion Z component: ${ z }`);
            ok = ok && _debug_mjs__WEBPACK_IMPORTED_MODULE_0__.Debug.checkFloat(w, `invalid quaternion W component: ${ w }`);
            if (!ok) return this;

            this.Set(x, y, z, w);
        } else {
            this.Set(
                buffer.read(_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
                buffer.read(_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
                buffer.read(_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32),
                buffer.read(_components_jolt_constants_mjs__WEBPACK_IMPORTED_MODULE_1__.BUFFER_READ_FLOAT32)
            );
        }

        return this;
    };

    Jolt.Quat.prototype.set = function(x, y, z, w) {
        this.Set(x, y, z, w);
        return this;
    };

    Jolt.Quat.prototype.print = function() {
        console.log(this.GetX(), this.GetY(), this.GetZ(), this.GetW());
    };
}



/***/ }),

/***/ "./src/physics/util.mjs":
/*!******************************!*\
  !*** ./src/physics/util.mjs ***!
  \******************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   buildAccessors: () => (/* binding */ buildAccessors)
/* harmony export */ });
function buildAccessors(obj, schema) {
    // Create getter/setter pairs for each property defined in the schema
    for (let i = 0, end = schema.length; i < end; i++) {
        const property = schema[i];

        // Don't override existing getters/setters
        const etter = Object.getOwnPropertyDescriptor(obj, property);
        if (etter != null) continue;

        Object.defineProperty(obj, property, {
            get: function () {
                return this[`_${ property }`];
            },
            set: function (value) {
                const oldValue = this[`_${ property }`];
                this[`_${ property }`] = value;
                this.fire('set', property, oldValue, value);
            },
            configurable: true
        });
    }

    obj._accessorsBuilt = true;
}



/***/ }),

/***/ "./node_modules/jolt-physics/package.json":
/*!************************************************!*\
  !*** ./node_modules/jolt-physics/package.json ***!
  \************************************************/
/***/ ((module) => {

module.exports = JSON.parse('{"name":"jolt-physics","version":"0.16.0","description":"A WebAssembly port of JoltPhysics, a rigid body physics and collision detection library, suitable for games and VR applications","type":"module","main":"dist/jolt-physics.wasm-compat.js","types":"dist/jolt-physics.wasm-compat.d.ts","exports":{".":{"types":"./dist/jolt-physics.wasm-compat.d.ts","default":"./dist/jolt-physics.wasm-compat.js"},"./wasm":{"types":"./dist/jolt-physics.wasm.d.ts","default":"./dist/jolt-physics.wasm.js"},"./wasm-compat":{"types":"./dist/jolt-physics.wasm-compat.d.ts","default":"./dist/jolt-physics.wasm-compat.js"},"./asm":{"types":"./dist/jolt-physics.d.ts","default":"./dist/jolt-physics.js"},"./jolt-physics.wasm.wasm":"./dist/jolt-physics.wasm.wasm","./package.json":"./package.json"},"scripts":{"build":"sh build.sh","examples":"http-server ./Examples"},"homepage":"https://github.com/jrouwe/JoltPhysics.js","repository":"https://github.com/jrouwe/JoltPhysics.js.git","author":"jrouwe","license":"MIT","files":["README.md","LICENSE","./dist/jolt-physics.js","./dist/jolt-physics.d.ts","./dist/jolt-physics.wasm-compat.js","./dist/jolt-physics.wasm-compat.d.ts","./dist/jolt-physics.wasm.js","./dist/jolt-physics.wasm.d.ts","./dist/jolt-physics.wasm.wasm","./dist/types.d.ts","asm","wasm","wasm-compat"],"keywords":["physics","physics-engine","physics-simulation","simulation","game-engine","vr","game-development","webassembly","wasm"],"devDependencies":{"http-server":"^14.1.1","webidl-dts-gen":"^1.7.0"}}');

/***/ }),

/***/ "./package.json":
/*!**********************!*\
  !*** ./package.json ***!
  \**********************/
/***/ ((module) => {

module.exports = JSON.parse('{"name":"jolt","version":"0.1.0","main":"index.js","license":"MIT","type":"module","scripts":{"build":"rimraf dist && webpack --mode=production && webpack --mode=development","build:dev":"rimraf dist && webpack --mode=development","build:prod":"rimraf dist && webpack --mode=production"},"dependencies":{"jolt-physics":"^0.16.0","playcanvas":"^1.66.1"},"devDependencies":{"rimraf":"^5.0.5","webpack":"^5.89.0","webpack-cli":"^5.1.4"}}');

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".physics-components.dbg.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript)
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && !scriptUrl) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = document.baseURI || self.location.href;
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"main": 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// no jsonp function
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!***********************!*\
  !*** ./src/index.mjs ***!
  \***********************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   init: () => (/* reexport safe */ _physics_init_mjs__WEBPACK_IMPORTED_MODULE_0__.init)
/* harmony export */ });
/* harmony import */ var _physics_init_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./physics/init.mjs */ "./src/physics/init.mjs");



})();

PhysicsComponents = __webpack_exports__;
/******/ })()
;