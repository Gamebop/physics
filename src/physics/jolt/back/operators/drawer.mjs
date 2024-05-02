import { FLOAT32_SIZE } from '../../constants.mjs';
import { Debug } from '../../debug.mjs';

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
            $_DEBUG && Debug.error(e);
            return false;
        }

        return true;
    }
}

export { Drawer };