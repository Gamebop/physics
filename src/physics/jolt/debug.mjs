class Debug {
    static _logged = new Set();

    static call(func) {
        func();
    }

    static log(...attr) {
        console.log(...attr);
    }

    static logOnce(msg, ...attr) {
        if (!Debug._logged.has(msg)) {
            Debug._logged.add(msg);
            console.log(msg, ...attr);
        }
    }

    static warn(...attr) {
        console.warn(...attr);
    }

    static warnOnce(msg, ...attr) {
        if (!Debug._logged.has(msg)) {
            Debug._logged.add(msg);
            console.warn(msg, ...attr);
        }
    }

    static error(...attr) {
        console.error(...attr);
    }

    static errorOnce(...attr) {
        if (!Debug._logged.has(attr[0])) {
            Debug._logged.add(attr[0]);
            Debug.error(...attr);
        }
    }

    static assert(test, msg, value) {
        if (!test) {
            Debug.errorOnce('Assert Error:', msg, value);
            return false;
        }
        return true;
    }

    static checkRange(number, min, max) {
        const msg = 'Invalid numbers range.';
        let ok = Debug.checkFloat(number);
        ok = ok && Debug.assert(number >= min, msg, number);
        ok = ok && Debug.assert(number <= max, msg, number);
        return ok;
    }

    static checkInt(number) {
        const ok = Debug.assert(Number.isInteger(number), 'Invalid integer.', number);
        return ok;
    }

    static checkUint(number) {
        let ok = Debug.checkInt(number);
        ok = ok && Debug.assert(number >= 0, 'Invalid unsigned integer.', number);
        return ok;
    }

    static checkFloat(number) {
        const msg = 'Invalid float.';
        let ok = Debug.assert(typeof number === 'number', msg, number);
        ok = ok && Debug.assert(!isNaN(number), msg, number);
        return ok;
    }

    static checkFloatPositive(number) {
        let ok = Debug.checkFloat(number);
        ok = ok && Debug.assert(number >= 0, 'Invalid unsigned float.', number);
        return ok;
    }

    static checkBool(bool) {
        return Debug.assert((bool === true || bool === false), 'Invalid boolean.', bool);
    }

    static checkVec(vec) {
        let ok = Debug.checkFloat(vec.x);
        ok = ok && Debug.checkFloat(vec.y);
        ok = ok && Debug.checkFloat(vec.z);
        return ok;
    }

    static checkVecPositive(vec) {
        let ok = Debug.checkFloatPositive(vec.x);
        ok = ok && Debug.checkFloatPositive(vec.y);
        ok = ok && Debug.checkFloatPositive(vec.z);
        return ok;
    }

    static checkQuat(quat) {
        let ok = Debug.checkVec(quat);
        ok = ok && Debug.checkFloat(quat.w);
        return ok;
    }

    static checkSpringSettings(settings) {
        let ok = Debug.assert(typeof settings === 'object', 'Invalid settings object for constraint', settings);
        if (settings.springMode != null) {
            ok = ok && Debug.checkFloat(settings.springMode);
        }
        if (settings.frequency != null) {
            ok = ok && Debug.checkFloat(settings.frequency);
        }
        if (settings.stiffness != null) {
            ok = ok && Debug.checkFloat(settings.stiffness);
        }
        if (settings.damping != null) {
            ok = ok && Debug.checkFloat(settings.damping);
        }
        return ok;
    }

    static verifyProperties(data, schema) {
        let ok = true;
        Object.entries(data).forEach((entry) => {
            let found = false;
            for (let i = 0, end = schema.length; i < end; i++) {
                if (entry[0] === schema[i]) {
                    found = true;
                }
            }
            ok = ok && Debug.assert(found, 'Component: Unrecognized options property.', entry);
        });

        return ok;
    }
}

export { Debug };
