import { IndexedCache } from '../../../indexed-cache.mjs';
import { JoltComponentSystem } from '../system.mjs';
import { ShapeComponent } from './component.mjs';
import {
    BUFFER_READ_FLOAT32, BUFFER_READ_UINT32, FLOAT32_SIZE
} from '../../constants.mjs';

const schema = [
    // component
    'index',
    'renderAsset',
    'mesh',
    'isCompoundChild',
    'useEntityScale',
    'useMotionState',
    'debugDraw',

    // Jolt shape
    'shape',
    'halfExtent',
    'radius',
    'shape',
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

/**
 * Shape Component System. A base system for the most of the Jolt component systems. Most probably
 * you don't need to use it directly.
 *
 * @category Shape Component
 */
class ShapeComponentSystem extends JoltComponentSystem {
    static entityMap = new IndexedCache();

    static tempVectors = [];

    constructor(app, manager) {
        super(app, manager);

        this._schema = [...this.schema, ...schema];

        // TODO
        // can we use static method directly?
        this.entityMap = ShapeComponentSystem.entityMap;
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
}

export { ShapeComponentSystem };
