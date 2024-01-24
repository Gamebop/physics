import {
    BUFFER_READ_BOOL, BUFFER_READ_UINT32,
    BUFFER_READ_UINT8,
    BUFFER_WRITE_JOLTVEC32,
    BUFFER_WRITE_UINT16, BUFFER_WRITE_UINT32,
    CMD_CAST_RAY, CMD_CAST_SHAPE,
    COMPONENT_SYSTEM_MANAGER
} from "../../../physics/components/jolt/constants.mjs";
import { Debug } from "../../../physics/debug.mjs";

const params = [];

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
            new Jolt.Vec3(), new Jolt.Vec3(), new Jolt.Vec3(),
        ];

        this._shapeCastSettings = new Jolt.ShapeCastSettings();

        this._collectorRayFirst = new Jolt.CastRayClosestHitCollisionCollector();
        this._collectorRayAll = new Jolt.CastRayAllHitCollisionCollector();

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
                ok = this._castRay(cb);
                break;

            case CMD_CAST_SHAPE:
                ok = this._castShape(cb);
                break;

            default:
                Debug.dev && Debug.error(`Invalid querier command: ${ command }`);
                return false;
        }

        return ok;
    }

    destroy() {
        this._tempVectors.forEach(vector => {
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

        this._commandsBuffer.destroy();
        this._commandsBuffer = null;

        params.length = 0;
        params = undefined;
    }

    _castRay(cb) {
        const backend = this._backend;
        const buffer = this._commandsBuffer;
        const castSettings = this._rayCastSettings;
        const jv = this._tempVectors[1];
        const cast = this._rayCast;
        const tracker = backend.tracker;
        const system = backend.physicsSystem;
        const Jolt = backend.Jolt;

        buffer.writeCommand(CMD_CAST_RAY);
        
        const queryIndex = cb.read(BUFFER_READ_UINT32);
        buffer.write(queryIndex, BUFFER_WRITE_UINT16, false);

        try {
            jv.FromBuffer(cb);
            cast.mOrigin = jv;
    
            jv.FromBuffer(cb);
            cast.mDirection = jv;
    
            const firstOnly = cb.flag ? cb.read(BUFFER_READ_BOOL) : true;
            const calculateNormal = cb.flag ? cb.read(BUFFER_READ_BOOL) : false;
            const ignoreBackFaces = cb.flag ? cb.read(BUFFER_READ_BOOL) : true;
            const solidConvex = cb.flag ? cb.read(BUFFER_READ_BOOL) : true;
            const collector = firstOnly ? this._collectorRayFirst : this._collectorRayAll;
            const { bpFilter, objFilter, bodyFilter, shapeFilter } = this._backend;
    
            castSettings.mBackFaceMode = ignoreBackFaces ? Jolt.EBackFaceMode_IgnoreBackFaces : Jolt.EBackFaceMode_CollideWithBackFaces;
            castSettings.mTreatConvexAsSolid = solidConvex;

            system.GetNarrowPhaseQuery().CastRay(cast, castSettings, collector, bpFilter, objFilter, bodyFilter, shapeFilter);

            if (firstOnly) {
                if (collector.HadHit()) {
                    buffer.write(1, BUFFER_WRITE_UINT16, false); // hits count
                    Querier.writeRayHit(buffer, system, tracker, cast, calculateNormal, collector.mHit, Jolt);
                } else {
                    buffer.write(0, BUFFER_WRITE_UINT16, false); // hits count
                }
            } else {
                const hits = collector.mHits;
                const count = hits.size();
                buffer.write(count, BUFFER_WRITE_UINT16, false); // hits count
                for (let i = 0; i < count; i++) {
                    Querier.writeRayHit(buffer, system, tracker, cast, calculateNormal, hits.at(i), Jolt);
                }
            }
    
            collector.Reset();
            
        } catch (e) {
            Debug.dev && Debug.error(e);
            return false;
        }

        return true;
    }

    _castShape(cb) {
        const buffer = this._backend.outBuffer;
        const tempVectors = this._tempVectors;
        const scale = tempVectors[1];
        const direction = tempVectors[2];
        const position = tempVectors[3];
        const offset = tempVectors[4];
        const rotation = tempVectors[0];
        const backend = this._backend;
        const castSettings = this._shapeCastSettings;
        const tracker = backend.tracker;
        const system = backend.physicsSystem;
        const Jolt = backend.Jolt;

        const queryIndex = cb.read(BUFFER_READ_UINT32);

        buffer.writeOperator(COMPONENT_SYSTEM_MANAGER);
        buffer.writeCommand(CMD_CAST_SHAPE);
        buffer.write(queryIndex, BUFFER_WRITE_UINT16, false);
        
        try {
            position.FromBuffer(cb);
            rotation.FromBuffer(cb);
            direction.FromBuffer(cb);
            cb.flag ? scale.FromBuffer(cb) : scale.Set(1, 1, 1);
            cb.flag ? offset.FromBuffer(cb) : offset.Set(0, 0, 0);
            if (cb.flag) castSettings.mBackFaceModeTriangles = cb.read(BUFFER_READ_UINT8);
            if (cb.flag) castSettings.mBackFaceModeConvex = cb.read(BUFFER_READ_UINT8);
            if (cb.flag) castSettings.mUseShrunkenShapeAndConvexRadius = cb.read(BUFFER_READ_BOOL);
            if (cb.flag) castSettings.mReturnDeepestPoint = cb.read(BUFFER_READ_BOOL);
            
            const firstOnly = cb.flag ? cb.read(BUFFER_READ_BOOL) : true;
            const calculateNormal = cb.flag ? cb.read(BUFFER_READ_BOOL) : false;
            const collector = firstOnly ? this._collectorShapeFirst : this._collectorShapeAll;
            const shapeIndex = cb.read(BUFFER_READ_UINT32);
            
            params.length = 0;

            const shape = tracker.shapeMap.get(shapeIndex);
            if (Debug.dev && !shape) {
                Debug.warn(`Unable to locate shape for shape cast: ${ shapeIndex }`);
                return false;
            }

            const transform = Jolt.Mat44.prototype.sRotationTranslation(rotation, position);
            const shapeCast = new Jolt.RShapeCast(shape, scale, transform, direction);
            // const { bpFilter, objFilter, bodyFilter, shapeFilter } = backend;
            const { bodyFilter, shapeFilter } = backend;
            const bpFilter = new Jolt.DefaultBroadPhaseLayerFilter(backend.joltInterface.GetObjectVsBroadPhaseLayerFilter(), 0);
            const objFilter = new Jolt.DefaultObjectLayerFilter(backend.joltInterface.GetObjectLayerPairFilter(), 2);
            system.GetNarrowPhaseQuery().CastShape(shapeCast, castSettings, offset, collector, bpFilter, objFilter, bodyFilter, shapeFilter);
            
            if (firstOnly) {
                if (collector.HadHit()) {
                    buffer.write(1, BUFFER_WRITE_UINT16, false); // hits count
                    Querier.writeShapeHit(buffer, system, tracker, shapeCast, calculateNormal, collector.mHit, Jolt);
                } else {
                    buffer.write(0, BUFFER_WRITE_UINT16, false); // hits count
                }
            } else {
                const hits = collector.mHits;
                const count = hits.size();
                buffer.write(count, BUFFER_WRITE_UINT16, false); // hits count
                for (let i = 0; i < count; i++) {
                    Querier.writeShapeHit(buffer, system, tracker, shapeCast, calculateNormal, hits.at(i), Jolt);
                }
            }

            collector.Reset();

            Jolt.destroy(shapeCast);

        } catch (e) {
            Debug.dev && Debug.error(e);
            return false;
        }

        return true;
    }

    static writeRayHit(buffer, system, tracker, cast, calculateNormal, hit, Jolt) {
        const body = system.GetBodyLockInterfaceNoLock().TryGetBody(hit.mBodyID);
        const point = cast.GetPointOnRay(hit.mFraction);
        const normal = calculateNormal ? body.GetWorldSpaceSurfaceNormal(hit.mSubShapeID2, point) : null;

        const index = tracker.getPCID(Jolt.getPointer(body));
        buffer.write(index, BUFFER_WRITE_UINT32, false);
        buffer.write(point, BUFFER_WRITE_JOLTVEC32, false);
        buffer.write(normal, BUFFER_WRITE_JOLTVEC32);
    }

    static writeShapeHit(buffer, system, tracker, cast, calculateNormal, hit, Jolt) {
        const body = system.GetBodyLockInterfaceNoLock().TryGetBody(hit.mBodyID2);
        const transform = cast.mCenterOfMassStart;
        const point = transform.GetTranslation();
        const dir = cast.mDirection;

        dir.Mul(hit.mFraction);
        point.Add(dir);

        const normal = calculateNormal ? body.GetWorldSpaceSurfaceNormal(hit.mSubShapeID2, point) : null;

        const index = tracker.getPCID(Jolt.getPointer(body));
        buffer.write(index, BUFFER_WRITE_UINT32, false);
        buffer.write(point, BUFFER_WRITE_JOLTVEC32, false);
        buffer.write(normal, BUFFER_WRITE_JOLTVEC32);
    }
}

export { Querier };
