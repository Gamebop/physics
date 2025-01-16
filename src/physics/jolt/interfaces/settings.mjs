/**
 * @interface
 * @group Utilities
 * @category Query
 */
class ImmediateSettings {
    /**
     * Whether to make a query and return the results immediately. Only supported when physics
     * is running on main thread.
     *
     * @type {boolean}
     * @defaultValue true
     */
    immediate;
}

/**
 * @interface
 * @group Utilities
 * @category Query
 */
class QuerySettings extends ImmediateSettings {
    /**
     * If `true`, the ray will ignore sensors.
     *
     * @type {boolean}
     * @defaultValue false
     */
    ignoreSensors;

    /**
     * Broadphase layer number for filtering.
     *
     * @type {number}
     * @defaultValue BP_LAYER_MOVING (1)
     */
    bpFilterLayer;

    /**
     * Object layer number for filtering.
     *
     * @type {number}
     * @defaultValue OBJ_LAYER_MOVING (1)
     */
    objFilterLayer;
}

/**
 * @interface
 * @group Utilities
 * @category Query
 */
class CastSettings extends QuerySettings {
    /**
     * Whether to return only the first contact.
     *
     * @type {boolean}
     * @defaultValue true
     */
    firstOnly;

    /**
     * If `true`, will calculate and add to results a contact normal at contact point.
     *
     * @type {boolean}
     * @defaultValue false
     */
    calculateNormal;
}


/**
 * @interface
 * @group Utilities
 * @category Query
 */
class CastRaySettings extends CastSettings {
    /**
     * If `true`, the ray will ignore shape backfaces.
     *
     * @type {boolean}
     * @defaultValue true
     */
    ignoreBackFaces;

    /**
     * If `true`, the convex shapes will be treated as "solid". That is, if a ray starts from
     * inside a convex shape, it will report a contact.
     *
     * @type {boolean}
     * @defaultValue true
     */
    treatConvexAsSolid;
}

/**
 * @interface
 * @group Utilities
 * @category Query
 */
class CastShapeSettings extends CastSettings {
    /**
     * Scales the shape used during a cast. Allows to re-use existing shapes, if only scale is
     * different.
     *
     * @type {Vec3}
     * @defaultValue Vec3(1, 1, 1)
     */
    scale;

    /**
     * All hit results will be returned relative to this offset, can be zero to get results in
     * world position, but when you're testing far from the origin you get better precision by
     * picking a position that's closer since floats are most accurate near the origin.
     *
     * @type {Vec3}
     * @defaultValue Vec3(0, 0, 0)
     */
    offset;

    /**
     * Sets whether to ignore triangle backfaces. Following options available:
     * ```
     * BFM_IGNORE_BACK_FACES
     * ```
     * ```
     * BFM_COLLIDE_BACK_FACES
     * ```
     *
     * @type {number}
     * @defaultValue BFM_IGNORE_BACK_FACES
     */
    backFaceModeTriangles;

    /**
     * Sets whether to ignore backfaces of convex shapes. See {@link backFaceModeTriangles} for
     * available options.
     *
     * @type {number}
     * @defaultValue BFM_IGNORE_BACK_FACES
     */
    backFaceModeConvex;

    /**
     * Indicates if we want to shrink the shape by the convex radius and then expand it again. This
     * speeds up collision detection and gives a more accurate normal at the cost of a more
     * "rounded" shape.
     *
     * @type {boolean}
     * @defaultValue false
     */
    useShrunkenShapeAndConvexRadius;

    /**
     * When true, and the shape is intersecting at the beginning of the cast (fraction = 0) then
     * this will calculate the deepest penetration point (costing additional CPU time).
     *
     * @type {boolean}
     * @defaultValue false
     */
    returnDeepestPoint;
}

/**
 * @interface
 * @group Utilities
 * @category Query
 */
class CollideShapeSettings extends CastSettings {
    /**
     * Scales the shape used during collision test. Allows to re-use existing shapes, if only scale
     * is different.
     *
     * @type {Vec3}
     * @defaultValue Vec3(1, 1, 1)
     */
    scale;

    /**
     * When > 0 contacts in the vicinity of the query shape can be found. All nearest contacts that
     * are not further away than this distance will be found.
     *
     * @type {number}
     * @defaultValue 0 (m)
     */
    maxSeparationDistance;

    /**
     * If `true`, the shape will ignore other shapes backfaces.
     *
     * @type {boolean}
     * @defaultValue true
     */
    ignoreBackFaces;

    /**
     * All hit results will be returned relative to this offset, can be zero to get results in
     * world position, but when you're testing far from the origin you get better precision by
     * picking a position that's closer since floats are most accurate near the origin.
     *
     * @type {Vec3}
     * @defaultValue Vec3(0, 0, 0)
     */
    offset;
}

/**
 * @interface
 * @group Utilities
 * @category Other
 */
class ShapeSettings {
    /**
     * @see {@link ShapeComponent.density}
     * @type {number}
     * @defaultValue 1000
     */
    density;

    /**
     * A local position offset. Note, it will be added on top of any
     * {@link ShapeComponent.shapePosition} you have on a component.
     *
     * @type {Vec3}
     * @defaultValue Vec3(0, 0, 0)
     */
    shapePosition;

    /**
     * A local rotation offset. Note, it will be added on top of any
     * {@link ShapeComponent.shapeRotation} you have on a component.
     *
     * @type {Quat}
     * @defaultValue Quat(0, 0, 0, 1)
     */
    shapeRotation;

    /**
     * Scales the shape. Uniform scale is always fine. Non-uniform scale is supported only by some
     * shapes. For example:
     * - you can use non-uniform scale on a box shape, but not on a sphere, etc.
     * - you can use non-uniform scale on a cylinder/capsule, but `X` and `Z` must be uniform.
     *
     * @type {Vec3}
     * @defaultValue Vec3(1, 1, 1)
     */
    scale;

    /**
     * @see {@link ShapeComponent.halfExtent}
     * @type {Vec3}
     * @defaultValue Vec3(0.5, 0.5, 0.5)
     */
    halfExtent;

    /**
     * @see {@link ShapeComponent.convexRadius}
     * @type {number}
     * @defaultValue 0.05 (m)
     */
    convexRadius;

    /**
     * @see {@link ShapeComponent.halfHeight}
     * @type {number}
     * @defaultValue 0.5 (m)
     */
    halfHeight;

    /**
     * @see {@link ShapeComponent.radius}
     * @type {number}
     * @defaultValue 0.5 (m)
     */
    radius;
}

export {
    QuerySettings, CastSettings, CastRaySettings, CastShapeSettings, CollideShapeSettings,
    ShapeSettings, ImmediateSettings
};
