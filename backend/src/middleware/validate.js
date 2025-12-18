const Joi = require('joi');
const { createError } = require('../utils/error');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { allowUnknown: true });
  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return next(createError(400, errorMessage));
  }
  return next();
};

module.exports = validate;
