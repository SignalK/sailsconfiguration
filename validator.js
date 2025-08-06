"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateValidator = exports.StatusValidator = exports.UpdateValidator = exports.SailValidator = void 0;
var fluentvalidation_ts_1 = require("fluentvalidation-ts");
var SailValidator = /** @class */ (function (_super) {
    __extends(SailValidator, _super);
    function SailValidator() {
        var _this = _super.call(this) || this;
        var types = [
            'mainsail',
            'jib',
            'genoa',
            'spinnaker',
            'gennaker',
            'staysail',
            'headsail',
            'lug',
            'mizzen',
            'steadying sail',
            'other'
        ];
        // This is type-safe! (Argument is of type 'id' | 'name')
        _this.ruleFor('id')
            .notUndefined()
            .notEmpty()
            .matches(/^[a-zA-Z0-9-\s]+$/)
            .withMessage('Provide a unique sail ID!');
        _this.ruleFor('name')
            .notUndefined()
            .notEmpty().minLength(2)
            .matches(/^[a-zA-Z0-9\s]+$/)
            .withMessage('Please enter a valid name for the sail!');
        _this.ruleFor('description')
            .notEmpty().maxLength(200)
            .withMessage('Maximum length of description is 200 characters!');
        _this.ruleFor('type')
            .notUndefined()
            .must(function (value) { return types.indexOf(value) !== -1; })
            .withMessage('Sail type must be one of: mainsail, jib, genoa, spinnaker, gennaker, staysail, headsail, lug, mizzen, steadying sail, other!');
        _this.ruleFor('material')
            .minLength(0).maxLength(50)
            .withMessage('Maximum length of material is 50 characters!');
        _this.ruleFor('brand')
            .minLength(0).maxLength(50)
            .withMessage('Maximum length of brand is 50 characters!');
        _this.ruleFor('active')
            .must(function (value) { return typeof value === 'boolean'; })
            .withMessage('Active must be a boolean value!');
        _this.ruleFor('area')
            .notUndefined()
            .greaterThan(0)
            .withMessage('Size of sail must be given and cannot be negative!');
        _this.ruleFor('minimumWind')
            .greaterThanOrEqualTo(0)
            .withMessage('Minimum wind must be a positive number!');
        _this.ruleFor('maximumWind')
            .greaterThanOrEqualTo(0)
            .withMessage('Maximum wind must be a positive number!');
        _this.ruleFor('reefs')
            .notUndefined()
            .must(function (value) { return Array.isArray(value) && value.every(function (r) { return typeof r === 'number' && r > 0; }); })
            .withMessage('Reefs must be an array of non-negative numbers!')
            .when(function (model) { return model.continuousReefing === false; });
        _this.ruleForEach('reefs')
            .greaterThan(0)
            .withMessage('Please enter a positive area for each reef!')
            .when(function (model) { return model.reefs.length > 0; });
        _this.ruleFor('continuousReefing')
            .must(function (value) { return typeof value === 'boolean'; })
            .withMessage('Continuous reefing must be a boolean value!');
        _this.ruleFor('reducedState')
            .must(function (value) {
            return typeof value === 'object' &&
                value !== null &&
                (typeof value.reefs === 'number' && value.reefs >= 0 ||
                    typeof value.furledRatio === 'number' && value.furledRatio >= 0 && value.furledRatio <= 1);
        })
            .withMessage('Reduced state must be an object with non-negative reefs and furledRatio values!');
        _this.ruleFor('reducedState').setValidator(function (sail) {
            return new StateValidator(sail.reefs ? sail.reefs.length : undefined);
        });
        return _this;
    }
    return SailValidator;
}(fluentvalidation_ts_1.Validator));
exports.SailValidator = SailValidator;
var UpdateValidator = /** @class */ (function (_super) {
    __extends(UpdateValidator, _super);
    function UpdateValidator(availableReefs) {
        var _this = _super.call(this) || this;
        _this.ruleFor('id')
            .notUndefined()
            .notEmpty()
            .matches(/^[a-zA-Z0-9-\s]+$/)
            .withMessage('Provide a unique sail ID!');
        _this.ruleFor('active')
            .notUndefined()
            .must(function (value) { return typeof value === 'boolean'; })
            .withMessage('Active must be a boolean value!');
        _this.ruleFor('reducedState')
            .must(function (value) {
            return typeof value === 'object' && value !== null &&
                (typeof value.reefs === 'number' && value.reefs >= 0 ||
                    typeof value.furledRatio === 'number' && value.furledRatio >= 0 && value.furledRatio <= 1);
        })
            .withMessage('Reduced state must be an object with non-negative reefs and furledRatio values!');
        _this.ruleFor('reducedState').setValidator(function (state) {
            return new StateValidator(availableReefs);
        });
        return _this;
    }
    return UpdateValidator;
}(fluentvalidation_ts_1.Validator));
exports.UpdateValidator = UpdateValidator;
var StatusValidator = /** @class */ (function (_super) {
    __extends(StatusValidator, _super);
    function StatusValidator() {
        var _this = _super.call(this) || this;
        _this.ruleFor('value')
            .notUndefined()
            .must(function (value) { return typeof value === 'boolean'; })
            .withMessage('Value must be a boolean!');
        return _this;
    }
    return StatusValidator;
}(fluentvalidation_ts_1.Validator));
exports.StatusValidator = StatusValidator;
var StateValidator = /** @class */ (function (_super) {
    __extends(StateValidator, _super);
    function StateValidator(availablereefs) {
        var _this = _super.call(this) || this;
        _this.ruleFor('reefs')
            .notUndefined()
            .must(function (value) { return typeof value === 'number' && value >= 0 && (availablereefs === undefined || value <= availablereefs); })
            .withMessage("Reefs must be a non-negative number".concat(availablereefs === undefined ? '!' : ' and smaller than ' + availablereefs, "!"))
            .when(function (state) { return state.furledRatio === undefined; });
        _this.ruleFor('furledRatio')
            .notUndefined()
            .must(function (value) { return typeof value === 'number' && value >= 0 && value <= 1; })
            .withMessage('Furled ratio must be a number between 0 and 1!')
            .when(function (state) { return state.reefs === undefined; });
        return _this;
    }
    return StateValidator;
}(fluentvalidation_ts_1.Validator));
exports.StateValidator = StateValidator;
