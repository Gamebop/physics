import { Debug } from '../debug.mjs';
import {
    BUFFER_READ_BOOL, BUFFER_READ_FLOAT32, BUFFER_READ_UINT8, CONSTRAINT_SIX_DOF_ROTATION_X,
    CONSTRAINT_SIX_DOF_ROTATION_Y, CONSTRAINT_SIX_DOF_ROTATION_Z, CONSTRAINT_SIX_DOF_TRANSLATION_X,
    CONSTRAINT_SIX_DOF_TRANSLATION_Y, CONSTRAINT_SIX_DOF_TRANSLATION_Z, SPRING_MODE_FREQUENCY
} from '../constants.mjs';

function createSpringSettings(cb, Jolt) {
    const springSettings = new Jolt.SpringSettings();
    const mode = cb.flag ? cb.read(BUFFER_READ_UINT8) : SPRING_MODE_FREQUENCY;
    const isFrequencyMode = mode === SPRING_MODE_FREQUENCY;
    springSettings.mMode = isFrequencyMode ?
        Jolt.ESpringMode_FrequencyAndDamping : Jolt.ESpringMode_StiffnessAndDamping;
    if (isFrequencyMode) {
        if (cb.flag) springSettings.mFrequency = cb.read(BUFFER_READ_FLOAT32);
    } else {
        if (cb.flag) springSettings.mStiffness = cb.read(BUFFER_READ_FLOAT32);
    }
    if (cb.flag) springSettings.mDamping = cb.read(BUFFER_READ_FLOAT32);
    return springSettings;
}

function createMotorSettings(cb, Jolt) {
    const motorSettings = new Jolt.MotorSettings();
    if (cb.read(BUFFER_READ_BOOL)) {
        const springsSettings = createSpringSettings(cb, Jolt);
        motorSettings.mSpringSettings = springsSettings;
        Jolt.destroy(springsSettings);
    }
    if (cb.flag) motorSettings.mMinForceLimit = cb.read(BUFFER_READ_FLOAT32);
    if (cb.flag) motorSettings.mMaxForceLimit = cb.read(BUFFER_READ_FLOAT32);
    if (cb.flag) motorSettings.mMinTorqueLimit = cb.read(BUFFER_READ_FLOAT32);
    if (cb.flag) motorSettings.mMaxTorqueLimit = cb.read(BUFFER_READ_FLOAT32);

    return motorSettings;
}

function setSixDOFAxes(cb, settings, type, Jolt, isLimited) {
    const count = cb.read(BUFFER_READ_UINT8);
    for (let i = 0; i < count; i++) {
        const axis = cb.read(BUFFER_READ_UINT8);
        const min = isLimited ? cb.read(BUFFER_READ_FLOAT32) : null;
        const max = isLimited ? cb.read(BUFFER_READ_FLOAT32) : null;

        switch (axis) {
            case CONSTRAINT_SIX_DOF_TRANSLATION_X:
                if (isLimited) {
                    settings[type](Jolt.SixDOFConstraintSettings_EAxis_TranslationX, min, max);
                } else {
                    settings[type](Jolt.SixDOFConstraintSettings_EAxis_TranslationX);
                }
                break;

            case CONSTRAINT_SIX_DOF_TRANSLATION_Y:
                if (isLimited) {
                    settings[type](Jolt.SixDOFConstraintSettings_EAxis_TranslationY, min, max);
                } else {
                    settings[type](Jolt.SixDOFConstraintSettings_EAxis_TranslationY);
                }
                break;

            case CONSTRAINT_SIX_DOF_TRANSLATION_Z:
                if (isLimited) {
                    settings[type](Jolt.SixDOFConstraintSettings_EAxis_TranslationZ, min, max);
                } else {
                    settings[type](Jolt.SixDOFConstraintSettings_EAxis_TranslationZ);
                }
                break;

            case CONSTRAINT_SIX_DOF_ROTATION_X:
                if (isLimited) {
                    settings[type](Jolt.SixDOFConstraintSettings_EAxis_RotationX, min, max);
                } else {
                    settings[type](Jolt.SixDOFConstraintSettings_EAxis_RotationX);
                }
                break;

            case CONSTRAINT_SIX_DOF_ROTATION_Y:
                if (isLimited) {
                    settings[type](Jolt.SixDOFConstraintSettings_EAxis_RotationY, min, max);
                } else {
                    settings[type](Jolt.SixDOFConstraintSettings_EAxis_RotationY);
                }
                break;

            case CONSTRAINT_SIX_DOF_ROTATION_Z:
                if (isLimited) {
                    settings[type](Jolt.SixDOFConstraintSettings_EAxis_RotationZ, min, max);
                } else {
                    settings[type](Jolt.SixDOFConstraintSettings_EAxis_RotationZ);
                }
                break;

            default:
                if ($_DEBUG) {
                    Debug.error(`Unrecognized six dof constraint axis setting: ${axis}`);
                }
                return false;
        }
    }
}

export { createSpringSettings, createMotorSettings, setSixDOFAxes };
