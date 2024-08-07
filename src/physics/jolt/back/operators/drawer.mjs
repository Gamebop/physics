import { FLOAT32_SIZE, MOTION_TYPE_DYNAMIC, MOTION_TYPE_KINEMATIC, MOTION_TYPE_STATIC } from '../../constants.mjs';
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
        debugBodies.forEach((body) => {
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
            const jmt = body.isCharacter ? Jolt.EMotionType_Kinematic : body.GetMotionType();
            const isRigidBody = body.isCharacter ? true : (body.GetBodyType() === Jolt.EBodyType_RigidBody);
            const pos = body.GetPosition();
            const rot = body.GetRotation();

            let motionType = MOTION_TYPE_STATIC;
            if (jmt === Jolt.EMotionType_Kinematic) {
                motionType = MOTION_TYPE_KINEMATIC;
            } else if (jmt === Jolt.EMotionType_Dynamic) {
                motionType = MOTION_TYPE_DYNAMIC;
            }

            const data = body.debugDrawData;
            if (data) {
                if (isRigidBody) {
                    const buffer = Jolt.HEAPF32.buffer;

                    this._data.push(
                        ...data, motionType, body.debugDrawDepth, buffer,
                        pos.GetX(), pos.GetY(), pos.GetZ(),
                        rot.GetX(), rot.GetY(), rot.GetZ(), rot.GetW()
                    );

                    const index = this._buffers.indexOf(buffer);
                    if (index < 0) {
                        this._buffers.push(buffer);
                    }

                    return true;
                }

                // Soft body will have new vertex positions, so we need to create a new triContext
                Jolt.destroy(body.triContext);
                body.triContext = null;
                body.debugDrawData = null;
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
                index, length, byteOffset, motionType, body.debugDrawDepth, buffer,
                pos.GetX(), pos.GetY(), pos.GetZ(),
                rot.GetX(), rot.GetY(), rot.GetZ(), rot.GetW()
            );
            this._buffers.push(buffer);

        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }
}

export { Drawer };
