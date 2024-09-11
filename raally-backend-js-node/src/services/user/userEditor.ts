import Roles from '../../security/roles';
import assert from 'assert';
import Error400 from '../../errors/Error400';
import SequelizeRepository from '../../database/repositories/sequelizeRepository';
import UserRepository from '../../database/repositories/userRepository';
import TenantUserRepository from '../../database/repositories/tenantUserRepository';
import Plans from '../../security/plans';
import { IServiceOptions } from '../IServiceOptions';

/**
 * Handles the edition of the user(s) via the User page.
 */
export default class UserEditor {
  options: IServiceOptions;
  data: any;
  transaction: any;
  user: any;

  constructor(options: IServiceOptions) {
    this.options = options;
  }

  /**
   * Updates a user via the User page.
   * @param data - User data to update.
   */
  async update(data: any) {
    this.data = data;

    await this._validate();

    try {
      this.transaction = await SequelizeRepository.createTransaction(
        this.options.database,
      );

      await this._loadUser();
      await this._updateAtDatabase();

      await SequelizeRepository.commitTransaction(
        this.transaction,
      );
    } catch (error) {
      await SequelizeRepository.rollbackTransaction(
        this.transaction,
      );

      throw error;
    }
  }

  private get _roles() {
    if (this.data.roles && !Array.isArray(this.data.roles)) {
      return [this.data.roles];
    } else {
      return [...new Set(this.data.roles)];
    }
  }

  /**
   * Loads the user and validates that it exists.
   */
  private async _loadUser() {
    this.user = await UserRepository.findById(
      this.data.id,
      this.options,
    );

    if (!this.user) {
      throw new Error400(
        this.options.language,
        'user.errors.userNotFound',
      );
    }
  }

  /**
   * Updates the user in the database.
   */
  private async _updateAtDatabase() {
    await TenantUserRepository.updateRoles(
      this.options.currentTenant.id,
      this.data.id,
      this._roles,
      this.options,
    );
  }

  /**
   * Checks if the user is removing the responsible for the plan.
   * @returns True if removing the plan user, otherwise false.
   */
  private async _isRemovingPlanUser() {
    if (this._roles.includes(Roles.values.admin)) {
      return false;
    }

    const currentTenant = this.options.currentTenant;

    if (currentTenant.plan === Plans.values.free || !currentTenant.planUserId) {
      return false;
    }

    return String(this.data.id) === String(currentTenant.planUserId);
  }

  /**
   * Checks if the user is removing their own admin role.
   * @returns True if removing own admin role, otherwise false.
   */
  private async _isRemovingOwnAdminRole() {
    if (this._roles.includes(Roles.values.admin)) {
      return false;
    }

    if (String(this.data.id) !== String(this.options.currentUser.id)) {
      return false;
    }

    const tenantUser = this.options.currentUser.tenants.find(
      (userTenant) => userTenant.tenant.id === this.options.currentTenant.id,
    );

    return tenantUser.roles.includes(Roles.values.admin);
  }

  /**
   * Validates the input data and business logic.
   */
  private async _validate() {
    assert(this.options.currentTenant.id, 'tenantId is required');
    assert(this.options.currentUser, 'currentUser is required');
    assert(this.options.currentUser.id, 'currentUser.id is required');
    assert(this.options.currentUser.email, 'currentUser.email is required');
    assert(this.data.id, 'id is required');
    assert(this._roles, 'roles is required (can be empty)');

    if (await this._isRemovingPlanUser()) {
      throw new Error400(
        this.options.language,
        'user.errors.revokingPlanUser',
      );
    }

    if (await this._isRemovingOwnAdminRole()) {
      throw new Error400(
        this.options.language,
        'user.errors.revokingOwnPermission',
      );
    }
  }
}
