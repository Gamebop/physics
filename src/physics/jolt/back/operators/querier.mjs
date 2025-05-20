import {
    BFM_IGNORE_BACK_FACES, BUFFER_READ_BOOL, BUFFER_READ_FLOAT32, BUFFER_READ_INT32, BUFFER_READ_UINT32,
    BUFFER_READ_UINT8, BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_INT32, BUFFER_WRITE_JOLTVEC32,
    BUFFER_WRITE_UINT16, BUFFER_WRITE_UINT32, CMD_CAST_RAY, CMD_CAST_SHAPE, CMD_COLLIDE_POINT,
    CMD_COLLIDE_SHAPE_IDX, COMPONENT_SYSTEM_MANAGER
} from '../../constants.mjs';
import { Debug } from '../../debug.mjs';

function writeRayHit(cb, system, tracker, cast, calculateNormal, hit, Jolt) {
    const body = system.GetBodyLockInterfaceNoLock().TryGetBody(hit.mBodyID);
    const point = cast.GetPointOnRay(hit.mFraction);
    const normal = calculateNormal ? body.GetWorldSpaceSurfaceNormal(hit.mSubShapeID2, point) : null;

    const index = tracker.getPCID(Jolt.getPointer(body));
    cb.write(index, BUFFER_WRITE_UINT32, false);
    cb.write(point, BUFFER_WRITE_JOLTVEC32, false);
    cb.write(hit.mFraction, BUFFER_WRITE_FLOAT32, false);
    cb.write(normal, BUFFER_WRITE_JOLTVEC32);

    if (normal) {
        Jolt.destroy(normal);
    }
}

function writeCollideShapeHit(cb, system, tracker, calculateNormal, hit, Jolt) {
    const body = system.GetBodyLockInterfaceNoLock().TryGetBody(hit.mBodyID2);
    const index = tracker.getPCID(Jolt.getPointer(body));

    const normal = calculateNormal ? body.GetWorldSpaceSurfaceNormal(hit.mSubShapeID2, hit.mContactPointOn2) : null;

    cb.write(index, BUFFER_WRITE_UINT32, false);
    cb.write(hit.mContactPointOn1, BUFFER_WRITE_JOLTVEC32, false);
    cb.write(hit.mContactPointOn2, BUFFER_WRITE_JOLTVEC32, false);
    cb.write(hit.mPenetrationAxis, BUFFER_WRITE_JOLTVEC32, false);
    cb.write(hit.mPenetrationDepth, BUFFER_WRITE_FLOAT32, false);
    // collide shape query doesn't have fraction
    cb.write(hit.mFraction, BUFFER_WRITE_FLOAT32);
    cb.write(normal, BUFFER_WRITE_JOLTVEC32);

    if (normal) {
        Jolt.destroy(normal);
    }
}

let collidePointResult;
let params = [];

class Querier {
    constructor(backend) {
        this._backend = backend;

        const Jolt = backend.Jolt;

        // TODO
        // refactor to lazy allocate

        this._rayCast = new Jolt.RRayCast();
        this._rayCastSettings = new Jolt.RayCastSettings();
        this._tempVectors = [
            new Jolt.Quat(), new Jolt.Vec3(), new Jolt.Vec3(),
            new Jolt.Vec3(), new Jolt.Vec3(), new Jolt.Vec3()
        ];

        this._shapeCastSettings = new Jolt.ShapeCastSettings();
        this._collideShapeSettings = null;

        this._collectorRayFirst = new Jolt.CastRayClosestHitCollisionCollector();
        this._collectorRayAll = new Jolt.CastRayAllHitCollisionCollector();
        this._collectorPoint = null;
        this._collectorCollideShapeFirst = null;
        this._collectorCollideShapeAll = null;
        this._ignoreSensorsBodyFilter = null;

        this._collectorShapeFirst = new Jolt.CastShapeClosestHitCollisionCollector();
        this._collectorShapeAll = new Jolt.CastShapeAllHitCollisionCollector();

        this._bodies = [];
    }

    query() {
        const cb = this._backend.inBuffer;
        const command = cb.readCommand();
        let ok = true;

        switch (command) {
            case CMD_CAST_RAY:
                ok = this._castRay(cb, false);
                break;

            case CMD_CAST_SHAPE:
                ok = this._castShape(cb, false);
                break;

            case CMD_COLLIDE_POINT:
                ok = this._collidePoint(cb, false);
                break;

            case CMD_COLLIDE_SHAPE_IDX:
                ok = this._collideShapeIdx(cb, false);
                break;

            default:
                if ($_DEBUG) {
                    Debug.error(`Invalid querier command: ${command}`);
                }
                return false;
        }

        return ok;
    }

    immediateQuery(cb) {
        const command = cb.readCommand();
        switch (command) {
            case CMD_CAST_RAY:
                return this._castRay(cb, true);

            case CMD_CAST_SHAPE:
                return this._castShape(cb, true);

            case CMD_COLLIDE_POINT:
                return this._collidePoint(cb, true);

            case CMD_COLLIDE_SHAPE_IDX:
                return this._collideShapeIdx(cb, true);

            default:
                if ($_DEBUG) {
                    Debug.error(`Invalid querier command: ${command}`);
                }
                break;
        }
    }

    destroy() {
        this._tempVectors.forEach((vector) => {
            Jolt.destroy(vector);
        });
        this._tempVectors.length = 0;

        Jolt.destroy(this._rayCast);
        this._rayCast = null;

        Jolt.destroy(this._rayCastSettings);
        this._rayCastSettings = null;

        Jolt.destroy(this._shapeCastSettings);
        this._shapeCastSettings = null;

        Jolt.destroy(this._collectorRayFirst);
        this._collectorRayFirst = null;

        Jolt.destroy(this._collectorRayAll);
        this._collectorRayAll = null;

        if (this._collectorPoint) {
            Jolt.destroy(this._collectorPoint);
            this._collectorPoint = null;
        }

        if (this._collectorCollideShapeFirst) {
            Jolt.destroy(this._collectorCollideShapeFirst);
            this._collectorCollideShapeFirst = null;
        }

        if (this._collectorCollideShapeAll) {
            Jolt.destroy(this._collectorCollideShapeAll);
            this._collectorCollideShapeAll = null;
        }

        if (this._ignoreSensorsBodyFilter) {
            Jolt.destroy(this._ignoreSensorsBodyFilter);
            this._ignoreSensorsBodyFilter = null;
        }

        this._commandsBuffer.destroy();
        this._commandsBuffer = null;

        collidePointResult = null;

        params.length = 0;
        params = undefined;
    }

    _castRay(cb, immediate) {
        const backend = this._backend;
        const castSettings = this._rayCastSettings;
        const jv = this._tempVectors[1];
        const cast = this._rayCast;
        const buffer = immediate ? backend.immediateBuffer : backend.outBuffer;
        const tracker = backend.tracker;
        const system = backend.physicsSystem;
        const Jolt = backend.Jolt;
        const joltInterface = backend.joltInterface;

        buffer.writeOperator(COMPONENT_SYSTEM_MANAGER);
        buffer.writeCommand(CMD_CAST_RAY);

        const queryIndex = cb.read(BUFFER_READ_INT32);
        buffer.write(queryIndex, BUFFER_WRITE_INT32, false);

        try {
            jv.FromBuffer(cb);
            cast.mOrigin = jv;

            jv.FromBuffer(cb);
            cast.mDirection = jv;

            const firstOnly = cb.flag ? cb.read(BUFFER_READ_BOOL) : true;
            const calculateNormal = cb.flag ? cb.read(BUFFER_READ_BOOL) : false;
            const ignoreBackFaces = cb.flag ? cb.read(BUFFER_READ_BOOL) : true;
            const solidConvex = cb.flag ? cb.read(BUFFER_READ_BOOL) : true;
            const ignoreSensors = cb.flag ? cb.read(BUFFER_READ_BOOL) : false;
            const collector = firstOnly ? this._collectorRayFirst : this._collectorRayAll;

            let bodyFilter;
            if (ignoreSensors) {
                bodyFilter = this._ignoreSensorsBodyFilter;
                if (!bodyFilter) {
                    this._createIgnoreSensorsBodyFilter(system);
                    bodyFilter = this._ignoreSensorsBodyFilter;
                }
            } else {
                bodyFilter = backend.bodyFilter;
            }

            castSettings.mBackFaceMode = ignoreBackFaces ? Jolt.EBackFaceMode_IgnoreBackFaces : Jolt.EBackFaceMode_CollideWithBackFaces;
            castSettings.mTreatConvexAsSolid = solidConvex;

            const customBPFilter = cb.flag;
            const bpFilter = customBPFilter ? new Jolt.DefaultBroadPhaseLayerFilter(joltInterface.GetObjectVsBroadPhaseLayerFilter(), cb.read(BUFFER_READ_UINT32)) : backend.bpFilter;

            const customObjFilter = cb.flag;
            const objFilter = customObjFilter ? new Jolt.DefaultObjectLayerFilter(joltInterface.GetObjectLayerPairFilter(), cb.read(BUFFER_READ_UINT32)) : backend.objFilter;

            system.GetNarrowPhaseQuery().CastRay(cast, castSettings, collector, bpFilter, objFilter, bodyFilter, backend.shapeFilter);

            if (firstOnly) {
                if (collector.HadHit()) {
                    buffer.write(1, BUFFER_WRITE_UINT16, false); // hits count
                    writeRayHit(buffer, system, tracker, cast, calculateNormal, collector.mHit, Jolt);
                } else {
                    buffer.write(0, BUFFER_WRITE_UINT16, false); // hits count
                }
            } else {
                const hits = collector.mHits;
                const count = hits.size();
                buffer.write(count, BUFFER_WRITE_UINT16, false); // hits count
                for (let i = 0; i < count; i++) {
                    writeRayHit(buffer, system, tracker, cast, calculateNormal, hits.at(i), Jolt);
                }
            }

            collector.Reset();

            if (customBPFilter) {
                Jolt.destroy(bpFilter);
            }

            if (customObjFilter) {
                Jolt.destroy(objFilter);
            }
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        if (immediate) {
            return buffer;
        }

        return true;
    }

    _castShape(cb, immediate) {
        const backend = this._backend;
        const buffer = immediate ? backend.immediateBuffer : backend.outBuffer;
        const tempVectors = this._tempVectors;
        const scale = tempVectors[1];
        const direction = tempVectors[2];
        const position = tempVectors[3];
        const offset = tempVectors[4];
        const rotation = tempVectors[0];
        const castSettings = this._shapeCastSettings;
        const tracker = backend.tracker;
        const system = backend.physicsSystem;
        const Jolt = backend.Jolt;
        const joltInterface = backend.joltInterface;

        buffer.writeOperator(COMPONENT_SYSTEM_MANAGER);
        buffer.writeCommand(CMD_CAST_SHAPE);

        const queryIndex = cb.read(BUFFER_READ_INT32);
        buffer.write(queryIndex, BUFFER_WRITE_INT32, false);

        try {
            position.FromBuffer(cb);
            rotation.FromBuffer(cb);
            direction.FromBuffer(cb);
            if (cb.flag) {
                scale.FromBuffer(cb);
            } else {
                scale.Set(1, 1, 1);
            }
            if (cb.flag) {
                offset.FromBuffer(cb);
            } else {
                offset.Set(0, 0, 0);
            }
            if (cb.flag) {
                castSettings.mBackFaceModeTriangles = cb.read(BUFFER_READ_UINT8) === BFM_IGNORE_BACK_FACES ?
                    Jolt.EBackFaceMode_IgnoreBackFaces : Jolt.EBackFaceMode_CollideWithBackFaces;
            }
            if (cb.flag) {
                castSettings.mBackFaceModeConvex = cb.read(BUFFER_READ_UINT8) === BFM_IGNORE_BACK_FACES ?
                    Jolt.EBackFaceMode_IgnoreBackFaces : Jolt.EBackFaceMode_CollideWithBackFaces;
            }
            if (cb.flag) castSettings.mUseShrunkenShapeAndConvexRadius = cb.read(BUFFER_READ_BOOL);
            if (cb.flag) castSettings.mReturnDeepestPoint = cb.read(BUFFER_READ_BOOL);

            const firstOnly = cb.flag ? cb.read(BUFFER_READ_BOOL) : true;
            buffer.write(firstOnly, BUFFER_WRITE_BOOL, false);

            const calculateNormal = cb.flag ? cb.read(BUFFER_READ_BOOL) : false;
            const ignoreSensors = cb.flag ? cb.read(BUFFER_READ_BOOL) : false;
            const collector = firstOnly ? this._collectorShapeFirst : this._collectorShapeAll;
            const shapeIndex = cb.read(BUFFER_READ_UINT32);

            params.length = 0;

            const shape = tracker.shapeMap.get(shapeIndex);
            if ($_DEBUG && !shape) {
                Debug.warn(`Unable to locate shape for shape cast: ${shapeIndex}`);
                return false;
            }

            const transform = Jolt.Mat44.prototype.sRotationTranslation(rotation, position);
            const shapeCast = new Jolt.RShapeCast(shape, scale, transform, direction);

            let bodyFilter;
            if (ignoreSensors) {
                bodyFilter = this._ignoreSensorsBodyFilter;
                if (!bodyFilter) {
                    this._createIgnoreSensorsBodyFilter(system);
                    bodyFilter = this._ignoreSensorsBodyFilter;
                }
            } else {
                bodyFilter = backend.bodyFilter;
            }

            const customBPFilter = cb.flag;
            const bpFilter = customBPFilter ? new Jolt.DefaultBroadPhaseLayerFilter(joltInterface.GetObjectVsBroadPhaseLayerFilter(), cb.read(BUFFER_READ_UINT32)) : backend.bpFilter;

            const customObjFilter = cb.flag;
            const objFilter = customObjFilter ? new Jolt.DefaultObjectLayerFilter(joltInterface.GetObjectLayerPairFilter(), cb.read(BUFFER_READ_UINT32)) : backend.objFilter;

            system.GetNarrowPhaseQuery().CastShape(shapeCast, castSettings, offset, collector, bpFilter, objFilter, bodyFilter, backend.shapeFilter);

            if (firstOnly) {
                if (collector.HadHit()) {
                    buffer.write(1, BUFFER_WRITE_UINT16, false); // hits count
                    writeCollideShapeHit(buffer, system, tracker, calculateNormal, collector.mHit, Jolt);
                } else {
                    buffer.write(0, BUFFER_WRITE_UINT16, false); // hits count
                }
            } else {
                const hits = collector.mHits;
                const count = hits.size();
                buffer.write(count, BUFFER_WRITE_UINT16, false); // hits count
                for (let i = 0; i < count; i++) {
                    writeCollideShapeHit(buffer, system, tracker, calculateNormal, hits.at(i), Jolt);
                }
            }

            collector.Reset();

            Jolt.destroy(shapeCast);

            // TODO
            // don't destroy custom filters, a game is usually creating those once and using forever
            // we should store them in a map, which is cleared in the end of lifecycle

            if (customBPFilter) {
                Jolt.destroy(bpFilter);
            }

            if (customObjFilter) {
                Jolt.destroy(objFilter);
            }

        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        if (immediate) {
            return buffer;
        }

        return true;
    }

    _collidePoint(cb, immediate) {
        const backend = this._backend;
        const jv = this._tempVectors[1];
        const buffer = immediate ? backend.immediateBuffer : backend.outBuffer;
        const tracker = backend.tracker;
        const system = backend.physicsSystem;
        const Jolt = backend.Jolt;
        const joltInterface = backend.joltInterface;

        buffer.writeOperator(COMPONENT_SYSTEM_MANAGER);
        buffer.writeCommand(CMD_COLLIDE_POINT);

        const queryIndex = cb.read(BUFFER_READ_INT32);
        buffer.write(queryIndex, BUFFER_WRITE_INT32, false);

        if (!collidePointResult) {
            collidePointResult = [];
        }
        collidePointResult.length = 0;

        try {
            let collector = this._collectorPoint;
            if (!collector) {
                collector = this._collectorPoint = new Jolt.CollidePointCollectorJS();
                collector.Reset = function () {
                    collector.ResetEarlyOutFraction();
                };
                collector.AddHit = function () {};
                collector.OnBody = function (bodyPointer) {
                    collidePointResult.push(tracker.getPCID(bodyPointer));
                };
            }

            const ignoreSensors = cb.flag ? cb.read(BUFFER_READ_BOOL) : false;

            let bodyFilter;
            if (ignoreSensors) {
                bodyFilter = this._ignoreSensorsBodyFilter;
                if (!bodyFilter) {
                    this._createIgnoreSensorsBodyFilter(system);
                    bodyFilter = this._ignoreSensorsBodyFilter;
                }
            } else {
                bodyFilter = backend.bodyFilter;
            }

            const customBPFilter = cb.flag;
            const bpFilter = customBPFilter ? new Jolt.DefaultBroadPhaseLayerFilter(joltInterface.GetObjectVsBroadPhaseLayerFilter(), cb.read(BUFFER_READ_UINT32)) : backend.bpFilter;

            const customObjFilter = cb.flag;
            const objFilter = customObjFilter ? new Jolt.DefaultObjectLayerFilter(joltInterface.GetObjectLayerPairFilter(), cb.read(BUFFER_READ_UINT32)) : backend.objFilter;

            jv.FromBuffer(cb);
            system.GetNarrowPhaseQuery().CollidePoint(jv, collector, bpFilter, objFilter, bodyFilter, backend.shapeFilter);
            collector.Reset();

            if (customBPFilter) {
                Jolt.destroy(customBPFilter);
            }

            if (customObjFilter) {
                Jolt.destroy(customObjFilter);
            }
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        const count = collidePointResult.length;
        buffer.write(count, BUFFER_WRITE_UINT16, false);
        for (let i = 0; i < count; i++) {
            buffer.write(collidePointResult[i], BUFFER_WRITE_UINT32, false);
        }

        if (immediate) {
            return buffer;
        }

        return true;
    }

    _collideShapeIdx(cb, immediate) {
        const backend = this._backend;
        const buffer = immediate ? backend.immediateBuffer : backend.outBuffer;
        const jq = this._tempVectors[0];
        const jv1 = this._tempVectors[1];
        const jv2 = this._tempVectors[2];
        const jv3 = this._tempVectors[3];
        const tracker = backend.tracker;
        const system = backend.physicsSystem;
        const Jolt = backend.Jolt;
        const joltInterface = backend.joltInterface;

        buffer.writeOperator(COMPONENT_SYSTEM_MANAGER);
        buffer.writeCommand(CMD_COLLIDE_SHAPE_IDX);

        const queryIndex = cb.read(BUFFER_READ_INT32);
        buffer.write(queryIndex, BUFFER_WRITE_INT32, false);

        const firstOnly = cb.flag ? cb.read(BUFFER_READ_BOOL) : true;
        buffer.write(firstOnly, BUFFER_WRITE_BOOL, false);

        const ignoreSensors = cb.flag ? cb.read(BUFFER_READ_BOOL) : false;

        let bodyFilter;
        if (ignoreSensors) {
            bodyFilter = this._ignoreSensorsBodyFilter;
            if (!bodyFilter) {
                this._createIgnoreSensorsBodyFilter(system);
                bodyFilter = this._ignoreSensorsBodyFilter;
            }
        } else {
            bodyFilter = backend.bodyFilter;
        }

        try {
            let collector = firstOnly ? this._collectorCollideShapeFirst : this._collectorCollideShapeAll;
            if (!collector) {
                if (firstOnly) {
                    collector = this._collectorCollideShapeFirst = new Jolt.CollideShapeClosestHitCollisionCollector();
                } else {
                    collector = this._collectorCollideShapeAll = new Jolt.CollideShapeAllHitCollisionCollector();
                }
            }

            const shapeIndex = cb.read(BUFFER_READ_UINT32);
            const shape = tracker.shapeMap.get(shapeIndex);

            // position
            jv1.FromBuffer(cb);

            // rotation
            jq.FromBuffer(cb);

            // scale
            if (cb.flag) {
                jv2.FromBuffer(cb);
            } else {
                jv2.Set(1, 1, 1);
            }

            let settings = this._collideShapeSettings;
            if (!settings) {
                settings = this._collideShapeSettings = new Jolt.CollideShapeSettings();
            }

            if (cb.flag) settings.mMaxSeparationDistance = cb.read(BUFFER_READ_FLOAT32);
            const ignoreBackFaces = cb.flag ? cb.read(BUFFER_READ_BOOL) : true;
            settings.mBackFaceMode = ignoreBackFaces ? Jolt.EBackFaceMode_IgnoreBackFaces : Jolt.EBackFaceMode_CollideWithBackFaces;

            const calculateNormal = cb.flag ? cb.read(BUFFER_READ_BOOL) : false;

            // offset
            if (cb.flag) {
                jv3.FromBuffer(cb);
            } else {
                jv3.Set(0, 0, 0);
            }

            const customBPFilter = cb.flag;
            const bpFilter = customBPFilter ? new Jolt.DefaultBroadPhaseLayerFilter(joltInterface.GetObjectVsBroadPhaseLayerFilter(), cb.read(BUFFER_READ_UINT32)) : backend.bpFilter;

            const customObjFilter = cb.flag;
            const objFilter = customObjFilter ? new Jolt.DefaultObjectLayerFilter(joltInterface.GetObjectLayerPairFilter(), cb.read(BUFFER_READ_UINT32)) : backend.objFilter;

            system.GetNarrowPhaseQuery().CollideShape(shape, jv2, Jolt.Mat44.prototype.sRotationTranslation(jq, jv1), settings, jv3, collector, bpFilter, objFilter, bodyFilter, backend.shapeFilter);

            if (firstOnly) {
                if (collector.HadHit()) {
                    buffer.write(1, BUFFER_WRITE_UINT16, false); // hits count
                    writeCollideShapeHit(buffer, system, tracker, calculateNormal, collector.mHit, Jolt);
                } else {
                    buffer.write(0, BUFFER_WRITE_UINT16, false); // hits count
                }
            } else {
                const hits = collector.mHits;
                const count = hits.size();

                buffer.write(count, BUFFER_WRITE_UINT16, false); // hits count
                for (let i = 0; i < count; i++) {
                    writeCollideShapeHit(buffer, system, tracker, calculateNormal, hits.at(i), Jolt);
                }
            }

            collector.Reset();

            if (customBPFilter) {
                Jolt.destroy(bpFilter);
            }

            if (customObjFilter) {
                Jolt.destroy(objFilter);
            }
        } catch (e) {
            if ($_DEBUG) {
                Debug.error(e);
            }
            return false;
        }

        if (immediate) {
            return buffer;
        }

        return true;
    }

    _createIgnoreSensorsBodyFilter(system) {
        const Jolt = this._backend.Jolt;
        const bodyFilter = new Jolt.BodyFilterJS();
        bodyFilter.ShouldCollide = (inBodyID) => {
            const body = system.GetBodyLockInterfaceNoLock().TryGetBody(Jolt.wrapPointer(inBodyID, Jolt.BodyID));
            if (body.IsSensor()) {
                return false;
            }
            return true;
        };
        bodyFilter.ShouldCollideLocked = () => {
            return true;
        };

        this._ignoreSensorsBodyFilter = bodyFilter;
    }
}

export { Querier };
