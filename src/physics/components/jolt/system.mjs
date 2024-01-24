import { IndexedCache } from "../../indexed-cache.mjs";

import {
    BP_LAYER_MOVING,
    BP_LAYER_NON_MOVING,
    BUFFER_READ_FLOAT32, BUFFER_READ_UINT32, BUFFER_WRITE_UINT32,
    FLOAT32_SIZE,OBJ_LAYER_MOVING,OBJ_LAYER_NON_MOVING,SHAPE_BOX, SHAPE_CAPSULE,
    SHAPE_CONVEX_HULL, SHAPE_CYLINDER, SHAPE_HEIGHTFIELD, SHAPE_MESH, SHAPE_SPHERE,
    SHAPE_STATIC_COMPOUND, VEHICLE_CAST_TYPE_CYLINDER, VEHICLE_CAST_TYPE_RAY,
    VEHICLE_CAST_TYPE_SPHERE, VEHICLE_TYPE_MOTORCYCLE, VEHICLE_TYPE_TRACK, VEHICLE_TYPE_WHEEL
} from "./constants.mjs";

let v1, v2, v3;

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
    'enabled',
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

class ShapeComponentSystem extends pc.ComponentSystem {
    static entityMap = new IndexedCache();

    constructor(app, manager) {
        super(app);

        // The store where all ComponentData objects are kept
        this.store = {};
        this.schema = schema;

        this._manager = manager;

        this.entityMap = ShapeComponentSystem.entityMap;

        this._exposeConstants();
    }

    addCommand() {
        const cb = this._manager.commandsBuffer;
        
        cb.writeOperator(arguments[0]);
        cb.writeCommand(arguments[1]);

        // component index
        cb.write(arguments[2], BUFFER_WRITE_UINT32, false);

        for (let i = 3, end = arguments.length; i < end; i += 3) {
            cb.write(arguments[i], arguments[i + 1], arguments[i + 2]);
        }
    }

    addCommandArgs() {
        const cb = this._manager.commandsBuffer;
        for (let i = 0, end = arguments.length; i < end; i += 3) {
            cb.write(arguments[i], arguments[i + 1], arguments[i + 2]);
        }
    }

    addComponent(entity, data = {}) {
        const component = new this.ComponentType(this, entity);

        this.store[entity.getGuid()] = { entity };

        entity[this.id] = component;
        entity.c[this.id] = component;

        this.initializeComponentData(component, data);

        return component;
    }

    initializeComponentData(component, data) {
        component.enabled = true;

        for (const [key, value] of Object.entries(data)) {
            component[`_${ key }`] = value;
        }

        if (component.entity.enabled && !component.isCompoundChild) {
            component.onEnable();
        }
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
        }
    }

    static updateDynamic(cb) {
        const index = cb.read(BUFFER_READ_UINT32);
        const entity = this.entityMap.get(index);
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

        if (!v1) {
            v1 = new pc.Vec3();
            v2 = new pc.Vec3();
            v3 = new pc.Vec3();
        }
    
        for (let d = 0, total = data.length; d < total; d += 5) {
            const index = data[d];
            const length = data[d + 1];
            const byteOffset = data[d + 2];
            const motionType = data[d + 3];
            const buffer = data[d + 4];
    
            const view = new Float32Array(buffer, byteOffset, length);
            const entity = this.entityMap.get(index);
            const color = getColor(motionType, config);
    
            const p = entity.getPosition();
            const r = entity.getRotation();
    
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

