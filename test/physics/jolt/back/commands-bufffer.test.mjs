import { CommandsBuffer } from '../../../../src/physics/jolt/back/commands-buffer.mjs';
import {
    BUFFER_READ_BOOL, BUFFER_READ_FLOAT32, BUFFER_READ_INT32, BUFFER_READ_UINT16,
    BUFFER_READ_UINT32, BUFFER_READ_UINT8, BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32,
    BUFFER_WRITE_INT32, BUFFER_WRITE_JOLTVEC32, BUFFER_WRITE_PLANE, BUFFER_WRITE_UINT16,
    BUFFER_WRITE_UINT32, BUFFER_WRITE_UINT8, BUFFER_WRITE_VEC32, CMD_CAST_RAY,
    OPERATOR_CLEANER, UINT16_SIZE
} from '../../../../src/physics/jolt/constants.mjs';
import { describe } from 'mocha';
import { expect } from 'chai';
import { Plane, Quat, Vec3 } from 'playcanvas';
import Jolt from 'jolt-physics/dist/jolt-physics.wasm.js';

const EPSILON = 0.00001;

describe('CommandsBuffer', function () {

    before(function () {
        global.$_DEBUG = true;

        this.cb = new CommandsBuffer({
            useSharedArrayBuffer: false,
            commandsBufferSize: 130,
            allowCommandsBufferResize: false
        });
    });

    beforeEach(function () {
        this.cb.reset();
        this.cb.init();
    });

    after(function () {
        this.cb.destroy();
        this.cb = null;
    });

    describe('#constructor()', function () {

        it('should create a new CB without options, no buffers', function () {
            const cb = new CommandsBuffer();

            expect(cb.buffer).to.be.undefined;
            expect(cb.dirty).to.be.false;
            expect(cb.meshBuffers).to.be.an.instanceof(Array);
            expect(cb.meshBuffers.length).to.be.equal(0);
            expect(cb.commandsCount).to.be.equal(0);
            expect(cb._bytesOffset).to.be.equal(UINT16_SIZE);
            expect(cb._allowGrowth).to.be.true;
        });

        it('should create a new CB with SharedArrayBuffer, no growth', function () {
            const cb = new CommandsBuffer({
                useSharedArrayBuffer: true,
                commandsBufferSize: 100,
                allowCommandsBufferResize: false
            });

            expect(cb.buffer).to.be.instanceof(SharedArrayBuffer);
            expect(cb.buffer.byteLength).to.be.equal(100);
            expect(cb._view).to.be.instanceof(DataView);
            expect(cb._allowGrowth).to.be.false;
        });

        it('should create a new CB with ArrayBuffer, allow growth', function () {
            const cb = new CommandsBuffer({
                useSharedArrayBuffer: false,
                commandsBufferSize: 100,
                allowCommandsBufferResize: true
            });

            expect(cb.buffer).to.be.instanceof(ArrayBuffer);
            expect(cb.buffer.byteLength).to.be.equal(100);
            expect(cb._view).to.be.instanceof(DataView);
            expect(cb._allowGrowth).to.be.true;
        });

        it('should allow setting a buffer after creation and clear on destroy', function () {
            const cb = new CommandsBuffer();
            const buffer = new ArrayBuffer(100);

            cb.buffer = buffer;

            expect(cb.buffer).to.be.instanceof(ArrayBuffer);
            expect(cb._view).to.be.instanceof(DataView);

            cb.destroy();
            expect(cb.buffer).to.be.null;
            expect(cb._view).to.be.null;
        });

    });

    describe('#methods()', function () {

        it('should write/read a command, reset bytes offset', function () {
            const cb = this.cb;

            expect(cb._commandsCount).to.be.equal(0);
            expect(cb.commandsCount).to.be.equal(0);
            expect(cb.dirty).to.be.false;
            expect(cb._bytesOffset).to.be.equal(UINT16_SIZE);

            cb.writeCommand(CMD_CAST_RAY);

            expect(cb._commandsCount).to.be.equal(1);
            expect(cb.commandsCount).to.be.equal(1);
            expect(cb.dirty).to.be.true;
            expect(cb._bytesOffset).to.be.equal(UINT16_SIZE + UINT16_SIZE);

            cb.reset();

            expect(cb._commandsCount).to.be.equal(0);
            expect(cb.commandsCount).to.be.equal(1);
            expect(cb.dirty).to.be.false;
            expect(cb._bytesOffset).to.be.equal(UINT16_SIZE);

            const cmd = cb.readCommand();

            expect(cmd).to.be.equal(CMD_CAST_RAY);

            cb.init();

            expect(cb.commandsCount).to.be.equal(0);
        });

        it('should write/read an operator', function () {
            const cb = this.cb;

            cb.writeOperator(OPERATOR_CLEANER);
            cb.reset();

            const cleaner = cb.readOperator();

            expect(cleaner).to.be.equal(OPERATOR_CLEANER);
        });

        it('should write/read a PlayCanvas vector', function () {
            const cb = this.cb;

            cb.write(new Quat(1, 2, 3, 4), BUFFER_WRITE_VEC32, false);
            cb.reset();

            const x = cb.read(BUFFER_READ_FLOAT32);
            const y = cb.read(BUFFER_READ_FLOAT32);
            const z = cb.read(BUFFER_READ_FLOAT32);
            const w = cb.read(BUFFER_READ_FLOAT32);

            expect(x).to.be.equal(1);
            expect(y).to.be.equal(2);
            expect(z).to.be.equal(3);
            expect(w).to.be.equal(4);
        });

        it('should write/read a Jolt vector', async function () {
            const j = await Jolt();

            const cb = this.cb;
            const jq = new j.Quat(1, 2, 3, 4);

            cb.write(jq, BUFFER_WRITE_JOLTVEC32, false);
            cb.reset();

            const x = cb.read(BUFFER_READ_FLOAT32);
            const y = cb.read(BUFFER_READ_FLOAT32);
            const z = cb.read(BUFFER_READ_FLOAT32);
            const w = cb.read(BUFFER_READ_FLOAT32);

            expect(x).to.be.equal(1);
            expect(y).to.be.equal(2);
            expect(z).to.be.equal(3);
            expect(w).to.be.equal(4);
        });

        it('should write/read a float (32-bit)', function () {
            const cb = this.cb;

            const invalid = cb.write('invalid', BUFFER_WRITE_FLOAT32, false);
            const valid = cb.write(123.456, BUFFER_WRITE_FLOAT32, false);
            cb.reset();

            const num = cb.read(BUFFER_READ_FLOAT32);

            expect(invalid).to.be.false;
            expect(valid).to.be.true;
            expect(123.456 - num).to.be.within(-EPSILON, EPSILON);
        });

        it('should write/read a boolean', function () {
            const cb = this.cb;

            cb.write(true, BUFFER_WRITE_BOOL, false);
            cb.reset();

            const bool = cb.read(BUFFER_READ_BOOL);

            expect(bool).to.be.true;
        });

        it('should write/read a signed integer (32-bit)', function () {
            const cb = this.cb;

            const invalid = cb.write('invalid', BUFFER_WRITE_FLOAT32, false);
            const valid = cb.write(-1, BUFFER_WRITE_INT32, false);
            cb.reset();

            const int = cb.read(BUFFER_READ_INT32);

            expect(invalid).to.be.false;
            expect(valid).to.be.true;
            expect(int).to.be.equal(-1);
        });

        it('should write/read an unsigned integer (32-bit)', function () {
            const cb = this.cb;

            const invalid1 = cb.write('invalid', BUFFER_WRITE_UINT32, false);
            const invalid2 = cb.write(-1, BUFFER_WRITE_UINT32, false);
            const invalid3 = cb.write(4294967296, BUFFER_WRITE_UINT32, false);
            const valid = cb.write(4294967295, BUFFER_WRITE_UINT32, false);
            cb.reset();

            const int = cb.read(BUFFER_READ_UINT32);

            expect(invalid1).to.be.false;
            expect(invalid2).to.be.false;
            expect(invalid3).to.be.false;
            expect(valid).to.be.true;
            expect(int).to.be.equal(4294967295);
        });

        it('should write/read an unsigned integer (16-bit)', function () {
            const cb = this.cb;

            const invalid1 = cb.write('invalid', BUFFER_WRITE_UINT16, false);
            const invalid2 = cb.write(-1, BUFFER_WRITE_UINT16, false);
            const invalid3 = cb.write(65536, BUFFER_WRITE_UINT16, false);
            const valid = cb.write(65535, BUFFER_WRITE_UINT16, false);
            cb.reset();

            const int = cb.read(BUFFER_READ_UINT16);

            expect(invalid1).to.be.false;
            expect(invalid2).to.be.false;
            expect(invalid3).to.be.false;
            expect(valid).to.be.true;
            expect(int).to.be.equal(65535);
        });

        it('should write/read an unsigned integer (8-bit)', function () {
            const cb = this.cb;

            const invalid1 = cb.write('invalid', BUFFER_WRITE_UINT8, false);
            const invalid2 = cb.write(-1, BUFFER_WRITE_UINT8, false);
            const invalid3 = cb.write(256, BUFFER_WRITE_UINT8, false);
            const valid = cb.write(255, BUFFER_WRITE_UINT8, false);
            cb.reset();

            const int = cb.read(BUFFER_READ_UINT8);

            expect(invalid1).to.be.false;
            expect(invalid2).to.be.false;
            expect(invalid3).to.be.false;
            expect(valid).to.be.true;
            expect(int).to.be.equal(255);
        });

        it('should write/read an PlayCanvas Plane', function () {
            const cb = this.cb;

            const plane = new Plane(Vec3.DOWN, 10);

            const invalid1 = cb.write('invalid', BUFFER_WRITE_PLANE, false);
            const invalid2 = cb.write(-1, BUFFER_WRITE_PLANE, false);
            const invalid3 = cb.write(Vec3.ZERO, BUFFER_WRITE_PLANE, false);
            const valid = cb.write(plane, BUFFER_WRITE_PLANE, false);
            cb.reset();

            const nx = cb.read(BUFFER_READ_FLOAT32);
            const ny = cb.read(BUFFER_READ_FLOAT32);
            const nz = cb.read(BUFFER_READ_FLOAT32);
            const dist = cb.read(BUFFER_READ_FLOAT32);

            expect(invalid1).to.be.false;
            expect(invalid2).to.be.false;
            expect(invalid3).to.be.false;
            expect(valid).to.be.true;
            expect(nx).to.be.equal(0);
            expect(ny).to.be.equal(-1);
            expect(nz).to.be.equal(0);
            expect(dist).to.be.equal(10);
        });

        it('should not write using invalid command', function () {
            const cb = this.cb;

            const invalid = cb.write(123, 'invalid command', false);
            cb.reset();

            expect(cb.commandsCount).to.be.equal(0);
            expect(invalid).to.be.false;
        });

        it('should add mesh buffers', function () {
            const cb = this.cb;
            const buffer = new ArrayBuffer(10);

            expect(cb.meshBuffers.length).to.be.equal(0);

            cb.addBuffer(buffer);

            expect(cb.meshBuffers.length).to.be.equal(1);

            cb.addBuffer(buffer);

            expect(cb.meshBuffers.length).to.be.equal(2);
        });

        it('should skip memory sections', function () {
            const cb = this.cb;

            cb.write(1, BUFFER_WRITE_UINT8, false);
            cb.write(2, BUFFER_WRITE_UINT8, false);
            cb.write(3, BUFFER_WRITE_UINT8, false);
            cb.write(4, BUFFER_WRITE_UINT8, false);
            cb.reset();

            const val1 = cb.read(BUFFER_READ_UINT8);

            cb.skip(UINT16_SIZE, 1);

            const val2 = cb.read(BUFFER_READ_UINT8);

            expect(val1).to.be.equal(1);
            expect(val2).to.be.equal(4);
        });

        it('should allow growing the buffer size', function () {
            const cb = new CommandsBuffer({
                useSharedArrayBuffer: false,
                commandsBufferSize: 3,
                allowCommandsBufferResize: true
            });

            const valid1 = cb.write(1, BUFFER_WRITE_UINT8, false);
            const valid2 = cb.write(2, BUFFER_WRITE_UINT8, false);
            cb.reset();

            const num1 = cb.read(BUFFER_READ_UINT8);
            const num2 = cb.read(BUFFER_READ_UINT8);

            expect(valid1).to.be.true;
            expect(valid2).to.be.true;
            expect(num1).to.be.equal(1);
            expect(num2).to.be.equal(2);
        });

        it('should prevent growing the buffer size', function () {
            const cb = new CommandsBuffer({
                useSharedArrayBuffer: false,
                commandsBufferSize: 3,
                allowCommandsBufferResize: false
            });

            const valid1 = cb.write(1, BUFFER_WRITE_UINT8, false);
            const valid2 = cb.write(2, BUFFER_WRITE_UINT8, false);
            cb.reset();

            const num1 = cb.read(BUFFER_READ_UINT8);

            expect(valid1).to.be.true;
            expect(valid2).to.be.false;
            expect(num1).to.be.equal(1);
        });
    });

});
