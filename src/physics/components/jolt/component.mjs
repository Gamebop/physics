import { Debug } from "../../debug.mjs";
import { buildAccessors } from "../../util.mjs";

/**
 * Base class for all Jolt-based Components. You are not able to create a rigidbody without a shape
 * in Jolt, so all components are derived from this class, inheriting shape properties.
 * 
 * You are not supposed to use this component directly. Instead, use one of the derived ones.
 * 
 * @category Base
 */
class ShapeComponent extends pc.EventHandler {

    // Component Properties

    // TODO
    // get rid of trackDynamic, it doesn't work well with workers and in some parent/child edge cases
    _trackDynamic = true;

    _enabled = true;

    /** @type {number} @hidden */
    _shape = SHAPE_BOX;

    _index = -1;

    /** @type {number | import('playcanvas').Asset | null} @hidden */
    _renderAsset = null;

    /** @type {Array.<import('playcanvas').Mesh> | null} @hidden */
    _meshes = null;

    // Tells if this component describes a compound child.
    _isCompoundChild = false;

    _useEntityScale = true;

    // TODO
    // remove default Map
    /** @type {Map<number, import('playcanvas').Entity> | null} @hidden */
    _constraints = new Map();

    _debugDraw = false;

    // Shape Properties

    _halfExtent = new pc.Vec3(0.5, 0.5, 0.5);

    _radius = 0.5;

    _convexRadius = 0.05;

    _halfHeight = 0.5;

    _density = 1000;

    _shapePosition = pc.Vec3.ZERO;

    _shapeRotation = pc.Quat.IDENTITY;

    _massOffset = pc.Vec3.ZERO;

    // TODO
    // consider moving HeightField to own component

    /** @type {Float32Array | null} @hidden */
    _hfSamples = null;

    _hfSampleCount = 0;

    _hfBlockSize = 2;

    _hfBitsPerSample = 8;

    _hfActiveEdgeCosThresholdAngle = 0.996195;

    _hfScale = pc.Vec3.ONE;

    _hfOffset = pc.Vec3.ZERO;

    /** @type {import('./system.mjs').ShapeComponentSystem | null} @hidden */
    _system = null;

    /** @type {import('playcanvas').Entity | null} @hidden */
    _entity = null;

    constructor(system, entity) {
        super();

        this._system = system;
        this._entity = entity;

        if (system.schema && !this._accessorsBuilt) {
            buildAccessors(this, system.schema);
        }

        // Editor events support

        this.on('set', function (name, oldValue, newValue) {
            this.fire('set_' + name, name, oldValue, newValue);
        });

        this.on('set_enabled', this.onSetEnabled, this);
    }

    /**
     * A map with all constraints that are applied on this component. Where:
     * - Key: unique index of the constraint.
     * - Value: the other entity that this constraint connects to.
     * 
     * @defaultValue null
     */
    get constraints() {
        return this._constraints;
    }

    /**
     * Internally the convex radius will be subtracted from the half extent / radius so the total
     * shape size will not grow with the convex radius.
     * 
     * @defaultValue 0.05 // meters
     */
    get convexRadius() {
        return this._convexRadius;
    }

    /**
     * Enables debug draw of the shape.
     * 
     * @defaultValue false
     */
    get debugDraw() {
        return this._debugDraw;
    }

    /**
     * Density of the object.
     * 
     * @defaultValue 1000 // kg/m^3
     */
    get density() {
        return this._density;
    }

    /**
     * Enable/disable the component. All related physical objects are destroyed on disable,
     * and re-created anew on enable.
     * 
     * @defaultValue true
     */
    set enabled(isEnabled) {
        if (this._enabled !== isEnabled && this._entity.enabled) {
            isEnabled ? this.onEnable() : this.onDisable();
        }
    }

    get enabled() {
        return this._enabled;
    }

    /**
     * An entity this component is attached to.
     * 
     * @defaultValue null
     */
    get entity() {
        return this._entity;
    }

    /**
     * Half extent of a box shape (`SHAPE_BOX`).
     * 
     * @defaultValue Vec3(0.5, 0.5, 0.5) // meters
     */
    get halfExtent() {
        return this._halfExtent;
    }

    /**
     * Half height of radius based shapes, e.g. cylinder, capsule, etc.
     * 
     * @defaultValue 0.5 // meters
     */
    get halfHeight() {
        return this._halfHeight;
    }

    /**
     * Cosine of the threshold angle (if the angle between the two triangles in HeightField is
     * bigger than this, the edge is active, note that a concave edge is always inactive). Setting
     * this value too small can cause ghost collisions with edges, setting it too big can cause
     * depenetration artifacts (objects not depenetrating quickly). Valid ranges are between
     * `cos(0 degrees)` and `cos(90 degrees)`.
     * 
     * @defaultValue cos(5 degrees) // radians
     */
    get hfActiveEdgeCosThresholdAngle() {
        return this._hfActiveEdgeCosThresholdAngle;        
    }

    /**
     * How many bits per sample to use to compress the HeightField. Can be in the range [1, 8].
     * Note that each sample is compressed relative to the min/max value of its block of
     * hfBlockSize * hfBlockSize pixels, so the effective precision is higher. Also note that
     * increasing hfBlockSize saves more memory than reducing the amount of bits per sample.
     * 
     * @defaultValue 8 // integer
     */
    get hfBitsPerSample() {
        return this._hfBitsPerSample;
    }

    /**
     * The HeightField is divided in blocks of hfBlockSize * hfBlockSize * 2 triangles and the
     * acceleration structure culls blocks only, bigger block sizes reduce memory consumption but
     * also reduce query performance. Sensible values are [2, 8], does not need to be a power of 2.
     * Note that at run-time Jolt performs one more grid subdivision, so the effective block size
     * is half of what is provided here.
     * 
     * @defaultValue 2 // integer
     */
    get hfBlockSize() {
        return this._hfBlockSize;
    }

    /**
     * Offsets the local position of the HeightField shape.
     * 
     * @defaultValue Vec3(0, 0, 0) // meters
     */
    get hfOffset() {
        return this._hfOffset;
    }

    /**
     * A typed array (`Float32Array`) containing the HeightField samples data.
     * 
     * @example
     * ```js
     * const samples = new Float32Array(width * height);
     * for (let i = 0; i < buffer.length; ++i) {
     *     // all terrain vertices will be at 1.2 meters above ground level
     *     samples[i] = 1.2;
     * }
     * ```
     * 
     * @defaultValue null
     */
    get hfSamples() {
        return this._hfSamples;
    }

    /**
     * Defines the count of vertices in the HeightField. Set this to the number of vertices on one
     * side, e.g. if your HeightField has 100x100 vertices, then sample count should be 100.
     * 
     * @defaultValue 0 // integer
     */
    get hfSampleCount() {
        return this._hfSampleCount;
    }

    /**
     * Sets the scale of the HeightField.
     * 
     * @defaultValue Vec3(1, 1, 1) // float Vec3
     */
    get hfScale() {
        return this._hfScale;        
    }

    /**
     * Unique body index. This can change during entity lifecycle, e.g. every time entity is
     * enabled, a new index is assigned and a new body is created. The index is used to map
     * entity to body. Indices can be reused.
     * 
     * @defaultValue -1 // integer
     */
    get index() {
        return this._index;
    }

    /**
     * Meshes used for mesh or convex hulls.
     * 
     * @defaultValue null
     */
    get meshes() {
        return this._meshes;
    }

    /**
     * Center of mass offset in local space of the body. Does not translate the shape.
     * 
     * @defaultValue Vec3(0, 0, 0) // meters
     */
    get massOffset() {
        return this._massOffset;
    }

    /**
     * Specifies a radius for radius-based shapes, e.g. sphere, capsule, etc.
     * 
     * @defaultValue 0.5 // meters
     */
    get radius() {
        return this._radius;
    }

    /**
     * A number representing the shape. Supported aliases:
     * 
     * ```
     * SHAPE_BOX
     * ```
     * ```
     * SHAPE_CAPSULE
     * ```
     * ```
     * SHAPE_CYLINDER
     * ```
     * ```
     * SHAPE_SPHERE
     * ```
     * ```
     * SHAPE_MESH
     * ```
     * ```
     * SHAPE_CONVEX_HULL
     * ```
     * ```
     * SHAPE_STATIC_COMPOUND
     * ```
     * ```
     * SHAPE_HEIGHTFIELD
     * ```
     * 
     * @defaultValue SHAPE_BOX // enum integer
     */
    get shape() {
        return this._shape;
    }

    /**
     * A local position offset of the shape.
     * 
     * @defaultValue Vec3(0, 0, 0) // meters
     */
    get shapePosition() {
        return this._shapePosition;
    }

    /**
     * A local rotation offset of the shape.
     * 
     * @defaultValue Quat(0, 0, 0, 1)
     */
    get shapeRotation() {
        return this._shapeRotation;
    }

    /**
     * Render asset ID, used for mesh or convex hulls.
     * 
     * @defaultValue null
     */
    get renderAsset() {
        return this._renderAsset;
    }

    /**
     * Component System used to create this Component.
     * 
     * @defaultValue null
     */
    get system() {
        return this._system;
    }

    /**
     * Applies entity scale on the shape.
     * 
     * @defaultValue true
     */
    get useEntityScale() {
        return this._useEntityScale;
    }

    onSetEnabled(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if (this.entity.enabled) {
                if (newValue) {
                    this.onEnable();
                } else {
                    this.onDisable();
                }
            }
        }
    }

    onEnable() {}

    onDisable() {
        const constraints = this._constraints;

        constraints.forEach((entity2, index) => {
            entity2?.body?.constraints.delete(index);
            this.system.freeConstraintIndex(index);
        });
        constraints.clear();
    }

    onPostStateChange() {}

    static quat = new pc.Quat();

    static writeShapeData(cb, props, forceWriteRotation = false) {
        const shape = props.shape;
        cb.write(shape, BUFFER_WRITE_UINT8, false);

        const scale = props.scale || props.entity.getLocalScale();
        let useEntityScale = props.useEntityScale;
        
        if (useEntityScale && scale.x === 1 && scale.y === 1 && scale.z === 1 && 
            shape !== SHAPE_MESH && shape !== SHAPE_CONVEX_HULL) {
            useEntityScale = false;
        }
        
        useEntityScale = useEntityScale || (shape === SHAPE_MESH || shape === SHAPE_CONVEX_HULL);
        cb.write(useEntityScale, BUFFER_WRITE_BOOL, false);
        if (useEntityScale) {
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
                cb.write(props.hfOffset, BUFFER_WRITE_VEC32, false);
                cb.write(props.hfScale, BUFFER_WRITE_VEC32, false);
                cb.write(props.hfSampleCount, BUFFER_WRITE_UINT32, false);
                cb.write(props.hfBlockSize, BUFFER_WRITE_UINT8, false);
                cb.write(props.hfBitsPerSample, BUFFER_WRITE_UINT8, false);
                cb.write(props.hfActiveEdgeCosThresholdAngle, BUFFER_WRITE_FLOAT32, false);
                cb.addBuffer(props.hfSamples.buffer);
                break;
    
            default:
                DEBUG && Debug.warn('Unsupperted shape type', shape);
                return false;
        }
    
        const isCompoundChild = props.isCompoundChild;
        cb.write(isCompoundChild, BUFFER_WRITE_BOOL, false);
        if (!isCompoundChild) {
            cb.write(props.density, BUFFER_WRITE_FLOAT32, false);

            const position = props.shapePosition;
            const rotation = props.shapeRotation;
            const massOffset = props.massOffset;
            const hasPositionOffset = !position.equals(pc.Vec3.ZERO);
            const hasRotationOffset = forceWriteRotation || !rotation.equals(pc.Quat.IDENTITY);
            const hasShapeOffset = hasPositionOffset || hasRotationOffset;
            const hasMassOffset = !massOffset.equals(pc.Vec3.ZERO);
    
            cb.write(hasShapeOffset, BUFFER_WRITE_BOOL, false);
            if (hasShapeOffset) {
                cb.write(position, BUFFER_WRITE_VEC32, false);
                cb.write(rotation, BUFFER_WRITE_VEC32, false);
            }
    
            cb.write(hasMassOffset, BUFFER_WRITE_BOOL, false);
            if (hasMassOffset) {
                cb.write(massOffset, BUFFER_WRITE_VEC32, false);
            }
        }

        return ok;
    }

    static addCompoundChildren(cb, parent) {
        const components = parent.findComponents('body');
        const count = components.length;
        const childrenCount = count - 1; // -1 to exclude the parent

        if (DEBUG && childrenCount === 0) {
            Debug.warn('Trying to create a static (immutable) compound body without children shapes. Aborting.');
            return false;
        }

        cb.write(childrenCount, BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < count; i++) {
            const component = components[i];
            if (component.entity === parent) {
                continue;
            }

            const ok = ShapeComponent.writeShapeData(cb, component);
            if (!ok) {
                return false;
            }

            // Loss of precision for pos/rot (64 -> 32)
            cb.write(component.shapePosition, BUFFER_WRITE_VEC32, false);
            cb.write(component.shapeRotation, BUFFER_WRITE_VEC32, false);
        }

        return true;
    }

    static addMeshes(meshes, cb) {
        for (let i = 0; i < meshes.length; i++) {
            const mesh = meshes[i];
            const vb = mesh.vertexBuffer;
            const ib = mesh.indexBuffer[0];
            const format = vb.getFormat();

            for (let i = 0; i < format.elements.length; i++) {
                const element = format.elements[i];
                if (element.name === pc.SEMANTIC_POSITION) {
                    cb.write(mesh.primitive[0].base, BUFFER_WRITE_UINT8, false);
                    cb.write(element.offset, BUFFER_WRITE_UINT32, false);
                    cb.write(element.stride / FLOAT32_SIZE, BUFFER_WRITE_UINT8, false);
                    cb.addBuffer(vb.storage);
                    break;
                }
            }

            cb.write(vb.numVertices, BUFFER_WRITE_UINT32, false);
            cb.write(ib.numIndices, BUFFER_WRITE_UINT32, false);

            // TODO
            // workaround until this is fixed:
            // https://github.com/playcanvas/engine/issues/5869
            // buffer.addBuffer(ib.storage);

            const storage = ib.storage;
            const isView = ArrayBuffer.isView(storage);

            let byteLength, byteOffset;
            if (isView) {
                // byteLength = storage.byteLength;
                byteOffset = storage.byteOffset;
            } else {
                // byteLength = storage.byteLength / ib.bytesPerIndex;
                byteOffset = storage.buffer.byteOffset;
            }

            // cb.write(byteLength, BUFFER_WRITE_UINT32, false);
            cb.write(byteOffset, BUFFER_WRITE_UINT32, false);
            cb.addBuffer(isView ? storage.buffer : storage);
        }
    }
}

export { ShapeComponent };

