/**
 * TaskFlow - Task routes (mounted at /api/tasks)
 */
const router = require('express').Router();
const controller = require('../controllers/taskController');
const { validateId, validateTask, validateStatus } = require('../middleware/validate');

router.get('/', controller.getAllTasks);
router.post('/', validateTask, controller.createTask);

router.get('/:id', validateId, controller.getTaskById);
router.put('/:id', validateId, validateTask, controller.updateTask);
router.patch('/:id/status', validateId, validateStatus, controller.updateStatus);
router.delete('/:id', validateId, controller.deleteTask);

module.exports = router;
