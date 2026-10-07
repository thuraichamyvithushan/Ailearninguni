export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success)
    return next(
      Object.assign(
        new Error(
          result.error.issues
            .map((i) => `${i.path.join(".") || "Request"}: ${i.message}`)
            .join("; "),
        ),
        { status: 400 },
      ),
    );
  req.body = result.data;
  next();
};
