const TenantService = require('../services/tenant.service');
const { asyncHandler } = require('../middleware/error.middleware');

class TenantController {
  static getSettings = asyncHandler(async (req, res) => {
    const settings = await TenantService.getSettings(req.tenant_id);

    res.status(200).json({
      success: true,
      data: settings
    });
  });

  static updateSettings = asyncHandler(async (req, res) => {
    const settings = await TenantService.updateSettings(req.tenant_id, {
      name: req.body.name,
      logo_url: req.body.logo_url
    });

    res.status(200).json({
      success: true,
      message: 'Tenant settings updated',
      data: settings
    });
  });

  static listUsers = asyncHandler(async (req, res) => {
    const users = await TenantService.listUsers(req.tenant_id, {
      role: req.query.role
    });

    res.status(200).json({
      success: true,
      data: users
    });
  });

  static inviteUser = asyncHandler(async (req, res) => {
    const result = await TenantService.inviteUser(req.tenant_id, req.body);

    res.status(201).json({
      success: true,
      message: 'User invited successfully',
      data: result
    });
  });

  static removeUser = asyncHandler(async (req, res) => {
    await TenantService.removeUser(req.tenant_id, Number(req.params.id));

    res.status(200).json({
      success: true,
      message: 'User removed successfully'
    });
  });

  static listExamsForAssignment = asyncHandler(async (req, res) => {
    const exams = await TenantService.listExamsForAssignment(req.tenant_id);

    res.status(200).json({
      success: true,
      data: exams
    });
  });

  static listStudentsForExam = asyncHandler(async (req, res) => {
    const result = await TenantService.listStudentsForExam(req.tenant_id, Number(req.params.examId));

    res.status(200).json({
      success: true,
      data: result
    });
  });

  static assignStudentsToExam = asyncHandler(async (req, res) => {
    const result = await TenantService.assignStudentsToExam(
      req.tenant_id,
      Number(req.params.examId),
      req.body.student_ids,
      req.user.user_id
    );

    res.status(200).json({
      success: true,
      message: 'Exam assignments updated successfully',
      data: result
    });
  });
}

module.exports = TenantController;
