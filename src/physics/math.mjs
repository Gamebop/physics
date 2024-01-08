import { Debug } from "./debug.mjs";
import { BUFFER_READ_FLOAT32 } from "./components/jolt/constants.mjs";

function extendMath() {
    pc.Vec3.fromBuffer = function(buffer) {
        return new pc.Vec3(
            buffer.read(BUFFER_READ_FLOAT32),
            buffer.read(BUFFER_READ_FLOAT32),
            buffer.read(BUFFER_READ_FLOAT32)
        );
    };

    Jolt.Vec3.prototype.FromBuffer = function(buffer, isPositive) {
        if (Debug.dev) {
            const x = buffer.read(BUFFER_READ_FLOAT32);
            const y = buffer.read(BUFFER_READ_FLOAT32);
            const z = buffer.read(BUFFER_READ_FLOAT32);

            const test = isPositive ? Debug.checkFloatPositive : Debug.checkFloat;

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
        if (Debug.dev) {
            const x = buffer.read(BUFFER_READ_FLOAT32);
            const y = buffer.read(BUFFER_READ_FLOAT32);
            const z = buffer.read(BUFFER_READ_FLOAT32);
            const w = buffer.read(BUFFER_READ_FLOAT32);

            let ok = Debug.checkFloat(x, `invalid quaternion X component: ${ x }`);
            ok = ok && Debug.checkFloat(y, `invalid quaternion Y component: ${ y }`);
            ok = ok && Debug.checkFloat(z, `invalid quaternion Z component: ${ z }`);
            ok = ok && Debug.checkFloat(w, `invalid quaternion W component: ${ w }`);
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

export { extendMath };