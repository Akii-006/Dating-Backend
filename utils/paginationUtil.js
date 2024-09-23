export const paginate = (model, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return model.find().skip(skip).limit(limit);
};
