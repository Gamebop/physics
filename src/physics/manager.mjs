import { Color, LAYERID_IMMEDIATE } from 'playcanvas';
import { CommandsBuffer } from './jolt/back/commands-buffer.mjs';
import { Debug } from './jolt/debug.mjs';
import { Dispatcher } from './dispatcher.mjs';
import { IndexedCache } from './indexed-cache.mjs';

class PhysicsManager {
    constructor(app, opts = {}) {
        const config = {
            useSharedArrayBuffer: true,
            commandsBufferSize: 10000, // bytes, 10k is enough to update about 150 active dynamic objects
            allowCommandsBufferResize: true,
            useWebWorker: false,
            fixedStep: 1 / 30,
            subSteps: 1,
            useMotionStates: true,
            debugColorStatic: Color.GRAY,
            debugColorKinematic: Color.MAGENTA,
            debugColorDynamic: Color.YELLOW,
            debugDrawLayerId: LAYERID_IMMEDIATE,
            debugDrawDepth: true,
            ...opts
        };

        // Make sure requested features are supported
        config.useSharedArrayBuffer = config.useSharedArrayBuffer && typeof SharedArrayBuffer !== 'undefined';
        config.useWebWorker = config.useWebWorker && typeof Worker !== 'undefined';
        config.useSAB = config.useWebWorker && config.useSharedArrayBuffer;

        this._createDispatcher(config);

        this._systems = new Map();
        this._backend = null;

        this._outBuffer = new CommandsBuffer(config);
        this._outBuffers = [];
        this._inBuffer = null;
        this._updateEvent = null;
        this._paused = false;
        this._steps = 0;
        this._fixedStep = config.fixedStep;
        this._canDispatch = true;
        this._stepMessage = {
            type: 'step', buffer: null, inBuffer: null, origin: 'physics-manager'
        };

        if ($_DEBUG) {
            this._perfCache = new IndexedCache();
        }

        this._frame = app.stats.frame;

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

    get fixedStep() {
        return this._fixedStep;
    }

    onUpdate() {
        if (this._paused) return;

        if (!this._canDispatch) {
            this._skipped = true;
            return;
        }

        let index;
        if ($_DEBUG) {
            const startTime = performance.now();
            index = this._perfCache.add(startTime);

            this._lastIndex = index;

            if (index > 50) {
                this._paused = true;
            }
        }

        this._canDispatch = false;
        this._skipped = false;

        this._writeIsometry();
        this._dispatchCommands(this._frame.dt, index);
    }

    sendUncompressed(msg) {
        msg.origin = 'physics-manager';
        this._dispatcher.postMessage(msg);
    }

    // TODO
    // move the commands buffer handling out to Jolt Manager
    onMessage(msg) {
        if (this._paused || msg.origin !== 'physics-worker') return;

        this._canDispatch = true;

        const systems = this._systems;
        let inBuffer = this._inBuffer;

        if (msg.buffer) {
            if (!inBuffer) {
                inBuffer = this._inBuffer = new CommandsBuffer();
            }

            // Make sure to use the incoming buffer, as the old one could
            // have been destroyed during resize.
            inBuffer.buffer = msg.buffer;
            if (msg.inBuffer) {
                this._outBuffer.buffer = msg.inBuffer;
            }

            const count = inBuffer.commandsCount;
            for (let i = 0; i < count; i++) {
                const operator = inBuffer.readOperator();
                if ($_DEBUG) {
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

            this._updateEvent = this._app.systems.on('postUpdate', this.onUpdate, this);
        }

        if ($_DEBUG) {
            const perfIndex = msg.perfIndex;
            
            if (perfIndex == null) return;
            
            const cache = this._perfCache;
            const startTime = cache.get(perfIndex);
            const frame = this._app.stats.frame;
            
            cache.free(perfIndex);
            frame.physicsTime = performance.now() - startTime + msg.time;
        }

        if (this._skipped) {
            this._canDispatch = false;
            this._skipped = false;
            this._writeIsometry();
            this._dispatchCommands(this._frame.dt, this._lastIndex);
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
        const inBuffer = this._inBuffer;
        const msg = this._stepMessage;
        const useSAB = this._config.useSAB;

        msg.dt = dt;

        if ($_DEBUG) {
            msg.perfIndex = perfIndex;
        }

        if (!cb.dirty) {
            msg.buffer = null;
            if (inBuffer && inBuffer.buffer.byteLength > 0) {
                const ib = inBuffer.buffer;
                msg.inBuffer = ib;
                this._dispatcher.postMessage(msg, useSAB ? null : [ ib ]);
            } else {
                msg.inBuffer = null;
                this._dispatcher.postMessage(msg);
            }
            return;
        }

        const buffer = cb.buffer;
        const buffers = this._outBuffers;

        msg.buffer = buffer;
        buffers.length = 0;

        // Also add any potential mesh and convex hull shapes buffers
        const meshBuffers = cb.meshBuffers;
        if (meshBuffers.length > 0) {
            msg.meshBuffers = meshBuffers;
            buffers.push(...meshBuffers);
        } else {
            msg.meshBuffers = null;
        }

        if (useSAB) {
            this._dispatcher.postMessage(msg);
        } else {
            buffers.push(buffer);
            if (inBuffer) {
                const ib = inBuffer.buffer;
                msg.inBuffer = ib;
                buffers.push(ib);
            }
            this._dispatcher.postMessage(msg, buffers);
        }

        cb.meshBuffers.length = 0;
        cb.reset();
    }

    _createDispatcher(config) {
        if (config.useWebWorker) {
            this._dispatcher = new Worker(new URL('./dispatcher.mjs', import.meta.url));
            this._dispatcher.onmessage = this.onMessage.bind(this);
        } else {
            this._dispatcher = new Dispatcher(this);
        }
    }
}

export { PhysicsManager };