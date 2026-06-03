import { Router } from 'express';
import { getDepartmentFeed, listDepartments } from '../../controllers/department.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { advancedSearchSchema } from '../../validations/v1/search.validation';

const router = Router();

router.use(authenticate);

router.get('/', listDepartments);

router.get(
  '/:slug/feed',
  validate(advancedSearchSchema),
  getDepartmentFeed
);

export default router;
