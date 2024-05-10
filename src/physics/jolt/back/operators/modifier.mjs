import { Debug } from '../../debug.mjs';
import { MotionState } from '../motion-state.mjs';
import { ConstraintModifier } from './helpers/constraint-modifier.mjs';
import {
    BUFFER_READ_BOOL, BUFFER_READ_FLOAT32, BUFFER_READ_UINT16, BUFFER_READ_UINT32,
    BUFFER_READ_UINT8, BUFFER_WRITE_UINT32, CMD_ADD_ANGULAR_IMPULSE, CMD_ADD_FORCE,
    CMD_ADD_IMPULSE, CMD_ADD_TORQUE, CMD_APPLY_BUOYANCY_IMPULSE, CMD_CHANGE_GRAVITY,
    CMD_CHAR_SET_LIN_VEL, CMD_CHAR_SET_SHAPE, CMD_MOVE_BODY, CMD_MOVE_KINEMATIC, CMD_PAIR_BODY,
    CMD_REPORT_SET_SHAPE, CMD_RESET_VELOCITIES, CMD_SET_ANG_VEL, CMD_SET_DRIVER_INPUT, CMD_SET_LIN_VEL,
    CMD_SET_MOTION_TYPE, CMD_SET_USER_DATA, CMD_TOGGLE_GROUP_PAIR, CMD_USE_MOTION_STATE,
    COMPONENT_SYSTEM_CHAR
} from '../../constants.mjs';

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
            if ($_DEBUG) {
                Debug.error(e);
            }
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
            if ($_DEBUG) {
                Debug.error(e);
            }
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
        if ($_DEBUG && !char) {
            Debug.warn(`Unable to locate character under id: ${pcid}`);
            return false;
        }

        let shape;
        if (shapeIndex != null) {
            shape = tracker.shapeMap.get(shapeIndex);
            if ($_DEBUG && !shape) {
                Debug.warn(`Unable to locate shape: ${shapeIndex}`);
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

        const ok = char.SetShape(char.originalShape,
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
            if ($_DEBUG) {
                Debug.error(e);
            }
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
            if ($_DEBUG) {
                Debug.error(e);
            }
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
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _resetVelocities(cb) {
        const jv1 = this._joltVec3_1;
        const body = this._getBody(cb);

        try {
            jv1.Set(0, 0, 0);

            body.SetLinearVelocity(jv1);
            body.SetAngularVelocity(jv1);
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
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

            if ($_DEBUG) {
                const type = body.GetMotionType();
                if (type === Jolt.EMotionType_Dynamic || type === Jolt.EMotionType_Kinematic) {
                    backend.bodyInterface.SetPositionAndRotation(body.GetID(), jv, jq, Jolt.Activate);
                } else {
                    Debug.warnOnce('Trying to move a static body.');
                }
            } else {
                backend.bodyInterface.SetPositionAndRotation(body.GetID(), jv, jq, Jolt.Activate);
            }
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
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
            if (body.GetID().GetIndexAndSequenceNumber() === Jolt.wrapPointer(inBodyID, Jolt.BodyID).GetIndexAndSequenceNumber()) {
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

            if ($_DEBUG) {
                const type = body.GetMotionType();
                if (type === Jolt.EMotionType_Dynamic || type === Jolt.EMotionType_Kinematic) {
                    backend.bodyInterface.MoveKinematic(body.GetID(), jv, jq, dt);
                } else {
                    Debug.warnOnce('Trying to move a static body.');
                }
            } else {
                backend.bodyInterface.SetPositionAndRotation(body.GetID(), jv, jq, dt);
            }
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
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

            if ($_DEBUG) {
                let ok = true;
                ok = ok && Debug.assert(!!filter, `Unable to locate filter group: ${group}`);
                ok = ok && Debug.assert(subGroup1 <= filter.maxIndex, `Sub group number is over the filter table size: ${subGroup1}`);
                ok = ok && Debug.assert(subGroup2 <= filter.maxIndex, `Sub group number is over the filter table size: ${subGroup2}`);
                if (!ok) return false;
            }

            if (enable) {
                filter.EnableCollision(subGroup1, subGroup2);
            } else {
                filter.DisableCollision(subGroup1, subGroup2);
            }
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
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

        if ($_DEBUG) {
            const ok = Debug.checkUint(type);
            if (!ok) {
                return false;
            }
        }

        try {
            bodyInterface.SetMotionType(body.GetID(), type, Jolt.Activate);
            tracker.update(body, index);
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _getBody(cb) {
        const index = cb.read(BUFFER_READ_UINT32);
        return this._backend.tracker.getBodyByPCID(index);
    }
}

export { Modifier };
