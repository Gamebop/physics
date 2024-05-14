import { Debug } from '../../../debug.mjs';
import { createSpringSettings } from '../../utils.mjs';
import {
    BUFFER_READ_BOOL, BUFFER_READ_FLOAT32, BUFFER_READ_UINT32, BUFFER_READ_UINT8,
    CMD_JNT_C_SET_H_C_ANGLE, CMD_JNT_D_SET_DISTANCE, CMD_JNT_D_SET_SPRING_S, CMD_JNT_H_SET_LIMITS,
    CMD_JNT_H_SET_M_F_TORQUE, CMD_JNT_H_SET_M_S, CMD_JNT_H_SET_SPRING_S, CMD_JNT_H_SET_T_ANGLE,
    CMD_JNT_H_SET_T_ANG_VEL, CMD_JNT_SDF_SET_M_F, CMD_JNT_SDF_SET_M_STATE,
    CMD_JNT_SDF_SET_R_LIMITS, CMD_JNT_SDF_SET_SPRING_S, CMD_JNT_SDF_SET_T_ANG_VEL_CS,
    CMD_JNT_SDF_SET_T_LIMITS, CMD_JNT_SDF_SET_T_POS_CS, CMD_JNT_SDF_SET_T_ROT_BS,
    CMD_JNT_SDF_SET_T_ROT_CS, CMD_JNT_SDF_SET_T_VEL_CS, CMD_JNT_SET_ENABLED,
    CMD_JNT_ST_SET_M_F_TORQUE, CMD_JNT_ST_SET_N_H_C_ANGLE, CMD_JNT_ST_SET_P_H_C_ANGLE,
    CMD_JNT_ST_SET_SWING_M_S, CMD_JNT_ST_SET_TWIST_M_S, CMD_JNT_ST_SET_T_ANG_VEL_CS,
    CMD_JNT_ST_SET_T_MAX_ANGLE, CMD_JNT_ST_SET_T_MIN_ANGLE, CMD_JNT_ST_SET_T_O_BS,
    CMD_JNT_ST_SET_T_O_CS, CMD_JNT_S_SET_LIMITS, CMD_JNT_S_SET_M_F_FORCE, CMD_JNT_S_SET_M_STATE,
    CMD_JNT_S_SET_SPRING_S, CMD_JNT_S_SET_T_POS, CMD_JNT_S_SET_T_VEL
} from '../../../constants.mjs';

class ConstraintModifier {
    _modifier = null;

    constructor(modifier) {
        this._modifier = modifier;
    }

    modify(command, cb) {
        if (command === CMD_JNT_SET_ENABLED) {
            return this._setConstraintEnabled(cb);
        } else if (command >= 510 && command < 520) {
            return this._updateSwingTwistConstraint(command, cb);
        } else if (command >= 520 && command < 530) {
            return this._updateDistanceConstraint(command, cb);
        } else if (command >= 530 && command < 540) {
            return this._updateHingeConstraint(command, cb);
        } else if (command >= 550 && command < 560) {
            return this._updateSliderConstraint(command, cb);
        } else if (command >= 560 && command < 570) {
            return this._updateConeConstraint(command, cb);
        } else if (command >= 570 && command < 580) {
            return this._updateSixDOFConstraint(command, cb);
        }

        if ($_DEBUG) {
            Debug.warn(`Unrecognized command for constraint modifier: ${command}`);
        }
        return false;
    }

    _setConstraintEnabled(cb) {
        const { tracker, Jolt, bodyInterface } = this._modifier.backend;

        const index = cb.read(BUFFER_READ_UINT32);
        const enabled = cb.read(BUFFER_READ_BOOL);
        const activate = cb.read(BUFFER_READ_BOOL);

        const data = tracker.constraintMap.get(index);

        // An index could be old and constraint might have been already destroyed.
        if (!data) {
            if ($_DEBUG) {
                Debug.warn(`Trying to enable/disable a constraint that has already been destroyed: ${index}`);
            }
            return true;
        }

        try {
            data.constraint.SetEnabled(enabled);

            if (activate) {
                const { body1, body2 } = data;

                if (Jolt.getPointer(data.body1) !== 0) {
                    bodyInterface.ActivateBody(body1.GetID());
                }
                if (Jolt.getPointer(data.body2) !== 0) {
                    bodyInterface.ActivateBody(body2.GetID());
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

    _updateHingeConstraint(command, cb) {
        try {
            const constraint = this._getConstraint(cb, 'HingeConstraint');

            if (constraint) {
                switch (command) {
                    case CMD_JNT_H_SET_M_F_TORQUE:
                        constraint.SetMaxFrictionTorque(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_H_SET_M_S:
                        constraint.SetMotorState(cb.read(BUFFER_READ_UINT8));
                        break;
                    case CMD_JNT_H_SET_T_ANG_VEL:
                        constraint.SetTargetAngularVelocity(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_H_SET_T_ANGLE:
                        constraint.SetTargetAngle(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_H_SET_LIMITS:
                        constraint.SetLimits(cb.read(BUFFER_READ_FLOAT32), cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_H_SET_SPRING_S: {
                        const settings = createSpringSettings(cb, this._modifier.backend.Jolt);
                        constraint.SetLimitsSpringSettings(settings);
                        break;
                    }
                    default:
                        if ($_DEBUG) {
                            Debug.warn(`Unrecognized command for constraint modifier: ${command}`);
                        }
                        return false;
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

    _updateSliderConstraint(command, cb) {
        try {
            const constraint = this._getConstraint(cb, 'SliderConstraint');

            if (constraint) {
                switch (command) {
                    case CMD_JNT_S_SET_M_F_FORCE:
                        constraint.SetMaxFrictionForce(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_S_SET_M_STATE:
                        constraint.SetMotorState(cb.read(BUFFER_READ_UINT8));
                        break;
                    case CMD_JNT_S_SET_T_VEL:
                        constraint.SetTargetVelocity(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_S_SET_T_POS:
                        constraint.SetTargetPosition(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_S_SET_LIMITS:
                        constraint.SetLimits(cb.read(BUFFER_READ_FLOAT32), cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_S_SET_SPRING_S: {
                        const settings = createSpringSettings(cb, this._modifier.backend.Jolt);
                        constraint.SetLimitsSpringSettings(settings);
                        break;
                    }
                    default:
                        if ($_DEBUG) {
                            Debug.warn(`Unrecognized command for constraint modifier: ${command}`);
                        }
                        return false;
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

    _updateSwingTwistConstraint(command, cb) {
        const modifier = this._modifier;

        const jv = modifier.joltVec3_1;
        const jq = modifier.joltQuat;

        try {
            const constraint = this._getConstraint(cb, 'SwingTwistConstraint');

            if (constraint) {
                switch (command) {
                    case CMD_JNT_ST_SET_N_H_C_ANGLE:
                        constraint.SetNormalHalfConeAngle(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_ST_SET_P_H_C_ANGLE:
                        constraint.SetPlaneHalfConeAngle(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_ST_SET_T_MIN_ANGLE:
                        constraint.SetTwistMinAngle(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_ST_SET_T_MAX_ANGLE:
                        constraint.SetTwistMaxAngle(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_ST_SET_M_F_TORQUE:
                        constraint.SetMaxFrictionTorque(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_ST_SET_SWING_M_S:
                        constraint.SetSwingMotorState(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_ST_SET_TWIST_M_S:
                        constraint.SetTwistMotorState(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_ST_SET_T_O_CS:
                        jq.FromBuffer(cb);
                        constraint.SetTargetOrientationCS(jq);
                        break;
                    case CMD_JNT_ST_SET_T_O_BS:
                        jq.FromBuffer(cb);
                        constraint.SetTargetOrientationBS(jq);
                        break;
                    case CMD_JNT_ST_SET_T_ANG_VEL_CS:
                        jv.FromBuffer(cb);
                        constraint.SetTargetAngularVelocityCS(jv);
                        break;
                    default:
                        if ($_DEBUG) {
                            Debug.warn(`Unrecognized command for constraint modifier: ${command}`);
                        }
                        return false;
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

    _updateDistanceConstraint(command, cb) {
        try {
            const constraint = this._getConstraint(cb, 'DistanceConstraint');

            if (constraint) {
                switch (command) {
                    case CMD_JNT_D_SET_DISTANCE:
                        constraint.SetDistance(cb.read(BUFFER_READ_FLOAT32), cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_D_SET_SPRING_S: {
                        const settings = createSpringSettings(cb, this._modifier.backend.Jolt);
                        constraint.SetLimitsSpringSettings(settings);
                        break;
                    }
                    default:
                        if ($_DEBUG) {
                            Debug.warn(`Unrecognized command for constraint modifier: ${command}`);
                        }
                        return false;
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

    _updateConeConstraint(command, cb) {
        try {
            const constraint = this._getConstraint(cb, 'ConeConstraint');

            if (constraint) {
                switch (command) {
                    case CMD_JNT_C_SET_H_C_ANGLE:
                        constraint.SetHalfConeAngle(cb.read(BUFFER_READ_FLOAT32));
                        break;
                    default:
                        if ($_DEBUG) {
                            Debug.warn(`Unrecognized command for constraint modifier: ${command}`);
                        }
                        return false;
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

    _updateSixDOFConstraint(command, cb) {
        const modifier = this._modifier;

        const jv1 = modifier.joltVec3_1;
        const jv2 = modifier.joltVec3_2;
        const jq = modifier.joltQuat;

        try {
            const constraint = this._getConstraint(cb, 'SixDOFConstraint');

            if (constraint) {
                switch (command) {
                    case CMD_JNT_SDF_SET_T_LIMITS:
                        constraint.SetTranslationLimits(jv1.FromBuffer(cb), jv2.FromBuffer(cb));
                        break;
                    case CMD_JNT_SDF_SET_R_LIMITS:
                        constraint.SetRotationLimits(jv1.FromBuffer(cb), jv2.FromBuffer(cb));
                        break;
                    case CMD_JNT_SDF_SET_SPRING_S: {
                        const settings = createSpringSettings(cb, modifier.backend.Jolt);
                        constraint.SetLimitsSpringSettings(cb.read(BUFFER_READ_UINT8), settings);
                        break;
                    }
                    case CMD_JNT_SDF_SET_M_F:
                        constraint.SetMaxFriction(cb.read(BUFFER_READ_UINT8), cb.read(BUFFER_READ_FLOAT32));
                        break;
                    case CMD_JNT_SDF_SET_M_STATE:
                        constraint.SetMotorState(cb.read(BUFFER_READ_UINT8), cb.read(BUFFER_READ_UINT8));
                        break;
                    case CMD_JNT_SDF_SET_T_VEL_CS:
                        constraint.SetTargetVelocityCS(jv1.FromBuffer(cb));
                        break;
                    case CMD_JNT_SDF_SET_T_ANG_VEL_CS:
                        constraint.SetTargetAngularVelocityCS(jv1.FromBuffer(cb));
                        break;
                    case CMD_JNT_SDF_SET_T_POS_CS:
                        constraint.SetTargetPositionCS(jv1.FromBuffer(cb));
                        break;
                    case CMD_JNT_SDF_SET_T_ROT_CS:
                        constraint.SetTargetOrientationCS(jq.FromBuffer(cb));
                        break;
                    case CMD_JNT_SDF_SET_T_ROT_BS:
                        constraint.SetTargetOrientationBS(jq.FromBuffer(cb));
                        break;
                    default:
                        if ($_DEBUG) {
                            Debug.warn(`Unrecognized command for constraint modifier: ${command}`);
                        }
                        return false;
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

    _getConstraint(cb, type) {
        const index = cb.read(BUFFER_READ_UINT32);
        const { tracker, Jolt } = this._modifier.backend;
        const data = tracker.constraintMap.get(index);
        return data && Jolt.castObject(data.constraint, Jolt[type]);
    }
}

export { ConstraintModifier };
