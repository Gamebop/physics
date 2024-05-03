import { Quat, SEMANTIC_POSITION, Vec3 } from 'playcanvas';
import { Debug } from '../../debug.mjs';
import { Component } from '../component.mjs';
import {
    BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT32,
    BUFFER_WRITE_UINT8, BUFFER_WRITE_VEC32, FLOAT32_SIZE, SHAPE_BOX,
    SHAPE_CAPSULE, SHAPE_CONVEX_HULL, SHAPE_CYLINDER, SHAPE_HEIGHTFIELD,
    SHAPE_MESH, SHAPE_SPHERE, SHAPE_STATIC_COMPOUND
} from '../../constants.mjs';

/**
 * This is a base component for other components. Most probably you don't need to use it directly,
 * but use a derived component instead.
 *
 * @see {@link BodyComponent | Body Component}
 * @see {@link SoftBodyComponent | SoftBody Component}
 *
 * @category Shape Component
 */
class ShapeComponent extends Component {
    _shape = SHAPE_BOX;

    // TODO: remove
    _trackDynamic = true;

    _index = -1;

    _renderAsset = null;

    _meshes = null;

    _isCompoundChild = false;

    _useEntityScale = true;

    // TODO
    // remove default Map
    _constraints = new Map();

    _debugDraw = false;

    _halfExtent = new Vec3(0.5, 0.5, 0.5);

    _radius = 0.5;

    _convexRadius = 0.05;

    _halfHeight = 0.5;

    _density = 1000;

    _shapePosition = Vec3.ZERO;

    _shapeRotation = Quat.IDENTITY;

    _massOffset = Vec3.ZERO;

    _hfSamples = null;

    _hfSampleCount = 0;

    _hfBlockSize = 2;

    _hfBitsPerSample = 8;

    _hfActiveEdgeCosThresholdAngle = 0.996195;

    _hfScale = Vec3.ONE;

    _hfOffset = Vec3.ZERO;

    /**
     * Read-only. Constraint indices attached to this body.
     *
     * @returns {Map<number, import('../constraint/types/cone.mjs').ConeConstraint |
     * import('../constraint/types/distance.mjs').DistanceConstraint |
     * import('../constraint/types/fixed.mjs').FixedConstraint |
     * import('../constraint/types/hinge.mjs').HingeConstraint |
     * import('../constraint/types/point.mjs').PointConstraint |
     * import('../constraint/types/pulley.mjs').PulleyConstraint |
     * import('../constraint/types/six-dof.mjs').SixDOFConstraint |
     * import('../constraint/types/slider.mjs').SliderConstraint |
     * import('../constraint/types/swing-twist.mjs').SwingTwistConstraint>} Map with constraints,
     * where:
     * - `key`: unique index of the constraint attached to this body
     * - `value`: constraint interface
     * @defaultValue Map()
     */
    get constraints() {
        return this._constraints;
    }

    /**
     * Internally the convex radius will be subtracted from the half extent, so the total size will
     * not grow with the convex radius. You can increase this value to make the edges of the
     * collision shape rounded.
     *
     * Note: Only used by shapes with sharp edges: `SHAPE_BOX` and `SHAPE_CYLINDER`.
     *
     * @returns {number} Number, representing the convex radius.
     * @defaultValue 0.05 (m)
     */
    get convexRadius() {
        return this._convexRadius;
    }

    /**
     * Specifies, whether to debug draw the collision shape.
     *
     * @returns {boolean} Boolean, telling if the collision shape should be drawn using lines.
     * @defaultValue false
     */
    get debugDraw() {
        return this._debugDraw;
    }

    /**
     * Density of the object. Affects the mass of the object, when
     * {@link BodyComponent.overrideMassProperties} is set to `OMP_CALCULATE_MASS_AND_INERTIA`
     * (default, which will auto-calculate the mass using the shape dimensions and this density
     * value).
     *
     * @returns {number} Number, representing the density of this collision shape.
     * @defaultValue 1000 (kg / m^3)
     */
    get density() {
        return this._density;
    }

    /**
     * Cosine of the threshold angle. If the angle between the two triangles in HeightField is
     * bigger than this, the edge is active. note that a concave edge is always inactive. Setting
     * this value too small can cause ghost collisions with edges. Setting it too big can cause
     * depenetration artifacts (objects not depenetrating quickly). Valid ranges are between
     * `cos(0 degrees)` and `cos(90 degrees)`.
     *
     * @returns {number} Number, representing radians of the threshold angle.
     * @defaultValue 0.996195 (cos(5 degrees))
     */
    get hfActiveEdgeCosThresholdAngle() {
        return this._hfActiveEdgeCosThresholdAngle;
    }

    /**
     * How many bits per sample to use to compress the HeightField. Can be in the range `[1, 8]`.
     * Note that each sample is compressed relative to the min/max value of its block of
     * `hfBlockSize * hfBlockSize` pixels so the effective precision is higher. Also note that
     * increasing hfBlockSize saves more memory, than reducing the amount of bits per sample.
     *
     * @returns {number} Number, representing amount of compression bits.
     * @defaultValue 8
     */
    get hfBitsPerSample() {
        return this._hfBitsPerSample;
    }

    /**
     * The HeightField is divided in blocks of `hfBlockSize * hfBlockSize * 2` triangles and the
     * acceleration structure culls blocks only, bigger block sizes reduce memory consumption, but
     * also reduce query performance. Sensible values are `[2, 8]`. Does not need to be a power of
     * 2. Note that at run-time Jolt performs one more grid subdivision, so the effective block
     * size is half of what is provided here.
     *
     * @returns {number} Number, representing a block size.
     * @defaultValue 2
     */
    get hfBlockSize() {
        return this._hfBlockSize;
    }

    /**
     * Offsets the position of the HeightField, which is a surface defined by:
     * ```
     * hfOffset + hfScale * (x, hfHeightSamples[y * hfSampleCount + x], y)
     * ```
     * where `x` and `y` are integers in the range `x and y e [0, hfSampleCount - 1]`.
     *
     * @returns {Vec3} Vec3 with position offset.
     * @defaultValue Vec3(0, 0, 0) (m per axis)
     */
    get hfOffset() {
        return this._hfOffset;
    }

    /**
     * Half extent for a `SHAPE_BOX`.
     *
     * @returns {Vec3} Vec3 with half extent of a box collision shape.
     * @defaultValue Vec3(0.5, 0.5, 0.5) (m per axis)
     */
    get halfExtent() {
        return this._halfExtent;
    }

    /**
     * Half-height of radius based shapes.
     *
     * Note: Only used by `SHAPE_CAPSULE` and `SHAPE_CYLINDER`.
     *
     * @returns {number} Number, representing half of the total height of the collision shape.
     * @defaultValue 0.5 (m)
     */
    get halfHeight() {
        return this._halfHeight;
    }

    /**
     * Unique body index. This can change during entity lifecycle, e.g. every time entity is
     * enabled, a new index is assigned and a new body is created. The index is used to map entity
     * to body. Index can be re-used by another component if this component is disabled or
     * destroyed (destroying related body as a result).
     *
     * @returns {number} Integer number, representing the unique body index.
     * @defaultValue -1
     */
    get index() {
        return this._index;
    }

    /**
     * Specifies if the component describes a child of a compound shape.
     *
     * @returns {boolean} Boolean, telling if this component describes a child shape of a compound
     * shape.
     * @defaultValue false
     */
    get isCompoundChild() {
        return this._isCompoundChild;
    }

    /**
     * A center of mass offset in local space of the body. Does not move the shape.
     *
     * @returns {Vec3} Vec3 with center of mass offset.
     * @defaultValue Vec3(0, 0, 0) (m per axis)
     */
    get massOffset() {
        return this._massOffset;
    }

    /**
     * Meshes used for mesh `SHAPE_MESH` or convex hulls `SHAPE_CONVEX_HULL`.
     *
     * @returns {Array<import('playcanvas').Mesh> | null} An array of meshes, or `null`.
     * @defaultValue null
     */
    get meshes() {
        return this._meshes;
    }

    /**
     * Radius for radius based shapes, like `SHAPE_CAPSULE`, `SHAPE_SPHERE`, etc.
     *
     * @returns {number} Number, specifying the shape radius.
     * @defaultValue 0.5 (m)
     */
    get radius() {
        return this._radius;
    }

    /**
     * This field contains the render asset ID, when a render asset is used for collision mesh or a
     * convex hull.
     *
     * @returns {number | null} Number, representing an ID of render asset.
     * @defaultValue null
     */
    get renderAsset() {
        return this._renderAsset;
    }

    /**
     * Shape type. Following enum aliases available:
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
     * SHAPE_HEIGHTFIELD
     * ```
     * ```
     * SHAPE_STATIC_COMPOUND
     * ```
     *
     * @returns {number} Number, representing the shape type.
     * @defaultValue SHAPE_BOX
     */
    get shape() {
        return this._shape;
    }

    /**
     * Local position offset of the collision shape.
     *
     * @returns {Vec3} Vec3 with local position offset.
     * @defaultValue Vec3(0, 0, 0) (m per axis)
     */
    get shapePosition() {
        return this._shapePosition;
    }

    /**
     * Local rotation offset of the collision shape.
     *
     * @returns {Quat} Quat with local rotation offset.
     * @defaultValue Quat(0, 0, 0, 1) (identity rotation)
     */
    get shapeRotation() {
        return this._shapeRotation;
    }

    /**
     * Applies entity scale on the shape.
     *
     * @returns {boolean} Boolean, telling if the entity scale is applied on the collision shape.
     * This makes it easier to adjust the size of the collision shape by simply scaling the entity.
     * 
     * Note: Some shapes do not support non-uniformed scales, like `SHAPE_SPHERE`. Works best with
     * `SHAPE_BOX` which you can scale on any axis. Others, like capsule and cone, can't have a
     * different radius on `X` and `Z` axis, but allow scaling `Y` for their height.
     *
     * @returns {boolean} Boolean, telling if the entity scale is applied on this collision shape.
     * @defaultValue true
     */
    get useEntityScale() {
        return this._useEntityScale;
    }

    static quat = new Quat();

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
                if ($_DEBUG) {
                    Debug.warn('Unsupperted shape type', shape);
                }
                return false;
        }

        const isCompoundChild = props.isCompoundChild;
        cb.write(isCompoundChild, BUFFER_WRITE_BOOL, false);
        if (!isCompoundChild) {
            cb.write(props.density, BUFFER_WRITE_FLOAT32, false);

            const position = props.shapePosition;
            const rotation = props.shapeRotation;
            const massOffset = props.massOffset;
            const hasPositionOffset = !position.equals(Vec3.ZERO);
            const hasRotationOffset = forceWriteRotation || !rotation.equals(Quat.IDENTITY);
            const hasShapeOffset = hasPositionOffset || hasRotationOffset;
            const hasMassOffset = !massOffset.equals(Vec3.ZERO);

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

        if ($_DEBUG && childrenCount === 0) {
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
                if (element.name === SEMANTIC_POSITION) {
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

            // let byteLength;
            let byteOffset;
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
