import joltInfo from 'jolt-physics/package.json';

let Debug$1 = class Debug {
    static _logged = new Set();

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
        let ok = Debug.checkVec(quat, msg);
        ok = ok && Debug.checkFloat(quat.w, msg);
        return ok;
    }

    static checkSpringSettings(settings) {
        let ok = Debug.assert(typeof settings === 'object', 'Invalid settings object for constraint', settings);
        if (settings.springMode != null) {
            ok = ok && Debug.checkFloat(settings.springMode, `Invalid spring mode: ${ settings.springMode }`);
        }
        if (settings.frequency != null) {
            ok = ok && Debug.checkFloat(settings.frequency, `Invalid spring frequency: ${ settings.frequency }`);
        }
        if (settings.stiffness != null) {
            ok = ok && Debug.checkFloat(settings.stiffness, `Invalid spring stiffness: ${ settings.stiffness }`);
        }
        if (settings.damping != null) {
            ok = ok && Debug.checkFloat(settings.damping, `Invalid spring stiffness: ${ settings.damping }`);
        }
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
};

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

var name = "physics";
var version = "0.1.0";
var main = "index.mjs";
var license = "MIT";
var type = "module";
var scripts = {
	build: "rimraf dist && webpack --mode=production && webpack --mode=development && typedoc",
	"build:dev": "rimraf dist && rollup -c",
	"build:prod": "rimraf dist && webpack --mode=production"
};
var dependencies = {
	"jolt-physics": "^0.23.0",
	playcanvas: "^1.66.1"
};
var devDependencies = {
	"@rollup/plugin-json": "^6.1.0",
	rimraf: "^5.0.5",
	rollup: "^4.17.1",
	typedoc: "^0.25.8",
	typescript: "^5.3.3"
};
var info = {
	name: name,
	version: version,
	main: main,
	license: license,
	type: type,
	scripts: scripts,
	dependencies: dependencies,
	devDependencies: devDependencies
};

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
        this._bytesOffset = UINT16_SIZE;
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
        vec.x = this.read(BUFFER_READ_FLOAT32);
        vec.y = this.read(BUFFER_READ_FLOAT32);
        vec.z = this.read(BUFFER_READ_FLOAT32);
    }

    readQuat(quat) {
        this.readVec(quat);
        quat.w = this.read(BUFFER_READ_FLOAT32);
    }

    ignoreFlag() {
        this._bytesOffset += UINT8_SIZE;
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
        DEBUG && Debug$1.assert(
            method === BUFFER_READ_BOOL ||
            method === BUFFER_READ_FLOAT32 ||
            method === BUFFER_READ_UINT8 ||
            method === BUFFER_READ_UINT16 ||
            method === BUFFER_READ_UINT32 ||
            method === BUFFER_READ_INT32,
            `Invalid write command method: ${ method }`
        );

        return this[method]();
    }

    /**
     * Writes value to buffer. Skips flag for uint8 values.
     */
    write(value, method, addFlag = true) {
        if (DEBUG) {
            Debug$1.assert(
                method === BUFFER_WRITE_BOOL || 
                method === BUFFER_WRITE_FLOAT32 ||
                method === BUFFER_WRITE_UINT8 ||
                method === BUFFER_WRITE_UINT16 ||
                method === BUFFER_WRITE_UINT32 ||
                method === BUFFER_WRITE_INT32 ||
                method === BUFFER_WRITE_VEC32 ||
                method === BUFFER_WRITE_JOLTVEC32 ||
                method === BUFFER_WRITE_PLANE,
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
        return this.readUint16();
    }

    /**
     * 
     * @param {Number} command Number in [0-255] range specifying a command variant for backend
     */
    writeCommand(command) {
        this._increment();
        this.writeUint16(command);
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
        if (DEBUG && this._isOutsideBounds(FLOAT32_SIZE)) {
            Debug$1.warnOnce('Commands Buffer: Aborting read outside buffer bounds.');
            return 0;
        }
        const value = this._view.getFloat32(this._bytesOffset);
        DEBUG && Debug$1.checkFloat(value, `Got invalid value from buffer: ${ value }`);
        this._bytesOffset += FLOAT32_SIZE;
        return value;
    }

    /**
     * 
     * @param {Number} value 
     */
    writeFloat32(value, offset) {
        if (!this._canWrite(FLOAT32_SIZE)) return;
        DEBUG && Debug$1.checkFloat(value, `Trying to write invalid value to buffer: ${ value }`);
        if (offset == null) {
            this._view.setFloat32(this._bytesOffset, value);
            this._bytesOffset += FLOAT32_SIZE;
        } else {
            DEBUG && Debug$1.assert(this._buffer.byteLength >= (offset + FLOAT32_SIZE), 'Trying to write outside of buffer bounds.');
            this._view.setFloat32(offset, value);
        }
    }

    readUint8() {
        if (DEBUG && this._isOutsideBounds(UINT8_SIZE)) {
            Debug$1.warnOnce('Commands Buffer: Aborting read outside buffer bounds.');
            return 0;
        }
        const value = this._view.getUint8(this._bytesOffset);
        DEBUG && Debug$1.checkUint(value, `Got invalid value from buffer: ${ value }`);
        this._bytesOffset += UINT8_SIZE;
        return value;
    }

    /**
     * 
     * @param {Number} value 
     */
    writeUint8(value, offset) {
        if (!this._canWrite(UINT8_SIZE)) return;
        DEBUG && Debug$1.checkUint(value, `Trying to write invalid value to buffer: ${ value }`);
        if (offset == null) {
            this._view.setUint8(this._bytesOffset, value);
            this._bytesOffset += UINT8_SIZE;
        } else {
            DEBUG && Debug$1.assert(this._buffer.byteLength >= (offset + UINT8_SIZE), 'Trying to write outside of buffer bounds.');
            this._view.setUint8(offset, value);
        }
    }

    readUint16() {
        if (DEBUG && this._isOutsideBounds(UINT16_SIZE)) {
            Debug$1.warnOnce('Commands Buffer: Aborting read outside buffer bounds.');
            return 0;
        }
        const value = this._view.getUint16(this._bytesOffset);
        DEBUG && Debug$1.checkUint(value, `Got invalid value from buffer: ${ value }`);
        this._bytesOffset += UINT16_SIZE;
        return value;
    }

    /**
     * 
     * @param {Number} value 
     */
    writeUint16(value, offset) {
        if (!this._canWrite(UINT16_SIZE)) return;
        DEBUG && Debug$1.checkUint(value, `Trying to write invalid value to buffer: ${ value }`);
        if (offset == null) {
            this._view.setUint16(this._bytesOffset, value);
            this._bytesOffset += UINT16_SIZE;
        } else {
            DEBUG && Debug$1.assert(this._buffer.byteLength >= (offset + UINT16_SIZE), 'Trying to write outside of buffer bounds.');
            this._view.setUint16(offset, value);
        }
    }

    readUint32() {
        if (DEBUG && this._isOutsideBounds(UINT32_SIZE)) {
            Debug$1.warnOnce('Commands Buffer: Aborting read outside buffer bounds.');
            return 0;
        }
        const value = this._view.getUint32(this._bytesOffset);
        DEBUG && Debug$1.checkUint(value, `Got invalid value from buffer: ${ value }`);
        this._bytesOffset += UINT32_SIZE;
        return value;
    }

    writeUint32(value, offset) {
        DEBUG && Debug$1.checkUint(value, `Trying to write invalid value to buffer: ${ value }`);
        if (offset == null) {
            if (!this._canWrite(UINT32_SIZE)) return;
            this._view.setUint32(this._bytesOffset, value);
            this._bytesOffset += UINT32_SIZE;
        } else {
            DEBUG && Debug$1.assert(this._buffer.byteLength >= (offset + UINT32_SIZE), 'Trying to write outside of buffer bounds.');
            this._view.setUint32(offset, value);
        }
    }

    readInt32() {
        if (DEBUG && this._isOutsideBounds(INT32_SIZE)) {
            Debug$1.warnOnce('Commands Buffer: Aborting read outside buffer bounds.');
            return null;
        }
        const value = this._view.getInt32(this._bytesOffset);
        DEBUG && Debug$1.checkInt(value, `Got invalid value from buffer: ${ value }`);
        this._bytesOffset += INT32_SIZE;
        return value;
    }

    writeInt32(value, offset) {
        DEBUG && Debug$1.checkInt(value, `Trying to write invalid value to buffer: ${ value }`);
        if (offset == null) {
            if (!this._canWrite(INT32_SIZE)) return;
            this._view.setInt32(this._bytesOffset, value);
            this._bytesOffset += INT32_SIZE;
        } else {
            DEBUG && Debug$1.assert(this._buffer.byteLength >= (offset + INT32_SIZE), 'Trying to write outside of buffer bounds.');
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
        this._bytesOffset = UINT16_SIZE;
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
                DEBUG && Debug$1.warnOnce('Commands Buffer: reached capacity limits. Not allowed to grow.' +
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

function extendPCMath() {
    pc.Vec3.fromBuffer = function(buffer) {
        return new pc.Vec3(
            buffer.read(BUFFER_READ_FLOAT32),
            buffer.read(BUFFER_READ_FLOAT32),
            buffer.read(BUFFER_READ_FLOAT32)
        );
    };
}

function extendJoltMath(Jolt) {
    Jolt.Vec3.prototype.FromBuffer = function(buffer, isPositive) {
        if (DEBUG) {
            const x = buffer.read(BUFFER_READ_FLOAT32);
            const y = buffer.read(BUFFER_READ_FLOAT32);
            const z = buffer.read(BUFFER_READ_FLOAT32);

            const test = isPositive ? Debug$1.checkFloatPositive : Debug$1.checkFloat;

            let ok = test(x, `invalid vector X component: ${ x }`);
            ok = ok && test(y, `invalid vector Y component: ${ y }`);
            ok = ok && test(z, `invalid vector Z component: ${ z }`);
            if (!ok) return this;

            this.Set(x, y, z);
        } else {
            this.Set(
                buffer.read(BUFFER_READ_FLOAT32),
                buffer.read(BUFFER_READ_FLOAT32),
                buffer.read(BUFFER_READ_FLOAT32)
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
        if (DEBUG) {
            const x = buffer.read(BUFFER_READ_FLOAT32);
            const y = buffer.read(BUFFER_READ_FLOAT32);
            const z = buffer.read(BUFFER_READ_FLOAT32);
            const w = buffer.read(BUFFER_READ_FLOAT32);

            let ok = Debug$1.checkFloat(x, `invalid quaternion X component: ${ x }`);
            ok = ok && Debug$1.checkFloat(y, `invalid quaternion Y component: ${ y }`);
            ok = ok && Debug$1.checkFloat(z, `invalid quaternion Z component: ${ z }`);
            ok = ok && Debug$1.checkFloat(w, `invalid quaternion W component: ${ w }`);
            if (!ok) return this;

            this.Set(x, y, z, w);
        } else {
            this.Set(
                buffer.read(BUFFER_READ_FLOAT32),
                buffer.read(BUFFER_READ_FLOAT32),
                buffer.read(BUFFER_READ_FLOAT32),
                buffer.read(BUFFER_READ_FLOAT32)
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

class Cleaner {
    constructor(backend) {
        this._backend = backend;
    }

    clean() {
        const cb = this._backend.inBuffer;
        const command = cb.readCommand();
        let ok = true;

        switch (command) {
            case CMD_DESTROY_BODY:
                ok = this._destroyBody(cb);
                break;

            case CMD_DESTROY_SHAPE:
                ok = this._destroyShape(cb);
                break;

            case CMD_DESTROY_CONSTRAINT:
                ok = this._destroyConstraint(cb);
                break;
        }

        return ok;
    }

    destroy() {
        this._backend = null;
    }

    _destroyBody(cb) {
        const index = cb.read(BUFFER_READ_UINT32);
        const backend = this._backend;
        const Jolt = backend.Jolt;
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

        if (body.isCharacter) {
            if (body.bodyFilter) {
                Jolt.destroy(body.bodyFilter);
            }

            Jolt.destroy(body);
        } else {
            const id = body.GetID();
            bodyInterface.RemoveBody(id);
            bodyInterface.DestroyBody(id);
        }

        return true;
    }

    _destroyConstraint(cb) {
        const backend = this._backend;
        const tracker = backend.tracker;
        const bodyInterface = backend.bodyInterface;
        const Jolt = backend.Jolt;
        const map = tracker.constraintMap;

        const index = cb.read(BUFFER_READ_UINT32);
        const data = map.get(index);
        if (!data) {
            return true;
        }

        const { constraint, body1, body2 } = data;

        const clearIndex = list => {
            const idx = list?.findIndex(e => e === index);
            if (idx >= 0) {
                list.splice(idx, 1);
            }
        };

        const activate = body => {
            if (Jolt.getPointer(body) !== 0) {
                bodyInterface.ActivateBody(body.GetID());
            }
        };

        clearIndex(body1.constraints);
        clearIndex(body2.constraints);

        activate(body1);
        activate(body2);

        if (Jolt.getPointer(constraint) !== 0) {
            backend.physicsSystem.RemoveConstraint(constraint);
        }
        map.delete(index);

        return true;
    }

    _destroyShape(cb) {
        const backend = this._backend;
        const Jolt = backend.Jolt;
        const tracker = backend.tracker;
        const shapeNumber = cb.read(BUFFER_READ_UINT32);
        const shape = tracker.shapeMap.get(shapeNumber);

        if (DEBUG && !shape) {
            Debug$1.warn('Trying to destroy a shape that has already been destroyed');
            return false;
        }

        Jolt.destroy(shape);

        tracker.shapeMap.delete(shapeNumber);

        return true;
    }
}

const v1 = { x: 0, y: 0, z: 0 };

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
            DEBUG && Debug$1.error(e);
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

function createSpringSettings(cb, Jolt) {
    const springSettings = new Jolt.SpringSettings();
    const mode = cb.flag ? cb.read(BUFFER_READ_UINT8) : SPRING_MODE_FREQUENCY;
    const isFrequencyMode = mode === SPRING_MODE_FREQUENCY;
    springSettings.mMode = isFrequencyMode ?
        Jolt.ESpringMode_FrequencyAndDamping : Jolt.ESpringMode_StiffnessAndDamping;
    if (isFrequencyMode) {
        if (cb.flag) springSettings.mFrequency = cb.read(BUFFER_READ_FLOAT32);
    } else {
        if (cb.flag) springSettings.mStiffness = cb.read(BUFFER_READ_FLOAT32);
    }
    if (cb.flag) springSettings.mDamping = cb.read(BUFFER_READ_FLOAT32);
    return springSettings;
}

function createMotorSettings(cb, Jolt) {
    const motorSettings = new Jolt.MotorSettings();
    if (cb.read(BUFFER_READ_BOOL)) {
        const springsSettings = createSpringSettings(cb, Jolt);
        motorSettings.mSpringSettings = springsSettings;
        Jolt.destroy(springsSettings);
    }
    if (cb.flag) motorSettings.mMinForceLimit = cb.read(BUFFER_READ_FLOAT32);
    if (cb.flag) motorSettings.mMaxForceLimit = cb.read(BUFFER_READ_FLOAT32);
    if (cb.flag) motorSettings.mMinTorqueLimit = cb.read(BUFFER_READ_FLOAT32);
    if (cb.flag) motorSettings.mMaxTorqueLimit = cb.read(BUFFER_READ_FLOAT32);

    return motorSettings;
}

function setSixDOFAxes(cb, settings, type, Jolt, isLimited) {
    const count = cb.read(BUFFER_READ_UINT8);
    for (let i = 0; i < count; i++) {
        const axis = cb.read(BUFFER_READ_UINT8);
        const min = isLimited ? cb.read(BUFFER_READ_FLOAT32) : null;
        const max = isLimited ? cb.read(BUFFER_READ_FLOAT32) : null;

        switch (axis) {
            case CONSTRAINT_SIX_DOF_TRANSLATION_X:
                settings[type](Jolt.SixDOFConstraintSettings_EAxis_TranslationX, min, max);
                break;

            case CONSTRAINT_SIX_DOF_TRANSLATION_Y:
                settings[type](Jolt.SixDOFConstraintSettings_EAxis_TranslationY, min, max);
                break;
            
            case CONSTRAINT_SIX_DOF_TRANSLATION_Z:
                settings[type](Jolt.SixDOFConstraintSettings_EAxis_TranslationZ, min, max);
                break;

            case CONSTRAINT_SIX_DOF_ROTATION_X:
                settings[type](Jolt.SixDOFConstraintSettings_EAxis_RotationX, min, max);
                break;
            
            case CONSTRAINT_SIX_DOF_ROTATION_Y:
                settings[type](Jolt.SixDOFConstraintSettings_EAxis_RotationY, min, max);
                break;

            case CONSTRAINT_SIX_DOF_ROTATION_Z:
                settings[type](Jolt.SixDOFConstraintSettings_EAxis_RotationZ, min, max);
                break;
            
            default:
                DEBUG && Debug$1.error(`Unrecognized six dof constraint axis setting: ${ axis }`);
                return false;
        }
    }
}

class Creator {
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
                DEBUG && Debug$1.error(`Invalid command: ${ command }`);
                return false;
        }

        return ok;
    }

    createPhysicsSystem() {
        const backend = this._backend;
        const config = backend.config;
        // const layerPairs = config.layerPairs;
        // const layers = config.layers;
        // const layers = config.objectLayers;
        // const layersCount = layers.length;
        const Jolt = backend.Jolt;

        this._joltVec3 = new Jolt.Vec3();
        this._joltVec3_2 = new Jolt.Vec3();
        this._joltQuat = new Jolt.Quat();

        const bpMap = new Map();

        const pairs = config.objectLayerPairs;
        const pairsCount = pairs.length * 0.5;
        const objectFilter = new Jolt.ObjectLayerPairFilterTable(pairsCount);
        for (let i = 0; i < pairsCount * 2; i += 2) {
            // const pair = pairs[i];
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
        // for (const [objLayer, bpLayers] of Object.entries(config.mapObjectToBroadPhaseLayer)) {
        const objLayers = config.mapObjectToBroadPhaseLayer;
        for (let i = 0; i < objLayers.length; i += 2) {
            objLayerCount++;
            // for (let i = 0; i < bpLayers.length; i += 2) {
            bpInterface.MapObjectToBroadPhaseLayer(objLayers[i], bpMap.get(objLayers[i + 1]));
            // }
        }
        // Broadphase layers have been copied to the bpInterface, so we can destroy those
        bpMap.forEach(bpLayer => {
            Jolt.destroy(bpLayer);
        });
        bpMap.clear();

        const settings = new Jolt.JoltSettings();
        settings.mObjectLayerPairFilter = objectFilter;
        settings.mBroadPhaseLayerInterface = bpInterface;
        settings.mObjectVsBroadPhaseLayerFilter = new Jolt.ObjectVsBroadPhaseLayerFilterTable(settings.mBroadPhaseLayerInterface, bpLayerCount, settings.mObjectLayerPairFilter, objLayerCount);
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
        const Jolt = this._backend.Jolt;

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
                DEBUG && Debug$1.warnOnce(`Unrecognized shape: ${ shape }`);
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
        const num = cb.read(BUFFER_READ_UINT32);

        const shapeSettings = this._createShapeSettings(cb, meshBuffers);
        if (!shapeSettings)
            return false;

        const shapeResult = shapeSettings.Create();
        if (DEBUG && shapeResult.HasError()) {
            Debug$1.error(`Failed to create shape: ${ shapeResult.GetError().c_str() }`);
            return false;
        }
        const shape = shapeResult.Get();

        this._backend.tracker.shapeMap.set(num, shape);

        return true;
    }

    _createBody(cb, meshBuffers) {
        const backend = this._backend;
        const jv = this._joltVec3;
        const jq = this._joltQuat;
        const Jolt = backend.Jolt;

        // ------------ SHAPE PROPS ----------------

        const shapeSettings = this._createShapeSettings(cb, meshBuffers);
        if (!shapeSettings) {
            return false;
        }
        
        const shapeResult = shapeSettings.Create();
        if (DEBUG && shapeResult.HasError()) {
            Debug$1.error(`Failed to create shape: ${ shapeResult.GetError().c_str() }`);
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

        // use motion state
        const useMotionState = cb.read(BUFFER_READ_BOOL);

        // object layer
        // const layer = cb.read(BUFFER_READ_UINT16);
        // const objectLayer = backend.getBitValue(layer);
        const objectLayer = cb.read(BUFFER_READ_UINT32);
        const bodyCreationSettings = new Jolt.BodyCreationSettings(shape, jv, jq, motionType, objectLayer);

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
        bodyCreationSettings.mMotionQuality = cb.read(BUFFER_READ_UINT8);
        bodyCreationSettings.mAllowSleeping = cb.read(BUFFER_READ_BOOL);
        
        // collision group
        const group = cb.flag ? cb.read(BUFFER_READ_UINT32) : null;

        // collision sub group
        const subGroup = cb.flag ? cb.read(BUFFER_READ_UINT32) : null;

        if (group !== null && subGroup !== null) {
            const table = backend.groupFilterTables[group];

            if (DEBUG) {
                let ok = Debug$1.assert(!!table, `Trying to set a filter group that does not exist: ${ group }`);
                ok = ok && Debug$1.assert((subGroup <= table?.maxIndex), `Trying to set sub group that is over the filter group table size: ${ subGroup }`);
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
        if (selectedMethod !== Jolt.EOverrideMassProperties_CalculateMassAndInertia) {
            bodyCreationSettings.mOverrideMassProperties = selectedMethod;

            const mass = cb.read(BUFFER_READ_FLOAT32);
            if (DEBUG) {
                const ok = Debug$1.checkFloatPositive(mass, `invalid mass: ${ mass }`);
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

        if (DEBUG) {
            this._addDebugDraw(cb.read(BUFFER_READ_BOOL), body);
        }

        // Destroy shape settings after body is created:
        Jolt.destroy(shapeSettings);
        Jolt.destroy(bodyCreationSettings);

        if (backend.config.useMotionStates) {
            if (useMotionState && (motionType === Jolt.EMotionType_Dynamic || motionType === Jolt.EMotionType_Kinematic)) {
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
        if (DEBUG) {
            let ok = Debug$1.checkUint(index, `invalid body index: ${ index }`);
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

            if (DEBUG) {
                let ok = Debug$1.checkUint(group, `Invalid filter group: ${ group }`);
                ok = ok && Debug$1.checkUint(subGroup, `Invalid filter group: ${ subGroup }`);
                ok = ok && Debug$1.assert(!!table, `Trying to set a filter group that does not exist: ${ group }`);
                ok = ok && Debug$1.assert((subGroup <= table?.maxIndex), `Trying to set sub group that is over the filter group table size: ${ subGroup }`);
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

        if (DEBUG) {
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

                    // curve.AddPoint(
                    //     cb.read(BUFFER_READ_FLOAT32),
                    //     cb.read(BUFFER_READ_FLOAT32)
                    // );
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
            const constraintSettings = new Jolt.VehicleConstraintSettings();
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
            transmission.mMode = cb.read(BUFFER_READ_UINT8);
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
                    DEBUG && Debug$1.error(`Unrecognized cast type: ${ castType }`);
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
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }

    _createGroups(cb) {
        const backend = this._backend;
        const Jolt = backend.Jolt;
        const groupsCount = cb.read(BUFFER_READ_UINT32);
        if (DEBUG) {
            let ok = Debug$1.checkUint(groupsCount, `Invalid filter groups count: ${ groupsCount }`);
            ok = ok && Debug$1.assert(groupsCount > 0, `Invalid filter groups count: ${ groupsCount }`);
            if (!ok) {
                return false
            }
        }
        
        for (let i = 0; i < groupsCount; i++) {
            const subGroupsCount = cb.read(BUFFER_READ_UINT32);
            const table = new Jolt.GroupFilterTable(subGroupsCount);
            backend.groupFilterTables.push(table);

            if (DEBUG) {
                const ok = Debug$1.checkUint(subGroupsCount, `Invalid sub group count: ${ subGroupsCount }`);
                if (!ok) {
                    return false;
                }
                // for verification check (only in debug build) when creating a body
                table.maxIndex = subGroupsCount - 1;
            }
        }

        return true;
    }

    _createShapeSettings(cb, meshBuffers) {
        const Jolt = this._backend.Jolt;
        const jv = this._joltVec3;
        const jq = this._joltQuat;
        const shapeType = cb.read(BUFFER_READ_UINT8);

        // scale
        const useScale = cb.read(BUFFER_READ_BOOL);
        let sx, sy, sz;
        if (useScale) {
            sx = cb.read(BUFFER_READ_FLOAT32);
            sy = cb.read(BUFFER_READ_FLOAT32);
            sz = cb.read(BUFFER_READ_FLOAT32);
            
            if (DEBUG) {
                let ok = Debug$1.checkFloat(sx, `Invalid scale X: ${ sx }`);
                ok = ok && Debug$1.checkFloat(sy, `Invalid scale Y: ${ sy }`);
                ok = ok && Debug$1.checkFloat(sz, `Invalid scale Z: ${ sz }`);
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
                if (DEBUG) {
                    const ok = Debug$1.checkFloatPositive(cr, `invalid convex radius: ${ cr }`);
                    if (!ok) {
                        return null;
                    }
                }
                settings = this.createShapeSettings(shapeType, jv, cr);
                break;
            
            case SHAPE_CAPSULE:
                hh = cb.read(BUFFER_READ_FLOAT32);
                r = cb.read(BUFFER_READ_FLOAT32);
                if (DEBUG) {
                    let ok = Debug$1.checkFloatPositive(hh, `invalid half height: ${ hh }`);
                    ok = ok && Debug$1.checkFloatPositive(r, `invalid radius: ${ r }`);
                    if (useScale) {
                        ok = ok && Debug$1.assert((sx === sy) && (sy === sz), `Capsule shape scale must be uniform: ${ sx }, ${ sy }, ${ sz }`);
                    }
                    if (!ok) {
                        return null;
                    }
                }
                settings = this.createShapeSettings(shapeType, hh, r);
                break;

            case SHAPE_CYLINDER:
                hh = cb.read(BUFFER_READ_FLOAT32);
                r = cb.read(BUFFER_READ_FLOAT32);
                cr = cb.read(BUFFER_READ_FLOAT32);
                if (DEBUG) {
                    let ok = Debug$1.checkFloatPositive(hh, `invalid half height: ${ hh }`);
                    ok = ok && Debug$1.checkFloatPositive(r, `invalid radius: ${ r }`);
                    ok = ok && Debug$1.checkFloatPositive(cr, `invalid convex radius: ${ cr }`);
                    if (useScale) {
                        ok = ok && Debug$1.assert(sx === sz, `Cylinder shape scale must be uniform in XZ plane: ${ sx }, ${ sz }`);
                    }
                    if (!ok) {
                        return null;
                    }
                }
                settings = this.createShapeSettings(shapeType, hh, r, cr);
                break;

            case SHAPE_SPHERE:
                r = cb.read(BUFFER_READ_FLOAT32);
                if (DEBUG) {
                    let ok = Debug$1.checkFloatPositive(r, `invalid radius: ${ r }`);
                    if (useScale) {
                        ok = ok && Debug$1.assert((sx === sy) && (sy === sz), `Sphere shape scale must be uniform: ${ sx }, ${ sy }, ${ sz }`);
                    }
                    if (!ok) {
                        return null;
                    }
                }
                settings = this.createShapeSettings(shapeType, r);
                break;

            // intentional fall-through
            case SHAPE_MESH:
            case SHAPE_CONVEX_HULL:
                settings = this._createMeshShapeSettings(cb, meshBuffers, shapeType);
                break;

            case SHAPE_STATIC_COMPOUND:
                settings = this._createStaticCompoundShapeSettings(cb, meshBuffers);
                break;

            case SHAPE_HEIGHTFIELD:
                settings = this._createHeightFieldSettings(cb, meshBuffers);
                break;

            default:
                DEBUG && Debug$1.warn('Invalid shape type', shapeType);
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
            if (DEBUG) {
                const ok = Debug$1.checkFloatPositive(density, `Invalid density value: ${ density }`);
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

    _createStaticCompoundShapeSettings(cb, meshBuffers) {
        const childrenCount = cb.read(BUFFER_READ_UINT32);
        const children = [];

        for (let i = 0; i < childrenCount; i++) {
            const settings = this._createShapeSettings(cb, meshBuffers);
            if (!settings) return null;

            const pos = {};
            const rot = {};
            
            cb.readVec(pos);
            cb.readQuat(rot);

            if (DEBUG) {
                let ok = true;
                ok = ok && Debug$1.checkVec(pos, `Invalid static compound child position vector`);
                ok = ok && Debug$1.checkQuat(rot, `Invalid static compound child quaternion`);
                if (!ok) {
                    return null;
                }
            }

            children.push(settings, pos, rot);
        }

        return children;
    }

    _createHeightFieldSettings(cb, meshBuffers) {
        if (DEBUG) {
            let ok = Debug$1.assert(!!meshBuffers, `Missing buffers to generate a HeightField shape: ${ meshBuffers }`);
            ok = ok && Debug$1.assert(meshBuffers.length > 0, `Invalid buffers to generate HeightField shape: ${ meshBuffers }`);
            if (!ok) {
                return null;
            }
        }

        const Jolt = this._backend.Jolt;
        const jv = this._joltVec3;
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
            heightSamples[i] = height >=0 ? height : Jolt.HeightFieldShapeConstantValues.prototype.cNoCollisionValue;
        }

        return settings;
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

        if (DEBUG) {
            let ok = true;
            ok = ok && Debug$1.assert(!!body1, `Unable to locate body to add constraint to: ${ idx1 }`);
            ok = ok && Debug$1.assert(!!body2, `Unable to locate body to add constraint to: ${ idx2 }`);
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
                DEBUG && Debug$1.error(`Unrecognized constraint type: ${ type }`);
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

    // _createSpringSettings(cb, Jolt) {
    //     const springSettings = new Jolt.SpringSettings();
    //     const mode = cb.flag ? cb.read(BUFFER_READ_UINT8) : SPRING_MODE_FREQUENCY;
    //     const isFrequencyMode = mode === SPRING_MODE_FREQUENCY;
    //     springSettings.mMode = isFrequencyMode ?
    //         Jolt.ESpringMode_FrequencyAndDamping : Jolt.ESpringMode_StiffnessAndDamping;
    //     if (isFrequencyMode) {
    //         if (cb.flag) springSettings.mFrequency = cb.read(BUFFER_READ_FLOAT32);
    //     } else {
    //         if (cb.flag) springSettings.mStiffness = cb.read(BUFFER_READ_FLOAT32);
    //     }
    //     if (cb.flag) springSettings.mDamping = cb.read(BUFFER_READ_FLOAT32);
    //     return springSettings;
    // }

    // _createMotorSettings(cb, Jolt) {
    //     const motorSettings = new Jolt.MotorSettings();
    //     if (cb.read(BUFFER_READ_BOOL)) {
    //         const springsSettings = createSpringSettings(cb, Jolt);
    //         motorSettings.mSpringSettings = springsSettings;
    //         Jolt.destroy(springsSettings);
    //     }
    //     if (cb.flag) motorSettings.mMinForceLimit = cb.read(BUFFER_READ_FLOAT32);
    //     if (cb.flag) motorSettings.mMaxForceLimit = cb.read(BUFFER_READ_FLOAT32);
    //     if (cb.flag) motorSettings.mMinTorqueLimit = cb.read(BUFFER_READ_FLOAT32);
    //     if (cb.flag) motorSettings.mMaxTorqueLimit = cb.read(BUFFER_READ_FLOAT32);

    //     return motorSettings;
    // }

    _createCharacter(cb) {
        const backend = this._backend;
        const Jolt = backend.Jolt;
        const listener = backend.listener;
        const config = backend.config;
        const charEvents = config.charContactEventsEnabled;
        const jv = this._joltVec3;
        const jq = this._joltQuat;
        const settings = new Jolt.CharacterVirtualSettings();

        const shapeSettings = this._createShapeSettings(cb, null);
        if (!shapeSettings) {
            return false;
        }

        const shapeResult = shapeSettings.Create();
        if (DEBUG && shapeResult.HasError()) {
            Debug$1.error(`Failed to create shape: ${ shapeResult.GetError().c_str() }`);
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
        settings.mBackFaceMode = cb.read(BUFFER_READ_UINT8);
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

        if (DEBUG) {
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

    _createMeshShapeSettings(cb, meshBuffers, shapeType) {
        const {
            base, stride, numIndices, triCount, positions, indices
        } = Creator.readMeshBuffers(cb, meshBuffers);

        const Jolt = this._backend.Jolt;
        const jv = this._joltVec3;

        // TODO:
        // add support for duplicate vertices test

        const p = positions;
        let i1, i2, i3;
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

    _addDebugDraw(requested, body) {
        const isWorker = this._backend.config.useWebWorker;
        if (requested && isWorker) {
            Debug$1.warn('Debug draw was requested, but it is not supported, when running in WebWorker. Disable WebWorker (useWebWorker option) when you need to debug draw.');
            body.debugDraw = false;
        } else {
            body.debugDraw = requested;
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
            
            if (DEBUG) {
                let ok = Debug$1.checkFloat(sx, `Invalid scale X: ${ sx }`);
                ok = ok && Debug$1.checkFloat(sy, `Invalid scale Y: ${ sy }`);
                ok = ok && Debug$1.checkFloat(sz, `Invalid scale Z: ${ sz }`);
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

        if (DEBUG) {
            let ok = Debug$1.checkUint(base, `Invalid buffer base to generate mesh/hull: ${ base }`);
            ok = ok && Debug$1.checkUint(offset, `Invalid positions buffer offset to generate mesh/hull: ${ offset }`);
            ok = ok && Debug$1.checkUint(stride, `Invalid positions buffer stride to generate mesh/hull: ${ stride }`);
            ok = ok && Debug$1.checkUint(numIndices, `Invalid indices count to generate mesh/hull: ${ numIndices }`);
            ok = ok && Debug$1.assert(!!meshBuffers, `No mesh buffers to generate a mesh/hull: ${ meshBuffers }`);
            ok = ok && Debug$1.assert(meshBuffers.length > 1, `Invalid buffers to generate mesh/hull: ${ meshBuffers }`);
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

class Drawer {
    constructor(Jolt) {
        this._Jolt = Jolt;
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
        const Jolt = this._Jolt;

        this.reset();

        Jolt.destroy(this._joltAabb);
        this._joltAabb = null;

        Jolt.destroy(this._joltQuat);
        this._joltQuat = null;

        Jolt.destroy(this._scale);
        this._scale = null;

        this._Jolt = null;
    }

    _writeShape(body, tracker) {
        const Jolt = this._Jolt;
        
        try {
            const motionType = body.isCharacter ? Jolt.EMotionType_Kinematic : body.GetMotionType();
            const isRigidBody = body.isCharacter ? true : (body.GetBodyType() === Jolt.EBodyType_RigidBody);
            const pos = body.GetPosition();
            const rot = body.GetRotation();

            const data = body.debugDrawData;
            if (data) {
                if (isRigidBody) {
                    const buffer = Jolt.HEAPF32.buffer;

                    this._data.push(
                        ...data, motionType, buffer,
                        pos.GetX(), pos.GetY(), pos.GetZ(),
                        rot.GetX(), rot.GetY(), rot.GetZ(), rot.GetW()
                    );
                    this._buffers.push(buffer);

                    return true;
                } else {
                    // Soft body will have new vertex positions, so we need to create a new triContext
                    Jolt.destroy(body.triContext);
                    body.triContext = null;
                    body.debugDrawData = null;
                }
            }
            
            const index = tracker.getPCID(Jolt.getPointer(body));
            const shape = body.GetShape();            
            const triContext = new Jolt.ShapeGetTriangles(shape, Jolt.AABox.prototype.sBiggest(), shape.GetCenterOfMass(), Jolt.Quat.prototype.sIdentity(), this._scale);
            const byteOffset = triContext.GetVerticesData();
            const length = triContext.GetVerticesSize() / FLOAT32_SIZE;
            const buffer = Jolt.HEAPF32.buffer;

            body.debugDrawData = [index, length, byteOffset];
            body.triContext = triContext;

            this._data.push(
                index, length, byteOffset, motionType, buffer,
                pos.GetX(), pos.GetY(), pos.GetZ(),
                rot.GetX(), rot.GetY(), rot.GetZ(), rot.GetW()
            );
            this._buffers.push(buffer);

        } catch (e) {
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }
}

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
        return this._backend.Jolt.ValidateResult_AcceptAllContactsForThisBodyPair;
    }

    initEvents(config) {
        const Jolt = this._backend.Jolt;

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
            listener[method] = eval('(' + funcStr + ')').bind(this);
        }
    }

    onContactPersisted(b1Pointer, b2Pointer, manifoldPointer, settingsPointer) {
        this._wrapAndWrite(b1Pointer, b2Pointer, CONTACT_TYPE_PERSISTED, false);
    }

    onContactRemoved(subShapePairPointer) {
        const backend = this._backend;
        const Jolt = backend.Jolt;

        const subShapePair = Jolt.wrapPointer(subShapePairPointer, Jolt.SubShapeIDPair);
        const bodyLockInterface = backend.physicsSystem.GetBodyLockInterface();

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

        this._writeContactPair(body1, body2, CONTACT_TYPE_REMOVED, true);
    }

    onContactAdded(b1Pointer, b2Pointer, manifoldPointer, settingsPointer) {
        const Jolt = this._backend.Jolt;
        const data = this._contactsData;
        const { contactPoints, contactPointsAveraged } = this._backend.config;
        const manifold = Jolt.wrapPointer(manifoldPointer, Jolt.ContactManifold);

        const ok = this._wrapAndWrite(b1Pointer, b2Pointer, CONTACT_TYPE_ADDED, true);

        if (!ok) {
            return;
        }

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
        const Jolt = this._backend.Jolt;
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
        const backend = this._backend;
        const Jolt = backend.Jolt;
        const tracker = backend.tracker;

        character = Jolt.wrapPointer(character, Jolt.CharacterVirtual);

        const index = tracker.getPCID(Jolt.getPointer(character));

        // Ignore contact, if the character was created by user via Jolt API directly.
        if (index == null) {
            return;
        }

        const data = this._charContactsData;
        cp = Jolt.wrapPointer(cp, Jolt.Vec3);
        cn = Jolt.wrapPointer(cn, Jolt.Vec3);
        cv = Jolt.wrapPointer(cv, Jolt.Vec3);
        nv = Jolt.wrapPointer(nv, Jolt.Vec3);        
        
        const bodyLockInterface = backend.physicsSystem.GetBodyLockInterface();

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
        const Jolt = this._backend.Jolt;
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
        const Jolt = this._backend.Jolt;

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

        cb.writeOperator(COMPONENT_SYSTEM_BODY);
        cb.writeCommand(CMD_REPORT_CONTACTS);
        
        cb.write(contactsCount, BUFFER_WRITE_UINT32, false);

        // TODO
        // average points per contact pair, instead of all contacts

        for (let i = 0, k = 1; i < contactsCount; i++) {
            // type
            const type = data[k++];
            cb.write(type, BUFFER_WRITE_UINT8, false);

            // idx1, idx2, can be -1
            const isValidBody1 = data[k++];
            const isValidBody2 = data[k++];
            cb.write(isValidBody1, BUFFER_WRITE_BOOL, false);
            cb.write(isValidBody2, BUFFER_WRITE_BOOL, false);
            if (isValidBody1) {
                cb.write(data[k++], BUFFER_WRITE_UINT32, false);
            }
            if (isValidBody2) {
                cb.write(data[k++], BUFFER_WRITE_UINT32, false);
            }

            if (type === CONTACT_TYPE_ADDED) {
                // normal xyz
                cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                
                // depth
                cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
    
                cb.write(contactPoints, BUFFER_WRITE_BOOL, false);
                if (contactPoints) {
    
                    cb.write(contactPointsAveraged, BUFFER_WRITE_BOOL, false);
                    if (contactPointsAveraged) {
                        // world point
                        cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                        cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                        cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                    } else {
                        // offset
                        cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                        cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                        cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                        
                        // count1, count2
                        const count1 = data[k++];
                        const count2 = data[k++];
                        cb.write(count1, BUFFER_WRITE_UINT32, false);
                        cb.write(count2, BUFFER_WRITE_UINT32, false);
    
                        // local points
                        for (let i = 0; i < count1; i++) {
                            cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                            cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                            cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                        }
                        for (let i = 0; i < count2; i++) {
                            cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                            cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                            cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
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
            if (contacts[0] > 0) {
                skip = false;
            }
        });
        if (skip) {
            return;
        }

        cb.writeOperator(COMPONENT_SYSTEM_CHAR);
        cb.writeCommand(CMD_REPORT_CONTACTS);
        cb.write(charsCount, BUFFER_WRITE_UINT32, false);

        data.forEach((contacts, index) => {
            const contactsCount = contacts[0];

            cb.write(index, BUFFER_WRITE_UINT32, false);
            cb.write(contactsCount, BUFFER_WRITE_UINT32, false);

            for (let i = 0, k = 1; i < contactsCount; i++) {
                // is body 2 valid
                cb.write(contacts[k++], BUFFER_WRITE_BOOL, false);
                cb.write(contacts[k++] || 0, BUFFER_WRITE_UINT32, false);
                
                // contact position
                // contact normal
                // contact velocity
                // new char velocity
                for (let n = 0; n < 12; n++) {
                    cb.write(contacts[k++], BUFFER_WRITE_FLOAT32, false);
                }
            }
        });
    }

    _wrapAndWrite(b1Pointer, b2Pointer, type, ignoreCache) {
        const Jolt = this._backend.Jolt;
        const Body = Jolt.Body;

        const body1 = Jolt.wrapPointer(b1Pointer, Body);
		const body2 = Jolt.wrapPointer(b2Pointer, Body);

        return this._writeContactPair(body1, body2, type, ignoreCache);
    }

    _writeContactPair(body1, body2, type, ignoreCache) {
        const backend = this._backend;
        const data = this._contactsData;
        const Jolt = backend.Jolt;
        const tracker = backend.tracker;

        let idx1 = null;
        if (body1 !== null) {
            idx1 = tracker.getPCID(Jolt.getPointer(body1)) ?? null;
        }

        let idx2 = null;
        if (body2 !== null) {
            idx2 = tracker.getPCID(Jolt.getPointer(body2)) ?? null;
        }

        // Ignore user-created bodies using Jolt API directly.
        if (idx1 == null || idx2 === null) {
            return false;
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

        if (body1) {
            data.push(idx1);
        }
        
        if (body2) {
            data.push(idx2);
        }

        return true;
    }
}

class ConstraintModifier {
    _modifier = null;

    constructor(modifier) {
        this._modifier = modifier;
    }

    modify(command, cb) {
        if (command === CMD_JNT_SET_ENABLED) {
            return this._setConstraintEnabled(cb);
        } else if (command >= 510 && command < 520) {
            return this._updateSwingTwistConstraint(command, cb);
        } else if (command >= 520 && command < 530) {
            return this._updateDistanceConstraint(command, cb);
        } else if (command >= 530 && command < 540) {
            return this._updateHingeConstraint(command, cb);
        } else if (command >= 550 && command < 560) {
            return this._updateSliderConstraint(command, cb);
        } else if (command >= 560 && command < 570) {
            return this._updateConeConstraint(command, cb);
        } else if (command >= 570 && command < 580) {
            return this._updateSixDOFConstraint(command, cb);
        }

        DEBUG && Debug$1.warn(`Unrecognized command for constraint modifier: ${ command }`);
        return false;
    }

    _setConstraintEnabled(cb) {
        const { tracker, Jolt, bodyInterface } = this._modifier.backend;

        const index = cb.read(BUFFER_READ_UINT32);
        const enabled = cb.read(BUFFER_READ_BOOL);
        const activate = cb.read(BUFFER_READ_BOOL);

        const data = tracker.constraintMap.get(index);
        
        // An index could be old and constraint might have been already destroyed.
        if (!data) {
            DEBUG && Debug$1.warn(`Trying to enable/disable a constraint that has already been destroyed: ${ index }`);
            return true;
        }

        try {
            data.constraint.SetEnabled(enabled);
    
            if (activate) {
                const { body1, body2 } = data;
    
                if (Jolt.getPointer(data.body1) !== 0) {
                    bodyInterface.ActivateBody(body1.GetID());
                }
                if (Jolt.getPointer(data.body2) !== 0) {
                    bodyInterface.ActivateBody(body2.GetID());
                }
            }
        } catch (e) {
            DEBUG && Debug$1.error(e);
            return false;
        }
        
        return true;
    }    

    _updateHingeConstraint(command, cb) {
        try {
            const constraint = this._getConstraint(cb, 'HingeConstraint');

            if (constraint) {
                switch (command) {
                    case CMD_JNT_H_SET_M_F_TORQUE:
                        constraint.SetMaxFrictionTorque(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_H_SET_M_S:
                        constraint.SetMotorState(cb.read(BUFFER_READ_UINT8));
                        break;
                    case CMD_JNT_H_SET_T_ANG_VEL:
                        constraint.SetTargetAngularVelocity(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_H_SET_T_ANGLE:
                        constraint.SetTargetAngle(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_H_SET_LIMITS:
                        constraint.SetLimits(cb.read(BUFFER_READ_FLOAT32), cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_H_SET_SPRING_S: {
                        const settings = createSpringSettings(cb, this._modifier.backend.Jolt);
                        constraint.SetLimitsSpringSettings(settings);
                        break;
                    }
                    default:
                        DEBUG && Debug$1.warn(`Unrecognized command for constraint modifier: ${ command }`);
                        return false;
                }
            }
        } catch (e) {
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }

    _updateSliderConstraint(command, cb) {
        try {
            const constraint = this._getConstraint(cb, 'SliderConstraint');

            if (constraint) {
                switch (command) {
                    case CMD_JNT_S_SET_M_F_FORCE:
                        constraint.SetMaxFrictionForce(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_S_SET_M_STATE:
                        constraint.SetMotorState(cb.read(BUFFER_READ_UINT8));
                        break;
                    case CMD_JNT_S_SET_T_VEL:
                        constraint.SetTargetVelocity(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_S_SET_T_POS:
                        constraint.SetTargetPosition(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_S_SET_LIMITS:
                        constraint.SetLimits(cb.read(BUFFER_READ_FLOAT32), cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_S_SET_SPRING_S: {
                        const settings = createSpringSettings(cb, this._modifier.backend.Jolt);
                        constraint.SetLimitsSpringSettings(settings);
                        break;
                    }
                    default:
                        DEBUG && Debug$1.warn(`Unrecognized command for constraint modifier: ${ command }`);
                        return false;
                }
            }
        } catch (e) {
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true; 
    }

    _updateSwingTwistConstraint(command, cb) {
        const modifier = this._modifier;

        const jv = modifier.joltVec3_1;
        const jq = modifier.joltQuat;

        try {
            const constraint = this._getConstraint(cb, 'SwingTwistConstraint');

            if (constraint) {
                switch (command) {
                    case CMD_JNT_ST_SET_N_H_C_ANGLE:
                        constraint.SetNormalHalfConeAngle(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_ST_SET_P_H_C_ANGLE:
                        constraint.SetPlaneHalfConeAngle(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_ST_SET_T_MIN_ANGLE:
                        constraint.SetTwistMinAngle(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_ST_SET_T_MAX_ANGLE:
                        constraint.SetTwistMaxAngle(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_ST_SET_M_F_TORQUE:
                        constraint.SetMaxFrictionTorque(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_ST_SET_SWING_M_S:
                        constraint.SetSwingMotorState(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_ST_SET_TWIST_M_S:
                        constraint.SetTwistMotorState(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_ST_SET_T_O_CS:
                        jq.FromBuffer(cb);
                        constraint.SetTargetOrientationCS(jq);
                        break;
                    case CMD_JNT_ST_SET_T_O_BS:
                        jq.FromBuffer(cb);
                        constraint.SetTargetOrientationBS(jq);
                        break;
                    case CMD_JNT_ST_SET_T_ANG_VEL_CS:
                        jv.FromBuffer(cb);
                        constraint.SetTargetAngularVelocityCS(jv);
                        break;
                    default:
                        DEBUG && Debug$1.warn(`Unrecognized command for constraint modifier: ${ command }`);
                        return false;
                }
            }
        } catch (e) {
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }

    _updateDistanceConstraint(command, cb) {
        try {
            const constraint = this._getConstraint(cb, 'DistanceConstraint');

            if (constraint) {
                switch (command) {
                    case CMD_JNT_D_SET_DISTANCE:
                        constraint.SetDistance(cb.read(BUFFER_READ_FLOAT32), cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_D_SET_SPRING_S: {
                        const settings = createSpringSettings(cb, this._modifier.backend.Jolt);
                        constraint.SetLimitsSpringSettings(settings);
                        break;
                    }
                    default:
                        DEBUG && Debug$1.warn(`Unrecognized command for constraint modifier: ${ command }`);
                        return false;
                }
            }
        } catch (e) {
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }

    _updateConeConstraint(command, cb) {
        try {
            const constraint = this._getConstraint(cb, 'ConeConstraint');

            if (constraint) {
                switch (command) {
                    case CMD_JNT_C_SET_H_C_ANGLE:
                        constraint.SetHalfConeAngle(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    default:
                        DEBUG && Debug$1.warn(`Unrecognized command for constraint modifier: ${ command }`);
                        return false;
                }
            }
        } catch (e) {
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }

    _updateSixDOFConstraint(command, cb) {
        const modifier = this._modifier;

        const jv1 = modifier.joltVec3_1;
        const jv2 = modifier.joltVec3_2;
        const jq = modifier.joltQuat;

        try {
            const constraint = this._getConstraint(cb, 'SixDOFConstraint');

            if (constraint) {
                switch (command) {
                    case CMD_JNT_SDF_SET_T_LIMITS:
                        constraint.SetTranslationLimits(jv1.FromBuffer(cb), jv2.FromBuffer(cb));
                        break;
                    case CMD_JNT_SDF_SET_R_LIMITS:
                        constraint.SetRotationLimits(jv1.FromBuffer(cb), jv2.FromBuffer(cb));
                        break;
                    case CMD_JNT_SDF_SET_SPRING_S:
                        const settings = createSpringSettings(cb, modifier.backend.Jolt);
                        constraint.SetLimitsSpringSettings(cb.read(BUFFER_READ_UINT8), settings);
                        break;
                    case CMD_JNT_SDF_SET_M_F:
                        constraint.SetMaxFriction(cb.read(BUFFER_READ_UINT8), cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_SDF_SET_M_STATE:
                        constraint.SetMotorState(cb.read(BUFFER_READ_UINT8), cb.read(BUFFER_READ_UINT8));
                        break;
                    case CMD_JNT_SDF_SET_T_VEL_CS:
                        constraint.SetTargetVelocityCS(jv1.FromBuffer(cb));
                        break;
                    case CMD_JNT_SDF_SET_T_ANG_VEL_CS:
                        constraint.SetTargetAngularVelocityCS(jv1.FromBuffer(cb));
                        break;
                    case CMD_JNT_SDF_SET_T_POS_CS:
                        constraint.SetTargetPositionCS(jv1.FromBuffer(cb));
                        break;
                    case CMD_JNT_SDF_SET_T_ROT_CS:
                        constraint.SetTargetOrientationCS(jq.FromBuffer(cb));
                        break;
                    case CMD_JNT_SDF_SET_T_ROT_BS:
                        constraint.SetTargetOrientationBS(jq.FromBuffer(cb));
                        break;
                    default:
                        DEBUG && Debug$1.warn(`Unrecognized command for constraint modifier: ${ command }`);
                        return false;
                }
            }
        } catch (e) {
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }
    
    _getConstraint(cb, type) {
        const index = cb.read(BUFFER_READ_UINT32);
        const { tracker, Jolt } = this._modifier.backend;
        const data = tracker.constraintMap.get(index);
        return data && Jolt.castObject(data.constraint, Jolt[type]);
    }
}

class Modifier {
    constructor(backend) {
        this._backend = backend;

        const Jolt = backend.Jolt;
        
        this._joltVec3_1 = new Jolt.Vec3();
        this._joltVec3_2 = new Jolt.Vec3();
        this._joltVec3_3 = new Jolt.Vec3();
        this._joltQuat_1 = new Jolt.Quat();

        this._constraintModifier = new ConstraintModifier(this);
        // TODO
        // add modifier helpers for other components as well
    }

    get joltVec3_1() {
        return this._joltVec3_1;
    }

    get joltVec3_2() {
        return this._joltVec3_2;
    }

    get joltQuat() {
        return this._joltQuat_1;
    }

    get backend() {
        return this._backend;
    }

    modify() {
        const cb = this._backend.inBuffer;
        const command = cb.readCommand();
        let ok = true;

        if (command >= 500 && command < 600) {
            return this._constraintModifier.modify(command, cb);
        }

        switch (command) {
            case CMD_CHANGE_GRAVITY:
                ok = this._changeGravity(cb);
                break;

            case CMD_ADD_FORCE:
                ok = this._applyForces(cb, 'AddForce');
                break;

            case CMD_ADD_IMPULSE:
                ok = this._applyForces(cb, 'AddImpulse');
                break;

            case CMD_ADD_ANGULAR_IMPULSE:
                ok = this._applyForces(cb, 'AddAngularImpulse', true);
                break;

            case CMD_APPLY_BUOYANCY_IMPULSE:
                ok = this._applyBuoyancyImpulse(cb);
                break;

            case CMD_ADD_TORQUE:
                ok = this._applyForces(cb, 'AddTorque', true);
                break;

            case CMD_MOVE_BODY:
                ok = this._moveBody(cb);
                break;
            
            case CMD_MOVE_KINEMATIC:
                ok = this._moveKinematic(cb);
                break;

            case CMD_PAIR_BODY:
                ok  = this._pairBody(cb);
                break;

            case CMD_SET_LIN_VEL:
                ok = this._applyForces(cb, 'SetLinearVelocity', true);
                break;

            case CMD_CHAR_SET_LIN_VEL:
                this._setCharacterLinVel(cb);
                break;

            case CMD_SET_ANG_VEL:
                ok = this._applyForces(cb, 'SetAngularVelocity', true);
                break;

            case CMD_RESET_VELOCITIES:
                ok = this._resetVelocities(cb);
                break;

            case CMD_SET_MOTION_TYPE:
                ok = this._setMotionType(cb);
                break;

            case CMD_TOGGLE_GROUP_PAIR:
                ok = this._toggleGroupPair(cb);
                break;

            case CMD_SET_USER_DATA:
                ok = this._setUserData(cb);
                break;

            case CMD_CHAR_SET_SHAPE:
                ok = this._setCharShape(cb);
                break;

            case CMD_USE_MOTION_STATE:
                ok = this._useMotionState(cb);
                break;

            // case CMD_SET_CONSTRAINT_ENABLED:
            //     ok = this._setConstraintEnabled(cb);
            //     break;

            case CMD_SET_DRIVER_INPUT:
                ok = this._setDriverInput(cb);
                break;
        }

        return ok;
    }

    destroy() {
        const Jolt = this._backend.Jolt;

        Jolt.destroy(this._joltVec3_1);
        Jolt.destroy(this._joltVec3_2);
        Jolt.destroy(this._joltVec3_3);
        Jolt.destroy(this._joltQuat_1);

        this._joltVec3_1 = null;
        this._joltVec3_2 = null;
        this._joltVec3_3 = null;
        this._joltQuat_1 = null;        
    }

    _changeGravity(cb) {
        const jv = this._joltVec3;

        jv.FromBuffer(cb);

        try {
            this._backend.system.SetGravity(jv);
        } catch (e) {
            DEBUG && Debug$1.error(e);
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
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }

    _setCharShape(cb) {
        const backend = this._backend;
        const tracker = backend.tracker;
        const pcid = cb.read(BUFFER_READ_UINT32);
        const useCallback = cb.read(BUFFER_READ_BOOL);
        const shapeIndex = cb.flag ? cb.read(BUFFER_READ_UINT32) : null;

        const char = tracker.getBodyByPCID(pcid);
        if (DEBUG && !char) {
            Debug$1.warn(`Unable to locate character under id: ${ pcid }`);
            return false;
        }

        let shape;
        if (shapeIndex != null) {
            shape = tracker.shapeMap.get(shapeIndex);
            if (DEBUG && !shape) {
                Debug$1.warn(`Unable to locate shape: ${ shapeIndex }`);
                return false;
            }
        } else {
            shape = char.originalShape;
        }

        let cbIndex;
        if (useCallback) {
            cbIndex = cb.read(BUFFER_READ_UINT32);
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

            cb.writeOperator(COMPONENT_SYSTEM_CHAR);
            cb.writeCommand(CMD_REPORT_SET_SHAPE);
            cb.write(cbIndex, BUFFER_WRITE_UINT32, false);
        }
        
        return true;
    }

    _resetCharShape(cb) {
        const backend = this._backend;
        const tracker = backend.tracker;
        const pcid = cb.read(BUFFER_READ_UINT32);
        const useCallback = cb.read(BUFFER_READ_BOOL);

        let cbIndex;
        if (useCallback) {
            cbIndex = cb.read(BUFFER_READ_UINT32);
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

            cb.writeOperator(COMPONENT_SYSTEM_CHAR);
            cb.writeCommand(CMD_REPORT_SET_SHAPE);
            cb.write(cbIndex, BUFFER_WRITE_UINT32, false);
        }
        
        return true;
    }

    _setUserData(cb) {
        const obj = this._getBody(cb);

        try {
            const shape = obj.GetShape();
            const value = cb.read(BUFFER_READ_FLOAT32);
            shape.SetUserData(value);
        } catch (e) {
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }

    _useMotionState(cb) {
        const body = this._getBody(cb);
        const useMotionState = cb.read(BUFFER_READ_BOOL);

        if (!body.motionState && useMotionState) {
            body.motionState = new MotionState(body);
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
            DEBUG && Debug$1.error(e);
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
            const buoyancy = cb.read(BUFFER_READ_FLOAT32);
            const linearDrag = cb.read(BUFFER_READ_FLOAT32);
            const angularDrag = cb.read(BUFFER_READ_FLOAT32);
            const fluidVelocity = jv3.FromBuffer(cb);
            const deltaTime = backend.config.fixedStep;
            const gravity = backend.physicsSystem.GetGravity();

            body.ApplyBuoyancyImpulse(waterSurfacePosition, surfaceNormal, buoyancy, linearDrag, angularDrag, fluidVelocity, gravity, deltaTime);
        } catch (e) {
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }

    // _setConstraintEnabled(cb) {
    //     const backend = this._backend;
    //     const Jolt = backend.Jolt;

    //     const index = cb.read(BUFFER_READ_UINT32);
    //     const enabled = cb.read(BUFFER_READ_BOOL);
    //     const activate = cb.read(BUFFER_READ_BOOL);

    //     const data = backend.tracker.constraintMap.get(index);
        
    //     // An index could be old and constraint might have been already destroyed.
    //     if (!data) {
    //         DEBUG && Debug.warn(`Trying to enable/disable a constraint that has already been destroyed: ${ index }`);
    //         return true;
    //     }

    //     try {
    //         data.constraint.SetEnabled(enabled);
    
    //         if (activate) {
    //             const bodyInterface = backend.bodyInterface;
    //             const { body1, body2 } = data;
    
    //             if (Jolt.getPointer(data.body1) !== 0) {
    //                 bodyInterface.ActivateBody(body1.GetID());
    //             }
    //             if (Jolt.getPointer(data.body2) !== 0) {
    //                 bodyInterface.ActivateBody(body2.GetID());
    //             }
    //         }
    //     } catch (e) {
    //         DEBUG && Debug.error(e);
    //         return false;
    //     }
        
    //     return true;
    // }

    _resetVelocities(cb) {
        const jv1 = this._joltVec3_1;
        const body = this._getBody(cb);

        try {
            jv1.Set(0, 0, 0);

            body.SetLinearVelocity(jv1);
            body.SetAngularVelocity(jv1);
        } catch (e) {
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }

    _moveBody(cb) {
        const backend = this._backend;
        const Jolt = backend.Jolt;
        const jv = this._joltVec3_1;
        const jq = this._joltQuat_1;
        const body = this._getBody(cb);

        try {
            jv.FromBuffer(cb);
            jq.FromBuffer(cb);

            if (DEBUG) {
                const type = body.GetMotionType();
                if (type === Jolt.EMotionType_Dynamic || type === Jolt.EMotionType_Kinematic) {
                    backend.bodyInterface.SetPositionAndRotation(body.GetID(), jv, jq, Jolt.Activate);
                } else {
                    Debug$1.warnOnce('Trying to move a static body.');
                }
            } else {
                backend.bodyInterface.SetPositionAndRotation(body.GetID(), jv, jq, Jolt.Activate);
            }
        } catch (e) {
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }

    _pairBody(cb) {
        const Jolt = this._backend.Jolt;
        const char = this._getBody(cb);
        const body = this._getBody(cb);

        char.pairedBody = body;
        body.isCharPaired = true;

        const bodyFilter = new Jolt.BodyFilterJS();

        bodyFilter.ShouldCollide = (inBodyID) => {
            if (body.GetID() === Jolt.wrapPointer(inBodyID, Jolt.BodyID)) {
                return false;
            }
            return true;
        };

        bodyFilter.ShouldCollideLocked = () => {
            return true;
        };

        char.bodyFilter = bodyFilter;

        return true;
    }

    _moveKinematic(cb) {
        const backend = this._backend;
        const Jolt = backend.Jolt;
        const jv = this._joltVec3_1;
        const jq = this._joltQuat_1;
        const body = this._getBody(cb);

        try {
            jv.FromBuffer(cb);
            jq.FromBuffer(cb);

            const dt = cb.read(BUFFER_READ_FLOAT32) || backend.config.fixedStep;

            if (DEBUG) {
                const type = body.GetMotionType();
                if (type === Jolt.EMotionType_Dynamic || type === Jolt.EMotionType_Kinematic) {
                    backend.bodyInterface.MoveKinematic(body.GetID(), jv, jq, dt);
                } else {
                    Debug$1.warnOnce('Trying to move a static body.');
                }
            } else {
                backend.bodyInterface.SetPositionAndRotation(body.GetID(), jv, jq, dt);
            }
        } catch (e) {
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }    

    _setDriverInput(cb) {
        const backend = this._backend;
        const tracker = backend.tracker;
        const index = cb.read(BUFFER_READ_UINT32);

        const body = tracker.getBodyByPCID(index);
        const data = tracker.constraintMap.get(index);
        if (!data || !body) {
            return true;
        }

        data.constraint.controller.SetDriverInput(
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32)
        );

        backend.bodyInterface.ActivateBody(body.GetID());

        return true;
    }

    _toggleGroupPair(cb) {
        const backend = this._backend;
        const enable = cb.read(BUFFER_READ_BOOL);
        const group = cb.read(BUFFER_READ_UINT16);
        const subGroup1 = cb.read(BUFFER_READ_UINT16);
        const subGroup2 = cb.read(BUFFER_READ_UINT16);

        try {
            const filter = backend.groupFilterTables[group];

            if (DEBUG) {
                let ok = true;
                ok = ok && Debug$1.assert(!!filter, `Unable to locate filter group: ${ group }`);
                ok = ok && Debug$1.assert(subGroup1 <= filter.maxIndex, `Sub group number is over the filter table size: ${ subGroup1 }`);
                ok = ok && Debug$1.assert(subGroup2 <= filter.maxIndex, `Sub group number is over the filter table size: ${ subGroup2 }`);
                if (!ok) return false;
            }

            if (enable) {
                filter.EnableCollision(subGroup1, subGroup2);
            } else {
                filter.DisableCollision(subGroup1, subGroup2);
            }
        } catch (e) {
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }

    _setMotionType(cb) {
        const backend = this._backend;
        const Jolt = backend.Jolt;
        const tracker = backend.tracker;
        const bodyInterface = backend.bodyInterface;
        const index = cb.read(BUFFER_READ_UINT16);
        const body = tracker.getBodyByPCID(index);
        const type = cb.read(BUFFER_READ_UINT8);

        DEBUG && Debug$1.checkUint(type);

        try {
            bodyInterface.SetMotionType(body.GetID(), type, Jolt.Activate);
            tracker.update(body, index);
        } catch (e) {
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }

    _getBody(cb) {
        const index = cb.read(BUFFER_READ_UINT32);
        return this._backend.tracker.getBodyByPCID(index);
    }
}

const params = [];

class Querier {
    constructor(backend) {
        this._backend = backend;
        
        const Jolt = backend.Jolt;

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

        this._bodies = [];
    }

    query() {
        const cb = this._backend.inBuffer;
        const command = cb.readCommand();
        let ok = true;

        switch (command) {
            case CMD_CAST_RAY:
                ok = this._castRay(cb);
                break;

            case CMD_CAST_SHAPE:
                ok = this._castShape(cb);
                break;

            default:
                DEBUG && Debug$1.error(`Invalid querier command: ${ command }`);
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

        Jolt.destroy(this._collectorRayFirst);
        this._collectorRayFirst = null;

        Jolt.destroy(this._collectorRayAll);
        this._collectorRayAll = null;

        this._commandsBuffer.destroy();
        this._commandsBuffer = null;

        params.length = 0;
        params = undefined;
    }

    _castRay(cb) {
        const backend = this._backend;
        const castSettings = this._rayCastSettings;
        const jv = this._tempVectors[1];
        const cast = this._rayCast;
        const buffer = backend.outBuffer;
        const tracker = backend.tracker;
        const system = backend.physicsSystem;
        const Jolt = backend.Jolt;
        const joltInterface = backend.joltInterface;

        buffer.writeOperator(COMPONENT_SYSTEM_MANAGER);
        buffer.writeCommand(CMD_CAST_RAY);
        
        const queryIndex = cb.read(BUFFER_READ_UINT32);
        buffer.write(queryIndex, BUFFER_WRITE_UINT16, false);

        try {
            jv.FromBuffer(cb);
            cast.mOrigin = jv;
    
            jv.FromBuffer(cb);
            cast.mDirection = jv;
    
            const firstOnly = cb.flag ? cb.read(BUFFER_READ_BOOL) : true;
            const calculateNormal = cb.flag ? cb.read(BUFFER_READ_BOOL) : false;
            const ignoreBackFaces = cb.flag ? cb.read(BUFFER_READ_BOOL) : true;
            const solidConvex = cb.flag ? cb.read(BUFFER_READ_BOOL) : true;
            const collector = firstOnly ? this._collectorRayFirst : this._collectorRayAll;
            const { bodyFilter, shapeFilter } = this._backend;

            buffer.write(firstOnly, BUFFER_WRITE_BOOL, false);
    
            castSettings.mBackFaceMode = ignoreBackFaces ? Jolt.EBackFaceMode_IgnoreBackFaces : Jolt.EBackFaceMode_CollideWithBackFaces;
            castSettings.mTreatConvexAsSolid = solidConvex;
            
            const customBPFilter = cb.flag;
            const bpFilter = customBPFilter ? new Jolt.DefaultBroadPhaseLayerFilter(joltInterface.GetObjectVsBroadPhaseLayerFilter(), cb.read(BUFFER_READ_UINT32)) : backend.bpFilter;

            const customObjFilter = cb.flag;
            const objFilter = customObjFilter ? new Jolt.DefaultObjectLayerFilter(joltInterface.GetObjectLayerPairFilter(), cb.read(BUFFER_READ_UINT32)) : backend.objFilter;

            system.GetNarrowPhaseQuery().CastRay(cast, castSettings, collector, bpFilter, objFilter, bodyFilter, shapeFilter);

            if (firstOnly) {
                if (collector.HadHit()) {
                    buffer.write(1, BUFFER_WRITE_UINT16, false); // hits count
                    Querier.writeRayHit(buffer, system, tracker, cast, calculateNormal, collector.mHit, Jolt);
                } else {
                    buffer.write(0, BUFFER_WRITE_UINT16, false); // hits count
                }
            } else {
                const hits = collector.mHits;
                const count = hits.size();
                buffer.write(count, BUFFER_WRITE_UINT16, false); // hits count
                for (let i = 0; i < count; i++) {
                    Querier.writeRayHit(buffer, system, tracker, cast, calculateNormal, hits.at(i), Jolt);
                }
            }
    
            collector.Reset();

            if (customBPFilter) {
                Jolt.destroy(bpFilter);
            }

            if (customObjFilter) {
                Jolt.destroy(objFilter);
            }
            
        } catch (e) {
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }

    _castShape(cb) {
        const buffer = this._backend.outBuffer;
        const tempVectors = this._tempVectors;
        const scale = tempVectors[1];
        const direction = tempVectors[2];
        const position = tempVectors[3];
        const offset = tempVectors[4];
        const rotation = tempVectors[0];
        const backend = this._backend;
        const castSettings = this._shapeCastSettings;
        const tracker = backend.tracker;
        const system = backend.physicsSystem;
        const Jolt = backend.Jolt;
        const joltInterface = backend.joltInterface;

        const queryIndex = cb.read(BUFFER_READ_UINT32);

        buffer.writeOperator(COMPONENT_SYSTEM_MANAGER);
        buffer.writeCommand(CMD_CAST_SHAPE);
        buffer.write(queryIndex, BUFFER_WRITE_UINT16, false);
        
        try {
            position.FromBuffer(cb);
            rotation.FromBuffer(cb);
            direction.FromBuffer(cb);
            cb.flag ? scale.FromBuffer(cb) : scale.Set(1, 1, 1);
            cb.flag ? offset.FromBuffer(cb) : offset.Set(0, 0, 0);
            if (cb.flag) castSettings.mBackFaceModeTriangles = cb.read(BUFFER_READ_UINT8);
            if (cb.flag) castSettings.mBackFaceModeConvex = cb.read(BUFFER_READ_UINT8);
            if (cb.flag) castSettings.mUseShrunkenShapeAndConvexRadius = cb.read(BUFFER_READ_BOOL);
            if (cb.flag) castSettings.mReturnDeepestPoint = cb.read(BUFFER_READ_BOOL);
            
            const firstOnly = cb.flag ? cb.read(BUFFER_READ_BOOL) : true;
            const calculateNormal = cb.flag ? cb.read(BUFFER_READ_BOOL) : false;
            const collector = firstOnly ? this._collectorShapeFirst : this._collectorShapeAll;
            const shapeIndex = cb.read(BUFFER_READ_UINT32);

            buffer.write(firstOnly, BUFFER_WRITE_BOOL, false);
            
            params.length = 0;

            const shape = tracker.shapeMap.get(shapeIndex);
            if (DEBUG && !shape) {
                Debug$1.warn(`Unable to locate shape for shape cast: ${ shapeIndex }`);
                return false;
            }

            const transform = Jolt.Mat44.prototype.sRotationTranslation(rotation, position);
            const shapeCast = new Jolt.RShapeCast(shape, scale, transform, direction);
            const { bodyFilter, shapeFilter } = backend;

            const customBPFilter = cb.flag;
            const bpFilter = customBPFilter ? new Jolt.DefaultBroadPhaseLayerFilter(joltInterface.GetObjectVsBroadPhaseLayerFilter(), cb.read(BUFFER_READ_UINT32)) : backend.bpFilter;

            const customObjFilter = cb.flag;
            const objFilter = customObjFilter ? new Jolt.DefaultObjectLayerFilter(joltInterface.GetObjectLayerPairFilter(), cb.read(BUFFER_READ_UINT32)) : backend.objFilter;

            system.GetNarrowPhaseQuery().CastShape(shapeCast, castSettings, offset, collector, bpFilter, objFilter, bodyFilter, shapeFilter);
            
            if (firstOnly) {
                if (collector.HadHit()) {
                    buffer.write(1, BUFFER_WRITE_UINT16, false); // hits count
                    Querier.writeShapeHit(buffer, system, tracker, shapeCast, calculateNormal, collector.mHit, Jolt);
                } else {
                    buffer.write(0, BUFFER_WRITE_UINT16, false); // hits count
                }
            } else {
                const hits = collector.mHits;
                const count = hits.size();
                buffer.write(count, BUFFER_WRITE_UINT16, false); // hits count
                for (let i = 0; i < count; i++) {
                    Querier.writeShapeHit(buffer, system, tracker, shapeCast, calculateNormal, hits.at(i), Jolt);
                }
            }

            collector.Reset();

            Jolt.destroy(shapeCast);
            
            if (customBPFilter) {
                Jolt.destroy(bpFilter);
            }

            if (customObjFilter) {
                Jolt.destroy(objFilter);
            }

        } catch (e) {
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }

    static writeRayHit(buffer, system, tracker, cast, calculateNormal, hit, Jolt) {
        const body = system.GetBodyLockInterfaceNoLock().TryGetBody(hit.mBodyID);
        const point = cast.GetPointOnRay(hit.mFraction);
        const normal = calculateNormal ? body.GetWorldSpaceSurfaceNormal(hit.mSubShapeID2, point) : null;

        const index = tracker.getPCID(Jolt.getPointer(body));
        buffer.write(index, BUFFER_WRITE_UINT32, false);
        buffer.write(point, BUFFER_WRITE_JOLTVEC32, false);
        buffer.write(normal, BUFFER_WRITE_JOLTVEC32);
    }

    static writeShapeHit(buffer, system, tracker, cast, calculateNormal, hit, Jolt) {
        const body = system.GetBodyLockInterfaceNoLock().TryGetBody(hit.mBodyID2);
        const transform = cast.mCenterOfMassStart;
        const point = transform.GetTranslation();
        const dir = cast.mDirection;

        dir.Mul(hit.mFraction);
        point.Add(dir);

        const normal = calculateNormal ? body.GetWorldSpaceSurfaceNormal(hit.mSubShapeID2, point) : null;

        const index = tracker.getPCID(Jolt.getPointer(body));
        buffer.write(index, BUFFER_WRITE_UINT32, false);
        buffer.write(point, BUFFER_WRITE_JOLTVEC32, false);
        buffer.write(normal, BUFFER_WRITE_JOLTVEC32);
    }
}

class Tracker {
    constructor(Jolt) {
        this._Jolt = Jolt;

        // TODO
        // eval: get rid of _dynamic and _kinematic
        this._dynamic = new Set();
        this._kinematic = new Set();

        this._character = new Set();
        this._bodyMap = new Map();
        this._idxMap = new Map();
        this._shapeMap = new Map();
        this._constraintMap = new Map();

        if (DEBUG) {
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
        const Jolt = this._Jolt;

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
                }
            }
        }

        if (DEBUG && body.debugDraw) {
            this._debug.add(body);
        }

        this._idxMap.set(Jolt.getPointer(body), index);
        this._bodyMap.set(index, body);
    }

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
        
        if (DEBUG) {
            this._debug.delete(body);
        }
        
        const jid = this._Jolt.getPointer(body);
        const idx = this._idxMap.get(jid);

        this._bodyMap.delete(idx);
        this._idxMap.delete(jid);
    }

    destroy() {
        const Jolt = this._Jolt;

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

        if (DEBUG) {
            this._debug.clear();
        }

        this._Jolt = null;
    }
}

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
            broadPhaseLayers: [ BP_LAYER_NON_MOVING, BP_LAYER_MOVING ],
            // object layer vs object layer
            objectLayerPairs: [
                OBJ_LAYER_NON_MOVING, OBJ_LAYER_MOVING,
                OBJ_LAYER_MOVING, OBJ_LAYER_MOVING
            ],
            // object layer to broadphase layer map
            mapObjectToBroadPhaseLayer: [
                0, BP_LAYER_NON_MOVING,
                1, BP_LAYER_MOVING,
                2, BP_LAYER_NON_MOVING
            ],
            ...data.config
        };
        this._config = config;
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

        const loadJolt = async () => {
            const module = await import(/* webpackIgnore: true */ data.glueUrl);
            module.default({
                locateFile: () => {
                    return data.wasmUrl;
                }
            }).then(Jolt => {
                this.Jolt = Jolt;

                // Util
                extendJoltMath(Jolt);

                // Physics operators
                this._creator = new Creator(this);
                this._modifier = new Modifier(this);
                this._cleaner = new Cleaner(this);
                this._querier = new Querier(this);
                this._tracker = new Tracker(Jolt);

                if (DEBUG) {
                    this._drawer = new Drawer(Jolt);
                }
                
                const listener = new Listener(this);

                if (config.contactEventsEnabled) {
                    listener.initEvents(config);
                }

                this._listener = listener;

                this._outBuffer = new CommandsBuffer({ ...this._config, commandsBufferSize: 2000 });

                this._stepTime = 0;
                this._steps = 0;

                // TODO
                // remove softBodies default array
                this._responseMessage = {
                    buffer: null,
                    inBuffer: null,
                    softBodies: [],
                    origin: 'physics-worker'
                };

                this._dispatcher = messenger;
                this._inBuffer = null;
                this._fatalError = false;

                if (DEBUG) {
                    this._perfIndex = null;
                }

                this._exposeConstants();

                if (DEBUG) {
                    console.log('Jolt Physics:', joltInfo.version);
                }
            });
        };
        loadJolt();
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

    get updateCallback() {
        return this._updateCallback;
    }

    set updateCallback(func) {
        this._updateCallback = func;
    }

    step(data) {
        if (this._fatalError) return;
        
        if (DEBUG) {
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
                DEBUG && Debug$1.error(e);
                ok = false;
            }
        }

        if (!inBuffer) {
            // The physics world is empty, as no commands were ever received yet,
            // so nothing to report and no reason to step the physics.
            const msg = this._responseMessage;
            if (DEBUG) {
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
        if (DEBUG && !this._config.useWebWorker) {
            // Write debug draw data
            ok = ok && this._drawer.write(this._tracker);
        }     

        // report sim results to frontend
        ok = ok && this._send();

        if (!ok) {
            DEBUG && Debug$1.error('Backend fatal error :(');
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
        fixedStep * config.maxSkippedSteps;

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
                
                ok && jolt.Step(fixedStep, subSteps);
                this._steps++;
                stepped = true;
            } catch (e) {
                DEBUG && Debug$1.error(e);
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
                if (DEBUG && !ok) {
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
    
            characters.forEach(char => {
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
            DEBUG && Debug$1.error(e);
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
                    DEBUG && Debug$1.error(`Invalid operator: ${ operator }`);
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
            characters.forEach(char => {
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
            DEBUG && Debug$1.error(e);
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

        if (DEBUG) {
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

    _exposeConstants() {
        const Jolt = this.Jolt;
        const dispatcher = this._dispatcher;
        const msg = this._responseMessage;

        msg.constants = [
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

        dispatcher.respond(msg, null);

        msg.constants = null;
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
            DEBUG && Debug$1.error(e);
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
            DEBUG && Debug$1.error(e);
            return false;
        }

        return true;
    }
}

function createBackend(dispatcher, data) {
    switch (data.backendName) {
        case 'jolt':
            Dispatcher.backend = new JoltBackend(dispatcher, data);
            break;

        default:
            Debug$1.warn(`Invalid backend selection: ${ data.backendName }`);
    }
}

class Dispatcher {
    static backend = null;

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
                Dispatcher.backend?.step(data);
                break;

            case 'create-backend':
                createBackend(this, data);
                // If we don't use a Web Worker, expose the backend instance to main thread for DX
                if (this._useMainThread) {
                    this._manager.backend = Dispatcher.backend;
                }
                break;

            case 'override-contacts':
                Dispatcher.backend?.overrideContacts(data.listener, data.overrides);
                break;

            case 'destroy':
                this.destroy();
                break;
        }
    }

    destroy() {
        this._destroying = true;

        Dispatcher.backend.destroy();
        Dispatcher.backend = null;
        self.onmessage = (e) => {};
        dispatcher = null;
    }

    respond(msg, buffers) {
        if (this._useMainThread) {
            this._manager.onMessage(msg);
        } else {
            if (buffers) {
                self.postMessage(msg, buffers);
            } else {
                self.postMessage(msg);
            }
        }
    }
}

let dispatcher = new Dispatcher();

self.onmessage = function(event) {
    const data = event.data;
    if (data?.origin !== 'physics-manager') return;
    dispatcher.handleMessage(data);
};

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
        this._backend = null;

        // TODO
        // this needs a change after we move to modules
        const wasmAsset = app.assets.find('jolt-physics.wasm.wasm');
        const glueAsset = app.assets.find('jolt-physics.wasm.js');

        const msg = Object.create(null);
        msg.type = 'create-backend';
        msg.glueUrl = glueAsset.getFileUrl();
        msg.wasmUrl = wasmAsset.getFileUrl();
        msg.backendName = backendName;
        msg.config = config;
        this.sendUncompressed(msg);

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

        if (DEBUG) {
            this._perfCache = new IndexedCache();
        }

        this._frame = app.stats.frame;

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
        if (DEBUG) {
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
                if (DEBUG) {
                    const ok = Debug$1.assert(!!systems.get(operator), `Invalid component system: ${ operator }`);
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

        if (DEBUG) {
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
        });
    }

    _dispatchCommands(dt, perfIndex) {
        const cb = this._outBuffer;
        const inBuffer = this._inBuffer;
        const msg = this._stepMessage;
        const useSAB = this._config.useSAB;

        msg.dt = dt;

        if (DEBUG) {
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
            this._dispatcher = new Worker(
                /* webpackChunkName: "worker" */ new URL('./dispatcher.mjs', import.meta.url
            ));
            this._dispatcher.onmessage = this.onMessage.bind(this);
        } else {
            this._dispatcher = new Dispatcher(this);
        }
    }
}

function buildAccessors(obj, schema) {
    // Create getter/setter pairs for each property defined in the schema
    for (let i = 0, end = schema.length; i < end; i++) {
        const property = schema[i];

        // Don't override existing getters/setters
        const etter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(obj), property);
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

    obj.accessorsBuilt = true;
}

class ComponentSystem extends pc.ComponentSystem {

    _store = {};

    _manager = null;

    _schema = [ 'enabled' ];

    constructor(app, manager) {
        super(app);

        this._manager = manager;
    }

    get schema() {
        return this._schema;
    }

    set schema(newSchema) {
        this._schema = newSchema;
    }

    get manager() {
        return this._manager;
    }

    get store() {
        return this._store;
    }

    // PlayCanvas compatibility
    set store(obj) {
        this._store = obj;
    }

    addCommand() {
        const cb = this._manager.commandsBuffer;
        
        cb.writeOperator(arguments[0]);
        cb.writeCommand(arguments[1]);

        // component/constraint index
        cb.write(arguments[2], BUFFER_WRITE_UINT32, false);

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
        if (DEBUG) {
            const ok = Debug$1.verifyProperties(data, this._schema);
            if (!ok) {
                return;
            }
        }

        const component = new this.ComponentType(this, entity);

        buildAccessors(component, this._schema);

        this.store[entity.getGuid()] = { entity };

        entity[this.id] = component;
        entity.c[this.id] = component;

        this.initializeComponentData(component, data);

        return component;
    }

    initializeComponentData(component, data) {
        component.enabled = true;

        for (const [key, value] of Object.entries(data)) {
            DEBUG && Debug$1.assert(value != null, 
                `Trying to initialize a component with invalid value for property "${ key }": ${ value }`, data);
            component[`_${ key }`] = value;
        }

        if (component.entity.enabled && !component.isCompoundChild) {
            component.onEnable();
        }
    }
}

class Component extends pc.EventHandler {

    // Flag, whether the accessors were set on this component.
    _accessorsBuilt = false;

    // Enable / disable component
    _enabled = true;

    // The ComponentSystem used to create this Component.
    _system = null;

    // The Entity that this Component is attached to.
    _entity = null;

    constructor(system, entity) {
        super();

        this._system = system;
        this._entity = entity;

        this.on('set', function (name, oldValue, newValue) {
            this.fire('set_' + name, name, oldValue, newValue);
        });

        this.on('set_enabled', this.onSetEnabled, this);
    }

    get entity() {
        return this._entity;
    }

    get system() {
        return this._system;
    }

    get accessorsBuilt() {
        return this._accessorsBuilt;
    }

    set accessorsBuilt(isSet) {
        this._accessorsBuilt = isSet;
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
        // TODO

        // const constraints = this._constraints;

        // constraints.forEach((entity2, index) => {
        //     entity2?.body?.constraints.delete(index);
        //     this.system.freeConstraintIndex(index);
        // });
        // constraints.clear();
    }

    // PlayCanvas compatibility
    onPostStateChange() {}
}

class ShapeComponent extends Component {

    // ---- COMPONENT PROPS ----

    // Shape type
    _shape = SHAPE_BOX;

    // TODO
    // get rid of trackDynamic, it doesn't work well with workers and in some parent/child edge cases

    // Automatically moves dynamic bodies, when the position is set on entity.
    // TODO
    // Make it work with web workers
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
    // TODO
    // remove default Map
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
    _shapeRotation = pc.Quat.IDENTITY;

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

    constructor(system, entity) {
        super(system, entity);
    }

    get constraints() {
        return this._constraints;
    }

    get index() {
        return this._index;
    }

    static quat = new pc.Quat();

    static writeShapeData(cb, props, forceWriteRotation = false) {
        const shape = props.shape;
        cb.write(shape, BUFFER_WRITE_UINT8, false);

        const scale = props.scale || props.entity.getLocalScale();
        let useEntityScale = props.useEntityScale;
        
        if (useEntityScale && scale.x === 1 && scale.y === 1 && scale.z === 1 && 
            shape !== SHAPE_MESH && shape !== SHAPE_CONVEX_HULL) {
            useEntityScale = false;
        }
        
        useEntityScale = useEntityScale || (shape === SHAPE_MESH || shape === SHAPE_CONVEX_HULL);
        cb.write(useEntityScale, BUFFER_WRITE_BOOL, false);
        if (useEntityScale) {
            // Potential precision loss 64 -> 32
            cb.write(scale, BUFFER_WRITE_VEC32, false);
        }
    
        let ok = true;
        switch (shape) {
            case SHAPE_BOX:
                cb.write(props.halfExtent, BUFFER_WRITE_VEC32, false);
                cb.write(props.convexRadius, BUFFER_WRITE_FLOAT32, false);
                break;
    
            case SHAPE_CAPSULE:
                cb.write(props.halfHeight, BUFFER_WRITE_FLOAT32, false);
                cb.write(props.radius, BUFFER_WRITE_FLOAT32, false);
                break;
    
            case SHAPE_CYLINDER:
                cb.write(props.halfHeight, BUFFER_WRITE_FLOAT32, false);
                cb.write(props.radius, BUFFER_WRITE_FLOAT32, false);
                cb.write(props.convexRadius, BUFFER_WRITE_FLOAT32, false);
                break;
    
            case SHAPE_SPHERE:
                cb.write(props.radius, BUFFER_WRITE_FLOAT32, false);
                break;
    
            case SHAPE_STATIC_COMPOUND:
                ok = ShapeComponent.addCompoundChildren(cb, props.entity);
                break;
    
            // intentional fall-through
            case SHAPE_CONVEX_HULL:
            case SHAPE_MESH:
                ShapeComponent.addMeshes(props.meshes, cb);
                break;
            
            case SHAPE_HEIGHTFIELD:
                cb.write(props.hfOffset, BUFFER_WRITE_VEC32, false);
                cb.write(props.hfScale, BUFFER_WRITE_VEC32, false);
                cb.write(props.hfSampleCount, BUFFER_WRITE_UINT32, false);
                cb.write(props.hfBlockSize, BUFFER_WRITE_UINT8, false);
                cb.write(props.hfBitsPerSample, BUFFER_WRITE_UINT8, false);
                cb.write(props.hfActiveEdgeCosThresholdAngle, BUFFER_WRITE_FLOAT32, false);
                cb.addBuffer(props.hfSamples.buffer);
                break;
    
            default:
                DEBUG && Debug$1.warn('Unsupperted shape type', shape);
                return false;
        }
    
        const isCompoundChild = props.isCompoundChild;
        cb.write(isCompoundChild, BUFFER_WRITE_BOOL, false);
        if (!isCompoundChild) {
            cb.write(props.density, BUFFER_WRITE_FLOAT32, false);

            const position = props.shapePosition;
            const rotation = props.shapeRotation;
            const massOffset = props.massOffset;
            const hasPositionOffset = !position.equals(pc.Vec3.ZERO);
            const hasRotationOffset = forceWriteRotation || !rotation.equals(pc.Quat.IDENTITY);
            const hasShapeOffset = hasPositionOffset || hasRotationOffset;
            const hasMassOffset = !massOffset.equals(pc.Vec3.ZERO);
    
            cb.write(hasShapeOffset, BUFFER_WRITE_BOOL, false);
            if (hasShapeOffset) {
                cb.write(position, BUFFER_WRITE_VEC32, false);
                cb.write(rotation, BUFFER_WRITE_VEC32, false);
            }
    
            cb.write(hasMassOffset, BUFFER_WRITE_BOOL, false);
            if (hasMassOffset) {
                cb.write(massOffset, BUFFER_WRITE_VEC32, false);
            }
        }

        return ok;
    }

    static addCompoundChildren(cb, parent) {
        const components = parent.findComponents('body');
        const count = components.length;
        const childrenCount = count - 1; // -1 to exclude the parent

        if (DEBUG && childrenCount === 0) {
            Debug$1.warn('Trying to create a static (immutable) compound body without children shapes. Aborting.');
            return false;
        }

        cb.write(childrenCount, BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < count; i++) {
            const component = components[i];
            if (component.entity === parent) {
                continue;
            }

            const ok = ShapeComponent.writeShapeData(cb, component);
            if (!ok) {
                return false;
            }

            // Loss of precision for pos/rot (64 -> 32)
            cb.write(component.shapePosition, BUFFER_WRITE_VEC32, false);
            cb.write(component.shapeRotation, BUFFER_WRITE_VEC32, false);
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
                    cb.write(mesh.primitive[0].base, BUFFER_WRITE_UINT8, false);
                    cb.write(element.offset, BUFFER_WRITE_UINT32, false);
                    cb.write(element.stride / FLOAT32_SIZE, BUFFER_WRITE_UINT8, false);
                    cb.addBuffer(vb.storage);
                    break;
                }
            }

            cb.write(vb.numVertices, BUFFER_WRITE_UINT32, false);
            cb.write(ib.numIndices, BUFFER_WRITE_UINT32, false);

            // TODO
            // workaround until this is fixed:
            // https://github.com/playcanvas/engine/issues/5869
            // buffer.addBuffer(ib.storage);

            const storage = ib.storage;
            const isView = ArrayBuffer.isView(storage);

            let byteOffset;
            if (isView) {
                // byteLength = storage.byteLength;
                byteOffset = storage.byteOffset;
            } else {
                // byteLength = storage.byteLength / ib.bytesPerIndex;
                byteOffset = storage.buffer.byteOffset;
            }

            // cb.write(byteLength, BUFFER_WRITE_UINT32, false);
            cb.write(byteOffset, BUFFER_WRITE_UINT32, false);
            cb.addBuffer(isView ? storage.buffer : storage);
        }
    }
}

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

const schema$5 = [
    // component
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

class ShapeComponentSystem extends ComponentSystem {
    static entityMap = new IndexedCache();

    static tempVectors = [];

    constructor(app, manager) {
        super(app, manager);

        this._schema = [...this.schema, ...schema$5];

        // TODO
        // can we use static method directly?
        this.entityMap = ShapeComponentSystem.entityMap;

        // TODO remove this
        this._exposeConstants();
    }

    get id() {
        return 'shape';
    }

    get ComponentType() {
        return ShapeComponent;
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
            pc.JOLT_SHAPE_BOX = SHAPE_BOX;
            pc.JOLT_SHAPE_CAPSULE = SHAPE_CAPSULE;
            pc.JOLT_SHAPE_CYLINDER = SHAPE_CYLINDER;
            pc.JOLT_SHAPE_SPHERE = SHAPE_SPHERE;
            pc.JOLT_SHAPE_MESH = SHAPE_MESH;
            pc.JOLT_SHAPE_CONVEX_HULL = SHAPE_CONVEX_HULL;
            pc.JOLT_SHAPE_STATIC_COMPOUND = SHAPE_STATIC_COMPOUND;
            pc.JOLT_SHAPE_HEIGHTFIELD = SHAPE_HEIGHTFIELD;
            pc.JOLT_OBJ_LAYER_NON_MOVING = OBJ_LAYER_NON_MOVING;
            pc.JOLT_OBJ_LAYER_MOVING = OBJ_LAYER_MOVING;
            pc.JOLT_BP_LAYER_NON_MOVING = BP_LAYER_NON_MOVING;
            pc.JOLT_BP_LAYER_MOVING = BP_LAYER_MOVING;
            pc.JOLT_VEHICLE_TYPE_WHEEL = VEHICLE_TYPE_WHEEL;
            pc.JOLT_VEHICLE_TYPE_TRACK = VEHICLE_TYPE_TRACK;
            pc.JOLT_VEHICLE_TYPE_MOTORCYCLE = VEHICLE_TYPE_MOTORCYCLE;
            pc.JOLT_VEHICLE_CAST_TYPE_RAY = VEHICLE_CAST_TYPE_RAY;
            pc.JOLT_VEHICLE_CAST_TYPE_CYLINDER = VEHICLE_CAST_TYPE_CYLINDER;
            pc.JOLT_VEHICLE_CAST_TYPE_SPHERE = VEHICLE_CAST_TYPE_SPHERE;
            pc.JOLT_CONSTRAINT_TYPE_FIXED = CONSTRAINT_TYPE_FIXED;
            pc.JOLT_CONSTRAINT_TYPE_POINT = CONSTRAINT_TYPE_POINT;
            pc.JOLT_CONSTRAINT_TYPE_DISTANCE = CONSTRAINT_TYPE_DISTANCE;
            pc.JOLT_CONSTRAINT_TYPE_HINGE = CONSTRAINT_TYPE_HINGE;
            pc.JOLT_CONSTRAINT_TYPE_SLIDER = CONSTRAINT_TYPE_SLIDER;
            pc.JOLT_CONSTRAINT_TYPE_CONE = CONSTRAINT_TYPE_CONE;
            pc.JOLT_CONSTRAINT_TYPE_SWING_TWIST = CONSTRAINT_TYPE_SWING_TWIST;
            pc.JOLT_CONSTRAINT_TYPE_SIX_DOF = CONSTRAINT_TYPE_SIX_DOF;
            pc.JOLT_CONSTRAINT_TYPE_PULLEY = CONSTRAINT_TYPE_PULLEY;
            pc.JOLT_CONSTRAINT_SIX_DOF_TRANSLATION_X = CONSTRAINT_SIX_DOF_TRANSLATION_X;
            pc.JOLT_CONSTRAINT_SIX_DOF_TRANSLATION_Y = CONSTRAINT_SIX_DOF_TRANSLATION_Y;
            pc.JOLT_CONSTRAINT_SIX_DOF_TRANSLATION_Z = CONSTRAINT_SIX_DOF_TRANSLATION_Z;
            pc.JOLT_CONSTRAINT_SIX_DOF_ROTATION_X = CONSTRAINT_SIX_DOF_ROTATION_X;
            pc.JOLT_CONSTRAINT_SIX_DOF_ROTATION_Y = CONSTRAINT_SIX_DOF_ROTATION_Y;
            pc.JOLT_CONSTRAINT_SIX_DOF_ROTATION_Z = CONSTRAINT_SIX_DOF_ROTATION_Z;
            pc.JOLT_CONSTRAINT_SPACE_LOCAL = CONSTRAINT_SPACE_LOCAL;
            pc.JOLT_CONSTRAINT_SPACE_WORLD = CONSTRAINT_SPACE_WORLD;
        }
    }

    static updateDynamic(cb) {
        const index = cb.read(BUFFER_READ_UINT32);
        const entity = ShapeComponentSystem.entityMap.get(index);
        const vehicleComponent = entity?.c.vehicle;

        if (!entity) {
            cb.skip(13 * FLOAT32_SIZE);
            if (vehicleComponent) {
                cb.skip(vehicleComponent.wheels.length * 7 * FLOAT32_SIZE);
            }
            return;
        }

        entity.setPosition(
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32)
        );

        entity.setRotation(
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32)
        );

        const component = entity.c.body || vehicleComponent;
        component._linearVelocity.set(
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32)
        );
        component._angularVelocity.set(
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32)
        );

        if (vehicleComponent) {
            const wheels = vehicleComponent.wheels;
            const wheelsCount = wheels.length;

            for (let i = 0; i < wheelsCount; i++) {
                const wheel = wheels[i];
                const entity = wheel.entity;

                if (!entity) {
                    cb.skip(7 * FLOAT32_SIZE);
                    continue;
                }

                wheel.longitudinalSlip = cb.read(BUFFER_READ_FLOAT32);
                wheel.lateralSlip = cb.read(BUFFER_READ_FLOAT32);
                wheel.combinedLongitudinalFriction = cb.read(BUFFER_READ_FLOAT32);
                wheel.combinedLateralFriction = cb.read(BUFFER_READ_FLOAT32);
                wheel.brakeImpulse = cb.read(BUFFER_READ_FLOAT32);

                entity.setLocalPosition(
                    cb.read(BUFFER_READ_FLOAT32),
                    cb.read(BUFFER_READ_FLOAT32),
                    cb.read(BUFFER_READ_FLOAT32)
                );

                entity.setLocalRotation(
                    cb.read(BUFFER_READ_FLOAT32),
                    cb.read(BUFFER_READ_FLOAT32),
                    cb.read(BUFFER_READ_FLOAT32),
                    cb.read(BUFFER_READ_FLOAT32)
                );
            }
        }
    }

    static debugDraw(app, data, config) {
        const useDepth = config.debugDrawDepth;
        const layer = app.scene.layers.getLayerById(config.debugDrawLayerId);
        const tempVectors = ShapeComponentSystem.tempVectors;

        if (tempVectors.length === 0) {
            tempVectors.push( new pc.Vec3(), new pc.Vec3(), new pc.Vec3(), new pc.Vec3(), new pc.Quat() );
        }

        const v1 = tempVectors[0];
        const v2 = tempVectors[1];
        const v3 = tempVectors[2];
        const v4 = tempVectors[3];
        const q1 = tempVectors[4];
    
        for (let d = 0, total = data.length; d < total; d += 12) {
            data[d];
            const length = data[d + 1];
            const byteOffset = data[d + 2];
            const motionType = data[d + 3];
            const buffer = data[d + 4];
    
            const view = new Float32Array(buffer, byteOffset, length);
            const color = getColor(motionType, config);

            const p = v4.set(data[d + 5], data[d + 6], data[d + 7]);
            const r = q1.set(data[d + 8], data[d + 9], data[d + 10], data[d + 11]);
    
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
        const count = cb.read(BUFFER_READ_UINT32);

        for (let i = 0; i < count; i++) {
            const type = cb.read(BUFFER_READ_UINT8);
            const isValidBody1 = cb.read(BUFFER_READ_BOOL);
            const isValidBody2 = cb.read(BUFFER_READ_BOOL);

            let idx1 = null;
            if (isValidBody1) {
                idx1 = cb.read(BUFFER_READ_UINT32);
            }

            let idx2 = null;
            if (isValidBody2) {
                idx2 = cb.read(BUFFER_READ_UINT32);
            }

            const entity1 = map.get(idx1);
            const entity2 = map.get(idx2);

            switch (type) {
                case CONTACT_TYPE_ADDED: {
                    const normal = pc.Vec3.fromBuffer(cb);
                    const depth = cb.read(BUFFER_READ_FLOAT32);
                    const contactPoints = cb.read(BUFFER_READ_BOOL);
                    let point, points1, points2, offset;

                    if (contactPoints) {
                        const averaged = cb.read(BUFFER_READ_BOOL);

                        if (averaged) {
                            point = pc.Vec3.fromBuffer(cb);
                        } else {
                            offset = pc.Vec3.fromBuffer(cb);
                            const count1 = cb.read(BUFFER_READ_UINT32);
                            const count2 = cb.read(BUFFER_READ_UINT32);
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

                case CONTACT_TYPE_PERSISTED: {
                    const event = 'contact:persisted';
                    if (entity1?.hasEvent(event)) {
                        entity1.fire(event, entity2);
                    }
                    if (entity2?.hasEvent(event)) {
                        entity2.fire(event, entity1);
                    }
                    break;
                }

                case CONTACT_TYPE_REMOVED: {
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
        const charsCount = cb.read(BUFFER_READ_UINT32);

        for (let c = 0; c < charsCount; c++) {
            const charIndex = cb.read(BUFFER_READ_UINT32);
            const contactsCount = cb.read(BUFFER_READ_UINT32);
            const charEntity = map.get(charIndex);
            const results = [];

            if (!charEntity.hasEvent('contact:char')) {
                cb.skip(1 * contactsCount, UINT8_SIZE);
                cb.skip(13 * contactsCount, FLOAT32_SIZE);
                continue;
            }

            for (let i = 0; i < contactsCount; i++) {
                const isValidBody2 = cb.read(BUFFER_READ_BOOL);
                const otherIndex = cb.read(BUFFER_READ_UINT32);

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

    static handleQuery(buffer, queryMap) {

        const queryIndex = buffer.read(BUFFER_READ_UINT16);
        const firstOnly = buffer.read(BUFFER_READ_BOOL);
        const hitsCount = buffer.read(BUFFER_READ_UINT16);

        let result = firstOnly ? null : [];

        for (let i = 0; i < hitsCount; i++) {
            const bodyIndex = buffer.read(BUFFER_READ_UINT32);

            const point = new pc.Vec3(
                buffer.read(BUFFER_READ_FLOAT32),
                buffer.read(BUFFER_READ_FLOAT32),
                buffer.read(BUFFER_READ_FLOAT32)
            );

            let normal;
            if (buffer.flag) {
                normal = new pc.Vec3(
                    buffer.read(BUFFER_READ_FLOAT32),
                    buffer.read(BUFFER_READ_FLOAT32),
                    buffer.read(BUFFER_READ_FLOAT32)
                );
            }

            const entity = ShapeComponentSystem.entityMap.get(bodyIndex);
            if (!entity) {
                // Entity could have been deleted by the time the raycast result arrived.
                // We just ignore this result then.
                continue;
            }

            const r = new RaycastResult(entity, point, normal);

            if (firstOnly) {
                result = r;
            } else {
                result.push(r);
            }
        }

        const callback = queryMap.get(queryIndex);
        queryMap.free(queryIndex);
        callback?.(result);
    }

    static handleCharSetShape(cb, queryMap) {
        const cbIndex = cb.read(BUFFER_READ_UINT32);
        const callback = queryMap.get(cbIndex);

        if (DEBUG && !callback) {
            Debug$1.warn(`Unable to locate callback with index: ${ cbIndex }`);
            return;
        }

        queryMap.free(cbIndex);
        callback();
    }
}

// TODO
// make static
const vec3 = new pc.Vec3();

/**
 * Body Component description.
 * 
 * @category Body Component
 */
class BodyComponent extends ShapeComponent {

    // ---- BODY PROPS ----

    _angularVelocity = new pc.Vec3();

    /** @type {number} @hidden */
    _allowedDOFs = pc.JOLT_ALLOWED_DOFS_ALL;

    _allowDynamicOrKinematic = false;

    _allowSleeping = true;

    _angularDamping = 0;

    /** @type {number | null} @hidden */
    _collisionGroup = null;

    _friction = 0.2;
    
    _gravityFactor = 1;
    
    _inertiaMultiplier = 1;

    _isSensor = false;

    _linearDamping = 0;

    _linearVelocity = new pc.Vec3();
    
    _maxAngularVelocity = 0.25 * Math.PI * 60;

    _maxLinearVelocity = 500;

    /** @type {number} @hidden */
    _motionQuality = pc.JOLT_MOTION_QUALITY_DISCRETE;

    /** @type {number} @hidden */
    _motionType = pc.JOLT_MOTION_TYPE_STATIC;

    _objectLayer = 0;

    _overrideInertiaPosition = new pc.Vec3();
    _overrideInertiaRotation = new pc.Quat();

    _overrideMass = 1;
    
    /** @type {number} @hidden */
    _overrideMassProperties = pc.JOLT_OMP_CALCULATE_MASS_AND_INERTIA;

    _position = new pc.Vec3();

    _rotation = new pc.Quat();
    
    _restitution = 0;

    /** @type {number | null} @hidden */
    _subGroup = null;

    _useMotionState = true;

    constructor(system, entity) {
        super(system, entity);
    }

    /**
     * When this body is created as `JOLT_MOTION_TYPE_STATIC`, this setting tells
     * the system to create a MotionProperties object so that the object can be
     * switched to kinematic or dynamic. Use `false` (default), if you don't intend
     * to switch the type of this body from static.
     */
    get allowDynamicOrKinematic() {
        return this._allowDynamicOrKinematic;
    }    

    /**
     * Which degrees of freedom this body has (can be used to limit simulation to 2D).
     * You can use following enum aliases:
     * ```
     * JOLT_ALLOWED_DOFS_TRANSLATION_X
     * ```
     * ```
     * JOLT_ALLOWED_DOFS_TRANSLATION_Y
     * ```
     * ```
     * JOLT_ALLOWED_DOFS_TRANSLATION_Z
     * ```
     * ```
     * JOLT_ALLOWED_DOFS_ROTATION_X
     * ```
     * ```
     * JOLT_ALLOWED_DOFS_ROTATION_Y
     * ```
     * ```
     * JOLT_ALLOWED_DOFS_ROTATION_Z
     * ```
     * ```
     * JOLT_ALLOWED_DOFS_PLANE_2D
     * ```
     * ```
     * JOLT_ALLOWED_DOFS_ALL
     * ```
     * For example, using `JOLT_ALLOWED_DOFS_TRANSLATION_X` allows a body to move in world space X axis. 
     */
    get allowedDOFs() {
        return this._allowedDOFs;
    }

    /**
     * Specifies if this body go to sleep or not.
     */
    get allowSleeping() {
        return this._allowSleeping;
    }    

    /**
     * Specifies how quickly a body loses angular velocity. The formula used:
     * ```
     * dw/dt = -c * w
     * ```
     * `c` must be between 0 and 1 but is usually close to 0.
     */
    get angularDamping() {
        return this._angularDamping;
    }

    /**
     * World space angular velocity (rad/s)
     * 
     * @type {import('playcanvas').Vec3}
     */
    set angularVelocity(vec) {
        if (DEBUG) {
            const ok = Debug$1.checkVec(vec, `Invalid angular velocity vector`);
            if (!ok) return;
        }

        if (!vec.equals(this._angularVelocity)) {
            this._angularVelocity.copy(vec);
            this.system.addCommand(
                OPERATOR_MODIFIER, CMD_SET_ANG_VEL, this._index,
                vec, BUFFER_WRITE_VEC32, false
            );
        }
    }

    get angularVelocity() {
        return this._angularVelocity;
    }

    /**
     * The collision group this body belongs to (determines if two objects can collide).
     * Expensive, so disabled by default. Prefer to use broadphase and object layers 
     * instead for filtering.
     */
    get collisionGroup() {
        return this._collisionGroup;
    }

    /**
     * Friction of the body (dimensionless number, usually between 0 and 1, 0 = no friction,
     * 1 = friction force equals force that presses the two bodies together). Note that bodies
     * can have negative friction but the combined friction should never go below zero.
     */
    get friction() {
        return this._friction;
    }

    /**
     * Value to multiply gravity with for this body.
     */
    get gravityFactor() {
        return this._gravityFactor;
    }

    /**
     * When calculating the inertia (not when it is provided) the calculated inertia will
     * be multiplied by this value.
     */
    get inertiaMultiplier() {
        return this._inertiaMultiplier;
    }

    /**
     * If this body is a sensor. A sensor will receive collision callbacks, but will not
     * cause any collision responses and can be used as a trigger volume.
     */
    get isSensor() {
        return this._isSensor;
    }

    /**
     * Specifies how quickly the body loses linear velocity. Uses formula:
     * ```
     * dv/dt = -c * v.
     * ```
     * `c` must be between 0 and 1 but is usually close to 0.
     */
    get linearDamping() {
        return this._linearDamping;
    }

    /**
     * World space linear velocity of the center of mass (m/s)
     */
    set linearVelocity(vec) {
        if (DEBUG) {
            const ok = Debug$1.checkVec(vec, `Invalid linear velocity vector`);
            if (!ok) return;
        }

        if (!vec.equals(this._linearVelocity)) {
            this._linearVelocity.copy(vec);
            this.system.addCommand(
                OPERATOR_MODIFIER, CMD_SET_LIN_VEL, this._index,
                vec, BUFFER_WRITE_VEC32, false
            );
        }
    }

    get linearVelocity() {
        return this._linearVelocity;
    }

    /**
     * Maximum angular velocity that this body can reach (rad/s)
     */
    get maxAngularVelocity() {
        return this._maxAngularVelocity;
    }

    /**
     * Maximum linear velocity that this body can reach (m/s)
     */
    get maxLinearVelocity() {
        return this._maxLinearVelocity;
    }

    /**
     * Motion quality, or how well it detects collisions when it has a high velocity.
     * Following enum aliases available:
     * ```
     * JOLT_MOTION_QUALITY_DISCRETE
     * ```
     * ```
     * JOLT_MOTION_QUALITY_LINEAR_CAST
     * ```
     * Use linear cast for fast moving objects, in other cases prefer discrete one since its cheaper (default).
     */
    get motionQuality() {
        return this._motionQuality;
    }   

    /**
     * Motion type, determines if the object is static, dynamic or kinematic.
     * You can use the following enum aliases:
     * ```
     * JOLT_MOTION_TYPE_STATIC
     * ```
     * ```
     * JOLT_MOTION_TYPE_DYNAMIC
     * ```
     * ```
     * JOLT_MOTION_TYPE_KINEMATIC
     * ```
     * 
     * @type {number}
     */
    set motionType(type) {
        DEBUG && Debug$1.checkUint(type, `Invalid motion type: ${ type }`);
        this._motionType = type;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_MOTION_TYPE, this._index,
            type, BUFFER_WRITE_UINT8, false
        );
    }

    get motionType() {
        return this._motionType;
    }

    /**
     * The collision layer this body belongs to (determines if two objects can collide).
     * Allows cheap filtering.
     */
    get objectLayer() {
        return this._objectLayer;
    }

    /**
     * Used only if `JOLT_OMP_MASS_AND_INERTIA_PROVIDED` is selected for `overrideMassProperties`.
     * Backend will create inertia matrix from the given position.
     */
    get overrideInertiaPosition() {
        return this._overrideInertiaPosition;
    }

    /**
     * Used only if `JOLT_OMP_MASS_AND_INERTIA_PROVIDED` is selected for {@link overrideMassProperties}.
     * Backend will create inertia matrix from the given rotation.
     */
    get overrideInertiaRotation() {
        return this._overrideInertiaRotation;
    }

    /**
     * Used only if `JOLT_OMP_CALCULATE_INERTIA` or `JOLT_OMP_MASS_AND_INERTIA_PROVIDED` is selected
     * for {@link overrideMassProperties}
     */
    get overrideMass() {
        return this._overrideMass;
    }

    /**
     * Determines how a body mass and inertia is calculated. By default it uses 
     * `JOLT_OMP_CALCULATE_MASS_AND_INERTIA`, which tells Jolt to auto-calculate those based the collider
     * shape. You can use following enum aliases:
     * ```
     * JOLT_OMP_CALCULATE_INERTIA
     * ```
     * ```
     * JOLT_OMP_CALCULATE_MASS_AND_INERTIA
     * ```
     * ```
     * JOLT_OMP_MASS_AND_INERTIA_PROVIDED
     * ```
     * If you select `JOLT_OMP_CALCULATE_INERTIA`, you must also specify {@link overrideMass}.
     * The inertia will be automatically calculated for you.
     * 
     * If you select `JOLT_OMP_MASS_AND_INERTIA_PROVIDED`, you must also specify {@link overrideMass},
     * {@link overrideInertiaPosition} and {@link overrideInertiaRotation}.
     */
    get overrideMassProperties() {
        return this._overrideMassProperties;
    }

    /**
     * Read-only. Current position of the body (not of the center of mass).
     */
    get position() {
        return this._position;
    }

    /**
     * Read-only. Current rotation of the body.
     */
    get rotation() {
        return this._rotation;
    }

    /**
     * Restitution of body (dimensionless number, usually between 0 and 1, 0 = completely
     * inelastic collision response, 1 = completely elastic collision response). Note that
     * bodies can have negative restitution but the combined restitution should never go below zero.
     */
    get restitution() {
        return this._restitution;
    }

    /**
     * The collision sub group (within {@link collisionGroup}) this body belongs to (determines 
     * if two objects can collide). Expensive, so disabled by default. Prefer to use broadphase
     * and object layers instead for filtering.
     */
    get subGroup() {
        return this._subGroup;
    }

    /**
     * Enables/disables the use of motion state for this entity. Not used by static bodies.
     * 
     * If the physcs fixed timestep is set lower than the client's browser refresh rate, then browser will have 
     * multiple frame updates per single physics simulation step. If you enable motion state for this entity,
     * then the position and rotation will be interpolated, otherwise the entity will visually move only after 
     * physics completes a step.
     * 
     * For example, say browser refreshes every 0.1 seconds, and physics step once a second. Without using
     * motion state an entity position will update once every second, when physics update takes place. With motion state
     * enabled, it will update the position/rotation every 0.1 seconds - once a true update (from physics) and 9 times
     * interpolated. This will give a smooth motion of the entity, without having to do expensive physics simulation
     * step.
     */
    set useMotionState(bool) {
        if (DEBUG) {
            const ok = Debug$1.checkBool(bool, `Invalid bool value for useMotionState property: ${ bool }`);
            if (!ok)
                return;
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_USE_MOTION_STATE, this._index,
            bool, BUFFER_WRITE_BOOL, false
        );
    }

    get useMotionState() {
        return this._useMotionState;
    }

    /**
     * Adds a force (unit: N) at an offset to this body for the next physics time step. Will reset after 
     * the physics completes a step.
     * 
     * @param {import('playcanvas').Vec3} force - Force to add to body.
     * @param {import('playcanvas').Vec3} [offset] - Offset from the body center where the force is added.
     * @param {boolean} [isOffsetLocal] - Specifies if offset is in world or local space.
     */
    addForce(force, offset = pc.Vec3.ZERO, isOffsetLocal = false) {
        if (DEBUG) {
            let ok = Debug$1.checkVec(force, `Invalid add force vector`);
            ok = ok && Debug$1.checkVec(offset, `Invalid add force offset`);
            if (!ok) {
                return;
            }
        }

        vec3.copy(offset);

        if (!vec3.equals(pc.Vec3.ZERO) && isOffsetLocal) {   
            this._localToWorld(vec3);
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_FORCE, this._index,
            force, BUFFER_WRITE_VEC32, false,
            vec3, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Same as {@link addForce}, but accepts scalars, instead of vectors.
     * 
     * @param {number} forceX - Force scalar value on X axis.
     * @param {number} forceY - Force scalar value on Y axis.
     * @param {number} forceZ - Force scalar value on Z axis.
     * @param {number} [offsetX] - Force scalar offset on X axis.
     * @param {number} [offsetY] - Force scalar offset on Y axis.
     * @param {number} [offsetZ] - Force scalar offset on Z axis.
     * @param {number} [isOffsetLocal] - Specifies if offset is in world or local space.
     * @returns 
     */
    addForceScalars(forceX, forceY, forceZ, offsetX = 0, offsetY = 0, offsetZ = 0, isOffsetLocal = false) {
        if (DEBUG) {
            let ok = Debug$1.checkFloat(forceX, `Invalid add impulse X component: ${ forceX }`);
            ok = ok && Debug$1.checkFloat(forceY, `Invalid add impulse Y component: ${ forceY }`);
            ok = ok && Debug$1.checkFloat(forceZ, `Invalid add impulse Z component: ${ forceZ }`);
            ok = ok && Debug$1.checkFloat(offsetX, `Invalid add impulse offset X component: ${ offsetX }`);
            ok = ok && Debug$1.checkFloat(offsetY, `Invalid add impulse offset Y component: ${ offsetY }`);
            ok = ok && Debug$1.checkFloat(offsetZ, `Invalid add impulse offset Z component: ${ offsetZ }`);
            if (!ok) {
                return;
            }
        }

        vec3.set(offsetX, offsetY, offsetZ);

        if (offsetX !== 0 || offsetY !== 0 || offsetZ !== 0 && isOffsetLocal) {
            this._localToWorld(vec3);
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_FORCE, this._index,
            forceX, BUFFER_WRITE_FLOAT32, false,
            forceY, BUFFER_WRITE_FLOAT32, false,
            forceZ, BUFFER_WRITE_FLOAT32, false,
            vec3, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Adds an impulse to the center of mass of the body (unit: kg m/s).
     * 
     * @param {import('playcanvas').Vec3} impulse - Impulse to add to body.
     * @param {import('playcanvas').Vec3} [offset] - Offset from the body center where the impulse is added.
     * @param {boolean} [isOffsetLocal] - Specifies if offset is in world or local space.
     */
    addImpulse(impulse, offset = pc.Vec3.ZERO, isOffsetLocal = false) {
        if (DEBUG) {
            let ok = Debug$1.checkVec(impulse, `Invalid add impulse vector:`);
            ok = ok && Debug$1.checkVec(offset, `Invalid add impulse offset:`);
            if (!ok) {
                return;
            }
        }

        vec3.copy(offset);

        if (!vec3.equals(pc.Vec3.ZERO) && isOffsetLocal) {
            this._localToWorld(vec3);
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_IMPULSE, this._index,
            impulse, BUFFER_WRITE_VEC32, false,
            vec3, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Same as {@link addImpulse}, but accepts scalars, instead of vectors.
     * 
     * @param {number} impulseX - Impulse scalar value on X axis.
     * @param {number} impulseY - Impulse scalar value on Y axis.
     * @param {number} impulseZ - Impulse scalar value on Z axis.
     * @param {number} [offsetX] - Impulse scalar offset on X axis.
     * @param {number} [offsetY] - Impulse scalar offset on Y axis.
     * @param {number} [offsetZ] - Impulse scalar offset on Z axis.
     * @param {number} [isOffsetLocal] - Specifies if offset is in world or local space.
     */
    addImpulseScalars(impulseX, impulseY, impulseZ, offsetX = 0, offsetY = 0, offsetZ = 0, isOffsetLocal = false) {
        if (DEBUG) {
            let ok = Debug$1.checkFloat(impulseX, `Invalid add impulse X component: ${ impulseX }`);
            ok = ok && Debug$1.checkFloat(impulseY, `Invalid add impulse Y component: ${ impulseY }`);
            ok = ok && Debug$1.checkFloat(impulseZ, `Invalid add impulse Z component: ${ impulseZ }`);
            ok = ok && Debug$1.checkFloat(offsetX, `Invalid add impulse offset X component: ${ offsetX }`);
            ok = ok && Debug$1.checkFloat(offsetY, `Invalid add impulse offset Y component: ${ offsetY }`);
            ok = ok && Debug$1.checkFloat(offsetZ, `Invalid add impulse offset Z component: ${ offsetZ }`);
            if (!ok) {
                return;
            }
        }

        vec3.set(offsetX, offsetY, offsetZ);

        if (offsetX !== 0 || offsetY !== 0 || offsetZ !== 0 && isOffsetLocal) {
            this._localToWorld(vec3);
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_FORCE, this._index,
            impulseX, BUFFER_WRITE_FLOAT32, false,
            impulseY, BUFFER_WRITE_FLOAT32, false,
            impulseZ, BUFFER_WRITE_FLOAT32, false,
            vec3, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Applies an impulse to the body that simulates fluid buoyancy and drag.
     * 
     * @param {import('playcanvas').Vec3} waterSurfacePosition - Position of the fluid surface in world space.
     * @param {import('playcanvas').Vec3} surfaceNormal - Normal of the fluid surface (should point up).
     * @param {number} buoyancy - The buoyancy factor for the body. 1 = neutral body, < 1 sinks, > 1 floats.
     * @param {number} linearDrag - Linear drag factor that slows down the body when in the fluid (approx. 0.5).
     * @param {number} angularDrag - Angular drag factor that slows down rotation when the body is in the fluid (approx. 0.01).
     * @param {import('playcanvas').Vec3} fluidVelocity - The average velocity of the fluid (in m/s) in which the body resides.
     */
    applyBuoyancyImpulse(waterSurfacePosition, surfaceNormal, buoyancy, linearDrag, angularDrag, fluidVelocity) {
        if (DEBUG) {
            let ok = true;
            ok = ok && Debug$1.checkVec(waterSurfacePosition, `Invalid water surface position vector`);
            ok = ok && Debug$1.checkVec(surfaceNormal, `Invalid surface normal`);
            ok = ok && Debug$1.checkFloat(buoyancy, `Invalid buoyancy scalar: ${ buoyancy }`);
            ok = ok && Debug$1.checkFloat(linearDrag, `Invalid linear drag scalar: ${ linearDrag }`);
            ok = ok && Debug$1.checkFloat(angularDrag, `Invalid angular drag scalar: ${ angularDrag }`);
            ok = ok && Debug$1.checkVec(fluidVelocity, `Invalid fluid velocity vector`);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_APPLY_BUOYANCY_IMPULSE, this._index,
            waterSurfacePosition, BUFFER_WRITE_VEC32, false,
            surfaceNormal, BUFFER_WRITE_VEC32, false,
            buoyancy, BUFFER_WRITE_FLOAT32, false,
            linearDrag, BUFFER_WRITE_FLOAT32, false,
            angularDrag, BUFFER_WRITE_FLOAT32, false,
            fluidVelocity, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Adds an angular impulse to the center of mass.
     * 
     * @param {import('playcanvas').Vec3} impulse - Angular impulse vector.
     */
    addAngularImpulse(impulse) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_IMPULSE, this._index,
            impulse, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Adds a torque (unit: N) for the next physics time step. Will reset after 
     * the physics completes a step.
     * 
     * @param {import('playcanvas').Vec3} torque - Torque vector.
     */
    addTorque(torque) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_FORCE, this._index,
            torque, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Intantenous placement of a body to a new position/rotation (i.e. teleport). Will ignore any bodies
     * between old and new position.
     * 
     * @param {import('playcanvas').Vec3} position - World space position where to place the body. 
     * @param {import('playcanvas').Quat} [rotation] - World space rotation the body should assume at new position.
     */
    teleport(position, rotation = pc.Quat.IDENTITY) {
        if (DEBUG) {
            let ok = Debug$1.checkVec(position, `Invalid position vector`, position);
            ok = ok && Debug$1.checkQuat(rotation, `Invalid rotation quat`, rotation);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_MOVE_BODY, this._index,
            position, BUFFER_WRITE_VEC32, false,
            rotation, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Same as {@link teleport}, but taking scalars, instead of vectors.
     * 
     * @param {number} px - Position scalar value on X axis.
     * @param {number} py - Position scalar value on Y axis.
     * @param {number} pz - Position scalar value on Z axis.
     * @param {number} [rx] - Rotation scalar value on X axis.
     * @param {number} [ry] - Rotation scalar value on Y axis.
     * @param {number} [rz] - Rotation scalar value on Z axis.
     * @param {number} [rw] - Rotation scalar value on W axis.
     */
    teleportScalars(px, py, pz, rx = 0, ry = 0, rz = 0, rw = 1) {
        if (DEBUG) {
            let ok = Debug$1.checkFloat(px, `Invalid position X component`, px);
            ok = ok && Debug$1.checkFloat(py, `Invalid position Y component`, py);
            ok = ok && Debug$1.checkFloat(pz, `Invalid position Z component`, pz);
            ok = ok && Debug$1.checkFloat(rx, `Invalid rotation X component`, rx);
            ok = ok && Debug$1.checkFloat(ry, `Invalid rotation Y component`, ry);
            ok = ok && Debug$1.checkFloat(rz, `Invalid rotation Z component`, rz);
            ok = ok && Debug$1.checkFloat(rw, `Invalid rotation W component`, rw);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_MOVE_BODY, this._index,
            px, BUFFER_WRITE_FLOAT32, false,
            py, BUFFER_WRITE_FLOAT32, false,
            pz, BUFFER_WRITE_FLOAT32, false,
            rx, BUFFER_WRITE_FLOAT32, false,
            ry, BUFFER_WRITE_FLOAT32, false,
            rz, BUFFER_WRITE_FLOAT32, false,
            rw, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * Changes the position and rotation of a dynamic body. Unlike {@link teleport}, this
     * method doesn't change the position/rotation directly, but instead calculates and
     * sets linear and angular velocities for the body, so it can reach the target position
     * and rotation in specified delta time. If delta time is set to zero (default), the engine will
     * use the current fixed timestep value.
     * 
     * @param {import('playcanvas').Vec3} pos - Taret position the body should reach in given dt.
     * @param {import('playcanvas').Quat} rot - Target rotation the body should reach in given dt.
     * @param {number} [dt] - Time in which the body should reach target position and rotation. In seconds.
     */
    moveKinematic(pos, rot, dt = 0) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_MOVE_KINEMATIC, this._index,
            pos, BUFFER_WRITE_VEC32, false,
            rot, BUFFER_WRITE_VEC32, false,
            dt, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * Resets both linear and angular velocities of a body to zero.
     */
    resetVelocities() {
        this.system.addCommand(OPERATOR_MODIFIER, CMD_RESET_VELOCITIES, this._index);
    }    

    writeIsometry() {
        if (this._motionType === pc.JOLT_MOTION_TYPE_DYNAMIC) {
            return;
        }

        const entity = this.entity;

        if (entity._dirtyWorld) {
            const position = entity.getPosition();
            const rotation = entity.getRotation();

            this.system.addCommand(
                OPERATOR_MODIFIER, CMD_MOVE_BODY, this._index,
                position, BUFFER_WRITE_VEC32, false,
                rotation, BUFFER_WRITE_VEC32, false
            );

            // if (this._motionType === pc.JOLT_MOTION_TYPE_DYNAMIC) {
            //     this.resetVelocities();
            // }
        }
    }    

    writeComponentData(cb) {
        const ok = ShapeComponent.writeShapeData(cb, this);
        if (DEBUG && !ok) {
            Debug$1.warn('Error creating a shape data.');
            cb.reset();
            return;
        }

        cb.write(this._index, BUFFER_WRITE_UINT32, false);

        // We always use world position and rotation from the current entity the component
        // is attached to (instead of default zero vectors)
        const entity = this.entity;
        const pos = entity.getPosition();
        const rot = entity.getRotation();

        // TODO
        // get rid of flags

        // Loss of precision for pos/rot (64 -> 32)
        cb.write(pos, BUFFER_WRITE_VEC32, false);
        cb.write(rot, BUFFER_WRITE_VEC32, false);

        cb.write(this._motionType, BUFFER_WRITE_UINT8, false);
        cb.write(this._useMotionState, BUFFER_WRITE_BOOL, false);
        cb.write(this._objectLayer, BUFFER_WRITE_UINT32, false);
        cb.write(this._linearVelocity, BUFFER_WRITE_VEC32, false);
        cb.write(this._angularVelocity, BUFFER_WRITE_VEC32, false);
        cb.write(this._maxLinearVelocity, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxAngularVelocity, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._friction, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._restitution, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._linearDamping, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._angularDamping, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._gravityFactor, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._inertiaMultiplier, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._allowedDOFs, BUFFER_WRITE_UINT8, false);
        cb.write(this._allowDynamicOrKinematic, BUFFER_WRITE_BOOL, false);
        cb.write(this._isSensor, BUFFER_WRITE_BOOL, false);
        cb.write(this._motionQuality, BUFFER_WRITE_UINT8, false);
        cb.write(this._allowSleeping, BUFFER_WRITE_BOOL, false);
        cb.write(this._collisionGroup, BUFFER_WRITE_UINT32);
        cb.write(this._subGroup, BUFFER_WRITE_UINT32);

        const massProps = this._overrideMassProperties;
        cb.write(massProps, BUFFER_WRITE_UINT8, false);

        if (massProps !== pc.JOLT_OMP_CALCULATE_MASS_AND_INERTIA) {
            cb.write(this._overrideMass, BUFFER_WRITE_FLOAT32, false);

            if (this._overrideMassProperties === pc.JOLT_OMP_MASS_AND_INERTIA_PROVIDED) {
                // override inertia
                // Potential precision loss (64 -> 32)
                cb.write(this._overrideInertiaPosition, BUFFER_WRITE_VEC32, false);
                cb.write(this._overrideInertiaRotation, BUFFER_WRITE_VEC32, false);
            }
        }

        DEBUG && cb.write(this._debugDraw, BUFFER_WRITE_BOOL, false);
    }

    onEnable() {
        const system = this.system;
        const shape = this._shape;
        const isCompoundChild = this._isCompoundChild;

        this._index = system.getIndex(this.entity);

        if ((shape === SHAPE_MESH || shape === SHAPE_CONVEX_HULL || shape === SHAPE_HEIGHTFIELD) && 
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

        system.addCommand(OPERATOR_CLEANER, CMD_DESTROY_BODY, componentIndex);

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

const schema$4 = [
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

/**
 * Body Component System description.
 * 
 * @category Body Component
 */
class BodyComponentSystem extends ShapeComponentSystem {
    constructor(app, manager, id) {
        super(app, manager);

        this.schema = [...this._schema, ...schema$4];

        manager.systems.set(id, this);

        this.on('beforeremove', this.onBeforeRemove, this);
    }

    get id() {
        return 'body';
    }

    get ComponentType() {
        return BodyComponent;
    }

    overrideContacts(callbacks = {}) {
        if (DEBUG) {
            !!callbacks.OnContactValidate && Debug$1.assert(typeof callbacks.OnContactValidate === 'function', 'OnContactValidate must be a function', callbacks);
            !!callbacks.OnContactAdded && Debug$1.assert(typeof callbacks.OnContactAdded === 'function', 'OnContactAdded must be a function', callbacks);
            !!callbacks.OnContactPersisted && Debug$1.assert(typeof callbacks.OnContactPersisted === 'function', 'OnContactPersisted must be a function', callbacks);
            !!callbacks.OnContactRemoved && Debug$1.assert(typeof callbacks.OnContactRemoved === 'function', 'OnContactRemoved must be a function', callbacks);
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

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_BODY);

        component.writeComponentData(cb);
    }

    processCommands(cb) {
        const command = cb.readCommand();

        switch (command) {
            case CMD_REPORT_TRANSFORMS:
                // TODO
                // move to ResponseHandler
                ShapeComponentSystem.updateDynamic(cb);
                break;

            // TODO
            // handle by manager directly
            case CMD_CAST_RAY:
            case CMD_CAST_SHAPE:
                ResponseHandler.handleQuery(cb, this.entityMap, this._manager.queryMap);
                break;

            case CMD_REPORT_CONTACTS:
                ResponseHandler.handleContact(cb, this.entityMap, this._manager.config);
                break;
        }
    }

    requestIsometry() {
        this.fire('write-isometry');
    }

    // initializeComponentData(component, data) {
    //     if (DEBUG) {
    //         const ok = Debug.verifyProperties(data, this._schema);
    //         if (!ok) {
    //             return;
    //         }
    //     }

    //     super.initializeComponentData(component, data);
    // }

    onBeforeRemove(entity, component) {
        if (component.enabled) {
            component.enabled = false;
        }
    }
}

class CharComponent extends ShapeComponent {
    // ---- SHAPE PROPS ----

    // Shape type
    _shape = SHAPE_CAPSULE;

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

    // An entity with a kinemaitc or dynamic body, that will be paired with this character to enable
    // a world presence (allow raycasts and collisions detection vs character)
    _pairedEntity = null;

    constructor(system, entity) {
        super(system, entity);      
    }

    get linearVelocity() {
        return this._linearVelocity;
    }

    set linearVelocity(vel) {
        DEBUG && Debug$1.checkVec(vel, `Invalid character linear velocity`, vel);
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_LIN_VEL, this._index,
            vel, BUFFER_WRITE_VEC32, false
        );
    }

    get userData() {
        return this._userData;
    }

    set userData(num) {
        if (DEBUG) {
            let ok = Debug$1.checkFloat(num, `Invalid user data value. Should be a number: ${ num }`);
            if (!ok)
                return;
        }

        this._userData = num;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_USER_DATA, this._index,
            num, BUFFER_WRITE_FLOAT32, false
        );        
    }

    get pairedEntity() {
        return this._pairedEntity;
    }

    set pairedEntity(entity) {
        if (DEBUG) {
            let ok = Debug$1.assert(!!entity.body, `Invalid entity to pair. Needs to have a "body" component.`, entity);
            if (!ok)
                return;
        }

        this._pairedEntity = entity;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_PAIR_BODY, this._index,
            entity.body.index, BUFFER_WRITE_UINT32, false
        );
    }

    setShape(shapeIndex = null, callback = null) {
        const system = this.system;

        system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_SHAPE, this._index,
            !!callback, BUFFER_WRITE_BOOL, false,
            shapeIndex, BUFFER_WRITE_UINT32, true
        );

        if (callback) {
            this._writeCallback(callback);
        }
    }

    writeComponentData(cb) {
        const ok = ShapeComponent.writeShapeData(cb, this, true /* force write rotation */);
        if (DEBUG && !ok) {
            Debug$1.warn('Error creating a shape data.');
            return false;
        }

        cb.write(this._index, BUFFER_WRITE_UINT32, false);
        cb.write(this._useMotionState, BUFFER_WRITE_BOOL, false);
        cb.write(this._up, BUFFER_WRITE_VEC32, false);
        cb.write(this._supportingVolume, BUFFER_WRITE_PLANE, false);
        cb.write(this._maxSlopeAngle, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._mass, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxStrength, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._shapeOffset, BUFFER_WRITE_VEC32, false);
        cb.write(this._backFaceMode, BUFFER_WRITE_UINT8, false);
        cb.write(this._predictiveContactDistance, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxCollisionIterations, BUFFER_WRITE_UINT32, false);
        cb.write(this._maxConstraintIterations, BUFFER_WRITE_UINT32, false);
        cb.write(this._minTimeRemaining, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._collisionTolerance, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._characterPadding, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxNumHits, BUFFER_WRITE_UINT32, false);
        cb.write(this._hitReductionCosMaxAngle, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._penetrationRecoverySpeed, BUFFER_WRITE_FLOAT32, false);

        const entity = this.entity;
        const pos = entity.getPosition();
        const rot = entity.getRotation();

        // Loss of precision for pos/rot (64 -> 32)
        cb.write(pos, BUFFER_WRITE_VEC32, false);
        cb.write(rot, BUFFER_WRITE_VEC32, false);

        DEBUG && cb.write(this._debugDraw, BUFFER_WRITE_BOOL, false);
    }

    updateTransforms(cb, map) {
        const entity = this.entity;

        const px = cb.read(BUFFER_READ_FLOAT32);
        const py = cb.read(BUFFER_READ_FLOAT32);
        const pz = cb.read(BUFFER_READ_FLOAT32);
        entity.setPosition(px, py, pz);

        entity.setRotation(
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32)
        );

        this._linearVelocity.set(
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32)
        );

        const pe = this._pairedEntity;
        if (pe) {
            pe.setPosition(px, py + this._shapeOffset.y + this._shapePosition.y, pz);
            pe.setRotation(0, 0, 0, 1); // char never rotates
        }

        const isSupported = cb.read(BUFFER_READ_BOOL);
        this._isSupported = isSupported;
        this._state = cb.read(BUFFER_READ_UINT8);

        if (isSupported && cb.read(BUFFER_READ_BOOL)) {
            const groundIndex = cb.read(BUFFER_READ_UINT32);
            this._groundEntity = map.get(groundIndex) || null;
            this._isSlopeTooSteep = cb.read(BUFFER_READ_BOOL);
            this._groundVelocity.set(
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32)
            );
            this._groundNormal.set(
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32)
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

    onDisable() {
        super.onDisable();

        const system = this.system;
        const componentIndex = this._index;

        system.setIndexFree(componentIndex);

        system.addCommand(OPERATOR_CLEANER, CMD_DESTROY_BODY, componentIndex);
    }    

    _writeCallback(callback) {
        if (callback) {
            const system = this.system;
            const callbackIndex = system.getCallbackIndex(callback);
            system.addCommandArgs(callbackIndex, BUFFER_WRITE_UINT32, false);
        }
    }
}

const schema$3 = [
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
    'state',
    'pairedEntity',
];

class CharComponentSystem extends ShapeComponentSystem {
    constructor(app, manager, id) {
        super(app, manager);

        this._schema = [...this._schema, ...schema$3];
        this._queryMap = new IndexedCache();

        this._exposeConstants();

        manager.systems.set(id, this);
    }

    get id() {
        return 'char';
    }

    get ComponentType() {
        return CharComponent;
    }

    getCallbackIndex(callback) {
        return this._manager.queryMap.add(callback);
    }

    // initializeComponentData(component, data) {
    //     if (DEBUG) {
    //         const ok = Debug.verifyProperties(data, this.schema);
    //         if (!ok) return;
    //     }

    //     super.initializeComponentData(component, data);
    // }

    processCommands(cb) {
        const command = cb.readCommand();

        switch (command) {
            case CMD_REPORT_TRANSFORMS:
                this._updateCharTransforms(cb);
                break;

            case CMD_REPORT_CONTACTS:
                ResponseHandler.handleCharContacts(cb, this.entityMap);
                break;

            case CMD_REPORT_SET_SHAPE:
                ResponseHandler.handleCharSetShape(cb, this._manager.queryMap);
                break;
        }
    }

    createCharacter(component) {
        const cb = this._manager.commandsBuffer;

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_CHAR);

        component.writeComponentData(cb);
    }

    overrideContacts(callbacks = {}) {
        if (DEBUG) {
            !!callbacks.OnAdjustBodyVelocity && Debug$1.assert(typeof callbacks.OnAdjustBodyVelocity === 'function', 'OnAdjustBodyVelocity must be a function', callbacks);
            !!callbacks.OnContactValidate && Debug$1.assert(typeof callbacks.OnContactValidate === 'function', 'OnContactValidate must be a function', callbacks);
            !!callbacks.OnContactAdded && Debug$1.assert(typeof callbacks.OnContactAdded === 'function', 'OnContactAdded must be a function', callbacks);
            !!callbacks.OnContactSolve && Debug$1.assert(typeof callbacks.OnContactSolve === 'function', 'OnContactSolve must be a function', callbacks);
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
        const charsCount = cb.read(BUFFER_READ_UINT32);

        for (let i = 0; i < charsCount; i++) {
            const index = cb.read(BUFFER_READ_UINT32);
            const entity = this.entityMap.get(index);

            entity?.char?.updateTransforms(cb, this.entityMap);
        }
    }
}

class SpringSettings {
    springMode = SPRING_MODE_FREQUENCY;
    frequency = 0;
    stiffness = 1;
    damping = 0;

    constructor(opts = {}) {
        this.springMode = opts.springMode ?? this.springMode;
        this.frequency = opts.frequency ?? this.frequency;
        this.stiffness = opts.stiffness ?? this.stiffness;
        this.damping = opts.damping ?? this.damping;
    }
}

class MotorSettings {
    minForceLimit = -Number.MAX_VALUE;
    maxForceLimit = Number.MAX_VALUE;
    minTorqueLimit = -Number.MAX_VALUE;
    maxTorqueLimit = Number.MAX_VALUE;
    springSettings = null;

    constructor(opts = {}) {
        this.minForceLimit = opts.minForceLimit ?? this.minForceLimit;
        this.maxForceLimit = opts.maxForceLimit ?? this.maxForceLimit;
        this.minTorqueLimit = opts.minTorqueLimit ?? this.minTorqueLimit;
        this.maxTorqueLimit = opts.maxTorqueLimit ?? this.maxTorqueLimit;

        if (opts.springSettings) {
            this.springSettings = new SpringSettings(opts.springSettings);
        }
    }
}

class Constraint {
    static defaultMotor = new MotorSettings();

    static writeAxes(cb, axes, limits) {
        cb.write(!!axes, BUFFER_WRITE_BOOL, false);
        if (axes) {
            const count = axes.length;
            if (limits) {
                cb.write(count / 3, BUFFER_WRITE_UINT8, false);
                for (let i = 0; i < count; i += 3) {
                    cb.write(axes[i], BUFFER_WRITE_UINT8, false);
                    cb.write(axes[i + 1], BUFFER_WRITE_FLOAT32, false);
                    cb.write(axes[i + 2], BUFFER_WRITE_FLOAT32, false);
                }
            } else {
                cb.write(count, BUFFER_WRITE_UINT8, false);
                for (let i = 0; i < count; i++) {
                    cb.write(axes[i], BUFFER_WRITE_UINT8, false);
                }
            }
        }
    }    

    static writeMotorSettings(cb, settings) {
        cb.write(!!settings, BUFFER_WRITE_BOOL, false);
        if (settings !== null) {
            Constraint.writeSpringSettings(cb, settings.springSettings);
            cb.write(settings.minForceLimit, BUFFER_WRITE_FLOAT32);
            cb.write(settings.maxForceLimit, BUFFER_WRITE_FLOAT32);
            cb.write(settings.minTorqueLimit, BUFFER_WRITE_FLOAT32);
            cb.write(settings.maxTorqueLimit, BUFFER_WRITE_FLOAT32);
        }
    }

    static writeSpringSettings(cb, settings) {
        cb.write(!!settings, BUFFER_WRITE_BOOL, false);
        if (settings !== null) {
            cb.write(settings.springMode, BUFFER_WRITE_UINT8);
            if (settings.springMode === SPRING_MODE_FREQUENCY) {
                cb.write(settings.frequency, BUFFER_WRITE_FLOAT32);
            } else {
                cb.write(settings.stiffness, BUFFER_WRITE_FLOAT32);
            }
            cb.write(settings.damping, BUFFER_WRITE_FLOAT32);
        }
    }

    _index = -1;

    _point1 = new pc.Vec3();

    _point2 = new pc.Vec3();

    _type = CONSTRAINT_TYPE_UNDEFINED;

    _entity1 = null;

    _entity2 = null;

    _numVelocityStepsOverride = 0;

    _numPositionStepsOverride = 0;

    _space = CONSTRAINT_SPACE_WORLD;

    constructor(entity1, entity2, opts = {}) {
        if (DEBUG) {
            let ok = Debug$1.assert(!!entity1 && entity1 instanceof pc.Entity && !!entity1.body,
                'Invalid entity1 when adding a constraint', entity1);
            ok = ok && Debug$1.assert(!!entity2 && entity2 instanceof pc.Entity && !!entity2.body,
                'Invalid entity1 when adding a constraint', entity2);
            if (opts.point1) {
                ok = ok && Debug$1.assert(opts.point1 instanceof pc.Vec3,
                    'Invalid point1 when adding a constraint. Expected a vector.', opts.point1);
            }
            if (opts.point2) {
                ok = ok && Debug$1.assert(opts.point2 instanceof pc.Vec3,
                    'Invalid point1 when adding a constraint. Expected a vector.', opts.point2);
            }
            if (!ok) {
                return;
            }
        }

        this._entity1 = entity1;
        this._entity2 = entity2;
        opts.point1 && this._point1.copy(opts.point1);
        opts.point2 && this._point2.copy(opts.point2);
        this._numVelocityStepsOverride = opts.numVelocityStepsOverride ?? this._numVelocityStepsOverride;
        this._numPositionStepsOverride = opts.numPositionStepsOverride ?? this._numPositionStepsOverride;
        this._space = opts.space ?? this._space;
    }

    get index() {
        return this._index;
    }

    set index(idx) {
        this._index = idx;
    }

    get point1() {
        return this._point1;
    }

    get point2() {
        return this._point2;
    }

    get entity1() {
        return this._entity1;
    }

    get entity2() {
        return this._entity2;
    }

    get numVelocityStepsOverride() {
        return this._numVelocityStepsOverride;
    }

    get numPositionStepsOverride() {
        return this._numVelocityStepsOverride;
    }

    get space() {
        return this._space;
    }

    get system() {
        return this._entity1.constraint.system;
    }

    get type() {
        return this._type;
    }

    destroy() {
        this.system.destroyConstraint(this._index);
    }

    write(cb) {
        cb.write(this._index, BUFFER_WRITE_UINT32, false);
        cb.write(this._type, BUFFER_WRITE_UINT8, false);
        cb.write(this._entity1.body.index, BUFFER_WRITE_UINT32, false);
        cb.write(this._entity2.body.index, BUFFER_WRITE_UINT32, false);
        cb.write(this._numVelocityStepsOverride, BUFFER_WRITE_UINT8, false);
        cb.write(this._numPositionStepsOverride, BUFFER_WRITE_UINT8, false);
        cb.write(this._space, BUFFER_WRITE_UINT8, false);
    }

    setEnabled(enabled, activate = true) {
        if (DEBUG) {
            let ok = Debug$1.checkBool(enabled, `Invalid constraint enable bool: ${ enabled }`);
            ok = ok && Debug$1.checkBool(activate, `Invalid activate bool: ${ activate }`);
            if (!ok) {
                return;    
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SET_ENABLED, this._index,
            enabled, BUFFER_WRITE_BOOL, false,
            activate, BUFFER_WRITE_BOOL, false
        );
    }
}

class ConeConstraint extends Constraint {
    _type = CONSTRAINT_TYPE_CONE;

    _twistAxis1 = pc.Vec3.RIGHT;

    _twistAxis2 = pc.Vec3.RIGHT;

    _halfConeAngle = 0;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        opts.twistAxis1 && (this._twistAxis1 = opts.twistAxis1);
        opts.twistAxis2 && (this._twistAxis2 = opts.twistAxis2);

        this._halfConeAngle = opts.halfConeAngle ?? this._halfConeAngle;
    }

    get halfConeAngle() {
        return this._halfConeAngle;
    }

    set halfConeAngle(angle) {
        if (DEBUG) {
            const ok = Debug$1.checkFloat(angle, `Invalid half cone angle scalar: ${ angle }`);
            if (!ok) {
                return;
            }
        }

        if (this._halfConeAngle === angle) {
            return;
        }

        this._halfConeAngle = angle;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_C_SET_H_C_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }    

    get twistAxis1() {
        return this._twistAxis1;
    }

    get twistAxis2() {
        return this._twistAxis2;
    }

    write(cb) {
        super.write(cb);

        cb.write(this._point1, BUFFER_WRITE_VEC32);
        cb.write(this._twistAxis1, BUFFER_WRITE_VEC32);
        cb.write(this._point2, BUFFER_WRITE_VEC32);
        cb.write(this._twistAxis2, BUFFER_WRITE_VEC32);
        cb.write(this._halfConeAngle, BUFFER_WRITE_FLOAT32);
    }
}

class DistanceConstraint extends Constraint {
    _type = CONSTRAINT_TYPE_DISTANCE;

    _minDistance = -1;

    _maxDistance = -1;

    _limitsSpringSettings = null;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        this._minDistance = opts.minDistance ?? this._minDistance;
        this._maxDistance = opts.maxDistance ?? this._maxDistance;
        
        if (opts.limitsSpringSettings) {
            this._limitsSpringSettings = new SpringSettings(opts.limitsSpringSettings);
        }
    }

    get limitsSpringSettings() {
        return this._limitsSpringSettings;
    }

    set limitsSpringSettings(settings) {
        if (DEBUG) {
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
            OPERATOR_MODIFIER, CMD_JNT_D_SET_SPRING_S, this._index,
            true, BUFFER_WRITE_BOOL, false,
            settings.springMode, BUFFER_WRITE_UINT8, true,
            freqOrStiff, BUFFER_WRITE_FLOAT32, true,
            settings.damping, BUFFER_WRITE_FLOAT32, true
        );
    }

    get minDistance() {
        return this._minDistance;
    }

    get maxDistance() {
        return this._maxDistance;
    }

    get limitsSpringSettings() {
        return this._limitsSpringSettings;
    }

    write(cb) {
        super.write(cb);

        cb.write(this._point1, BUFFER_WRITE_VEC32);
        cb.write(this._point2, BUFFER_WRITE_VEC32);
        cb.write(this._minDistance, BUFFER_WRITE_FLOAT32);
        cb.write(this._maxDistance, BUFFER_WRITE_FLOAT32);

        Constraint.writeSpringSettings(cb, this._limitsSpringSettings);
    }

    setDistance(min, max) {
        if (DEBUG) {
            let ok = Debug.checkFloat(min, `Invalid min distance for constraint: ${ min }`);
            ok = ok && Debug.checkFloat(max, `Invalid max distance for constraint: ${ max }`);
            ok = ok && Debug.assert(min <= max, `Invalid min/max range: [${ min } : ${ max }]`);
            if (!ok) {
                return;
            }
        }

        this._limitsMin = min;
        this._limitsMax = max;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_D_SET_DISTANCE, this._index,
            min, BUFFER_WRITE_FLOAT32, false,
            max, BUFFER_WRITE_FLOAT32, false
        );
    }    
}

class FixedConstraint extends Constraint {
    _type = CONSTRAINT_TYPE_FIXED;

    _autoDetectPoint = true;

    _axisX1 = pc.Vec3.RIGHT;

    _axisX2 = pc.Vec3.RIGHT;

    _axisY1 = pc.Vec3.UP;

    _axisY2 = pc.Vec3.UP;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        this._autoDetectPoint = opts.autoDetectPoint ?? this._autoDetectPoint;

        opts.axisX1 && (this._axisX1 = opts.axisX1);
        opts.axisX2 && (this._axisX2 = opts.axisX2);
        opts.axisY1 && (this._axisY1 = opts.axisY1);
        opts.axisY2 && (this._axisY2 = opts.axisY2);
    }

    get autoDetectPoint() {
        return this._autoDetectPoint;
    }

    get axisX1() {
        return this._axisX1;
    }

    get axisX2() {
        return this._axisX2;
    }

    get axisY1() {
        return this._axisY1;
    }

    get axisY2() {
        return this._axisY2;
    }

    write(cb) {
        const auto = this._autoDetectPoint;
        if (DEBUG && !auto) {
            let ok = Debug$1.checkVec(this._point1, 
                'Fixed constraint has disabled autoDetectPoint, but point1 was not provided');
            ok = ok && Debug$1.checkVec(this._point2,
                'Fixed constraint has disabled autoDetectPoint, but point2 was not provided');
            if (!ok) {
                return;
            }
        }

        super.write(cb);

        cb.write(auto, BUFFER_WRITE_BOOL);
        if (!auto) {
            cb.write(this._point1, BUFFER_WRITE_VEC32);
            cb.write(this._point2, BUFFER_WRITE_VEC32);
        }
        cb.write(this._axisX1, BUFFER_WRITE_VEC32);
        cb.write(this._axisY1, BUFFER_WRITE_VEC32);
        cb.write(this._axisX2, BUFFER_WRITE_VEC32);
        cb.write(this._axisY2, BUFFER_WRITE_VEC32);
    }


}

class HingeConstraint extends Constraint {
    _type = CONSTRAINT_TYPE_HINGE;

    _hingeAxis1 = pc.Vec3.UP;

    _hingeAxis2 = pc.Vec3.UP;

    _normalAxis1 = pc.Vec3.RIGHT;

    _normalAxis2 = pc.Vec3.RIGHT;

    _limitsMax = 3.141592653589793;

    _limitsMin = -3.141592653589793;

    _limitsSpringSettings = null;

    _motorSettings = null;

    _maxFrictionTorque = 0;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        opts.hingeAxis1 && (this._hingeAxis1 = opts.hingeAxis1);
        opts.hingeAxis2 && (this._hingeAxis2 = opts.hingeAxis2);
        opts.normalAxis1 && (this._normalAxis1 = opts.normalAxis1);
        opts.normalAxis2 && (this._normalAxis2 = opts.normalAxis2);

        this._limitsMin = opts.limitsMin ?? this._limitsMin;
        this._limitsMax = opts.limitsMax ?? this._limitsMax;
        this._maxFrictionTorque = opts.maxFrictionTorque ?? this._maxFrictionTorque;

        if (opts.limitsSpringSettings) {
            this._limitsSpringSettings = new SpringSettings(opts.limitsSpringSettings);
        }

        if (opts.motorSettings) {
            this._motorSettings = new MotorSettings(opts.motorSettings);
        }
    }

    get hingeAxis1() {
        return this._hingeAxis1;
    }

    get hingeAxis2() {
        return this._hingeAxis2;
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
        if (DEBUG) {
            const ok = Debug$1.checkSpringSettings(settings);
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
            OPERATOR_MODIFIER, CMD_JNT_H_SET_SPRING_S, this._index,
            true, BUFFER_WRITE_BOOL, false,
            settings.springMode, BUFFER_WRITE_UINT8, true,
            freqOrStiff, BUFFER_WRITE_FLOAT32, true,
            settings.damping, BUFFER_WRITE_FLOAT32, true
        );
    }

    get maxFrictionTorque() {
        return this._maxFrictionTorque;
    }

    set maxFrictionTorque(torque) {
        if (this._maxFrictionTorque === torque) {
            return;
        }

        this._maxFrictionTorque = torque;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_H_SET_M_F_TORQUE, this._index,
            torque, BUFFER_WRITE_FLOAT32, false
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

    write(cb) {
        super.write(cb);

        cb.write(this._point1, BUFFER_WRITE_VEC32);
        cb.write(this._hingeAxis1, BUFFER_WRITE_VEC32);
        cb.write(this._normalAxis1, BUFFER_WRITE_VEC32);
        cb.write(this._point2, BUFFER_WRITE_VEC32);
        cb.write(this._hingeAxis2, BUFFER_WRITE_VEC32);
        cb.write(this._normalAxis2, BUFFER_WRITE_VEC32);
        cb.write(this._limitsMin, BUFFER_WRITE_FLOAT32);
        cb.write(this._limitsMax, BUFFER_WRITE_FLOAT32);
        cb.write(this._maxFrictionTorque, BUFFER_WRITE_FLOAT32);

        Constraint.writeSpringSettings(cb, this._limitsSpringSettings);
        Constraint.writeMotorSettings(cb, this._motorSettings);
    }

    setMotorState(state) {
        if (DEBUG) {
            const ok = Debug$1.checkUint(state, `Invalid motor state for constraint:`, state);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_H_SET_M_S, this._index,
            state, BUFFER_WRITE_UINT8, false
        );
    }

    setTargetAngularVelocity(velocity) {
        if (DEBUG) {
            const ok = Debug$1.checkFloat(velocity, `Invalid target velocity for constraint:`, velocity);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_H_SET_T_ANG_VEL, this._index,
            velocity, BUFFER_WRITE_FLOAT32, false
        );
    }

    setTargetAngle(angle) {
        if (DEBUG) {
            const ok = Debug$1.checkFloat(angle, `Invalid target radians for constraint:`, angle);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_H_SET_T_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }

    setLimits(min, max) {
        if (DEBUG) {
            let ok = Debug$1.checkFloat(min, `Invalid min scalar limit for constraint: ${ min }`);
            ok = ok && Debug$1.checkFloat(max, `Invalid max scalar limit for constraint: ${ max }`);
            ok = ok && Debug$1.assert(min <= max, `Invalid min/max range: [${ min } : ${ max }]`);
            if (!ok) {
                return;
            }
        }

        this._limitsMin = min;
        this._limitsMax = max;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_H_SET_LIMITS, this._index,
            min, BUFFER_WRITE_FLOAT32, false,
            max, BUFFER_WRITE_FLOAT32, false
        );
    }
}

class PointConstraint extends Constraint {
    _type = CONSTRAINT_TYPE_POINT;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);
    }

    write(cb) {
        super.write(cb);

        cb.write(this._point1, BUFFER_WRITE_VEC32);
        cb.write(this._point2, BUFFER_WRITE_VEC32);
    }
}

class PulleyConstraint extends Constraint {
    _type = CONSTRAINT_TYPE_PULLEY;

    _fixedPoint1 = pc.Vec3.ZERO;

    _fixedPoint2 = pc.Vec3.ZERO;

    _ratio = 1;

    _minLength = 0;

    _maxLength = -1;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        opts.fixedPoint1 && (this._fixedPoint1 = opts.fixedPoint1);
        opts.fixedPoint2 && (this._fixedPoint2 = opts.fixedPoint2);
        this._ratio = opts.ratio ?? this._ratio;
        this._minLength = opts.minLength ?? this._minLength;
        this._maxLength = opts.maxLength ?? this._maxLength;
    }

    get fixedPoint1() {
        return this._fixedPoint1;
    }

    get fixedPoint2() {
        return this._fixedPoint2;
    }

    get ratio() {
        return this._ratio;
    }

    get minLength() {
        return this._minLength;
    }

    get maxLength() {
        return this._maxLength;
    }

    write(cb) {
        super.write(cb);

        cb.write(this._point1, BUFFER_WRITE_VEC32, false);
        cb.write(this._point2, BUFFER_WRITE_VEC32, false);
        cb.write(this._fixedPoint1, BUFFER_WRITE_VEC32, false);
        cb.write(this._fixedPoint2, BUFFER_WRITE_VEC32, false);
        cb.write(this._ratio, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._minLength, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxLength, BUFFER_WRITE_FLOAT32, false);
    }
}

function copyArr(src, dst) {
    for (let i = 0; i < src.length; ++i) {
        dst[i] = src[i];
    }
}

function copySettings(Constructor, src) {
    const settings = [];
    for (let i = 0; i < 6; ++i) {
        settings.push(new Constructor(src[i]));
    }
    return settings;
}

class SixDOFConstraint extends Constraint {
    _type = CONSTRAINT_TYPE_SIX_DOF;

    _axisX1 = pc.Vec3.RIGHT;

    _axisX2 = pc.Vec3.RIGHT;

    _axisY1 = pc.Vec3.UP;

    _axisY2 = pc.Vec3.UP;

    _fixedAxes = null;

    _freeAxes = null;

    _limitedAxes = null;

    _limitMax = null;

    _limitMin = null;

    _maxFriction = null;

    _swingType = CONSTRAINT_SWING_TYPE_CONE;

    _limitsSpringSettings = null;

    _motorSettings = null;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        opts.axisX1 && (this._axisX1 = opts.axisX1);
        opts.axisX2 && (this._axisX2 = opts.axisX2);
        opts.axisY1 && (this._axisY1 = opts.axisY1);
        opts.axisY2 && (this._axisY2 = opts.axisY2);

        this._swingType = opts.swingType ?? this._swingType;

        if (opts.fixedAxes) {
            this._fixedAxes = [];
            copyArr(opts.fixedAxes, this._fixedAxes);
        } else if (opts.freeAxes) {
            this._freeAxes = [];
            copyArr(opts.freeAxes, this._freeAxes);
        } else if (opts.limitedAxes) {
            this._limitedAxes = [];
            copyArr(opts.limitedAxes, this._limitedAxes);
        }

        if (opts.limitMin) {
            this._limitMin = [];
            copyArr(opts.limitMin, this._limitMin);
        }

        if (opts.limitMax) {
            this._limitMax = [];
            copyArr(opts.limitMax, this._limitMax);
        }

        if (opts.maxFriction) {
            this._maxFriction = [];
            copyArr(opts.maxFriction, this._maxFriction);
        }

        if (opts.limitsSpringSettings) {
            this._limitsSpringSettings = copySettings(SpringSettings, opts.limitsSpringSettings);
        }

        if (opts.motorSettings) {
            this._motorSettings = copySettings(MotorSettings, opts.motorSettings);
        }
    }

    get axisX1() {
        return this._axisX1;
    }

    get axisX2() {
        return this._axisX2;
    }

    get axisY1() {
        return this._axisY1;
    }

    get axisY2() {
        return this._axisY2;
    }

    setTranslationLimits(min, max) {
        if (DEBUG) {
            let ok = Debug$1.checkVec(min, 'Invalid min vector for constraint limits', min);
            ok = ok && Debug$1.checkVec(max, 'Invalid max vector for constraint limits', min);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_LIMITS, this._index,
            min, BUFFER_WRITE_VEC32, false,
            max, BUFFER_WRITE_VEC32, false
        );
    }

    setRotationLimits(min, max) {
        if (DEBUG) {
            let ok = Debug$1.checkVec(min, 'Invalid min vector for constraint limits', min);
            ok = ok && Debug$1.checkVec(max, 'Invalid max vector for constraint limits', min);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_R_LIMITS, this._index,
            min, BUFFER_WRITE_VEC32, false,
            max, BUFFER_WRITE_VEC32, false
        );
    }

    setLimitsSpringSettings(axis, settings) {
        if (DEBUG) {
            let ok = Debug$1.checkUint(axis, `Invalid axis uint scalar: ${ axis }`);
            ok = ok && Debug$1.checkSpringSettings(settings);
            if (!ok) {
                return;
            }
        }

        const mode = settings.springMode ?? SPRING_MODE_FREQUENCY;
        const freqOrStiff = mode === SPRING_MODE_FREQUENCY ?
            settings.frequency : settings.stiffness;

        // TODO
        // needs update after we get rid of flags
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_SPRING_S, this._index,
            true, BUFFER_WRITE_BOOL, false,
            settings.springMode, BUFFER_WRITE_UINT8, true,
            freqOrStiff, BUFFER_WRITE_FLOAT32, true,
            settings.damping, BUFFER_WRITE_FLOAT32, true,
            axis, BUFFER_WRITE_UINT8, false
        );
    }

    setMaxFriction(axis, friction) {
        if (DEBUG) {
            let ok = Debug$1.checkUint(axis, `Invalid axis uint scalar: ${ axis }`);
            ok = ok && Debug$1.checkFloat(friction, `Invalid max friction scalar value: ${ friction }`);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_M_F, this._index,
            axis, BUFFER_WRITE_UINT8, false,
            friction, BUFFER_WRITE_FLOAT32, false
        );
    }

    setMotorState(axis, state) {
        if (DEBUG) {
            let ok = Debug$1.checkUint(axis, `Invalid axis uint scalar: ${ axis }`);
            ok = ok && Debug$1.checkUint(state, `Invalid motor state scalar for constraint:`, state);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_M_STATE, this._index,
            axis, BUFFER_WRITE_UINT8, false,
            state, BUFFER_WRITE_UINT8, false
        );
    }

    setTargetVelocityCS(velocity) {
        if (DEBUG) {
            const ok = Debug$1.checkVec(velocity, 'Invalid velocity vector:', velocity);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_VEL_CS, this._index,
            velocity, BUFFER_WRITE_VEC32, false
        );
    }

    setTargetAngularVelocityCS(velocity) {
        if (DEBUG) {
            const ok = Debug$1.checkVec(velocity, 'Invalid velocity vector:', velocity);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_ANG_VEL_CS, this._index,
            velocity, BUFFER_WRITE_VEC32, false
        );
    }

    setTargetPositionCS(position) {
        if (DEBUG) {
            const ok = Debug$1.checkVec(position, 'Invalid position vector:', position);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_POS_CS, this._index,
            position, BUFFER_WRITE_VEC32, false
        );
    }

    setTargetOrientationCS(rotation) {
        if (DEBUG) {
            const ok = Debug$1.checkQuat(rotation, 'Invalid rotation quaternion:', rotation);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_ROT_CS, this._index,
            rotation, BUFFER_WRITE_VEC32, false
        );
    }

    setTargetOrientationBS(rotation) {
        if (DEBUG) {
            const ok = Debug$1.checkQuat(rotation, 'Invalid rotation quaternion:', rotation);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_ROT_BS, this._index,
            rotation, BUFFER_WRITE_VEC32, false
        );
    }

    write(cb) {
        super.write(cb);

        const maxFriction = this._maxFriction;
        const limitMin = this._limitMin;
        const limitMax = this._limitMax;

        Constraint.writeAxes(cb, this._freeAxes);
        Constraint.writeAxes(cb, this._fixedAxes);
        Constraint.writeAxes(cb, this._limitedAxes, true);

        cb.write(this._point1, BUFFER_WRITE_VEC32, false);
        cb.write(this._axisX1, BUFFER_WRITE_VEC32, false);
        cb.write(this._axisY1, BUFFER_WRITE_VEC32, false);
        cb.write(this._point2, BUFFER_WRITE_VEC32, false);
        cb.write(this._axisX2, BUFFER_WRITE_VEC32, false);
        cb.write(this._axisY2, BUFFER_WRITE_VEC32, false);

        cb.write(!!maxFriction, BUFFER_WRITE_BOOL, false);
        if (maxFriction) {
            for (let i = 0; i < 6; i++) {
                cb.write(maxFriction[i], BUFFER_WRITE_FLOAT32, false);
            }
        }

        cb.write(!!limitMin, BUFFER_WRITE_BOOL, false);
        if (limitMin) {
            for (let i = 0; i < 6; i++) {
                cb.write(limitMin[i], BUFFER_WRITE_FLOAT32, false);
            }
        }

        cb.write(!!limitMax, BUFFER_WRITE_BOOL, false);
        if (limitMax) {
            for (let i = 0; i < 6; i++) {
                cb.write(limitMax[i], BUFFER_WRITE_FLOAT32, false);
            }
        }

        const limitsSpringSettings = this._limitsSpringSettings;
        const motorSettings = this._motorSettings;

        cb.write(!!limitsSpringSettings, BUFFER_WRITE_BOOL, false);
        if (!!limitsSpringSettings) {
            for (let i = 0; i < 6; ++i) {
                Constraint.writeSpringSettings(cb, limitsSpringSettings[i]);
            }
        }

        cb.write(!!motorSettings, BUFFER_WRITE_BOOL, false);
        if (!!motorSettings) {
            for (let i = 0; i < 6; ++i) {
                Constraint.writeMotorSettings(cb, motorSettings[i]);
            }
        }
    }
}

class SliderConstraint extends Constraint {
    _type = CONSTRAINT_TYPE_SLIDER;

    _sliderAxis1 = pc.Vec3.RIGHT;

    _sliderAxis2 = pc.Vec3.RIGHT;

    _normalAxis1 = pc.Vec3.UP;

    _normalAxis2 = pc.Vec3.UP;

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
        if (DEBUG) {
            const ok = Debug$1.checkSpringSettings(settings);
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
        if (DEBUG) {
            const ok = Debug$1.checkFloat(force, `Invalid max friction force scalar value: ${ force }`);
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
        if (DEBUG) {
            const ok = Debug$1.checkUint(state, `Invalid motor state scalar for constraint:`, state);
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
        if (DEBUG) {
            const ok = Debug$1.checkFloat(velocity, `Invalid target velocity scalar for constraint:`, velocity);
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
        if (DEBUG) {
            const ok = Debug$1.checkFloat(pos, `Invalid target position scalar for constraint:`, pos);
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
        if (DEBUG) {
            let ok = Debug$1.checkFloat(min, `Invalid min limit for constraint: ${ min }`);
            ok = ok && Debug$1.checkFloat(max, `Invalid max limit for constraint: ${ max }`);
            ok = ok && Debug$1.assert(min <= max, `Invalid min/max range: [${ min } : ${ max }]`);
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

class SwingTwistConstraint extends Constraint {

    _type = CONSTRAINT_TYPE_SWING_TWIST;
    
    _twistAxis1 = pc.Vec3.RIGHT;

    _twistAxis2 = pc.Vec3.RIGHT;

    _planeAxis1 = pc.Vec3.UP;
    
    _planeAxis2 = pc.Vec3.UP;

    _normalHalfConeAngle = 0;

    _planeHalfConeAngle = 0;

    _twistMinAngle = 0;

    _twistMaxAngle = 0;

    _maxFrictionTorque = 0;

    _swingMotorSettings = null;

    _twistMotorSettings = null;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        this._twistAxis1 = opts.twistAxis1 || this._twistAxis1;
        this._twistAxis2 = opts.twistAxis2 || this._twistAxis2;
        this._planeAxis1 = opts.planeAxis1 || this._planeAxis1;
        this._planeAxis2 = opts.planeAxis2 || this._planeAxis2;
        this._normalHalfConeAngle = opts.normalHalfConeAngle ?? this._normalHalfConeAngle;

        if (opts.swingMotorSettings) {
            this._swingMotorSettings = new MotorSettings(opts.swingMotorSettings);
        }

        if (opts.twistMotorSettings) {
            this._twistMotorSettings = new MotorSettings(opts.twistMotorSettings);
        }
    }

    get maxFrictionTorque() {
        return this._maxFrictionTorque;
    }

    set maxFrictionTorque(torque) {
        if (DEBUG) {
            const ok = Debug$1.checkFloat(torque, `Invalid max friction torque scalar: ${ angle }`);
            if (!ok) {
                return;
            }
        }

        if (this._maxFrictionTorque === torque) {
            return;
        }

        this._maxFrictionTorque = torque;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_M_F_TORQUE, this._index,
            torque, BUFFER_WRITE_FLOAT32, false
        );
    }

    get normalHalfConeAngle() {
        return this._normalHalfConeAngle;
    }

    get swingMotorSettings() {
        return this._swingMotorSettings;
    }

    get normalHalfConeAngle() {
        return this._normalHalfConeAngle;
    }

    set normalHalfConeAngle(angle) {
        if (DEBUG) {
            const ok = Debug$1.checkFloat(angle, `Invalid half cone angle scalar: ${ angle }`);
            if (!ok) {
                return;
            }
        }
        
        if (this._normalHalfConeAngle === angle) {
            return;
        }

        this._normalHalfConeAngle = angle;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_N_H_C_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }

    get planeHalfConeAngle() {
        return this._planeHalfConeAngle;
    }

    set planeHalfConeAngle(angle) {
        if (DEBUG) {
            const ok = Debug$1.checkFloat(angle, `Invalid plane half cone angle scalar: ${ angle }`);
            if (!ok) {
                return;
            }
        }

        if (this._planeHalfConeAngle === angle) {
            return;
        }

        this._planeHalfConeAngle = angle;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_P_H_C_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }

    get twistAxis1() {
        return this._twistAxis1;
    }

    get twistAxis2() {
        return this._twistAxis2;
    }

    get twistMaxAngle() {
        return this._twistMaxAngle;
    }

    set twistMaxAngle(angle) {
        if (DEBUG) {
            const ok = Debug$1.checkFloat(angle, `Invalid twist max angle scalar: ${ angle }`);
            if (!ok) {
                return;
            }
        }
        
        if (this._twistMaxAngle === angle) {
            return;
        }

        this._twistMaxAngle = angle;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_T_MAX_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }

    get twistMinAngle() {
        return this._twistMinAngle;
    }

    set twistMinAngle(angle) {
        if (DEBUG) {
            const ok = Debug$1.checkFloat(angle, `Invalid twist min angle scalar: ${ angle }`);
            if (!ok) {
                return;
            }
        }

        if (this._twistMinAngle === angle) {
            return;
        }

        this._twistMinAngle = angle;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_T_MIN_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }

    get twistMotorSettings() {
        return this._twistMotorSettings;
    }

    setTargetOrientationCS(rotation) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_T_O_CS, this._index,
            rotation, BUFFER_WRITE_VEC32, false
        );
    }

    setTargetOrientationBS(rotation) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_T_O_BS, this._index,
            rotation, BUFFER_WRITE_VEC32, false
        );
    }

    setTargetAngularVelocityCS(velocity) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_T_ANG_VEL_CS, this._index,
            velocity, BUFFER_WRITE_VEC32, false
        );
    }

    setSwingMotorState(state) {
        if (DEBUG) {
            const ok = Debug$1.checkUint(state, `Invalid motor state scalar: ${ state }`);
            if (!ok) {
                return;
            }
        }
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_SWING_M_S, this._index,
            torque, BUFFER_WRITE_FLOAT32, false
        );
    }

    setTwistMotorState(state) {
        if (DEBUG) {
            const ok = Debug$1.checkUint(state, `Invalid motor state scalar: ${ state }`);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_TWIST_M_S, this._index,
            torque, BUFFER_WRITE_FLOAT32, false
        );
    }

    write(cb) {
        super.write(cb);

        cb.write(this._point1, BUFFER_WRITE_VEC32);
        cb.write(this._twistAxis1, BUFFER_WRITE_VEC32);
        cb.write(this._planeAxis1, BUFFER_WRITE_VEC32);
        cb.write(this._point2, BUFFER_WRITE_VEC32);
        cb.write(this._twistAxis2, BUFFER_WRITE_VEC32);
        cb.write(this._planeAxis2, BUFFER_WRITE_VEC32);
        cb.write(this._normalHalfConeAngle, BUFFER_WRITE_FLOAT32);
        cb.write(this._planeHalfConeAngle, BUFFER_WRITE_FLOAT32);
        cb.write(this._twistMinAngle, BUFFER_WRITE_FLOAT32);
        cb.write(this._twistMaxAngle, BUFFER_WRITE_FLOAT32);
        cb.write(this._maxFrictionTorque, BUFFER_WRITE_FLOAT32);

        Constraint.writeMotorSettings(cb, this._swingMotorSettings);
        Constraint.writeMotorSettings(cb, this._twistMotorSettings);
    }
}

class ConstraintComponent extends Component {

    _list = new Set();

    constructor(system, entity) {
        super(system, entity);
    }

    addJoint(type, otherEntity, opts = {}) {
        let JointConstructor;
        switch (type) {
            case CONSTRAINT_TYPE_SWING_TWIST:
                JointConstructor = SwingTwistConstraint;
                break;
            case CONSTRAINT_TYPE_FIXED:
                JointConstructor = FixedConstraint;
                break;
            case CONSTRAINT_TYPE_POINT:
                JointConstructor = PointConstraint;
                break;
            case CONSTRAINT_TYPE_DISTANCE:
                JointConstructor = DistanceConstraint;
                break;
            case CONSTRAINT_TYPE_HINGE:
                JointConstructor = HingeConstraint;
                break;
            case CONSTRAINT_TYPE_SLIDER:
                JointConstructor = SliderConstraint;
                break;
            case CONSTRAINT_TYPE_CONE:
                JointConstructor = ConeConstraint;
                break;
            case CONSTRAINT_TYPE_SIX_DOF:
                JointConstructor = SixDOFConstraint;
                break;
            case CONSTRAINT_TYPE_PULLEY:
                JointConstructor = PulleyConstraint;
                break;
            default:
                DEBUG && Debug$1.warn(`Trying to add unrecognized constraint type: ${ type }`);
                return;
        }

        const joint = new JointConstructor(this.entity, otherEntity, opts);
        
        if (!otherEntity.constraint) {
            otherEntity.addComponent('constraint');
        }

        const index = this.system.constraintMap.add(joint);
        joint.index = index;
        
        this._list.add(index);
        otherEntity.constraint.list.add(index);

        this.system.createConstraint(index, joint);

        return joint;
    }   

    onDisable() {
        this._list;
        const system = this.system;

        this._list.forEach(idx => {
            system.destroyConstraint(idx);
        });
    }
}

const schema$2 = [ 'list' ];

class ConstraintComponentSystem extends ComponentSystem {
    _constraintMap = new IndexedCache();

    constructor(app, manager, id) {
        super(app, manager);

        this._schema = [...this._schema, ...schema$2];

        manager.systems.set(id, this);
    }

    get id() {
        return 'constraint';
    }

    get ComponentType() {
        return ConstraintComponent;
    }

    get constraintMap() {
        return this._constraintMap;
    }

    onMessage(msg) {}

    createConstraint(index, joint) {
        const cb = this.manager.commandsBuffer;

        // entity1.body.constraints.set(index, entity2);
        // entity2.body.constraints.set(index, entity1);

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_CONSTRAINT);

        joint.write(cb);

        // switch (type) {
        //     case CONSTRAINT_TYPE_FIXED:
        //         JoltManager.writeFixedConstraint(cb, opts);
        //         break;

        //     case CONSTRAINT_TYPE_POINT:
        //         JoltManager.writePointConstraint(cb, opts);
        //         break;

        //     case CONSTRAINT_TYPE_DISTANCE:
        //         JoltManager.writeDistanceConstraint(cb, opts);
        //         break;

        //     case CONSTRAINT_TYPE_HINGE:
        //         JoltManager.writeHingeConstraint(cb, opts);
        //         break;

        //     case CONSTRAINT_TYPE_SLIDER:
        //         JoltManager.writeSliderConstraint(cb, opts);
        //         break;

        //     case CONSTRAINT_TYPE_CONE:
        //         JoltManager.writeConeConstraint(cb, opts);
        //         break;

        //     case CONSTRAINT_TYPE_SWING_TWIST:
        //         JoltManager.writeSwingTwistConstraint(cb, opts);
        //         break;

        //     case CONSTRAINT_TYPE_SIX_DOF:
        //         JoltManager.writeSixDofConstraint(cb, opts);
        //         break;

        //     case CONSTRAINT_TYPE_PULLEY:
        //         JoltManager.writePulleyConstraint(cb, opts);
        //         break;

        //     default:
        //         DEBUG && Debug.error(`Unrecognized constraint type: ${ type }`);
        //         return;
        // }

        // cb.write(opts.numVelocityStepsOverride, BUFFER_WRITE_UINT8);
        // cb.write(opts.numPositionStepsOverride, BUFFER_WRITE_UINT8);
        // cb.write(opts.space, BUFFER_WRITE_UINT8);

        return index;
    }

    destroyConstraint(index) {
        const cb = this.manager.commandsBuffer;
        const map = this._constraintMap;
        const constraint = map.get(index);

        constraint.entity1.constraint.list.delete(index);
        constraint.entity2.constraint.list.delete(index);

        map.free(index);

        cb.writeOperator(OPERATOR_CLEANER);
        cb.writeCommand(CMD_DESTROY_CONSTRAINT);
        cb.write(index, BUFFER_WRITE_UINT32, false);
    }
}

class SoftBodyComponent extends BodyComponent {
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

        cb.write(this._index, BUFFER_WRITE_UINT32, false);

        // We always use world position and rotation from the current entity the component
        // is attached to (instead of default zero vectors)
        const entity = this.entity;
        const pos = entity.getPosition();
        const rot = entity.getRotation();

        // TODO
        // get rid of flags

        // Loss of precision for pos/rot (64 -> 32)
        cb.write(pos, BUFFER_WRITE_VEC32, false);
        cb.write(rot, BUFFER_WRITE_VEC32, false);

        cb.write(this._collisionGroup, BUFFER_WRITE_UINT32);
        cb.write(this._subGroup, BUFFER_WRITE_UINT32);

        cb.write(this._objectLayer, BUFFER_WRITE_UINT16, false);
        cb.write(this._numIterations, BUFFER_WRITE_UINT32, false);
        cb.write(this._linearDamping, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxLinearVelocity, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._restitution, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._friction, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._pressure, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._gravityFactor, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._updatePosition, BUFFER_WRITE_BOOL, false);
        cb.write(this._makeRotationIdentity, BUFFER_WRITE_BOOL, false);
        cb.write(this._allowSleeping, BUFFER_WRITE_BOOL, false);

        DEBUG && cb.write(this._debugDraw, BUFFER_WRITE_BOOL, false);
    }

    onEnable() {
        if (DEBUG) {
            if (!this._renderAsset && !this._meshes) {
                Debug$1.warn('Unable to locate mesh data for a soft body', this);
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

        cb.write(useEntityScale, BUFFER_WRITE_BOOL, false);
        if (useEntityScale) {
            // Potential precision loss 64 -> 32
            cb.write(scale, BUFFER_WRITE_VEC32, false);
        }
    
        ShapeComponent.addMeshes(this._meshes, cb);

        cb.write(this._width, BUFFER_WRITE_UINT32, false);
        cb.write(this._length, BUFFER_WRITE_UINT32, false);
        cb.write(this._compliance, BUFFER_WRITE_FLOAT32, false);

        const fixed = this._fixedIndices;
        const count = fixed.length;

        cb.write(count, BUFFER_WRITE_UINT32, false);
        for (let i = 0; i < count; i++) {
            cb.write(fixed[i], BUFFER_WRITE_UINT32, false);
        }
    }

}

const schema$1 = [
    // Component
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
const quat = new pc.Quat();
const positions = [];
const indices = [];

class SoftBodyComponentSystem extends BodyComponentSystem {

    constructor(app, manager, id) {
        super(app, manager);

        this._schema = [ ...this._schema, ...schema$1 ];

        manager.systems.set(id, this);
    }

    get id() {
        return 'softbody';
    }
    
    get ComponentType() {
        return SoftBodyComponent;
    }

    createBody(component) {
        const cb = this._manager.commandsBuffer;

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_SOFT_BODY);

        component.writeComponentData(cb);
    }

    processCommands(cb) {
        const command = cb.readCommand();

        switch (command) {
            case CMD_REPORT_TRANSFORMS:
                this._updateVertices(cb);
            break;
        }
    }

    _updateVertices(cb) {
        const index = cb.read(BUFFER_READ_UINT32);
        const count = cb.read(BUFFER_READ_UINT32);

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
                cb.read(BUFFER_READ_FLOAT32) / sx,
                cb.read(BUFFER_READ_FLOAT32) / sy,
                cb.read(BUFFER_READ_FLOAT32) / sz
            );

            quat.transformVector(vec, vec);

            positions.push(vec.x, vec.y, vec.z);
        }

        mesh.setNormals(pc.calculateNormals(positions, indices));
        mesh.setPositions(positions);
        mesh.update();
    }
}

class VehicleComponent extends BodyComponent {
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
    _type = VEHICLE_TYPE_WHEEL;

    // Max amount of torque (Nm) that the engine can deliver.
    _maxTorque = 500;
    
    // Min amount of revolutions per minute (rpm) the engine can produce without stalling.
    _minRPM = 1000;

    // Max amount of revolutions per minute (rpm) the engine can generate.
    _maxRPM = 6000;

    // Moment of inertia (kg m^2) of the engine.
    _inertia = 0.5;

    // Angular damping factor of the wheel: dw/dt = -c * w.
    _wheelAngularDamping = 0.2;

    // Curve that describes a ratio of the max torque the engine can produce vs the fraction of the max RPM of the engine.
    _normalizedTorque = new pc.Curve([0, 0.8]);

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
    _castType = VEHICLE_CAST_TYPE_RAY;

    // Object layer to test collision with.
    _castObjectLayer = OBJ_LAYER_MOVING;

    // World space up vector, used to avoid colliding with vertical walls.
    _castUp = pc.Vec3.UP;

    // Max angle (rad) that is considered for colliding wheels. This is to avoid colliding
    // with vertical walls. Defaults to ~1.4 rad (80 degrees).
    _castMaxSlopeAngle = 1.3962634015954636;

    // Sets the radius of the sphere used in cast.
    _castRadius = 0.3;

    // Fraction of half the wheel width (or wheel radius if it is smaller) that is used as the convex radius
    _castFraction = 0.1;

    // Bike Lean:

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
        cb.write(this._index, BUFFER_WRITE_UINT32, false);
        cb.write(type, BUFFER_WRITE_UINT8, false);
        cb.write(this._numVelocityStepsOverride, BUFFER_WRITE_UINT16, false);
        cb.write(this._numVelocityStepsOverride, BUFFER_WRITE_UINT16, false);
        cb.write(this._up, BUFFER_WRITE_VEC32, false);
        cb.write(this._forward, BUFFER_WRITE_VEC32, false);
        cb.write(this._maxPitchRollAngle, BUFFER_WRITE_FLOAT32, false);

        // engine data
        cb.write(this._maxTorque, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._minRPM, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxRPM, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._inertia, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._wheelAngularDamping, BUFFER_WRITE_FLOAT32, false);
        VehicleComponent.writeCurvePoints(cb, this._normalizedTorque);

        // transmission data
        cb.write(this._mode, BUFFER_WRITE_UINT8, false);
        cb.write(this._switchTime, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._clutchReleaseTime, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._switchLatency, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._shiftUpRPM, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._shiftDownRPM, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._clutchStrength, BUFFER_WRITE_FLOAT32, false);
        VehicleComponent.writeGears(cb, this._gearRatios);
        VehicleComponent.writeGears(cb, this._reverseGearRatios);

        // wheels data
        const isWheeled = type === VEHICLE_TYPE_WHEEL || type === VEHICLE_TYPE_MOTORCYCLE;
        if (isWheeled) {
            this._writeWheelsData(cb);
        } else {
            this._writeTracksData(cb);
        }

        if (isWheeled) {
            // differentials
            this._writeDifferentials(cb);
            cb.write(this._differentialLimitedSlipRatio, BUFFER_WRITE_FLOAT32, false);

            if (type === VEHICLE_TYPE_MOTORCYCLE) {
                cb.write(this._maxLeanAngle, BUFFER_WRITE_FLOAT32, false);
                cb.write(this._leanSpringConstant, BUFFER_WRITE_FLOAT32, false);
                cb.write(this._leanSpringDamping, BUFFER_WRITE_FLOAT32, false);
                cb.write(this._leanSpringIntegrationCoefficient, BUFFER_WRITE_FLOAT32, false);
                cb.write(this._leanSpringIntegrationCoefficientDecay, BUFFER_WRITE_FLOAT32, false);
                cb.write(this._leanSmoothingFactor, BUFFER_WRITE_FLOAT32, false);
            }
        }

        this._writeAntiRollBars(cb);

        // cast type
        const castType = this._castType;
        cb.write(castType, BUFFER_WRITE_UINT8, false);
        cb.write(this._castObjectLayer, BUFFER_WRITE_UINT32, false);
        switch (castType) {
            case VEHICLE_CAST_TYPE_RAY:
                cb.write(this._castUp, BUFFER_WRITE_VEC32, false);
                cb.write(this._castMaxSlopeAngle, BUFFER_WRITE_FLOAT32, false);
                break;
            case VEHICLE_CAST_TYPE_SPHERE:
                cb.write(this._castUp, BUFFER_WRITE_VEC32, false);
                cb.write(this._castMaxSlopeAngle, BUFFER_WRITE_FLOAT32, false);
                cb.write(this._castRadius, BUFFER_WRITE_FLOAT32, false);
                break;
            case VEHICLE_CAST_TYPE_CYLINDER:
                cb.write(this._castFraction, BUFFER_WRITE_FLOAT32, false);
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
        if (DEBUG) {
            let ok = Debug$1.checkRange(input0, -1, 1, `Invalid driver input for forward (input0). Expected a number in [-1:1] range. Received: ${ input0 }`);
            if (this._type === VEHICLE_TYPE_WHEEL || this._type === VEHICLE_TYPE_MOTORCYCLE) {
                ok = ok && Debug$1.checkRange(input1, -1, 1, `Invalid driver input for right (input1). Expected a number in [-1:1] range. Received: ${ input1 }`);
                ok = ok && Debug$1.checkRange(input2, 0, 1, `Invalid driver input for brake (input2). Expected a number in [0:1] range. Received: ${ input2 }`);
                ok = ok && Debug$1.checkRange(input3, 0, 1, `Invalid driver input for hand brake (input3). Expected a number in [0:1] range. Received: ${ input3 }`);
            } else {
                ok = ok && Debug$1.checkRange(input1, -1, 1, `Invalid driver input for left ratio (input1). Expected a number in [-1:1] range. Received: ${ input1 }`);
                ok = ok && Debug$1.checkRange(input2, -1, 1, `Invalid driver input for right ratio (input2). Expected a number in [-1:1] range. Received: ${ input2 }`);
                ok = ok && Debug$1.checkRange(input3, 0, 1, `Invalid driver input for brake (input3). Expected a number in [0:1] range. Received: ${ input3 }`);
            }
            if (!ok)
                return;
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_DRIVER_INPUT, this._index,
            input0, BUFFER_WRITE_FLOAT32, false,
            input1, BUFFER_WRITE_FLOAT32, false,
            input2, BUFFER_WRITE_FLOAT32, false,
            input3, BUFFER_WRITE_FLOAT32, false
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

        if (DEBUG && count === 0) {
            Debug$1.warn('Invalid tracks data. Need at least one track.', tracks);
            return;
        }

        this._writeWheelsData(cb);

        cb.write(count, BUFFER_WRITE_UINT32, false);
        
        for (let t = 0; t < count; t++) {
            const track = tracks[t];
            const wheelsCount = track.length;

            cb.write(wheelsCount, BUFFER_WRITE_UINT32, false);

            for (let i = 0; i < wheelsCount; i++) {
                cb.write(track[i], BUFFER_WRITE_UINT32, false);
            }
        }
    }

    _writeWheelsData(cb) {
        const wheels = this._wheels;
        const count = wheels.length;

        // TODO
        // consider making wheel as its own component

        cb.write(count, BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < count; i++) {
            const desc = wheels[i];

            if (DEBUG) {
                let ok = Debug$1.assert(desc.position, 
                    'A wheel description requires an attachment position of wheel' +
                    'suspension in local space of the vehicle', desc);
                const spring = desc.spring;
                if (spring) {
                    const { stiffness, frequency } = spring;
                    if (stiffness != null) {
                        Debug$1.assert(stiffness !== 0, 'Wheel spring stiffness cannot be zero', spring);
                    }
                    if (frequency != null) {
                        Debug$1.assert(frequency !== 0, 'Wheel spring frequency cannot be zero', spring);
                    }
                }
                if (!ok)
                    return;
            }

            // Read-only. Velocity difference between ground and wheel relative to ground velocity.
            desc.longitudinalSlip = 0;
            // Read-only. Angular difference (in radians) between ground and wheel relative to ground velocity.
            desc.lateralSlip = 0;
            // Read-only. Combined friction coefficient in longitudinal direction (combines terrain and tires)
            desc.combinedLongitudinalFriction = 0;
            // Read-only. Combined friction coefficient in lateral direction (combines terrain and tires)
            desc.combinedLateralFriction = 0;
            // Ready-only. Amount of impulse that the brakes can apply to the floor (excluding friction)
            desc.brakeImpulse = 0;

            // Attachment point of wheel suspension in local space of the body.
            cb.write(desc.position, BUFFER_WRITE_VEC32, false);

            // Where tire forces (suspension and traction) are applied, in local space of the body. 
            // A good default is the center of the wheel in its neutral pose. See enableSuspensionForcePoint.
            cb.write(desc.suspensionForcePoint || pc.Vec3.ZERO, BUFFER_WRITE_VEC32, false);

            // Direction of the suspension in local space of the body, should point down.
            cb.write(desc.suspensionDirection || pc.Vec3.DOWN, BUFFER_WRITE_VEC32, false);

            // Direction of the steering axis in local space of the body, should point up (e.g. for a 
            // bike would be -suspensionDirection)
            cb.write(desc.steeringAxis || pc.Vec3.UP, BUFFER_WRITE_VEC32, false);

            // Up direction when the wheel is in the neutral steering position (usually 
            // component.up but can be used to give the wheel camber or for a bike would be -suspensionDirection)
            cb.write(desc.wheelUp || pc.Vec3.UP, BUFFER_WRITE_VEC32, false);

            // Forward direction when the wheel is in the neutral steering position (usually 
            // component.forward but can be used to give the wheel toe, does not need to be perpendicular
            // to wheelUp)
            cb.write(desc.wheelForward || pc.Vec3.BACK, BUFFER_WRITE_VEC32, false);

            // How long the suspension is in max raised position relative to the attachment point (m)
            cb.write(desc.suspensionMinLength ?? 0.3, BUFFER_WRITE_FLOAT32, false);

            // How long the suspension is in max droop position relative to the attachment point (m)
            cb.write(desc.suspensionMaxLength ?? 0.5, BUFFER_WRITE_FLOAT32, false);

            // The natural length (m) of the suspension spring is defined as suspensionMaxLength + 
            // suspensionPreloadLength. Can be used to preload the suspension as the spring is compressed
            // by suspensionPreloadLength when the suspension is in max droop position. Note that this means
            // when the vehicle touches the ground there is a discontinuity so it will also make the vehicle
            // more bouncy as we're updating with discrete time steps.
            cb.write(desc.suspensionPreloadLength ?? 0, BUFFER_WRITE_FLOAT32, false);

            // Radius of the wheel (m)
            cb.write(desc.radius ?? 0.3, BUFFER_WRITE_FLOAT32, false);

            // Width of the wheel (m)
            cb.write(desc.width ?? 0.1, BUFFER_WRITE_FLOAT32, false);

            // If disabled, the forces are applied at the collision contact point. This leads to a more
            // accurate simulation when interacting with dynamic objects but makes the vehicle less stable.
            // When setting this to true, all forces will be applied to a fixed point on the vehicle body.
            cb.write(desc.enableSuspensionForcePoint ?? false, BUFFER_WRITE_BOOL, false);

            // wheel spring data
            const spring = desc.spring || {};
            cb.write(spring.mode ?? pc.JOLT_SPRING_MODE_FREQUENCY, BUFFER_WRITE_UINT8, false);
            cb.write(spring.frequency ?? 1.5, BUFFER_WRITE_FLOAT32, false);
            cb.write(spring.stiffness ?? 1.5, BUFFER_WRITE_FLOAT32, false);
            cb.write(spring.damping ?? 0.5, BUFFER_WRITE_FLOAT32, false);

            // Friction in forward direction of tire as a function of the slip ratio (fraction):
            // (omega_wheel * r_wheel - v_longitudinal) / |v_longitudinal|.
            // Slip ratio here is a ratio of wheel spinning relative to the floor. At 0 the wheel has full
            // traction and is rolling perfectly in sync with the ground. At 1 the wheel is locked and
            // is sliding over the ground.
            // Default curve keys: [[0, 0], [0.06, 1.2], [0.2, 1]]
            VehicleComponent.writeCurvePoints(cb, desc.longitudinalFrictionCurve);

            // Friction in sideway direction of tire as a function of the slip angle (degrees):
            // angle between relative contact velocity and vehicle direction.
            // If tire forward matches the vehicle direction, then the angle is 0 degrees. If the 
            // vehicle is sliding sideways, e.g. on ice, then the angle is 90 degrees. Example curve keys could
            // be: [[0, 1], [90, 0.3]] - full friction at zero degrees, and 0.3 friction at 90.
            // Default curve keys: [[0, 0], [3, 1.2], [20, 1]]
            VehicleComponent.writeCurvePoints(cb, desc.lateralFrictionCurve);

            const type = this._type;
            if (type === VEHICLE_TYPE_WHEEL || type === VEHICLE_TYPE_MOTORCYCLE) {

                // Moment of inertia (kg m^2), for a cylinder this would be 0.5 * M * R^2 which is 
                // 0.9 for a wheel with a mass of 20 kg and radius 0.3 m.
                cb.write(desc.inertia ?? 0.9, BUFFER_WRITE_FLOAT32, false);

                // Angular damping factor of the wheel: dw/dt = -c * w.
                cb.write(desc.angularDamping ?? 0.2, BUFFER_WRITE_FLOAT32, false);

                // How much this wheel can steer (radians). Defaults to ~1.22 rad (70 degrees).
                cb.write(desc.maxSteerAngle ?? 1.2217304763960306, BUFFER_WRITE_FLOAT32, false);
                
                // How much torque (Nm) the brakes can apply to this wheel.
                cb.write(desc.maxBrakeTorque ?? 1500, BUFFER_WRITE_FLOAT32, false);

                // How much torque (Nm) the hand brake can apply to this wheel (usually only applied
                // to the rear wheels)
                cb.write(desc.maxHandBrakeTorque ?? 4000, BUFFER_WRITE_FLOAT32, false);
            }
        }
    }

    _writeDifferentials(cb) {
        const differentials = this._differentials;
        const count = differentials.length;

        if (DEBUG && count === 0) {
            Debug$1.warnOnce('Vehicle component is missing wheels differentials.' +
                'Default values will make a vehicle without wheels.');
        }

        cb.write(count, BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < count; i++) {
            const diff = differentials[i];

            // Index (in mWheels) that represents the left wheel of this 
            // differential (can be -1 to indicate no wheel)
            cb.write(diff.leftWheel ?? -1, BUFFER_WRITE_INT32, false);

            // Same as leftWheel, but for the right one.
            cb.write(diff.rightWheel ?? -1, BUFFER_WRITE_INT32, false);

            // Ratio between rotation speed of gear box and wheels.
            cb.write(diff.differentialRatio ?? 3.42, BUFFER_WRITE_FLOAT32, false);

            // Defines how the engine torque is split across the left and right 
            // wheel (0 = left, 0.5 = center, 1 = right)
            cb.write(diff.leftRightSplit ?? 0.5, BUFFER_WRITE_FLOAT32, false);

            // Ratio max / min wheel speed. When this ratio is exceeded, all
            // torque gets distributed to the slowest moving wheel. This allows
            // implementing a limited slip differential. Set to Number.MAX_VALUE
            // for an open differential. Value should be > 1.
            cb.write(diff.limitedSlipRatio ?? 1.4, BUFFER_WRITE_FLOAT32, false);

            // How much of the engines torque is applied to this differential
            // (0 = none, 1 = full), make sure the sum of all differentials is 1.
            cb.write(diff.engineTorqueRatio ?? 1, BUFFER_WRITE_FLOAT32, false);
        }
    }

    _writeAntiRollBars(cb) {
        const bars = this._antiRollBars;
        const count = bars.length;

        cb.write(count, BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < count; i++) {
            const bar = bars[i];

            // Index (in wheels) that represents the left wheel of this anti-rollbar.
            cb.write(bar.leftWheel ?? 0, BUFFER_WRITE_UINT32, false);

            // Index (in wheels) that represents the right wheel of this anti-rollbar.
            cb.write(bar.rightWheel ?? 1, BUFFER_WRITE_UINT32, false);

            // Stiffness (spring constant in N/m) of anti rollbar, can be 0 to disable the anti-rollbar.
            cb.write(bar.stiffness ?? 1000, BUFFER_WRITE_FLOAT32, false);
        }
    }

    static writeCurvePoints(cb, curve) {
        cb.write(!!curve, BUFFER_WRITE_BOOL, false);

        if (curve) {
            const keys = curve.keys;
            const count = keys.length;

            cb.write(count, BUFFER_WRITE_UINT32, false);

            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];

                cb.write(key[0], BUFFER_WRITE_FLOAT32, false);
                cb.write(key[1], BUFFER_WRITE_FLOAT32, false);
            }
        }
    }

    static writeGears(cb, gears) {
        const count = gears.length;
        cb.write(count, BUFFER_WRITE_UINT32, false);
        for (let i = 0; i < count; i++) {
            cb.write(gears[i], BUFFER_WRITE_FLOAT32, false);
        }
    }    
}

const schema = [
    'antiRollBars',
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
    'up',
    'wheelAngularDamping',
    'wheels'
];

class VehicleComponentSystem extends BodyComponentSystem {
    constructor(app, manager, id) {
        super(app, manager);

        this._schema = [...this._schema, ...schema];

        manager.systems.set(id, this);
    }

    get id() {
        return 'vehicle';
    }

    get ComponentType() {
        return VehicleComponent;
    }

    createVehicle(component) {
        super.createBody(component);

        const cb = this._manager.commandsBuffer;

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_VEHICLE);

        component.writeVehicleData(cb);
    }
}

class JoltManager extends PhysicsManager {
    constructor(app, opts, resolve) {
        super(app, 'jolt', opts);

        // TODO
        // component systems will use Jolt constants, which
        // are not available until webworker responds with them.

        app.systems.add(new BodyComponentSystem(app, this, COMPONENT_SYSTEM_BODY));
        app.systems.add(new CharComponentSystem(app, this, COMPONENT_SYSTEM_CHAR));
        app.systems.add(new VehicleComponentSystem(app, this, COMPONENT_SYSTEM_VEHICLE));
        app.systems.add(new SoftBodyComponentSystem(app, this, COMPONENT_SYSTEM_SOFT_BODY));
        app.systems.add(new ConstraintComponentSystem(app, this, COMPONENT_SYSTEM_CONSTRAINT));

        this._queryMap = new IndexedCache();
        // this._constraintMap = new IndexedCache();
        this._shapeMap = new IndexedCache();
        this._gravity = new pc.Vec3(0, -9.81, 0);

        this._resolve = resolve;

        this._systems.set(COMPONENT_SYSTEM_MANAGER, this);
    }

    set gravity(gravity) {
        if (DEBUG) {
            const ok = Debug$1.checkVec(gravity, `Invalid gravity vector`, gravity);
            if (!ok)
                return;
        }

        if (!this._gravity.equals(gravity)) {
            this._gravity.copy(gravity);

            const cb = this._outBuffer;

            cb.writeOperator(OPERATOR_MODIFIER);
            cb.writeCommand(CMD_CHANGE_GRAVITY);
            cb.write(gravity, BUFFER_WRITE_VEC32, false);
        }
    }

    get gravity() {
        return this._gravity;
    }

    get queryMap() {
        return this._queryMap;
    }

    onMessage(msg) {
        const data = msg.data || msg;

        super.onMessage(data);

        if (data.constants) {
            this._resolve();
        }

        if (data.drawViews) {
            ShapeComponentSystem.debugDraw(this._app, data.drawViews, this._config);
        }
    }

    processCommands(cb) {
        const command = cb.readCommand();

        switch (command) {
            case CMD_CAST_RAY:
            case CMD_CAST_SHAPE:
                ResponseHandler.handleQuery(cb, this._queryMap);
                break;
        }
    }

    addUpdateCallback(func) {
        if (this._config.useWebWorker) {
            DEBUG && Debug$1.warn('Physics update callback is not supported when Web Worker is enabled.');
            return;
        }

        this._backend.updateCallback = func;
    }

    removeUpdateCallback() {
        if (this._config.useWebWorker) {
            DEBUG && Debug$1.warn('Physics update callback is not supported when Web Worker is enabled.');
            return;
        }
                
        this._backend.updateCallback = null;
    }

    createShape(type, options = {}) {
        const cb = this._outBuffer;

        // TODO 
        // expose to docs?
        const opts = {
            // defaults
            density: 1000,
            shapePosition: new pc.Vec3(),
            shapeRotation: new pc.Quat(),
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

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_SHAPE);
        cb.write(index, BUFFER_WRITE_UINT32, false);

        ShapeComponent.writeShapeData(cb, opts, true /* force write rotation */);

        return index;
    }

    destroyShape(index) {
        if (DEBUG) {
            const ok = Debug$1.checkUint(index, `Invalid shape number: ${ num }`);
            if (!ok)
                return;
        }

        const cb = this._outBuffer;

        cb.writeOperator(OPERATOR_CLEANER);
        cb.writeCommand(CMD_DESTROY_SHAPE);
        cb.write(index, BUFFER_WRITE_UINT32, false);

        this._shapeMap.free(index);
    }    

    createFilterGroups(groups) {
        const cb = this._outBuffer;
        const groupsCount = groups.length;

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_GROUPS);
        cb.write(groupsCount, BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < groupsCount; i++) {
            // sub groups count
            cb.write(groups[i], BUFFER_WRITE_UINT32, false);
        }
    }

    toggleGroupPair(group, subGroup1, subGroup2, enable) {
        if (DEBUG) {
            let ok = Debug$1.checkUint(group, `Invalid group 1: ${ group }`);
            ok = ok && Debug$1.checkUint(subGroup1, `Invalid group 1: ${ subGroup1 }`);
            ok = ok && Debug$1.checkUint(subGroup2, `Invalid group 2: ${ subGroup2 }`);
            ok = ok && Debug$1.checkBool(enable, `Invalid toggle flag: ${ enable }`);
            if (!ok)
                return;
        }

        const cb = this._outBuffer;

        cb.writeOperator(OPERATOR_MODIFIER);
        cb.writeCommand(CMD_TOGGLE_GROUP_PAIR);
        cb.write(enable, BUFFER_WRITE_BOOL, false);
        cb.write(group, BUFFER_WRITE_UINT16, false);
        cb.write(subGroup1, BUFFER_WRITE_UINT16, false);
        cb.write(subGroup2, BUFFER_WRITE_UINT16, false);
    }    

    castRay(origin, dir, callback, opts) {
        if (DEBUG) {
            let ok = Debug$1.checkVec(origin,`Invalid origin vector`);
            ok = ok && Debug$1.checkVec(dir, `Invalid direction vector`);
            ok = ok && Debug$1.assert(callback, 'castRay requires a callback function castRay(origin, dir, callback, opts)');
            if (ok && opts?.firstOnly != null) ok = Debug$1.checkBool(opts.firstOnly);
            if (ok && opts?.calculateNormal != null) ok = Debug$1.checkBool(opts.calculateNormal);
            if (ok && opts?.ignoreBackFaces != null) ok = Debug$1.checkBool(opts.ignoreBackFaces);
            if (ok && opts?.treatConvexAsSolid != null) ok = Debug$1.checkBool(opts.treatConvexAsSolid);
            if (!ok)
                return;
        }

        const cb = this._outBuffer;
        const callbackIndex = this._queryMap.add(callback);

        // TODO
        // get rid of flags

        cb.writeOperator(OPERATOR_QUERIER);
        cb.writeCommand(CMD_CAST_RAY);
        cb.write(callbackIndex, BUFFER_WRITE_UINT32, false);
        cb.write(origin, BUFFER_WRITE_VEC32, false);
        cb.write(dir, BUFFER_WRITE_VEC32, false);
        cb.write(opts?.firstOnly, BUFFER_WRITE_BOOL);
        cb.write(opts?.calculateNormal, BUFFER_WRITE_BOOL);
        cb.write(opts?.ignoreBackFaces, BUFFER_WRITE_BOOL);
        cb.write(opts?.treatConvexAsSolid, BUFFER_WRITE_BOOL);
        cb.write(opts?.bpFilterLayer, BUFFER_WRITE_UINT32);
        cb.write(opts?.objFilterLayer, BUFFER_WRITE_UINT32);
    }

    castShape(shapeIndex, pos, rot, dir, callback, opts) {
        if (DEBUG) {
            let ok = Debug$1.checkInt(shapeIndex, `Invalid shape index`);
            ok = ok && Debug$1.checkVec(pos, `Invalid cast shape position vector`);
            ok = ok && Debug$1.checkVec(dir, `Invalid cast shape direction vector`);
            ok = ok && Debug$1.checkQuat(rot, `Invalid cast shape rotation`);
            if (!ok)
                return;
        }

        const cb = this._outBuffer;
        const queryIndex = this._queryMap.add(callback);

        // TODO
        // get rid of flags

        cb.writeOperator(OPERATOR_QUERIER);
        cb.writeCommand(CMD_CAST_SHAPE);
        cb.write(queryIndex, BUFFER_WRITE_UINT32, false);
        cb.write(pos, BUFFER_WRITE_VEC32, false);
        cb.write(rot, BUFFER_WRITE_VEC32, false);
        cb.write(dir, BUFFER_WRITE_VEC32, false);
        cb.write(opts?.scale, BUFFER_WRITE_VEC32);
        cb.write(opts?.offset, BUFFER_WRITE_VEC32);
        cb.write(opts?.backFaceModeTriangles, BUFFER_WRITE_UINT8);
        cb.write(opts?.backFaceModeConvex, BUFFER_WRITE_UINT8);
        cb.write(opts?.useShrunkenShapeAndConvexRadius, BUFFER_WRITE_BOOL);
        cb.write(opts?.returnDeepestPoint, BUFFER_WRITE_BOOL);
        // TODO
        // separate a cast into [single result / multiple results] commands
        // so we don't allocate new array for a single result query
        // after we get back from the backend
        cb.write(opts?.firstOnly, BUFFER_WRITE_BOOL);
        cb.write(opts?.calculateNormal, BUFFER_WRITE_BOOL);
        cb.write(shapeIndex, BUFFER_WRITE_UINT32, false);
        cb.write(opts?.bpFilterLayer, BUFFER_WRITE_UINT32);
        cb.write(opts?.objFilterLayer, BUFFER_WRITE_UINT32);
    }

    // createConstraint(type, entity1, entity2, opts = {}) {
    //     if (DEBUG) {
    //         let ok = Debug.assert(!!entity1.c.body, `Entity has no Body Component. Cannot create constraint.`, entity1);
    //         ok = ok && Debug.assert(!!entity2.c.body, `Entity has no Body Component. Cannot create constraint.`, entity2);
    //         if (!ok) return;
    //     }

    //     const cb = this._outBuffer;
    //     const index = this._constraintMap.add({ entity1, entity2 });

    //     entity1.body.constraints.set(index, entity2);
    //     entity2.body.constraints.set(index, entity1);

    //     cb.writeOperator(OPERATOR_CREATOR);
    //     cb.writeCommand(CMD_CREATE_CONSTRAINT);
    //     cb.write(type, BUFFER_WRITE_UINT8, false);

    //     cb.write(index, BUFFER_WRITE_UINT32, false);
    //     cb.write(entity1.c.body.index, BUFFER_WRITE_UINT32, false);
    //     cb.write(entity2.c.body.index, BUFFER_WRITE_UINT32, false);

    //     switch (type) {
    //         case CONSTRAINT_TYPE_FIXED:
    //             JoltManager.writeFixedConstraint(cb, opts);
    //             break;

    //         case CONSTRAINT_TYPE_POINT:
    //             JoltManager.writePointConstraint(cb, opts);
    //             break;

    //         case CONSTRAINT_TYPE_DISTANCE:
    //             JoltManager.writeDistanceConstraint(cb, opts);
    //             break;

    //         case CONSTRAINT_TYPE_HINGE:
    //             JoltManager.writeHingeConstraint(cb, opts);
    //             break;

    //         case CONSTRAINT_TYPE_SLIDER:
    //             JoltManager.writeSliderConstraint(cb, opts);
    //             break;

    //         case CONSTRAINT_TYPE_CONE:
    //             JoltManager.writeConeConstraint(cb, opts);
    //             break;

    //         case CONSTRAINT_TYPE_SWING_TWIST:
    //             JoltManager.writeSwingTwistConstraint(cb, opts);
    //             break;

    //         case CONSTRAINT_TYPE_SIX_DOF:
    //             JoltManager.writeSixDofConstraint(cb, opts);
    //             break;

    //         case CONSTRAINT_TYPE_PULLEY:
    //             JoltManager.writePulleyConstraint(cb, opts);
    //             break;

    //         default:
    //             DEBUG && Debug.error(`Unrecognized constraint type: ${ type }`);
    //             return;
    //     }

    //     cb.write(opts.numVelocityStepsOverride, BUFFER_WRITE_UINT8);
    //     cb.write(opts.numPositionStepsOverride, BUFFER_WRITE_UINT8);
    //     cb.write(opts.space, BUFFER_WRITE_UINT8);

    //     return index;
    // }

    // destroyConstraint(index) {
    //     if (DEBUG) {
    //         const ok = Debug.checkUint(index, `Invalid index of a constraint trying to destroy: ${ index }`);
    //         if (!ok)
    //             return;
    //     }

    //     const cb = this._outBuffer;

    //     cb.writeOperator(OPERATOR_CLEANER);
    //     cb.writeCommand(CMD_DESTROY_CONSTRAINT);
    //     cb.write(index, BUFFER_WRITE_UINT32, false);

    //     this.freeConstraintIndex(index);
    // }

    // freeConstraintIndex(index) {
    //     this._constraintMap.free(index);
    // }

    // setConstraintEnabled(index, enabled, activate = true) {
    //     if (DEBUG) {
    //         let ok = Debug.checkUint(index, `Invalid constraint index: ${ index }`);
    //         ok = ok && Debug.checkBool(enabled, `Invalid constraint enable bool: ${ enabled }`);
    //         ok = ok && Debug.checkBool(enabled, `Invalid activate bool: ${ enabled }`);
    //         if (!ok)
    //             return;
    //     }

    //     const cb = this._outBuffer;

    //     cb.writeOperator(OPERATOR_MODIFIER);
    //     cb.writeCommand(CMD_SET_CONSTRAINT_ENABLED);
    //     cb.write(index, BUFFER_WRITE_UINT32, false);
    //     cb.write(enabled, BUFFER_WRITE_BOOL, false);
    //     cb.write(activate, BUFFER_WRITE_BOOL, false);
    // }

    // https://jrouwe.github.io/JoltPhysics/class_fixed_constraint_settings.html
    // static writeFixedConstraint(cb, opts) {
    //     cb.write(opts.autoDetectPoint, BUFFER_WRITE_BOOL);
    //     if (!opts.autoDetectPoint) {
    //         cb.write(opts.point1, BUFFER_WRITE_VEC32);
    //         cb.write(opts.point2, BUFFER_WRITE_VEC32);
    //     }
    //     cb.write(opts.axisX1, BUFFER_WRITE_VEC32);
    //     cb.write(opts.axisY1, BUFFER_WRITE_VEC32);
    //     cb.write(opts.axisX2, BUFFER_WRITE_VEC32);
    //     cb.write(opts.axisY2, BUFFER_WRITE_VEC32);
    // }

    // https://jrouwe.github.io/JoltPhysics/class_point_constraint_settings.html
    // static writePointConstraint(cb, opts) {
    //     cb.write(opts.point1, BUFFER_WRITE_VEC32);
    //     cb.write(opts.point2, BUFFER_WRITE_VEC32);
    // }

    // https://jrouwe.github.io/JoltPhysics/class_distance_constraint_settings.html
    // static writeDistanceConstraint(cb, opts) {
    //     cb.write(opts.point1, BUFFER_WRITE_VEC32);
    //     cb.write(opts.point2, BUFFER_WRITE_VEC32);
    //     cb.write(opts.minDistance, BUFFER_WRITE_FLOAT32);
    //     cb.write(opts.maxDistance, BUFFER_WRITE_FLOAT32);

    //     JoltManager.writeSpringSettings(cb, opts.springSettings);
    // }

    // https://jrouwe.github.io/JoltPhysics/class_hinge_constraint_settings.html
    // static writeHingeConstraint(cb, opts) {
    //     cb.write(opts.point1, BUFFER_WRITE_VEC32);
    //     cb.write(opts.hingeAxis1, BUFFER_WRITE_VEC32);
    //     cb.write(opts.normalAxis1, BUFFER_WRITE_VEC32);
    //     cb.write(opts.point2, BUFFER_WRITE_VEC32);
    //     cb.write(opts.hingeAxis2, BUFFER_WRITE_VEC32);
    //     cb.write(opts.normalAxis2, BUFFER_WRITE_VEC32);
    //     cb.write(opts.limitsMin, BUFFER_WRITE_FLOAT32);
    //     cb.write(opts.limitsMax, BUFFER_WRITE_FLOAT32);
    //     cb.write(opts.maxFrictionTorque, BUFFER_WRITE_FLOAT32);

    //     JoltManager.writeSpringSettings(cb, opts.springSettings);
    //     JoltManager.writeMotorSettings(cb, opts.motorSettings);
    // }

    // https://jrouwe.github.io/JoltPhysics/class_slider_constraint_settings.html
    // static writeSliderConstraint(cb, opts) {
    //     cb.write(opts.autoDetectPoint, BUFFER_WRITE_BOOL);
    //     if (!opts.autoDetectPoint) {
    //         cb.write(opts.point1, BUFFER_WRITE_VEC32);
    //         cb.write(opts.point2, BUFFER_WRITE_VEC32);
    //     }
    //     cb.write(opts.sliderAxis1, BUFFER_WRITE_VEC32);
    //     cb.write(opts.normalAxis1, BUFFER_WRITE_VEC32);
    //     cb.write(opts.sliderAxis2, BUFFER_WRITE_VEC32);
    //     cb.write(opts.normalAxis2, BUFFER_WRITE_VEC32);
    //     cb.write(opts.limitsMin, BUFFER_WRITE_FLOAT32);
    //     cb.write(opts.limitsMax, BUFFER_WRITE_FLOAT32);
    //     cb.write(opts.maxFrictionForce, BUFFER_WRITE_FLOAT32);

    //     JoltManager.writeSpringSettings(cb, opts.springSettings);
    //     JoltManager.writeMotorSettings(cb, opts.motorSettings);
    // }

    // https://jrouwe.github.io/JoltPhysics/class_cone_constraint_settings.html
    // static writeConeConstraint(cb, opts) {
    //     cb.write(opts.point1, BUFFER_WRITE_VEC32);
    //     cb.write(opts.twistAxis1, BUFFER_WRITE_VEC32);
    //     cb.write(opts.point2, BUFFER_WRITE_VEC32);
    //     cb.write(opts.twistAxis2, BUFFER_WRITE_VEC32);
    //     cb.write(opts.halfConeAngle, BUFFER_WRITE_FLOAT32);
    // }

    // https://jrouwe.github.io/JoltPhysics/class_swing_twist_constraint_settings.html
    // static writeSwingTwistConstraint(cb, opts) {
    //     cb.write(opts.position1, BUFFER_WRITE_VEC32);
    //     cb.write(opts.twistAxis1, BUFFER_WRITE_VEC32);
    //     cb.write(opts.planeAxis1, BUFFER_WRITE_VEC32);
    //     cb.write(opts.position2, BUFFER_WRITE_VEC32);
    //     cb.write(opts.twistAxis2, BUFFER_WRITE_VEC32);
    //     cb.write(opts.planeAxis2, BUFFER_WRITE_VEC32);
    //     cb.write(opts.normalHalfConeAngle, BUFFER_WRITE_FLOAT32);
    //     cb.write(opts.planeHalfConeAngle, BUFFER_WRITE_FLOAT32);
    //     cb.write(opts.twistMinAngle, BUFFER_WRITE_FLOAT32);
    //     cb.write(opts.twistMaxAngle, BUFFER_WRITE_FLOAT32);
    //     cb.write(opts.maxFrictionTorque, BUFFER_WRITE_FLOAT32);

    //     JoltManager.writeMotorSettings(cb, opts.swingMotorSettings);
    //     JoltManager.writeMotorSettings(cb, opts.twistMotorSettings);
    // }

    // https://jrouwe.github.io/JoltPhysics/class_six_d_o_f_constraint_settings.html
    // static writeSixDofConstraint(cb, opts) {
    //     JoltManager.writeAxes(cb, opts.freeAxes);
    //     JoltManager.writeAxes(cb, opts.fixedAxes);
    //     JoltManager.writeAxes(cb, opts.limitedAxes, true);

    //     cb.write(opts.position1, BUFFER_WRITE_VEC32);
    //     cb.write(opts.axisX1, BUFFER_WRITE_VEC32);
    //     cb.write(opts.axisY1, BUFFER_WRITE_VEC32);
    //     cb.write(opts.position2, BUFFER_WRITE_VEC32);
    //     cb.write(opts.axisX2, BUFFER_WRITE_VEC32);
    //     cb.write(opts.axisY2, BUFFER_WRITE_VEC32);
    //     cb.write(opts.maxFriction, BUFFER_WRITE_FLOAT32);
    //     cb.write(opts.limitsMin, BUFFER_WRITE_FLOAT32);
    //     cb.write(opts.limitsMax, BUFFER_WRITE_FLOAT32);

    //     JoltManager.writeSpringSettings(cb, opts.springSettings);
    //     JoltManager.writeMotorSettings(cb, opts.motorSettings);
    // }

    // https://jrouwe.github.io/JoltPhysics/class_pulley_constraint_settings.html
    // static writePulleyConstraint(cb, opts) {
    //     cb.write(opts.bodyPoint1 || pc.Vec3.ZERO, BUFFER_WRITE_VEC32, false);
    //     cb.write(opts.bodyPoint2 || pc.Vec3.ZERO, BUFFER_WRITE_VEC32, false);
    //     cb.write(opts.fixedPoint1 || pc.Vec3.ZERO, BUFFER_WRITE_VEC32, false);
    //     cb.write(opts.fixedPoint2 || pc.Vec3.ZERO, BUFFER_WRITE_VEC32, false);
    //     cb.write(opts.ratio ?? 1, BUFFER_WRITE_FLOAT32, false);
    //     cb.write(opts.minLength ?? 0, BUFFER_WRITE_FLOAT32, false);
    //     cb.write(opts.maxLength ?? -1, BUFFER_WRITE_FLOAT32, false);
    // }

    // static writeAxes(cb, axes, limits) {
    //     cb.write(!!axes, BUFFER_WRITE_BOOL, false);
    //     if (axes) {
    //         const count = axes.length;
    //         if (limits) {
    //             cb.write(count / 3, BUFFER_WRITE_UINT8, false);
    //             for (let i = 0; i < count; i += 3) {
    //                 cb.write(axes[i], BUFFER_WRITE_UINT8, false);
    //                 cb.write(axes[i + 1], BUFFER_WRITE_FLOAT32, false);
    //                 cb.write(axes[i + 2], BUFFER_WRITE_FLOAT32, false);
    //             }
    //         } else {
    //             cb.write(count, BUFFER_WRITE_UINT8, false);
    //             for (let i = 0; i < count; i++) {
    //                 cb.write(axes[i], BUFFER_WRITE_UINT8, false);
    //             }
    //         }
    //     }
    // }

    // static writeSpringSettings(cb, springSettings) {
    //     cb.write(!!springSettings, BUFFER_WRITE_BOOL, false);
    //     if (springSettings != null) {
    //         cb.write(springSettings.springMode, BUFFER_WRITE_UINT8);
    //         cb.write(springSettings.frequency, BUFFER_WRITE_FLOAT32);
    //         cb.write(springSettings.stiffness, BUFFER_WRITE_FLOAT32);
    //         cb.write(springSettings.damping, BUFFER_WRITE_FLOAT32);
    //     }
    // }

    // static writeMotorSettings(cb, motorSettings) {
    //     cb.write(!!motorSettings, BUFFER_WRITE_BOOL, false);
    //     if (motorSettings != null) {
    //         JoltManager.writeSpringSettings(cb, motorSettings.springSettings);
    //         cb.write(motorSettings.minForceLimit, BUFFER_WRITE_FLOAT32);
    //         cb.write(motorSettings.maxForceLimit, BUFFER_WRITE_FLOAT32);
    //         cb.write(motorSettings.minTorqueLimit, BUFFER_WRITE_FLOAT32);
    //         cb.write(motorSettings.maxTorqueLimit, BUFFER_WRITE_FLOAT32);
    //     }
    // }

}

// Override chunk location in order for the engine to locate them in PlayCanvas Editor.
// TODO
// is there a better way?
const oldFn = __webpack_get_script_filename__;
__webpack_get_script_filename__ = (chunkId) => {
    const filename = oldFn(chunkId);
    const app = pc.Application.getApplication();
    const asset = app.assets.find(filename, 'script');
    const url = asset.getFileUrl();
    return url;
};

/**
 * Components initialization method.
 * 
 * @param {import('playcanvas').Application} app - PlayCanvas Application instance
 * @param {object} opts 
 * @returns Promise
 */
function init(app, opts = {}) {
    const options = {
        backend: 'jolt',
        propertyName: 'physics',
        ...opts
    };
    
    const { backend, propertyName } = options;

    return new Promise((resolve, reject) => {

        if (backend !== 'jolt') {
            if (DEBUG) {
                Debug$1.warn(`Selected backend is not supported: ${ backend }`);
            }
            return reject();
        }

        extendPCMath();
        
        if (app[propertyName]) {
            DEBUG && Debug$1.warn(`Unable to initialize Physics Manager. Application has an existing property name that conflicts. ` + 
                `Tried to use "app.${ propertyName }". Use { propertyName: string } in init options to use a custom property name. Aborting.`);
            return null;
        }

        const manager = new JoltManager(app, options, onReady);
        
        function onReady() {
            app.on('destroy', () => destroy());
            app[propertyName] = manager;
            resolve();
        }

        function destroy() {
            app[propertyName].destroy();
            app[propertyName] = null;
        }
    });
}

/**
 * This is a module that contains several physics components for PlayCanvas. At the moment,
 * only JoltPhysics backend based components are implemented.
 *
 * @module PhysicsComponents
 */


var index = { init };

export { BodyComponent, BodyComponentSystem, index as default };
