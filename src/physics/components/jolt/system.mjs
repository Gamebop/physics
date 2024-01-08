import { Debug } from "../../debug.mjs";
import { IndexedCache } from "../../indexed-cache.mjs";
import { ShapeComponent } from "./component.mjs";

import {
    BUFFER_READ_FLOAT32, BUFFER_READ_UINT32, BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT32,
    BUFFER_WRITE_UINT8, BUFFER_WRITE_VEC32, FLOAT32_SIZE, OBJECT_LAYER_MOVING, OBJECT_LAYER_NON_MOVING, SHAPE_BOX, SHAPE_CAPSULE,
    SHAPE_CONVEX_HULL, SHAPE_CYLINDER, SHAPE_HEIGHTFIELD, SHAPE_MESH, SHAPE_SPHERE,
    SHAPE_STATIC_COMPOUND, VEHICLE_CAST_TYPE_CYLINDER, VEHICLE_CAST_TYPE_RAY, VEHICLE_CAST_TYPE_SPHERE, VEHICLE_TYPE_MOTORCYCLE, VEHICLE_TYPE_TRACK, VEHICLE_TYPE_WHEEL
} from "./constants.mjs";


// TODO
// convert to statics
const entityMap = new IndexedCache();
const quat = new pc.Quat();
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

class ShapeComponentSystem extends pc.ComponentSystem {
    constructor(app, manager) {
        super();

        this.app = app;

        // The store where all ComponentData objects are kept
        this.store = {};
        this.schema = [
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
            'hfActiveEdgeCosThresholdAngle',
            'hfHasHoles'
        ];

        this._manager = manager;

        this.entityMap = entityMap;

        this._exposeConstants();
    }

    static updateDynamic(cb) {
        const index = cb.read(BUFFER_READ_UINT32);
        const entity = entityMap.get(index);
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

    // TODO
    // move to ShapeComponent    
    static writeShapeData(cb, props, forceWriteRotation = false) {
        const shape = props.shape;
        cb.write(shape, BUFFER_WRITE_UINT8, false);
    
        let useEntityScale = props.useEntityScale;
        let scale;
        if (useEntityScale) {
            scale = props.scale || props.entity.getLocalScale();
            if (scale.x === 1 && scale.y === 1 && scale.z === 1) {
                useEntityScale = false;
            }
        }

        cb.write(useEntityScale, BUFFER_WRITE_BOOL, false);
        if (useEntityScale || (
            shape === SHAPE_MESH ||
            shape === SHAPE_CONVEX_HULL)) {
            // Potential precision loss 64 -> 32
            cb.write(scale, BUFFER_WRITE_VEC32, false);
        }
    
        let ok = true;
        switch (shape) {
            case SHAPE_BOX:
                cb.write(props.halfExtent, BUFFER_WRITE_VEC32, false);
                cb.write(props.convexRadius, BUFFER_WRITE_FLOAT32, false);
                break;
    
            case SHAPE_CAPSULE:
                cb.write(props.halfHeight, BUFFER_WRITE_FLOAT32, false);
                cb.write(props.radius, BUFFER_WRITE_FLOAT32, false);
                break;
    
            case SHAPE_CYLINDER:
                cb.write(props.halfHeight, BUFFER_WRITE_FLOAT32, false);
                cb.write(props.radius, BUFFER_WRITE_FLOAT32, false);
                cb.write(props.convexRadius, BUFFER_WRITE_FLOAT32, false);
                break;
    
            case SHAPE_SPHERE:
                cb.write(props.radius, BUFFER_WRITE_FLOAT32, false);
                break;
    
            case SHAPE_STATIC_COMPOUND:
                ok = ShapeComponent.addCompoundChildren(cb, props.entity);
                break;
    
            // intentional fall-through
            case SHAPE_CONVEX_HULL:
            case SHAPE_MESH:
                ShapeComponent.addMeshes(props.meshes, cb);
                break;
            
            case SHAPE_HEIGHTFIELD:
                cb.write(props.hfHasHoles, BUFFER_WRITE_BOOL, false);
                cb.write(props.hfOffset, BUFFER_WRITE_VEC32, false);
                cb.write(props.hfScale, BUFFER_WRITE_VEC32, false);
                cb.write(props.hfSampleCount, BUFFER_WRITE_UINT32, false);
                cb.write(props.hfBlockSize, BUFFER_WRITE_UINT8, false);
                cb.write(props.hfBitsPerSample, BUFFER_WRITE_UINT8, false);
                cb.write(props.hfActiveEdgeCosThresholdAngle, BUFFER_WRITE_FLOAT32, false);
                cb.addBuffer(props.hfSamples.buffer);
                break;
    
            default:
                Debug.dev && Debug.warn('Unsupperted shape type', shape);
                break;
        }
    
        const isCompoundChild = props.isCompoundChild;
        cb.write(isCompoundChild, BUFFER_WRITE_BOOL, false);
        if (!isCompoundChild) {
            cb.write(props.density, BUFFER_WRITE_FLOAT32, false);
        }
    
        const position = props.shapePosition;
        const rotation = props.shapeRotation;
        const massOffset = props.massOffset;
        const hasPositionOffset = !position.equals(pc.Vec3.ZERO);
        const hasRotationOffset = forceWriteRotation || !rotation.equals(pc.Vec3.ZERO);
        const hasShapeOffset = hasPositionOffset || hasRotationOffset;
        const hasMassOffset = !massOffset.equals(pc.Vec3.ZERO);

        cb.write(hasShapeOffset, BUFFER_WRITE_BOOL, false);
        if (hasShapeOffset) {
            quat.setFromEulerAngles(rotation);
            cb.write(position, BUFFER_WRITE_VEC32, false);
            cb.write(quat, BUFFER_WRITE_VEC32, false);
        }

        cb.write(hasMassOffset, BUFFER_WRITE_BOOL, false);
        if (hasMassOffset) {
            cb.write(massOffset, BUFFER_WRITE_VEC32, false);
        }

        return ok;
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
            const byteOffset = data[d + 1];
            const length = data[d + 2];
            const motionType = data[d + 3];
            const buffer = data[d + 4];
    
            const view = new Float32Array(buffer, byteOffset, length);
            const entity = entityMap.get(index);
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
        return entityMap.add(entity);
    }

    setIndexFree(index) {
        entityMap.free(index);
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
            pc.JOLT_OBJECT_LAYER_NON_MOVING = OBJECT_LAYER_NON_MOVING;
            pc.JOLT_OBJECT_LAYER_MOVING = OBJECT_LAYER_MOVING;
            pc.JOLT_VEHICLE_TYPE_WHEEL = VEHICLE_TYPE_WHEEL;
            pc.JOLT_VEHICLE_TYPE_TRACK = VEHICLE_TYPE_TRACK;
            pc.JOLT_VEHICLE_TYPE_MOTORCYCLE = VEHICLE_TYPE_MOTORCYCLE;
            pc.JOLT_VEHICLE_CAST_TYPE_RAY = VEHICLE_CAST_TYPE_RAY;
            pc.JOLT_VEHICLE_CAST_TYPE_CYLINDER = VEHICLE_CAST_TYPE_CYLINDER;
            pc.JOLT_VEHICLE_CAST_TYPE_SPHERE = VEHICLE_CAST_TYPE_SPHERE;
        }
    }   
}

export { ShapeComponentSystem };

