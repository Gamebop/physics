class Debug {
    static _logged = new Set();

    static dev = (process.env.NODE_ENV === 'development');

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

    static assert(test, ...attr) {
        if (!test) {
            Debug.errorOnce('Assert Error:', test, ...attr);
            return false;
        }
        return true;
    }

    static checkRange(number, min, max, msg) {
        let ok = Debug.checkFloat(number, msg);
        ok = ok && Debug.assert(number >= min, msg);
        ok = ok && Debug.assert(number <= max, msg);
        return ok;
    }   

    static checkInt(number, msg) {
        const ok = Debug.assert(Number.isInteger(number), msg);
        return ok;
    }    

    static checkUint(number, msg) {
        let ok = Debug.checkInt(number, msg);
        ok = ok && Debug.assert(number >= 0, msg);
        return ok;
    }

    static checkFloat(number, msg) {
        let ok = Debug.assert(typeof number === 'number', msg);
        ok = ok && Debug.assert(!isNaN(number), msg);
        return ok;
    }

    static checkFloatPositive(number, msg) {
        let ok = Debug.checkFloat(number, msg);
        ok = ok && Debug.assert(number >= 0, msg);
        return ok;
    }

    static checkBool(bool, msg) {
        return Debug.assert((bool === true || bool === false), msg);
    }

    static checkVec(vec, msg) {
        let ok = Debug.checkFloat(vec.x, msg);
        ok = ok && Debug.checkFloat(vec.y, msg);
        ok = ok && Debug.checkFloat(vec.z, msg);
        return ok;
    }

    static checkVecPositive(vec, msg) {
        let ok = Debug.checkFloatPositive(vec.x, msg);
        ok = ok && Debug.checkFloatPositive(vec.y, msg);
        ok = ok && Debug.checkFloatPositive(vec.z, msg);
        return ok;
    }

    static checkQuat(quat, msg) {
        let ok = true;
        ok = ok && Debug.checkVec(quat, msg);
        ok = ok && Debug.checkFloat(quat.w, msg);
        return ok;
    }

    static verifyProperties(data, schema) {
        let ok = true;
        Object.entries(data).forEach(entry => {
            let found = false;
            for (let i = 0, end = schema.length; i < end; i++) {
                if (entry[0] === schema[i]) {
                    found = true;
                }
            }
            ok = ok && Debug.assert(found, `Component: Unrecognized options property: ${ entry }`);
        });

        return ok;
    }
}

export { Debug };