import { CommandsBuffer } from '../../../../src/physics/jolt/back/commands-buffer.mjs';
import { BUFFER_READ_FLOAT32, BUFFER_WRITE_FLOAT32, CMD_CAST_RAY, OPERATOR_CLEANER, OPERATOR_CREATOR, OPERATOR_MODIFIER, OPERATOR_QUERIER, UINT16_SIZE } from '../../../../src/physics/jolt/constants.mjs';
import { describe } from 'mocha';
import { expect } from 'chai';

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
        });

        // it('should write and read all operators', function () {
        //     const cb = this.cb;

        //     cb.write(OPERATOR_CLEANER);
        //     cb.write(OPERATOR_CREATOR);
        //     cb.write(OPERATOR_MODIFIER);
        //     cb.write(OPERATOR_QUERIER);

        //     const cleaner = cb.readOperator();
        //     const creator = cb.readOperator();
        //     const modifier = cb.readOperator();
        //     const querier = cb.readOperator();

        //     expect(cleaner).to.be.equal(OPERATOR_CLEANER);
        //     expect(creator).to.be.equal(OPERATOR_CREATOR);
        //     expect(modifier).to.be.equal(OPERATOR_MODIFIER);
        //     expect(querier).to.be.equal(OPERATOR_QUERIER);
        // });

    });

});
