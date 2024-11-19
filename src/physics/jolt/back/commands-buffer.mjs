import { Debug } from '../debug.mjs';
import {
    BUFFER_READ_BOOL, BUFFER_READ_FLOAT32, BUFFER_READ_INT32, BUFFER_READ_UINT16,
    BUFFER_READ_UINT32, BUFFER_READ_UINT8, BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32,
    BUFFER_WRITE_INT32, BUFFER_WRITE_JOLTVEC32, BUFFER_WRITE_PLANE, BUFFER_WRITE_UINT16,
    BUFFER_WRITE_UINT32, BUFFER_WRITE_UINT8, BUFFER_WRITE_VEC32, FLOAT32_SIZE, INT32_SIZE,
    UINT16_SIZE, UINT32_SIZE, UINT8_SIZE
} from '../constants.mjs';
import { Plane } from 'playcanvas';

// TODO
// hide from docs, after PhysicsManager stops using it directly

/**
 * A commands buffer that is used by the framework to communicate between frontend application and
 * a physics backend. Using a commands buffer allows to decouple them and to run the backend in a
 * Web Worker.
 *
 * @group Utilities
 */
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

        // TODO
        // lazy allocate
        this._meshBuffers = [];
    }

    set buffer(b) {
        this._buffer = b;
        this._view = new DataView(b);
    }

    get buffer() {
        return this._buffer;
    }

    get dirty() {
        return this._dirty;
    }

    // TODO
    // remove flag usage
    get flag() {
        return this.readUint8();
    }

    get commandsCount() {
        return this._view?.getUint16(0) || 0;
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
        if ($_DEBUG) {
            Debug.assert(
                method === BUFFER_READ_BOOL ||
                method === BUFFER_READ_FLOAT32 ||
                method === BUFFER_READ_UINT8 ||
                method === BUFFER_READ_UINT16 ||
                method === BUFFER_READ_UINT32 ||
                method === BUFFER_READ_INT32,
                `Invalid write command method: ${method}`);
        }

        return this[method]();
    }

    // TODO
    // remove flag
    write(value, method, addFlag = true) {
        if ($_DEBUG) {
            const ok = Debug.assert(
                method === BUFFER_WRITE_BOOL ||
                method === BUFFER_WRITE_FLOAT32 ||
                method === BUFFER_WRITE_UINT8 ||
                method === BUFFER_WRITE_UINT16 ||
                method === BUFFER_WRITE_UINT32 ||
                method === BUFFER_WRITE_INT32 ||
                method === BUFFER_WRITE_VEC32 ||
                method === BUFFER_WRITE_JOLTVEC32 ||
                method === BUFFER_WRITE_PLANE,
                `Invalid write command method: ${method}`
            );

            if (!ok) {
                return false;
            }
        }

        if (addFlag) {
            if (value == null) {
                return this.writeUint8(0);
            }

            return this.writeUint8(1) && this[method](value);
        }

        return this[method](value);
    }

    readCommand() {
        return this.readUint16();
    }

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
        let ok = this.writeFloat32(vector.x);
        ok = ok && this.writeFloat32(vector.y);
        ok = ok && this.writeFloat32(vector.z);
        if (vector.w !== undefined) {
            ok = ok && this.writeFloat32(vector.w);
        }
        return ok;
    }

    readFloat32() {
        if ($_DEBUG && this._isOutsideBounds(FLOAT32_SIZE)) {
            Debug.warnOnce('Commands Buffer: Aborting read outside buffer bounds.');
            return 0;
        }
        const value = this._view.getFloat32(this._bytesOffset);
        if ($_DEBUG) {
            Debug.checkFloat(value);
        }
        this._bytesOffset += FLOAT32_SIZE;
        return value;
    }

    writeFloat32(value, offset) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(value);
            if (!ok) {
                return false;
            }
        }

        if (offset == null) {
            if (!this._canWrite(FLOAT32_SIZE)) {
                return false;
            }
            this._view.setFloat32(this._bytesOffset, value);
            this._bytesOffset += FLOAT32_SIZE;
        } else {
            if ($_DEBUG) {
                const ok = Debug.assert(this._buffer.byteLength >= (offset + FLOAT32_SIZE), 'Trying to write outside of buffer bounds.');
                if (!ok) {
                    return false;
                }
            }
            this._view.setFloat32(offset, value);
        }

        return true;
    }

    readUint8() {
        if ($_DEBUG && this._isOutsideBounds(UINT8_SIZE)) {
            Debug.warnOnce('Commands Buffer: Aborting read outside buffer bounds.');
            return 0;
        }
        const value = this._view.getUint8(this._bytesOffset);
        if ($_DEBUG) {
            Debug.checkUint(value, `Got invalid value from buffer: ${value}`);
        }
        this._bytesOffset += UINT8_SIZE;
        return value;
    }

    writeUint8(value, offset) {
        if ($_DEBUG) {
            let ok = Debug.checkUint(value);
            ok = ok && Debug.assert(value <= 255);
            if (!ok) {
                return false;
            }
        }

        if (offset == null) {
            if (!this._canWrite(UINT8_SIZE)) {
                return false;
            }
            this._view.setUint8(this._bytesOffset, value);
            this._bytesOffset += UINT8_SIZE;
        } else {
            if ($_DEBUG) {
                const ok = Debug.assert(this._buffer.byteLength >= (offset + UINT8_SIZE), 'Trying to write outside of buffer bounds.');
                if (!ok) {
                    return false;
                }
            }
            this._view.setUint8(offset, value);
        }

        return true;
    }

    readUint16() {
        if ($_DEBUG && this._isOutsideBounds(UINT16_SIZE)) {
            Debug.warnOnce('Commands Buffer: Aborting read outside buffer bounds.');
            return 0;
        }
        const value = this._view.getUint16(this._bytesOffset);
        if ($_DEBUG) {
            Debug.checkUint(value);
        }
        this._bytesOffset += UINT16_SIZE;
        return value;
    }

    writeUint16(value, offset) {
        if ($_DEBUG) {
            let ok = Debug.checkUint(value);
            ok = ok && Debug.assert(value <= 65535);
            if (!ok) {
                return false;
            }
        }

        if (offset == null) {
            if (!this._canWrite(UINT16_SIZE)) {
                return false;
            }
            this._view.setUint16(this._bytesOffset, value);
            this._bytesOffset += UINT16_SIZE;
        } else {
            if ($_DEBUG) {
                const ok = Debug.assert(this._buffer.byteLength >= (offset + UINT16_SIZE), 'Trying to write outside of buffer bounds.');
                if (!ok) {
                    return false;
                }
            }
            this._view.setUint16(offset, value);
        }

        return true;
    }

    readUint32() {
        if ($_DEBUG && this._isOutsideBounds(UINT32_SIZE)) {
            Debug.warnOnce('Commands Buffer: Aborting read outside buffer bounds.');
            return 0;
        }
        const value = this._view.getUint32(this._bytesOffset);
        if ($_DEBUG) {
            Debug.checkUint(value);
        }
        this._bytesOffset += UINT32_SIZE;
        return value;
    }

    writeUint32(value, offset) {
        if ($_DEBUG) {
            let ok = Debug.checkUint(value);
            ok = ok && Debug.assert(value <= 4294967295);
            if (!ok) {
                return false;
            }
        }

        if (offset == null) {
            if (!this._canWrite(UINT32_SIZE)) {
                return false;
            }
            this._view.setUint32(this._bytesOffset, value);
            this._bytesOffset += UINT32_SIZE;
        } else {
            if ($_DEBUG) {
                const ok = Debug.assert(this._buffer.byteLength >= (offset + UINT32_SIZE), 'Trying to write outside of buffer bounds.');
                if (!ok) {
                    return false;
                }
            }
            this._view.setUint32(offset, value);
        }

        return true;
    }

    readInt32() {
        if ($_DEBUG && this._isOutsideBounds(INT32_SIZE)) {
            Debug.warnOnce('Commands Buffer: Aborting read outside buffer bounds.');
            return null;
        }
        const value = this._view.getInt32(this._bytesOffset);
        if ($_DEBUG) {
            Debug.checkInt(value);
        }
        this._bytesOffset += INT32_SIZE;
        return value;
    }

    writeInt32(value, offset) {
        if ($_DEBUG) {
            const ok = Debug.checkInt(value);
            if (!ok) {
                return false;
            }
        }
        if (offset == null) {
            if (!this._canWrite(INT32_SIZE)) {
                return false;
            }
            this._view.setInt32(this._bytesOffset, value);
            this._bytesOffset += INT32_SIZE;
        } else {
            if ($_DEBUG) {
                const ok = Debug.assert(this._buffer.byteLength >= (offset + INT32_SIZE), 'Trying to write outside of buffer bounds.');
                if (!ok) {
                    return false;
                }
            }
            this._view.setInt32(offset, value);
        }

        return true;
    }

    readBool() {
        if (this.readUint8()) {
            return true;
        }

        return false;
    }

    writeBool(value) {
        return this.writeUint8(value ? 1 : 0);
    }

    writePlane(plane) {
        if ($_DEBUG) {
            const ok = Debug.assert(!!plane && plane instanceof Plane,
                'Trying to write invalid Plane instance to buffer', plane);
            if (!ok) {
                return false;
            }
        }
        let ok = this.writeVector32(plane.normal);
        ok = ok && this.writeFloat32(plane.distance);
        return ok;
    }

    addBuffer(buffer) {
        this._meshBuffers.push(buffer);
    }

    skip(bytes, size) {
        this._bytesOffset += (bytes * size);
    }

    init() {
        this._view.setUint16(0, 0);
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

    decrement(size) {
        this._view.setUint16(0, --this._commandsCount);
        this._bytesOffset -= size;
    }

    _increment() {
        this._view.setUint16(0, ++this._commandsCount);
    }

    _canWrite(increment) {
        if (this._isOutsideBounds(increment)) {
            if (this._allowGrowth) {
                this._resize();
            } else {
                Debug.warnOnce('Commands Buffer: reached capacity limits. Not allowed to grow.' +
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
        const addendum = increment ? increment : Math.floor(currentSize * 0.5);
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

export { CommandsBuffer };
