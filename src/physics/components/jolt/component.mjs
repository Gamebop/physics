import { Debug } from "../../debug.mjs";
import { buildAccessors } from "../../util.mjs";

class ShapeComponent extends pc.EventHandler {

    // ---- COMPONENT PROPS ----

    // Shape type
    _shape = SHAPE_BOX;

    // Enable / disable component
    _enabled = true;


    // TODO
    // get rid of trackDynamic, it doesn't work well with workers and in some parent/child edge cases

    // Automatically moves dynamic bodies, when the position is set on entity.
    // TODO
    // Make it work with web workers
    _trackDynamic = true;

    // Unique body index. This can change during entity lifecycle, e.g. every time entity is enabled, a new
    // index is assigned and a new body is created. The index is used to map entity to body. Indices can be reused.
    _index = -1;

    // Render asset ID, used for mesh or convex hulls.
    _renderAsset = null;

    // Meshes used for mesh or convex hulls
    _meshes = null;

    // Tells if the component describes a compound child
    _isCompoundChild = false;

    // Applies entity scale on the shape
    _useEntityScale = true;

    // Read-only. Constraint indices applied on this body.
    // TODO
    // remove default Map
    _constraints = new Map();

    // Debug draw
    _debugDraw = false;

    // ---- SHAPE PROPS ----

    // Half extents for a box shape
    _halfExtent = new pc.Vec3(0.5, 0.5, 0.5);

    // Raidus for radius based shapes
    _radius = 0.5;

    // Internally the convex radius will be subtracted from the half extent so the total box will not grow with the convex radius
    _convexRadius = 0.05;

    // Half height of radius based shapes, e.g. cylinder, capsule
    _halfHeight = 0.5;

    // Density of the object in kg / m^3
    _density = 1000;

    // Shape local position offset
    _shapePosition = pc.Vec3.ZERO;

    // Shape local rotation offset (vec3, Eulers)
    _shapeRotation = pc.Vec3.ZERO;

    // Offset center of mass in local space of the body. Does not move the shape.
    _massOffset = pc.Vec3.ZERO;

    _hfSamples = null;

    _hfSampleCount = 0;

    // The HeightField is divided in blocks of hfBlockSize * hfBlockSize * 2 triangles and the
    // acceleration structure culls blocks only, bigger block sizes reduce memory consumption
    // but also reduce query performance. Sensible values are [2, 8], does not need to be a
    // power of 2. Note that at run-time Jolt performs one more grid subdivision, so the effective
    // block size is half of what is provided here.
    _hfBlockSize = 2;

    // How many bits per sample to use to compress the HeightField. Can be in the range [1, 8].
    // Note that each sample is compressed relative to the min/max value of its block of
    // hfBlockSize * hfBlockSize pixels so the effective precision is higher. Also note that
    // increasing hfBlockSize saves more memory than reducing the amount of bits per sample.
    _hfBitsPerSample = 8;

    // Cosine of the threshold angle (if the angle between the two triangles in HeightField is
    // bigger than this, the edge is active, note that a concave edge is always inactive). Setting
    // this value too small can cause ghost collisions with edges, setting it too big can cause
    // depenetration artifacts (objects not depenetrating quickly). Valid ranges are between
    // cos(0 degrees) and cos(90 degrees). The default value is cos(5 degrees).
    _hfActiveEdgeCosThresholdAngle = 0.996195;

    _hfScale = pc.Vec3.ONE;

    // The height field is a surface defined by: hfOffset + hfScale * (x, hfHeightSamples[y * hfSampleCount + x], y).
    // where x and y are integers in the range x and y e [0, hfSampleCount - 1].
    _hfOffset = pc.Vec3.ZERO;

    // The ComponentSystem used to create this Component.
    system;

    // The Entity that this Component is attached to.
    entity;

    constructor(system, entity) {
        super();

        this.system = system;
        this.entity = entity;

        if (system.schema && !this._accessorsBuilt) {
            buildAccessors(this, system.schema);
        }

        this.on('set', function (name, oldValue, newValue) {
            this.fire('set_' + name, name, oldValue, newValue);
        });

        this.on('set_enabled', this.onSetEnabled, this);
    }

    get constraints() {
        return this._constraints;
    }

    get index() {
        return this._index;
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
            const quat = ShapeComponent.quat;
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

            const entity = component.entity;
            const pos = entity.getLocalPosition();
            const rot = entity.getLocalRotation();

            // Loss of precision for pos/rot (64 -> 32)
            cb.write(pos, BUFFER_WRITE_VEC32, false);
            cb.write(rot, BUFFER_WRITE_VEC32, false);
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

