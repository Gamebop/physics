import { Debug } from "../../../physics/debug.mjs";

class Tracker {
    constructor(backend) {
        this.backend = backend;

        // TODO
        // eval: get rid of _dynamic and _kinematic
        this._dynamic = new Set();
        this._kinematic = new Set();

        this._character = new Set();
        this._bodyMap = new Map();
        this._idxMap = new Map();
        this._shapeMap = new Map();
        this._constraintMap = new Map();

        if (Debug.dev) {
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
                    default:
                        break;
                }
            }
        }

        if (Debug.dev && body.debugDraw) {
            this._debug.add(body);
        }

        this._idxMap.set(Jolt.getPointer(body), index);
        this._bodyMap.set(index, body);
    }

    // addCharacter(char, index) {
        
    //     this._idxMap.set(Jolt.getPointer(char), index);
    //     this._bodyMap.set(index, char);

    //     if (Debug.dev && char.debugDraw) {
    //         this._debug.add(char);
    //     }
    // }

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

        if (Debug.dev) {
            this._debug.delete(body);
        }

        const jid = Jolt.getPointer(body);
        const idx = this._idxMap.get(jid);

        this._bodyMap.delete(idx);
        this._idxMap.delete(jid);
    }

    destroy() {
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

        if (Debug.dev) {
            this._debug.clear();
        }
    }
}

export { Tracker };