import { Debug } from '../debug.mjs';

const v1 = { x: 0, y: 0, z: 0 };

class MotionState {
    constructor(body) {
        this._body = body;

        this.updatePosition();
        this.updateRotation();
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
                }

                const len = Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z + r.w * r.w);
                if (len === 0) {
                    r.x = r.y = r.z = 0;
                    r.w = 1;
                } else {
                    const inv = 1 / len;
                    r.x *= inv;
                    r.y *= inv;
                    r.z *= inv;
                    r.w *= inv;
                }
            }
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
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

    updatePosition() {
        const body = this._body;
        const bodyPos = body.GetPosition();
        const p = { x: bodyPos.GetX(), y: bodyPos.GetY(), z: bodyPos.GetZ() };

        this._position = p;
        this._currentPos = { x: p.x, y: p.y, z: p.z };
        this._oldPos = { x: p.x, y: p.y, z: p.z };
    }

    updateRotation() {
        const body = this._body;
        const bodyRot = body.GetRotation();
        const r = { x: bodyRot.GetX(), y: bodyRot.GetY(), z: bodyRot.GetZ(), w: bodyRot.GetW() };

        this._rotation = r;
        this._currentRot = { x: r.x, y: r.y, z: r.z, w: r.w };
        this._oldRot = { x: r.x, y: r.y, z: r.z, w: r.w };
    }
}

export { MotionState };
