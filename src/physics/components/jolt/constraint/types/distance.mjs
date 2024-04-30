import { Constraint, SpringSettings } from "./constraint.mjs";
import {
    BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT8,
    BUFFER_WRITE_VEC32, CMD_JNT_D_SET_DISTANCE, CMD_JNT_D_SET_SPRING_S,
    CONSTRAINT_TYPE_DISTANCE, OPERATOR_MODIFIER, SPRING_MODE_FREQUENCY
} from "../../constants.mjs";

class DistanceConstraint extends Constraint {
    _type = CONSTRAINT_TYPE_DISTANCE;

    _minDistance = -1;

    _maxDistance = -1;

    _limitsSpringSettings = null;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        this._minDistance = opts.minDistance ?? this._minDistance;
        this._maxDistance = opts.maxDistance ?? this._maxDistance;
        
        if (opts.limitsSpringSettings) {
            this._limitsSpringSettings = new SpringSettings(opts.limitsSpringSettings);
        }
    }

    get limitsSpringSettings() {
        return this._limitsSpringSettings;
    }

    set limitsSpringSettings(settings) {
        if (DEBUG) {
            const ok = Debug.checkSpringSettings(settings);
            if (!ok) {
                return;
            }
        }

        this._limitsSpringSettings = settings;

        const mode = settings.springMode ?? SPRING_MODE_FREQUENCY;
        const freqOrStiff = mode === SPRING_MODE_FREQUENCY ?
            settings.frequency : settings.stiffness;

        // TODO
        // needs update after we get rid of flags
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_D_SET_SPRING_S, this._index,
            true, BUFFER_WRITE_BOOL, false,
            settings.springMode, BUFFER_WRITE_UINT8, true,
            freqOrStiff, BUFFER_WRITE_FLOAT32, true,
            settings.damping, BUFFER_WRITE_FLOAT32, true
        );
    }

    get minDistance() {
        return this._minDistance;
    }

    get maxDistance() {
        return this._maxDistance;
    }

    get limitsSpringSettings() {
        return this._limitsSpringSettings;
    }

    write(cb) {
        super.write(cb);

        cb.write(this._point1, BUFFER_WRITE_VEC32);
        cb.write(this._point2, BUFFER_WRITE_VEC32);
        cb.write(this._minDistance, BUFFER_WRITE_FLOAT32);
        cb.write(this._maxDistance, BUFFER_WRITE_FLOAT32);

        Constraint.writeSpringSettings(cb, this._limitsSpringSettings);
    }

    setDistance(min, max) {
        if (DEBUG) {
            let ok = Debug.checkFloat(min, `Invalid min distance for constraint: ${ min }`);
            ok = ok && Debug.checkFloat(max, `Invalid max distance for constraint: ${ max }`);
            ok = ok && Debug.assert(min <= max, `Invalid min/max range: [${ min } : ${ max }]`);
            if (!ok) {
                return;
            }
        }

        this._limitsMin = min;
        this._limitsMax = max;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_D_SET_DISTANCE, this._index,
            min, BUFFER_WRITE_FLOAT32, false,
            max, BUFFER_WRITE_FLOAT32, false
        );
    }    
}

export { DistanceConstraint };