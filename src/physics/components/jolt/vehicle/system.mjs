import { BodyComponentSystem } from "../body/system.mjs";
import { CMD_CREATE_VEHICLE, OPERATOR_CREATOR } from "../constants.mjs";
import { VehicleComponent } from "./component.mjs";

const schema = [
    'antiRollBars',
    'castFraction',
    'castMaxSlopeAngle',
    'castObjectLayer',
    'castRadius',
    'castType',
    'castUp',
    'clutchReleaseTime',
    'clutchStrength',
    'differentialLimitedSlipRatio',
    'differentials',
    'forward',
    'gearRatios',
    'inertia',
    'numVelocityStepsOverride',
    'leanSmoothingFactor',
    'leanSpringConstant',
    'leanSpringDamping',
    'leanSpringIntegrationCoefficient',
    'leanSpringIntegrationCoefficientDecay',
    'maxLeanAngle',
    'numPositionStepsOverride',
    'maxPitchRollAngle',
    'maxTorque',
    'maxRPM',
    'minRPM',
    'mode',
    'normalizedTorque',
    'reverseGearRatios',
    'shiftDownRPM',
    'shiftUpRPM',
    'switchLatency',
    'switchTime',
    'tracks',
    'type',
    'up',
    'wheelAngularDamping',
    'wheels'
];

class VehicleComponentSystem extends BodyComponentSystem {
    constructor(app, manager, id) {
        super(app, manager);

        this._schema = [...this._schema, ...schema];

        manager.systems.set(id, this);
    }

    get id() {
        return 'vehicle';
    }

    get ComponentType() {
        return VehicleComponent;
    }

    createVehicle(component) {
        super.createBody(component);

        const cb = this._manager.commandsBuffer;

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_VEHICLE);

        component.writeVehicleData(cb);
    }
}

export { VehicleComponentSystem };