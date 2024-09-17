import { Debug } from '../../../debug.mjs';
import {
    BUFFER_READ_BOOL, BUFFER_READ_FLOAT32, BUFFER_READ_UINT32, CMD_CHAR_SET_HIT_RED_ANGLE,
    CMD_CHAR_PAIR_BODY, CMD_CHAR_SET_LIN_VEL, CMD_CHAR_SET_MASS, CMD_CHAR_SET_MAX_STR,
    CMD_CHAR_SET_NUM_HITS, CMD_CHAR_SET_POS_ROT, CMD_CHAR_SET_REC_SPD, CMD_CHAR_SET_SHAPE,
    CMD_REPORT_SET_SHAPE, COMPONENT_SYSTEM_CHAR, CMD_CHAR_SET_SHAPE_OFFSET, CMD_CHAR_SET_USER_DATA,
    CMD_CHAR_SET_UP, BUFFER_WRITE_BOOL, BUFFER_READ_UINT16, BUFFER_WRITE_UINT16,
    CMD_CHAR_SET_BP_FILTER_LAYER, BP_LAYER_MOVING, OBJ_LAYER_MOVING, CMD_CHAR_SET_OBJ_FILTER_LAYER,
    CMD_CHAR_SET_COS_ANGLE, CMD_CHAR_SET_MIN_DIST, CMD_CHAR_SET_TEST_DIST, CMD_CHAR_SET_EXTRA_DOWN,
    CMD_CHAR_SET_STEP_UP, CMD_CHAR_SET_STICK_DOWN,
    CMD_CHAR_UPDATE_BIT_FILTER
} from '../../../constants.mjs';
import { Cleaner } from '../cleaner.mjs';

class CharModifier {
    _modifier = null;

    _tracker = null;

    constructor(modifier) {
        this._modifier = modifier;
        this._tracker = modifier.backend.tracker;
        this._cleaner = modifier.backend.cleaner;
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

            case CMD_CHAR_SET_NUM_HITS:
                return this._setMaxNumHits(cb);

            case CMD_CHAR_SET_HIT_RED_ANGLE:
                return this._setHitReductionAngle(cb);

            case CMD_CHAR_SET_SHAPE_OFFSET:
                return this._setShapeOffset(cb);

            case CMD_CHAR_SET_USER_DATA:
                return this._setUserData(cb);

            case CMD_CHAR_SET_UP:
                return this._setUp(cb);

            case CMD_CHAR_SET_BP_FILTER_LAYER:
                return this._setBPFilterLayer(cb);

            case CMD_CHAR_SET_OBJ_FILTER_LAYER:
                return this._setObjFilterLayer(cb);
            
            case CMD_CHAR_UPDATE_BIT_FILTER:
                return this._updateBitFilter(cb);

            case CMD_CHAR_SET_COS_ANGLE:
                return this._setCosAngle(cb);

            case CMD_CHAR_SET_MIN_DIST:
                return this._setMinDist(cb);

            case CMD_CHAR_SET_TEST_DIST:
                return this._setTestDist(cb);

            case CMD_CHAR_SET_EXTRA_DOWN:
                return this._setExtraDown(cb);

            case CMD_CHAR_SET_STEP_UP:
                return this._setStepUp(cb);

            case CMD_CHAR_SET_STICK_DOWN:
                return this._setStickDown(cb);
        }

        if ($_DEBUG) {
            Debug.warn('Unrecognized char modifier command.');
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
        const shapeIndex = cb.flag ? cb.read(BUFFER_READ_UINT32) : null;

        const char = tracker.getBodyByPCID(pcid);
        if ($_DEBUG) {
            const ok = Debug.assert(!!char, `Unable to locate character under id: ${pcid}`);
            if (!ok) {
                return false;
            }

            // invalidate current debug draw, so we draw a new shape instead
            Cleaner.cleanDebugDrawData(char, backend.Jolt);
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

        const cbIndex = cb.read(BUFFER_READ_UINT16);

        try {
            const ok = char.SetShape(shape,
                                     backend.config.penetrationSlop * 1.5,
                                     backend.bpFilter,
                                     backend.objFilter,
                                     backend.bodyFilter,
                                     backend.shapeFilter,
                                     backend.joltInterface.GetTempAllocator());

            const outBuffer = backend.outBuffer;
            outBuffer.writeOperator(COMPONENT_SYSTEM_CHAR);
            outBuffer.writeCommand(CMD_REPORT_SET_SHAPE);
            outBuffer.write(cbIndex, BUFFER_WRITE_UINT16, false);
            outBuffer.write(ok, BUFFER_WRITE_BOOL, false);
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

    _setMaxNumHits(cb) {
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));

        try {
            char.SetMaxNumHits(cb.read(BUFFER_READ_FLOAT32));
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _setHitReductionAngle(cb) {
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));

        try {
            char.GetHitReductionCosMaxAngle(cb.read(BUFFER_READ_FLOAT32));
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _setShapeOffset(cb) {
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));
        const jv = this._modifier.joltVec3_1;

        try {
            jv.FromBuffer(cb);
            char.SetShapeOffset(jv);
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _setUserData(cb) {
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));

        try {
            char.SetUserData(cb.read(BUFFER_READ_FLOAT32));
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _setUp(cb) {
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));
        const jv = this._modifier.joltVec3_1;

        try {
            jv.FromBuffer(cb);
            char.SetUp(jv);
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _setBPFilterLayer(cb) {
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));
        const backend = this._modifier.backend;

        try {
            if (char.bpFilter) {
                Jolt.destroy(char.bpFilter);
            }

            const layer = cb.read(BUFFER_READ_UINT16);
            char.bpFilter = layer !== BP_LAYER_MOVING ?
                new backend.Jolt.DefaultBroadPhaseLayerFilter(
                    backend.joltInterface.GetObjectVsBroadPhaseLayerFilter(), layer) : null;
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _setObjFilterLayer(cb) {
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));
        const backend = this._modifier.backend;

        try {
            if (char.objFilter) {
                Jolt.destroy(char.objFilter);
            }

            const layer = cb.read(BUFFER_READ_UINT16);
            char.objFilter = layer !== OBJ_LAYER_MOVING ?
                new backend.Jolt.DefaultObjectLayerFilter(
                    backend.joltInterface.GetObjectLayerPairFilter(), layer) : null;
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _setObjFilterLayer(cb) {
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));
        const backend = this._modifier.backend;
        const Jolt = backend.Jolt;

        const group = cb.read(BUFFER_READ_UINT32);
        const mask = cb.read(BUFFER_READ_UINT32);

        if (!backend.config.bitFiltering) {
            return;
        }

        try {
            if (char.objFilter) {
                Jolt.destroy(char.objFilter);
            }

            const objectLayer = Jolt.ObjectLayerPairFilterMask.prototype.sGetObjectLayer(group, mask);
            char.objFilter = new Jolt.DefaultObjectLayerFilter(
                    backend.joltInterface.GetObjectLayerPairFilter(), objectLayer);
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _setCosAngle(cb) {
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));
        char.updateSettings.mWalkStairsCosAngleForwardContact = cb.read(BUFFER_READ_FLOAT32);
        return true;
    }

    _setMinDist(cb) {
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));
        char.updateSettings.mWalkStairsMinStepForward = cb.read(BUFFER_READ_FLOAT32);
        return true;
    }

    _setTestDist(cb) {
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));
        char.updateSettings.mWalkStairsStepForwardTest = cb.read(BUFFER_READ_FLOAT32);
        return true;
    }

    _setExtraDown(cb) {
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));

        try {
            char.updateSettings.mWalkStairsStepDownExtra.FromBuffer(cb);
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _setStepUp(cb) {
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));

        try {
            char.updateSettings.mWalkStairsStepUp.FromBuffer(cb);
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        return true;
    }

    _setStickDown(cb) {
        const char = this._tracker.getBodyByPCID(cb.read(BUFFER_READ_UINT32));

        try {
            char.updateSettings.mStickToFloorStepDown.FromBuffer(cb);
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
