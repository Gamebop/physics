import { IndexedCache } from '../../../indexed-cache.mjs';
import { JoltComponentSystem } from '../system.mjs';
import { ShapeComponent } from './component.mjs';
import {
    BUFFER_READ_BOOL,
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
 * @group Components
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
        if (!entity) {
            cb.skip(13 * FLOAT32_SIZE);
            const isVehicle = cb.read(BUFFER_READ_BOOL);
            if (isVehicle) {
                cb.skip(cb.read(BUFFER_READ_UINT32) /* wheels count */ * 7 * FLOAT32_SIZE);
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

        const bodyComponent = entity.c.body;
        bodyComponent._linearVelocity.set(
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32)
        );
        bodyComponent._angularVelocity.set(
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32)
        );

        // If vehicle, update wheels
        if (cb.read(BUFFER_READ_BOOL)) {
            const vehicleConstraint = entity.c.constraint?.vehicleConstraint;
            vehicleConstraint?.updateWheelsIsometry(cb);
        }
    }
}

export { ShapeComponentSystem };
