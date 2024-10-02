import { Vec3 } from 'playcanvas';
import { Debug } from './debug.mjs';
import { BUFFER_READ_FLOAT32 } from './constants.mjs';

function fromBuffer(buffer) {
    return new Vec3(
        buffer.read(BUFFER_READ_FLOAT32),
        buffer.read(BUFFER_READ_FLOAT32),
        buffer.read(BUFFER_READ_FLOAT32)
    );
}

function extendJoltMath(Jolt) {
    Jolt.Vec3.prototype.FromBuffer = function (buffer, isPositive) {
        if ($_DEBUG) {
            const x = buffer.read(BUFFER_READ_FLOAT32);
            const y = buffer.read(BUFFER_READ_FLOAT32);
            const z = buffer.read(BUFFER_READ_FLOAT32);

            const test = isPositive ? Debug.checkFloatPositive : Debug.checkFloat;

            let ok = test(x);
            ok = ok && test(y);
            ok = ok && test(z);
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

    Jolt.Vec3.prototype.set = function (x, y, z) {
        this.Set(x, y, z);
        return this;
    };

    Jolt.Vec3.prototype.print = function () {
        console.log(this.GetX(), this.GetY(), this.GetZ());
    };

    Jolt.Quat.prototype.FromBuffer = function (buffer) {
        if ($_DEBUG) {
            const x = buffer.read(BUFFER_READ_FLOAT32);
            const y = buffer.read(BUFFER_READ_FLOAT32);
            const z = buffer.read(BUFFER_READ_FLOAT32);
            const w = buffer.read(BUFFER_READ_FLOAT32);

            let ok = Debug.checkFloat(x);
            ok = ok && Debug.checkFloat(y);
            ok = ok && Debug.checkFloat(z);
            ok = ok && Debug.checkFloat(w);
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

    Jolt.Quat.prototype.set = function (x, y, z, w) {
        this.Set(x, y, z, w);
        return this;
    };

    Jolt.Quat.prototype.print = function () {
        console.log(this.GetX(), this.GetY(), this.GetZ(), this.GetW());
    };
}

export { extendJoltMath, fromBuffer };
