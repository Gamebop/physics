import { BUFFER_READ_BOOL, BUFFER_READ_FLOAT32, BUFFER_READ_UINT32, BUFFER_WRITE_UINT32, CMD_CHAR_PAIR_BODY, CMD_CHAR_SET_LIN_VEL, CMD_CHAR_SET_MASS, CMD_CHAR_SET_MAX_STR, CMD_CHAR_SET_POS_ROT, CMD_CHAR_SET_REC_SPD, CMD_CHAR_SET_SHAPE, CMD_REPORT_SET_SHAPE, COMPONENT_SYSTEM_CHAR } from '../../../constants.mjs';
import { Debug } from '../../../debug.mjs';

class CharModifier {
    _modifier = null;

    _tracker = null;

    constructor(modifier) {
        this._modifier = modifier;
        this._tracker = modifier.backend.tracker;
    }

    modify(command, cb) {
        switch (command) {
            case CMD_CHAR_PAIR_BODY:
                return this._pairBody(cb);

            case CMD_CHAR_SET_POS_ROT:
                return this._setPosRot(cb);

            case CMD_CHAR_SET_MASS:
                return this._setMass(cb);

            case CMD_CHAR_SET_LIN_VEL:
                return this._setLinVel(cb);

            case CMD_CHAR_SET_SHAPE:
                return this._setShape(cb);

            case CMD_CHAR_SET_MAX_STR:
                return this._setMaxStrength(cb);

            case CMD_CHAR_SET_REC_SPD:
                return this._setPenRecSpeed(cb);
        }

        return false;
    }

    _pairBody(cb) {
        const modifier = this._modifier;
        const tracker = this._tracker;
        const Jolt = modifier.backend.Jolt;
        const char = tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));
        const body = tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));

        char.pairedBody = body;
        body.isCharPaired = true;

        try {
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
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _setMass(cb) {
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));

        try {
            char.SetMass(cb.read(BUFFER_READ_FLOAT32));
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _setPosRot(cb) {
        const m = this._modifier;
        const jv = m.joltVec3_1;
        const jq = m.joltQuat_1;
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));

        try {
            jv.FromBuffer(cb);
            char.SetPosition(jv);
            if (cb.read(BUFFER_READ_BOOL)) {
                jq.FromBuffer(cb);
                char.SetRotation(jq);
            }
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _setLinVel(cb) {
        const jv = this._modifier.joltVec3_1;
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));

        try {
            jv.FromBuffer(cb);
            char.SetLinearVelocity(jv);
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _setShape(cb) {
        const backend = this._modifier.backend;
        const tracker = this._tracker;
        const pcid = cb.read(BUFFER_READ_UINT32);
        const useCallback = cb.read(BUFFER_READ_BOOL);
        const shapeIndex = cb.flag ? cb.read(BUFFER_READ_UINT32) : null;

        const char = tracker.getBodyByPCID(pcid);
        if ($_DEBUG) {
            const ok = Debug.assert(!!char, `Unable to locate character under id: ${pcid}`);
            if (!ok) {
                return false;
            }
        }

        let shape;
        if (shapeIndex != null) {
            shape = tracker.shapeMap.get(shapeIndex);
            if ($_DEBUG) {
                const ok = Debug.assert(!!shape, `Unable to locate shape: ${shapeIndex}`);
                if (!ok) {
                    return false;
                }
            }
        } else {
            shape = char.originalShape;
        }

        let cbIndex;
        if (useCallback) {
            cbIndex = cb.read(BUFFER_READ_UINT32);
        }

        try {
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
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _setMaxStrength(cb) {
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));

        try {
            char.SetMaxStrength(cb.read(BUFFER_READ_FLOAT32));
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _setPenRecSpeed(cb) {
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));

        try {
            char.SetPenetrationRecoverySpeed(cb.read(BUFFER_READ_FLOAT32));
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }
}

export { CharModifier };
