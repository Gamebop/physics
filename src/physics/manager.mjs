import info from "../../package.json";
import { CommandsBuffer } from "../backends/jolt/commands-buffer.mjs";
import { Debug } from "./debug.mjs";
import { Dispatcher } from "./dispatcher.mjs";
import { IndexedCache } from "./indexed-cache.mjs";

const stepMessage = { type: 'step', buffer: null };

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

        this._createDispatcher(config);

        this._backend = null
        const msg = Object.create(null);
        msg.type = 'create-backend';
        msg.backendName = backendName;
        msg.config = config;
        this.sendUncompressed(msg);

        this._outBuffer = new CommandsBuffer(config);
        this._inBuffer = null;

        this._systems = new Map();
        this._paused = false;
        this._steps = 0;

        if (Debug.dev) {
            this._perfCache = new IndexedCache();
        }

        this._frame = app.stats.frame;
        this._updateEvent = app.systems.on('postUpdate', this.onUpdate, this);

        this.version = info.version;

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
        if (Debug.dev) {
            const startTime = performance.now();
            index = this._perfCache.add(startTime);
        }
        
        this._writeKinematicIsometry();
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
                inBuffer = this._inBuffer = new CommandsBuffer();
            }

            // Make sure to use the incoming buffer, as the old one could
            // have been destroyed during resize.
            inBuffer.buffer = msg.buffer;

            const count = inBuffer.commandsCount;
            for (let i = 0; i < count; i++) {
                const operator = inBuffer.readOperator();
                if (Debug.dev) {
                    const ok = Debug.assert(!!systems.get(operator), `Invalid component system: ${ operator }`);
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

        if (Debug.dev) {
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

    _writeKinematicIsometry() {
        this._systems.forEach(system => {
            system.requestKinematicIsometry?.();
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

        if (Debug.dev) {
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

        this._dispatcher.postMessage(stepMessage, buffers);

        cb.meshBuffers.length = 0;
        cb.reset();
    }

    _createDispatcher(config) {
        if (config.useWebWorker) {
            // TODO
            // This will generate a chunk, which will not be able to be found correctly, when
            // using PlayCanvas Editor. Revisit when ESMScripts are supported.
            // this._dispatcher = new Worker(new URL('./dispatcher.mjs', import.meta.url));
        } else {
            this._dispatcher = new Dispatcher(this, false);
        }
    }
}

export { PhysicsManager };