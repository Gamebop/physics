import { Vec3 } from 'playcanvas';
import { SPRING_MODE_FREQUENCY, WHEEL_UNDEFINED } from '../../../../constants.mjs';
import { Spring } from '../constraint.mjs';

// TODO


// remove this class, we can just define it via settings

class Wheel {
    static defaultSpringSettings = {
        mode: SPRING_MODE_FREQUENCY,
        frequency: 1.5,
        damping: 0.5
    };

    _enableSuspensionForcePoint = false;

    _entity = null;

    _position = Vec3.ZERO;

    _suspensionForcePoint = Vec3.ZERO;

    _suspensionDirection = Vec3.DOWN;

    _steeringAxis = Vec3.UP;

    _wheelUp = Vec3.UP;

    _wheelForward = Vec3.BACK;

    _springSettings = null;

    _suspensionMinLength = 0.3;

    _suspensionMaxLength = 0.5;

    _suspensionPreloadLength = 0;

    _radius = 0.3;

    _type = WHEEL_UNDEFINED;

    _width = 0.1;

    constructor(opts = {}) {
        if (opts.springSettings) {
            this._spring = new Spring(opts.springSettings);
        } else {
            this._spring = Wheel.defaultSpring;
        }
    }

    /**
     * If disabled, the forces are applied at the collision contact point. This leads to a more
     * accurate simulation when interacting with dynamic objects but makes the vehicle less stable.
     * When setting this to true, all forces will be applied to a fixed point on the vehicle body.
     *
     * @returns {boolean} Boolean, telling if forces are applied at the contact point.
     * @defaultValue false
     */
    get enableSuspensionForcePoint() {
        return this._enableSuspensionForcePoint;
    }

    /**
     * PlayCanvas Entity that will be used as a visual wheel. Its position and rotation will be
     * updated automatically to match the physical wheel.
     *
     * @returns {import('playcanvas').Entity | null} Entity or `null`, if none is set.
     * @defaultValue null
     */
    get entity() {
        return this._entity;
    }

    /**
     * Attachment point of wheel suspension in local space of the body.
     *
     * @returns {Vec3} Attachment point.
     * @defaultValue Vec3(0, 0, 0)
     */
    get position() {
        return this._position;
    }

    /**
     * A radius of the wheel.
     *
     * @returns {number} Wheel radius.
     * @defaultValue 0.3 (m)
     */
    get radius() {
        return this._radius;
    }

    /**
     * A spring of the wheel.
     *
     * @returns {Spring | null} Wheel spring.
     * @defaultValue Frequency spring (frequency: 1.5, damping: 0.5)
     */
    get spring() {
        return this._spring;
    }

    /**
     * Direction of the steering axis in local space of the body, should point up (e.g. for a bike
     * would be `-suspensionDirection`).
     *
     * @returns {Vec3} Steering axis.
     * @defaultValue Vec3(0, 1, 0)
     */
    get steeringAxis() {
        return this._steeringAxis;
    }

    /**
     * Direction of the suspension in local space of the body, should point down.
     *
     * @returns {Vec3} Suspension direction.
     * @defaultValue Vec3(0, -1, 0)
     */
    get suspensionDirection() {
        return this._suspensionDirection;
    }

    /**
     * Where tire forces (suspension and traction) are applied, in local space of the body. A good
     * default is the center of the wheel in its neutral pose. See
     * {@link enableSuspensionForcePoint}.
     *
     * @returns {Vec3} Suspension point.
     * @defaultValue Vec3(0, 0, 0)
     */
    get suspensionForcePoint() {
        return this._suspensionForcePoint;
    }

    /**
     * How long the suspension is in max droop position relative to the attachment point.
     *
     * @returns {number} Suspension max length.
     * @defaultValue 0.5 (m)
     */
    get suspensionMaxLength() {
        return this._suspensionMaxLength;
    }

    /**
     * How long the suspension is in max raised position relative to the attachment point.
     *
     * @returns {number} Suspension min length.
     * @defaultValue 0.3 (m)
     */
    get suspensionMinLength() {
        return this._suspensionMinLength;
    }

    /**
     * The natural length of the suspension spring is defined as {@link suspensionMaxLength} +
     * `suspensionPreloadLength`. Can be used to preload the suspension as the spring is
     * compressed by `suspensionPreloadLength` when the suspension is in max droop position. Note,
     * that this means when the vehicle touches the ground there is a discontinuity, so it will
     * also make the vehicle more bouncy as we're updating with discrete time steps.
     *
     * @returns {number} Suspension preload length.
     * @defaultValue 0 (m)
     */
    get suspensionPreloadLength() {
        return this._suspensionPreloadLength;
    }

    /**
     * @private
     * @returns {number} Wheel type constant.
     */
    get type() {
        return this._type;
    }

    /**
     * Forward direction when the wheel is in the neutral steering position (usually
     * `component.forward` but can be used to give the wheel toe, does not need to be perpendicular
     * to wheelUp).
     *
     * @returns {Vec3} Wheel forward vector.
     * @defaultValue Vec3(0, 0, 1)
     */
    get wheelForward() {
        return this._wheelForward;
    }

    /**
     * Up direction when the wheel is in the neutral steering position (usually `component.up` but
     * can be used to give the wheel camber or for a bike would be `-suspensionDirection`).
     *
     * @returns {Vec3} Wheel up vector.
     * @defaultValue Vec3(0, 1, 0)
     */
    get wheelUp() {
        return this._wheelUp;
    }

    /**
     * A width of the wheel.
     *
     * @returns {number} Wheel width.
     * @defaultValue 0.1 (m)
     */
    get width() {
        return this._width;
    }
}

export { Wheel };
