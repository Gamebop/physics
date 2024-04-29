import { IndexedCache } from "../../../indexed-cache.mjs";
import { ComponentSystem } from "../system.mjs";
import { ShapeComponent } from "./component.mjs";

function getColor(type, config) {
    switch (type) {
        case pc.JOLT_MOTION_TYPE_STATIC:
            return config.debugColorStatic;
        case pc.JOLT_MOTION_TYPE_KINEMATIC:
            return config.debugColorKinematic;
        case pc.JOLT_MOTION_TYPE_DYNAMIC:
            return config.debugColorDynamic;
        default:
            return pc.Color.WHITE;
    }
}

const schema = [
    // component
    'index',
    'trackDynamic',
    'renderAsset',
    'meshes',
    'isCompoundChild',
    'useEntityScale',
    'useMotionState',
    'debugDraw',

    // Jolt shape
    'shape',
    'halfExtent',
    'radius',
    'convexRadius',
    'halfHeight',
    'density',
    'shapePosition',
    'shapeRotation',
    'massOffset',
    'hfScale',
    'hfOffset',
    'hfSamples',
    'hfSampleCount',
    'hfBlockSize',
    'hfBitsPerSample',
    'hfActiveEdgeCosThresholdAngle'
];

class ShapeComponentSystem extends ComponentSystem {
    static entityMap = new IndexedCache();

    static tempVectors = [];

    constructor(app, manager) {
        super(app, manager);

        this._schema = [...this.schema, ...schema];

        // TODO
        // can we use static method directly?
        this.entityMap = ShapeComponentSystem.entityMap;

        // TODO remove this
        this._exposeConstants();
    }

    get id() {
        return 'shape';
    }

    get ComponentType() {
        return ShapeComponent;
    }

    freeConstraintIndex(index) {
        this._manager.freeConstraintIndex(index);
    }

    getIndex(entity) {
        return this.entityMap.add(entity);
    }

    setIndexFree(index) {
        this.entityMap.free(index);
    }

    _exposeConstants() {
        if (typeof window !== 'undefined' && window.pc) {
            pc.JOLT_SHAPE_BOX = SHAPE_BOX;
            pc.JOLT_SHAPE_CAPSULE = SHAPE_CAPSULE;
            pc.JOLT_SHAPE_CYLINDER = SHAPE_CYLINDER;
            pc.JOLT_SHAPE_SPHERE = SHAPE_SPHERE;
            pc.JOLT_SHAPE_MESH = SHAPE_MESH;
            pc.JOLT_SHAPE_CONVEX_HULL = SHAPE_CONVEX_HULL;
            pc.JOLT_SHAPE_STATIC_COMPOUND = SHAPE_STATIC_COMPOUND;
            pc.JOLT_SHAPE_HEIGHTFIELD = SHAPE_HEIGHTFIELD;
            pc.JOLT_OBJ_LAYER_NON_MOVING = OBJ_LAYER_NON_MOVING;
            pc.JOLT_OBJ_LAYER_MOVING = OBJ_LAYER_MOVING;
            pc.JOLT_BP_LAYER_NON_MOVING = BP_LAYER_NON_MOVING;
            pc.JOLT_BP_LAYER_MOVING = BP_LAYER_MOVING;
            pc.JOLT_VEHICLE_TYPE_WHEEL = VEHICLE_TYPE_WHEEL;
            pc.JOLT_VEHICLE_TYPE_TRACK = VEHICLE_TYPE_TRACK;
            pc.JOLT_VEHICLE_TYPE_MOTORCYCLE = VEHICLE_TYPE_MOTORCYCLE;
            pc.JOLT_VEHICLE_CAST_TYPE_RAY = VEHICLE_CAST_TYPE_RAY;
            pc.JOLT_VEHICLE_CAST_TYPE_CYLINDER = VEHICLE_CAST_TYPE_CYLINDER;
            pc.JOLT_VEHICLE_CAST_TYPE_SPHERE = VEHICLE_CAST_TYPE_SPHERE;
            pc.JOLT_CONSTRAINT_TYPE_FIXED = CONSTRAINT_TYPE_FIXED;
            pc.JOLT_CONSTRAINT_TYPE_POINT = CONSTRAINT_TYPE_POINT;
            pc.JOLT_CONSTRAINT_TYPE_DISTANCE = CONSTRAINT_TYPE_DISTANCE;
            pc.JOLT_CONSTRAINT_TYPE_HINGE = CONSTRAINT_TYPE_HINGE;
            pc.JOLT_CONSTRAINT_TYPE_SLIDER = CONSTRAINT_TYPE_SLIDER;
            pc.JOLT_CONSTRAINT_TYPE_CONE = CONSTRAINT_TYPE_CONE;
            pc.JOLT_CONSTRAINT_TYPE_SWING_TWIST = CONSTRAINT_TYPE_SWING_TWIST;
            pc.JOLT_CONSTRAINT_TYPE_SIX_DOF = CONSTRAINT_TYPE_SIX_DOF;
            pc.JOLT_CONSTRAINT_TYPE_PULLEY = CONSTRAINT_TYPE_PULLEY;
            pc.JOLT_CONSTRAINT_SIX_DOF_TRANSLATION_X = CONSTRAINT_SIX_DOF_TRANSLATION_X;
            pc.JOLT_CONSTRAINT_SIX_DOF_TRANSLATION_Y = CONSTRAINT_SIX_DOF_TRANSLATION_Y;
            pc.JOLT_CONSTRAINT_SIX_DOF_TRANSLATION_Z = CONSTRAINT_SIX_DOF_TRANSLATION_Z;
            pc.JOLT_CONSTRAINT_SIX_DOF_ROTATION_X = CONSTRAINT_SIX_DOF_ROTATION_X;
            pc.JOLT_CONSTRAINT_SIX_DOF_ROTATION_Y = CONSTRAINT_SIX_DOF_ROTATION_Y;
            pc.JOLT_CONSTRAINT_SIX_DOF_ROTATION_Z = CONSTRAINT_SIX_DOF_ROTATION_Z;
            pc.JOLT_CONSTRAINT_SPACE_LOCAL = CONSTRAINT_SPACE_LOCAL;
            pc.JOLT_CONSTRAINT_SPACE_WORLD = CONSTRAINT_SPACE_WORLD;
        }
    }

    static updateDynamic(cb) {
        const index = cb.read(BUFFER_READ_UINT32);
        const entity = ShapeComponentSystem.entityMap.get(index);
        const vehicleComponent = entity?.c.vehicle;

        if (!entity) {
            cb.skip(13 * FLOAT32_SIZE);
            if (vehicleComponent) {
                cb.skip(vehicleComponent.wheels.length * 7 * FLOAT32_SIZE);
            }
            return;
        }

        entity.setPosition(
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32)
        );

        entity.setRotation(
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32)
        );

        const component = entity.c.body || vehicleComponent;
        component._linearVelocity.set(
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32)
        );
        component._angularVelocity.set(
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32)
        );

        if (vehicleComponent) {
            const wheels = vehicleComponent.wheels;
            const wheelsCount = wheels.length;

            for (let i = 0; i < wheelsCount; i++) {
                const wheel = wheels[i];
                const entity = wheel.entity;

                if (!entity) {
                    cb.skip(7 * FLOAT32_SIZE);
                    continue;
                }

                wheel.longitudinalSlip = cb.read(BUFFER_READ_FLOAT32);
                wheel.lateralSlip = cb.read(BUFFER_READ_FLOAT32);
                wheel.combinedLongitudinalFriction = cb.read(BUFFER_READ_FLOAT32);
                wheel.combinedLateralFriction = cb.read(BUFFER_READ_FLOAT32);
                wheel.brakeImpulse = cb.read(BUFFER_READ_FLOAT32);

                entity.setLocalPosition(
                    cb.read(BUFFER_READ_FLOAT32),
                    cb.read(BUFFER_READ_FLOAT32),
                    cb.read(BUFFER_READ_FLOAT32)
                );

                entity.setLocalRotation(
                    cb.read(BUFFER_READ_FLOAT32),
                    cb.read(BUFFER_READ_FLOAT32),
                    cb.read(BUFFER_READ_FLOAT32),
                    cb.read(BUFFER_READ_FLOAT32)
                );
            }
        }
    }

    static debugDraw(app, data, config) {
        const useDepth = config.debugDrawDepth;
        const layer = app.scene.layers.getLayerById(config.debugDrawLayerId);
        const tempVectors = ShapeComponentSystem.tempVectors;

        if (tempVectors.length === 0) {
            tempVectors.push( new pc.Vec3(), new pc.Vec3(), new pc.Vec3(), new pc.Vec3(), new pc.Quat() );
        }

        const v1 = tempVectors[0];
        const v2 = tempVectors[1];
        const v3 = tempVectors[2];
        const v4 = tempVectors[3];
        const q1 = tempVectors[4];
    
        for (let d = 0, total = data.length; d < total; d += 12) {
            const index = data[d];
            const length = data[d + 1];
            const byteOffset = data[d + 2];
            const motionType = data[d + 3];
            const buffer = data[d + 4];
    
            const view = new Float32Array(buffer, byteOffset, length);
            const color = getColor(motionType, config);

            const p = v4.set(data[d + 5], data[d + 6], data[d + 7]);
            const r = q1.set(data[d + 8], data[d + 9], data[d + 10], data[d + 11]);
    
            for (let i = 0, end = view.length; i < end; i += 9) {
                v1.set(view[i], view[i + 1], view[i + 2]);
                v2.set(view[i + 3], view[i + 4], view[i + 5]);
                v3.set(view[i + 6], view[i + 7], view[i + 8]);
    
                r.transformVector(v1, v1);
                r.transformVector(v2, v2);
                r.transformVector(v3, v3);
                v1.add(p);
                v2.add(p);
                v3.add(p);
    
                app.drawLine(v1, v2, color, useDepth, layer);
                app.drawLine(v2, v3, color, useDepth, layer);
                app.drawLine(v3, v1, color, useDepth, layer);
            }
        }
    }    
}

export { ShapeComponentSystem };

